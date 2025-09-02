package com.ddimitko.beautyhub.service

import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service
import org.thymeleaf.TemplateEngine
import org.thymeleaf.context.Context

@Service
@Slf4j
class EmailTemplateService {

    @Autowired
    private TemplateEngine templateEngine

    /**
     * Generate welcome email HTML content
     */
    String generateWelcomeEmail(Map<String, Object> templateData) {
        try {
            Context context = new Context()
            context.setVariables(templateData)
            return templateEngine.process("emails/welcome", context)
        } catch (Exception e) {
            log.error("Failed to generate welcome email template", e)
            return generateFallbackWelcomeEmail(templateData)
        }
    }

    /**
     * Generate password reset email HTML content
     */
    String generatePasswordResetEmail(Map<String, Object> templateData) {
        try {
            Context context = new Context()
            context.setVariables(templateData)
            return templateEngine.process("emails/password-reset", context)
        } catch (Exception e) {
            log.error("Failed to generate password reset email template", e)
            return generateFallbackPasswordResetEmail(templateData)
        }
    }

    /**
     * Generate appointment confirmation email HTML content
     */
    String generateAppointmentConfirmationEmail(Map<String, Object> templateData) {
        try {
            Context context = new Context()
            context.setVariables(templateData)
            return templateEngine.process("emails/appointment-confirmation", context)
        } catch (Exception e) {
            log.error("Failed to generate appointment confirmation email template", e)
            return generateFallbackAppointmentEmail(templateData, "Appointment Confirmed")
        }
    }

    /**
     * Generate appointment update email HTML content
     */
    String generateAppointmentUpdateEmail(Map<String, Object> templateData) {
        try {
            Context context = new Context()
            context.setVariables(templateData)
            return templateEngine.process("emails/appointment-update", context)
        } catch (Exception e) {
            log.error("Failed to generate appointment update email template", e)
            return generateFallbackAppointmentEmail(templateData, "Appointment Updated")
        }
    }

    /**
     * Generate appointment cancellation email HTML content
     */
    String generateAppointmentCancellationEmail(Map<String, Object> templateData) {
        try {
            Context context = new Context()
            context.setVariables(templateData)
            return templateEngine.process("emails/appointment-cancellation", context)
        } catch (Exception e) {
            log.error("Failed to generate appointment cancellation email template", e)
            return generateFallbackAppointmentEmail(templateData, "Appointment Cancelled")
        }
    }

    /**
     * Generate appointment reminder email HTML content
     */
    String generateAppointmentReminderEmail(Map<String, Object> templateData) {
        try {
            Context context = new Context()
            context.setVariables(templateData)
            return templateEngine.process("emails/appointment-reminder", context)
        } catch (Exception e) {
            log.error("Failed to generate appointment reminder email template", e)
            return generateFallbackAppointmentEmail(templateData, "Appointment Reminder")
        }
    }

    /**
     * Generate employee invitation email HTML content
     */
    String generateEmployeeInvitationEmail(Map<String, Object> templateData) {
        try {
            Context context = new Context()
            context.setVariables(templateData)
            return templateEngine.process("emails/employee-invitation", context)
        } catch (Exception e) {
            log.error("Failed to generate employee invitation email template", e)
            return generateFallbackEmployeeInvitationEmail(templateData)
        }
    }

    /**
     * Generate employee notification email HTML content
     */
    String generateEmployeeNotificationEmail(Map<String, Object> templateData) {
        try {
            Context context = new Context()
            context.setVariables(templateData)
            return templateEngine.process("emails/employee-notification", context)
        } catch (Exception e) {
            log.error("Failed to generate employee notification email template", e)
            return generateFallbackEmployeeNotificationEmail(templateData)
        }
    }

    /**
     * Generate review request email HTML content
     */
    String generateReviewRequestEmail(Map<String, Object> templateData) {
        try {
            Context context = new Context()
            context.setVariables(templateData)
            return templateEngine.process("emails/review-request", context)
        } catch (Exception e) {
            log.error("Failed to generate review request email template", e)
            return generateFallbackReviewRequestEmail(templateData)
        }
    }

    /**
     * Generate guest review request email HTML content
     */
    String generateGuestReviewRequestEmail(Map<String, Object> templateData) {
        try {
            Context context = new Context()
            context.setVariables(templateData)
            return templateEngine.process("emails/guest-review-request", context)
        } catch (Exception e) {
            log.error("Failed to generate guest review request email template", e)
            return generateFallbackGuestReviewRequestEmail(templateData)
        }
    }

    /**
     * Fallback welcome email template
     */
    private String generateFallbackWelcomeEmail(Map<String, Object> data) {
        return """
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #4F46E5;">Welcome to BeautyHub!</h1>
                <p>Hello ${data.firstName},</p>
                <p>Welcome to BeautyHub! We're excited to have you join our community.</p>
                <p>You can now:</p>
                <ul>
                    <li>Book appointments at your favorite beauty shops</li>
                    <li>Manage your bookings</li>
                    <li>Discover new services and providers</li>
                </ul>
                <p>
                    <a href="${data.loginUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        Get Started
                    </a>
                </p>
                <p>Best regards,<br>The BeautyHub Team</p>
            </div>
        </body>
        </html>
        """
    }

    /**
     * Fallback password reset email template
     */
    private String generateFallbackPasswordResetEmail(Map<String, Object> data) {
        return """
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #4F46E5;">Reset Your Password</h1>
                <p>Hello ${data.firstName},</p>
                <p>We received a request to reset your password for your BeautyHub account.</p>
                <p>Click the button below to reset your password:</p>
                <p>
                    <a href="${data.resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        Reset Password
                    </a>
                </p>
                <p>If you didn't request this password reset, please ignore this email.</p>
                <p>This link will expire in 24 hours for security reasons.</p>
                <p>Best regards,<br>The BeautyHub Team</p>
            </div>
        </body>
        </html>
        """
    }

    /**
     * Fallback appointment email template
     */
    private String generateFallbackAppointmentEmail(Map<String, Object> data, String title) {
        return """
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #4F46E5;">${title}</h1>
                <p>Hello ${data.customerName},</p>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Appointment Details</h3>
                    <p><strong>Service:</strong> ${data.serviceName}</p>
                    <p><strong>Provider:</strong> ${data.employeeName}</p>
                    <p><strong>Shop:</strong> ${data.shopName}</p>
                    <p><strong>Date:</strong> ${data.appointmentDate}</p>
                    <p><strong>Time:</strong> ${data.appointmentTime}</p>
                    ${data.totalAmount ? "<p><strong>Total:</strong> \$${data.totalAmount}</p>" : ""}
                    ${data.notes ? "<p><strong>Notes:</strong> ${data.notes}</p>" : ""}
                </div>
                
                <p>
                    <a href="${data.appointmentUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        View Appointment
                    </a>
                </p>
                
                <p>Best regards,<br>The Lunara Team</p>
            </div>
        </body>
        </html>
        """
    }

    /**
     * Fallback employee invitation email template
     */
    private String generateFallbackEmployeeInvitationEmail(Map<String, Object> data) {
        return """
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #BFA054;">You're Invited to Join ${data.shopName}</h1>
                <p>Hello,</p>

                <p>You've been invited by ${data.shopOwnerName} to join the team at <strong>${data.shopName}</strong> on Lunara.</p>

                <div style="background-color: #F5F5F5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p>To accept this invitation and set up your account, please click the button below:</p>
                    <p>
                        <a href="${data.acceptUrl}" style="background-color: #BFA054; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            Accept Invitation
                        </a>
                    </p>
                    <p><small>This invitation will expire on ${data.expiresAt}.</small></p>
                </div>

                <p>Welcome to the Lunara family!</p>
                <p>Best regards,<br>The Lunara Team</p>
            </div>
        </body>
        </html>
        """
    }

    /**
     * Fallback employee notification email template
     */
    private String generateFallbackEmployeeNotificationEmail(Map<String, Object> data) {
        return """
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #BFA054;">Welcome to the ${data.shopName} Team</h1>
                <p>Hello ${data.firstName},</p>

                <p>Great news! ${data.shopOwnerName} has added you as an employee at <strong>${data.shopName}</strong> on Lunara.</p>

                <div style="background-color: #F5F5F5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p>You can now access your employee dashboard to manage appointments and view your schedule:</p>
                    <p>
                        <a href="${data.dashboardUrl}" style="background-color: #BFA054; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            Access Dashboard
                        </a>
                    </p>
                </div>

                <p>Welcome to the team!</p>
                <p>Best regards,<br>The Lunara Team</p>
            </div>
        </body>
        </html>
        """
    }

    /**
     * Fallback review request email template
     */
    private String generateFallbackReviewRequestEmail(Map<String, Object> data) {
        return """
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #BFA054;">How was your appointment?</h1>
                <p>Hello ${data.customerName},</p>

                <p>We hope you enjoyed your recent appointment at <strong>${data.shopName}</strong>!</p>

                <div style="background-color: #F5F5F5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Your Appointment</h3>
                    <p><strong>Service:</strong> ${data.serviceName}</p>
                    <p><strong>Provider:</strong> ${data.employeeName}</p>
                    <p><strong>Date & Time:</strong> ${data.appointmentTime}</p>
                </div>

                <p>Your feedback helps other customers discover great services and helps ${data.shopName} continue to provide excellent experiences.</p>

                <p style="text-align: center; margin: 30px 0;">
                    <a href="${data.reviewUrl}" style="background-color: #BFA054; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                        Leave Your Review
                    </a>
                </p>

                <p style="font-size: 14px; color: #666;">
                    This review is for your appointment on ${data.appointmentTime}. You can rate your experience and share your thoughts to help others.
                </p>

                <p>Thank you for choosing Lunara!</p>
                <p>Best regards,<br>The Lunara Team</p>
            </div>
        </body>
        </html>
        """
    }

    /**
     * Fallback guest review request email template
     */
    private String generateFallbackGuestReviewRequestEmail(Map<String, Object> data) {
        return """
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #BFA054;">How was your appointment, ${data.guestName}?</h1>
                <p>We hope you enjoyed your recent <strong>${data.serviceName}</strong> appointment at <strong>${data.shopName}</strong>!</p>
                <p>Your feedback helps other customers discover exceptional beauty services.</p>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${data.guestReviewUrl}" style="background-color: #BFA054; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Leave Your Review</a>
                </div>

                <div style="background-color: #F5F5F5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #333; margin-top: 0;">Want to track your appointments and reviews?</h3>
                    <p>Create a free Lunara account to:</p>
                    <ul>
                        <li>View your appointment history</li>
                        <li>Book future appointments faster</li>
                        <li>Receive personalized recommendations</li>
                        <li>Get exclusive offers and updates</li>
                    </ul>
                    <div style="text-align: center; margin-top: 15px;">
                        <a href="${data.accountCreationUrl}" style="background-color: #333333; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Create Your Account</a>
                    </div>
                </div>

                <p style="font-size: 14px; color: #666;">
                    This review request was sent for your appointment on ${data.appointmentTime} with ${data.employeeName}.
                </p>

                <p>Best regards,<br>The Lunara Team</p>
            </div>
        </body>
        </html>
        """
    }
}
