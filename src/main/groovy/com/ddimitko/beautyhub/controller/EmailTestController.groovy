package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.entity.Appointment
import com.ddimitko.beautyhub.service.EmailService
import com.ddimitko.beautyhub.service.UserService
import com.ddimitko.beautyhub.service.RabbitMQMessageService
import com.ddimitko.beautyhub.service.EmailConfigurationService
import com.ddimitko.beautyhub.repository.AppointmentRepository
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/test/email")
@CrossOrigin(origins = "*", maxAge = 3600)
class EmailTestController {

    @Autowired
    private EmailService emailService

    @Autowired
    private UserService userService

    @Autowired
    private RabbitMQMessageService rabbitMQMessageService

    @Autowired
    private AppointmentRepository appointmentRepository

    @Autowired
    private EmailConfigurationService emailConfigurationService

    @PostMapping("/welcome/{userId}")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> testWelcomeEmail(@PathVariable("userId") UUID userId) {
        try {
            User user = userService.findById(userId)
            emailService.sendWelcomeEmail(user)
            
            return ResponseEntity.ok([
                message: "Welcome email sent successfully to ${user.email}"
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to send welcome email",
                message: e.getMessage()
            ])
        }
    }

    @PostMapping("/password-reset/{userId}")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> testPasswordResetEmail(@PathVariable("userId") UUID userId) {
        try {
            User user = userService.findById(userId)
            String testToken = "test-reset-token-" + System.currentTimeMillis()
            emailService.sendPasswordResetEmail(user, testToken)
            
            return ResponseEntity.ok([
                message: "Password reset email sent successfully to ${user.email}",
                testToken: testToken
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to send password reset email",
                message: e.getMessage()
            ])
        }
    }

    @PostMapping("/appointment-confirmation/{appointmentId}")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> testAppointmentConfirmationEmail(@PathVariable("appointmentId") UUID appointmentId) {
        try {
            Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow { new IllegalArgumentException("Appointment not found") }
            
            emailService.sendAppointmentConfirmationEmail(appointment)
            
            String recipientEmail = appointment.user?.email ?: appointment.guestEmail
            return ResponseEntity.ok([
                message: "Appointment confirmation email sent successfully to ${recipientEmail}",
                appointmentId: appointmentId
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to send appointment confirmation email",
                message: e.getMessage()
            ])
        }
    }

    @PostMapping("/appointment-reminder/{appointmentId}")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> testAppointmentReminderEmail(@PathVariable("appointmentId") UUID appointmentId,
                                                  @RequestParam(required = false) String customMessage) {
        try {
            Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow { new IllegalArgumentException("Appointment not found") }
            
            emailService.sendAppointmentReminderEmail(appointment, customMessage)
            
            String recipientEmail = appointment.user?.email ?: appointment.guestEmail
            return ResponseEntity.ok([
                message: "Appointment reminder email sent successfully to ${recipientEmail}",
                appointmentId: appointmentId,
                customMessage: customMessage
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to send appointment reminder email",
                message: e.getMessage()
            ])
        }
    }

    @PostMapping("/queue-email")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> testEmailQueue(@RequestParam(value = "emailType") String emailType,
                                    @RequestParam(value = "userId", required = false) UUID userId,
                                    @RequestParam(value = "appointmentId", required = false) UUID appointmentId,
                                    @RequestParam(value = "resetToken", required = false) String resetToken,
                                    @RequestParam(value = "customMessage", required = false) String customMessage) {
        try {
            Map<String, Object> emailData = [
                emailType: emailType
            ]
            
            if (userId) emailData.userId = userId.toString()
            if (appointmentId) emailData.appointmentId = appointmentId.toString()
            if (resetToken) emailData.resetToken = resetToken
            if (customMessage) emailData.customMessage = customMessage
            
            rabbitMQMessageService.publishEmailNotification(emailData)
            
            return ResponseEntity.ok([
                message: "Email queued successfully via RabbitMQ",
                emailType: emailType,
                emailData: emailData
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to queue email",
                message: e.getMessage()
            ])
        }
    }

    @PostMapping("/test-direct-email")
    ResponseEntity<?> testDirectEmail(@RequestParam String toEmail) {
        try {
            if (!emailConfigurationService.isConfigurationValid()) {
                return ResponseEntity.badRequest().body([
                    error: "Email configuration is invalid",
                    recommendations: emailConfigurationService.getConfigurationRecommendations()
                ])
            }

            // Test direct email sending (bypassing RabbitMQ)
            emailService.sendTestEmail(toEmail)

            return ResponseEntity.ok([
                message: "Direct test email sent successfully to ${toEmail}",
                timestamp: new Date()
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to send direct test email",
                message: e.getMessage(),
                stackTrace: e.getStackTrace().take(5).collect { it.toString() }
            ])
        }
    }

    @GetMapping("/status")
    ResponseEntity<?> getEmailSystemStatus() {
        Map<String, Object> configStatus = emailConfigurationService.getConfigurationStatus()

        return ResponseEntity.ok([
            status: configStatus.configured ? "Email system is configured and ready" : "Email system needs configuration",
            configuration: configStatus,
            recommendations: emailConfigurationService.getConfigurationRecommendations(),
            features: [
                "Welcome emails on user registration",
                "Password reset emails",
                "Appointment confirmation emails",
                "Appointment update emails",
                "Appointment cancellation emails",
                "Appointment reminder emails (24h before)",
                "RabbitMQ integration for reliable delivery",
                "HTML email templates with Thymeleaf",
                "Scheduled reminder system"
            ],
            endpoints: [
                "POST /api/test/email/welcome/{userId}",
                "POST /api/test/email/password-reset/{userId}",
                "POST /api/test/email/appointment-confirmation/{appointmentId}",
                "POST /api/test/email/appointment-reminder/{appointmentId}",
                "POST /api/test/email/queue-email",
                "POST /api/test/email/send-test",
                "GET /api/test/email/status"
            ]
        ])
    }

    @PostMapping("/send-test")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> sendTestEmail(@RequestParam String toEmail,
                                   @RequestParam(required = false) String message) {
        try {
            if (!emailConfigurationService.isConfigurationValid()) {
                return ResponseEntity.badRequest().body([
                    error: "Email configuration is invalid",
                    recommendations: emailConfigurationService.getConfigurationRecommendations()
                ])
            }

            boolean success = emailConfigurationService.sendTestEmail(toEmail, message)

            if (success) {
                return ResponseEntity.ok([
                    message: "Test email sent successfully to ${toEmail}",
                    timestamp: new Date()
                ])
            } else {
                return ResponseEntity.badRequest().body([
                    error: "Failed to send test email",
                    message: "Check logs for detailed error information"
                ])
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to send test email",
                message: e.getMessage()
            ])
        }
    }
}
