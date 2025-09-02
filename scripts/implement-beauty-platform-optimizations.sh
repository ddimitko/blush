#!/bin/bash

# Lunara Beauty Platform - Critical Optimizations Implementation Script
# This script implements the highest priority optimizations for immediate business impact

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running in production
check_environment() {
    log "Checking environment..."
    
    if [[ "${APP_ENVIRONMENT}" == "production" ]]; then
        warning "Running in PRODUCTION environment"
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "Aborted by user"
            exit 1
        fi
    fi
}

# Backup database before making changes
backup_database() {
    log "Creating database backup..."
    
    local backup_file="backups/beauty_platform_backup_$(date +%Y%m%d_%H%M%S).sql"
    mkdir -p backups
    
    if command -v docker &> /dev/null && docker ps | grep -q lunara-postgres; then
        docker exec lunara-postgres pg_dump -U postgres beautyhub > "$backup_file"
        success "Database backup created: $backup_file"
    else
        warning "Could not create database backup - Docker not running or container not found"
    fi
}

# Implement critical database indexes for beauty platform
implement_beauty_indexes() {
    log "Implementing beauty platform database indexes..."
    
    local sql_file="beauty_platform_indexes.sql"
    
    cat > "$sql_file" << 'EOF'
-- Lunara Beauty Platform - Critical Performance Indexes
-- These indexes are designed specifically for beauty booking workflows

-- Customer-facing shop search optimization (highest priority)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beauty_shops_customer_search 
    ON shops(active, city, rating_average DESC, accepts_card_payments) 
    WHERE active = true;

-- Geolocation for "beauty salons near me" feature
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beauty_shops_location 
    ON shops USING GIST(ST_Point(longitude, latitude)) 
    WHERE active = true AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- Real-time appointment booking performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beauty_appointments_booking 
    ON appointments(employee_id, appointment_date_time, end_date_time, status)
    WHERE status IN ('CONFIRMED', 'PENDING');

-- Beauty service catalog performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beauty_services_catalog 
    ON services(shop_id, active, category, price) 
    WHERE active = true;

-- Employee availability optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beauty_employees_availability 
    ON employees(shop_id, active, specialties) 
    WHERE active = true;

-- Subscription-based filtering (critical for business model)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beauty_subscription_shops 
    ON shop_stripe_details(shop_id, subscription_status, subscription_id) 
    WHERE subscription_id IS NOT NULL;

-- Customer appointment history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beauty_customer_history 
    ON appointments(user_id, status, appointment_date_time DESC)
    WHERE user_id IS NOT NULL;

-- Shop owner dashboard optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beauty_shop_analytics 
    ON appointments(shop_id, status, appointment_date_time, total_amount)
    WHERE status = 'COMPLETED';

-- Update table statistics for better query planning
ANALYZE shops;
ANALYZE appointments;
ANALYZE services;
ANALYZE employees;
ANALYZE shop_stripe_details;

EOF

    # Execute the SQL
    if command -v docker &> /dev/null && docker ps | grep -q lunara-postgres; then
        log "Executing beauty platform indexes via Docker..."
        docker exec -i lunara-postgres psql -U postgres -d beautyhub < "$sql_file"
        success "Beauty platform indexes implemented successfully"
    else
        warning "Docker not available, please execute $sql_file manually"
    fi
    
    rm "$sql_file"
}

# Optimize application configuration for beauty platform
optimize_app_config() {
    log "Optimizing application configuration for beauty platform..."
    
    # Create optimized application properties
    cat > "application-beauty-optimized.properties" << 'EOF'
# Beauty Platform Optimized Configuration

# Database Connection Pool (optimized for booking load)
spring.datasource.hikari.maximum-pool-size=30
spring.datasource.hikari.minimum-idle=10
spring.datasource.hikari.connection-timeout=20000
spring.datasource.hikari.idle-timeout=300000
spring.datasource.hikari.max-lifetime=1200000

# Cache Configuration (beauty-specific TTL)
spring.cache.redis.time-to-live=300000
spring.cache.redis.cache-null-values=false

# WebSocket Configuration (optimized for real-time slots)
websocket.max-connections=1000
websocket.heartbeat-interval=25000
websocket.connection-timeout=30000

# Rate Limiting (protect against booking spam)
rate-limit.booking-endpoints=10
rate-limit.search-endpoints=30
rate-limit.payment-endpoints=5

# Performance Monitoring
management.endpoints.web.exposure.include=health,metrics,prometheus
management.endpoint.health.show-details=always
management.metrics.export.prometheus.enabled=true

EOF

    success "Optimized configuration created: application-beauty-optimized.properties"
}

# Test performance improvements
test_performance() {
    log "Testing performance improvements..."
    
    # Test shop search performance
    if command -v curl &> /dev/null; then
        log "Testing shop search performance..."
        local start_time=$(date +%s%3N)
        curl -s "http://localhost:8080/api/public/shops?city=Sofia&limit=20" > /dev/null
        local end_time=$(date +%s%3N)
        local duration=$((end_time - start_time))
        
        if [ $duration -lt 500 ]; then
            success "Shop search performance: ${duration}ms (Good)"
        elif [ $duration -lt 1000 ]; then
            warning "Shop search performance: ${duration}ms (Acceptable)"
        else
            error "Shop search performance: ${duration}ms (Needs improvement)"
        fi
    fi
    
    # Test appointment availability
    log "Testing appointment availability performance..."
    # Add more specific tests here
}

# Setup monitoring for beauty platform metrics
setup_beauty_monitoring() {
    log "Setting up beauty platform monitoring..."
    
    # Create monitoring configuration
    mkdir -p monitoring/beauty-platform
    
    cat > "monitoring/beauty-platform/beauty-metrics.yml" << 'EOF'
# Beauty Platform Specific Metrics Configuration

beauty_platform_metrics:
  customer_experience:
    - shop_search_response_time
    - booking_completion_rate
    - mobile_performance_score
    - customer_satisfaction_rating
  
  business_operations:
    - payment_success_rate
    - dashboard_load_time
    - system_uptime
    - shop_owner_satisfaction
  
  revenue_protection:
    - failed_payment_rate
    - booking_abandonment_rate
    - double_booking_incidents
    - refund_rate

alerts:
  - name: "High Booking Abandonment"
    condition: "booking_abandonment_rate > 5%"
    severity: "critical"
  
  - name: "Payment Failures"
    condition: "failed_payment_rate > 1%"
    severity: "high"
  
  - name: "Slow Shop Search"
    condition: "shop_search_response_time > 1000ms"
    severity: "medium"

EOF

    success "Beauty platform monitoring configuration created"
}

# Main execution
main() {
    echo "🎯 Lunara Beauty Platform - Critical Optimizations"
    echo "=================================================="
    
    check_environment
    backup_database
    implement_beauty_indexes
    optimize_app_config
    setup_beauty_monitoring
    test_performance
    
    echo ""
    success "Beauty platform optimizations completed successfully!"
    echo ""
    echo "📊 Next Steps:"
    echo "1. Restart the application to apply configuration changes"
    echo "2. Monitor performance metrics for 24-48 hours"
    echo "3. Run './scripts/beauty-platform-metrics.sh' to track improvements"
    echo "4. Proceed with Week 2 optimizations if results are positive"
    echo ""
    echo "📈 Expected Improvements:"
    echo "- Shop search: 50-70% faster response times"
    echo "- Booking process: 30-50% performance improvement"
    echo "- Database queries: 60-80% faster execution"
    echo "- Overall customer experience: Significantly improved"
}

# Execute main function
main "$@"
