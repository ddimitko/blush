package com.ddimitko.beautyhub.dto.websocket

import com.fasterxml.jackson.annotation.JsonFormat
import com.fasterxml.jackson.annotation.JsonInclude
import groovy.transform.CompileStatic
import groovy.transform.ToString

import java.time.Instant

/**
 * Standardized WebSocket message envelope for all real-time communications
 */
@CompileStatic
@ToString(includeNames = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
class WebSocketMessageEnvelope {
    
    /**
     * Message type identifier
     */
    String type
    
    /**
     * Message version for backward compatibility
     */
    String version = "1.0"
    
    /**
     * Unique message identifier
     */
    String messageId
    
    /**
     * Topic/destination for the message
     */
    String topic
    
    /**
     * Message payload (can be any object)
     */
    Object payload
    
    /**
     * Message timestamp in UTC
     */
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", timezone = "UTC")
    Instant timestamp
    
    /**
     * Optional correlation ID for request-response patterns
     */
    String correlationId
    
    /**
     * Message priority (HIGH, NORMAL, LOW)
     */
    MessagePriority priority = MessagePriority.NORMAL
    
    /**
     * Time-to-live in seconds (optional)
     */
    Long ttlSeconds
    
    /**
     * Retry count for failed deliveries
     */
    Integer retryCount = 0
    
    /**
     * Maximum retry attempts
     */
    Integer maxRetries = 3
    
    /**
     * Error information if message processing failed
     */
    WebSocketError error
    
    /**
     * Additional metadata
     */
    Map<String, Object> metadata = [:]

    /**
     * Default constructor
     */
    WebSocketMessageEnvelope() {
        this.messageId = UUID.randomUUID().toString()
        this.timestamp = Instant.now()
    }

    /**
     * Constructor with type and payload
     */
    WebSocketMessageEnvelope(String type, Object payload) {
        this()
        this.type = type
        this.payload = payload
    }

    /**
     * Constructor with type, topic, and payload
     */
    WebSocketMessageEnvelope(String type, String topic, Object payload) {
        this(type, payload)
        this.topic = topic
    }

    /**
     * Check if message has expired based on TTL
     */
    boolean isExpired() {
        if (ttlSeconds == null) {
            return false
        }
        return Instant.now().isAfter(timestamp.plusSeconds(ttlSeconds))
    }

    /**
     * Check if message can be retried
     */
    boolean canRetry() {
        return retryCount < maxRetries
    }

    /**
     * Increment retry count
     */
    void incrementRetry() {
        retryCount++
    }

    /**
     * Set error information
     */
    void setError(String code, String message, String details = null) {
        this.error = new WebSocketError(code, message, details)
    }

    /**
     * Add metadata entry
     */
    void addMetadata(String key, Object value) {
        metadata.put(key, value)
    }

    /**
     * Get metadata value
     */
    Object getMetadata(String key) {
        return metadata.get(key)
    }
}

/**
 * Message priority levels
 */
enum MessagePriority {
    HIGH,
    NORMAL,
    LOW
}

/**
 * WebSocket error information
 */
@CompileStatic
@ToString(includeNames = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
class WebSocketError {
    String code
    String message
    String details
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", timezone = "UTC")
    Instant timestamp

    WebSocketError() {
        this.timestamp = Instant.now()
    }

    WebSocketError(String code, String message, String details = null) {
        this()
        this.code = code
        this.message = message
        this.details = details
    }
}
