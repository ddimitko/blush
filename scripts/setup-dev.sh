#!/bin/bash

# Lunara Development Environment Setup Script
# Sets up the complete development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
    echo "  --skip-docker       Skip Docker setup"
    echo "  --skip-deps         Skip dependency installation"
    echo "  --skip-db           Skip database setup"
    echo "  --reset             Reset all data and start fresh"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "This script will:"
    echo "  1. Check prerequisites"
    echo "  2. Install dependencies"
    echo "  3. Set up Docker environment"
    echo "  4. Initialize database"
    echo "  5. Start development servers"
}

# Parse command line arguments
parse_args() {
    SKIP_DOCKER=false
    SKIP_DEPS=false
    SKIP_DB=false
    RESET=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-docker)
                SKIP_DOCKER=true
                shift
                ;;
            --skip-deps)
                SKIP_DEPS=true
                shift
                ;;
            --skip-db)
                SKIP_DB=true
                shift
                ;;
            --reset)
                RESET=true
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

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Java
    if ! command -v java &> /dev/null; then
        print_error "Java is not installed. Please install Java 21+"
        exit 1
    fi
    
    JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f1)
    if [[ "$JAVA_VERSION" -lt 21 ]]; then
        print_error "Java 21+ is required. Current version: $JAVA_VERSION"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ "$NODE_VERSION" -lt 18 ]]; then
        print_error "Node.js 18+ is required. Current version: $NODE_VERSION"
        exit 1
    fi
    
    # Check Docker
    if [[ "$SKIP_DOCKER" == false ]]; then
        if ! command -v docker &> /dev/null; then
            print_error "Docker is not installed. Please install Docker or use --skip-docker"
            exit 1
        fi
        
        if ! docker info &> /dev/null; then
            print_error "Docker is not running. Please start Docker or use --skip-docker"
            exit 1
        fi
        
        if ! command -v docker-compose &> /dev/null; then
            print_error "Docker Compose is not installed. Please install Docker Compose or use --skip-docker"
            exit 1
        fi
    fi
    
    print_success "Prerequisites check passed"
}

# Create environment file
create_env_file() {
    if [[ ! -f ".env" ]]; then
        print_status "Creating .env file from template..."
        cp .env.example .env
        print_warning "Please edit .env file with your configuration"
    else
        print_status ".env file already exists"
    fi
}

# Install backend dependencies
install_backend_deps() {
    if [[ "$SKIP_DEPS" == true ]]; then
        return 0
    fi
    
    print_status "Installing backend dependencies..."
    
    # Make gradlew executable
    chmod +x ./gradlew
    
    # Download dependencies
    ./gradlew build -x test --no-daemon
    
    print_success "Backend dependencies installed"
}

# Install frontend dependencies
install_frontend_deps() {
    if [[ "$SKIP_DEPS" == true ]]; then
        return 0
    fi
    
    print_status "Installing frontend dependencies..."
    
    cd bhfrontend
    
    # Install dependencies
    npm ci
    
    cd ..
    
    print_success "Frontend dependencies installed"
}

# Setup Docker environment
setup_docker() {
    if [[ "$SKIP_DOCKER" == true ]]; then
        return 0
    fi
    
    print_status "Setting up Docker environment..."
    
    # Stop existing containers if reset is requested
    if [[ "$RESET" == true ]]; then
        print_status "Stopping and removing existing containers..."
        docker-compose down -v
    fi
    
    # Start infrastructure services
    print_status "Starting infrastructure services..."
    docker-compose up -d postgres redis rabbitmq
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Check if services are healthy
    for i in {1..30}; do
        if docker-compose exec postgres pg_isready -U postgres &> /dev/null; then
            print_success "PostgreSQL is ready"
            break
        fi
        if [[ $i -eq 30 ]]; then
            print_error "PostgreSQL failed to start"
            exit 1
        fi
        sleep 2
    done
    
    for i in {1..30}; do
        if docker-compose exec redis redis-cli ping &> /dev/null; then
            print_success "Redis is ready"
            break
        fi
        if [[ $i -eq 30 ]]; then
            print_error "Redis failed to start"
            exit 1
        fi
        sleep 2
    done
    
    print_success "Docker environment is ready"
}

# Initialize database
init_database() {
    if [[ "$SKIP_DB" == true ]]; then
        return 0
    fi
    
    print_status "Initializing database..."
    
    # Create uploads directory
    mkdir -p uploads/shops uploads/avatars
    
    # Run database migrations (if using Flyway)
    if [[ -d "src/main/resources/db/migration" ]]; then
        print_status "Running database migrations..."
        ./gradlew flywayMigrate --no-daemon
    fi
    
    print_success "Database initialized"
}

# Start development servers
start_dev_servers() {
    print_status "Development environment is ready!"
    echo ""
    echo "To start the development servers:"
    echo ""
    echo "Backend (Terminal 1):"
    echo "  ./gradlew bootRun"
    echo ""
    echo "Frontend (Terminal 2):"
    echo "  cd bhfrontend && npm start"
    echo ""
    echo "Services:"
    echo "  Backend:    http://localhost:8080"
    echo "  Frontend:   http://localhost:3000"
    echo "  PostgreSQL: localhost:5432"
    echo "  Redis:      localhost:6379"
    echo "  RabbitMQ:   http://localhost:15672 (guest/guest)"
    echo ""
    echo "Useful commands:"
    echo "  ./run-tests.sh                 # Run all tests"
    echo "  ./scripts/health-check.sh      # Check service health"
    echo "  ./scripts/backup.sh            # Create backup"
    echo "  docker-compose logs [service]  # View service logs"
}

# Main setup function
main() {
    echo "🚀 Lunara Development Environment Setup"
    echo "======================================"
    
    parse_args "$@"
    
    check_prerequisites
    create_env_file
    install_backend_deps
    install_frontend_deps
    setup_docker
    init_database
    start_dev_servers
    
    print_success "🎉 Development environment setup completed!"
}

# Run main function with all arguments
main "$@"
