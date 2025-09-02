package com.ddimitko.beautyhub.config

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.server.reactive.ServerHttpResponse
import org.springframework.messaging.MessageChannel
import org.springframework.messaging.support.ExecutorSubscribableChannel
import org.springframework.web.socket.*
import org.springframework.web.socket.config.annotation.EnableWebSocket
import org.springframework.web.socket.config.annotation.WebSocketConfigurer
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry
import org.springframework.web.socket.server.support.DefaultHandshakeHandler
import org.springframework.http.server.ServerHttpRequest
import com.ddimitko.beautyhub.service.WebSocketMonitoringService
import groovy.util.logging.Slf4j
import com.fasterxml.jackson.databind.ObjectMapper
import java.security.Principal
import java.util.Arrays

@Configuration
@EnableWebSocket
@ConditionalOnProperty(name = "websocket.enabled", havingValue = "true", matchIfMissing = true)
@Slf4j
class WebSocketConfig implements WebSocketConfigurer {

    @Value('${app.websocket.allowed-origins}')
    private String allowedOrigins

    // Constructor to log when this configuration is loaded
    WebSocketConfig() {
        log.info("🔧 WebSocketConfig is being loaded...")
    }

    @Autowired
    private WebSocketMonitoringService monitoringService

    @Autowired
    private ObjectMapper objectMapper

    /**
     * Create a custom message channel for our application-specific messaging.
     * This is used by our RabbitMQ integration for reliable message processing.
     */
    @Bean
    @ConditionalOnProperty(name = "websocket.enabled", havingValue = "true", matchIfMissing = true)
    MessageChannel applicationMessageChannel() {
        ExecutorSubscribableChannel channel = new ExecutorSubscribableChannel()
        channel.setBeanName("applicationMessageChannel")
        return channel
    }

    /**
     * WebSocket handler for real-time notifications.
     * This approach avoids Spring Boot 3.5 STOMP broker relay issues.
     */
    @Bean
    @ConditionalOnProperty(name = "websocket.enabled", havingValue = "true", matchIfMissing = true)
    WebSocketHandler notificationWebSocketHandler() {
        def monitoringServiceRef = monitoringService
        def objectMapperRef = objectMapper
        return new WebSocketHandler() {
            @Override
            void afterConnectionEstablished(WebSocketSession session) throws Exception {
                log.info("WebSocket connection established: {}", session.getId())
                monitoringServiceRef.registerSession(session)
            }

            @Override
            void handleMessage(WebSocketSession session, WebSocketMessage<?> message) throws Exception {
                log.debug("WebSocket message received: {}", message.getPayload())
                monitoringServiceRef.recordMessage(session.getId())

                // Handle subscription messages for performance optimization
                def payload = message.getPayload().toString()
                try {
                    if (payload.startsWith('{')) {
                        def messageData = objectMapperRef.readValue(payload, Map.class)

                        if (messageData.type == 'authenticate' && messageData.token) {
                            // Authenticate user and associate with session
                            log.info("Authenticating session {} with token", session.getId())
                            monitoringServiceRef.authenticateSession(session.getId(), messageData.token.toString())

                            // Check if session is still open before sending response
                            if (session.isOpen()) {
                                session.sendMessage(new TextMessage("""{"type":"authentication_confirmed","authenticated":true}"""))
                                log.info("✅ Authentication confirmation sent to session {}", session.getId())
                            } else {
                                log.warn("⚠️ Cannot send authentication confirmation - session {} is closed", session.getId())
                            }
                            return
                        } else if (messageData.type == 'subscribe' && messageData.topic) {
                            // Subscribe session to specific topic (allow both authenticated and unauthenticated users)
                            String topic = messageData.topic.toString()
                            log.info("📡 Subscribing session {} to topic: {}", session.getId(), topic)

                            // Check if this is a slot update topic - allow unauthenticated access
                            boolean isSlotTopic = topic.startsWith('slots.')
                            boolean isAuthenticated = session.getAttributes().get("authenticated") == true

                            if (isSlotTopic || isAuthenticated) {
                                monitoringServiceRef.subscribeToTopic(session.getId(), topic)

                                // Send enhanced confirmation with more details
                                def confirmationMessage = [
                                    type: "subscription_confirmed",
                                    topic: topic,
                                    sessionId: session.getId(),
                                    timestamp: System.currentTimeMillis(),
                                    authenticated: isAuthenticated
                                ]

                                // Check if session is still open before sending confirmation
                                if (session.isOpen()) {
                                    session.sendMessage(new TextMessage(objectMapperRef.writeValueAsString(confirmationMessage)))
                                    log.info("✅ Subscription confirmed for session {} to topic: {}", session.getId(), topic)
                                } else {
                                    log.warn("⚠️ Cannot send subscription confirmation - session {} is closed", session.getId())
                                }
                            } else {
                                // Require authentication for non-slot topics
                                def denialMessage = [
                                    type: "subscription_denied",
                                    topic: topic,
                                    reason: "Authentication required",
                                    timestamp: System.currentTimeMillis()
                                ]
                                // Check if session is still open before sending denial
                                if (session.isOpen()) {
                                    session.sendMessage(new TextMessage(objectMapperRef.writeValueAsString(denialMessage)))
                                    log.warn("❌ Subscription denied for unauthenticated session {} to topic: {}", session.getId(), topic)
                                } else {
                                    log.warn("⚠️ Cannot send subscription denial - session {} is closed", session.getId())
                                }
                            }
                            return
                        } else if (messageData.type == 'unsubscribe' && messageData.topic) {
                            // Unsubscribe session from specific topic
                            String topic = messageData.topic.toString()
                            log.info("🔌 Unsubscribing session {} from topic: {}", session.getId(), topic)
                            monitoringServiceRef.unsubscribeFromTopic(session.getId(), topic)

                            def confirmationMessage = [
                                type: "unsubscription_confirmed",
                                topic: topic,
                                sessionId: session.getId(),
                                timestamp: System.currentTimeMillis()
                            ]

                            session.sendMessage(new TextMessage(objectMapperRef.writeValueAsString(confirmationMessage)))
                            log.info("✅ Unsubscription confirmed for session {} from topic: {}", session.getId(), topic)
                            return
                        }
                    }
                } catch (Exception e) {
                    log.debug("Message not a subscription request: {}", e.getMessage())
                }

                // Don't echo subscription/unsubscription messages or any control messages
                // Only echo simple test messages
                if (!payload.startsWith('{')) {
                    session.sendMessage(new TextMessage("Echo: " + message.getPayload()))
                }
            }

            @Override
            void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
                log.error("WebSocket transport error for session {}: {}", session.getId(), exception.getMessage())

                // Enhanced error logging for different types of issues
                if (exception.getMessage()?.contains("SSL") || exception.getMessage()?.contains("TLS")) {
                    log.error("SSL/TLS error detected for session {}: {}", session.getId(), exception.getMessage())
                    log.error("SSL error details: ", exception)
                } else if (exception.getMessage()?.contains("handshake")) {
                    log.error("Handshake error for session {}: {}", session.getId(), exception.getMessage())
                } else if (exception.getMessage()?.contains("Broken pipe")) {
                    log.warn("Client disconnected unexpectedly for session {}: {}", session.getId(), exception.getMessage())
                    // Don't log full stack trace for broken pipe - it's usually client-side
                } else if (exception instanceof java.io.IOException) {
                    log.warn("IO error for session {}: {}", session.getId(), exception.getMessage())
                } else {
                    log.debug("Transport error details: ", exception)
                }
            }

            @Override
            void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) throws Exception {
                log.info("WebSocket connection closed: {} with status: {}", session.getId(), closeStatus)
                monitoringServiceRef.unregisterSession(session)
            }

            @Override
            boolean supportsPartialMessages() {
                return false
            }
        }
    }

    // WebSocket Handler Configuration
    @Override
    void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        String[] origins = allowedOrigins.split(",")
        log.info("Configuring WebSocket handlers with allowed origins: {}", Arrays.toString(origins))

        // Register WebSocket endpoints for real-time communication
        // Use /ws-notifications to avoid conflict with /api/notifications REST endpoints
        registry.addHandler(notificationWebSocketHandler(), "/ws-notifications")
                .setAllowedOriginPatterns(origins)
                .withSockJS()
                .setHeartbeatTime(25000) // Send heartbeat every 25 seconds
                .setDisconnectDelay(5000) // Wait 5 seconds before disconnecting

        registry.addHandler(notificationWebSocketHandler(), "/ws")
                .setAllowedOriginPatterns(origins)
                .setHandshakeHandler(new DefaultHandshakeHandler() {
                    @Override
                    protected Principal determineUser(ServerHttpRequest request, WebSocketHandler wsHandler, Map<String, Object> attributes) {
                        // Enhanced logging for HTTPS connections
                        log.info("WebSocket handshake - Protocol: {}, Host: {}, Origin: {}",
                                request.getURI().getScheme(),
                                request.getHeaders().getHost(),
                                request.getHeaders().getOrigin())

                        // Add SSL debugging for development
                        if (request.getURI().getScheme() == "wss") {
                            log.info("WSS connection detected - SSL handshake in progress")
                        }

                        return super.determineUser(request, wsHandler, attributes)
                    }
                })

        log.info("✅ WebSocket handlers registered: /ws-notifications (SockJS), /ws (Native)")
        log.info("🔒 HTTPS WebSocket support enabled for origins: {}", Arrays.toString(origins))
    }

    /**
     * Check if subscription is authorized based on topic and user authentication
     */
    private boolean isSubscriptionAuthorized(String topic, boolean isAuthenticated, String userId) {
        // Public slot updates - allow for both authenticated and unauthenticated users
        if (topic.startsWith("slots.")) {
            return true
        }

        // User-specific notifications - require authentication and user ownership
        if (topic.startsWith("notifications.")) {
            if (!isAuthenticated) {
                return false
            }
            // Extract user ID from topic and verify ownership
            String topicUserId = extractUserIdFromTopic(topic)
            return userId != null && userId.equals(topicUserId)
        }

        // Appointment updates - require authentication and user ownership
        if (topic.startsWith("appointments.")) {
            if (!isAuthenticated) {
                return false
            }
            String topicUserId = extractUserIdFromTopic(topic)
            return userId != null && userId.equals(topicUserId)
        }

        // Shop-specific updates - require authentication
        if (topic.startsWith("shop.")) {
            return isAuthenticated
        }

        // Default: deny unknown topics
        return false
    }

    /**
     * Get reason for subscription denial
     */
    private String getSubscriptionDenialReason(String topic, boolean isAuthenticated, String userId) {
        if (!isAuthenticated) {
            return "Authentication required"
        }

        if (topic.startsWith("notifications.") || topic.startsWith("appointments.")) {
            String topicUserId = extractUserIdFromTopic(topic)
            if (!userId?.equals(topicUserId)) {
                return "Access denied: not authorized for this user's data"
            }
        }

        return "Access denied: unknown topic or insufficient permissions"
    }

    /**
     * Extract user ID from topic string
     */
    private String extractUserIdFromTopic(String topic) {
        String[] parts = topic.split("\\.")
        if (parts.length >= 2) {
            return parts[1] // Second part should be user ID
        }
        return null
    }
}
