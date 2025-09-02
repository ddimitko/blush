package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.service.NotificationMetricsService
import com.ddimitko.beautyhub.service.NotificationDeliveryService
import com.ddimitko.beautyhub.service.NotificationRetryScheduler
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/admin/notifications")
@CrossOrigin(origins = "*", maxAge = 3600)
@Slf4j
class NotificationHealthController {

    @Autowired
    private NotificationMetricsService notificationMetricsService

    @Autowired
    private NotificationDeliveryService notificationDeliveryService

    @Autowired
    private NotificationRetryScheduler notificationRetryScheduler

    /**
     * Get notification delivery statistics
     */
    @GetMapping("/statistics")
    @PreAuthorize("hasRole('ADMIN')")
    ResponseEntity<?> getDeliveryStatistics() {
        try {
            Map<String, Object> statistics = notificationMetricsService.getDeliveryStatistics()
            return ResponseEntity.ok(statistics)
        } catch (Exception e) {
            log.error("Failed to get delivery statistics", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve delivery statistics",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Get detailed notification metrics
     */
    @GetMapping("/metrics")
    @PreAuthorize("hasRole('ADMIN')")
    ResponseEntity<?> getDetailedMetrics() {
        try {
            Map<String, Object> metrics = notificationMetricsService.getDetailedMetrics()
            return ResponseEntity.ok(metrics)
        } catch (Exception e) {
            log.error("Failed to get detailed metrics", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve detailed metrics",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Get system health status
     */
    @GetMapping("/health")
    @PreAuthorize("hasRole('ADMIN')")
    ResponseEntity<?> getSystemHealth() {
        try {
            Map<String, Object> health = notificationMetricsService.getSystemHealth()
            return ResponseEntity.ok(health)
        } catch (Exception e) {
            log.error("Failed to get system health", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve system health",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Get notifications requiring attention
     */
    @GetMapping("/attention")
    @PreAuthorize("hasRole('ADMIN')")
    ResponseEntity<?> getNotificationsRequiringAttention() {
        try {
            List<Map<String, Object>> notifications = notificationMetricsService.getNotificationsRequiringAttention()
            return ResponseEntity.ok([
                notifications: notifications,
                count: notifications.size()
            ])
        } catch (Exception e) {
            log.error("Failed to get notifications requiring attention", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve notifications requiring attention",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Manually trigger retry processing
     */
    @PostMapping("/retry-processing")
    @PreAuthorize("hasRole('ADMIN')")
    ResponseEntity<?> triggerRetryProcessing() {
        try {
            log.info("Manually triggering notification retry processing")
            notificationRetryScheduler.processNotificationRetries()
            return ResponseEntity.ok([
                message: "Retry processing triggered successfully"
            ])
        } catch (Exception e) {
            log.error("Failed to trigger retry processing", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to trigger retry processing",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Manually trigger pending notification processing
     */
    @PostMapping("/process-pending")
    @PreAuthorize("hasRole('ADMIN')")
    ResponseEntity<?> triggerPendingProcessing() {
        try {
            log.info("Manually triggering pending notification processing")
            notificationRetryScheduler.processPendingNotifications()
            return ResponseEntity.ok([
                message: "Pending notification processing triggered successfully"
            ])
        } catch (Exception e) {
            log.error("Failed to trigger pending processing", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to trigger pending processing",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Manually trigger cleanup of expired notifications
     */
    @PostMapping("/cleanup-expired")
    @PreAuthorize("hasRole('ADMIN')")
    ResponseEntity<?> triggerExpiredCleanup() {
        try {
            log.info("Manually triggering expired notification cleanup")
            notificationRetryScheduler.cleanupExpiredNotifications()
            return ResponseEntity.ok([
                message: "Expired notification cleanup triggered successfully"
            ])
        } catch (Exception e) {
            log.error("Failed to trigger expired cleanup", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to trigger expired cleanup",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Get delivery statistics summary for dashboard
     */
    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('ADMIN')")
    ResponseEntity<?> getDashboardSummary() {
        try {
            Map<String, Object> statistics = notificationMetricsService.getDeliveryStatistics()
            Map<String, Object> health = notificationMetricsService.getSystemHealth()
            List<Map<String, Object>> attention = notificationMetricsService.getNotificationsRequiringAttention()
            
            return ResponseEntity.ok([
                statistics: statistics,
                health: health,
                attentionRequired: [
                    count: attention.size(),
                    notifications: attention.take(10) // Show only first 10
                ]
            ])
        } catch (Exception e) {
            log.error("Failed to get dashboard summary", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve dashboard summary",
                message: e.getMessage()
            ])
        }
    }
}
