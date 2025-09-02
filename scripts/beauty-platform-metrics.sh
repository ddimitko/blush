#!/bin/bash

# Lunara Beauty Platform - Business Metrics Monitoring Script
# Tracks key performance indicators specific to beauty booking business

set -e

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
METRICS_OUTPUT_DIR="metrics/beauty-platform"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Create metrics directory
mkdir -p "$METRICS_OUTPUT_DIR"

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

error() {
    echo -e "${RED}[✗]${NC} $1"
}

metric() {
    echo -e "${PURPLE}[📊]${NC} $1"
}

# Test API connectivity
test_api_connectivity() {
    log "Testing API connectivity..."
    
    if curl -s --max-time 5 "$API_BASE_URL/actuator/health" > /dev/null; then
        success "API is accessible"
        return 0
    else
        error "API is not accessible at $API_BASE_URL"
        return 1
    fi
}

# Measure shop search performance
measure_shop_search_performance() {
    log "Measuring shop search performance..."
    
    local total_time=0
    local successful_requests=0
    local failed_requests=0
    
    # Test different search scenarios
    local search_queries=(
        "city=Sofia"
        "city=Plovdiv&rating=4"
        "latitude=42.6977&longitude=23.3219&radius=10"
        "businessTypes=HAIR_SALON"
        "acceptsCard=true"
    )
    
    for query in "${search_queries[@]}"; do
        local start_time=$(date +%s%3N)
        
        if curl -s --max-time 10 "$API_BASE_URL/api/public/shops?$query" > /dev/null; then
            local end_time=$(date +%s%3N)
            local duration=$((end_time - start_time))
            total_time=$((total_time + duration))
            successful_requests=$((successful_requests + 1))
            
            if [ $duration -lt 300 ]; then
                success "Search query '$query': ${duration}ms (Excellent)"
            elif [ $duration -lt 500 ]; then
                success "Search query '$query': ${duration}ms (Good)"
            elif [ $duration -lt 1000 ]; then
                warning "Search query '$query': ${duration}ms (Acceptable)"
            else
                error "Search query '$query': ${duration}ms (Slow)"
            fi
        else
            failed_requests=$((failed_requests + 1))
            error "Search query '$query': Failed"
        fi
    done
    
    if [ $successful_requests -gt 0 ]; then
        local avg_time=$((total_time / successful_requests))
        metric "Average shop search time: ${avg_time}ms"
        metric "Successful requests: $successful_requests"
        metric "Failed requests: $failed_requests"
        
        # Save metrics
        echo "shop_search_avg_time_ms,$avg_time,$TIMESTAMP" >> "$METRICS_OUTPUT_DIR/search_performance.csv"
        echo "shop_search_success_rate,$((successful_requests * 100 / (successful_requests + failed_requests))),$TIMESTAMP" >> "$METRICS_OUTPUT_DIR/search_performance.csv"
    fi
}

# Test booking flow performance
test_booking_flow_performance() {
    log "Testing booking flow performance..."
    
    # Test slot availability endpoint
    local start_time=$(date +%s%3N)
    if curl -s --max-time 10 "$API_BASE_URL/api/public/shops/test-shop-id/availability?date=$(date +%Y-%m-%d)" > /dev/null; then
        local end_time=$(date +%s%3N)
        local duration=$((end_time - start_time))
        
        if [ $duration -lt 500 ]; then
            success "Slot availability check: ${duration}ms (Good)"
        else
            warning "Slot availability check: ${duration}ms (Needs improvement)"
        fi
        
        echo "slot_availability_time_ms,$duration,$TIMESTAMP" >> "$METRICS_OUTPUT_DIR/booking_performance.csv"
    else
        error "Slot availability check: Failed"
    fi
}

# Check database performance
check_database_performance() {
    log "Checking database performance..."
    
    if command -v docker &> /dev/null && docker ps | grep -q lunara-postgres; then
        # Check active connections
        local active_connections=$(docker exec lunara-postgres psql -U postgres -d beautyhub -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';")
        metric "Active database connections: $active_connections"
        
        # Check slow queries (if pg_stat_statements is enabled)
        local slow_queries=$(docker exec lunara-postgres psql -U postgres -d beautyhub -t -c "SELECT count(*) FROM pg_stat_statements WHERE mean_time > 1000;" 2>/dev/null || echo "N/A")
        if [ "$slow_queries" != "N/A" ]; then
            metric "Slow queries (>1s): $slow_queries"
        fi
        
        # Check table sizes
        local shops_count=$(docker exec lunara-postgres psql -U postgres -d beautyhub -t -c "SELECT count(*) FROM shops WHERE active = true;")
        local appointments_count=$(docker exec lunara-postgres psql -U postgres -d beautyhub -t -c "SELECT count(*) FROM appointments;")
        
        metric "Active shops: $shops_count"
        metric "Total appointments: $appointments_count"
        
        # Save metrics
        echo "active_db_connections,$active_connections,$TIMESTAMP" >> "$METRICS_OUTPUT_DIR/database_metrics.csv"
        echo "active_shops_count,$shops_count,$TIMESTAMP" >> "$METRICS_OUTPUT_DIR/business_metrics.csv"
        echo "total_appointments,$appointments_count,$TIMESTAMP" >> "$METRICS_OUTPUT_DIR/business_metrics.csv"
    else
        warning "Database container not accessible for detailed metrics"
    fi
}

# Check system resources
check_system_resources() {
    log "Checking system resources..."
    
    # Memory usage
    if command -v free &> /dev/null; then
        local memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
        metric "Memory usage: ${memory_usage}%"
        echo "memory_usage_percent,$memory_usage,$TIMESTAMP" >> "$METRICS_OUTPUT_DIR/system_metrics.csv"
    fi
    
    # Disk usage
    if command -v df &> /dev/null; then
        local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
        metric "Disk usage: ${disk_usage}%"
        echo "disk_usage_percent,$disk_usage,$TIMESTAMP" >> "$METRICS_OUTPUT_DIR/system_metrics.csv"
    fi
    
    # Load average
    if command -v uptime &> /dev/null; then
        local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
        metric "Load average (1m): $load_avg"
        echo "load_average_1m,$load_avg,$TIMESTAMP" >> "$METRICS_OUTPUT_DIR/system_metrics.csv"
    fi
}

# Generate business metrics report
generate_business_report() {
    log "Generating business metrics report..."
    
    local report_file="$METRICS_OUTPUT_DIR/business_report_$TIMESTAMP.md"
    
    cat > "$report_file" << EOF
# Lunara Beauty Platform - Business Metrics Report
Generated: $(date)

## Performance Summary

### Customer Experience Metrics
- Shop search performance: See search_performance.csv
- Booking flow performance: See booking_performance.csv
- System responsiveness: See system_metrics.csv

### Business Operations Metrics
- Active shops: See business_metrics.csv
- Total appointments: See business_metrics.csv
- Database performance: See database_metrics.csv

### System Health
- Memory usage: See system_metrics.csv
- Disk usage: See system_metrics.csv
- Load average: See system_metrics.csv

## Recommendations

### If shop search > 500ms:
1. Check database indexes are properly created
2. Verify Redis cache is working
3. Consider query optimization

### If booking flow > 1000ms:
1. Check WebSocket performance
2. Verify slot locking mechanism
3. Review appointment creation logic

### If system resources > 80%:
1. Consider scaling up resources
2. Check for memory leaks
3. Review application performance

## Next Steps
1. Monitor these metrics regularly
2. Set up automated alerting for critical thresholds
3. Compare with baseline metrics to track improvements
EOF

    success "Business report generated: $report_file"
}

# Main execution function
main() {
    local mode="${1:-all}"
    
    echo "🎯 Lunara Beauty Platform - Metrics Collection"
    echo "=============================================="
    echo "Mode: $mode"
    echo "Timestamp: $TIMESTAMP"
    echo ""
    
    if ! test_api_connectivity; then
        error "Cannot proceed without API connectivity"
        exit 1
    fi
    
    case "$mode" in
        "customer-experience"|"customer")
            measure_shop_search_performance
            test_booking_flow_performance
            ;;
        "business-operations"|"business")
            check_database_performance
            check_system_resources
            ;;
        "system"|"health")
            check_system_resources
            check_database_performance
            ;;
        "all"|*)
            measure_shop_search_performance
            test_booking_flow_performance
            check_database_performance
            check_system_resources
            generate_business_report
            ;;
    esac
    
    echo ""
    success "Metrics collection completed!"
    echo ""
    echo "📊 View results in: $METRICS_OUTPUT_DIR"
    echo "📈 To track improvements over time:"
    echo "   ./scripts/beauty-platform-metrics.sh customer-experience"
    echo "   ./scripts/beauty-platform-metrics.sh business-operations"
    echo ""
}

# Show usage if help requested
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Usage: $0 [mode]"
    echo ""
    echo "Modes:"
    echo "  all                  - Run all metrics collection (default)"
    echo "  customer-experience  - Customer-facing performance metrics"
    echo "  business-operations  - Business operations metrics"
    echo "  system              - System health metrics"
    echo ""
    echo "Examples:"
    echo "  $0                           # Run all metrics"
    echo "  $0 customer-experience       # Focus on customer metrics"
    echo "  $0 business-operations       # Focus on business metrics"
    exit 0
fi

# Execute main function
main "$@"
