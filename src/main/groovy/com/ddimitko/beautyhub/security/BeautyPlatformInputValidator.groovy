package com.ddimitko.beautyhub.security

import org.springframework.stereotype.Component
import org.springframework.util.StringUtils
import java.util.regex.Pattern

/**
 * Enhanced input validation service for Lunara Beauty Platform
 * Provides comprehensive input sanitization and validation for beauty booking platform
 */
@Component
class BeautyPlatformInputValidator {

    // XSS prevention patterns
    private static final Pattern XSS_PATTERN = Pattern.compile(
        "(?i)<script[^>]*>.*?</script>|javascript:|on\\w+\\s*=|<iframe|<object|<embed|<link|<meta"
    )
    
    // SQL injection prevention patterns
    private static final Pattern SQL_INJECTION_PATTERN = Pattern.compile(
        "(?i)(union|select|insert|update|delete|drop|create|alter|exec|execute)\\s"
    )
    
    // Beauty platform specific validation patterns
    private static final Pattern BEAUTY_SERVICE_NAME_PATTERN = Pattern.compile("^[a-zA-Z0-9\\s\\-&'.,()]+\$")
    private static final Pattern SHOP_NAME_PATTERN = Pattern.compile("^[a-zA-Z0-9\\s\\-&'.,()]+\$")
    private static final Pattern PHONE_PATTERN = Pattern.compile("^\\+?[1-9]\\d{1,14}\$")
    private static final Pattern POSTAL_CODE_PATTERN = Pattern.compile("^[A-Z0-9\\s\\-]{3,10}\$")
    
    // File upload validation
    private static final Set<String> ALLOWED_IMAGE_TYPES = [
        "image/jpeg", "image/png", "image/webp", "image/gif"
    ] as Set
    
    private static final long MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
    
    /**
     * Sanitize general text input to prevent XSS attacks
     */
    String sanitizeText(String input) {
        if (!StringUtils.hasText(input)) {
            return input
        }
        
        // Remove potential XSS patterns
        String sanitized = input.replaceAll(XSS_PATTERN.pattern(), "")
        
        // Remove potential SQL injection patterns
        sanitized = sanitized.replaceAll(SQL_INJECTION_PATTERN.pattern(), "")
        
        // Remove dangerous characters
        sanitized = sanitized.replaceAll("[<>\"'&]", "")
        
        return sanitized.trim()
    }
    
    /**
     * Validate and sanitize beauty service names
     */
    String validateServiceName(String serviceName) {
        if (!StringUtils.hasText(serviceName)) {
            throw new IllegalArgumentException("Service name cannot be empty")
        }
        
        String sanitized = sanitizeText(serviceName)
        
        if (!BEAUTY_SERVICE_NAME_PATTERN.matcher(sanitized).matches()) {
            throw new IllegalArgumentException("Service name contains invalid characters")
        }
        
        if (sanitized.length() > 100) {
            throw new IllegalArgumentException("Service name too long (max 100 characters)")
        }
        
        return sanitized
    }
    
    /**
     * Validate and sanitize shop names
     */
    String validateShopName(String shopName) {
        if (!StringUtils.hasText(shopName)) {
            throw new IllegalArgumentException("Shop name cannot be empty")
        }
        
        String sanitized = sanitizeText(shopName)
        
        if (!SHOP_NAME_PATTERN.matcher(sanitized).matches()) {
            throw new IllegalArgumentException("Shop name contains invalid characters")
        }
        
        if (sanitized.length() > 100) {
            throw new IllegalArgumentException("Shop name too long (max 100 characters)")
        }
        
        return sanitized
    }
    
    /**
     * Validate phone numbers for beauty platform
     */
    String validatePhoneNumber(String phoneNumber) {
        if (!StringUtils.hasText(phoneNumber)) {
            throw new IllegalArgumentException("Phone number cannot be empty")
        }
        
        String cleaned = phoneNumber.replaceAll("[\\s\\-().]", "")
        
        if (!PHONE_PATTERN.matcher(cleaned).matches()) {
            throw new IllegalArgumentException("Invalid phone number format")
        }
        
        return cleaned
    }
    
    /**
     * Validate postal codes
     */
    String validatePostalCode(String postalCode) {
        if (!StringUtils.hasText(postalCode)) {
            return postalCode
        }
        
        String cleaned = postalCode.toUpperCase().trim()
        
        if (!POSTAL_CODE_PATTERN.matcher(cleaned).matches()) {
            throw new IllegalArgumentException("Invalid postal code format")
        }
        
        return cleaned
    }
    
    /**
     * Validate email addresses with enhanced security
     */
    String validateEmail(String email) {
        if (!StringUtils.hasText(email)) {
            throw new IllegalArgumentException("Email cannot be empty")
        }
        
        String sanitized = sanitizeText(email.toLowerCase().trim())
        
        // Basic email pattern validation
        if (!sanitized.matches("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}\$")) {
            throw new IllegalArgumentException("Invalid email format")
        }
        
        // Check for suspicious patterns
        if (sanitized.contains("..") || sanitized.startsWith(".") || sanitized.endsWith(".")) {
            throw new IllegalArgumentException("Invalid email format")
        }
        
        return sanitized
    }
    
    /**
     * Validate file uploads for beauty platform
     */
    void validateImageUpload(String contentType, long fileSize, String fileName) {
        // Validate content type
        if (!ALLOWED_IMAGE_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("File type not allowed. Only JPEG, PNG, WebP, and GIF images are permitted.")
        }
        
        // Validate file size
        if (fileSize > MAX_IMAGE_SIZE) {
            throw new IllegalArgumentException("File size too large. Maximum size is 5MB.")
        }
        
        // Validate file name
        if (!StringUtils.hasText(fileName)) {
            throw new IllegalArgumentException("File name cannot be empty")
        }
        
        String sanitizedFileName = sanitizeFileName(fileName)
        if (sanitizedFileName.length() > 255) {
            throw new IllegalArgumentException("File name too long")
        }
    }
    
    /**
     * Sanitize file names
     */
    String sanitizeFileName(String fileName) {
        if (!StringUtils.hasText(fileName)) {
            return fileName
        }
        
        // Remove path traversal attempts
        String sanitized = fileName.replaceAll("\\.\\./", "")
        
        // Remove dangerous characters
        sanitized = sanitized.replaceAll("[^a-zA-Z0-9._-]", "_")
        
        return sanitized
    }
    
    /**
     * Validate price inputs for beauty services
     */
    BigDecimal validatePrice(String priceStr) {
        if (!StringUtils.hasText(priceStr)) {
            throw new IllegalArgumentException("Price cannot be empty")
        }
        
        try {
            BigDecimal price = new BigDecimal(priceStr)
            
            if (price < 0) {
                throw new IllegalArgumentException("Price cannot be negative")
            }
            
            if (price > 10000) {
                throw new IllegalArgumentException("Price too high (maximum 10,000)")
            }
            
            // Ensure maximum 2 decimal places
            if (price.scale() > 2) {
                throw new IllegalArgumentException("Price cannot have more than 2 decimal places")
            }
            
            return price
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid price format")
        }
    }
    
    /**
     * Validate duration inputs for beauty services (in minutes)
     */
    Integer validateDuration(String durationStr) {
        if (!StringUtils.hasText(durationStr)) {
            throw new IllegalArgumentException("Duration cannot be empty")
        }
        
        try {
            Integer duration = Integer.valueOf(durationStr)
            
            if (duration <= 0) {
                throw new IllegalArgumentException("Duration must be positive")
            }
            
            if (duration > 480) { // 8 hours max
                throw new IllegalArgumentException("Duration too long (maximum 8 hours)")
            }
            
            // Must be in 15-minute increments
            if (duration % 15 != 0) {
                throw new IllegalArgumentException("Duration must be in 15-minute increments")
            }
            
            return duration
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid duration format")
        }
    }
    
    /**
     * Validate search queries to prevent injection attacks
     */
    String validateSearchQuery(String query) {
        if (!StringUtils.hasText(query)) {
            return ""
        }
        
        String sanitized = sanitizeText(query)
        
        if (sanitized.length() > 100) {
            sanitized = sanitized.substring(0, 100)
        }
        
        return sanitized
    }
    
    /**
     * Check if input contains potential security threats
     */
    boolean containsSecurityThreats(String input) {
        if (!StringUtils.hasText(input)) {
            return false
        }
        
        return XSS_PATTERN.matcher(input).find() || 
               SQL_INJECTION_PATTERN.matcher(input).find()
    }
}
