package com.ddimitko.beautyhub.service

import com.fasterxml.jackson.databind.ObjectMapper
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@Service
@Slf4j
class AuditLoggingService {

    @Autowired
    private ObjectMapper objectMapper

    private static final String AUDIT_LOGGER_NAME = "AUDIT"
    private static final org.slf4j.Logger auditLogger = org.slf4j.LoggerFactory.getLogger(AUDIT_LOGGER_NAME)

    /**
     * Log authentication events
     */
    void logAuthenticationEvent(String eventType, String userEmail, String ipAddress, 
                               Map<String, Object> additionalData = [:]) {
        try {
            Map<String, Object> auditEvent = [
                timestamp: LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                eventType: "AUTHENTICATION",
                action: eventType,
                userEmail: userEmail,
                ipAddress: ipAddress,
                success: additionalData.success ?: false,
                userAgent: additionalData.userAgent,
                sessionId: additionalData.sessionId,
                additionalData: additionalData
            ]

            auditLogger.info(objectMapper.writeValueAsString(auditEvent))
            
        } catch (Exception e) {
            log.error("Failed to log authentication event", e)
        }
    }

    /**
     * Log authorization events (access control)
     */
    void logAuthorizationEvent(String action, String userId, String resource, 
                              boolean granted, String reason = null) {
        try {
            Map<String, Object> auditEvent = [
                timestamp: LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                eventType: "AUTHORIZATION",
                action: action,
                userId: userId,
                resource: resource,
                granted: granted,
                reason: reason
            ]

            auditLogger.info(objectMapper.writeValueAsString(auditEvent))
            
        } catch (Exception e) {
            log.error("Failed to log authorization event", e)
        }
    }

    /**
     * Log data access events
     */
    void logDataAccessEvent(String operation, String userId, String entityType, 
                           String entityId, Map<String, Object> metadata = [:]) {
        try {
            Map<String, Object> auditEvent = [
                timestamp: LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                eventType: "DATA_ACCESS",
                operation: operation, // CREATE, READ, UPDATE, DELETE
                userId: userId,
                entityType: entityType,
                entityId: entityId,
                metadata: metadata
            ]

            auditLogger.info(objectMapper.writeValueAsString(auditEvent))
            
        } catch (Exception e) {
            log.error("Failed to log data access event", e)
        }
    }

    /**
     * Log security events (suspicious activities)
     */
    void logSecurityEvent(String eventType, String description, String ipAddress, 
                         String userId = null, Map<String, Object> details = [:]) {
        try {
            Map<String, Object> auditEvent = [
                timestamp: LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                eventType: "SECURITY",
                securityEventType: eventType,
                description: description,
                ipAddress: ipAddress,
                userId: userId,
                severity: details.severity ?: "MEDIUM",
                details: details
            ]

            // Use appropriate log level based on severity
            String severity = details.severity as String
            switch (severity) {
                case "HIGH":
                case "CRITICAL":
                    auditLogger.error(objectMapper.writeValueAsString(auditEvent))
                    break
                case "MEDIUM":
                    auditLogger.warn(objectMapper.writeValueAsString(auditEvent))
                    break
                default:
                    auditLogger.info(objectMapper.writeValueAsString(auditEvent))
            }
            
        } catch (Exception e) {
            log.error("Failed to log security event", e)
        }
    }

    /**
     * Log business events (important business operations)
     */
    void logBusinessEvent(String eventType, String userId, String description, 
                         Map<String, Object> businessData = [:]) {
        try {
            Map<String, Object> auditEvent = [
                timestamp: LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                eventType: "BUSINESS",
                businessEventType: eventType,
                userId: userId,
                description: description,
                businessData: businessData
            ]

            auditLogger.info(objectMapper.writeValueAsString(auditEvent))
            
        } catch (Exception e) {
            log.error("Failed to log business event", e)
        }
    }

    /**
     * Log system events (application lifecycle, errors)
     */
    void logSystemEvent(String eventType, String description, Map<String, Object> systemData = [:]) {
        try {
            Map<String, Object> auditEvent = [
                timestamp: LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                eventType: "SYSTEM",
                systemEventType: eventType,
                description: description,
                systemData: systemData
            ]

            auditLogger.info(objectMapper.writeValueAsString(auditEvent))
            
        } catch (Exception e) {
            log.error("Failed to log system event", e)
        }
    }

    /**
     * Log payment events (financial transactions)
     */
    void logPaymentEvent(String operation, String userId, String appointmentId, 
                        String amount, String currency, String paymentIntentId, 
                        boolean success, String errorMessage = null) {
        try {
            Map<String, Object> auditEvent = [
                timestamp: LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                eventType: "PAYMENT",
                operation: operation,
                userId: userId,
                appointmentId: appointmentId,
                amount: amount,
                currency: currency,
                paymentIntentId: paymentIntentId,
                success: success,
                errorMessage: errorMessage
            ]

            if (success) {
                auditLogger.info(objectMapper.writeValueAsString(auditEvent))
            } else {
                auditLogger.warn(objectMapper.writeValueAsString(auditEvent))
            }
            
        } catch (Exception e) {
            log.error("Failed to log payment event", e)
        }
    }

    /**
     * Log file upload events
     */
    void logFileUploadEvent(String userId, String fileName, String fileType, 
                           long fileSize, String uploadPath, boolean success, 
                           String errorMessage = null) {
        try {
            Map<String, Object> auditEvent = [
                timestamp: LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                eventType: "FILE_UPLOAD",
                userId: userId,
                fileName: fileName,
                fileType: fileType,
                fileSize: fileSize,
                uploadPath: uploadPath,
                success: success,
                errorMessage: errorMessage
            ]

            auditLogger.info(objectMapper.writeValueAsString(auditEvent))
            
        } catch (Exception e) {
            log.error("Failed to log file upload event", e)
        }
    }

    /**
     * Log rate limiting events
     */
    void logRateLimitEvent(String identifier, String endpoint, String ipAddress, 
                          boolean blocked, int currentCount, int limit) {
        try {
            Map<String, Object> auditEvent = [
                timestamp: LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                eventType: "RATE_LIMIT",
                identifier: identifier,
                endpoint: endpoint,
                ipAddress: ipAddress,
                blocked: blocked,
                currentCount: currentCount,
                limit: limit
            ]

            if (blocked) {
                auditLogger.warn(objectMapper.writeValueAsString(auditEvent))
            } else {
                auditLogger.debug(objectMapper.writeValueAsString(auditEvent))
            }
            
        } catch (Exception e) {
            log.error("Failed to log rate limit event", e)
        }
    }

    /**
     * Convenience methods for common events
     */
    
    void logSuccessfulLogin(String userEmail, String ipAddress, String userAgent) {
        logAuthenticationEvent("LOGIN_SUCCESS", userEmail, ipAddress, [
            success: true,
            userAgent: userAgent
        ])
    }

    void logFailedLogin(String userEmail, String ipAddress, String reason, String userAgent) {
        logAuthenticationEvent("LOGIN_FAILED", userEmail, ipAddress, [
            success: false,
            reason: reason,
            userAgent: userAgent
        ])
        
        // Also log as security event for failed login attempts
        logSecurityEvent("FAILED_LOGIN_ATTEMPT", 
            "Failed login attempt for user: ${userEmail}", 
            ipAddress, null, [
                userEmail: userEmail,
                reason: reason,
                severity: "MEDIUM"
            ])
    }

    void logUserRegistration(String userEmail, String ipAddress) {
        logAuthenticationEvent("USER_REGISTRATION", userEmail, ipAddress, [success: true])
    }

    void logPasswordReset(String userEmail, String ipAddress) {
        logAuthenticationEvent("PASSWORD_RESET", userEmail, ipAddress, [success: true])
    }

    void logSuspiciousActivity(String description, String ipAddress, String userId = null) {
        logSecurityEvent("SUSPICIOUS_ACTIVITY", description, ipAddress, userId, [
            severity: "HIGH"
        ])
    }

    void logAppointmentCreated(String userId, String appointmentId, String shopId) {
        logBusinessEvent("APPOINTMENT_CREATED", userId, 
            "New appointment created", [
                appointmentId: appointmentId,
                shopId: shopId
            ])
    }

    void logShopCreated(String userId, String shopId, String shopName) {
        logBusinessEvent("SHOP_CREATED", userId, 
            "New shop created: ${shopName}", [
                shopId: shopId,
                shopName: shopName
            ])
    }
}
