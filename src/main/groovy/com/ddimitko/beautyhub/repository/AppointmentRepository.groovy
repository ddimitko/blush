package com.ddimitko.beautyhub.repository

import com.ddimitko.beautyhub.entity.Appointment
import com.ddimitko.beautyhub.entity.Employee
import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.enums.AppointmentStatus
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.transaction.annotation.Transactional
import org.springframework.stereotype.Repository

import java.time.LocalDateTime

@Repository
interface AppointmentRepository extends JpaRepository<Appointment, UUID> {

    List<Appointment> findByUser(User user)

    List<Appointment> findByShop(Shop shop)

    List<Appointment> findByEmployee(Employee employee)

    List<Appointment> findByStatus(AppointmentStatus status)

    @Query("SELECT a FROM Appointment a WHERE a.user = :user ORDER BY a.updatedAt DESC")
    Page<Appointment> findByUser(@Param("user") User user, Pageable pageable)

    @Query("SELECT a FROM Appointment a WHERE a.shop = :shop ORDER BY a.updatedAt DESC")
    Page<Appointment> findByShop(@Param("shop") Shop shop, Pageable pageable)

    @Query("SELECT a FROM Appointment a WHERE a.employee = :employee ORDER BY a.updatedAt DESC")
    Page<Appointment> findByEmployee(@Param("employee") Employee employee, Pageable pageable)

    Page<Appointment> findByStatus(AppointmentStatus status, Pageable pageable)

    @Query("SELECT a FROM Appointment a WHERE a.user = :user AND a.status IN :statuses ORDER BY a.appointmentDateTime DESC")
    List<Appointment> findByUserAndStatusIn(@Param("user") User user, @Param("statuses") List<AppointmentStatus> statuses)

    @Query("SELECT a FROM Appointment a WHERE a.employee = :employee AND a.appointmentDateTime BETWEEN :start AND :end")
    List<Appointment> findByEmployeeAndAppointmentDateTimeBetween(
        @Param("employee") Employee employee,
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end
    )

    @Query("SELECT a FROM Appointment a WHERE a.shop = :shop AND a.appointmentDateTime BETWEEN :start AND :end")
    List<Appointment> findByShopAndAppointmentDateTimeBetween(
        @Param("shop") Shop shop,
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end
    )

    @Query("""
        SELECT a FROM Appointment a
        WHERE a.employee = :employee
        AND a.appointmentDateTime < :endTime
        AND a.endDateTime > :startTime
        AND a.status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS')
    """)
    List<Appointment> findConflictingAppointments(
        @Param("employee") Employee employee,
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime
    )

    @Query("""
        SELECT a FROM Appointment a
        WHERE a.user = :user
        AND a.appointmentDateTime < :endTime
        AND a.endDateTime > :startTime
        AND a.status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS')
    """)
    List<Appointment> findConflictingAppointmentsByUser(
        @Param("user") User user,
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime
    )

    @Query("""
        SELECT a FROM Appointment a
        WHERE a.guestEmail = :guestEmail
        AND a.user IS NULL
        AND a.appointmentDateTime < :endTime
        AND a.endDateTime > :startTime
        AND a.status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS')
    """)
    List<Appointment> findConflictingAppointmentsByGuestEmail(
        @Param("guestEmail") String guestEmail,
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime
    )

    @Query("SELECT a FROM Appointment a WHERE a.appointmentDateTime <= :reminderTime AND a.reminderSent = false AND a.status IN ('PENDING', 'CONFIRMED')")
    List<Appointment> findAppointmentsNeedingReminder(@Param("reminderTime") LocalDateTime reminderTime)

    @Query("SELECT a FROM Appointment a WHERE a.status = 'PENDING' AND a.createdAt <= :cutoffTime")
    List<Appointment> findPendingAppointmentsOlderThan(@Param("cutoffTime") LocalDateTime cutoffTime)

    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.shop = :shop AND a.status = 'COMPLETED'")
    long countCompletedAppointmentsByShop(@Param("shop") Shop shop)

    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.employee = :employee AND a.status = 'COMPLETED'")
    long countCompletedAppointmentsByEmployee(@Param("employee") Employee employee)

    @Query("""
        SELECT a FROM Appointment a
        WHERE a.user = :user
        AND a.appointmentDateTime > :now
        AND a.status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS')
        ORDER BY a.appointmentDateTime ASC
    """)
    List<Appointment> findUpcomingAppointmentsByUser(@Param("user") User user, @Param("now") LocalDateTime now)

    // Guest appointment queries
    @Query("SELECT a FROM Appointment a WHERE a.guestEmail = :email AND a.user IS NULL")
    List<Appointment> findByGuestEmailAndUserIsNull(@Param("email") String email)

    @Query("SELECT a FROM Appointment a WHERE a.guestEmail = :email")
    List<Appointment> findByGuestEmail(@Param("email") String email)

    @Query("""
        SELECT a FROM Appointment a
        WHERE a.employee = :employee
        AND a.appointmentDateTime > :now
        AND a.status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS')
        ORDER BY a.appointmentDateTime ASC
    """)
    List<Appointment> findUpcomingAppointmentsByEmployee(@Param("employee") Employee employee, @Param("now") LocalDateTime now)

    // Analytics queries
    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.shop.id IN :shopIds")
    long countByShopIdIn(@Param("shopIds") List<UUID> shopIds)

    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.shop.id = :shopId")
    long countByShopId(@Param("shopId") UUID shopId)

    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.shop.id = :shopId AND a.status = :status")
    long countByShopIdAndStatus(@Param("shopId") UUID shopId, @Param("status") AppointmentStatus status)

    @Query(value = "SELECT COUNT(DISTINCT COALESCE(CAST(user_id AS VARCHAR), guest_email)) FROM appointments WHERE shop_id IN :shopIds", nativeQuery = true)
    long countDistinctCustomersByShopIds(@Param("shopIds") List<UUID> shopIds)

    @Query(value = "SELECT COUNT(DISTINCT COALESCE(CAST(user_id AS VARCHAR), guest_email)) FROM appointments WHERE shop_id = :shopId", nativeQuery = true)
    long countDistinctCustomersByShopId(@Param("shopId") UUID shopId)

    // Payment-related queries
    Optional<Appointment> findByPaymentIntentId(String paymentIntentId)

    // Email reminder queries
    @Query("""
        SELECT a FROM Appointment a
        WHERE a.appointmentDateTime BETWEEN :start AND :end
        AND a.status = :status
        AND a.reminderSent = false
        AND a.user IS NOT NULL
    """)
    List<Appointment> findByAppointmentDateTimeBetweenAndStatusAndReminderSentFalse(
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end,
        @Param("status") AppointmentStatus status
    )

    @Query("""
        SELECT a FROM Appointment a
        WHERE a.appointmentDateTime BETWEEN :start AND :end
        AND a.status = :status
        AND a.dailyReminderSent = false
        AND a.user IS NOT NULL
    """)
    List<Appointment> findByAppointmentDateTimeBetweenAndStatusAndDailyReminderSentFalse(
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end,
        @Param("status") AppointmentStatus status
    )

    @Query("""
        UPDATE Appointment a
        SET a.reminderSent = false, a.dailyReminderSent = false
        WHERE a.appointmentDateTime < :cutoffDate
        AND a.status IN ('COMPLETED', 'CANCELLED')
    """)
    @Modifying
    @Transactional
    int resetReminderFlagsForOldAppointments(@Param("cutoffDate") LocalDateTime cutoffDate)

    /**
     * Find appointments by status and end date time before
     */
    List<Appointment> findByStatusAndEndDateTimeBefore(AppointmentStatus status, LocalDateTime endDateTime)

    /**
     * Count appointments by status and completed date before
     */
    int countByStatusAndCompletedAtBefore(AppointmentStatus status, LocalDateTime completedAt)

    /**
     * Find appointments by date range
     */
    @Query("SELECT a FROM Appointment a WHERE a.appointmentDateTime BETWEEN :start AND :end")
    List<Appointment> findByAppointmentDateTimeBetween(
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end
    )

    /**
     * Count appointments by date range
     */
    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.appointmentDateTime BETWEEN :start AND :end")
    long countByAppointmentDateTimeBetween(
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end
    )

    /**
     * Find confirmed appointments that should be marked as in progress
     * (appointments where current time >= appointment start time)
     */
    List<Appointment> findByStatusAndAppointmentDateTimeBefore(AppointmentStatus status, LocalDateTime appointmentDateTime)


}
