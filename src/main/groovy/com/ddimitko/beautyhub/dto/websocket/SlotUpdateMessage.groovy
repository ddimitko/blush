package com.ddimitko.beautyhub.dto.websocket

import com.fasterxml.jackson.annotation.JsonFormat
import com.fasterxml.jackson.annotation.JsonInclude
import groovy.transform.CompileStatic
import groovy.transform.ToString

import java.time.Instant
import java.time.LocalDateTime

/**
 * Standardized slot update message for real-time slot availability changes
 */
@CompileStatic
@ToString(includeNames = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
class SlotUpdateMessage {
    
    /**
     * Shop identifier
     */
    String shopId
    
    /**
     * Service identifier
     */
    String serviceId
    
    /**
     * Employee identifier
     */
    String employeeId
    
    /**
     * Date of the slot (YYYY-MM-DD format)
     */
    String date
    
    /**
     * Time of the slot (HH:mm format)
     */
    String slotTime
    
    /**
     * Slot action type
     */
    SlotAction action
    
    /**
     * User who triggered the action (optional)
     */
    String userId
    
    /**
     * Session ID for slot locking (optional)
     */
    String sessionId
    
    /**
     * Lock expiration time for locked slots
     */
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", timezone = "UTC")
    Instant lockExpiresAt
    
    /**
     * Appointment ID for booked slots
     */
    String appointmentId
    
    /**
     * Additional slot metadata
     */
    Map<String, Object> slotMetadata = [:]

    /**
     * Default constructor
     */
    SlotUpdateMessage() {}

    /**
     * Constructor for slot locking/unlocking
     */
    SlotUpdateMessage(String shopId, String serviceId, String employeeId, String date, 
                     String slotTime, SlotAction action, String userId = null, String sessionId = null) {
        this.shopId = shopId
        this.serviceId = serviceId
        this.employeeId = employeeId
        this.date = date
        this.slotTime = slotTime
        this.action = action
        this.userId = userId
        this.sessionId = sessionId
    }

    /**
     * Create topic string for this slot update
     */
    String getTopic() {
        return "slots.${shopId}.${serviceId}.${employeeId}.${date}"
    }

    /**
     * Create WebSocket message envelope for this slot update
     */
    WebSocketMessageEnvelope toMessageEnvelope() {
        def envelope = new WebSocketMessageEnvelope("SLOT_UPDATE", getTopic(), this)
        envelope.priority = action == SlotAction.LOCKED ? MessagePriority.HIGH : MessagePriority.NORMAL
        envelope.ttlSeconds = 300L // 5 minutes TTL for slot updates
        return envelope
    }

    /**
     * Set lock expiration (for locked slots)
     */
    void setLockExpiration(long durationSeconds) {
        this.lockExpiresAt = Instant.now().plusSeconds(durationSeconds)
    }

    /**
     * Add slot metadata
     */
    void addMetadata(String key, Object value) {
        slotMetadata.put(key, value)
    }

    /**
     * Check if this is a lock-related action
     */
    boolean isLockAction() {
        return action == SlotAction.LOCKED || action == SlotAction.UNLOCKED
    }

    /**
     * Check if this is a booking-related action
     */
    boolean isBookingAction() {
        return action == SlotAction.BOOKED || action == SlotAction.CANCELLED
    }
}

/**
 * Slot action types
 */
enum SlotAction {
    LOCKED,           // Slot temporarily locked by user
    UNLOCKED,         // Slot lock released
    BOOKED,           // Slot permanently booked
    CANCELLED,        // Booking cancelled, slot available again
    AVAILABLE,        // Slot became available
    UNAVAILABLE,      // Slot became unavailable (employee schedule change)
    EARLY_COMPLETION  // Appointment completed early, next slot available
}

/**
 * Notification message for user-specific notifications
 */
@CompileStatic
@ToString(includeNames = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
class NotificationMessage {
    
    /**
     * Target user ID
     */
    String userId
    
    /**
     * Notification title
     */
    String title
    
    /**
     * Notification message content
     */
    String message
    
    /**
     * Notification type
     */
    NotificationType type
    
    /**
     * Related entity ID (appointment, shop, etc.)
     */
    String entityId
    
    /**
     * Related entity type
     */
    String entityType
    
    /**
     * Action URL or deep link
     */
    String actionUrl
    
    /**
     * Additional notification data
     */
    Map<String, Object> data = [:]

    /**
     * Default constructor
     */
    NotificationMessage() {}

    /**
     * Constructor with basic fields
     */
    NotificationMessage(String userId, String title, String message, NotificationType type) {
        this.userId = userId
        this.title = title
        this.message = message
        this.type = type
    }

    /**
     * Create topic string for this notification
     */
    String getTopic() {
        return "notifications.${userId}"
    }

    /**
     * Create WebSocket message envelope for this notification
     */
    WebSocketMessageEnvelope toMessageEnvelope() {
        def envelope = new WebSocketMessageEnvelope("NOTIFICATION", getTopic(), this)
        envelope.priority = type == NotificationType.URGENT ? MessagePriority.HIGH : MessagePriority.NORMAL
        envelope.ttlSeconds = 3600L // 1 hour TTL for notifications
        return envelope
    }

    /**
     * Add notification data
     */
    void addData(String key, Object value) {
        data.put(key, value)
    }
}

/**
 * Notification types
 */
enum NotificationType {
    INFO,
    SUCCESS,
    WARNING,
    ERROR,
    URGENT,
    APPOINTMENT_REMINDER,
    APPOINTMENT_CONFIRMED,
    APPOINTMENT_CANCELLED,
    PAYMENT_SUCCESS,
    PAYMENT_FAILED,
    SHOP_UPDATE
}

/**
 * Heartbeat message for connection health monitoring
 */
@CompileStatic
@ToString(includeNames = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
class HeartbeatMessage {
    
    /**
     * Heartbeat type (PING or PONG)
     */
    HeartbeatType type
    
    /**
     * Server timestamp
     */
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", timezone = "UTC")
    Instant serverTime
    
    /**
     * Connection statistics
     */
    Map<String, Object> stats = [:]

    /**
     * Default constructor
     */
    HeartbeatMessage() {
        this.serverTime = Instant.now()
    }

    /**
     * Constructor with type
     */
    HeartbeatMessage(HeartbeatType type) {
        this()
        this.type = type
    }

    /**
     * Create WebSocket message envelope for heartbeat
     */
    WebSocketMessageEnvelope toMessageEnvelope() {
        def envelope = new WebSocketMessageEnvelope("HEARTBEAT", null, this)
        envelope.priority = MessagePriority.LOW
        envelope.ttlSeconds = 30L // 30 seconds TTL for heartbeats
        return envelope
    }

    /**
     * Add connection statistics
     */
    void addStat(String key, Object value) {
        stats.put(key, value)
    }
}

/**
 * Heartbeat types
 */
enum HeartbeatType {
    PING,
    PONG
}
