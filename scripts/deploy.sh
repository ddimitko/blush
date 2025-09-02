#!/bin/bash

# Lunara Deployment Script
# This script handles deployment to different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="development"
SKIP_TESTS=false
SKIP_BACKUP=false
FORCE_DEPLOY=false
DRY_RUN=false

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
    echo "  -e, --environment ENV    Target environment (development|production) [default: development]"
    echo "  -t, --skip-tests        Skip running tests before deployment"
    echo "  -b, --skip-backup       Skip database backup (production only)"
    echo "  -f, --force             Force deployment without confirmation"
    echo "  -d, --dry-run           Show what would be deployed without actually deploying"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -e development                # Deploy to development"
    echo "  $0 -e production -f              # Force deploy to production"
    echo "  $0 -e production --skip-backup   # Deploy to production without backup"
    echo "  $0 --dry-run                     # Show deployment plan"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -t|--skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            -b|--skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            -f|--force)
                FORCE_DEPLOY=true
                shift
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
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

# Validate environment
validate_environment() {
    if [[ "$ENVIRONMENT" != "development" && "$ENVIRONMENT" != "production" ]]; then
        print_error "Invalid environment: $ENVIRONMENT. Must be 'development' or 'production'"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker is not running"
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if environment file exists
    if [[ "$ENVIRONMENT" == "production" ]]; then
        if [[ ! -f ".env.production" ]]; then
            print_error "Production environment file (.env.production) not found"
            exit 1
        fi
    else
        if [[ ! -f ".env" ]]; then
            print_error "Development environment file (.env) not found"
            exit 1
        fi
    fi
    
    print_success "Prerequisites check passed"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        print_warning "Skipping tests as requested"
        return 0
    fi
    
    print_status "Running tests..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_status "[DRY RUN] Would run: ./run-tests.sh"
        return 0
    fi
    
    if ! ./run-tests.sh; then
        print_error "Tests failed. Deployment aborted."
        exit 1
    fi
    
    print_success "All tests passed"
}

# Create database backup
create_backup() {
    if [[ "$ENVIRONMENT" != "production" || "$SKIP_BACKUP" == true ]]; then
        return 0
    fi
    
    print_status "Creating database backup..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_status "[DRY RUN] Would create database backup"
        return 0
    fi
    
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    
    # Create backup using docker-compose
    if ! docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres beautyhub > "backups/$BACKUP_FILE"; then
        print_error "Failed to create database backup"
        exit 1
    fi
    
    print_success "Database backup created: backups/$BACKUP_FILE"
}

# Build and push images
build_images() {
    print_status "Building Docker images..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_status "[DRY RUN] Would build and push Docker images"
        return 0
    fi
    
    # Build backend image
    print_status "Building backend image..."
    docker build -t lunara-backend:latest .
    
    # Build frontend image
    print_status "Building frontend image..."
    docker build -t lunara-frontend:latest ./bhfrontend
    
    print_success "Docker images built successfully"
}

# Deploy to environment
deploy() {
    print_status "Deploying to $ENVIRONMENT environment..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_status "[DRY RUN] Would deploy to $ENVIRONMENT"
        return 0
    fi
    
    # Set environment file
    ENV_FILE=".env"
    if [[ "$ENVIRONMENT" == "production" ]]; then
        ENV_FILE=".env.production"
    fi

    # Deploy based on environment
    if [[ "$ENVIRONMENT" == "production" ]]; then
        print_status "Deploying to production..."
        docker-compose -f docker-compose.prod.yml --env-file "$ENV_FILE" up -d
    else
        print_status "Deploying to development..."
        docker-compose --env-file "$ENV_FILE" up -d
    fi
    
    print_success "Deployment completed"
}

# Health check
health_check() {
    print_status "Performing health check..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_status "[DRY RUN] Would perform health check"
        return 0
    fi
    
    # Wait for services to start
    sleep 30
    
    # Check backend health
    if curl -f http://localhost:8080/actuator/health &> /dev/null; then
        print_success "Backend is healthy"
    else
        print_error "Backend health check failed"
        return 1
    fi
    
    # Check frontend health
    if curl -f http://localhost:3000/health &> /dev/null; then
        print_success "Frontend is healthy"
    else
        print_error "Frontend health check failed"
        return 1
    fi
    
    print_success "All services are healthy"
}

# Rollback deployment
rollback() {
    print_error "Deployment failed. Rolling back..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_status "[DRY RUN] Would rollback deployment"
        return 0
    fi
    
    # Stop current deployment
    if [[ "$ENVIRONMENT" == "production" ]]; then
        docker-compose -f docker-compose.prod.yml down
    else
        docker-compose down
    fi
    
    print_warning "Rollback completed. Please check logs and redeploy."
}

# Confirm deployment
confirm_deployment() {
    if [[ "$FORCE_DEPLOY" == true || "$DRY_RUN" == true ]]; then
        return 0
    fi
    
    echo ""
    print_warning "You are about to deploy to $ENVIRONMENT environment."
    echo "This will:"
    echo "  - Build new Docker images"
    echo "  - Stop current services"
    echo "  - Start new services"
    
    if [[ "$ENVIRONMENT" == "production" && "$SKIP_BACKUP" == false ]]; then
        echo "  - Create database backup"
    fi
    
    echo ""
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Deployment cancelled"
        exit 0
    fi
}

# Main deployment function
main() {
    echo "🚀 Lunara Deployment Script"
    echo "=========================="
    
    parse_args "$@"
    validate_environment
    
    if [[ "$DRY_RUN" == true ]]; then
        print_status "DRY RUN MODE - No actual changes will be made"
    fi
    
    print_status "Target environment: $ENVIRONMENT"
    
    confirm_deployment
    check_prerequisites
    run_tests
    create_backup
    build_images
    
    if deploy && health_check; then
        print_success "🎉 Deployment to $ENVIRONMENT completed successfully!"
        
        if [[ "$ENVIRONMENT" == "production" ]]; then
            print_status "Production deployment completed. Please monitor the application."
        fi
    else
        rollback
        exit 1
    fi
}

# Run main function with all arguments
main "$@"
