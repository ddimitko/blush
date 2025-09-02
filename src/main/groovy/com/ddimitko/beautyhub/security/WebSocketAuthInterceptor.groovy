package com.ddimitko.beautyhub.security

import com.ddimitko.beautyhub.config.JwtConfig
import com.ddimitko.beautyhub.service.RateLimitingService
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.messaging.Message
import org.springframework.messaging.MessageChannel
import org.springframework.messaging.simp.stomp.StompCommand
import org.springframework.messaging.simp.stomp.StompHeaderAccessor
import org.springframework.messaging.support.ChannelInterceptor
import org.springframework.messaging.support.MessageHeaderAccessor
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.Authentication
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.stereotype.Component
import groovy.util.logging.Slf4j
import java.util.concurrent.ConcurrentHashMap

/**
 * Enhanced WebSocket authentication interceptor with proper security controls
 */
@Component
@Slf4j
class WebSocketAuthInterceptor implements ChannelInterceptor {

    @Autowired
    private JwtConfig jwtConfig

    @Autowired
    private CustomUserDetailsService userDetailsService

    @Autowired
    private RateLimitingService rateLimitingService

    // Track connection attempts per IP for rate limiting
    private final Map<String, Long> connectionAttempts = new ConcurrentHashMap<>()
    private final Map<String, Long> lastConnectionTime = new ConcurrentHashMap<>()

    // Rate limiting constants
    private static final int MAX_CONNECTIONS_PER_IP = 10
    private static final long CONNECTION_WINDOW_MS = 60000 // 1 minute
    private static final long MIN_CONNECTION_INTERVAL_MS = 1000 // 1 second between connections

    @Override
    Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class)

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            return handleWebSocketConnection(accessor, message)
        } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            return handleSubscription(accessor, message)
        }

        return message
    }

    private Message<?> handleWebSocketConnection(StompHeaderAccessor accessor, Message<?> message) {
        String clientIp = getClientIpAddress(accessor)

        // Apply rate limiting for WebSocket connections
        if (!isConnectionAllowed(clientIp)) {
            log.warn("WebSocket connection rate limit exceeded for IP: {}", clientIp)
            throw new SecurityException("Connection rate limit exceeded")
        }

        String authToken = accessor.getFirstNativeHeader("Authorization")

        if (authToken != null && authToken.startsWith("Bearer ")) {
            String token = authToken.substring(7)
            return authenticateConnection(accessor, token, clientIp)
        } else {
            // For guest users, allow connection but mark as unauthenticated
            log.info("WebSocket connection from unauthenticated user, IP: {}", clientIp)
            accessor.getSessionAttributes().put("authenticated", false)
            accessor.getSessionAttributes().put("clientIp", clientIp)
            recordConnectionAttempt(clientIp)
            return message
        }
    }

    private Message<?> authenticateConnection(StompHeaderAccessor accessor, String token, String clientIp) {
        try {
            String username = jwtConfig.extractUsername(token)

            if (username != null && jwtConfig.validateToken(token)) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(username)
                Authentication authentication = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities()
                )

                accessor.setUser(authentication)
                SecurityContextHolder.getContext().setAuthentication(authentication)

                // Store authentication info in session attributes
                accessor.getSessionAttributes().put("authenticated", true)
                accessor.getSessionAttributes().put("userId", userDetails.getId().toString())
                accessor.getSessionAttributes().put("userEmail", username)
                accessor.getSessionAttributes().put("clientIp", clientIp)

                recordConnectionAttempt(clientIp)
                log.info("WebSocket authentication successful for user: {} from IP: {}", username, clientIp)
            } else {
                log.warn("Invalid JWT token provided for WebSocket connection from IP: {}", clientIp)
                throw new SecurityException("Invalid authentication token")
            }
        } catch (Exception e) {
            log.error("WebSocket authentication failed for IP {}: {}", clientIp, e.getMessage())
            throw new SecurityException("Authentication failed: " + e.getMessage())
        }

        return message
    }

    private Message<?> handleSubscription(StompHeaderAccessor accessor, Message<?> message) {
        String destination = accessor.getDestination()
        Boolean isAuthenticated = (Boolean) accessor.getSessionAttributes().get("authenticated")
        String userId = (String) accessor.getSessionAttributes().get("userId")

        if (destination == null) {
            log.warn("Subscription attempt without destination")
            throw new SecurityException("Invalid subscription: missing destination")
        }

        // Apply subscription authorization rules
        if (!isSubscriptionAuthorized(destination, isAuthenticated, userId)) {
            log.warn("Unauthorized subscription attempt to {} by user {} (authenticated: {})",
                    destination, userId, isAuthenticated)
            throw new SecurityException("Unauthorized subscription to: " + destination)
        }

        log.debug("Authorized subscription to {} by user {} (authenticated: {})",
                destination, userId, isAuthenticated)
        return message
    }

    private boolean isSubscriptionAuthorized(String destination, Boolean isAuthenticated, String userId) {
        // Public slot updates - allow for both authenticated and unauthenticated users
        if (destination.startsWith("/topic/slots/") || destination.startsWith("slots.")) {
            return true
        }

        // User-specific notifications - require authentication and user ownership
        if (destination.startsWith("/topic/notifications/") || destination.startsWith("notifications.")) {
            if (!isAuthenticated) {
                return false
            }
            // Extract user ID from destination and verify ownership
            String destinationUserId = extractUserIdFromDestination(destination)
            return userId != null && userId.equals(destinationUserId)
        }

        // Appointment updates - require authentication and user ownership
        if (destination.startsWith("/topic/appointments/") || destination.startsWith("appointments.")) {
            if (!isAuthenticated) {
                return false
            }
            String destinationUserId = extractUserIdFromDestination(destination)
            return userId != null && userId.equals(destinationUserId)
        }

        // Shop-specific updates - require authentication (shop ownership will be verified separately)
        if (destination.startsWith("/topic/shop/") || destination.startsWith("shop.")) {
            return isAuthenticated
        }

        // Default: deny unknown destinations
        log.warn("Unknown destination pattern: {}", destination)
        return false
    }

    private String extractUserIdFromDestination(String destination) {
        // Extract user ID from destinations like "/topic/notifications/123" or "notifications.123"
        String[] parts = destination.split("[./]")
        if (parts.length >= 2) {
            return parts[parts.length - 1] // Last part should be user ID
        }
        return null
    }

    private boolean isConnectionAllowed(String clientIp) {
        long currentTime = System.currentTimeMillis()

        // Check minimum interval between connections
        Long lastConnection = lastConnectionTime.get(clientIp)
        if (lastConnection != null && (currentTime - lastConnection) < MIN_CONNECTION_INTERVAL_MS) {
            return false
        }

        // Check connection count within window
        Long attempts = connectionAttempts.get(clientIp)
        if (attempts != null && attempts >= MAX_CONNECTIONS_PER_IP) {
            return false
        }

        return true
    }

    private void recordConnectionAttempt(String clientIp) {
        long currentTime = System.currentTimeMillis()
        lastConnectionTime.put(clientIp, currentTime)

        // Clean up old entries and increment counter
        connectionAttempts.compute(clientIp, { ip, count ->
            // Reset counter if window has passed
            Long lastTime = lastConnectionTime.get(ip)
            if (lastTime != null && (currentTime - lastTime) > CONNECTION_WINDOW_MS) {
                return 1L
            }
            return (count ?: 0L) + 1L
        })
    }

    private String getClientIpAddress(StompHeaderAccessor accessor) {
        // Try to get real IP from headers (in case of proxy/load balancer)
        String xForwardedFor = accessor.getFirstNativeHeader("X-Forwarded-For")
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim()
        }

        String xRealIp = accessor.getFirstNativeHeader("X-Real-IP")
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp
        }

        // Fallback to session remote address if available
        return accessor.getSessionAttributes().get("REMOTE_ADDRESS")?.toString() ?: "unknown"
    }
}
