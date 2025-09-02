package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.config.JwtConfig
import com.ddimitko.beautyhub.security.CustomUserDetailsService
import com.fasterxml.jackson.databind.ObjectMapper
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Service
import org.springframework.web.socket.WebSocketSession
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong
import java.util.Collections

@Service
@ConditionalOnProperty(name = "websocket.enabled", havingValue = "true", matchIfMissing = true)
@Slf4j
class WebSocketMonitoringService {

    @Autowired
    private JwtConfig jwtConfig

    @Autowired
    private CustomUserDetailsService userDetailsService

    @Autowired
    private ObjectMapper objectMapper



    // Session storage for our simplified WebSocket approach
    private final Map<String, WebSocketSession> activeSessions = new ConcurrentHashMap<>()

    private final Map<String, SessionInfo> sessionInfoMap = new ConcurrentHashMap<>()

    // Performance optimization: Topic-based subscription management
    // Map<topic, Set<sessionId>> for efficient topic-based message delivery
    private final Map<String, Set<String>> topicSubscriptions = new ConcurrentHashMap<>()

    // Heartbeat tracking
    private final Map<String, Long> lastHeartbeat = new ConcurrentHashMap<>()
    private static final long HEARTBEAT_TIMEOUT_MS = 60000 // 60 seconds

    // Map<sessionId, Set<topic>> for efficient cleanup when session disconnects
    private final Map<String, Set<String>> sessionTopics = new ConcurrentHashMap<>()

    private final AtomicLong totalConnections = new AtomicLong(0)
    private final AtomicLong totalDisconnections = new AtomicLong(0)
    private final AtomicLong totalMessages = new AtomicLong(0)

    static class SessionInfo {
        String sessionId
        String userId
        long connectTime
        long lastActivity
        int messageCount

        SessionInfo(String sessionId, String userId) {
            this.sessionId = sessionId
            this.userId = userId
            this.connectTime = System.currentTimeMillis()
            this.lastActivity = connectTime
            this.messageCount = 0
        }
    }

    /**
     * Register a new WebSocket session
     */
    void registerSession(WebSocketSession session) {
        String sessionId = session.getId()
        String userId = extractUserId(session)

        log.info("WebSocket session connected: sessionId={}, userId={}", sessionId, userId)

        activeSessions.put(sessionId, session)
        sessionInfoMap.put(sessionId, new SessionInfo(sessionId, userId))
        totalConnections.incrementAndGet()


    }

    /**
     * Unregister a WebSocket session
     */
    void unregisterSession(WebSocketSession session) {
        String sessionId = session.getId()

        activeSessions.remove(sessionId)
        SessionInfo sessionInfo = sessionInfoMap.remove(sessionId)

        // Performance optimization: Clean up topic subscriptions for this session
        Set<String> sessionTopicsSet = sessionTopics.remove(sessionId)
        log.info("🔧 Cleaning up session {} topics: {}", sessionId, sessionTopicsSet)
        if (sessionTopicsSet) {
            sessionTopicsSet.each { topic ->
                Set<String> subscribers = topicSubscriptions.get(topic)
                if (subscribers) {
                    boolean removed = subscribers.remove(sessionId)
                    log.info("🔧 Removed session {} from topic {}: {}", sessionId, topic, removed)
                    // Remove empty topic entries to prevent memory leaks
                    if (subscribers.isEmpty()) {
                        topicSubscriptions.remove(topic)
                        log.info("🔧 Removed empty topic: {}", topic)
                    }
                }
            }
        }

        if (sessionInfo) {
            long sessionDuration = System.currentTimeMillis() - sessionInfo.connectTime
            log.info("WebSocket session disconnected: sessionId={}, userId={}, duration={}ms, messages={}, topics={}",
                    sessionId, sessionInfo.userId, sessionDuration, sessionInfo.messageCount,
                    sessionTopicsSet?.size() ?: 0)
        }

        totalDisconnections.incrementAndGet()


    }

    /**
     * Record message activity for a session
     */
    void recordMessage(String sessionId) {
        SessionInfo sessionInfo = sessionInfoMap.get(sessionId)
        if (sessionInfo) {
            sessionInfo.messageCount++
            sessionInfo.lastActivity = System.currentTimeMillis()
        }
        totalMessages.incrementAndGet()
    }

    /**
     * Extract user ID from WebSocket session (if available)
     */
    private String extractUserId(WebSocketSession session) {
        // Try to extract user ID from session attributes or headers
        return session.getAttributes().get("userId") as String ?: "anonymous"
    }

    /**
     * Authenticate a WebSocket session with JWT token
     */
    void authenticateSession(String sessionId, String token) {
        try {
            if (jwtConfig.validateToken(token)) {
                String userEmail = jwtConfig.extractUsername(token)

                // Load user details to get user ID
                def userDetails = userDetailsService.loadUserByUsername(userEmail)
                String userId = userDetails.getId().toString()

                // Update session info with authenticated user ID
                SessionInfo sessionInfo = sessionInfoMap.get(sessionId)
                if (sessionInfo) {
                    sessionInfo.userId = userId
                    log.info("Session {} authenticated as user: {} ({})", sessionId, userEmail, userId)
                } else {
                    log.warn("Session {} not found for authentication", sessionId)
                }

                // Store user ID in session attributes for future reference
                WebSocketSession session = activeSessions.get(sessionId)
                if (session) {
                    session.getAttributes().put("userId", userId)
                    session.getAttributes().put("userEmail", userEmail)
                    session.getAttributes().put("authenticated", true)
                }
            } else {
                log.warn("Invalid token provided for session authentication: {}", sessionId)
            }
        } catch (Exception e) {
            log.error("Failed to authenticate session {}: {}", sessionId, e.getMessage())
        }
    }



    /**
     * Get current WebSocket statistics
     */
    Map<String, Object> getConnectionStats() {
        return [
            activeConnections: activeSessions.size(),
            totalConnections: totalConnections.get(),
            totalDisconnections: totalDisconnections.get(),
            totalMessages: totalMessages.get(),
            sessions: sessionInfoMap.values().collect { session ->
                [
                    sessionId: session.sessionId,
                    userId: session.userId,
                    connectTime: session.connectTime,
                    lastActivity: session.lastActivity,
                    messageCount: session.messageCount
                ]
            }
        ]
    }

    /**
     * Send message to all connected users via WebSocket
     */
    void broadcastToAll(String message) {
        log.info("Broadcasting message to all {} connected users", activeSessions.size())

        try {
            // Properly serialize the message to JSON
            String jsonMessage = objectMapper.writeValueAsString([
                message: message,
                timestamp: System.currentTimeMillis(),
                activeUsers: activeSessions.size()
            ])

            activeSessions.values().each { session ->
                try {
                    if (session.isOpen()) {
                        session.sendMessage(new org.springframework.web.socket.TextMessage(jsonMessage))
                    }
                } catch (Exception e) {
                    log.error("Failed to send message to session {}: {}", session.getId(), e.getMessage())
                }
            }
        } catch (Exception e) {
            log.error("Failed to serialize broadcast message: {}", e.getMessage(), e)
        }
    }

    /**
     * Send message to specific user sessions
     */
    void sendToUser(String userId, Object message) {
        log.info("Sending message to user: userId={}, message type: {}", userId, message?.getClass()?.getSimpleName())

        try {
            // Check if the message is already in the correct format for frontend
            String jsonMessage
            if (message instanceof Map && message.containsKey('type')) {
                // Message is already in frontend format, just add timestamp
                Map messageMap = (Map) message
                messageMap.put('timestamp', System.currentTimeMillis())
                jsonMessage = objectMapper.writeValueAsString(messageMap)
            } else {
                // Legacy format - wrap in message envelope
                jsonMessage = objectMapper.writeValueAsString([
                    message: message,
                    timestamp: System.currentTimeMillis()
                ])
            }

            log.debug("Serialized message for user {}: {}", userId, jsonMessage)

            int sentCount = 0
            sessionInfoMap.values().findAll { it.userId == userId }.each { sessionInfo ->
                WebSocketSession session = activeSessions.get(sessionInfo.sessionId)
                if (session && session.isOpen()) {
                    try {
                        session.sendMessage(new org.springframework.web.socket.TextMessage(jsonMessage))
                        sentCount++
                        log.debug("Successfully sent message to user {} session {}", userId, session.getId())
                    } catch (Exception e) {
                        log.error("Failed to send message to user {} session {}: {}", userId, session.getId(), e.getMessage())
                    }
                } else {
                    log.debug("Session {} for user {} is not open or not found", sessionInfo.sessionId, userId)
                }
            }

            log.info("Sent message to user {} - {} sessions reached", userId, sentCount)
        } catch (Exception e) {
            log.error("Failed to serialize message for user {}: {}", userId, e.getMessage(), e)
        }
    }

    /**
     * Get sessions for a specific user
     */
    List<SessionInfo> getUserSessions(String userId) {
        return sessionInfoMap.values().findAll { it.userId == userId }
    }

    /**
     * Check if user is currently connected
     */
    boolean isUserConnected(String userId) {
        return sessionInfoMap.values().any { it.userId == userId }
    }

    /**
     * Get session count by user
     */
    Map<String, Integer> getSessionCountByUser() {
        Map<String, Integer> userCounts = [:]
        sessionInfoMap.values().each { session ->
            if (session.userId) {
                userCounts[session.userId] = (userCounts[session.userId] ?: 0) + 1
            }
        }
        return userCounts
    }

    /**
     * Performance-optimized: Subscribe a session to a specific topic
     */
    void subscribeToTopic(String sessionId, String topic) {
        log.info("🔧 Starting subscription: session={}, topic={}", sessionId, topic)

        // Add session to topic subscribers using proper concurrent set
        Set<String> subscribers = topicSubscriptions.computeIfAbsent(topic) {
            Collections.newSetFromMap(new ConcurrentHashMap<String, Boolean>())
        }
        boolean added = subscribers.add(sessionId)
        log.info("🔧 Added session to topic subscribers: {}", added)

        // Track topics for this session for cleanup
        Set<String> sessionTopicsSet = sessionTopics.computeIfAbsent(sessionId) {
            Collections.newSetFromMap(new ConcurrentHashMap<String, Boolean>())
        }
        boolean topicAdded = sessionTopicsSet.add(topic)
        log.info("🔧 Added topic to session topics: {}", topicAdded)

        // Enhanced logging to debug subscription issues
        Set<String> finalSubscribers = topicSubscriptions.get(topic)
        log.info("✅ Session {} subscribed to topic: {} (now has {} subscribers: {})",
                sessionId, topic, finalSubscribers?.size() ?: 0, finalSubscribers)
    }

    /**
     * Performance-optimized: Unsubscribe a session from a specific topic
     */
    void unsubscribeFromTopic(String sessionId, String topic) {
        log.info("🔧 Starting unsubscription: session={}, topic={}", sessionId, topic)

        Set<String> subscribers = topicSubscriptions.get(topic)
        if (subscribers) {
            boolean removed = subscribers.remove(sessionId)
            log.info("🔧 Removed session from topic subscribers: {}", removed)
            if (subscribers.isEmpty()) {
                topicSubscriptions.remove(topic)
                log.info("🔧 Removed empty topic: {}", topic)
            }
        }

        Set<String> sessionTopicsSet = sessionTopics.get(sessionId)
        if (sessionTopicsSet) {
            boolean topicRemoved = sessionTopicsSet.remove(topic)
            log.info("🔧 Removed topic from session topics: {}", topicRemoved)
        }

        log.info("✅ Session {} unsubscribed from topic: {}", sessionId, topic)
    }

    /**
     * Performance-optimized: Send message only to subscribers of a specific topic
     */
    void broadcastToTopic(String topic, String message) {
        Set<String> subscribers = topicSubscriptions.get(topic)
        log.info("🔍 Broadcasting to topic '{}' - Subscribers: {} ({})", topic, subscribers?.size() ?: 0, subscribers)
        log.info("🔍 All available topics: {}", topicSubscriptions.keySet())
        log.info("🔍 Topic subscriptions map: {}", topicSubscriptions.collectEntries { k, v -> [k, v.size()] })

        if (!subscribers || subscribers.isEmpty()) {
            log.warn("❌ No subscribers for topic: {} - Available topics: {}", topic, topicSubscriptions.keySet())
            return
        }

        log.info("Broadcasting to topic '{}' with {} subscribers", topic, subscribers.size())

        int successCount = 0
        int failureCount = 0

        subscribers.each { sessionId ->
            WebSocketSession session = activeSessions.get(sessionId)
            if (session && session.isOpen()) {
                try {
                    session.sendMessage(new org.springframework.web.socket.TextMessage(message))
                    successCount++
                    log.debug("Message sent to session: {}", sessionId)
                } catch (Exception e) {
                    log.warn("Failed to send message to session {}: {}", sessionId, e.getMessage())
                    failureCount++
                }
            } else {
                // Session is closed, remove from subscriptions
                log.debug("Removing closed session {} from topic {}", sessionId, topic)
                unsubscribeFromTopic(sessionId, topic)
                failureCount++
            }
        }

        log.info("Topic '{}' broadcast complete: {} success, {} failures", topic, successCount, failureCount)
    }

    /**
     * Get topic subscription statistics
     */
    Map<String, Object> getTopicStats() {
        return [
            totalTopics: topicSubscriptions.size(),
            topicSubscriptions: topicSubscriptions.collectEntries { topic, subscribers ->
                [topic, subscribers.size()]
            },
            averageSubscriptionsPerSession: sessionTopics.isEmpty() ? 0 :
                sessionTopics.values().sum { it.size() } / sessionTopics.size()
        ]
    }

    /**
     * Get detailed debug information about subscriptions
     */
    Map<String, Object> getDebugSubscriptions() {
        return [
            topicSubscriptions: topicSubscriptions.collectEntries { topic, subscribers ->
                [topic, subscribers.toList()]
            },
            sessionTopics: sessionTopics.collectEntries { sessionId, topics ->
                [sessionId, topics.toList()]
            },
            activeSessions: activeSessions.keySet().toList(),
            sessionInfo: sessionInfoMap.collectEntries { sessionId, info ->
                [sessionId, [
                    userId: info.userId,
                    connectTime: info.connectTime,
                    messageCount: info.messageCount
                ]]
            }
        ]
    }

    /**
     * Get active connection count for Prometheus metrics
     */
    long getActiveConnectionCount() {
        return activeSessions.size()
    }

    /**
     * Record heartbeat from client
     */
    void recordHeartbeat(String sessionId) {
        lastHeartbeat.put(sessionId, System.currentTimeMillis())
        log.debug("💓 Heartbeat recorded for session: {}", sessionId)
    }

    /**
     * Check if session is healthy (recent heartbeat)
     */
    boolean isSessionHealthy(String sessionId) {
        Long lastTime = lastHeartbeat.get(sessionId)
        if (lastTime == null) {
            return false
        }
        return (System.currentTimeMillis() - lastTime) <= HEARTBEAT_TIMEOUT_MS
    }

    /**
     * Get healthy session count
     */
    long getHealthySessionCount() {
        long currentTime = System.currentTimeMillis()
        return lastHeartbeat.values().count { lastTime ->
            (currentTime - lastTime) <= HEARTBEAT_TIMEOUT_MS
        }
    }

    /**
     * Clean up dead sessions based on heartbeat timeout
     */
    void cleanupDeadSessions() {
        long currentTime = System.currentTimeMillis()
        List<String> deadSessions = []

        lastHeartbeat.each { sessionId, lastTime ->
            if ((currentTime - lastTime) > HEARTBEAT_TIMEOUT_MS) {
                deadSessions.add(sessionId)
            }
        }

        deadSessions.each { sessionId ->
            log.info("Cleaning up dead session: {}", sessionId)
            lastHeartbeat.remove(sessionId)

            // Remove from active sessions if still present
            WebSocketSession session = activeSessions.get(sessionId)
            if (session) {
                try {
                    session.close()
                } catch (Exception e) {
                    log.debug("Error closing dead session {}: {}", sessionId, e.getMessage())
                }
                unregisterSession(session)
            }
        }
    }

    /**
     * Get active sessions map (for heartbeat sending)
     */
    Map<String, WebSocketSession> getActiveSessions() {
        return new HashMap<>(activeSessions)
    }

    /**
     * Get total connections count for Prometheus metrics
     */
    long getTotalConnections() {
        return totalConnections.get()
    }
}
