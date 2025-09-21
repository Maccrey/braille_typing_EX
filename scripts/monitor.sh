#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

COMPOSE_FILE="docker-compose.yml"

print_step() {
    echo -e "${BLUE}📝 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "${BLUE}"
    echo "=============================================="
    echo "📊 Braille Typing Practice - Monitor Script"
    echo "=============================================="
    echo -e "${NC}"
}

show_status() {
    print_header
    print_step "Application Status"

    echo ""
    docker-compose -f "$COMPOSE_FILE" ps

    echo ""
    print_step "Health Checks"

    # Check backend health
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        print_success "Backend API is healthy"
    else
        print_error "Backend API is not responding"
    fi

    # Check if frontend is accessible (assuming nginx on port 80)
    if curl -f http://localhost >/dev/null 2>&1; then
        print_success "Frontend is accessible"
    else
        print_warning "Frontend may not be accessible (nginx might not be configured)"
    fi
}

show_logs() {
    service="${1:-braille-app}"
    lines="${2:-50}"

    print_header
    print_step "Showing last $lines lines of logs for service: $service"

    echo ""
    docker-compose -f "$COMPOSE_FILE" logs --tail="$lines" "$service"
}

show_stats() {
    print_header
    print_step "Resource Usage Statistics"

    echo ""
    echo "📊 Container Stats:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"

    echo ""
    echo "💾 Volume Usage:"
    docker system df -v | grep -E "(VOLUME NAME|braille_)"

    echo ""
    echo "🌐 Network Information:"
    docker network ls | grep braille

    echo ""
    echo "📈 System Information:"
    echo "Docker version: $(docker --version)"
    echo "Docker Compose version: $(docker-compose --version)"
    echo "Available disk space:"
    df -h . | tail -n 1
}

tail_logs() {
    service="${1:-braille-app}"

    print_header
    print_step "Following logs for service: $service (Press Ctrl+C to stop)"

    echo ""
    docker-compose -f "$COMPOSE_FILE" logs -f "$service"
}

health_check() {
    print_header
    print_step "Performing detailed health check..."

    echo ""

    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker daemon is not running"
        return 1
    fi
    print_success "Docker daemon is running"

    # Check if compose file exists
    if [ ! -f "$COMPOSE_FILE" ]; then
        print_error "Docker Compose file not found: $COMPOSE_FILE"
        return 1
    fi
    print_success "Docker Compose file found"

    # Check container status
    if ! docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        print_error "No containers are running"
        return 1
    fi
    print_success "Containers are running"

    # Check backend API
    print_step "Testing backend API endpoints..."

    # Health endpoint
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        print_success "Health endpoint is responding"
    else
        print_error "Health endpoint is not responding"
        return 1
    fi

    # Try to reach main API endpoint
    if curl -f http://localhost:3000/ >/dev/null 2>&1; then
        print_success "Main API endpoint is responding"
    else
        print_error "Main API endpoint is not responding"
        return 1
    fi

    # Check database connectivity
    print_step "Checking database connectivity..."
    if docker-compose -f "$COMPOSE_FILE" exec -T braille-app node -e "
        const db = require('./backend/config/database');
        db.get('SELECT 1', (err, row) => {
            if (err) {
                console.error('Database error:', err.message);
                process.exit(1);
            } else {
                console.log('Database connection successful');
                process.exit(0);
            }
        });
    " >/dev/null 2>&1; then
        print_success "Database connection is working"
    else
        print_error "Database connection failed"
        return 1
    fi

    echo ""
    print_success "🎉 All health checks passed!"
}

show_help() {
    echo "Braille Typing Practice - Monitor Script"
    echo ""
    echo "Usage:"
    echo "  $0 status                    Show application status"
    echo "  $0 logs [service] [lines]    Show recent logs (default: braille-app, 50 lines)"
    echo "  $0 tail [service]            Follow logs in real-time"
    echo "  $0 stats                     Show resource usage statistics"
    echo "  $0 health                    Perform detailed health check"
    echo "  $0 help                      Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 status"
    echo "  $0 logs braille-app 100"
    echo "  $0 tail nginx"
    echo "  $0 stats"
    echo "  $0 health"
}

# Main script logic
case "$1" in
    status)
        show_status
        ;;
    logs)
        show_logs "$2" "$3"
        ;;
    tail)
        tail_logs "$2"
        ;;
    stats)
        show_stats
        ;;
    health)
        health_check
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        if [ -z "$1" ]; then
            show_status
        else
            echo "Invalid command: $1"
            echo ""
            show_help
            exit 1
        fi
        ;;
esac