package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.entity.Appointment
import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.enums.NotificationType
import com.ddimitko.beautyhub.enums.AppointmentStatus
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service

import java.net.URLEncoder

@Service
@Slf4j
class AppointmentNotificationService {

    @Autowired
    private NotificationService notificationService

    @Autowired
    private RabbitMQMessageService rabbitMQMessageService

    @Autowired
    private EmailService emailService

    @Autowired
    private EmployeeService employeeService

    @Autowired
    private SystemUserService systemUserService

    @Value('${app.base-url:http://localhost:3000}')
    private String baseUrl

    /**
     * Notifies employee when a new appointment is created
     */
    void notifyEmployeeOfNewAppointment(Appointment appointment) {
        if (!appointment.employee?.user) {
            log.warn("Cannot notify employee - employee or user not found for appointment: ${appointment.id}")
            return
        }

        User employee = appointment.employee.user
        String customerName = getCustomerDisplayName(appointment)
        String serviceName = appointment.service?.name ?: "Unknown Service"
        String appointmentTime = appointment.getFormattedDateTime()

        String title = "New Appointment Booked"
        String message = "${customerName} booked ${serviceName} on ${appointmentTime}"
        String actionUrl = generateAppointmentActionUrl(employee, appointment.id)

        // Create notification data with appointment details
        Map<String, Object> notificationData = [
            appointmentId: appointment.id.toString(),
            customerId: appointment.user?.id?.toString(),
            customerName: customerName,
            serviceName: serviceName,
            appointmentDateTime: appointment.appointmentDateTime.toString(),
            shopId: appointment.shop?.id?.toString(),
            type: 'appointment_created'
        ]

        notificationService.createNotification(
            employee.id,
            title,
            message,
            NotificationType.APPOINTMENT_CREATED,
            actionUrl,
            notificationData
        )

        // Send email notification to customer
        sendAppointmentConfirmationEmail(appointment)

        log.info("Notified employee ${employee.id} of new appointment ${appointment.id}")
    }

    /**
     * Notifies employee when appointment is updated by customer
     */
    void notifyEmployeeOfAppointmentUpdate(Appointment appointment) {
        if (!appointment.employee?.user) {
            log.warn("Cannot notify employee - employee or user not found for appointment: ${appointment.id}")
            return
        }

        User employee = appointment.employee.user
        String customerName = getCustomerDisplayName(appointment)
        String serviceName = appointment.service?.name ?: "Unknown Service"
        String appointmentTime = appointment.getFormattedDateTime()

        String title = "Appointment Updated"
        String message = "${customerName} updated their ${serviceName} appointment for ${appointmentTime}"
        String actionUrl = "/dashboard?highlight=${appointment.id}"

        Map<String, Object> notificationData = [
            appointmentId: appointment.id.toString(),
            customerId: appointment.user?.id?.toString(),
            customerName: customerName,
            serviceName: serviceName,
            appointmentDateTime: appointment.appointmentDateTime.toString(),
            shopId: appointment.shop?.id?.toString(),
            type: 'appointment_updated_by_customer'
        ]

        notificationService.createNotification(
            employee.id,
            title,
            message,
            NotificationType.APPOINTMENT_EDITED_BY_CUSTOMER,
            actionUrl,
            notificationData
        )

        // Send email notification about appointment update
        sendAppointmentUpdateEmail(appointment, "Your appointment has been updated.")

        log.info("Notified employee ${employee.id} of appointment update ${appointment.id}")
    }

    /**
     * Notifies employee when appointment is cancelled by customer
     */
    void notifyEmployeeOfAppointmentCancellation(Appointment appointment) {
        if (!appointment.employee?.user) {
            log.warn("Cannot notify employee - employee or user not found for appointment: ${appointment.id}")
            return
        }

        User employee = appointment.employee.user
        String customerName = getCustomerDisplayName(appointment)
        String serviceName = appointment.service?.name ?: "Unknown Service"
        String appointmentTime = appointment.getFormattedDateTime()

        String title = "Appointment Cancelled"
        String message = "${customerName} cancelled their ${serviceName} appointment for ${appointmentTime}"
        String actionUrl = "/dashboard?highlight=${appointment.id}"

        Map<String, Object> notificationData = [
            appointmentId: appointment.id.toString(),
            customerId: appointment.user?.id?.toString(),
            customerName: customerName,
            serviceName: serviceName,
            appointmentDateTime: appointment.appointmentDateTime.toString(),
            shopId: appointment.shop?.id?.toString(),
            type: 'appointment_cancelled_by_customer'
        ]

        notificationService.createNotification(
            employee.id,
            title,
            message,
            NotificationType.APPOINTMENT_CANCELLED_BY_CUSTOMER,
            actionUrl,
            notificationData
        )

        // Send email notification about appointment cancellation
        sendAppointmentCancellationEmail(appointment, appointment.cancellationReason)

        log.info("Notified employee ${employee.id} of appointment cancellation ${appointment.id}")
    }

    /**
     * Notifies customer when appointment is updated by employee
     */
    void notifyCustomerOfAppointmentUpdate(Appointment appointment) {
        if (!appointment.user) {
            log.info("Cannot notify customer - no user account for appointment: ${appointment.id}")
            return
        }

        User customer = appointment.user
        String employeeName = appointment.employee?.getFullName() ?: "Your provider"
        String serviceName = appointment.service?.name ?: "Unknown Service"
        String appointmentTime = appointment.getFormattedDateTime()
        String shopName = appointment.shop?.name ?: "the shop"

        String title = "Appointment Updated"
        String message = "${employeeName} at ${shopName} updated your ${serviceName} appointment for ${appointmentTime}"
        String actionUrl = "/appointments?highlight=${appointment.id}"

        Map<String, Object> notificationData = [
            appointmentId: appointment.id.toString(),
            employeeId: appointment.employee?.user?.id?.toString(),
            employeeName: employeeName,
            serviceName: serviceName,
            appointmentDateTime: appointment.appointmentDateTime.toString(),
            shopId: appointment.shop?.id?.toString(),
            shopName: shopName,
            type: 'appointment_updated_by_employee'
        ]

        notificationService.createNotification(
            customer.id,
            title,
            message,
            NotificationType.APPOINTMENT_EDITED_BY_EMPLOYEE,
            actionUrl,
            notificationData
        )

        log.info("Notified customer ${customer.id} of appointment update ${appointment.id}")
    }

    /**
     * Notifies customer when appointment is cancelled by employee
     */
    void notifyCustomerOfAppointmentCancellation(Appointment appointment) {
        if (!appointment.user) {
            log.info("Cannot notify customer - no user account for appointment: ${appointment.id}")
            return
        }

        User customer = appointment.user
        String employeeName = appointment.employee?.getFullName() ?: "Your provider"
        String serviceName = appointment.service?.name ?: "Unknown Service"
        String appointmentTime = appointment.getFormattedDateTime()
        String shopName = appointment.shop?.name ?: "the shop"

        String title = "Appointment Cancelled"
        String message = "${employeeName} at ${shopName} cancelled your ${serviceName} appointment for ${appointmentTime}"
        String actionUrl = "/appointments?highlight=${appointment.id}"

        Map<String, Object> notificationData = [
            appointmentId: appointment.id.toString(),
            employeeId: appointment.employee?.user?.id?.toString(),
            employeeName: employeeName,
            serviceName: serviceName,
            appointmentDateTime: appointment.appointmentDateTime.toString(),
            shopId: appointment.shop?.id?.toString(),
            shopName: shopName,
            type: 'appointment_cancelled_by_employee'
        ]

        notificationService.createNotification(
            customer.id,
            title,
            message,
            NotificationType.APPOINTMENT_CANCELLED_BY_EMPLOYEE,
            actionUrl,
            notificationData
        )

        log.info("Notified customer ${customer.id} of appointment cancellation ${appointment.id}")
    }

    /**
     * Send appointment reminder to customer
     */
    void sendAppointmentReminder(Appointment appointment, String customMessage = null) {
        if (!appointment.user) {
            log.warn("Cannot send reminder notification to guest appointment: ${appointment.id}")
            return
        }

        User customer = appointment.user
        String employeeName = appointment.employee?.getFullName() ?: "Your provider"
        String serviceName = appointment.service?.name ?: "Unknown Service"

        // Safe formatting of appointment time
        String appointmentTime
        try {
            appointmentTime = appointment.getFormattedDateTime()
        } catch (Exception e) {
            log.warn("Failed to format appointment date time for ${appointment.id}: ${e.message}")
            appointmentTime = appointment.appointmentDateTime?.toString() ?: "Unknown time"
        }

        String shopName = appointment.shop?.name ?: "the shop"

        String title = "Appointment Reminder"
        String message = customMessage ?:
            "Reminder: You have a ${serviceName} appointment with ${employeeName} at ${shopName} on ${appointmentTime}"
        String actionUrl = "/appointments?highlight=${appointment.id}"

        Map<String, Object> notificationData = [
            appointmentId: appointment.id.toString(),
            employeeId: appointment.employee?.id?.toString(),
            employeeName: employeeName,
            serviceName: serviceName,
            appointmentDateTime: appointment.appointmentDateTime.toString(),
            shopId: appointment.shop?.id?.toString(),
            shopName: shopName,
            type: 'appointment_reminder',
            customMessage: customMessage
        ]

        notificationService.createNotification(
            customer.id,
            title,
            message,
            NotificationType.APPOINTMENT_REMINDER,
            actionUrl,
            notificationData
        )

        // Send email reminder
        sendAppointmentReminderEmailNotification(appointment, customMessage)

        log.info("Sent appointment reminder to customer ${customer.id} for appointment ${appointment.id}")
    }

    /**
     * Send appointment confirmation email directly (entities already initialized)
     */
    private void sendAppointmentConfirmationEmail(Appointment appointment) {
        try {
            log.info("Sending appointment confirmation email directly for appointment: ${appointment.id}")
            emailService.sendAppointmentConfirmationEmail(appointment)
        } catch (Exception e) {
            log.error("Failed to send appointment confirmation email for appointment: ${appointment.id}", e)
        }
    }

    /**
     * Send appointment update email directly (entities already initialized)
     */
    private void sendAppointmentUpdateEmail(Appointment appointment, String updateMessage = null) {
        try {
            log.info("Sending appointment update email directly for appointment: ${appointment.id}")
            emailService.sendAppointmentUpdateEmail(appointment, updateMessage)
        } catch (Exception e) {
            log.error("Failed to send appointment update email for appointment: ${appointment.id}", e)
        }
    }

    /**
     * Send appointment cancellation email directly (entities already initialized)
     */
    private void sendAppointmentCancellationEmail(Appointment appointment, String cancellationReason = null) {
        try {
            log.info("Sending appointment cancellation email directly for appointment: ${appointment.id}")
            emailService.sendAppointmentCancellationEmail(appointment, cancellationReason)
        } catch (Exception e) {
            log.error("Failed to send appointment cancellation email for appointment: ${appointment.id}", e)
        }
    }

    /**
     * Send appointment reminder email directly (entities already initialized)
     */
    private void sendAppointmentReminderEmailNotification(Appointment appointment, String customMessage = null) {
        try {
            log.info("Sending appointment reminder email directly for appointment: ${appointment.id}")
            emailService.sendAppointmentReminderEmail(appointment, customMessage)
        } catch (Exception e) {
            log.error("Failed to send appointment reminder email for appointment: ${appointment.id}", e)
        }
    }

    /**
     * Send review notification after appointment completion
     */
    void sendReviewNotification(Appointment appointment) {
        if (!appointment.user) {
            log.warn("Cannot send review notification to guest appointment: ${appointment.id}")
            return
        }

        User customer = appointment.user
        String serviceName = appointment.service?.name ?: "Unknown Service"
        String shopName = appointment.shop?.name ?: "the shop"

        String title = "Leave a Review"
        String message = "How was your ${serviceName} appointment at ${shopName}? Leave a review to help others!"
        String actionUrl = "/appointments/${appointment.id}/review"

        Map<String, Object> notificationData = [
            appointmentId: appointment.id.toString(),
            serviceName: serviceName,
            shopId: appointment.shop?.id?.toString(),
            shopName: shopName,
            type: 'review_request'
        ]

        notificationService.createNotification(
            customer.id,
            title,
            message,
            NotificationType.REVIEW_REQUEST,
            actionUrl,
            notificationData
        )

        // Send email notification for review request
        sendReviewRequestEmail(appointment)

        log.info("Sent review notification to customer ${customer.id} for appointment ${appointment.id}")
    }

    /**
     * Notifies customer when appointment refund is processed
     */
    void notifyCustomerOfRefund(Appointment appointment) {
        if (!appointment.user) {
            log.info("Cannot notify customer of refund - no user account for appointment: ${appointment.id}")
            return
        }

        User customer = appointment.user
        String serviceName = appointment.service?.name ?: "Unknown Service"
        String appointmentTime = appointment.getFormattedDateTime()
        String refundAmount = appointment.refundAmount ?
            formatCurrencyAmount(appointment.refundAmount, appointment.shop?.country) :
            "your payment"

        String title = "Refund Processed"
        String message = "A refund of ${refundAmount} has been processed for your cancelled ${serviceName} appointment on ${appointmentTime}"
        String actionUrl = "/appointments?highlight=${appointment.id}"

        Map<String, Object> notificationData = [
            appointmentId: appointment.id.toString(),
            serviceName: serviceName,
            appointmentDateTime: appointment.appointmentDateTime.toString(),
            refundAmount: appointment.refundAmount?.toString(),
            refundId: appointment.refundId,
            shopId: appointment.shop?.id?.toString(),
            type: 'appointment_refunded'
        ]

        notificationService.createNotification(
            customer.id,
            title,
            message,
            NotificationType.APPOINTMENT_REFUNDED,
            actionUrl,
            notificationData
        )

        log.info("Notified customer ${customer.id} of refund for appointment ${appointment.id}")
    }

    /**
     * Send no-show notification to shop owner and employee
     */
    void sendNoShowNotification(Appointment appointment) {
        String customerName = getCustomerDisplayName(appointment)
        String serviceName = appointment.service?.name ?: "Unknown Service"
        String appointmentTime = appointment.getFormattedDateTime()

        String title = "Customer No-Show"
        String message = "${customerName} did not show up for their ${serviceName} appointment at ${appointmentTime}"
        String actionUrl = "/appointment/${appointment.id}"

        Map<String, Object> notificationData = [
            appointmentId: appointment.id.toString(),
            customerName: customerName,
            serviceName: serviceName,
            appointmentDateTime: appointment.appointmentDateTime.toString(),
            type: 'appointment_no_show'
        ]

        // Notify shop owner
        if (appointment.shop?.owner) {
            notificationService.createNotification(
                appointment.shop.owner.id,
                title,
                message,
                NotificationType.APPOINTMENT_NO_SHOW,
                actionUrl,
                notificationData
            )
        }

        // Notify assigned employee
        if (appointment.employee?.user) {
            notificationService.createNotification(
                appointment.employee.user.id,
                title,
                message,
                NotificationType.APPOINTMENT_NO_SHOW,
                actionUrl,
                notificationData
            )
        }

        log.info("Sent no-show notifications for appointment ${appointment.id}")
    }

    /**
     * Gets display name for customer (handles both registered users and guests)
     */
    private String getCustomerDisplayName(Appointment appointment) {
        if (appointment.user) {
            return appointment.user.getFullName()
        } else if (appointment.guestFirstName && appointment.guestLastName) {
            return "${appointment.guestFirstName} ${appointment.guestLastName}".trim()
        } else {
            return "A customer"
        }
    }

    /**
     * Format currency amount with proper symbol based on country
     */
    private String formatCurrencyAmount(BigDecimal amount, String country) {
        if (!amount) return ''

        String currency = getCurrencyForCountry(country ?: 'US')
        String symbol = getCurrencySymbol(currency)

        // Special formatting for certain currencies
        switch (currency.toUpperCase()) {
            case 'JPY':
            case 'KRW':
            case 'VND':
                // No decimal places for these currencies
                return "${symbol}${amount.intValue()}"
            default:
                return "${symbol}${amount.setScale(2, BigDecimal.ROUND_HALF_UP)}"
        }
    }

    /**
     * Get currency code for country
     */
    private String getCurrencyForCountry(String country) {
        Map<String, String> currencyMap = [
            'US': 'USD', 'CA': 'CAD', 'GB': 'GBP', 'DE': 'EUR', 'FR': 'EUR',
            'IT': 'EUR', 'ES': 'EUR', 'NL': 'EUR', 'BE': 'EUR', 'AT': 'EUR',
            'PT': 'EUR', 'IE': 'EUR', 'FI': 'EUR', 'GR': 'EUR', 'LU': 'EUR',
            'SI': 'EUR', 'SK': 'EUR', 'EE': 'EUR', 'LV': 'EUR', 'LT': 'EUR',
            'MT': 'EUR', 'CY': 'EUR', 'BG': 'BGN', 'RO': 'RON', 'HR': 'HRK',
            'CZ': 'CZK', 'HU': 'HUF', 'PL': 'PLN', 'SE': 'SEK', 'DK': 'DKK',
            'NO': 'NOK', 'CH': 'CHF', 'JP': 'JPY', 'AU': 'AUD', 'NZ': 'NZD',
            'CN': 'CNY', 'IN': 'INR', 'KR': 'KRW', 'SG': 'SGD', 'HK': 'HKD',
            'MY': 'MYR', 'TH': 'THB', 'PH': 'PHP', 'ID': 'IDR', 'VN': 'VND',
            'BR': 'BRL', 'MX': 'MXN', 'AR': 'ARS', 'CL': 'CLP', 'CO': 'COP',
            'PE': 'PEN', 'ZA': 'ZAR', 'EG': 'EGP', 'IL': 'ILS', 'SA': 'SAR',
            'AE': 'AED', 'KW': 'KWD', 'QA': 'QAR'
        ]
        return currencyMap[country?.toUpperCase()] ?: 'USD'
    }

    /**
     * Get currency symbol for display
     */
    private String getCurrencySymbol(String currency) {
        Map<String, String> symbolMap = [
            'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥',
            'CAD': 'C$', 'AUD': 'A$', 'CHF': 'CHF', 'CNY': '¥',
            'SEK': 'kr', 'NOK': 'kr', 'DKK': 'kr', 'PLN': 'zł',
            'CZK': 'Kč', 'HUF': 'Ft', 'RON': 'lei', 'BGN': 'лв',
            'HRK': 'kn', 'RSD': 'дин', 'TRY': '₺', 'RUB': '₽',
            'UAH': '₴', 'INR': '₹', 'KRW': '₩', 'SGD': 'S$',
            'HKD': 'HK$', 'MYR': 'RM', 'THB': '฿', 'PHP': '₱',
            'IDR': 'Rp', 'VND': '₫', 'BRL': 'R$', 'MXN': '$',
            'ARS': '$', 'CLP': '$', 'COP': '$', 'PEN': 'S/',
            'ZAR': 'R', 'EGP': '£', 'ILS': '₪', 'SAR': '﷼',
            'AED': 'د.إ', 'KWD': 'د.ك', 'QAR': '﷼', 'NZD': 'NZ$'
        ]
        return symbolMap[currency?.toUpperCase()] ?: currency
    }

    /**
     * Send review request email to customer
     */
    private void sendReviewRequestEmail(Appointment appointment) {
        if (!appointment.user) {
            log.warn("Cannot send review request email to guest appointment: ${appointment.id}")
            return
        }

        try {
            String customerEmail = appointment.user.email
            String customerName = appointment.user.firstName
            String serviceName = appointment.service?.name ?: "Unknown Service"
            String shopName = appointment.shop?.name ?: "the shop"
            String employeeName = appointment.employee?.getFullName() ?: "your provider"
            String appointmentTime = appointment.getFormattedDateTime()

            Map<String, Object> emailData = [
                emailType: 'review_request',
                appointmentId: appointment.id.toString(),
                customerEmail: customerEmail,
                customerName: customerName,
                serviceName: serviceName,
                shopName: shopName,
                employeeName: employeeName,
                appointmentTime: appointmentTime,
                reviewUrl: "${baseUrl}/appointments/${appointment.id}/review"
            ]

            // Send via RabbitMQ for reliable delivery
            rabbitMQMessageService.publishEmailNotification(emailData)

            log.info("Queued review request email for appointment ${appointment.id} to ${customerEmail}")
        } catch (Exception e) {
            log.error("Failed to send review request email for appointment ${appointment.id}", e)
        }
    }

    /**
     * Send review request email to guest users
     */
    void sendGuestReviewEmail(Appointment appointment) {
        if (!appointment.guestEmail) {
            log.warn("Cannot send guest review email for appointment ${appointment.id} - no guest email")
            return
        }

        try {
            String guestEmail = appointment.guestEmail
            String guestName = appointment.guestFirstName ?: "Guest"
            String serviceName = appointment.service?.name ?: "Unknown Service"
            String shopName = appointment.shop?.name ?: "the shop"
            String employeeName = appointment.employee?.getFullName() ?: "your provider"
            String appointmentTime = appointment.getFormattedDateTime()

            Map<String, Object> emailData = [
                emailType: 'guest_review_request',
                appointmentId: appointment.id.toString(),
                guestEmail: guestEmail,
                guestName: guestName,
                guestFirstName: appointment.guestFirstName,
                guestLastName: appointment.guestLastName,
                serviceName: serviceName,
                shopName: shopName,
                employeeName: employeeName,
                appointmentTime: appointmentTime,
                guestReviewUrl: "${baseUrl}/guest-review/${appointment.id}?email=${URLEncoder.encode(guestEmail, 'UTF-8')}",
                accountCreationUrl: "${baseUrl}/register?email=${URLEncoder.encode(guestEmail, 'UTF-8')}&firstName=${URLEncoder.encode(appointment.guestFirstName ?: '', 'UTF-8')}&lastName=${URLEncoder.encode(appointment.guestLastName ?: '', 'UTF-8')}"
            ]

            // Send via RabbitMQ for reliable delivery
            rabbitMQMessageService.publishEmailNotification(emailData)

            log.info("Queued guest review request email for appointment ${appointment.id} to ${guestEmail}")
        } catch (Exception e) {
            log.error("Failed to send guest review request email for appointment ${appointment.id}", e)
        }
    }

    /**
     * Generate role-specific action URL for appointment notifications
     */
    private String generateAppointmentActionUrl(User user, UUID appointmentId) {
        if (!user) {
            return "/appointment/${appointmentId}"
        }

        // Check if user is a shop owner
        boolean isOwner = user.role?.toString() == 'OWNER'

        // Check if user is an employee (could be owner acting as employee)
        boolean isEmployee = user.role?.toString() == 'EMPLOYEE' ||
                           (isOwner && employeeService.hasEmployeeProfile(user.id))

        if (isOwner) {
            // Owner should go to owner dashboard with appointment highlight
            return "/owner/dashboard?highlight=${appointmentId}"
        } else if (isEmployee) {
            // Employee should go to employee dashboard with appointment highlight
            return "/employee/dashboard?highlight=${appointmentId}"
        } else {
            // Regular user should go to general appointment details
            return "/appointment/${appointmentId}"
        }
    }

    /**
     * Notifies relevant parties when appointment starts (IN_PROGRESS status)
     */
    void notifyAppointmentStarted(Appointment appointment) {
        String customerName = getCustomerDisplayName(appointment)
        String serviceName = appointment.service?.name ?: "Unknown Service"
        String appointmentTime = appointment.getFormattedDateTime()
        String shopName = appointment.shop?.name ?: "the shop"

        // Notify customer (if authenticated)
        if (appointment.user) {
            String title = "Appointment Started"
            String message = "Your ${serviceName} appointment at ${shopName} has started"
            String actionUrl = "/appointments?highlight=${appointment.id}"

            Map<String, Object> notificationData = [
                appointmentId: appointment.id.toString(),
                serviceName: serviceName,
                appointmentDateTime: appointment.appointmentDateTime.toString(),
                shopId: appointment.shop?.id?.toString(),
                shopName: shopName,
                type: 'appointment_started'
            ]

            notificationService.createNotification(
                appointment.user.id,
                title,
                message,
                NotificationType.APPOINTMENT_CONFIRMED,
                actionUrl,
                notificationData
            )
        }

        // Notify shop owner (if different from employee)
        if (appointment.shop?.owner && !appointment.shop.owner.id.equals(appointment.employee?.user?.id)) {
            String title = "Appointment Started"
            String message = "${customerName}'s ${serviceName} appointment has started"
            String actionUrl = generateAppointmentActionUrl(appointment.shop.owner, appointment.id)

            Map<String, Object> notificationData = [
                appointmentId: appointment.id.toString(),
                customerName: customerName,
                serviceName: serviceName,
                appointmentDateTime: appointment.appointmentDateTime.toString(),
                shopId: appointment.shop?.id?.toString(),
                type: 'appointment_started'
            ]

            notificationService.createNotification(
                appointment.shop.owner.id,
                title,
                message,
                NotificationType.APPOINTMENT_CONFIRMED,
                actionUrl,
                notificationData
            )
        }

        log.info("Sent appointment started notifications for appointment ${appointment.id}")
    }

    /**
     * Notifies relevant parties about general status changes
     */
    void notifyStatusChanged(Appointment appointment, AppointmentStatus oldStatus, AppointmentStatus newStatus, User changedBy) {
        String customerName = getCustomerDisplayName(appointment)
        String serviceName = appointment.service?.name ?: "Unknown Service"
        String appointmentTime = appointment.getFormattedDateTime()
        String shopName = appointment.shop?.name ?: "the shop"
        String statusDisplayName = getStatusDisplayName(newStatus)

        // Determine who changed the status and notify the other parties
        boolean changedByCustomer = appointment.user && appointment.user.id.equals(changedBy.id)
        boolean changedByEmployee = appointment.employee?.user?.id?.equals(changedBy.id)
        boolean changedByOwner = appointment.shop?.owner?.id?.equals(changedBy.id)
        boolean changedBySystem = systemUserService.isSystemUser(changedBy)

        // Notify customer (if authenticated and status wasn't changed by customer)
        if (appointment.user && !changedByCustomer) {
            String title = changedBySystem ? "Appointment Started" : "Appointment Status Updated"
            String message = changedBySystem ?
                "Your ${serviceName} appointment at ${shopName} has automatically started" :
                "Your ${serviceName} appointment at ${shopName} is now ${statusDisplayName}"
            String actionUrl = "/appointments?highlight=${appointment.id}"

            Map<String, Object> notificationData = [
                appointmentId: appointment.id.toString(),
                oldStatus: oldStatus.toString(),
                newStatus: newStatus.toString(),
                serviceName: serviceName,
                appointmentDateTime: appointment.appointmentDateTime.toString(),
                shopId: appointment.shop?.id?.toString(),
                shopName: shopName,
                type: 'appointment_status_changed'
            ]

            notificationService.createNotification(
                appointment.user.id,
                title,
                message,
                NotificationType.APPOINTMENT_EDITED,
                actionUrl,
                notificationData
            )
        }

        // Notify employee (if status wasn't changed by employee)
        if (appointment.employee?.user && !changedByEmployee) {
            String title = changedBySystem ? "Appointment Started" : "Appointment Status Updated"
            String message = changedBySystem ?
                "${customerName}'s ${serviceName} appointment has automatically started" :
                "${customerName}'s ${serviceName} appointment is now ${statusDisplayName}"
            String actionUrl = generateAppointmentActionUrl(appointment.employee.user, appointment.id)

            Map<String, Object> notificationData = [
                appointmentId: appointment.id.toString(),
                oldStatus: oldStatus.toString(),
                newStatus: newStatus.toString(),
                customerName: customerName,
                serviceName: serviceName,
                appointmentDateTime: appointment.appointmentDateTime.toString(),
                shopId: appointment.shop?.id?.toString(),
                type: 'appointment_status_changed'
            ]

            notificationService.createNotification(
                appointment.employee.user.id,
                title,
                message,
                NotificationType.APPOINTMENT_EDITED,
                actionUrl,
                notificationData
            )
        }

        // Notify shop owner (if different from employee and status wasn't changed by owner)
        if (appointment.shop?.owner &&
            !appointment.shop.owner.id.equals(appointment.employee?.user?.id) &&
            !changedByOwner) {

            String title = changedBySystem ? "Appointment Started" : "Appointment Status Updated"
            String message = changedBySystem ?
                "${customerName}'s ${serviceName} appointment has automatically started" :
                "${customerName}'s ${serviceName} appointment is now ${statusDisplayName}"
            String actionUrl = generateAppointmentActionUrl(appointment.shop.owner, appointment.id)

            Map<String, Object> notificationData = [
                appointmentId: appointment.id.toString(),
                oldStatus: oldStatus.toString(),
                newStatus: newStatus.toString(),
                customerName: customerName,
                serviceName: serviceName,
                appointmentDateTime: appointment.appointmentDateTime.toString(),
                shopId: appointment.shop?.id?.toString(),
                type: 'appointment_status_changed'
            ]

            notificationService.createNotification(
                appointment.shop.owner.id,
                title,
                message,
                NotificationType.APPOINTMENT_EDITED,
                actionUrl,
                notificationData
            )
        }

        log.info("Sent status change notifications for appointment ${appointment.id} from ${oldStatus} to ${newStatus}")
    }

    /**
     * Get display name for appointment status
     */
    private String getStatusDisplayName(AppointmentStatus status) {
        switch (status) {
            case AppointmentStatus.PENDING:
                return "pending"
            case AppointmentStatus.CONFIRMED:
                return "confirmed"
            case AppointmentStatus.IN_PROGRESS:
                return "in progress"
            case AppointmentStatus.COMPLETED:
                return "completed"
            case AppointmentStatus.CANCELLED:
                return "cancelled"
            case AppointmentStatus.NO_SHOW:
                return "marked as no-show"
            default:
                return status.toString().toLowerCase()
        }
    }
}
