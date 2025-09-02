package com.ddimitko.beautyhub.config

import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Value
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

import jakarta.servlet.FilterChain
import jakarta.servlet.ServletException
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import java.util.Arrays
import java.util.List

/**
 * Enhanced CORS filter for iOS app support and multipart uploads
 * This filter handles CORS for mobile apps that may not send standard Origin headers
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
class CorsFilter extends OncePerRequestFilter {

    @Value('${app.cors.allowed-origins}')
    private String allowedOrigins

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String origin = request.getHeader("Origin")
        String userAgent = request.getHeader("User-Agent")
        String method = request.getMethod()
        
        log.debug("🌐 CORS Filter - Method: {}, Origin: {}, User-Agent: {}", method, origin, userAgent)
        
        // Check if this is an iOS app request
        boolean isIosApp = isIosAppRequest(origin, userAgent)
        
        // Check if origin is allowed
        boolean isOriginAllowed = isOriginAllowed(origin) || isIosApp
        
        if (isOriginAllowed) {
            // Set CORS headers for allowed origins
            if (origin != null && !origin.isEmpty()) {
                response.setHeader("Access-Control-Allow-Origin", origin)
            } else if (isIosApp) {
                // For iOS apps without origin, allow the request
                response.setHeader("Access-Control-Allow-Origin", "*")
            }
            
            response.setHeader("Access-Control-Allow-Credentials", "true")
            response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH")
            response.setHeader("Access-Control-Allow-Headers", 
                "Authorization, Content-Type, X-Requested-With, Accept, Origin, " +
                "Access-Control-Request-Method, Access-Control-Request-Headers, " +
                "X-CSRF-TOKEN, X-XSRF-TOKEN, User-Agent")
            response.setHeader("Access-Control-Expose-Headers", 
                "Authorization, Content-Type, X-Requested-With, Accept, Origin, " +
                "Access-Control-Request-Method, Access-Control-Request-Headers, " +
                "X-CSRF-TOKEN, X-XSRF-TOKEN")
            response.setHeader("Access-Control-Max-Age", "3600")
            
            log.debug("✅ CORS headers set for origin: {} (iOS: {})", origin ?: "null", isIosApp)
        } else {
            log.warn("❌ CORS blocked for origin: {} (iOS: {})", origin ?: "null", isIosApp)
        }
        
        // Handle preflight requests
        if ("OPTIONS".equalsIgnoreCase(method)) {
            log.debug("🔄 Handling OPTIONS preflight request")
            response.setStatus(HttpServletResponse.SC_OK)
            return
        }
        
        filterChain.doFilter(request, response)
    }
    
    /**
     * Check if the request is from an iOS app
     */
    private boolean isIosAppRequest(String origin, String userAgent) {
        // Check for iOS app origins
        if (origin != null) {
            if (origin.startsWith("app://") || 
                origin.startsWith("capacitor://") || 
                origin.startsWith("ionic://") ||
                origin.startsWith("file://")) {
                return true
            }
        }
        
        // Check for iOS user agent patterns
        if (userAgent != null) {
            String lowerUserAgent = userAgent.toLowerCase()
            if (lowerUserAgent.contains("lunaraapp") ||
                lowerUserAgent.contains("ios") ||
                lowerUserAgent.contains("iphone") ||
                lowerUserAgent.contains("ipad") ||
                lowerUserAgent.contains("darwin") ||
                lowerUserAgent.contains("mobile")) {
                return true
            }
        }
        
        return false
    }
    
    /**
     * Check if origin is in the allowed origins list
     */
    private boolean isOriginAllowed(String origin) {
        if (origin == null || origin.isEmpty()) {
            return false
        }
        
        List<String> allowed = Arrays.asList(allowedOrigins.split(","))
        
        // Direct match
        if (allowed.contains(origin)) {
            return true
        }
        
        // Pattern matching for wildcards
        for (String allowedOrigin : allowed) {
            if (allowedOrigin.equals("*")) {
                return true
            }
            
            // Simple wildcard matching
            if (allowedOrigin.contains("*")) {
                String pattern = allowedOrigin.replace("*", ".*")
                if (origin.matches(pattern)) {
                    return true
                }
            }
        }
        
        return false
    }
}
