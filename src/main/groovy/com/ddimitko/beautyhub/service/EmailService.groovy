package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.entity.Appointment
import com.ddimitko.beautyhub.entity.EmployeeInvitation
import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.event.UserRegistrationEvent
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.event.EventListener
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.mail.javamail.MimeMessageHelper
import org.springframework.stereotype.Service
import org.springframework.scheduling.annotation.Async
import org.springframework.transaction.event.TransactionalEventListener
import org.springframework.transaction.event.TransactionPhase

import jakarta.mail.internet.MimeMessage
import java.time.format.DateTimeFormatter

@Service
@Slf4j
class EmailService {

    @Autowired
    private JavaMailSender mailSender

    @Autowired
    private EmailTemplateService emailTemplateService

    @Value('${app.email.from}')
    private String fromEmail

    @Value('${app.email.from-name}')
    private String fromName

    @Value('${app.email.base-url}')
    private String baseUrl

    /**
     * Send welcome email to new user
     */
    @Async("emailTaskExecutor")
    void sendWelcomeEmail(User user) {
        try {
            log.info("Sending welcome email to: ${user.email}")
            
            Map<String, Object> templateData = [
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                baseUrl: baseUrl,
                loginUrl: "${baseUrl}/login"
            ]

            String htmlContent = emailTemplateService.generateWelcomeEmail(templateData)
            String subject = "Welcome to Lunara!"

            sendHtmlEmail(user.email, subject, htmlContent)
            log.info("Welcome email sent successfully to: ${user.email}")
        } catch (Exception e) {
            log.error("Failed to send welcome email to: ${user.email}", e)
        }
    }

    /**
     * Handle user registration event and send welcome email after transaction commit
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async("emailTaskExecutor")
    void handleUserRegistration(UserRegistrationEvent event) {
        try {
            log.info("Handling user registration event for: ${event.user.email}")
            sendWelcomeEmail(event.user)
        } catch (Exception e) {
            log.error("Failed to handle user registration event for: ${event.user.email}", e)
        }
    }

    /**
     * Send password reset email
     */
    @Async("emailTaskExecutor")
    void sendPasswordResetEmail(User user, String resetToken) {
        try {
            log.info("Sending password reset email to: ${user.email}")
            
            Map<String, Object> templateData = [
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                resetToken: resetToken,
                resetUrl: "${baseUrl}/reset-password?token=${resetToken}",
                baseUrl: baseUrl
            ]

            String htmlContent = emailTemplateService.generatePasswordResetEmail(templateData)
            String subject = "Reset Your Lunara Password"

            sendHtmlEmail(user.email, subject, htmlContent)
            log.info("Password reset email sent successfully to: ${user.email}")
        } catch (Exception e) {
            log.error("Failed to send password reset email to: ${user.email}", e)
        }
    }

    /**
     * Send appointment confirmation email
     */
    @Async("emailTaskExecutor")
    void sendAppointmentConfirmationEmail(Appointment appointment) {
        try {
            String recipientEmail = getAppointmentRecipientEmail(appointment)
            if (!recipientEmail) {
                log.warn("Cannot send appointment confirmation email - no recipient email for appointment: ${appointment.id}")
                return
            }

            log.info("Sending appointment confirmation email to: ${recipientEmail}")
            
            Map<String, Object> templateData = buildAppointmentTemplateData(appointment)
            templateData.put('confirmationMessage', 'Your appointment has been confirmed!')

            String htmlContent = emailTemplateService.generateAppointmentConfirmationEmail(templateData)
            String subject = "Appointment Confirmed - ${appointment.service?.name}"

            sendHtmlEmail(recipientEmail, subject, htmlContent)
            log.info("Appointment confirmation email sent successfully to: ${recipientEmail}")
        } catch (Exception e) {
            log.error("Failed to send appointment confirmation email for appointment: ${appointment.id}", e)
        }
    }

    /**
     * Send appointment update email
     */
    @Async("emailTaskExecutor")
    void sendAppointmentUpdateEmail(Appointment appointment, String updateMessage = null) {
        try {
            String recipientEmail = getAppointmentRecipientEmail(appointment)
            if (!recipientEmail) {
                log.warn("Cannot send appointment update email - no recipient email for appointment: ${appointment.id}")
                return
            }

            log.info("Sending appointment update email to: ${recipientEmail}")
            
            Map<String, Object> templateData = buildAppointmentTemplateData(appointment)
            templateData.put('updateMessage', updateMessage ?: 'Your appointment has been updated.')

            String htmlContent = emailTemplateService.generateAppointmentUpdateEmail(templateData)
            String subject = "Appointment Updated - ${appointment.service?.name}"

            sendHtmlEmail(recipientEmail, subject, htmlContent)
            log.info("Appointment update email sent successfully to: ${recipientEmail}")
        } catch (Exception e) {
            log.error("Failed to send appointment update email for appointment: ${appointment.id}", e)
        }
    }

    /**
     * Send appointment cancellation email
     */
    @Async("emailTaskExecutor")
    void sendAppointmentCancellationEmail(Appointment appointment, String cancellationReason = null) {
        try {
            String recipientEmail = getAppointmentRecipientEmail(appointment)
            if (!recipientEmail) {
                log.warn("Cannot send appointment cancellation email - no recipient email for appointment: ${appointment.id}")
                return
            }

            log.info("Sending appointment cancellation email to: ${recipientEmail}")
            
            Map<String, Object> templateData = buildAppointmentTemplateData(appointment)
            templateData.put('cancellationReason', cancellationReason ?: 'No reason provided')

            String htmlContent = emailTemplateService.generateAppointmentCancellationEmail(templateData)
            String subject = "Appointment Cancelled - ${appointment.service?.name}"

            sendHtmlEmail(recipientEmail, subject, htmlContent)
            log.info("Appointment cancellation email sent successfully to: ${recipientEmail}")
        } catch (Exception e) {
            log.error("Failed to send appointment cancellation email for appointment: ${appointment.id}", e)
        }
    }

    /**
     * Send appointment reminder email
     */
    @Async("emailTaskExecutor")
    void sendAppointmentReminderEmail(Appointment appointment, String customMessage = null) {
        try {
            String recipientEmail = getAppointmentRecipientEmail(appointment)
            if (!recipientEmail) {
                log.warn("Cannot send appointment reminder email - no recipient email for appointment: ${appointment.id}")
                return
            }

            log.info("Sending appointment reminder email to: ${recipientEmail}")
            
            Map<String, Object> templateData = buildAppointmentTemplateData(appointment)
            templateData.put('reminderMessage', customMessage ?: 'This is a reminder about your upcoming appointment.')

            String htmlContent = emailTemplateService.generateAppointmentReminderEmail(templateData)
            String subject = "Appointment Reminder - ${appointment.service?.name}"

            sendHtmlEmail(recipientEmail, subject, htmlContent)
            log.info("Appointment reminder email sent successfully to: ${recipientEmail}")
        } catch (Exception e) {
            log.error("Failed to send appointment reminder email for appointment: ${appointment.id}", e)
        }
    }

    /**
     * Send employee invitation email to new users
     */
    @Async("emailTaskExecutor")
    void sendEmployeeInvitationEmail(EmployeeInvitation invitation) {
        try {
            log.info("Sending employee invitation email to: ${invitation.email}")

            Map<String, Object> templateData = [
                email: invitation.email,
                shopName: invitation.shop.name,
                shopOwnerName: "${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}",
                invitationToken: invitation.token,
                acceptUrl: "${baseUrl}/employee-invitation/accept/${invitation.token}",
                expiresAt: invitation.expiresAt,
                baseUrl: baseUrl
            ]

            String htmlContent = emailTemplateService.generateEmployeeInvitationEmail(templateData)
            String subject = "You're Invited to Join ${invitation.shop.name} on Lunara"

            sendHtmlEmail(invitation.email, subject, htmlContent)
            log.info("Employee invitation email sent successfully to: ${invitation.email}")
        } catch (Exception e) {
            log.error("Failed to send employee invitation email to: ${invitation.email}", e)
        }
    }

    /**
     * Send notification email to existing users who were added as employees
     */
    @Async("emailTaskExecutor")
    void sendEmployeeInvitationNotificationEmail(User user, Shop shop) {
        try {
            log.info("Sending employee notification email to: ${user.email}")

            Map<String, Object> templateData = [
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                shopName: shop.name,
                shopOwnerName: "${shop.owner.firstName} ${shop.owner.lastName}",
                dashboardUrl: "${baseUrl}/dashboard",
                baseUrl: baseUrl
            ]

            String htmlContent = emailTemplateService.generateEmployeeNotificationEmail(templateData)
            String subject = "Welcome to the ${shop.name} Team on Lunara"

            sendHtmlEmail(user.email, subject, htmlContent)
            log.info("Employee notification email sent successfully to: ${user.email}")
        } catch (Exception e) {
            log.error("Failed to send employee notification email to: ${user.email}", e)
        }
    }

    /**
     * Send review request email
     */
    @Async("emailTaskExecutor")
    void sendReviewRequestEmail(Map<String, Object> emailData) {
        try {
            String customerEmail = emailData.customerEmail
            String customerName = emailData.customerName

            log.info("Sending review request email to: ${customerEmail}")

            Map<String, Object> templateData = [
                customerName: customerName,
                serviceName: emailData.serviceName,
                shopName: emailData.shopName,
                employeeName: emailData.employeeName,
                appointmentTime: emailData.appointmentTime,
                reviewUrl: emailData.reviewUrl,
                baseUrl: baseUrl
            ]

            String htmlContent = emailTemplateService.generateReviewRequestEmail(templateData)
            String subject = "How was your appointment at ${emailData.shopName}?"

            sendHtmlEmail(customerEmail, subject, htmlContent)
            log.info("Review request email sent successfully to: ${customerEmail}")
        } catch (Exception e) {
            log.error("Failed to send review request email to: ${emailData.customerEmail}", e)
        }
    }

    /**
     * Send guest review request email
     */
    @Async("emailTaskExecutor")
    void sendGuestReviewRequestEmail(Map<String, Object> emailData) {
        try {
            String guestEmail = emailData.guestEmail
            String guestName = emailData.guestName

            log.info("Sending guest review request email to: ${guestEmail}")

            Map<String, Object> templateData = [
                guestName: guestName,
                guestFirstName: emailData.guestFirstName,
                guestLastName: emailData.guestLastName,
                serviceName: emailData.serviceName,
                shopName: emailData.shopName,
                employeeName: emailData.employeeName,
                appointmentTime: emailData.appointmentTime,
                guestReviewUrl: emailData.guestReviewUrl,
                accountCreationUrl: emailData.accountCreationUrl,
                baseUrl: baseUrl
            ]

            String htmlContent = emailTemplateService.generateGuestReviewRequestEmail(templateData)
            String subject = "How was your appointment at ${emailData.shopName}? Leave a review!"

            sendHtmlEmail(guestEmail, subject, htmlContent)
            log.info("Guest review request email sent successfully to: ${guestEmail}")
        } catch (Exception e) {
            log.error("Failed to send guest review request email to: ${emailData.guestEmail}", e)
        }
    }

    /**
     * Send a simple test email
     */
    @Async("emailTaskExecutor")
    void sendTestEmail(String toEmail) {
        try {
            log.info("Sending test email to: ${toEmail}")

            String subject = "BeautyHub Email Test"
            String htmlContent = """
                <html>
                <body style="font-family: Arial, sans-serif;">
                    <h2>Email System Test</h2>
                    <p>This is a test email from BeautyHub to verify the email system is working correctly.</p>
                    <p><strong>Timestamp:</strong> ${new Date()}</p>
                    <p><strong>From:</strong> ${fromEmail}</p>
                    <p><strong>Base URL:</strong> ${baseUrl}</p>
                    <p>If you received this email, your email configuration is working perfectly! 🎉</p>
                </body>
                </html>
            """

            sendHtmlEmail(toEmail, subject, htmlContent)
            log.info("Test email sent successfully to: ${toEmail}")
        } catch (Exception e) {
            log.error("Failed to send test email to: ${toEmail}", e)
            throw e
        }
    }

    /**
     * Check if email is properly configured
     */
    private boolean isEmailConfigured() {
        try {
            // Check if mail sender is properly configured
            String username = mailSender.getUsername()
            String password = mailSender.getPassword()

            return username && !username.isEmpty() && password && !password.isEmpty()
        } catch (Exception e) {
            log.warn("Email configuration check failed: ${e.getMessage()}")
            return false
        }
    }

    /**
     * Send HTML email
     */
    private void sendHtmlEmail(String to, String subject, String htmlContent) {
        if (!isEmailConfigured()) {
            log.warn("Email not configured properly. Skipping email to: ${to} with subject: ${subject}")
            return
        }

        MimeMessage message = mailSender.createMimeMessage()
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8")

        helper.setFrom(fromEmail, fromName)
        helper.setTo(to)
        helper.setSubject(subject)
        helper.setText(htmlContent, true)

        mailSender.send(message)
    }

    /**
     * Get recipient email for appointment notifications
     */
    private String getAppointmentRecipientEmail(Appointment appointment) {
        if (appointment.user?.email) {
            return appointment.user.email
        }
        if (appointment.guestEmail) {
            return appointment.guestEmail
        }
        return null
    }

    /**
     * Build template data for appointment emails
     */
    private Map<String, Object> buildAppointmentTemplateData(Appointment appointment) {
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy")
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("h:mm a")

        String customerName = appointment.user ?
            "${appointment.user.firstName} ${appointment.user.lastName}".trim() :
            (appointment.guestFirstName && appointment.guestLastName ?
                "${appointment.guestFirstName} ${appointment.guestLastName}".trim() : "Guest")

        // Get currency information based on shop's country
        String currency = getCurrencyForCountry(appointment.shop?.country)
        String currencySymbol = getCurrencySymbol(currency)
        String formattedAmount = formatCurrencyAmount(appointment.totalAmount, currency, currencySymbol)

        return [
            customerName: customerName,
            customerEmail: getAppointmentRecipientEmail(appointment),
            serviceName: appointment.service?.name ?: "Unknown Service",
            employeeName: appointment.employee?.getFullName() ?: "Staff Member",
            shopName: appointment.shop?.name ?: "Beauty Shop",
            shopAddress: appointment.shop?.address ?: "",
            appointmentDate: appointment.appointmentDateTime?.format(dateFormatter) ?: "",
            appointmentTime: appointment.appointmentDateTime?.format(timeFormatter) ?: "",
            appointmentDateTime: appointment.appointmentDateTime,
            totalAmount: appointment.totalAmount,
            formattedAmount: formattedAmount,
            currency: currency,
            currencySymbol: currencySymbol,
            depositAmount: appointment.depositAmount,
            notes: appointment.notes ?: "",
            appointmentId: appointment.id.toString(),
            baseUrl: baseUrl,
            appointmentUrl: "${baseUrl}/appointments?highlight=${appointment.id}"
        ]
    }

    /**
     * Get currency code based on country
     */
    private String getCurrencyForCountry(String country) {
        if (!country) return 'USD'

        Map<String, String> currencyMap = [
            // Country codes (ISO 3166-1 alpha-2)
            'BG': 'BGN', 'US': 'USD', 'CA': 'CAD', 'GB': 'GBP',
            'DE': 'EUR', 'FR': 'EUR', 'IT': 'EUR', 'ES': 'EUR',
            'NL': 'EUR', 'BE': 'EUR', 'AT': 'EUR', 'PT': 'EUR',
            'GR': 'EUR', 'IE': 'EUR', 'FI': 'EUR', 'LU': 'EUR',
            'SI': 'EUR', 'SK': 'EUR', 'EE': 'EUR', 'LV': 'EUR',
            'LT': 'EUR', 'MT': 'EUR', 'CY': 'EUR', 'AU': 'AUD',
            'NZ': 'NZD', 'JP': 'JPY', 'CH': 'CHF', 'SE': 'SEK',
            'NO': 'NOK', 'DK': 'DKK', 'PL': 'PLN', 'CZ': 'CZK',
            'HU': 'HUF', 'RO': 'RON', 'HR': 'HRK', 'RS': 'RSD',
            'TR': 'TRY', 'RU': 'RUB', 'UA': 'UAH', 'IN': 'INR',
            'CN': 'CNY', 'KR': 'KRW', 'SG': 'SGD', 'HK': 'HKD',
            'MY': 'MYR', 'TH': 'THB', 'PH': 'PHP', 'ID': 'IDR',
            'VN': 'VND', 'BR': 'BRL', 'MX': 'MXN', 'AR': 'ARS',
            'CL': 'CLP', 'CO': 'COP', 'PE': 'PEN', 'ZA': 'ZAR',
            'EG': 'EGP', 'IL': 'ILS', 'SA': 'SAR', 'AE': 'AED',
            'KW': 'KWD', 'QA': 'QAR',
            // Full country names (for backward compatibility)
            'Bulgaria': 'BGN', 'United States': 'USD', 'USA': 'USD',
            'Canada': 'CAD', 'United Kingdom': 'GBP', 'UK': 'GBP',
            'Germany': 'EUR', 'France': 'EUR', 'Italy': 'EUR',
            'Spain': 'EUR', 'Netherlands': 'EUR', 'Belgium': 'EUR',
            'Austria': 'EUR', 'Portugal': 'EUR', 'Greece': 'EUR',
            'Ireland': 'EUR', 'Finland': 'EUR', 'Luxembourg': 'EUR',
            'Slovenia': 'EUR', 'Slovakia': 'EUR', 'Estonia': 'EUR',
            'Latvia': 'EUR', 'Lithuania': 'EUR', 'Malta': 'EUR',
            'Cyprus': 'EUR', 'Australia': 'AUD', 'New Zealand': 'NZD',
            'Japan': 'JPY', 'Switzerland': 'CHF', 'Sweden': 'SEK',
            'Norway': 'NOK', 'Denmark': 'DKK', 'Poland': 'PLN',
            'Czech Republic': 'CZK', 'Hungary': 'HUF', 'Romania': 'RON',
            'Croatia': 'HRK', 'Serbia': 'RSD', 'Turkey': 'TRY',
            'Russia': 'RUB', 'Ukraine': 'UAH', 'India': 'INR',
            'China': 'CNY', 'South Korea': 'KRW', 'Singapore': 'SGD',
            'Hong Kong': 'HKD', 'Malaysia': 'MYR', 'Thailand': 'THB',
            'Philippines': 'PHP', 'Indonesia': 'IDR', 'Vietnam': 'VND',
            'Brazil': 'BRL', 'Mexico': 'MXN', 'Argentina': 'ARS',
            'Chile': 'CLP', 'Colombia': 'COP', 'Peru': 'PEN',
            'South Africa': 'ZAR', 'Egypt': 'EGP', 'Israel': 'ILS',
            'Saudi Arabia': 'SAR', 'UAE': 'AED', 'Kuwait': 'KWD',
            'Qatar': 'QAR'
        ]
        return currencyMap[country] ?: 'USD'
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
        return symbolMap[currency] ?: currency
    }

    /**
     * Format currency amount with proper symbol and formatting
     */
    private String formatCurrencyAmount(BigDecimal amount, String currency, String symbol) {
        if (!amount) return ''

        // Special formatting for certain currencies
        switch (currency) {
            case 'JPY':
            case 'KRW':
            case 'VND':
                // No decimal places for these currencies
                return "${symbol}${amount.intValue()}"
            default:
                return "${symbol}${amount.setScale(2, BigDecimal.ROUND_HALF_UP)}"
        }
    }
}
