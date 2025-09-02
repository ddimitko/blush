package com.ddimitko.beautyhub.service

import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.MessageSource
import org.springframework.context.i18n.LocaleContextHolder
import org.springframework.stereotype.Service

import java.util.Locale

/**
 * Service for handling internationalized messages throughout the application.
 * Provides convenient methods for retrieving localized messages with parameters.
 */
@Service
@Slf4j
class MessageService {

    @Autowired
    private MessageSource messageSource

    /**
     * Get a localized message using the current locale
     */
    String getMessage(String code, Object... args) {
        return getMessage(code, LocaleContextHolder.getLocale(), args)
    }

    /**
     * Get a localized message for a specific locale
     */
    String getMessage(String code, Locale locale, Object... args) {
        try {
            return messageSource.getMessage(code, args, locale)
        } catch (Exception e) {
            log.warn("Message not found for code '{}' and locale '{}': {}", code, locale, e.getMessage())
            return code // Return the code itself as fallback
        }
    }

    /**
     * Get a localized message with a default fallback
     */
    String getMessage(String code, String defaultMessage, Object... args) {
        return getMessage(code, defaultMessage, LocaleContextHolder.getLocale(), args)
    }

    /**
     * Get a localized message with a default fallback for a specific locale
     */
    String getMessage(String code, String defaultMessage, Locale locale, Object... args) {
        try {
            return messageSource.getMessage(code, args, defaultMessage, locale)
        } catch (Exception e) {
            log.warn("Message not found for code '{}' and locale '{}': {}", code, locale, e.getMessage())
            return defaultMessage
        }
    }

    // ===== CONVENIENCE METHODS FOR COMMON MESSAGE TYPES =====

    /**
     * Get validation error message
     */
    String getValidationMessage(String field, String error, Object... args) {
        String code = "validation.${field}.${error}"
        return getMessage(code, args)
    }

    /**
     * Get error message
     */
    String getErrorMessage(String errorType, Object... args) {
        String code = "error.${errorType}"
        return getMessage(code, args)
    }

    /**
     * Get success message
     */
    String getSuccessMessage(String action, Object... args) {
        String code = "success.${action}"
        return getMessage(code, args)
    }

    /**
     * Get appointment-related message
     */
    String getAppointmentMessage(String messageType, Object... args) {
        String code = "appointment.${messageType}"
        return getMessage(code, args)
    }

    /**
     * Get shop-related message
     */
    String getShopMessage(String messageType, Object... args) {
        String code = "shop.${messageType}"
        return getMessage(code, args)
    }

    /**
     * Get user-related message
     */
    String getUserMessage(String messageType, Object... args) {
        String code = "user.${messageType}"
        return getMessage(code, args)
    }

    /**
     * Get payment-related message
     */
    String getPaymentMessage(String messageType, Object... args) {
        String code = "payment.${messageType}"
        return getMessage(code, args)
    }

    /**
     * Get notification message
     */
    String getNotificationMessage(String messageType, Object... args) {
        String code = "notification.${messageType}"
        return getMessage(code, args)
    }

    /**
     * Get email template message
     */
    String getEmailMessage(String templateType, String messageType, Object... args) {
        String code = "email.${templateType}.${messageType}"
        return getMessage(code, args)
    }

    // ===== UTILITY METHODS =====

    /**
     * Get current locale
     */
    Locale getCurrentLocale() {
        return LocaleContextHolder.getLocale()
    }

    /**
     * Get current locale code (e.g., "en", "bg", "de", "fr")
     */
    String getCurrentLocaleCode() {
        return getCurrentLocale().getLanguage()
    }

    /**
     * Check if a message exists for the given code
     */
    boolean messageExists(String code) {
        return messageExists(code, LocaleContextHolder.getLocale())
    }

    /**
     * Check if a message exists for the given code and locale
     */
    boolean messageExists(String code, Locale locale) {
        try {
            messageSource.getMessage(code, null, locale)
            return true
        } catch (Exception e) {
            return false
        }
    }

    /**
     * Get all available messages for debugging (development only)
     */
    Map<String, String> getAllMessages(String prefix = "") {
        // This is a simplified implementation for debugging
        // In a real scenario, you might want to implement a more sophisticated approach
        Map<String, String> messages = [:]
        Locale currentLocale = getCurrentLocale()
        
        // Common message codes for testing
        List<String> commonCodes = [
            "app.name",
            "app.welcome",
            "error.general",
            "error.notFound",
            "error.unauthorized",
            "success.saved",
            "success.deleted",
            "validation.required",
            "validation.email.invalid"
        ]
        
        commonCodes.each { code ->
            if (code.startsWith(prefix)) {
                try {
                    messages[code] = messageSource.getMessage(code, null, currentLocale)
                } catch (Exception e) {
                    // Ignore missing messages
                }
            }
        }
        
        return messages
    }
}
