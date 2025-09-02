#!/bin/bash

# Lunara Backup Script
# Automated backup solution for database and uploads

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="./backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ENVIRONMENT="production"

# Print colored output
print_status() {
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

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Environment (development|production) [default: production]"
    echo "  -r, --retention DAYS     Backup retention in days [default: 30]"
    echo "  -d, --directory DIR      Backup directory [default: ./backups]"
    echo "  --db-only               Backup database only"
    echo "  --files-only            Backup files only"
    echo "  --restore FILE          Restore from backup file"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Full backup"
    echo "  $0 --db-only                         # Database backup only"
    echo "  $0 --files-only                      # Files backup only"
    echo "  $0 --restore backup_20231201_120000  # Restore from backup"
}

# Parse command line arguments
parse_args() {
    DB_ONLY=false
    FILES_ONLY=false
    RESTORE_FILE=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -r|--retention)
                RETENTION_DAYS="$2"
                shift 2
                ;;
            -d|--directory)
                BACKUP_DIR="$2"
                shift 2
                ;;
            --db-only)
                DB_ONLY=true
                shift
                ;;
            --files-only)
                FILES_ONLY=true
                shift
                ;;
            --restore)
                RESTORE_FILE="$2"
                shift 2
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Create backup directory
create_backup_dir() {
    if [[ ! -d "$BACKUP_DIR" ]]; then
        print_status "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

# Check if services are running
check_services() {
    print_status "Checking if services are running..."
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        COMPOSE_FILE="docker-compose.prod.yml"
    else
        COMPOSE_FILE="docker-compose.yml"
    fi
    
    if ! docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        print_error "Services are not running. Please start the application first."
        exit 1
    fi
    
    print_success "Services are running"
}

# Backup database
backup_database() {
    if [[ "$FILES_ONLY" == true ]]; then
        return 0
    fi
    
    print_status "Creating database backup..."
    
    DB_BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        COMPOSE_FILE="docker-compose.prod.yml"
        CONTAINER_NAME="lunara-postgres-prod"
    else
        COMPOSE_FILE="docker-compose.yml"
        CONTAINER_NAME="lunara-postgres"
    fi
    
    # Create database dump
    if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U postgres beautyhub > "$DB_BACKUP_FILE"; then
        print_success "Database backup created: $DB_BACKUP_FILE"
        
        # Compress the backup
        gzip "$DB_BACKUP_FILE"
        print_success "Database backup compressed: ${DB_BACKUP_FILE}.gz"
    else
        print_error "Failed to create database backup"
        return 1
    fi
}

# Backup uploaded files
backup_files() {
    if [[ "$DB_ONLY" == true ]]; then
        return 0
    fi
    
    print_status "Creating files backup..."
    
    FILES_BACKUP_FILE="$BACKUP_DIR/files_backup_$TIMESTAMP.tar.gz"
    
    # Check if uploads directory exists
    if [[ ! -d "uploads" ]]; then
        print_warning "Uploads directory not found, skipping files backup"
        return 0
    fi
    
    # Create tar archive of uploads
    if tar -czf "$FILES_BACKUP_FILE" uploads/; then
        print_success "Files backup created: $FILES_BACKUP_FILE"
    else
        print_error "Failed to create files backup"
        return 1
    fi
}

# Clean old backups
cleanup_old_backups() {
    print_status "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    # Find and delete old database backups
    find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
    
    # Find and delete old file backups
    find "$BACKUP_DIR" -name "files_backup_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete
    
    # Find and delete old full backups
    find "$BACKUP_DIR" -name "full_backup_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete
    
    print_success "Old backups cleaned up"
}

# Create full backup
create_full_backup() {
    if [[ "$DB_ONLY" == true || "$FILES_ONLY" == true ]]; then
        return 0
    fi
    
    print_status "Creating full backup archive..."
    
    FULL_BACKUP_FILE="$BACKUP_DIR/full_backup_$TIMESTAMP.tar.gz"
    
    # Create full backup including both database and files
    tar -czf "$FULL_BACKUP_FILE" \
        --exclude="$BACKUP_DIR" \
        --exclude="node_modules" \
        --exclude="build" \
        --exclude=".git" \
        --exclude="*.log" \
        .
    
    print_success "Full backup created: $FULL_BACKUP_FILE"
}

# Restore from backup
restore_backup() {
    if [[ -z "$RESTORE_FILE" ]]; then
        return 0
    fi
    
    print_warning "Starting restore process..."
    
    # Check if backup file exists
    if [[ ! -f "$BACKUP_DIR/$RESTORE_FILE.sql.gz" && ! -f "$BACKUP_DIR/$RESTORE_FILE.tar.gz" ]]; then
        print_error "Backup file not found: $RESTORE_FILE"
        exit 1
    fi
    
    # Confirm restore
    echo ""
    print_warning "This will restore data from backup: $RESTORE_FILE"
    print_warning "Current data will be OVERWRITTEN!"
    echo ""
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Restore cancelled"
        exit 0
    fi
    
    # Restore database if SQL backup exists
    if [[ -f "$BACKUP_DIR/$RESTORE_FILE.sql.gz" ]]; then
        print_status "Restoring database..."
        
        # Decompress and restore
        gunzip -c "$BACKUP_DIR/$RESTORE_FILE.sql.gz" | \
        docker-compose -f docker-compose.yml exec -T postgres psql -U postgres -d beautyhub
        
        print_success "Database restored"
    fi
    
    # Restore files if tar backup exists
    if [[ -f "$BACKUP_DIR/$RESTORE_FILE.tar.gz" ]]; then
        print_status "Restoring files..."
        
        # Extract files
        tar -xzf "$BACKUP_DIR/$RESTORE_FILE.tar.gz"
        
        print_success "Files restored"
    fi
    
    print_success "Restore completed"
}

# Generate backup report
generate_report() {
    print_status "Generating backup report..."
    
    REPORT_FILE="$BACKUP_DIR/backup_report_$TIMESTAMP.txt"
    
    cat > "$REPORT_FILE" << EOF
Lunara Backup Report
===================
Date: $(date)
Environment: $ENVIRONMENT
Backup Directory: $BACKUP_DIR

Backup Files Created:
EOF
    
    # List created backup files
    find "$BACKUP_DIR" -name "*_$TIMESTAMP.*" -type f >> "$REPORT_FILE"
    
    echo "" >> "$REPORT_FILE"
    echo "Disk Usage:" >> "$REPORT_FILE"
    du -sh "$BACKUP_DIR" >> "$REPORT_FILE"
    
    echo "" >> "$REPORT_FILE"
    echo "Available Backups:" >> "$REPORT_FILE"
    ls -la "$BACKUP_DIR" >> "$REPORT_FILE"
    
    print_success "Backup report generated: $REPORT_FILE"
}

# Upload to cloud storage (optional)
upload_to_cloud() {
    # Check if AWS CLI is configured
    if command -v aws &> /dev/null && [[ -n "${AWS_S3_BUCKET:-}" ]]; then
        print_status "Uploading backups to S3..."
        
        # Upload database backup
        if [[ -f "$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz" ]]; then
            aws s3 cp "$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz" "s3://$AWS_S3_BUCKET/backups/"
        fi
        
        # Upload files backup
        if [[ -f "$BACKUP_DIR/files_backup_$TIMESTAMP.tar.gz" ]]; then
            aws s3 cp "$BACKUP_DIR/files_backup_$TIMESTAMP.tar.gz" "s3://$AWS_S3_BUCKET/backups/"
        fi
        
        print_success "Backups uploaded to S3"
    else
        print_warning "AWS CLI not configured or S3 bucket not specified, skipping cloud upload"
    fi
}

# Main backup function
main() {
    echo "💾 Lunara Backup Script"
    echo "======================"
    
    parse_args "$@"
    
    print_status "Environment: $ENVIRONMENT"
    print_status "Backup directory: $BACKUP_DIR"
    print_status "Retention: $RETENTION_DAYS days"
    
    # Handle restore
    if [[ -n "$RESTORE_FILE" ]]; then
        restore_backup
        exit 0
    fi
    
    create_backup_dir
    check_services
    
    # Create backups
    if backup_database && backup_files; then
        create_full_backup
        cleanup_old_backups
        generate_report
        upload_to_cloud
        
        print_success "🎉 Backup completed successfully!"
        
        # Show backup summary
        echo ""
        echo "Backup Summary:"
        echo "==============="
        find "$BACKUP_DIR" -name "*_$TIMESTAMP.*" -type f -exec ls -lh {} \;
    else
        print_error "Backup failed"
        exit 1
    fi
}

# Run main function with all arguments
main "$@"
