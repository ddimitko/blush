#!/bin/bash

# Lunara Health Check Script
# Comprehensive health monitoring for all services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="production"
TIMEOUT=10
RETRY_COUNT=3
RETRY_DELAY=5

# Service endpoints
BACKEND_URL="http://localhost:8080"
FRONTEND_URL="http://localhost:3000"
POSTGRES_HOST="localhost"
POSTGRES_PORT="5432"
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Environment (development|production) [default: production]"
    echo "  -t, --timeout SECONDS    Request timeout in seconds [default: 10]"
    echo "  -r, --retry COUNT        Number of retries [default: 3]"
    echo "  -d, --delay SECONDS      Delay between retries [default: 5]"
    echo "  --backend-only          Check backend services only"
    echo "  --frontend-only         Check frontend only"
    echo "  --infrastructure-only   Check infrastructure services only"
    echo "  --json                  Output results in JSON format"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                      # Full health check"
    echo "  $0 --backend-only       # Check backend services only"
    echo "  $0 --json               # JSON output for monitoring"
}

# Parse command line arguments
parse_args() {
    BACKEND_ONLY=false
    FRONTEND_ONLY=false
    INFRASTRUCTURE_ONLY=false
    JSON_OUTPUT=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -t|--timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            -r|--retry)
                RETRY_COUNT="$2"
                shift 2
                ;;
            -d|--delay)
                RETRY_DELAY="$2"
                shift 2
                ;;
            --backend-only)
                BACKEND_ONLY=true
                shift
                ;;
            --frontend-only)
                FRONTEND_ONLY=true
                shift
                ;;
            --infrastructure-only)
                INFRASTRUCTURE_ONLY=true
                shift
                ;;
            --json)
                JSON_OUTPUT=true
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

# Initialize results
init_results() {
    declare -A RESULTS
    OVERALL_STATUS="healthy"
    START_TIME=$(date +%s)
}

# Record result
record_result() {
    local service=$1
    local status=$2
    local message=$3
    local response_time=$4
    
    RESULTS["$service"]="$status|$message|$response_time"
    
    if [[ "$status" != "healthy" ]]; then
        OVERALL_STATUS="unhealthy"
    fi
}

# Check HTTP endpoint with retries
check_http_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    for ((i=1; i<=RETRY_COUNT; i++)); do
        local start_time=$(date +%s%3N)
        
        if response=$(curl -s -w "%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null); then
            local end_time=$(date +%s%3N)
            local response_time=$((end_time - start_time))
            local http_code="${response: -3}"
            local body="${response%???}"
            
            if [[ "$http_code" == "$expected_status" ]]; then
                record_result "$name" "healthy" "HTTP $http_code" "${response_time}ms"
                if [[ "$JSON_OUTPUT" != true ]]; then
                    print_success "$name is healthy (${response_time}ms)"
                fi
                return 0
            else
                if [[ "$JSON_OUTPUT" != true ]]; then
                    print_warning "$name returned HTTP $http_code (attempt $i/$RETRY_COUNT)"
                fi
            fi
        else
            if [[ "$JSON_OUTPUT" != true ]]; then
                print_warning "$name is unreachable (attempt $i/$RETRY_COUNT)"
            fi
        fi
        
        if [[ $i -lt $RETRY_COUNT ]]; then
            sleep "$RETRY_DELAY"
        fi
    done
    
    record_result "$name" "unhealthy" "Failed after $RETRY_COUNT attempts" "0ms"
    if [[ "$JSON_OUTPUT" != true ]]; then
        print_error "$name is unhealthy"
    fi
    return 1
}

# Check TCP port
check_tcp_port() {
    local name=$1
    local host=$2
    local port=$3
    
    local start_time=$(date +%s%3N)
    
    if timeout "$TIMEOUT" bash -c "</dev/tcp/$host/$port" 2>/dev/null; then
        local end_time=$(date +%s%3N)
        local response_time=$((end_time - start_time))
        
        record_result "$name" "healthy" "Port $port open" "${response_time}ms"
        if [[ "$JSON_OUTPUT" != true ]]; then
            print_success "$name is healthy (${response_time}ms)"
        fi
        return 0
    else
        record_result "$name" "unhealthy" "Port $port closed or unreachable" "0ms"
        if [[ "$JSON_OUTPUT" != true ]]; then
            print_error "$name is unhealthy"
        fi
        return 1
    fi
}

# Check Docker container
check_docker_container() {
    local name=$1
    local container_name=$2
    
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "$container_name.*Up"; then
        local uptime=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep "$container_name" | awk '{print $2, $3, $4}')
        record_result "$name" "healthy" "Container running ($uptime)" "0ms"
        if [[ "$JSON_OUTPUT" != true ]]; then
            print_success "$name container is running"
        fi
        return 0
    else
        record_result "$name" "unhealthy" "Container not running" "0ms"
        if [[ "$JSON_OUTPUT" != true ]]; then
            print_error "$name container is not running"
        fi
        return 1
    fi
}

# Check database connectivity
check_database() {
    if [[ "$FRONTEND_ONLY" == true ]]; then
        return 0
    fi
    
    if [[ "$JSON_OUTPUT" != true ]]; then
        print_status "Checking database..."
    fi
    
    # Check PostgreSQL port
    check_tcp_port "PostgreSQL" "$POSTGRES_HOST" "$POSTGRES_PORT"
    
    # Check database connection via backend
    if [[ "$ENVIRONMENT" == "production" ]]; then
        check_docker_container "PostgreSQL Container" "lunara-postgres-prod"
    else
        check_docker_container "PostgreSQL Container" "lunara-postgres"
    fi
}

# Check Redis
check_redis() {
    if [[ "$FRONTEND_ONLY" == true ]]; then
        return 0
    fi
    
    if [[ "$JSON_OUTPUT" != true ]]; then
        print_status "Checking Redis..."
    fi
    
    # Check Redis port
    check_tcp_port "Redis" "$REDIS_HOST" "$REDIS_PORT"
    
    # Check Redis container
    if [[ "$ENVIRONMENT" == "production" ]]; then
        check_docker_container "Redis Container" "lunara-redis-prod"
    else
        check_docker_container "Redis Container" "lunara-redis"
    fi
}

# Check RabbitMQ
check_rabbitmq() {
    if [[ "$FRONTEND_ONLY" == true ]]; then
        return 0
    fi
    
    if [[ "$JSON_OUTPUT" != true ]]; then
        print_status "Checking RabbitMQ..."
    fi
    
    # Check RabbitMQ ports
    check_tcp_port "RabbitMQ AMQP" "localhost" "5672"
    check_tcp_port "RabbitMQ Management" "localhost" "15672"
    
    # Check RabbitMQ container
    if [[ "$ENVIRONMENT" == "production" ]]; then
        check_docker_container "RabbitMQ Container" "lunara-rabbitmq-prod"
    else
        check_docker_container "RabbitMQ Container" "lunara-rabbitmq"
    fi
}

# Check backend application
check_backend() {
    if [[ "$FRONTEND_ONLY" == true ]]; then
        return 0
    fi
    
    if [[ "$JSON_OUTPUT" != true ]]; then
        print_status "Checking backend application..."
    fi
    
    # Check health endpoint
    check_http_endpoint "Backend Health" "$BACKEND_URL/actuator/health"
    
    # Check API endpoint
    check_http_endpoint "Backend API" "$BACKEND_URL/api/test/hello"
    
    # Check backend container
    if [[ "$ENVIRONMENT" == "production" ]]; then
        check_docker_container "Backend Container" "lunara-backend-prod"
    else
        check_docker_container "Backend Container" "lunara-backend"
    fi
}

# Check frontend application
check_frontend() {
    if [[ "$BACKEND_ONLY" == true || "$INFRASTRUCTURE_ONLY" == true ]]; then
        return 0
    fi
    
    if [[ "$JSON_OUTPUT" != true ]]; then
        print_status "Checking frontend application..."
    fi
    
    # Check frontend health
    check_http_endpoint "Frontend" "$FRONTEND_URL"
    
    # Check frontend container
    if [[ "$ENVIRONMENT" == "production" ]]; then
        check_docker_container "Frontend Container" "lunara-frontend-prod"
    else
        check_docker_container "Frontend Container" "lunara-frontend"
    fi
}

# Check system resources
check_system_resources() {
    if [[ "$JSON_OUTPUT" != true ]]; then
        print_status "Checking system resources..."
    fi
    
    # Check disk space
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ $disk_usage -lt 90 ]]; then
        record_result "Disk Space" "healthy" "Usage: ${disk_usage}%" "0ms"
        if [[ "$JSON_OUTPUT" != true ]]; then
            print_success "Disk space is healthy (${disk_usage}% used)"
        fi
    else
        record_result "Disk Space" "warning" "Usage: ${disk_usage}%" "0ms"
        if [[ "$JSON_OUTPUT" != true ]]; then
            print_warning "Disk space is high (${disk_usage}% used)"
        fi
    fi
    
    # Check memory usage
    local memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [[ $memory_usage -lt 90 ]]; then
        record_result "Memory" "healthy" "Usage: ${memory_usage}%" "0ms"
        if [[ "$JSON_OUTPUT" != true ]]; then
            print_success "Memory usage is healthy (${memory_usage}% used)"
        fi
    else
        record_result "Memory" "warning" "Usage: ${memory_usage}%" "0ms"
        if [[ "$JSON_OUTPUT" != true ]]; then
            print_warning "Memory usage is high (${memory_usage}% used)"
        fi
    fi
}

# Output results in JSON format
output_json() {
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    
    echo "{"
    echo "  \"timestamp\": \"$(date -Iseconds)\","
    echo "  \"environment\": \"$ENVIRONMENT\","
    echo "  \"overall_status\": \"$OVERALL_STATUS\","
    echo "  \"duration_seconds\": $duration,"
    echo "  \"services\": {"
    
    local first=true
    for service in "${!RESULTS[@]}"; do
        if [[ "$first" == false ]]; then
            echo ","
        fi
        first=false
        
        IFS='|' read -r status message response_time <<< "${RESULTS[$service]}"
        echo "    \"$service\": {"
        echo "      \"status\": \"$status\","
        echo "      \"message\": \"$message\","
        echo "      \"response_time\": \"$response_time\""
        echo -n "    }"
    done
    
    echo ""
    echo "  }"
    echo "}"
}

# Output results in human-readable format
output_summary() {
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    
    echo ""
    echo "Health Check Summary"
    echo "==================="
    echo "Environment: $ENVIRONMENT"
    echo "Overall Status: $OVERALL_STATUS"
    echo "Duration: ${duration}s"
    echo ""
    
    if [[ "$OVERALL_STATUS" == "healthy" ]]; then
        print_success "All services are healthy! 🎉"
    else
        print_error "Some services are unhealthy! ⚠️"
        echo ""
        echo "Failed Services:"
        for service in "${!RESULTS[@]}"; do
            IFS='|' read -r status message response_time <<< "${RESULTS[$service]}"
            if [[ "$status" != "healthy" ]]; then
                echo "  - $service: $message"
            fi
        done
    fi
}

# Main health check function
main() {
    if [[ "$JSON_OUTPUT" != true ]]; then
        echo "🏥 Lunara Health Check"
        echo "====================="
    fi
    
    parse_args "$@"
    init_results
    
    # Run health checks based on options
    if [[ "$INFRASTRUCTURE_ONLY" == true ]]; then
        check_database
        check_redis
        check_rabbitmq
        check_system_resources
    elif [[ "$BACKEND_ONLY" == true ]]; then
        check_database
        check_redis
        check_rabbitmq
        check_backend
        check_system_resources
    elif [[ "$FRONTEND_ONLY" == true ]]; then
        check_frontend
    else
        # Full health check
        check_database
        check_redis
        check_rabbitmq
        check_backend
        check_frontend
        check_system_resources
    fi
    
    # Output results
    if [[ "$JSON_OUTPUT" == true ]]; then
        output_json
    else
        output_summary
    fi
    
    # Exit with appropriate code
    if [[ "$OVERALL_STATUS" == "healthy" ]]; then
        exit 0
    else
        exit 1
    fi
}

# Run main function with all arguments
main "$@"
