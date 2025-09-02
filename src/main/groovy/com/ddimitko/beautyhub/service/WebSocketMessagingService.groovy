package com.ddimitko.beautyhub.service

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Service
import groovy.util.logging.Slf4j
import com.fasterxml.jackson.databind.ObjectMapper

@Service
@ConditionalOnProperty(name = "websocket.enabled", havingValue = "true", matchIfMissing = true)
@Slf4j
class WebSocketMessagingService {

    @Autowired
    private WebSocketMonitoringService webSocketMonitoringService

    @Autowired
    private ObjectMapper objectMapper

    /**
     * Broadcast a message to all connected users
     */
    void broadcastToAll(Object message) {
        try {
            String jsonMessage = createJsonMessage(message)
            webSocketMonitoringService.broadcastToAll(jsonMessage)
            log.debug("Broadcasted message to all users: {}", message)
        } catch (Exception e) {
            log.error("Failed to broadcast message to all users: {}", e.getMessage())
        }
    }

    /**
     * Send a message to a specific user
     */
    void sendToUser(String userId, Object message) {
        try {
            webSocketMonitoringService.sendToUser(userId, message)
            log.debug("Sent message to user {}: {}", userId, message)
        } catch (Exception e) {
            log.error("Failed to send message to user {}: {}", userId, e.getMessage())
        }
    }

    /**
     * Performance-optimized: Broadcast a message only to users subscribed to a specific topic
     */
    void broadcastToTopic(String topic, Object message) {
        try {
            // Create topic message with consistent structure
            Map<String, Object> topicMessage = [
                topic: topic,
                data: message,
                timestamp: System.currentTimeMillis()
            ]

            String jsonMessage = createJsonMessage(topicMessage)

            log.info("Broadcasting to topic '{}' with message: {}", topic, message)

            // Use efficient topic-based broadcasting instead of broadcasting to all users
            webSocketMonitoringService.broadcastToTopic(topic, jsonMessage)
            log.info("Topic broadcast completed for: {}", topic)
        } catch (Exception e) {
            log.error("Failed to broadcast message to topic {}: {}", topic, e.getMessage())
        }
    }

    /**
     * Subscribe a session to a topic for efficient message delivery
     */
    void subscribeSessionToTopic(String sessionId, String topic) {
        try {
            webSocketMonitoringService.subscribeToTopic(sessionId, topic)
            log.debug("Subscribed session {} to topic: {}", sessionId, topic)
        } catch (Exception e) {
            log.error("Failed to subscribe session {} to topic {}: {}", sessionId, topic, e.getMessage())
        }
    }

    /**
     * Unsubscribe a session from a topic
     */
    void unsubscribeSessionFromTopic(String sessionId, String topic) {
        try {
            webSocketMonitoringService.unsubscribeFromTopic(sessionId, topic)
            log.debug("Unsubscribed session {} from topic: {}", sessionId, topic)
        } catch (Exception e) {
            log.error("Failed to unsubscribe session {} from topic {}: {}", sessionId, topic, e.getMessage())
        }
    }

    /**
     * Send a notification to a specific user
     */
    void sendNotificationToUser(String userId, Object notification) {
        try {
            Map<String, Object> notificationMessage = [
                type: 'NOTIFICATION',
                data: notification,
                timestamp: System.currentTimeMillis()
            ]
            
            webSocketMonitoringService.sendToUser(userId, notificationMessage)
            log.debug("Sent notification to user {}: {}", userId, notification)
        } catch (Exception e) {
            log.error("Failed to send notification to user {}: {}", userId, e.getMessage())
        }
    }

    /**
     * Send appointment update to relevant users
     */
    void sendAppointmentUpdate(String userId, String employeeId, Object appointmentData) {
        try {
            Map<String, Object> appointmentMessage = [
                type: 'APPOINTMENT_UPDATE',
                data: appointmentData,
                timestamp: System.currentTimeMillis()
            ]
            
            // Send to customer
            if (userId) {
                webSocketMonitoringService.sendToUser(userId, appointmentMessage)
            }
            
            // Send to employee
            if (employeeId && employeeId != userId) {
                webSocketMonitoringService.sendToUser(employeeId, appointmentMessage)
            }
            
            log.debug("Sent appointment update to user {} and employee {}: {}", userId, employeeId, appointmentData)
        } catch (Exception e) {
            log.error("Failed to send appointment update: {}", e.getMessage())
        }
    }

    /**
     * Create a JSON message string from an object
     */
    private String createJsonMessage(Object message) {
        if (message instanceof String) {
            return message
        }

        try {
            // Convert to JSON string using Jackson ObjectMapper
            return objectMapper.writeValueAsString(message)
        } catch (Exception e) {
            log.error("Failed to convert message to JSON: {}", e.getMessage())
            return message.toString()
        }
    }
}
