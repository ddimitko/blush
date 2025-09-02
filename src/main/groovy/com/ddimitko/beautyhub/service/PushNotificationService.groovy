package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.entity.Notification
import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.entity.DeviceToken
import com.ddimitko.beautyhub.repository.DeviceTokenRepository
import com.ddimitko.beautyhub.repository.NotificationRepository
import com.ddimitko.beautyhub.enums.NotificationType
import com.fasterxml.jackson.databind.ObjectMapper
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

import java.time.LocalDateTime

@Service
@Slf4j
class PushNotificationService {

    @Autowired
    private DeviceTokenRepository deviceTokenRepository

    @Autowired
    private ObjectMapper objectMapper

    @Autowired
    private NotificationRepository notificationRepository

    @Value('${app.push.apns.enabled:false}')
    private boolean apnsEnabled

    @Value('${app.push.apns.key-id:}')
    private String apnsKeyId

    @Value('${app.push.apns.team-id:}')
    private String apnsTeamId

    @Value('${app.push.apns.bundle-id:com.ddimitko.lunara}')
    private String apnsBundleId

    @Value('${app.push.apns.production:false}')
    private boolean apnsProduction

    /**
     * Register or update device token for a user
     */
    @Transactional
    DeviceToken registerDeviceToken(UUID userId, String token, String platform = 'ios') {
        log.info("Registering device token for user: ${userId}, platform: ${platform}")

        // Check if token already exists for this user
        DeviceToken existingToken = deviceTokenRepository.findByUserIdAndToken(userId, token)
        
        if (existingToken) {
            // Update existing token
            existingToken.lastUsed = LocalDateTime.now()
            existingToken.active = true
            return deviceTokenRepository.save(existingToken)
        }

        // Deactivate old tokens for this user on the same platform
        List<DeviceToken> oldTokens = deviceTokenRepository.findByUserIdAndPlatformAndActive(userId, platform, true)
        oldTokens.each { oldToken ->
            oldToken.active = false
            deviceTokenRepository.save(oldToken)
        }

        // Create new token
        DeviceToken deviceToken = new DeviceToken(
            userId: userId,
            token: token,
            platform: platform,
            active: true,
            createdAt: LocalDateTime.now(),
            lastUsed: LocalDateTime.now()
        )

        return deviceTokenRepository.save(deviceToken)
    }

    /**
     * Send push notification to user's devices
     */
    boolean sendPushNotification(Notification notification) {
        try {
            log.info("Sending push notification: ${notification.id}")

            List<DeviceToken> activeTokens = deviceTokenRepository.findByUserIdAndActive(
                notification.user.id, true
            )

            if (activeTokens.isEmpty()) {
                log.info("No active device tokens found for user: ${notification.user.id}")
                return false
            }

            boolean success = false
            for (DeviceToken deviceToken : activeTokens) {
                if (deviceToken.platform == 'ios') {
                    success |= sendAPNSNotification(notification, deviceToken)
                }
                // Add FCM for Android when needed
            }

            return success

        } catch (Exception e) {
            log.error("Failed to send push notification: ${notification.id}", e)
            return false
        }
    }

    /**
     * Send APNS notification to iOS device
     */
    private boolean sendAPNSNotification(Notification notification, DeviceToken deviceToken) {
        try {
            if (!apnsEnabled) {
                log.debug("APNS is disabled, skipping push notification")
                return false
            }

            // Create APNS payload
            Map<String, Object> aps = [
                alert: [
                    title: notification.title,
                    body: notification.message
                ],
                badge: getUnreadCountForUser(notification.user),
                sound: 'default',
                'content-available': 1
            ]

            Map<String, Object> payload = [
                aps: aps,
                notificationId: notification.id.toString(),
                type: notification.type,
                actionUrl: notification.actionUrl
            ]

            // Add custom data if available
            if (notification.data) {
                try {
                    Map<String, Object> customData = objectMapper.readValue(notification.data, Map.class)
                    payload.putAll(customData)
                } catch (Exception e) {
                    log.warn("Failed to parse notification data: ${notification.data}", e)
                }
            }

            // TODO: Implement actual APNS HTTP/2 client
            // For now, log the payload that would be sent
            log.info("APNS Payload for token ${deviceToken.token}: ${objectMapper.writeValueAsString(payload)}")

            // Update device token last used
            deviceToken.lastUsed = LocalDateTime.now()
            deviceTokenRepository.save(deviceToken)

            return true

        } catch (Exception e) {
            log.error("Failed to send APNS notification to token: ${deviceToken.token}", e)
            return false
        }
    }

    /**
     * Get unread notification count for user (for badge)
     */
    private int getUnreadCountForUser(User user) {
        return notificationRepository.countUnreadByUser(user).intValue()
    }

    /**
     * Deactivate device token
     */
    @Transactional
    void deactivateDeviceToken(String token) {
        DeviceToken deviceToken = deviceTokenRepository.findByToken(token)
        if (deviceToken) {
            deviceToken.active = false
            deviceTokenRepository.save(deviceToken)
            log.info("Deactivated device token: ${token}")
        }
    }

    /**
     * Clean up old inactive tokens
     */
    @Transactional
    void cleanupOldTokens() {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(30)
        List<DeviceToken> oldTokens = deviceTokenRepository.findByActiveAndLastUsedBefore(false, cutoffDate)
        
        if (!oldTokens.isEmpty()) {
            deviceTokenRepository.deleteAll(oldTokens)
            log.info("Cleaned up ${oldTokens.size()} old device tokens")
        }
    }
}
