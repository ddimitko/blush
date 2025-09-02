package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.entity.Notification
import com.ddimitko.beautyhub.enums.NotificationDeliveryStatus
import com.ddimitko.beautyhub.repository.NotificationRepository
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

import java.time.LocalDateTime
import java.time.ZoneOffset

@Service
@Slf4j
class NotificationRetryScheduler {

    @Autowired
    private NotificationRepository notificationRepository

    @Autowired
    private NotificationDeliveryService notificationDeliveryService

    /**
     * Process notification retries every 2 minutes
     */
    @Scheduled(cron = "0 */2 * * * *")
    @Transactional
    void processNotificationRetries() {
        log.info("Starting notification retry processing")
        
        try {
            notificationDeliveryService.processRetries()
            log.info("Completed notification retry processing")
        } catch (Exception e) {
            log.error("Error during notification retry processing", e)
        }
    }

    /**
     * Process pending notifications every 5 minutes
     * This handles notifications that might have been missed
     */
    @Scheduled(cron = "0 */5 * * * *")
    @Transactional
    void processPendingNotifications() {
        log.info("Starting pending notification processing")
        
        try {
            LocalDateTime cutoffTime = LocalDateTime.now(ZoneOffset.UTC).minusMinutes(5)
            List<Notification> pendingNotifications = notificationRepository.findPendingNotifications(cutoffTime)
            
            log.info("Found ${pendingNotifications.size()} pending notifications to process")
            
            for (Notification notification : pendingNotifications) {
                try {
                    if (notification.isExpired()) {
                        notification.deliveryStatus = NotificationDeliveryStatus.EXPIRED
                        notificationRepository.save(notification)
                        log.info("Marked expired notification: ${notification.id}")
                        continue
                    }
                    
                    notificationDeliveryService.deliverWithRetry(notification)
                } catch (Exception e) {
                    log.error("Error processing pending notification: ${notification.id}", e)
                }
            }
            
            log.info("Completed pending notification processing")
        } catch (Exception e) {
            log.error("Error during pending notification processing", e)
        }
    }

    /**
     * Process partially delivered notifications every 10 minutes
     */
    @Scheduled(cron = "0 */10 * * * *")
    @Transactional
    void processPartiallyDeliveredNotifications() {
        log.info("Starting partially delivered notification processing")
        
        try {
            List<Notification> partiallyDelivered = notificationRepository.findPartiallyDeliveredNotifications()
            
            log.info("Found ${partiallyDelivered.size()} partially delivered notifications to retry")
            
            for (Notification notification : partiallyDelivered) {
                try {
                    if (notification.isExpired()) {
                        notification.deliveryStatus = NotificationDeliveryStatus.EXPIRED
                        notificationRepository.save(notification)
                        log.info("Marked expired partially delivered notification: ${notification.id}")
                        continue
                    }
                    
                    // Only retry the failed delivery method
                    if (!notification.websocketSent) {
                        notificationDeliveryService.deliverViaWebSocket(notification)
                    }
                    
                    if (!notification.emailSent) {
                        notificationDeliveryService.deliverViaEmail(notification)
                    }
                    
                    // Update status if both are now delivered
                    if (notification.websocketSent && notification.emailSent) {
                        notification.deliveryStatus = NotificationDeliveryStatus.DELIVERED
                        notificationRepository.save(notification)
                        log.info("Notification fully delivered after retry: ${notification.id}")
                    }
                    
                } catch (Exception e) {
                    log.error("Error processing partially delivered notification: ${notification.id}", e)
                }
            }
            
            log.info("Completed partially delivered notification processing")
        } catch (Exception e) {
            log.error("Error during partially delivered notification processing", e)
        }
    }

    /**
     * Clean up expired notifications daily at 3 AM
     */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    void cleanupExpiredNotifications() {
        log.info("Starting expired notification cleanup")
        
        try {
            LocalDateTime cutoffDate = LocalDateTime.now(ZoneOffset.UTC).minusDays(7)
            
            // Mark old notifications as expired
            List<Notification> oldNotifications = notificationRepository.findOldNotifications(cutoffDate)
            int expiredCount = 0
            
            for (Notification notification : oldNotifications) {
                if (notification.deliveryStatus != NotificationDeliveryStatus.DELIVERED) {
                    notification.deliveryStatus = NotificationDeliveryStatus.EXPIRED
                    notificationRepository.save(notification)
                    expiredCount++
                }
            }
            
            log.info("Marked ${expiredCount} old notifications as expired")
            
            // Clean up very old expired notifications (older than 30 days)
            LocalDateTime veryOldCutoff = LocalDateTime.now(ZoneOffset.UTC).minusDays(30)
            List<Notification> veryOldExpired = notificationRepository.findExpiredNotifications(veryOldCutoff)
            
            if (!veryOldExpired.isEmpty()) {
                notificationRepository.deleteAll(veryOldExpired)
                log.info("Deleted ${veryOldExpired.size()} very old expired notifications")
            }
            
            log.info("Completed expired notification cleanup")
        } catch (Exception e) {
            log.error("Error during expired notification cleanup", e)
        }
    }

    /**
     * Generate delivery statistics every hour
     */
    @Scheduled(cron = "0 0 * * * *")
    void generateDeliveryStatistics() {
        try {
            long pendingCount = notificationRepository.countByDeliveryStatus("PENDING")
            long deliveredCount = notificationRepository.countByDeliveryStatus("DELIVERED")
            long partiallyDeliveredCount = notificationRepository.countByDeliveryStatus("PARTIALLY_DELIVERED")
            long failedCount = notificationRepository.countByDeliveryStatus("FAILED")
            long retryingCount = notificationRepository.countByDeliveryStatus("RETRYING")
            long expiredCount = notificationRepository.countByDeliveryStatus("EXPIRED")
            
            log.info("Notification Delivery Statistics:")
            log.info("  Pending: ${pendingCount}")
            log.info("  Delivered: ${deliveredCount}")
            log.info("  Partially Delivered: ${partiallyDeliveredCount}")
            log.info("  Failed: ${failedCount}")
            log.info("  Retrying: ${retryingCount}")
            log.info("  Expired: ${expiredCount}")
            
            // Calculate success rate
            long totalProcessed = deliveredCount + partiallyDeliveredCount + failedCount + expiredCount
            if (totalProcessed > 0) {
                double successRate = ((deliveredCount + partiallyDeliveredCount) / totalProcessed) * 100
                log.info("  Success Rate: ${String.format("%.2f", successRate)}%")
            }
            
        } catch (Exception e) {
            log.error("Error generating delivery statistics", e)
        }
    }
}
