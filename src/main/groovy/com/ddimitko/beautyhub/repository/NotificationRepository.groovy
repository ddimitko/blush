package com.ddimitko.beautyhub.repository

import com.ddimitko.beautyhub.entity.Notification
import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.enums.NotificationDeliveryStatus
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

import java.time.LocalDateTime

@Repository
interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findByUser(User user)

    Page<Notification> findByUser(User user, Pageable pageable)

    List<Notification> findByUserAndSeenFalse(User user)

    @Query("SELECT n FROM Notification n WHERE n.user = :user ORDER BY n.createdAt DESC")
    List<Notification> findByUserOrderByCreatedAtDesc(@Param("user") User user)

    @Query("SELECT n FROM Notification n WHERE n.user = :user AND n.seen = false ORDER BY n.createdAt DESC")
    List<Notification> findUnreadByUserOrderByCreatedAtDesc(@Param("user") User user)

    @Query("SELECT COUNT(n) FROM Notification n WHERE n.user = :user AND n.seen = false")
    long countUnreadByUser(@Param("user") User user)

    @Query("SELECT n FROM Notification n WHERE n.pushSent = false AND n.createdAt > :cutoffTime")
    List<Notification> findUnsent(@Param("cutoffTime") LocalDateTime cutoffTime)

    @Query("SELECT n FROM Notification n WHERE n.createdAt < :cutoffDate")
    List<Notification> findOldNotifications(@Param("cutoffDate") LocalDateTime cutoffDate)

    void deleteByUserAndCreatedAtBefore(User user, LocalDateTime cutoffDate)

    // New methods for 30-day filtering
    Page<Notification> findByUserAndCreatedAtAfter(User user, LocalDateTime cutoffDate, Pageable pageable)

    @Query("SELECT n FROM Notification n WHERE n.user = :user AND n.seen = false AND n.createdAt > :cutoffDate ORDER BY n.createdAt DESC")
    List<Notification> findByUserAndSeenFalseAndCreatedAtAfterOrderByCreatedAtDesc(@Param("user") User user, @Param("cutoffDate") LocalDateTime cutoffDate)

    @Query("SELECT COUNT(n) FROM Notification n WHERE n.user = :user AND n.seen = false AND n.createdAt > :cutoffDate")
    long countUnreadByUserAndCreatedAtAfter(@Param("user") User user, @Param("cutoffDate") LocalDateTime cutoffDate)

    // Delivery tracking queries
    @Query("SELECT n FROM Notification n WHERE n.deliveryStatus = 'RETRYING' AND (n.nextRetryAt IS NULL OR n.nextRetryAt <= :now)")
    List<Notification> findNotificationsForRetry(@Param("now") LocalDateTime now)

    @Query("SELECT n FROM Notification n WHERE n.deliveryStatus = 'FAILED' AND n.retryCount < n.maxRetries AND (n.nextRetryAt IS NULL OR n.nextRetryAt <= :now)")
    List<Notification> findFailedNotificationsForRetry(@Param("now") LocalDateTime now)

    @Query("SELECT n FROM Notification n WHERE n.deliveryStatus = 'PENDING' AND n.createdAt <= :cutoffTime")
    List<Notification> findPendingNotifications(@Param("cutoffTime") LocalDateTime cutoffTime)

    @Query("SELECT n FROM Notification n WHERE n.deliveryStatus = 'PARTIALLY_DELIVERED' AND n.retryCount < n.maxRetries")
    List<Notification> findPartiallyDeliveredNotifications()

    @Query("SELECT COUNT(n) FROM Notification n WHERE n.deliveryStatus = :status")
    long countByDeliveryStatus(@Param("status") NotificationDeliveryStatus status)

    @Query("SELECT n FROM Notification n WHERE n.createdAt < :cutoffDate AND n.deliveryStatus = 'EXPIRED'")
    List<Notification> findExpiredNotifications(@Param("cutoffDate") LocalDateTime cutoffDate)

    // Metrics queries
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.createdAt > :cutoffDate")
    long countByCreatedAtAfter(@Param("cutoffDate") LocalDateTime cutoffDate)

    @Query("SELECT n FROM Notification n WHERE (n.deliveryStatus = 'FAILED' AND n.retryCount >= n.maxRetries) OR (n.deliveryStatus = 'RETRYING' AND n.lastDeliveryAttemptAt < :cutoffTime)")
    List<Notification> findProblematicNotifications(@Param("cutoffTime") LocalDateTime cutoffTime)
}
