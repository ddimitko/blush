package com.ddimitko.beautyhub.security

import com.ddimitko.beautyhub.service.RateLimitingService
import com.fasterxml.jackson.databind.ObjectMapper
import groovy.util.logging.Slf4j
import jakarta.servlet.FilterChain
import jakarta.servlet.ServletException
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.core.Authentication
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
@Slf4j
class RateLimitingFilter extends OncePerRequestFilter {

    @Autowired
    private RateLimitingService rateLimitingService

    @Autowired
    private ObjectMapper objectMapper

    // Endpoints that should be rate limited
    private static final List<String> RATE_LIMITED_ENDPOINTS = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/forgot-password',
        '/api/auth/reset-password',
        '/api/user/avatar',
        '/api/shops/.*/gallery',
        '/api/appointments',
        '/api/payments/create-payment-intent',
        '/api/search',
        '/api/shops/search'
    ]

    // Endpoints that should be excluded from rate limiting
    private static final List<String> EXCLUDED_ENDPOINTS = [
        '/api/auth/validate-token',
        '/actuator/health',
        '/api/stripe/publishable-key',
        '/ws',
        '/ws-notifications'
    ]

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                   FilterChain filterChain) throws ServletException, IOException {

        String requestURI = request.getRequestURI()
        String method = request.getMethod()

        // Skip rate limiting for excluded endpoints
        if (shouldSkipRateLimit(requestURI, method)) {
            filterChain.doFilter(request, response)
            return
        }

        try {
            String identifier = getIdentifier(request)
            String endpoint = getEndpointKey(requestURI, method)
            String clientIp = getClientIpAddress(request)

            // Check rate limit (now atomic - includes both check and record)
            boolean allowed = rateLimitingService.isRequestAllowed(identifier, endpoint, clientIp)

            if (!allowed) {
                handleRateLimitExceeded(request, response, identifier, endpoint, clientIp)
                return
            }

            // Add rate limit headers to response
            addRateLimitHeaders(response, identifier, endpoint, clientIp)

            // Continue with the request
            filterChain.doFilter(request, response)

        } catch (Exception e) {
            log.error("Rate limiting filter error: {}", e.getMessage(), e)
            // On error, allow the request to continue
            filterChain.doFilter(request, response)
        }
    }

    /**
     * Check if rate limiting should be skipped for this request
     */
    private boolean shouldSkipRateLimit(String requestURI, String method) {
        // Skip for excluded endpoints
        if (EXCLUDED_ENDPOINTS.any { requestURI.startsWith(it) }) {
            return true
        }

        // Skip for static resources
        if (requestURI.startsWith('/uploads/') || 
            requestURI.startsWith('/static/') || 
            requestURI.startsWith('/css/') || 
            requestURI.startsWith('/js/') || 
            requestURI.startsWith('/images/')) {
            return true
        }

        // Skip for OPTIONS requests (CORS preflight)
        if ("OPTIONS".equals(method)) {
            return true
        }

        return false
    }

    /**
     * Get identifier for rate limiting (user ID or IP address)
     */
    private String getIdentifier(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication()
        
        if (authentication != null && authentication.isAuthenticated() && 
            authentication.getPrincipal() instanceof CustomUserPrincipal) {
            CustomUserPrincipal userPrincipal = (CustomUserPrincipal) authentication.getPrincipal()
            return userPrincipal.getId().toString()
        }
        
        // For unauthenticated users, use IP address
        return getClientIpAddress(request)
    }

    /**
     * Get endpoint key for rate limiting configuration
     */
    private String getEndpointKey(String requestURI, String method) {
        // Normalize the URI for rate limiting
        String normalizedURI = requestURI.toLowerCase()
        
        // Map specific endpoints to rate limit keys
        if (normalizedURI.contains('/auth/login')) return 'login'
        if (normalizedURI.contains('/auth/register')) return 'register'
        if (normalizedURI.contains('/auth/forgot-password')) return 'password-reset'
        if (normalizedURI.contains('/auth/reset-password')) return 'password-reset'
        if (normalizedURI.contains('/avatar')) return 'avatar-upload'
        if (normalizedURI.contains('/gallery')) return 'file-upload'
        if (normalizedURI.contains('/appointments') && "POST".equals(method)) return 'appointment-create'
        if (normalizedURI.contains('/payments/create-payment-intent')) return 'payment'
        if (normalizedURI.contains('/search')) return 'api-search'
        if (normalizedURI.contains('/admin/')) return 'admin'
        if (normalizedURI.contains('/lock-slot')) return 'slot-lock'
        
        // Default to general API rate limiting
        return 'api-general'
    }

    /**
     * Get client IP address from request
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For")
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim()
        }
        
        String xRealIp = request.getHeader("X-Real-IP")
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp
        }
        
        return request.getRemoteAddr()
    }

    /**
     * Handle rate limit exceeded scenario
     */
    private void handleRateLimitExceeded(HttpServletRequest request, HttpServletResponse response,
                                       String identifier, String endpoint, String clientIp) throws IOException {
        
        log.warn("Rate limit exceeded for identifier: {}, endpoint: {}, IP: {}", 
                identifier, endpoint, clientIp)

        // Get rate limit status for headers
        RateLimitingService.RateLimitStatus status = 
            rateLimitingService.getRateLimitStatus(identifier, endpoint, clientIp)

        // Set response status and headers
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value())
        response.setContentType(MediaType.APPLICATION_JSON_VALUE)
        
        // Add rate limit headers
        response.setHeader("X-RateLimit-Limit", String.valueOf(status.limit))
        response.setHeader("X-RateLimit-Remaining", "0")
        if (status.resetTime != null) {
            response.setHeader("X-RateLimit-Reset", String.valueOf(status.resetTime.getEpochSecond()))
        }
        response.setHeader("Retry-After", "60") // Suggest retry after 60 seconds

        // Create error response
        Map<String, Object> errorResponse = [
            error: "Rate limit exceeded",
            message: "Too many requests. Please try again later.",
            status: HttpStatus.TOO_MANY_REQUESTS.value(),
            timestamp: System.currentTimeMillis(),
            path: request.getRequestURI(),
            rateLimitInfo: [
                limit: status.limit,
                remaining: 0,
                resetTime: status.resetTime?.toString()
            ]
        ]

        // Write JSON response
        response.getWriter().write(objectMapper.writeValueAsString(errorResponse))
        response.getWriter().flush()
    }

    /**
     * Add rate limit headers to successful responses
     */
    private void addRateLimitHeaders(HttpServletResponse response, String identifier, 
                                   String endpoint, String clientIp) {
        try {
            RateLimitingService.RateLimitStatus status = 
                rateLimitingService.getRateLimitStatus(identifier, endpoint, clientIp)

            if (status.limit > 0) {
                response.setHeader("X-RateLimit-Limit", String.valueOf(status.limit))
                response.setHeader("X-RateLimit-Remaining", String.valueOf(status.remaining))
                if (status.resetTime != null) {
                    response.setHeader("X-RateLimit-Reset", String.valueOf(status.resetTime.getEpochSecond()))
                }
            }
        } catch (Exception e) {
            log.debug("Failed to add rate limit headers: {}", e.getMessage())
            // Don't fail the request if headers can't be added
        }
    }
}
