package com.ddimitko.beautyhub.config

import groovy.util.logging.Slf4j
import org.springframework.context.MessageSource
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.support.ReloadableResourceBundleMessageSource
import org.springframework.web.servlet.LocaleResolver
import org.springframework.web.servlet.config.annotation.InterceptorRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver
import org.springframework.web.servlet.i18n.LocaleChangeInterceptor

import java.util.Locale

/**
 * Internationalization configuration for the Lunara beauty booking platform.
 *
 * Supports multiple languages:
 * - English (en) - Primary language
 * - Bulgarian (bg) - Local market
 */
@Configuration
@Slf4j
class InternationalizationConfig implements WebMvcConfigurer {

    /**
     * Supported locales for the platform
     */
    static final List<Locale> SUPPORTED_LOCALES = [
        Locale.ENGLISH,           // en
        new Locale("bg")          // Bulgarian
    ]

    /**
     * Default locale (English)
     */
    static final Locale DEFAULT_LOCALE = Locale.ENGLISH

    /**
     * Configure message source for internationalization
     */
    @Bean
    MessageSource messageSource() {
        ReloadableResourceBundleMessageSource messageSource = new ReloadableResourceBundleMessageSource()
        
        // Set base names for message properties files
        messageSource.setBasenames(
            "classpath:messages/messages",           // General messages
            "classpath:messages/validation",         // Validation messages
            "classpath:messages/errors",             // Error messages
            "classpath:messages/emails",             // Email templates
            "classpath:messages/appointments",       // Appointment-related messages
            "classpath:messages/shops",              // Shop-related messages
            "classpath:messages/users",              // User-related messages
            "classpath:messages/payments",           // Payment-related messages
            "classpath:messages/notifications"       // Notification messages
        )
        
        // Set encoding and caching
        messageSource.setDefaultEncoding("UTF-8")
        messageSource.setCacheSeconds(3600) // Cache for 1 hour in production
        messageSource.setFallbackToSystemLocale(false)
        messageSource.setDefaultLocale(DEFAULT_LOCALE)
        
        log.info("🌍 Message source configured with {} base names", messageSource.getBasenameSet().size())
        return messageSource
    }

    /**
     * Configure locale resolver to detect user's preferred language
     */
    @Bean
    LocaleResolver localeResolver() {
        AcceptHeaderLocaleResolver localeResolver = new AcceptHeaderLocaleResolver()
        localeResolver.setSupportedLocales(SUPPORTED_LOCALES)
        localeResolver.setDefaultLocale(DEFAULT_LOCALE)
        
        log.info("🌍 Locale resolver configured with supported locales: {}", 
                SUPPORTED_LOCALES.collect { it.toString() })
        return localeResolver
    }

    /**
     * Configure locale change interceptor to allow runtime locale switching
     */
    @Bean
    LocaleChangeInterceptor localeChangeInterceptor() {
        LocaleChangeInterceptor interceptor = new LocaleChangeInterceptor()
        interceptor.setParamName("lang") // ?lang=bg, ?lang=de, etc.
        interceptor.setIgnoreInvalidLocale(true)
        
        log.info("🌍 Locale change interceptor configured with parameter name: {}", 
                interceptor.getParamName())
        return interceptor
    }

    /**
     * Register the locale change interceptor
     */
    @Override
    void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(localeChangeInterceptor())
        log.info("🌍 Locale change interceptor registered")
    }

    /**
     * Get the current locale from the context
     */
    static Locale getCurrentLocale() {
        try {
            return org.springframework.context.i18n.LocaleContextHolder.getLocale()
        } catch (Exception e) {
            return DEFAULT_LOCALE
        }
    }

    /**
     * Check if a locale is supported
     */
    static boolean isLocaleSupported(Locale locale) {
        return SUPPORTED_LOCALES.any { it.language == locale.language }
    }

    /**
     * Get supported locale codes
     */
    static List<String> getSupportedLocaleCodes() {
        return SUPPORTED_LOCALES.collect { it.toString() }
    }

    /**
     * Get locale display names for UI
     */
    static Map<String, String> getLocaleDisplayNames() {
        return [
            'en': 'English',
            'bg': 'Български'
        ]
    }
}
