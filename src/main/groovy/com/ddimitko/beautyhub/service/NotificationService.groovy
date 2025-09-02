package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.entity.Appointment
import com.ddimitko.beautyhub.entity.LeaveRequest
import com.ddimitko.beautyhub.entity.Notification
import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.enums.NotificationDeliveryStatus
import com.ddimitko.beautyhub.enums.NotificationPriority
import com.ddimitko.beautyhub.enums.NotificationType
import com.ddimitko.beautyhub.repository.NotificationRepository
import com.ddimitko.beautyhub.repository.UserRepository
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import com.ddimitko.beautyhub.service.RabbitMQMessageService
import com.ddimitko.beautyhub.service.WebSocketMonitoringService
import org.springframework.stereotype.Service as SpringService
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.annotation.Propagation
import groovy.util.logging.Slf4j

import java.time.LocalDateTime

@SpringService
@Transactional
@Slf4j
class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository

    @Autowired
    private UserRepository userRepository

    @Autowired
    private WebSocketMonitoringService webSocketMonitoringService

    @Autowired
    private RabbitMQMessageService rabbitMQMessageService

    @Autowired
    private ObjectMapper objectMapper

    @Autowired
    private NotificationDeliveryService notificationDeliveryService

    /**
     * Create and send a notification to a user
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    Notification createNotification(UUID userId, String title, String message,
                                  NotificationType type = NotificationType.GENERAL,
                                  String actionUrl = null, Map<String, Object> data = null,
                                  NotificationPriority priority = NotificationPriority.NORMAL) {
        User user = userRepository.findById(userId)
            .orElseThrow { new IllegalArgumentException("User not found") }

        // Serialize data to JSON if provided
        String jsonData = null
        if (data) {
            try {
                jsonData = objectMapper.writeValueAsString(data)
            } catch (Exception e) {
                // Fallback to toString if JSON serialization fails
                jsonData = data.toString()
            }
        }

        Notification notification = new Notification(
            user: user,
            title: title,
            message: message,
            type: type.name(),
            actionUrl: actionUrl,
            data: jsonData,
            seen: false,
            pushSent: false,
            emailSent: false,
            websocketSent: false,
            priority: priority,
            maxRetries: priority.getMaxRetries(),
            deliveryStatus: NotificationDeliveryStatus.PENDING
        )

        notification = notificationRepository.save(notification)

        // Use the new delivery service for reliable delivery with retry logic
        try {
            notificationDeliveryService.deliverWithRetry(notification)
        } catch (Exception e) {
            log.error("Failed to initiate delivery for notification: ${notification.id}", e)
            // Notification is saved and will be picked up by retry scheduler
        }

        return notification
    }

    /**
     * Get notifications for a user with pagination (last 30 days only)
     */
    Page<Notification> getUserNotifications(UUID userId, int page = 0, int size = 20) {
        User user = userRepository.findById(userId)
            .orElseThrow { new IllegalArgumentException("User not found") }

        // Only get notifications from the last 30 days
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30)

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        return notificationRepository.findByUserAndCreatedAtAfter(user, thirtyDaysAgo, pageable)
    }

    /**
     * Get unread notifications for a user (last 30 days only)
     */
    List<Notification> getUnreadNotifications(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow { new IllegalArgumentException("User not found") }

        // Only get unread notifications from the last 30 days
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30)

        return notificationRepository.findByUserAndSeenFalseAndCreatedAtAfterOrderByCreatedAtDesc(user, thirtyDaysAgo)
    }

    /**
     * Get unread notification count for a user (last 30 days only)
     */
    long getUnreadCount(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow { new IllegalArgumentException("User not found") }

        // Only count unread notifications from the last 30 days
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30)

        return notificationRepository.countUnreadByUserAndCreatedAtAfter(user, thirtyDaysAgo)
    }

    /**
     * Mark a notification as read
     */
    Notification markAsRead(UUID notificationId, UUID userId) {
        Notification notification = notificationRepository.findById(notificationId)
            .orElseThrow { new IllegalArgumentException("Notification not found") }

        // Verify the notification belongs to the user
        if (!notification.user.id.equals(userId)) {
            throw new IllegalArgumentException("Access denied")
        }

        if (!notification.seen) {
            notification.markAsSeen()
            notification = notificationRepository.save(notification)

            // Send updated count via WebSocket
            sendUnreadCountUpdate(userId)
        }

        return notification
    }

    /**
     * Mark all notifications as read for a user
     */
    void markAllAsRead(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow { new IllegalArgumentException("User not found") }

        List<Notification> unreadNotifications = notificationRepository.findByUserAndSeenFalse(user)
        
        unreadNotifications.each { notification ->
            notification.markAsSeen()
        }

        if (!unreadNotifications.isEmpty()) {
            notificationRepository.saveAll(unreadNotifications)
            
            // Send updated count via WebSocket
            sendUnreadCountUpdate(userId)
        }
    }

    /**
     * Auto-mark all unread notifications as seen when user opens notification menu
     * This is triggered when user hovers over or opens the notification dropdown
     */
    void autoMarkNotificationsAsSeen(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow { new IllegalArgumentException("User not found") }

        // Only get unread notifications from the last 30 days
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30)
        List<Notification> unreadNotifications = notificationRepository
            .findByUserAndSeenFalseAndCreatedAtAfterOrderByCreatedAtDesc(user, thirtyDaysAgo)

        if (!unreadNotifications.isEmpty()) {
            unreadNotifications.each { notification ->
                notification.markAsSeen()
            }
            notificationRepository.saveAll(unreadNotifications)

            // Send updated unread count via WebSocket
            sendUnreadCountUpdate(userId)
        }
    }

    /**
     * Delete a specific notification for a user
     */
    void deleteNotification(UUID notificationId, UUID userId) {
        Notification notification = notificationRepository.findById(notificationId)
            .orElseThrow { new IllegalArgumentException("Notification not found") }

        // Verify the notification belongs to the user
        if (!notification.user.id.equals(userId)) {
            throw new IllegalArgumentException("Access denied")
        }

        notificationRepository.delete(notification)

        // Send updated unread count via WebSocket if the deleted notification was unread
        if (!notification.seen) {
            sendUnreadCountUpdate(userId)
        }
    }

    /**
     * Clear all notifications for a user
     */
    void clearAllNotifications(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow { new IllegalArgumentException("User not found") }

        List<Notification> userNotifications = notificationRepository.findByUser(user)

        if (!userNotifications.isEmpty()) {
            notificationRepository.deleteAll(userNotifications)

            // Send updated unread count via WebSocket (should be 0 now)
            sendUnreadCountUpdate(userId)
        }
    }

    /**
     * Delete old notifications (older than 30 days)
     */
    void cleanupOldNotifications() {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(30)
        List<Notification> oldNotifications = notificationRepository.findOldNotifications(cutoffDate)

        if (!oldNotifications.isEmpty()) {
            notificationRepository.deleteAll(oldNotifications)
        }
    }

    /**
     * Notify shop owner when an employee submits a leave request
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void notifyLeaveRequestSubmitted(LeaveRequest leaveRequest) {
        User shopOwner = leaveRequest.employee.shop.owner
        String employeeName = leaveRequest.employee.fullName
        String leaveType = leaveRequest.leaveType.displayName
        String startDate = leaveRequest.startDate.toString()
        String endDate = leaveRequest.endDate.toString()

        String title = "New Leave Request"
        String message = "${employeeName} has requested ${leaveType} from ${startDate} to ${endDate}"
        String actionUrl = "/owner/leave-requests?highlight=${leaveRequest.id}"

        Map<String, Object> notificationData = [
            leaveRequestId: leaveRequest.id.toString(),
            employeeId: leaveRequest.employee.id.toString(),
            employeeName: employeeName,
            leaveType: leaveRequest.leaveType.name(),
            startDate: startDate,
            endDate: endDate,
            leaveDays: leaveRequest.leaveDays,
            reason: leaveRequest.reason,
            type: 'leave_request_submitted'
        ]

        createNotification(
            shopOwner.id,
            title,
            message,
            NotificationType.LEAVE_REQUEST_SUBMITTED,
            actionUrl,
            notificationData
        )
    }

    /**
     * Notify employee when their leave request is reviewed
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void notifyLeaveRequestReviewed(LeaveRequest leaveRequest) {
        User employee = leaveRequest.employee.user
        String reviewerName = leaveRequest.reviewedBy.fullName
        String leaveType = leaveRequest.leaveType.displayName
        String startDate = leaveRequest.startDate.toString()
        String endDate = leaveRequest.endDate.toString()
        boolean isApproved = leaveRequest.status.name() == 'APPROVED'

        String title = isApproved ? "Leave Request Approved" : "Leave Request Rejected"
        String message = "Your ${leaveType} request from ${startDate} to ${endDate} has been ${isApproved ? 'approved' : 'rejected'} by ${reviewerName}"
        String actionUrl = "/employee/leave-request"

        Map<String, Object> notificationData = [
            leaveRequestId: leaveRequest.id.toString(),
            reviewerId: leaveRequest.reviewedBy.id.toString(),
            reviewerName: reviewerName,
            leaveType: leaveRequest.leaveType.name(),
            startDate: startDate,
            endDate: endDate,
            leaveDays: leaveRequest.leaveDays,
            status: leaveRequest.status.name(),
            reviewNotes: leaveRequest.reviewNotes,
            type: 'leave_request_reviewed'
        ]

        NotificationType notificationType = isApproved ?
            NotificationType.LEAVE_REQUEST_APPROVED :
            NotificationType.LEAVE_REQUEST_REJECTED

        createNotification(
            employee.id,
            title,
            message,
            notificationType,
            actionUrl,
            notificationData
        )
    }

    /**
     * Send real-time notification via WebSocket
     */
    private void sendRealTimeNotification(UUID userId, Notification notification) {
        try {
            Map<String, Object> notificationData = [
                id: notification.id,
                title: notification.title,
                message: notification.message,
                type: notification.type,
                actionUrl: notification.actionUrl,
                createdAt: notification.createdAt,
                seen: notification.seen
            ]

            // Send notification via user-specific topic-based WebSocket
            String userTopic = "notifications.${userId}"
            String topicMessage = objectMapper.writeValueAsString([
                topic: userTopic,
                data: notificationData
            ])

            webSocketMonitoringService.broadcastToTopic(userTopic, topicMessage)
            println("Sent real-time notification via WebSocket topic '${userTopic}': ${notification.id}")
        } catch (Exception e) {
            // Log error but don't fail notification creation
            println("Failed to send real-time notification: ${e.getMessage()}")
        }
    }

    /**
     * Send updated unread count via WebSocket
     */
    private void sendUnreadCountUpdate(UUID userId) {
        try {
            Map<String, Object> countData = [
                unreadCount: getUnreadCount(userId)
            ]

            // Send count update via user-specific topic-based WebSocket
            String userTopic = "notification-count.${userId}"
            String topicMessage = objectMapper.writeValueAsString([
                topic: userTopic,
                data: countData
            ])

            webSocketMonitoringService.broadcastToTopic(userTopic, topicMessage)
            println("Sent unread count update via WebSocket topic '${userTopic}': ${countData.unreadCount}")
        } catch (Exception e) {
            // Log error but don't fail the operation
            println("Failed to send unread count update: ${e.getMessage()}")
        }
    }

    /**
     * Create appointment-related notifications
     */
    void createAppointmentNotification(UUID userId, String appointmentId, NotificationType type, Map<String, String> details) {
        String title = ""
        String message = ""
        String actionUrl = "/appointments/${appointmentId}"

        switch (type) {
            case NotificationType.APPOINTMENT_CONFIRMED:
                title = "Appointment Confirmed"
                message = "Your appointment for ${details.serviceName} at ${details.shopName} has been confirmed."
                break
            case NotificationType.APPOINTMENT_CANCELLED:
                title = "Appointment Cancelled"
                message = "Your appointment for ${details.serviceName} at ${details.shopName} has been cancelled."
                break
            case NotificationType.APPOINTMENT_REMINDER:
                title = "Appointment Reminder"
                message = "You have an upcoming appointment for ${details.serviceName} at ${details.shopName} tomorrow."
                break
            case NotificationType.NEW_BOOKING:
                title = "New Booking"
                message = "You have a new booking for ${details.serviceName} from ${details.customerName}."
                actionUrl = "/dashboard/appointments"
                break
            default:
                title = "Appointment Update"
                message = "Your appointment has been updated."
        }

        createNotification(userId, title, message, type, actionUrl, details)
    }

    /**
     * Create payment-related notifications
     */
    void createPaymentNotification(UUID userId, String appointmentId, NotificationType type, Map<String, String> details) {
        String title = ""
        String message = ""
        String actionUrl = "/appointments/${appointmentId}"

        switch (type) {
            case NotificationType.PAYMENT_RECEIVED:
                title = "Payment Received"
                message = "Payment of ${details.amount} has been received for your appointment."
                break
            case NotificationType.PAYMENT_FAILED:
                title = "Payment Failed"
                message = "Payment for your appointment failed. Please try again."
                break
            default:
                title = "Payment Update"
                message = "Your payment status has been updated."
        }

        createNotification(userId, title, message, type, actionUrl, details)
    }

    /**
     * Create notification for leave request cancellation
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void createLeaveRequestCancelledNotification(LeaveRequest leaveRequest) {
        log.info("Creating leave request cancellation notification for request ${leaveRequest.id}")

        // Get shop owner
        User shopOwner = leaveRequest.employee.shop.owner
        if (!shopOwner) {
            log.warn("No shop owner found for leave request ${leaveRequest.id}")
            return
        }

        String title = "Leave Request Cancelled"
        String message = "${leaveRequest.employee.fullName} has cancelled their ${leaveRequest.leaveType.displayName.toLowerCase()} request for ${leaveRequest.startDate} - ${leaveRequest.endDate}"
        NotificationType type = NotificationType.LEAVE_CANCELLED
        String actionUrl = "/owner/leave-requests?highlight=${leaveRequest.id}"

        // Create notification data
        Map<String, Object> details = [
            leaveRequestId: leaveRequest.id.toString(),
            employeeId: leaveRequest.employee.id.toString(),
            employeeName: leaveRequest.employee.fullName,
            leaveType: leaveRequest.leaveType.toString(),
            startDate: leaveRequest.startDate.toString(),
            endDate: leaveRequest.endDate.toString(),
            calculatedLeaveDays: leaveRequest.calculatedLeaveDays,
            reason: leaveRequest.reason,
            shopId: leaveRequest.employee.shop.id.toString(),
            shopName: leaveRequest.employee.shop.name
        ]

        createNotification(shopOwner.id, title, message, type, actionUrl, details)
    }

    /**
     * Notify customer when appointment is cancelled due to employee leave
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void notifyAppointmentCancellationDueToLeave(Appointment appointment) {
        if (!appointment.user) {
            log.info("Cannot notify customer - no user account for appointment: ${appointment.id}")
            return
        }

        User customer = appointment.user
        String employeeName = appointment.employee?.getFullName() ?: "Your provider"
        String serviceName = appointment.service?.name ?: "Unknown Service"
        String appointmentTime = appointment.getFormattedDateTime()
        String shopName = appointment.shop?.name ?: "the shop"

        String title = "Appointment Cancelled - Employee Leave"
        String message = "Your ${serviceName} appointment with ${employeeName} at ${shopName} on ${appointmentTime} has been cancelled due to approved employee leave"
        String actionUrl = "/appointments?highlight=${appointment.id}"

        Map<String, Object> notificationData = [
            appointmentId: appointment.id.toString(),
            employeeId: appointment.employee?.user?.id?.toString(),
            employeeName: employeeName,
            serviceName: serviceName,
            appointmentDateTime: appointment.appointmentDateTime.toString(),
            shopId: appointment.shop?.id?.toString(),
            shopName: shopName,
            cancellationReason: appointment.cancellationReason,
            type: 'appointment_cancelled_due_to_leave'
        ]

        createNotification(
            customer.id,
            title,
            message,
            NotificationType.APPOINTMENT_CANCELLED_BY_EMPLOYEE,
            actionUrl,
            notificationData
        )

        log.info("Notified customer ${customer.id} of appointment cancellation due to leave: ${appointment.id}")
    }

    /**
     * Update legacy notification URLs to new format
     * This method updates old /shop/{shopId}/leave-requests URLs to /owner/leave-requests?highlight={requestId}
     */
    @Transactional
    void updateLegacyLeaveRequestNotificationUrls() {
        log.info("Starting update of legacy leave request notification URLs")

        // Find all notifications with old leave request URLs
        List<Notification> legacyNotifications = notificationRepository.findAll().findAll { notification ->
            notification.actionUrl?.contains('/shop/') && notification.actionUrl?.contains('/leave-requests')
        }

        log.info("Found ${legacyNotifications.size()} legacy leave request notifications to update")

        legacyNotifications.each { notification ->
            try {
                // Extract leave request ID from notification data if available
                String leaveRequestId = null
                if (notification.data && notification.data.contains('leaveRequestId')) {
                    // Simple string extraction for leave request ID
                    def matcher = notification.data =~ /"leaveRequestId":"([^"]+)"/
                    if (matcher.find()) {
                        leaveRequestId = matcher.group(1)
                    }
                }

                // Update the action URL
                if (leaveRequestId) {
                    notification.actionUrl = "/owner/leave-requests?highlight=${leaveRequestId}"
                } else {
                    notification.actionUrl = "/owner/leave-requests"
                }

                log.debug("Updated notification ${notification.id} URL to: ${notification.actionUrl}")
            } catch (Exception e) {
                log.error("Failed to update notification ${notification.id}: ${e.message}")
                // Fallback to basic URL without highlight
                notification.actionUrl = "/owner/leave-requests"
            }
        }

        // Save all updated notifications
        if (legacyNotifications) {
            notificationRepository.saveAll(legacyNotifications)
            log.info("Successfully updated ${legacyNotifications.size()} legacy notification URLs")
        }
    }
}
