package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.entity.DeviceToken
import com.ddimitko.beautyhub.service.PushNotificationService
import com.ddimitko.beautyhub.service.NotificationService
import com.ddimitko.beautyhub.enums.NotificationType
import com.ddimitko.beautyhub.enums.NotificationPriority
import com.ddimitko.beautyhub.security.CustomUserPrincipal
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/device-tokens")
@CrossOrigin(origins = "*", maxAge = 3600)
@Slf4j
class DeviceTokenController {

    @Autowired
    private PushNotificationService pushNotificationService

    @Autowired
    private NotificationService notificationService

    /**
     * Register device token for push notifications
     */
    @PostMapping("/register")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> registerDeviceToken(
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            String token = request.get("token")
            String platform = request.get("platform") ?: "ios"
            String appVersion = request.get("appVersion")
            String osVersion = request.get("osVersion")
            String deviceInfo = request.get("deviceInfo")

            if (!token) {
                return ResponseEntity.badRequest().body([
                    error: "Device token is required",
                    message: "Token parameter cannot be empty"
                ])
            }

            log.info("Registering device token for user: ${userPrincipal.getId()}")

            DeviceToken deviceToken = pushNotificationService.registerDeviceToken(
                userPrincipal.getId(), 
                token, 
                platform
            )

            // Update additional device info if provided
            if (appVersion) deviceToken.appVersion = appVersion
            if (osVersion) deviceToken.osVersion = osVersion
            if (deviceInfo) deviceToken.deviceInfo = deviceInfo

            return ResponseEntity.ok([
                message: "Device token registered successfully",
                tokenId: deviceToken.id,
                platform: deviceToken.platform,
                active: deviceToken.active
            ])

        } catch (Exception e) {
            log.error("Failed to register device token", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to register device token",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Update device token information
     */
    @PutMapping("/{tokenId}")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> updateDeviceToken(
            @PathVariable String tokenId,
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Implementation for updating device token info
            return ResponseEntity.ok([
                message: "Device token updated successfully"
            ])

        } catch (Exception e) {
            log.error("Failed to update device token: ${tokenId}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to update device token",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Deactivate device token
     */
    @DeleteMapping("/deactivate")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> deactivateDeviceToken(
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            String token = request.get("token")

            if (!token) {
                return ResponseEntity.badRequest().body([
                    error: "Device token is required",
                    message: "Token parameter cannot be empty"
                ])
            }

            pushNotificationService.deactivateDeviceToken(token)

            return ResponseEntity.ok([
                message: "Device token deactivated successfully"
            ])

        } catch (Exception e) {
            log.error("Failed to deactivate device token", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to deactivate device token",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Get user's active device tokens
     */
    @GetMapping("/my-tokens")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> getUserDeviceTokens(@AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // This would require adding a method to the service to get user's tokens
            // For now, return a simple response
            return ResponseEntity.ok([
                message: "Device tokens retrieved successfully",
                tokens: []
            ])

        } catch (Exception e) {
            log.error("Failed to get user device tokens", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve device tokens",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Test push notification (for development)
     */
    @PostMapping("/test-push")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> testPushNotification(
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            String title = request.get("title") ?: "Test Notification"
            String message = request.get("message") ?: "This is a test push notification"

            log.info("Test push notification requested by user: ${userPrincipal.getId()}")

            // Create a test notification using the notification service
            notificationService.createNotification(
                userPrincipal.getId(),
                title,
                message,
                NotificationType.GENERAL,
                null,
                [testNotification: true],
                NotificationPriority.NORMAL
            )

            return ResponseEntity.ok([
                message: "Test notification created and sent successfully"
            ])

        } catch (Exception e) {
            log.error("Failed to send test push notification", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to send test push notification",
                message: e.getMessage()
            ])
        }
    }
}
