package com.ddimitko.beautyhub.entity

import com.ddimitko.beautyhub.enums.NotificationDeliveryStatus
import com.ddimitko.beautyhub.enums.NotificationPriority
import groovy.transform.EqualsAndHashCode
import groovy.transform.ToString
import jakarta.persistence.*
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import lombok.AllArgsConstructor
import lombok.Builder
import lombok.Data
import lombok.NoArgsConstructor
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp

import java.time.LocalDateTime
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

@Entity
@Table(name = "notifications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(excludes = ["user"])
@ToString(excludes = ["user"])
class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    UUID id

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @NotNull(message = "User is required")
    User user

    @Column(name = "title", nullable = false)
    @NotBlank(message = "Title is required")
    String title

    @Column(name = "message", nullable = false, columnDefinition = "TEXT")
    @NotBlank(message = "Message is required")
    String message

    @Column(name = "type")
    String type

    @Column(name = "seen", nullable = false)
    Boolean seen = false

    @Column(name = "read_at")
    LocalDateTime readAt

    @Column(name = "data", columnDefinition = "TEXT")
    String data // JSON data for additional context

    @Column(name = "action_url")
    String actionUrl

    @Column(name = "push_sent", nullable = false)
    Boolean pushSent = false

    @Column(name = "email_sent", nullable = false)
    Boolean emailSent = false

    @Column(name = "websocket_sent", nullable = false, columnDefinition = "boolean default false")
    Boolean websocketSent = false

    // Delivery tracking fields
    @Column(name = "websocket_delivery_attempts", nullable = false, columnDefinition = "integer default 0")
    Integer websocketDeliveryAttempts = 0

    @Column(name = "email_delivery_attempts", nullable = false, columnDefinition = "integer default 0")
    Integer emailDeliveryAttempts = 0

    @Column(name = "push_delivery_attempts", nullable = false, columnDefinition = "integer default 0")
    Integer pushDeliveryAttempts = 0

    @Column(name = "websocket_sent_at")
    LocalDateTime websocketSentAt

    @Column(name = "email_sent_at")
    LocalDateTime emailSentAt

    @Column(name = "push_sent_at")
    LocalDateTime pushSentAt

    @Column(name = "last_delivery_attempt_at")
    LocalDateTime lastDeliveryAttemptAt

    @Column(name = "delivery_status", columnDefinition = "varchar(255) default 'PENDING'")
    @Enumerated(EnumType.STRING)
    NotificationDeliveryStatus deliveryStatus = NotificationDeliveryStatus.PENDING

    @Column(name = "delivery_error_message", columnDefinition = "TEXT")
    String deliveryErrorMessage

    @Column(name = "retry_count", nullable = false, columnDefinition = "integer default 0")
    Integer retryCount = 0

    @Column(name = "max_retries", nullable = false, columnDefinition = "integer default 3")
    Integer maxRetries = 3

    @Column(name = "next_retry_at")
    LocalDateTime nextRetryAt

    @Column(name = "priority", nullable = false, columnDefinition = "varchar(255) default 'NORMAL'")
    @Enumerated(EnumType.STRING)
    NotificationPriority priority = NotificationPriority.NORMAL

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt

    void markAsSeen() {
        if (!seen) {
            seen = true
            readAt = LocalDateTime.now(ZoneOffset.UTC)
        }
    }

    boolean isUnread() {
        return !seen
    }

    String getFormattedDate() {
        return createdAt?.format(DateTimeFormatter.ofPattern("MMM dd, yyyy 'at' h:mm a"))
    }

    String getUserName() {
        return user?.getFullName()
    }

    // Delivery tracking methods
    void markWebSocketSent() {
        websocketSent = true
        websocketSentAt = LocalDateTime.now(ZoneOffset.UTC)
        websocketDeliveryAttempts++
        lastDeliveryAttemptAt = websocketSentAt
        if (deliveryStatus == NotificationDeliveryStatus.PENDING) {
            deliveryStatus = NotificationDeliveryStatus.PARTIALLY_DELIVERED
        }
    }

    void markEmailSent() {
        emailSent = true
        emailSentAt = LocalDateTime.now(ZoneOffset.UTC)
        emailDeliveryAttempts++
        lastDeliveryAttemptAt = emailSentAt
        updateDeliveryStatus()
    }

    void markPushSent() {
        pushSent = true
        pushSentAt = LocalDateTime.now(ZoneOffset.UTC)
        pushDeliveryAttempts++
        lastDeliveryAttemptAt = pushSentAt
        updateDeliveryStatus()
    }

    void markDeliveryFailed(String errorMessage) {
        deliveryStatus = NotificationDeliveryStatus.FAILED
        deliveryErrorMessage = errorMessage
        lastDeliveryAttemptAt = LocalDateTime.now(ZoneOffset.UTC)
    }

    void incrementRetryCount() {
        retryCount++
        lastDeliveryAttemptAt = LocalDateTime.now(ZoneOffset.UTC)
    }

    boolean canRetry() {
        return retryCount < maxRetries &&
               deliveryStatus != NotificationDeliveryStatus.DELIVERED &&
               deliveryStatus != NotificationDeliveryStatus.EXPIRED
    }

    boolean isExpired() {
        // Notifications expire after 7 days
        return createdAt.isBefore(LocalDateTime.now(ZoneOffset.UTC).minusDays(7))
    }

    boolean requiresRetry() {
        return deliveryStatus == NotificationDeliveryStatus.FAILED &&
               canRetry() &&
               (nextRetryAt == null || nextRetryAt.isBefore(LocalDateTime.now(ZoneOffset.UTC)))
    }

    void scheduleNextRetry() {
        if (canRetry()) {
            // Exponential backoff: 1min, 5min, 15min, 60min
            long delayMinutes = Math.pow(5, retryCount) as long
            nextRetryAt = LocalDateTime.now(ZoneOffset.UTC).plusMinutes(delayMinutes)
        }
    }

    private void updateDeliveryStatus() {
        if (websocketSent && emailSent) {
            deliveryStatus = NotificationDeliveryStatus.DELIVERED
        } else if (websocketSent || emailSent) {
            deliveryStatus = NotificationDeliveryStatus.PARTIALLY_DELIVERED
        }
    }

    boolean isHighPriority() {
        return priority == NotificationPriority.HIGH || priority == NotificationPriority.URGENT
    }

    boolean isDelivered() {
        return deliveryStatus == NotificationDeliveryStatus.DELIVERED
    }

    boolean isPartiallyDelivered() {
        return deliveryStatus == NotificationDeliveryStatus.PARTIALLY_DELIVERED
    }

    boolean isFailed() {
        return deliveryStatus == NotificationDeliveryStatus.FAILED
    }
}
