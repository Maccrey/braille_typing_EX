#!/bin/bash

# Braille Typing Practice Server Management Script
# Usage: ./scripts/server.sh [start|stop|restart|status|logs]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOGS_DIR="$PROJECT_ROOT/logs"

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if PM2 is installed
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 is not installed. Please install it first:"
        echo "npm install -g pm2"
        exit 1
    fi
}

# Create logs directory if it doesn't exist
create_logs_dir() {
    if [ ! -d "$LOGS_DIR" ]; then
        mkdir -p "$LOGS_DIR"
        print_info "Created logs directory: $LOGS_DIR"
    fi
}

# Initialize database if needed
init_database() {
    if [ ! -f "$PROJECT_ROOT/backend/database.db" ]; then
        print_info "Initializing database..."
        cd "$PROJECT_ROOT/backend"
        node init-db.js
        cd "$PROJECT_ROOT"
        print_success "Database initialized"
    fi
}

# Get local IP address
get_local_ip() {
    local ip
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        ip=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n1)
    else
        # Linux
        ip=$(hostname -I | awk '{print $1}')
    fi
    echo "$ip"
}

# Start servers
start_servers() {
    print_info "Starting Braille Typing Practice servers..."

    create_logs_dir
    init_database

    cd "$PROJECT_ROOT"

    # Start both backend and frontend using PM2
    pm2 start ecosystem.config.js --env development

    if [ $? -eq 0 ]; then
        print_success "Servers started successfully!"
        echo ""
        print_info "Server Information:"
        echo "  🌐 Local access:"
        echo "    - Backend:  http://localhost:4000"
        echo "    - Frontend: http://localhost:8080"
        echo ""

        local_ip=$(get_local_ip)
        if [ -n "$local_ip" ]; then
            print_info "  🌍 Network access (same WiFi/LAN):"
            echo "    - Backend:  http://$local_ip:4000"
            echo "    - Frontend: http://$local_ip:8080"
            echo ""
            print_warning "Make sure your firewall allows connections on ports 4000 and 8080"
        fi

        echo ""
        print_info "Use 'pm2 logs' to view logs or './scripts/server.sh logs'"
        print_info "Use './scripts/server.sh status' to check server status"
    else
        print_error "Failed to start servers"
        exit 1
    fi
}

# Stop servers
stop_servers() {
    print_info "Stopping Braille Typing Practice servers..."

    pm2 stop ecosystem.config.js
    pm2 delete ecosystem.config.js

    if [ $? -eq 0 ]; then
        print_success "Servers stopped successfully!"
    else
        print_error "Failed to stop servers"
        exit 1
    fi
}

# Restart servers
restart_servers() {
    print_info "Restarting Braille Typing Practice servers..."

    pm2 restart ecosystem.config.js

    if [ $? -eq 0 ]; then
        print_success "Servers restarted successfully!"
        show_status
    else
        print_error "Failed to restart servers"
        exit 1
    fi
}

# Show server status
show_status() {
    print_info "Server Status:"
    pm2 list
    echo ""

    local_ip=$(get_local_ip)
    if [ -n "$local_ip" ]; then
        print_info "Access URLs:"
        echo "  Local:   http://localhost:8080"
        echo "  Network: http://$local_ip:8080"
    fi
}

# Show logs
show_logs() {
    print_info "Showing PM2 logs (Ctrl+C to exit)..."
    pm2 logs
}

# Show help
show_help() {
    echo "Braille Typing Practice Server Management"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start    Start the servers (backend + frontend)"
    echo "  stop     Stop the servers"
    echo "  restart  Restart the servers"
    echo "  status   Show server status and access URLs"
    echo "  logs     Show server logs"
    echo "  help     Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start     # Start servers"
    echo "  $0 status    # Check if servers are running"
    echo "  $0 stop      # Stop servers"
}

# Main script logic
main() {
    check_pm2

    case "${1:-help}" in
        start)
            start_servers
            ;;
        stop)
            stop_servers
            ;;
        restart)
            restart_servers
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"