package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.dto.websocket.*
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import groovy.util.logging.Slf4j
import org.springframework.web.socket.WebSocketSession
import org.springframework.web.socket.TextMessage

import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong
import java.time.Instant

/**
 * Enhanced WebSocket service with standardized messaging, heartbeat, and reliability features
 * Only enabled when STOMP is enabled
 */
@Service
@ConditionalOnProperty(name = "websocket.stomp.enabled", havingValue = "true")
@Slf4j
class EnhancedWebSocketService {

    @Autowired
    private SimpMessagingTemplate messagingTemplate

    @Autowired
    private WebSocketMonitoringService monitoringService

    @Autowired
    private ObjectMapper objectMapper

    // Message delivery tracking
    private final Map<String, WebSocketMessageEnvelope> pendingMessages = new ConcurrentHashMap<>()
    private final Map<String, Long> lastHeartbeat = new ConcurrentHashMap<>()
    private final AtomicLong messageCounter = new AtomicLong(0)

    // Heartbeat configuration
    private static final long HEARTBEAT_INTERVAL_MS = 25000 // 25 seconds
    private static final long HEARTBEAT_TIMEOUT_MS = 60000 // 60 seconds
    private static final long MESSAGE_RETRY_DELAY_MS = 5000 // 5 seconds

    /**
     * Send a standardized WebSocket message
     */
    void sendMessage(WebSocketMessageEnvelope envelope) {
        try {
            validateMessage(envelope)
            
            // Set message ID if not present
            if (!envelope.messageId) {
                envelope.messageId = generateMessageId()
            }

            // Send via STOMP if topic is specified
            if (envelope.topic) {
                sendToTopic(envelope)
            } else {
                log.warn("Message without topic cannot be sent: {}", envelope.messageId)
            }

            // Track message for potential retry
            if (envelope.priority == MessagePriority.HIGH) {
                pendingMessages.put(envelope.messageId, envelope)
            }

            log.debug("Sent WebSocket message: {} to topic: {}", envelope.messageId, envelope.topic)

        } catch (Exception e) {
            log.error("Failed to send WebSocket message: {}", e.getMessage(), e)
            envelope.setError("SEND_FAILED", "Failed to send message: " + e.getMessage())
        }
    }

    /**
     * Send slot update message
     */
    void sendSlotUpdate(SlotUpdateMessage slotUpdate) {
        WebSocketMessageEnvelope envelope = slotUpdate.toMessageEnvelope()
        sendMessage(envelope)
        
        // Also send to legacy format for backward compatibility
        sendToTopic("/topic/" + slotUpdate.getTopic(), slotUpdate)
    }

    /**
     * Send notification message
     */
    void sendNotification(NotificationMessage notification) {
        WebSocketMessageEnvelope envelope = notification.toMessageEnvelope()
        sendMessage(envelope)
        
        // Also send to user-specific queue
        sendToUser(notification.userId, "/queue/notifications", notification)
    }

    /**
     * Send heartbeat to all connected clients
     */
    @Scheduled(fixedRate = HEARTBEAT_INTERVAL_MS)
    void sendHeartbeat() {
        try {
            HeartbeatMessage heartbeat = new HeartbeatMessage(HeartbeatType.PING)
            heartbeat.addStat("activeConnections", monitoringService.getActiveConnectionCount())
            heartbeat.addStat("serverTime", Instant.now().toString())
            
            WebSocketMessageEnvelope envelope = heartbeat.toMessageEnvelope()
            
            // Send heartbeat to all connected sessions
            monitoringService.getActiveSessions().each { sessionId, session ->
                try {
                    if (session.isOpen()) {
                        String message = objectMapper.writeValueAsString(envelope)
                        session.sendMessage(new TextMessage(message))
                        lastHeartbeat.put(sessionId, System.currentTimeMillis())
                    }
                } catch (Exception e) {
                    log.debug("Failed to send heartbeat to session {}: {}", sessionId, e.getMessage())
                }
            }

            log.debug("Sent heartbeat to {} active sessions", monitoringService.getActiveConnectionCount())

        } catch (Exception e) {
            log.error("Failed to send heartbeat: {}", e.getMessage(), e)
        }
    }

    /**
     * Check for dead connections and clean up
     */
    @Scheduled(fixedRate = 30000) // Every 30 seconds
    void checkConnectionHealth() {
        long currentTime = System.currentTimeMillis()
        List<String> deadSessions = []

        lastHeartbeat.each { sessionId, lastTime ->
            if ((currentTime - lastTime) > HEARTBEAT_TIMEOUT_MS) {
                deadSessions.add(sessionId)
                log.info("Detected dead WebSocket session: {}", sessionId)
            }
        }

        // Clean up dead sessions
        deadSessions.each { sessionId ->
            lastHeartbeat.remove(sessionId)
            // The monitoring service will handle session cleanup
        }
    }

    /**
     * Retry failed high-priority messages
     */
    @Scheduled(fixedRate = MESSAGE_RETRY_DELAY_MS)
    void retryFailedMessages() {
        List<String> expiredMessages = []

        pendingMessages.each { messageId, envelope ->
            if (envelope.isExpired()) {
                expiredMessages.add(messageId)
                log.warn("Message expired: {}", messageId)
            } else if (envelope.canRetry()) {
                envelope.incrementRetry()
                log.info("Retrying message: {} (attempt {})", messageId, envelope.retryCount)
                sendMessage(envelope)
            } else {
                expiredMessages.add(messageId)
                log.error("Message failed after {} retries: {}", envelope.maxRetries, messageId)
            }
        }

        // Clean up expired/failed messages
        expiredMessages.each { messageId ->
            pendingMessages.remove(messageId)
        }
    }

    /**
     * Handle heartbeat response from client
     */
    void handleHeartbeatResponse(String sessionId, HeartbeatMessage heartbeat) {
        if (heartbeat.type == HeartbeatType.PONG) {
            lastHeartbeat.put(sessionId, System.currentTimeMillis())
            log.debug("Received heartbeat response from session: {}", sessionId)
        }
    }

    /**
     * Acknowledge message delivery
     */
    void acknowledgeMessage(String messageId) {
        if (pendingMessages.remove(messageId) != null) {
            log.debug("Message acknowledged: {}", messageId)
        }
    }

    /**
     * Send message to specific topic
     */
    private void sendToTopic(WebSocketMessageEnvelope envelope) {
        try {
            messagingTemplate.convertAndSend("/topic/" + envelope.topic, envelope)
        } catch (Exception e) {
            log.error("Failed to send message to topic {}: {}", envelope.topic, e.getMessage())
            throw e
        }
    }

    /**
     * Send message to specific topic (legacy method)
     */
    private void sendToTopic(String topic, Object message) {
        try {
            messagingTemplate.convertAndSend(topic, message)
        } catch (Exception e) {
            log.error("Failed to send message to topic {}: {}", topic, e.getMessage())
        }
    }

    /**
     * Send message to specific user
     */
    private void sendToUser(String userId, String destination, Object message) {
        try {
            messagingTemplate.convertAndSendToUser(userId, destination, message)
        } catch (Exception e) {
            log.error("Failed to send message to user {} at {}: {}", userId, destination, e.getMessage())
        }
    }

    /**
     * Validate message before sending
     */
    private void validateMessage(WebSocketMessageEnvelope envelope) {
        if (!envelope.type) {
            throw new IllegalArgumentException("Message type is required")
        }
        if (!envelope.payload) {
            throw new IllegalArgumentException("Message payload is required")
        }
        if (envelope.isExpired()) {
            throw new IllegalArgumentException("Message has expired")
        }
    }

    /**
     * Generate unique message ID
     */
    private String generateMessageId() {
        return "msg_${System.currentTimeMillis()}_${messageCounter.incrementAndGet()}"
    }

    /**
     * Get connection statistics
     */
    Map<String, Object> getConnectionStats() {
        return [
            activeConnections: monitoringService.getActiveConnectionCount(),
            pendingMessages: pendingMessages.size(),
            lastHeartbeatCount: lastHeartbeat.size(),
            totalMessagesSent: messageCounter.get()
        ]
    }

    /**
     * Get health status
     */
    Map<String, Object> getHealthStatus() {
        long currentTime = System.currentTimeMillis()
        long healthyConnections = lastHeartbeat.values().count { lastTime ->
            (currentTime - lastTime) <= HEARTBEAT_TIMEOUT_MS
        }

        return [
            status: healthyConnections > 0 ? "UP" : "DOWN",
            activeConnections: monitoringService.getActiveConnectionCount(),
            healthyConnections: healthyConnections,
            pendingMessages: pendingMessages.size(),
            timestamp: Instant.now()
        ]
    }
}
