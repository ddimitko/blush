package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.entity.Notification
import com.ddimitko.beautyhub.enums.NotificationType
import com.ddimitko.beautyhub.security.CustomUserPrincipal
import com.ddimitko.beautyhub.service.NotificationService
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.Page
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*", maxAge = 3600)
class NotificationController {

    @Autowired
    private NotificationService notificationService

    /**
     * Get notifications for the authenticated user
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> getNotifications(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            Page<Notification> notifications = notificationService.getUserNotifications(
                userPrincipal.getId(), page, size
            )

            List<Map<String, Object>> notificationList = notifications.content.collect { notification ->
                [
                    id: notification.id,
                    title: notification.title,
                    message: notification.message,
                    type: notification.type,
                    seen: notification.seen,
                    actionUrl: notification.actionUrl,
                    createdAt: notification.createdAt,
                    formattedDate: notification.getFormattedDate()
                ]
            }

            return ResponseEntity.ok([
                notifications: notificationList,
                totalElements: notifications.totalElements,
                totalPages: notifications.totalPages,
                currentPage: notifications.number,
                hasNext: notifications.hasNext(),
                hasPrevious: notifications.hasPrevious()
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve notifications",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Get unread notifications for the authenticated user
     */
    @GetMapping("/unread")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> getUnreadNotifications(@AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            List<Notification> notifications = notificationService.getUnreadNotifications(userPrincipal.getId())

            List<Map<String, Object>> notificationList = notifications.collect { notification ->
                [
                    id: notification.id,
                    title: notification.title,
                    message: notification.message,
                    type: notification.type,
                    actionUrl: notification.actionUrl,
                    createdAt: notification.createdAt,
                    formattedDate: notification.getFormattedDate()
                ]
            }

            return ResponseEntity.ok([
                notifications: notificationList,
                count: notifications.size()
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve unread notifications",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Get unread notification count for the authenticated user
     */
    @GetMapping("/unread-count")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> getUnreadCount(@AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            long count = notificationService.getUnreadCount(userPrincipal.getId())

            return ResponseEntity.ok([
                unreadCount: count
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve unread count",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Mark a notification as read
     */
    @PutMapping("/{notificationId}/read")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> markAsRead(
            @PathVariable("notificationId") UUID notificationId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            Notification notification = notificationService.markAsRead(notificationId, userPrincipal.getId())

            return ResponseEntity.ok([
                message: "Notification marked as read",
                notification: [
                    id: notification.id,
                    title: notification.title,
                    message: notification.message,
                    type: notification.type,
                    seen: notification.seen,
                    actionUrl: notification.actionUrl,
                    createdAt: notification.createdAt,
                    readAt: notification.readAt
                ]
            ])
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to mark notification as read",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to mark notification as read",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Mark all notifications as read for the authenticated user
     */
    @PutMapping("/mark-all-read")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> markAllAsRead(@AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            notificationService.markAllAsRead(userPrincipal.getId())

            return ResponseEntity.ok([
                message: "All notifications marked as read"
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to mark all notifications as read",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Auto-mark notifications as seen when user opens notification menu
     */
    @PutMapping("/auto-mark-seen")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> autoMarkAsSeen(@AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            notificationService.autoMarkNotificationsAsSeen(userPrincipal.getId())

            return ResponseEntity.ok([
                message: "Notifications marked as seen"
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to mark notifications as seen",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Delete a specific notification
     */
    @DeleteMapping("/{notificationId}")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> deleteNotification(
            @PathVariable("notificationId") String notificationId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            notificationService.deleteNotification(UUID.fromString(notificationId), userPrincipal.getId())

            return ResponseEntity.ok([
                message: "Notification deleted successfully"
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to delete notification",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Clear all notifications for the authenticated user
     */
    @DeleteMapping("/clear-all")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> clearAllNotifications(@AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            notificationService.clearAllNotifications(userPrincipal.getId())

            return ResponseEntity.ok([
                message: "All notifications cleared successfully"
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to clear all notifications",
                message: e.getMessage()
            ])
        }
    }



    /**
     * Delete old notifications (admin endpoint)
     */
    @DeleteMapping("/cleanup")
    @PreAuthorize("hasRole('ADMIN')")
    ResponseEntity<?> cleanupOldNotifications() {
        try {
            notificationService.cleanupOldNotifications()

            return ResponseEntity.ok([
                message: "Old notifications cleaned up successfully"
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to cleanup old notifications",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Migrate legacy notification URLs (admin endpoint)
     */
    @PostMapping("/migrate-legacy-urls")
    @PreAuthorize("hasRole('ADMIN')")
    ResponseEntity<?> migrateLegacyNotificationUrls() {
        try {
            notificationService.updateLegacyLeaveRequestNotificationUrls()

            return ResponseEntity.ok([
                message: "Legacy notification URLs updated successfully"
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to migrate legacy notification URLs",
                message: e.getMessage()
            ])
        }
    }
}
