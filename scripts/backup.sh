#!/bin/bash

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BACKUP_DIR="backups"
COMPOSE_FILE="docker-compose.yml"

print_step() {
    echo -e "${BLUE}📝 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "${BLUE}"
    echo "=============================================="
    echo "💾 Braille Typing Practice - Backup Script"
    echo "=============================================="
    echo -e "${NC}"
}

create_backup() {
    print_header

    # Create backup directory
    mkdir -p "$BACKUP_DIR"

    # Create timestamp
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="$BACKUP_DIR/braille-backup-$TIMESTAMP.tar.gz"

    print_step "Creating backup: $BACKUP_FILE"

    # Check if containers are running
    if ! docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        print_error "No running containers found. Please start the application first."
        exit 1
    fi

    # Create backup of database and uploads
    docker run --rm \
        -v braille_data:/data:ro \
        -v braille_uploads:/uploads:ro \
        -v "$(pwd)/$BACKUP_DIR":/backup \
        alpine:latest \
        sh -c "cd / && tar czf /backup/braille-backup-$TIMESTAMP.tar.gz data uploads"

    # Create a metadata file
    cat > "$BACKUP_DIR/backup-$TIMESTAMP.info" << EOF
Backup Information
==================
Date: $(date)
Application: Braille Typing Practice
Backup File: $BACKUP_FILE
Docker Images:
$(docker-compose -f "$COMPOSE_FILE" images)

Container Status:
$(docker-compose -f "$COMPOSE_FILE" ps)
EOF

    print_success "Backup created successfully!"
    echo "📁 Backup file: $BACKUP_FILE"
    echo "📋 Info file: $BACKUP_DIR/backup-$TIMESTAMP.info"

    # Show backup size
    if [ -f "$BACKUP_FILE" ]; then
        SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo "📊 Backup size: $SIZE"
    fi
}

restore_backup() {
    if [ -z "$1" ]; then
        print_error "Please specify backup file to restore"
        echo "Usage: $0 restore <backup-file>"
        echo "Available backups:"
        ls -la "$BACKUP_DIR"/*.tar.gz 2>/dev/null || echo "No backups found"
        exit 1
    fi

    BACKUP_FILE="$1"

    if [ ! -f "$BACKUP_FILE" ]; then
        print_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi

    print_header
    print_step "Restoring from backup: $BACKUP_FILE"

    # Stop containers
    print_step "Stopping containers..."
    docker-compose -f "$COMPOSE_FILE" down

    # Remove existing volumes
    print_step "Removing existing data..."
    docker volume rm braille_data braille_uploads 2>/dev/null || true

    # Create new volumes
    docker volume create braille_data
    docker volume create braille_uploads

    # Restore data
    print_step "Restoring data..."
    docker run --rm \
        -v braille_data:/data \
        -v braille_uploads:/uploads \
        -v "$(pwd)/$BACKUP_DIR":/backup \
        alpine:latest \
        sh -c "cd / && tar xzf /backup/$(basename "$BACKUP_FILE")"

    # Start containers
    print_step "Starting containers..."
    docker-compose -f "$COMPOSE_FILE" up -d

    print_success "Backup restored successfully!"
}

list_backups() {
    print_header
    print_step "Available backups:"

    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR"/*.tar.gz 2>/dev/null)" ]; then
        echo "No backups found"
        return
    fi

    echo ""
    printf "%-20s %-15s %-10s\n" "DATE" "TIME" "SIZE"
    echo "================================================"

    for backup in "$BACKUP_DIR"/*.tar.gz; do
        if [ -f "$backup" ]; then
            filename=$(basename "$backup")
            # Extract date and time from filename
            if [[ $filename =~ braille-backup-([0-9]{8})_([0-9]{6})\.tar\.gz ]]; then
                date_part="${BASH_REMATCH[1]}"
                time_part="${BASH_REMATCH[2]}"

                # Format date
                formatted_date="${date_part:0:4}-${date_part:4:2}-${date_part:6:2}"
                formatted_time="${time_part:0:2}:${time_part:2:2}:${time_part:4:2}"

                # Get file size
                size=$(du -h "$backup" | cut -f1)

                printf "%-20s %-15s %-10s %s\n" "$formatted_date" "$formatted_time" "$size" "$filename"
            fi
        fi
    done

    echo ""
    echo "To restore a backup, run:"
    echo "  $0 restore $BACKUP_DIR/<backup-file>"
}

cleanup_old_backups() {
    KEEP_DAYS=${1:-7}  # Keep backups for 7 days by default

    print_header
    print_step "Cleaning up backups older than $KEEP_DAYS days..."

    if [ ! -d "$BACKUP_DIR" ]; then
        echo "No backup directory found"
        return
    fi

    # Find and remove old backup files
    deleted_count=0
    for backup in "$BACKUP_DIR"/braille-backup-*.tar.gz; do
        if [ -f "$backup" ]; then
            # Check if file is older than KEEP_DAYS
            if [ "$(find "$backup" -mtime +$KEEP_DAYS)" ]; then
                echo "Removing old backup: $(basename "$backup")"
                rm -f "$backup"
                # Also remove corresponding info file
                info_file="${backup%.tar.gz}.info"
                [ -f "$info_file" ] && rm -f "$info_file"
                ((deleted_count++))
            fi
        fi
    done

    if [ $deleted_count -eq 0 ]; then
        echo "No old backups to clean up"
    else
        print_success "Removed $deleted_count old backup(s)"
    fi
}

show_help() {
    echo "Braille Typing Practice - Backup Script"
    echo ""
    echo "Usage:"
    echo "  $0 create                    Create a new backup"
    echo "  $0 restore <backup-file>     Restore from backup"
    echo "  $0 list                      List all available backups"
    echo "  $0 cleanup [days]            Remove backups older than N days (default: 7)"
    echo "  $0 help                      Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 create"
    echo "  $0 restore backups/braille-backup-20231215_143022.tar.gz"
    echo "  $0 cleanup 30"
}

# Main script logic
case "$1" in
    create)
        create_backup
        ;;
    restore)
        restore_backup "$2"
        ;;
    list)
        list_backups
        ;;
    cleanup)
        cleanup_old_backups "$2"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "Invalid command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac