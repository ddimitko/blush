package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.repository.*
import groovy.util.logging.Slf4j
import io.micrometer.core.instrument.Counter
import io.micrometer.core.instrument.Gauge
import io.micrometer.core.instrument.MeterRegistry
import io.micrometer.core.instrument.Timer
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.actuate.health.HealthIndicator
import org.springframework.boot.actuate.health.Status
import org.springframework.data.redis.core.RedisTemplate
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service

import jakarta.annotation.PostConstruct
import javax.sql.DataSource
import java.sql.Connection
import java.time.LocalDateTime
import java.time.temporal.ChronoUnit
import java.util.concurrent.atomic.AtomicLong

/**
 * Service for exposing custom business and infrastructure metrics to Prometheus
 */
@Service
@Slf4j
class PrometheusMetricsService {

    @Autowired
    private MeterRegistry meterRegistry

    @Autowired
    private UserRepository userRepository

    @Autowired
    private ShopRepository shopRepository

    @Autowired
    private AppointmentRepository appointmentRepository

    @Autowired
    private EmployeeRepository employeeRepository

    @Autowired
    private ServiceRepository serviceRepository

    @Autowired
    private NotificationRepository notificationRepository

    @Autowired
    private DataSource dataSource

    @Autowired
    private RedisTemplate<String, Object> redisTemplate

    @Autowired(required = false)
    private PerformanceMonitoringService performanceMonitoringService

    @Autowired(required = false)
    private WebSocketMonitoringService webSocketMonitoringService

    // Atomic counters for real-time metrics
    private final AtomicLong activeWebSocketConnections = new AtomicLong(0)
    private final AtomicLong totalBookingAttempts = new AtomicLong(0)
    private final AtomicLong successfulBookings = new AtomicLong(0)
    private final AtomicLong failedBookings = new AtomicLong(0)

    // Counters and gauges
    private Counter bookingAttemptsCounter
    private Counter successfulBookingsCounter
    private Counter failedBookingsCounter
    private Timer appointmentCreationTimer

    @PostConstruct
    void initializeMetrics() {
        log.info("Initializing Prometheus custom metrics")

        // Business metrics counters
        bookingAttemptsCounter = Counter.builder("lunara_booking_attempts_total")
                .description("Total number of booking attempts")
                .register(meterRegistry)

        successfulBookingsCounter = Counter.builder("lunara_bookings_successful_total")
                .description("Total number of successful bookings")
                .register(meterRegistry)

        failedBookingsCounter = Counter.builder("lunara_bookings_failed_total")
                .description("Total number of failed bookings")
                .register(meterRegistry)

        // Performance metrics
        appointmentCreationTimer = Timer.builder("lunara_appointment_creation_duration")
                .description("Time taken to create appointments")
                .register(meterRegistry)

        // Business gauges
        registerBusinessGauges()

        // Infrastructure gauges
        registerInfrastructureGauges()

        // WebSocket metrics
        registerWebSocketGauges()

        log.info("Prometheus custom metrics initialized successfully")
    }

    private void registerBusinessGauges() {
        // User metrics
        Gauge.builder("lunara_users_total", userRepository) { repo -> repo.count() }
                .description("Total number of users")
                .register(meterRegistry)

        Gauge.builder("lunara_users_active_total", userRepository) { repo -> repo.countByActiveTrue() }
                .description("Total number of active users")
                .register(meterRegistry)

        // Shop metrics
        Gauge.builder("lunara_shops_total", shopRepository) { repo -> repo.count() }
                .description("Total number of shops")
                .register(meterRegistry)

        Gauge.builder("lunara_shops_active_total", shopRepository) { repo -> repo.countActiveShops() }
                .description("Total number of active shops")
                .register(meterRegistry)

        Gauge.builder("lunara_shops_featured_total", shopRepository) { repo -> repo.findByFeaturedTrueAndActiveTrue().size() }
                .description("Total number of featured shops")
                .register(meterRegistry)

        // Appointment metrics
        Gauge.builder("lunara_appointments_total", appointmentRepository) { repo -> repo.count() }
                .description("Total number of appointments")
                .register(meterRegistry)

        Gauge.builder("lunara_appointments_today_total", this) { service -> service.getTodayAppointmentsCount() }
                .description("Total number of appointments for today")
                .register(meterRegistry)

        Gauge.builder("lunara_appointments_pending_total", appointmentRepository) { repo -> repo.countByStatus("PENDING") }
                .description("Total number of pending appointments")
                .register(meterRegistry)

        Gauge.builder("lunara_appointments_confirmed_total", appointmentRepository) { repo -> repo.countByStatus("CONFIRMED") }
                .description("Total number of confirmed appointments")
                .register(meterRegistry)

        // Employee metrics
        Gauge.builder("lunara_employees_total", employeeRepository) { repo -> repo.count() }
                .description("Total number of employees")
                .register(meterRegistry)

        Gauge.builder("lunara_employees_active_total", employeeRepository) { repo -> repo.countByActiveTrue() }
                .description("Total number of active employees")
                .register(meterRegistry)

        // Service metrics
        Gauge.builder("lunara_services_total", serviceRepository) { repo -> repo.count() }
                .description("Total number of services")
                .register(meterRegistry)

        Gauge.builder("lunara_services_active_total", serviceRepository) { repo -> repo.countByActiveTrue() }
                .description("Total number of active services")
                .register(meterRegistry)

        // Notification metrics
        Gauge.builder("lunara_notifications_unread_total", notificationRepository) { repo -> repo.countByReadFalse() }
                .description("Total number of unread notifications")
                .register(meterRegistry)
    }

    private void registerInfrastructureGauges() {
        // Database connection metrics
        Gauge.builder("lunara_database_connections_active", this) { service -> service.getDatabaseConnectionCount() }
                .description("Number of active database connections")
                .register(meterRegistry)

        // Redis metrics
        Gauge.builder("lunara_redis_connected", this) { service -> service.isRedisConnected() ? 1 : 0 }
                .description("Redis connection status (1 = connected, 0 = disconnected)")
                .register(meterRegistry)

        Gauge.builder("lunara_redis_keys_total", this) { service -> service.getRedisKeyCount() }
                .description("Total number of Redis keys")
                .register(meterRegistry)

        // Memory metrics
        Gauge.builder("lunara_jvm_memory_used_bytes", Runtime.getRuntime()) { runtime ->
            runtime.totalMemory() - runtime.freeMemory()
        }
                .description("JVM memory used in bytes")
                .register(meterRegistry)

        Gauge.builder("lunara_jvm_memory_max_bytes", Runtime.getRuntime()) { runtime -> runtime.maxMemory() }
                .description("JVM maximum memory in bytes")
                .register(meterRegistry)
    }

    private void registerWebSocketGauges() {
        Gauge.builder("lunara_websocket_connections_active", this) { service -> service.getActiveWebSocketConnections() }
                .description("Number of active WebSocket connections")
                .register(meterRegistry)

        Gauge.builder("lunara_websocket_connections_total", this) { service ->
            service.webSocketMonitoringService?.getTotalConnections() ?: 0
        }
                .description("Total WebSocket connections since startup")
                .register(meterRegistry)
    }

    // Business metric methods
    void recordBookingAttempt() {
        bookingAttemptsCounter.increment()
        totalBookingAttempts.incrementAndGet()
    }

    void recordSuccessfulBooking() {
        successfulBookingsCounter.increment()
        successfulBookings.incrementAndGet()
    }

    void recordFailedBooking() {
        failedBookingsCounter.increment()
        failedBookings.incrementAndGet()
    }

    Timer.Sample startAppointmentCreationTimer() {
        return Timer.start(meterRegistry)
    }

    void recordAppointmentCreationTime(Timer.Sample sample) {
        sample.stop(appointmentCreationTimer)
    }

    // WebSocket metrics
    void incrementWebSocketConnections() {
        activeWebSocketConnections.incrementAndGet()
    }

    void decrementWebSocketConnections() {
        activeWebSocketConnections.decrementAndGet()
    }

    private long getActiveWebSocketConnections() {
        try {
            return webSocketMonitoringService?.getActiveConnectionCount() ?: 0
        } catch (Exception e) {
            log.warn("Failed to get WebSocket connection count", e)
            return 0
        }
    }

    // Helper methods for gauge calculations
    private long getTodayAppointmentsCount() {
        try {
            LocalDateTime startOfDay = LocalDateTime.now().truncatedTo(ChronoUnit.DAYS)
            LocalDateTime endOfDay = startOfDay.plusDays(1)
            return appointmentRepository.countByAppointmentDateTimeBetween(startOfDay, endOfDay)
        } catch (Exception e) {
            log.warn("Failed to get today's appointment count", e)
            return 0
        }
    }

    private int getDatabaseConnectionCount() {
        try {
            Connection connection = dataSource.getConnection()
            // This is a simplified check - in production you might want to use HikariCP metrics
            connection.close()
            return 1 // Simplified - just checking if we can get a connection
        } catch (Exception e) {
            log.warn("Failed to check database connection", e)
            return 0
        }
    }

    private boolean isRedisConnected() {
        try {
            redisTemplate.opsForValue().get("health-check")
            return true
        } catch (Exception e) {
            log.warn("Redis connection check failed", e)
            return false
        }
    }

    private long getRedisKeyCount() {
        try {
            return redisTemplate.getConnectionFactory().getConnection().dbSize()
        } catch (Exception e) {
            log.warn("Failed to get Redis key count", e)
            return 0
        }
    }

    /**
     * Scheduled method to update metrics periodically
     */
    @Scheduled(fixedRate = 30000) // Every 30 seconds
    void updateMetrics() {
        try {
            // Update any cached metrics here if needed
            log.debug("Updating Prometheus metrics")
        } catch (Exception e) {
            log.error("Failed to update metrics", e)
        }
    }
}
