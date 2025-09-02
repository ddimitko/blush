package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.config.RabbitMQConfig
import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.entity.Appointment
import com.ddimitko.beautyhub.entity.Notification
import com.ddimitko.beautyhub.repository.UserRepository
import com.ddimitko.beautyhub.repository.AppointmentRepository
import com.ddimitko.beautyhub.repository.NotificationRepository
import groovy.util.logging.Slf4j
import org.springframework.amqp.rabbit.annotation.RabbitListener
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

import java.util.Optional
import java.util.UUID

@Service
@Slf4j
class RabbitMQMessageListener {

    @Autowired
    private WebSocketMonitoringService monitoringService

    @Autowired
    private EmailService emailService

    @Autowired
    private UserRepository userRepository

    @Autowired
    private AppointmentRepository appointmentRepository

    @Autowired
    private NotificationService notificationService

    @Autowired
    private NotificationDeliveryService notificationDeliveryService

    @Autowired
    private NotificationRepository notificationRepository

    /**
     * Listen for notification messages and send them via WebSocket
     */
    @RabbitListener(queues = RabbitMQConfig.NOTIFICATION_QUEUE)
    void handleNotificationMessage(Map message) {
        try {
            log.info("Received notification message from RabbitMQ: ${message.id}")

            // Find the notification in database for proper tracking
            UUID notificationId = UUID.fromString(message.id.toString())
            Optional<Notification> notificationOpt = notificationRepository.findById(notificationId)

            if (!notificationOpt.isPresent()) {
                log.warn("Notification not found in database: ${notificationId}")
                return
            }

            Notification notification = notificationOpt.get()

            // Use the delivery service for proper tracking
            notificationDeliveryService.deliverWithRetry(notification)
        } catch (Exception e) {
            log.error("Failed to handle notification message from RabbitMQ: ${message.id}", e)
            // Don't throw exception to avoid message requeue loop
            // The retry scheduler will handle failed deliveries
        }
    }

    /**
     * Listen for appointment notification messages
     */
    @RabbitListener(queues = RabbitMQConfig.APPOINTMENT_NOTIFICATION_QUEUE)
    void handleAppointmentNotificationMessage(Map message) {
        try {
            log.info("Received appointment notification from RabbitMQ: ${message.appointmentId}")

            // Send appointment notification to relevant users
            if (message.userId) {
                monitoringService.sendToUser(message.userId.toString(), [
                    type: 'appointment',
                    data: message
                ])
            }

            if (message.employeeId) {
                monitoringService.sendToUser(message.employeeId.toString(), [
                    type: 'appointment',
                    data: message
                ])
            }

            log.info("Sent appointment notification via WebSocket")
        } catch (Exception e) {
            log.error("Failed to handle appointment notification from RabbitMQ", e)
        }
    }

    /**
     * Listen for email notification messages
     */
    @RabbitListener(queues = RabbitMQConfig.EMAIL_NOTIFICATION_QUEUE)
    void handleEmailNotificationMessage(Map message) {
        try {
            log.info("Received email notification from RabbitMQ: ${message.emailType}")

            // Process different types of email notifications
            switch (message.emailType) {
                case 'appointment_confirmation':
                    handleAppointmentConfirmationEmail(message)
                    break
                case 'appointment_update':
                    handleAppointmentUpdateEmail(message)
                    break
                case 'appointment_cancellation':
                    handleAppointmentCancellationEmail(message)
                    break
                case 'appointment_reminder':
                    handleAppointmentReminderEmail(message)
                    break
                case 'welcome':
                    handleWelcomeEmail(message)
                    break
                case 'password_reset':
                    handlePasswordResetEmail(message)
                    break
                case 'review_request':
                    handleReviewRequestEmail(message)
                    break
                case 'guest_review_request':
                    handleGuestReviewRequestEmail(message)
                    break
                default:
                    log.warn("Unknown email type: ${message.emailType}")
            }

            // Send WebSocket confirmation if user is connected
            if (message.userId) {
                monitoringService.sendToUser(message.userId.toString(), [
                    type: 'email-status',
                    status: 'sent',
                    emailType: message.emailType
                ])
            }
        } catch (Exception e) {
            log.error("Failed to handle email notification from RabbitMQ", e)
        }
    }

    @Transactional(readOnly = true)
    private void handleAppointmentConfirmationEmail(Map message) {
        if (message.appointmentId) {
            UUID appointmentId = UUID.fromString(message.appointmentId.toString())
            Appointment appointment = appointmentRepository.findById(appointmentId).orElse(null)
            if (appointment) {
                log.info("Sending appointment confirmation email for appointment: ${appointmentId}")
                // Force initialization of lazy-loaded entities before async processing
                initializeAppointmentEntities(appointment)
                emailService.sendAppointmentConfirmationEmail(appointment)
                log.info("Appointment confirmation email sent for appointment: ${appointmentId}")
            } else {
                log.warn("Appointment not found for confirmation email: ${appointmentId}")
            }
        } else {
            log.warn("No appointmentId provided for confirmation email")
        }
    }

    @Transactional(readOnly = true)
    private void handleAppointmentUpdateEmail(Map message) {
        if (message.appointmentId) {
            UUID appointmentId = UUID.fromString(message.appointmentId.toString())
            Appointment appointment = appointmentRepository.findById(appointmentId).orElse(null)
            if (appointment) {
                // Force initialization of lazy-loaded entities before async processing
                initializeAppointmentEntities(appointment)
                emailService.sendAppointmentUpdateEmail(appointment, message.updateMessage?.toString())
            }
        }
    }

    @Transactional(readOnly = true)
    private void handleAppointmentCancellationEmail(Map message) {
        if (message.appointmentId) {
            UUID appointmentId = UUID.fromString(message.appointmentId.toString())
            Appointment appointment = appointmentRepository.findById(appointmentId).orElse(null)
            if (appointment) {
                // Force initialization of lazy-loaded entities before async processing
                initializeAppointmentEntities(appointment)
                emailService.sendAppointmentCancellationEmail(appointment, message.cancellationReason?.toString())
            }
        }
    }

    @Transactional(readOnly = true)
    private void handleAppointmentReminderEmail(Map message) {
        if (message.appointmentId) {
            UUID appointmentId = UUID.fromString(message.appointmentId.toString())
            Appointment appointment = appointmentRepository.findById(appointmentId).orElse(null)
            if (appointment) {
                // Force initialization of lazy-loaded entities before async processing
                initializeAppointmentEntities(appointment)
                emailService.sendAppointmentReminderEmail(appointment, message.customMessage?.toString())
            }
        }
    }

    private void handleWelcomeEmail(Map message) {
        if (message.userId) {
            UUID userId = UUID.fromString(message.userId.toString())
            User user = userRepository.findById(userId).orElse(null)
            if (user) {
                emailService.sendWelcomeEmail(user)
            }
        }
    }

    private void handlePasswordResetEmail(Map message) {
        if (message.userId && message.resetToken) {
            UUID userId = UUID.fromString(message.userId.toString())
            User user = userRepository.findById(userId).orElse(null)
            if (user) {
                emailService.sendPasswordResetEmail(user, message.resetToken.toString())
            }
        }
    }

    private void handleReviewRequestEmail(Map message) {
        try {
            log.info("Sending review request email for appointment: ${message.appointmentId}")
            emailService.sendReviewRequestEmail(message)
        } catch (Exception e) {
            log.error("Failed to send review request email for appointment: ${message.appointmentId}", e)
        }
    }

    private void handleGuestReviewRequestEmail(Map message) {
        try {
            log.info("Sending guest review request email for appointment: ${message.appointmentId}")
            emailService.sendGuestReviewRequestEmail(message)
        } catch (Exception e) {
            log.error("Failed to send guest review request email for appointment: ${message.appointmentId}", e)
        }
    }

    /**
     * Initialize lazy-loaded entities to prevent LazyInitializationException in async processing
     */
    private void initializeAppointmentEntities(Appointment appointment) {
        try {
            // Force initialization of lazy-loaded entities
            if (appointment.user) {
                appointment.user.firstName // Access property to trigger initialization
                appointment.user.lastName
                appointment.user.email
            }
            if (appointment.employee) {
                appointment.employee.user?.firstName // Access nested properties
                appointment.employee.user?.lastName
            }
            if (appointment.service) {
                appointment.service.name // Access service name
            }
            if (appointment.shop) {
                appointment.shop.name // Access shop name
                appointment.shop.address
            }
        } catch (Exception e) {
            log.warn("Failed to initialize appointment entities for appointment: ${appointment.id}", e)
        }
    }
}
