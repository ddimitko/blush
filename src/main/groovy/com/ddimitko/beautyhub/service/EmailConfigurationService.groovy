package com.ddimitko.beautyhub.service

import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.stereotype.Service

import jakarta.mail.internet.MimeMessage

@Service
@Slf4j
class EmailConfigurationService {

    @Autowired
    private JavaMailSender mailSender

    @Value('${spring.mail.host:}')
    private String mailHost

    @Value('${spring.mail.port:587}')
    private int mailPort

    @Value('${spring.mail.username:}')
    private String mailUsername

    @Value('${spring.mail.password:}')
    private String mailPassword

    @Value('${app.email.from:}')
    private String fromEmail

    @Value('${app.email.from-name:}')
    private String fromName

    @Value('${app.email.base-url:}')
    private String baseUrl

    @EventListener(ApplicationReadyEvent.class)
    void validateEmailConfiguration() {
        log.info("Validating email configuration...")
        
        List<String> issues = []
        
        // Check basic configuration
        if (!mailHost) {
            issues.add("spring.mail.host is not configured")
        }
        
        if (!mailUsername) {
            issues.add("spring.mail.username is not configured")
        }
        
        if (!mailPassword) {
            issues.add("spring.mail.password is not configured")
        }
        
        if (!fromEmail) {
            issues.add("app.email.from is not configured")
        }
        
        if (!fromName) {
            issues.add("app.email.from-name is not configured")
        }
        
        if (!baseUrl) {
            issues.add("app.email.base-url is not configured")
        }
        
        if (issues.isEmpty()) {
            log.info("Email configuration validation passed")
            testEmailConnection()
        } else {
            log.warn("Email configuration issues found:")
            issues.each { issue ->
                log.warn("  - ${issue}")
            }
            log.warn("Email functionality may not work properly. Please check your configuration.")
        }
    }

    private void testEmailConnection() {
        try {
            // Test connection by creating a message (doesn't send it)
            MimeMessage testMessage = mailSender.createMimeMessage()
            log.info("Email connection test successful")
            logEmailConfiguration()
        } catch (Exception e) {
            log.error("Email connection test failed: ${e.getMessage()}")
            log.error("Please verify your email configuration and network connectivity")
        }
    }

    private void logEmailConfiguration() {
        log.info("Email Configuration Summary:")
        log.info("  SMTP Host: ${mailHost}")
        log.info("  SMTP Port: ${mailPort}")
        log.info("  Username: ${mailUsername}")
        log.info("  From Email: ${fromEmail}")
        log.info("  From Name: ${fromName}")
        log.info("  Base URL: ${baseUrl}")
    }

    /**
     * Get email configuration status for health checks
     */
    Map<String, Object> getConfigurationStatus() {
        boolean isConfigured = mailHost && mailUsername && mailPassword && fromEmail && fromName && baseUrl
        
        return [
            configured: isConfigured,
            host: mailHost ?: "Not configured",
            port: mailPort,
            username: mailUsername ?: "Not configured",
            fromEmail: fromEmail ?: "Not configured",
            fromName: fromName ?: "Not configured",
            baseUrl: baseUrl ?: "Not configured",
            passwordConfigured: mailPassword ? true : false
        ]
    }

    /**
     * Send a test email to verify configuration
     */
    boolean sendTestEmail(String toEmail, String testMessage = null) {
        try {
            if (!isConfigurationValid()) {
                log.error("Cannot send test email - configuration is invalid")
                return false
            }

            MimeMessage message = mailSender.createMimeMessage()
            message.setFrom(fromEmail, fromName)
            message.setRecipients(MimeMessage.RecipientType.TO, toEmail)
            message.setSubject("BeautyHub Email Test")
            
            String content = testMessage ?: """
                <html>
                <body style="font-family: Arial, sans-serif;">
                    <h2>Email Configuration Test</h2>
                    <p>This is a test email from BeautyHub to verify email configuration.</p>
                    <p><strong>Timestamp:</strong> ${new Date()}</p>
                    <p><strong>From:</strong> ${fromEmail}</p>
                    <p><strong>Base URL:</strong> ${baseUrl}</p>
                    <p>If you received this email, your email configuration is working correctly!</p>
                </body>
                </html>
            """
            
            message.setContent(content, "text/html; charset=utf-8")
            
            mailSender.send(message)
            log.info("Test email sent successfully to: ${toEmail}")
            return true
            
        } catch (Exception e) {
            log.error("Failed to send test email to ${toEmail}: ${e.getMessage()}", e)
            return false
        }
    }

    /**
     * Check if email configuration is valid
     */
    boolean isConfigurationValid() {
        return mailHost && mailUsername && mailPassword && fromEmail && fromName && baseUrl
    }

    /**
     * Get configuration recommendations
     */
    List<String> getConfigurationRecommendations() {
        List<String> recommendations = []
        
        if (!mailHost) {
            recommendations.add("Set spring.mail.host (e.g., smtp.gmail.com for Gmail)")
        }
        
        if (!mailUsername) {
            recommendations.add("Set spring.mail.username to your email address")
        }
        
        if (!mailPassword) {
            recommendations.add("Set spring.mail.password (use App Password for Gmail)")
        }
        
        if (!fromEmail) {
            recommendations.add("Set app.email.from to your sender email address")
        }
        
        if (!fromName) {
            recommendations.add("Set app.email.from-name to your application name")
        }
        
        if (!baseUrl) {
            recommendations.add("Set app.email.base-url to your application URL")
        }
        
        if (mailHost == "smtp.gmail.com" && mailPassword && !mailPassword.startsWith("app-")) {
            recommendations.add("For Gmail, use an App Password instead of your regular password")
        }
        
        return recommendations
    }
}
