package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.service.PerformanceMonitoringService
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.info.BuildProperties
import org.springframework.context.annotation.Profile
import org.springframework.core.env.Environment
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

import javax.sql.DataSource
import java.sql.Connection
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@RestController
@RequestMapping("/api/system")
@CrossOrigin(origins = "*", maxAge = 3600)
@Profile(["dev", "development", "test", "local", "default"])
@Slf4j
class SystemInfoController {

    @Autowired
    private Environment environment

    @Autowired
    private PerformanceMonitoringService performanceMonitoringService

    @Autowired(required = false)
    private DataSource dataSource

    @Autowired(required = false)
    private BuildProperties buildProperties

    /**
     * Get system information (development only)
     */
    @GetMapping("/info")
    @PreAuthorize("hasRole('ADMIN')")
    ResponseEntity<?> getSystemInfo() {
        try {
            Map<String, Object> systemInfo = [
                application: getApplicationInfo(),
                environment: getEnvironmentInfo(),
                runtime: getRuntimeInfo(),
                build: getBuildInfo(),
                timestamp: LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
            ]

            return ResponseEntity.ok(systemInfo)
        } catch (Exception e) {
            log.error("Failed to get system info", e)
            return ResponseEntity.internalServerError().body([
                error: "Failed to retrieve system information",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Get health status
     */
    @GetMapping("/health")
    ResponseEntity<?> getHealthStatus() {
        try {
            Map<String, Object> health = [
                status: "UP",
                timestamp: LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                database: checkDatabaseHealth(),
                system: getSystemHealth()
            ]
            return ResponseEntity.ok(health)
        } catch (Exception e) {
            log.error("Failed to get health status", e)
            return ResponseEntity.internalServerError().body([
                error: "Health check failed",
                message: e.getMessage(),
                status: "DOWN",
                timestamp: LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
            ])
        }
    }

    /**
     * Get performance metrics
     */
    @GetMapping("/metrics")
    @PreAuthorize("hasRole('ADMIN')")
    ResponseEntity<?> getPerformanceMetrics() {
        try {
            return ResponseEntity.ok(performanceMonitoringService.getCurrentMetrics())
        } catch (Exception e) {
            log.error("Failed to get performance metrics", e)
            return ResponseEntity.internalServerError().body([
                error: "Failed to retrieve performance metrics",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Get performance summary
     */
    @GetMapping("/performance")
    @PreAuthorize("hasRole('ADMIN')")
    ResponseEntity<?> getPerformanceSummary() {
        try {
            return ResponseEntity.ok(performanceMonitoringService.getPerformanceSummary())
        } catch (Exception e) {
            log.error("Failed to get performance summary", e)
            return ResponseEntity.internalServerError().body([
                error: "Failed to retrieve performance summary",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Get API endpoints documentation
     */
    @GetMapping("/endpoints")
    @PreAuthorize("hasRole('ADMIN')")
    ResponseEntity<?> getApiEndpoints() {
        try {
            Map<String, Object> endpoints = [
                authentication: getAuthEndpoints(),
                shops: getShopEndpoints(),
                appointments: getAppointmentEndpoints(),
                users: getUserEndpoints(),
                payments: getPaymentEndpoints(),
                admin: getAdminEndpoints(),
                system: getSystemEndpoints()
            ]

            return ResponseEntity.ok(endpoints)
        } catch (Exception e) {
            log.error("Failed to get API endpoints", e)
            return ResponseEntity.internalServerError().body([
                error: "Failed to retrieve API endpoints",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Get configuration status (non-sensitive)
     */
    @GetMapping("/config")
    @PreAuthorize("hasRole('ADMIN')")
    ResponseEntity<?> getConfigurationStatus() {
        try {
            Map<String, Object> config = [
                profiles: environment.getActiveProfiles().toList(),
                features: getFeatureFlags(),
                integrations: getIntegrationStatus(),
                cache: getCacheStatus(),
                security: getSecurityStatus()
            ]

            return ResponseEntity.ok(config)
        } catch (Exception e) {
            log.error("Failed to get configuration status", e)
            return ResponseEntity.internalServerError().body([
                error: "Failed to retrieve configuration status",
                message: e.getMessage()
            ])
        }
    }

    // Helper methods

    private Map<String, Object> getApplicationInfo() {
        return [
            name: "Lunara Beauty Booking Platform",
            description: "Full-stack beauty booking platform with real-time features",
            version: buildProperties?.getVersion() ?: "unknown",
            profiles: environment.getActiveProfiles().toList(),
            defaultProfile: environment.getDefaultProfiles().toList()
        ]
    }

    private Map<String, Object> getEnvironmentInfo() {
        return [
            javaVersion: System.getProperty("java.version"),
            javaVendor: System.getProperty("java.vendor"),
            osName: System.getProperty("os.name"),
            osVersion: System.getProperty("os.version"),
            osArch: System.getProperty("os.arch"),
            timezone: System.getProperty("user.timezone"),
            encoding: System.getProperty("file.encoding")
        ]
    }

    private Map<String, Object> getRuntimeInfo() {
        Runtime runtime = Runtime.getRuntime()
        long maxMemory = runtime.maxMemory()
        long totalMemory = runtime.totalMemory()
        long freeMemory = runtime.freeMemory()
        long usedMemory = totalMemory - freeMemory

        return [
            processors: runtime.availableProcessors(),
            memory: [
                max: formatBytes(maxMemory),
                total: formatBytes(totalMemory),
                used: formatBytes(usedMemory),
                free: formatBytes(freeMemory),
                usagePercent: Math.round((usedMemory * 100.0) / maxMemory)
            ],
            uptime: getUptime()
        ]
    }

    private Map<String, Object> getBuildInfo() {
        if (!buildProperties) {
            return [available: false]
        }

        return [
            available: true,
            version: buildProperties.getVersion(),
            time: buildProperties.getTime()?.toString(),
            artifact: buildProperties.getArtifact(),
            group: buildProperties.getGroup(),
            name: buildProperties.getName()
        ]
    }

    private Map<String, Object> getFeatureFlags() {
        return [
            rateLimiting: true,
            caching: true,
            monitoring: true,
            auditLogging: true,
            fileUploadSecurity: true,
            stripeIntegration: environment.getProperty("stripe.api.secret-key") != null,
            emailService: environment.getProperty("spring.mail.username") != null,
            redisCache: environment.getProperty("spring.data.redis.host") != null,
            rabbitMQ: environment.getProperty("spring.rabbitmq.host") != null
        ]
    }

    private Map<String, Object> getIntegrationStatus() {
        return [
            database: [
                type: "PostgreSQL",
                configured: environment.getProperty("spring.datasource.url") != null
            ],
            redis: [
                configured: environment.getProperty("spring.data.redis.host") != null
            ],
            stripe: [
                configured: environment.getProperty("stripe.api.secret-key") != null
            ],
            email: [
                configured: environment.getProperty("spring.mail.username") != null
            ],
            rabbitMQ: [
                configured: environment.getProperty("spring.rabbitmq.host") != null
            ]
        ]
    }

    private Map<String, Object> getCacheStatus() {
        return [
            enabled: true,
            type: "Redis",
            configured: environment.getProperty("spring.data.redis.host") != null
        ]
    }

    private Map<String, Object> getSecurityStatus() {
        return [
            jwtEnabled: true,
            rateLimitingEnabled: true,
            corsEnabled: true,
            httpsEnabled: environment.getProperty("server.ssl.enabled", Boolean.class, false),
            securityHeaders: true
        ]
    }

    // API endpoint documentation helpers

    private List<Map<String, String>> getAuthEndpoints() {
        return [
            [method: "POST", path: "/api/auth/register", description: "User registration"],
            [method: "POST", path: "/api/auth/login", description: "User login"],
            [method: "POST", path: "/api/auth/logout", description: "User logout"],
            [method: "POST", path: "/api/auth/forgot-password", description: "Request password reset"],
            [method: "POST", path: "/api/auth/reset-password", description: "Reset password"],
            [method: "GET", path: "/api/auth/validate-token", description: "Validate JWT token"]
        ]
    }

    private List<Map<String, String>> getShopEndpoints() {
        return [
            [method: "GET", path: "/api/shops/search", description: "Search shops"],
            [method: "GET", path: "/api/shops/{id}", description: "Get shop details"],
            [method: "POST", path: "/api/shops", description: "Create shop"],
            [method: "PUT", path: "/api/shops/{id}", description: "Update shop"],
            [method: "DELETE", path: "/api/shops/{id}", description: "Delete shop"]
        ]
    }

    private List<Map<String, String>> getAppointmentEndpoints() {
        return [
            [method: "GET", path: "/api/appointments/available-slots", description: "Get available slots"],
            [method: "POST", path: "/api/appointments", description: "Create appointment"],
            [method: "PUT", path: "/api/appointments/{id}", description: "Update appointment"],
            [method: "DELETE", path: "/api/appointments/{id}", description: "Cancel appointment"]
        ]
    }

    private List<Map<String, String>> getUserEndpoints() {
        return [
            [method: "GET", path: "/api/user/profile", description: "Get user profile"],
            [method: "PUT", path: "/api/user/profile", description: "Update user profile"],
            [method: "POST", path: "/api/user/avatar", description: "Upload avatar"]
        ]
    }

    private List<Map<String, String>> getPaymentEndpoints() {
        return [
            [method: "POST", path: "/api/payments/create-payment-intent", description: "Create payment intent"],
            [method: "POST", path: "/api/payments/confirm-payment-intent", description: "Confirm payment"],
            [method: "POST", path: "/api/payments/webhook", description: "Stripe webhook"]
        ]
    }

    private List<Map<String, String>> getAdminEndpoints() {
        return [
            [method: "GET", path: "/api/admin/users", description: "List all users"],
            [method: "GET", path: "/api/admin/shops", description: "List all shops"],
            [method: "GET", path: "/api/admin/analytics", description: "Get analytics data"]
        ]
    }

    private List<Map<String, String>> getSystemEndpoints() {
        return [
            [method: "GET", path: "/api/system/info", description: "System information"],
            [method: "GET", path: "/api/system/health", description: "Health status"],
            [method: "GET", path: "/api/system/metrics", description: "Performance metrics"]
        ]
    }

    // Health check methods

    private Map<String, Object> checkDatabaseHealth() {
        try {
            if (dataSource) {
                Connection connection = dataSource.getConnection()
                boolean isValid = connection.isValid(3)
                connection.close()
                return [
                    status: isValid ? "UP" : "DOWN",
                    type: "PostgreSQL"
                ]
            } else {
                return [status: "UNKNOWN", message: "DataSource not available"]
            }
        } catch (Exception e) {
            return [
                status: "DOWN",
                error: e.getMessage()
            ]
        }
    }

    private Map<String, Object> getSystemHealth() {
        Runtime runtime = Runtime.getRuntime()
        long maxMemory = runtime.maxMemory()
        long totalMemory = runtime.totalMemory()
        long freeMemory = runtime.freeMemory()
        long usedMemory = totalMemory - freeMemory
        double memoryUsage = (usedMemory / (double) maxMemory) * 100.0

        return [
            memoryUsage: Math.round(memoryUsage),
            status: memoryUsage > 90 ? "WARNING" : "UP",
            processors: runtime.availableProcessors()
        ]
    }

    // Utility methods

    private String formatBytes(long bytes) {
        if (bytes < 1024) return "${bytes} B".toString()
        if (bytes < 1024 * 1024) return "${Math.round(bytes / 1024.0)} KB".toString()
        if (bytes < 1024 * 1024 * 1024) return "${Math.round(bytes / (1024.0 * 1024.0))} MB".toString()
        return "${Math.round(bytes / (1024.0 * 1024.0 * 1024.0))} GB".toString()
    }

    private String getUptime() {
        long uptimeMs = java.lang.management.ManagementFactory.getRuntimeMXBean().getUptime()
        long seconds = uptimeMs / 1000
        long minutes = seconds / 60
        long hours = minutes / 60
        long days = hours / 24

        if (days > 0) {
            return "${days}d ${hours % 24}h ${minutes % 60}m"
        } else if (hours > 0) {
            return "${hours}h ${minutes % 60}m"
        } else if (minutes > 0) {
            return "${minutes}m ${seconds % 60}s"
        } else {
            return "${seconds}s"
        }
    }
}
