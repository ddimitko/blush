package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.entity.Notification
import com.ddimitko.beautyhub.enums.NotificationDeliveryStatus
import com.ddimitko.beautyhub.enums.NotificationPriority
import com.ddimitko.beautyhub.repository.NotificationRepository
import com.fasterxml.jackson.databind.ObjectMapper
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

import java.time.LocalDateTime
import java.time.ZoneOffset

@Service
@Slf4j
class NotificationDeliveryService {

    @Autowired
    private NotificationRepository notificationRepository

    @Autowired
    private WebSocketMonitoringService webSocketMonitoringService

    @Autowired
    private RabbitMQMessageService rabbitMQMessageService

    @Autowired
    private EmailService emailService

    @Autowired
    private ObjectMapper objectMapper

    @Autowired
    private PushNotificationService pushNotificationService

    /**
     * Attempt to deliver notification via WebSocket
     */
    @Transactional
    boolean deliverViaWebSocket(Notification notification) {
        try {
            log.info("Attempting WebSocket delivery for notification: ${notification.id}")
            
            String userId = notification.user.id.toString()
            
            // Check if user is connected
            if (!webSocketMonitoringService.isUserConnected(userId)) {
                log.info("User ${userId} not connected for WebSocket delivery")
                return false
            }

            // Prepare notification data
            Map<String, Object> notificationData = [
                id: notification.id,
                title: notification.title,
                message: notification.message,
                type: notification.type,
                actionUrl: notification.actionUrl,
                createdAt: notification.createdAt,
                seen: notification.seen
            ]

            // Send notification
            webSocketMonitoringService.sendToUser(userId, [
                type: 'notification',
                data: notificationData
            ])

            // Send unread count update
            long unreadCount = notificationRepository.countUnreadByUser(notification.user)
            webSocketMonitoringService.sendToUser(userId, [
                type: 'notification-count',
                unreadCount: unreadCount
            ])

            // Mark as sent
            notification.markWebSocketSent()
            notificationRepository.save(notification)

            log.info("WebSocket delivery successful for notification: ${notification.id}")
            return true

        } catch (Exception e) {
            log.error("WebSocket delivery failed for notification: ${notification.id}", e)
            recordDeliveryFailure(notification, "WebSocket", e.getMessage())
            return false
        }
    }

    /**
     * Attempt to deliver notification via Push Notification
     */
    @Transactional
    boolean deliverViaPush(Notification notification) {
        try {
            log.info("Attempting push notification delivery for notification: ${notification.id}")

            boolean success = pushNotificationService.sendPushNotification(notification)

            if (success) {
                // Mark as sent
                notification.markPushSent()
                notificationRepository.save(notification)
                log.info("Push notification delivery successful for notification: ${notification.id}")
            } else {
                log.info("Push notification delivery failed - no active devices for user: ${notification.user.id}")
            }

            return success

        } catch (Exception e) {
            log.error("Push notification delivery failed for notification: ${notification.id}", e)
            recordDeliveryFailure(notification, "Push", e.getMessage())
            return false
        }
    }

    /**
     * Attempt to deliver notification via Email
     */
    @Transactional
    boolean deliverViaEmail(Notification notification) {
        try {
            log.info("Attempting email delivery for notification: ${notification.id}")

            // Skip email for certain notification types that don't need email
            if (shouldSkipEmail(notification.type)) {
                log.info("Skipping email delivery for notification type: ${notification.type}")
                return true // Consider as successful to avoid retries
            }

            // Send email notification
            sendNotificationEmail(notification)

            // Mark as sent
            notification.markEmailSent()
            notificationRepository.save(notification)

            log.info("Email delivery successful for notification: ${notification.id}")
            return true

        } catch (Exception e) {
            log.error("Email delivery failed for notification: ${notification.id}", e)
            recordDeliveryFailure(notification, "Email", e.getMessage())
            return false
        }
    }

    /**
     * Deliver notification with retry logic
     */
    @Transactional
    void deliverWithRetry(Notification notification) {
        log.info("Starting delivery for notification: ${notification.id} (attempt ${notification.retryCount + 1})")

        boolean webSocketSuccess = false
        boolean emailSuccess = false
        boolean pushSuccess = false

        // Try WebSocket delivery first (faster)
        if (!notification.websocketSent) {
            webSocketSuccess = deliverViaWebSocket(notification)
        } else {
            webSocketSuccess = true // Already sent
        }

        // Try push notification delivery
        if (!notification.pushSent) {
            pushSuccess = deliverViaPush(notification)
        } else {
            pushSuccess = true // Already sent
        }

        // Try email delivery
        if (!notification.emailSent) {
            emailSuccess = deliverViaEmail(notification)
        } else {
            emailSuccess = true // Already sent
        }

        // Update delivery status
        if (webSocketSuccess && emailSuccess && pushSuccess) {
            notification.deliveryStatus = NotificationDeliveryStatus.DELIVERED
            log.info("Notification fully delivered: ${notification.id}")
        } else if (webSocketSuccess || emailSuccess || pushSuccess) {
            notification.deliveryStatus = NotificationDeliveryStatus.PARTIALLY_DELIVERED
            log.info("Notification partially delivered: ${notification.id}")
        } else {
            notification.deliveryStatus = NotificationDeliveryStatus.FAILED
            log.warn("Notification delivery failed: ${notification.id}")
        }

        // Schedule retry if needed
        if (!webSocketSuccess || !emailSuccess || !pushSuccess) {
            if (notification.canRetry()) {
                notification.incrementRetryCount()
                notification.scheduleNextRetry()
                notification.deliveryStatus = NotificationDeliveryStatus.RETRYING
                log.info("Scheduled retry for notification: ${notification.id} at ${notification.nextRetryAt}")
            } else {
                notification.deliveryStatus = NotificationDeliveryStatus.FAILED
                log.error("Max retries exceeded for notification: ${notification.id}")
            }
        }

        notificationRepository.save(notification)
    }

    /**
     * Process failed notifications for retry
     */
    @Transactional
    void processRetries() {
        log.info("Processing notification retries")

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC)
        List<Notification> notificationsToRetry = notificationRepository.findNotificationsForRetry(now)

        log.info("Found ${notificationsToRetry.size()} notifications to retry")

        for (Notification notification : notificationsToRetry) {
            try {
                if (notification.isExpired()) {
                    notification.deliveryStatus = NotificationDeliveryStatus.EXPIRED
                    notificationRepository.save(notification)
                    log.info("Notification expired: ${notification.id}")
                    continue
                }

                deliverWithRetry(notification)
            } catch (Exception e) {
                log.error("Error processing retry for notification: ${notification.id}", e)
            }
        }
    }

    /**
     * Record delivery failure
     */
    private void recordDeliveryFailure(Notification notification, String deliveryMethod, String errorMessage) {
        notification.markDeliveryFailed("${deliveryMethod}: ${errorMessage}")
        notificationRepository.save(notification)
    }

    /**
     * Check if email should be skipped for this notification type
     */
    private boolean shouldSkipEmail(String notificationType) {
        // Skip email for real-time notifications that don't need email
        List<String> skipEmailTypes = [
            'APPOINTMENT_STATUS_CHANGED',
            'GENERAL'
        ]
        return skipEmailTypes.contains(notificationType)
    }

    /**
     * Send notification email based on type
     */
    private void sendNotificationEmail(Notification notification) {
        // For now, send a generic notification email
        // This can be expanded to send specific email types based on notification.type
        
        String subject = notification.title
        String htmlContent = generateNotificationEmailContent(notification)
        
        emailService.sendHtmlEmail(notification.user.email, subject, htmlContent)
    }

    /**
     * Generate email content for notification
     */
    private String generateNotificationEmailContent(Notification notification) {
        return """
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #BFA054; color: white; padding: 20px; text-align: center;">
                    <h1>Lunara Notification</h1>
                </div>
                <div style="padding: 20px;">
                    <h2>${notification.title}</h2>
                    <p>${notification.message}</p>
                    ${notification.actionUrl ? "<p><a href='${notification.actionUrl}' style='background-color: #BFA054; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>View Details</a></p>" : ""}
                    <hr style="margin: 20px 0;">
                    <p style="color: #666; font-size: 12px;">
                        This notification was sent on ${notification.getFormattedDate()}<br>
                        Lunara - Your Beauty Booking Platform
                    </p>
                </div>
            </body>
            </html>
        """
    }
}
