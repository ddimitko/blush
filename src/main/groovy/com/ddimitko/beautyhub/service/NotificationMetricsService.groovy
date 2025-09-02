package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.entity.Notification
import com.ddimitko.beautyhub.enums.NotificationDeliveryStatus
import com.ddimitko.beautyhub.repository.NotificationRepository
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service

import java.time.LocalDateTime
import java.time.ZoneOffset

@Service
@Slf4j
class NotificationMetricsService {

    @Autowired
    private NotificationRepository notificationRepository

    /**
     * Get delivery statistics for the last 24 hours
     */
    Map<String, Object> getDeliveryStatistics() {
        LocalDateTime last24Hours = LocalDateTime.now(ZoneOffset.UTC).minusHours(24)
        
        try {
            long totalNotifications = notificationRepository.count()
            long pendingCount = notificationRepository.countByDeliveryStatus("PENDING")
            long deliveredCount = notificationRepository.countByDeliveryStatus("DELIVERED")
            long partiallyDeliveredCount = notificationRepository.countByDeliveryStatus("PARTIALLY_DELIVERED")
            long failedCount = notificationRepository.countByDeliveryStatus("FAILED")
            long retryingCount = notificationRepository.countByDeliveryStatus("RETRYING")
            long expiredCount = notificationRepository.countByDeliveryStatus("EXPIRED")
            
            // Calculate success rate
            long totalProcessed = deliveredCount + partiallyDeliveredCount + failedCount + expiredCount
            double successRate = totalProcessed > 0 ? 
                ((deliveredCount + partiallyDeliveredCount) / totalProcessed) * 100 : 0.0
            
            // Calculate failure rate
            double failureRate = totalProcessed > 0 ? (failedCount / totalProcessed) * 100 : 0.0
            
            return [
                totalNotifications: totalNotifications,
                pending: pendingCount,
                delivered: deliveredCount,
                partiallyDelivered: partiallyDeliveredCount,
                failed: failedCount,
                retrying: retryingCount,
                expired: expiredCount,
                successRate: String.format("%.2f", successRate),
                failureRate: String.format("%.2f", failureRate),
                timestamp: LocalDateTime.now(ZoneOffset.UTC)
            ]
        } catch (Exception e) {
            log.error("Error calculating delivery statistics", e)
            return [
                error: "Failed to calculate statistics",
                timestamp: LocalDateTime.now(ZoneOffset.UTC)
            ]
        }
    }

    /**
     * Get detailed delivery metrics
     */
    Map<String, Object> getDetailedMetrics() {
        try {
            LocalDateTime last24Hours = LocalDateTime.now(ZoneOffset.UTC).minusHours(24)
            LocalDateTime lastWeek = LocalDateTime.now(ZoneOffset.UTC).minusDays(7)
            
            Map<String, Object> metrics = getDeliveryStatistics()
            
            // Add time-based metrics
            long notificationsLast24h = notificationRepository.countByCreatedAtAfter(last24Hours)
            long notificationsLastWeek = notificationRepository.countByCreatedAtAfter(lastWeek)
            
            metrics.putAll([
                notificationsLast24Hours: notificationsLast24h,
                notificationsLastWeek: notificationsLastWeek,
                averagePerDay: notificationsLastWeek / 7.0,
                averagePerHour: notificationsLast24h / 24.0
            ])
            
            return metrics
        } catch (Exception e) {
            log.error("Error calculating detailed metrics", e)
            return [
                error: "Failed to calculate detailed metrics",
                timestamp: LocalDateTime.now(ZoneOffset.UTC)
            ]
        }
    }

    /**
     * Log delivery statistics
     */
    void logDeliveryStatistics() {
        Map<String, Object> stats = getDeliveryStatistics()
        
        log.info("=== Notification Delivery Statistics ===")
        log.info("Total Notifications: ${stats.totalNotifications}")
        log.info("Pending: ${stats.pending}")
        log.info("Delivered: ${stats.delivered}")
        log.info("Partially Delivered: ${stats.partiallyDelivered}")
        log.info("Failed: ${stats.failed}")
        log.info("Retrying: ${stats.retrying}")
        log.info("Expired: ${stats.expired}")
        log.info("Success Rate: ${stats.successRate}%")
        log.info("Failure Rate: ${stats.failureRate}%")
        log.info("========================================")
    }

    /**
     * Check system health based on delivery metrics
     */
    Map<String, Object> getSystemHealth() {
        try {
            Map<String, Object> stats = getDeliveryStatistics()
            
            double successRate = Double.parseDouble(stats.successRate.toString())
            double failureRate = Double.parseDouble(stats.failureRate.toString())
            long retryingCount = (Long) stats.retrying
            long pendingCount = (Long) stats.pending
            
            String healthStatus = "HEALTHY"
            List<String> issues = []
            
            // Check for health issues
            if (successRate < 90.0) {
                healthStatus = "DEGRADED"
                issues.add("Low success rate: ${stats.successRate}%")
            }
            
            if (failureRate > 10.0) {
                healthStatus = "DEGRADED"
                issues.add("High failure rate: ${stats.failureRate}%")
            }
            
            if (retryingCount > 100) {
                healthStatus = "DEGRADED"
                issues.add("High retry queue: ${retryingCount} notifications")
            }
            
            if (pendingCount > 50) {
                healthStatus = "DEGRADED"
                issues.add("High pending queue: ${pendingCount} notifications")
            }
            
            if (successRate < 70.0 || failureRate > 30.0) {
                healthStatus = "UNHEALTHY"
            }
            
            return [
                status: healthStatus,
                successRate: stats.successRate,
                failureRate: stats.failureRate,
                issues: issues,
                timestamp: LocalDateTime.now(ZoneOffset.UTC)
            ]
        } catch (Exception e) {
            log.error("Error checking system health", e)
            return [
                status: "UNKNOWN",
                error: "Failed to check system health",
                timestamp: LocalDateTime.now(ZoneOffset.UTC)
            ]
        }
    }

    /**
     * Get notifications requiring attention (failed, expired, high retry count)
     */
    List<Map<String, Object>> getNotificationsRequiringAttention() {
        try {
            LocalDateTime cutoffTime = LocalDateTime.now(ZoneOffset.UTC).minusHours(1)
            
            // Find notifications that need attention
            List<Notification> problematicNotifications =
                notificationRepository.findProblematicNotifications(cutoffTime)
            
            return problematicNotifications.collect { notification ->
                [
                    id: notification.id,
                    userId: notification.user.id,
                    title: notification.title,
                    type: notification.type,
                    deliveryStatus: notification.deliveryStatus,
                    retryCount: notification.retryCount,
                    maxRetries: notification.maxRetries,
                    lastDeliveryAttempt: notification.lastDeliveryAttemptAt,
                    errorMessage: notification.deliveryErrorMessage,
                    createdAt: notification.createdAt
                ]
            }
        } catch (Exception e) {
            log.error("Error getting notifications requiring attention", e)
            return []
        }
    }
}
