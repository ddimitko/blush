package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.config.InternationalizationConfig
import com.ddimitko.beautyhub.service.MessageService
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.i18n.LocaleContextHolder
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import java.util.Locale

/**
 * Controller for handling internationalization features.
 * Provides endpoints for locale management and translation retrieval.
 */
@RestController
@RequestMapping("/api/i18n")
@CrossOrigin(origins = "*", maxAge = 3600)
@Slf4j
class InternationalizationController {

    @Autowired
    private MessageService messageService

    /**
     * Get current locale information
     */
    @GetMapping("/locale")
    ResponseEntity<?> getCurrentLocale() {
        try {
            Locale currentLocale = LocaleContextHolder.getLocale()
            
            return ResponseEntity.ok([
                current: [
                    code: currentLocale.getLanguage(),
                    displayName: currentLocale.getDisplayName(currentLocale),
                    country: currentLocale.getCountry(),
                    language: currentLocale.getLanguage()
                ],
                supported: InternationalizationConfig.getSupportedLocaleCodes(),
                displayNames: InternationalizationConfig.getLocaleDisplayNames(),
                default: InternationalizationConfig.DEFAULT_LOCALE.getLanguage()
            ])
        } catch (Exception e) {
            log.error("Failed to get current locale", e)
            return ResponseEntity.internalServerError().body([
                error: "Failed to get locale information"
            ])
        }
    }

    /**
     * Get supported locales
     */
    @GetMapping("/locales")
    ResponseEntity<?> getSupportedLocales() {
        try {
            return ResponseEntity.ok([
                supported: InternationalizationConfig.getSupportedLocaleCodes(),
                displayNames: InternationalizationConfig.getLocaleDisplayNames(),
                default: InternationalizationConfig.DEFAULT_LOCALE.getLanguage()
            ])
        } catch (Exception e) {
            log.error("Failed to get supported locales", e)
            return ResponseEntity.internalServerError().body([
                error: "Failed to get supported locales"
            ])
        }
    }

    /**
     * Change locale (for testing purposes)
     */
    @PostMapping("/locale")
    ResponseEntity<?> changeLocale(
            @RequestBody Map<String, String> request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        try {
            String localeCode = request.get("locale")
            
            if (!localeCode) {
                return ResponseEntity.badRequest().body([
                    error: "Locale code is required"
                ])
            }

            Locale newLocale = Locale.forLanguageTag(localeCode)
            
            if (!InternationalizationConfig.isLocaleSupported(newLocale)) {
                return ResponseEntity.badRequest().body([
                    error: "Unsupported locale: ${localeCode}",
                    supported: InternationalizationConfig.getSupportedLocaleCodes()
                ])
            }

            // Set the locale in the context
            LocaleContextHolder.setLocale(newLocale)
            
            log.info("Locale changed to: {}", localeCode)
            
            return ResponseEntity.ok([
                message: messageService.getMessage("success.locale.changed", "Locale changed successfully"),
                locale: [
                    code: newLocale.getLanguage(),
                    displayName: newLocale.getDisplayName(newLocale)
                ]
            ])
        } catch (Exception e) {
            log.error("Failed to change locale", e)
            return ResponseEntity.internalServerError().body([
                error: "Failed to change locale"
            ])
        }
    }

    /**
     * Get translations for a specific namespace
     */
    @GetMapping("/translations/{namespace}")
    ResponseEntity<?> getTranslations(
            @PathVariable("namespace") String namespace,
            HttpServletRequest request) {
        try {
            String localeParam = request.getParameter("locale")
            Locale targetLocale = localeParam ?
                Locale.forLanguageTag(localeParam) :
                LocaleContextHolder.getLocale()

            // Define common translation keys by namespace
            Map<String, List<String>> namespaceKeys = [
                'common': [
                    'app.name', 'app.tagline', 'app.welcome',
                    'action.save', 'action.cancel', 'action.delete', 'action.edit',
                    'label.name', 'label.email', 'label.phone', 'label.date', 'label.time',
                    'status.active', 'status.inactive', 'status.pending'
                ],
                'auth': [
                    'auth.login.title', 'auth.login.subtitle',
                    'auth.register.title', 'auth.register.subtitle',
                    'auth.password.forgot', 'auth.password.reset'
                ],
                'navigation': [
                    'nav.home', 'nav.shops', 'nav.services', 'nav.appointments',
                    'nav.profile', 'nav.dashboard', 'nav.settings'
                ],
                'validation': [
                    'validation.required', 'validation.email.invalid',
                    'validation.password.too.short', 'validation.phone.invalid'
                ],
                'errors': [
                    'error.general', 'error.not.found', 'error.unauthorized',
                    'error.validation.failed', 'error.network'
                ]
            ]

            List<String> keys = namespaceKeys[namespace] ?: []
            Map<String, String> translations = [:]

            keys.each { key ->
                try {
                    translations[key] = messageService.getMessage(key, targetLocale)
                } catch (Exception e) {
                    // Skip missing translations
                    log.debug("Translation not found for key: {} in locale: {}", key, targetLocale)
                }
            }

            return ResponseEntity.ok([
                namespace: namespace,
                locale: targetLocale.getLanguage(),
                translations: translations,
                count: translations.size()
            ])
        } catch (Exception e) {
            log.error("Failed to get translations for namespace: {}", namespace, e)
            return ResponseEntity.internalServerError().body([
                error: "Failed to get translations"
            ])
        }
    }

    /**
     * Get a specific translation
     */
    @GetMapping("/message/{key}")
    ResponseEntity<?> getMessage(
            @PathVariable("key") String key,
            HttpServletRequest request) {
        try {
            String localeParam = request.getParameter("locale")
            Locale targetLocale = localeParam ?
                Locale.forLanguageTag(localeParam) :
                LocaleContextHolder.getLocale()

            String message = messageService.getMessage(key, targetLocale)

            return ResponseEntity.ok([
                key: key,
                locale: targetLocale.getLanguage(),
                message: message
            ])
        } catch (Exception e) {
            log.error("Failed to get message for key: {}", key, e)
            return ResponseEntity.badRequest().body([
                error: messageService.getErrorMessage("message.not.found", "Message not found"),
                key: key
            ])
        }
    }

    /**
     * Health check for i18n system
     */
    @GetMapping("/health")
    ResponseEntity<?> healthCheck() {
        try {
            Locale currentLocale = LocaleContextHolder.getLocale()
            boolean messageSourceWorking = messageService.messageExists("app.name")
            
            return ResponseEntity.ok([
                status: "UP",
                locale: [
                    current: currentLocale.getLanguage(),
                    supported: InternationalizationConfig.getSupportedLocaleCodes()
                ],
                messageSource: [
                    working: messageSourceWorking,
                    testMessage: messageSourceWorking ? 
                        messageService.getMessage("app.name", "Lunara") : 
                        "Message source not working"
                ],
                timestamp: System.currentTimeMillis()
            ])
        } catch (Exception e) {
            log.error("I18n health check failed", e)
            return ResponseEntity.internalServerError().body([
                status: "DOWN",
                error: e.getMessage(),
                timestamp: System.currentTimeMillis()
            ])
        }
    }
}
