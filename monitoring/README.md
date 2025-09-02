# Lunara Monitoring with Prometheus

This directory contains the monitoring configuration for Lunara using Prometheus and Grafana.

## Migration from Admin Dashboard

The admin dashboard has been removed and replaced with Prometheus-based monitoring for better scalability, industry-standard metrics, and professional monitoring capabilities.

### What was removed:
- `/admin` and `/admin/dashboard` routes
- `AdminDashboardController.groovy`
- `AdminMetricsService.groovy` 
- `WebSocketAdminController.groovy`
- Frontend admin components (`AdminDashboard.tsx`, `AdminLogin.tsx`, `AdminRoute.tsx`)

### What was added:
- `PrometheusMetricsService.groovy` - Custom business metrics for Prometheus
- `PrometheusConfig.groovy` - Prometheus configuration and customization
- Enhanced Prometheus configuration with alerting rules
- Grafana integration for visualization
- Custom metrics for business operations (bookings, appointments, WebSocket connections)

## Available Metrics

### Business Metrics
- `lunara_booking_attempts_total` - Total booking attempts
- `lunara_bookings_successful_total` - Successful bookings
- `lunara_bookings_failed_total` - Failed bookings
- `lunara_appointment_creation_duration` - Time to create appointments
- `lunara_users_total` - Total users
- `lunara_users_active_total` - Active users
- `lunara_shops_total` - Total shops
- `lunara_shops_active_total` - Active shops
- `lunara_appointments_total` - Total appointments
- `lunara_appointments_today_total` - Today's appointments
- `lunara_employees_total` - Total employees
- `lunara_services_total` - Total services

### Infrastructure Metrics
- `lunara_websocket_connections_active` - Active WebSocket connections
- `lunara_database_connections_active` - Database connections
- `lunara_redis_connected` - Redis connection status
- `lunara_jvm_memory_used_bytes` - JVM memory usage

### Standard Spring Boot Metrics
- HTTP request metrics
- JVM metrics
- Database connection pool metrics
- Cache metrics

## Setup

### 1. Start Monitoring Stack

```bash
# Start Prometheus and Grafana
docker compose --profile monitoring up -d

# Or start specific services
docker compose up prometheus grafana -d

# Check status
docker compose ps
```

### 2. Access Monitoring Tools

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin123)
- **Application Metrics**: https://localhost:8443/actuator/prometheus

### 3. Grafana Setup

1. Login to Grafana (admin/admin123)
2. Prometheus datasource is automatically configured
3. Create dashboards using the available metrics
4. Import community dashboards for Spring Boot applications

## Alert Rules

The system includes predefined alert rules for:

- Application health (down, high error rate, slow response times)
- Business metrics (booking failures, no bookings)
- Infrastructure (high memory usage, Redis/DB issues)
- Performance (high CPU, GC time, slow operations)

## Custom Metrics Integration

The `PrometheusMetricsService` is integrated into:

- **AppointmentService**: Records booking attempts, successes, failures, and timing
- **WebSocketMonitoringService**: Tracks connection counts
- **Business operations**: Automatic gauge updates for counts

## Querying Metrics

### Example Prometheus Queries

```promql
# Booking success rate
rate(lunara_bookings_successful_total[5m]) / rate(lunara_booking_attempts_total[5m])

# Average appointment creation time
rate(lunara_appointment_creation_duration_seconds_sum[5m]) / rate(lunara_appointment_creation_duration_seconds_count[5m])

# Active users vs total users
lunara_users_active_total / lunara_users_total

# WebSocket connection growth
increase(lunara_websocket_connections_total[1h])
```

### Useful Dashboards

Create Grafana dashboards for:
1. **Business Overview**: Bookings, users, shops, revenue
2. **Application Performance**: Response times, error rates, throughput
3. **Infrastructure**: Memory, CPU, database, Redis
4. **User Experience**: WebSocket connections, appointment flow

## Benefits over Admin Dashboard

1. **Industry Standard**: Prometheus is the de-facto standard for monitoring
2. **Scalability**: Handles high-volume metrics efficiently
3. **Alerting**: Built-in alerting with multiple notification channels
4. **Visualization**: Grafana provides powerful, customizable dashboards
5. **Integration**: Easy integration with other monitoring tools
6. **Historical Data**: Long-term metric storage and analysis
7. **Performance**: No impact on application performance
8. **Reliability**: Separate monitoring infrastructure

## Maintenance

- Prometheus retains data for 200 hours by default
- Grafana dashboards are persistent in Docker volumes
- Alert rules can be updated by modifying `alert_rules.yml`
- Custom metrics can be added via `PrometheusMetricsService`
