#!/bin/bash

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
BACKUP_DIR="backups"

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
    echo "=================================================="
    echo "🚀 Braille Typing Practice - Deployment Script"
    echo "=================================================="
    echo -e "${NC}"
}

check_requirements() {
    print_step "Checking requirements..."

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi

    print_success "All requirements are met"
}

setup_environment() {
    print_step "Setting up environment..."

    if [ ! -f "$ENV_FILE" ]; then
        print_warning "No .env file found. Creating from .env.example..."
        cp .env.example .env

        # Generate a random JWT secret
        JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)

        # Update JWT_SECRET in .env file
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/" .env
        else
            # Linux
            sed -i "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/" .env
        fi

        print_warning "Please review and update the .env file with your configuration!"
        print_warning "Especially update FRONTEND_URL and ALLOWED_ORIGINS for production."
    else
        print_success "Environment file already exists"
    fi
}

backup_data() {
    print_step "Creating backup..."

    # Create backup directory
    mkdir -p "$BACKUP_DIR"

    # Create timestamp
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="$BACKUP_DIR/braille-backup-$TIMESTAMP.tar.gz"

    # Check if there are existing volumes to backup
    if docker volume ls | grep -q "braille"; then
        print_step "Backing up existing data..."

        # Create temporary container to access volume data
        docker run --rm \
            -v braille_data:/data \
            -v braille_uploads:/uploads \
            -v "$(pwd)/$BACKUP_DIR":/backup \
            alpine:latest \
            tar czf "/backup/braille-backup-$TIMESTAMP.tar.gz" /data /uploads 2>/dev/null || true

        print_success "Backup created: $BACKUP_FILE"
    else
        print_warning "No existing data to backup"
    fi
}

build_and_deploy() {
    print_step "Building and deploying application..."

    # Pull latest changes (if this is a git repository)
    if [ -d ".git" ]; then
        print_step "Pulling latest changes..."
        git pull origin main 2>/dev/null || print_warning "Could not pull from git (this is ok if not a git repo)"
    fi

    # Stop existing containers
    print_step "Stopping existing containers..."
    docker-compose -f "$COMPOSE_FILE" down || true

    # Build new images
    print_step "Building Docker images..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache

    # Start services
    print_step "Starting services..."
    docker-compose -f "$COMPOSE_FILE" up -d

    # Wait for services to be ready
    print_step "Waiting for services to be ready..."
    sleep 10

    # Check if backend is healthy
    for i in {1..30}; do
        if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
            print_success "Backend is healthy"
            break
        fi

        if [ $i -eq 30 ]; then
            print_error "Backend failed to start properly"
            docker-compose -f "$COMPOSE_FILE" logs braille-app
            exit 1
        fi

        sleep 2
    done

    # Initialize database if needed
    print_step "Initializing database..."
    docker-compose -f "$COMPOSE_FILE" exec -T braille-app node backend/init-db.js || true

    print_success "Application deployed successfully!"
}

show_status() {
    print_step "Deployment status:"

    echo ""
    docker-compose -f "$COMPOSE_FILE" ps

    echo ""
    print_success "🌐 Application URLs:"
    echo "   Frontend: http://localhost (if nginx is configured)"
    echo "   Backend API: http://localhost:3000"
    echo "   Health Check: http://localhost:3000/api/health"

    echo ""
    print_success "📊 Useful commands:"
    echo "   View logs: docker-compose logs -f"
    echo "   Stop services: docker-compose down"
    echo "   Restart services: docker-compose restart"
    echo "   Update: ./scripts/deploy.sh"
}

cleanup_old_images() {
    print_step "Cleaning up old Docker images..."
    docker image prune -f >/dev/null 2>&1 || true
    print_success "Cleanup completed"
}

main() {
    print_header

    # Parse command line arguments
    SKIP_BACKUP=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --help)
                echo "Usage: $0 [--skip-backup] [--help]"
                echo "  --skip-backup  Skip data backup step"
                echo "  --help         Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Run deployment steps
    check_requirements
    setup_environment

    if [ "$SKIP_BACKUP" = false ]; then
        backup_data
    fi

    build_and_deploy
    cleanup_old_images
    show_status

    echo ""
    print_success "🎉 Deployment completed successfully!"
    print_warning "Remember to configure your domain and SSL certificates for production use."
}

# Run main function
main "$@"