package com.ddimitko.beautyhub.entity

import com.fasterxml.jackson.annotation.JsonIgnore
import groovy.transform.EqualsAndHashCode
import groovy.transform.ToString
import lombok.AllArgsConstructor
import lombok.Builder
import lombok.Data
import lombok.NoArgsConstructor
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp

import jakarta.persistence.*
import jakarta.validation.constraints.NotNull
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime

@Entity
@Table(name = "employee_performance")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(excludes = ["employee"])
@ToString(excludes = ["employee"])
class EmployeePerformance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    UUID id

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    @NotNull(message = "Employee is required")
    @JsonIgnore
    Employee employee

    @Column(name = "period_start", nullable = false)
    @NotNull(message = "Period start date is required")
    LocalDate periodStart

    @Column(name = "period_end", nullable = false)
    @NotNull(message = "Period end date is required")
    LocalDate periodEnd

    // Appointment metrics
    @Column(name = "total_appointments", nullable = false)
    Integer totalAppointments = 0

    @Column(name = "completed_appointments", nullable = false)
    Integer completedAppointments = 0

    @Column(name = "cancelled_appointments", nullable = false)
    Integer cancelledAppointments = 0

    @Column(name = "no_show_appointments", nullable = false)
    Integer noShowAppointments = 0

    // Revenue metrics
    @Column(name = "total_revenue", precision = 10, scale = 2)
    BigDecimal totalRevenue = BigDecimal.ZERO

    @Column(name = "average_service_value", precision = 10, scale = 2)
    BigDecimal averageServiceValue = BigDecimal.ZERO

    // Time metrics
    @Column(name = "total_working_hours", precision = 8, scale = 2)
    BigDecimal totalWorkingHours = BigDecimal.ZERO

    @Column(name = "utilization_rate", precision = 5, scale = 2)
    BigDecimal utilizationRate = BigDecimal.ZERO

    // Customer satisfaction
    @Column(name = "average_rating", precision = 3, scale = 2)
    BigDecimal averageRating = BigDecimal.ZERO

    @Column(name = "total_reviews", nullable = false)
    Integer totalReviews = 0

    // Efficiency metrics
    @Column(name = "on_time_percentage", precision = 5, scale = 2)
    BigDecimal onTimePercentage = BigDecimal.ZERO

    @Column(name = "repeat_customer_rate", precision = 5, scale = 2)
    BigDecimal repeatCustomerRate = BigDecimal.ZERO

    // Leave and attendance
    @Column(name = "days_worked", nullable = false)
    Integer daysWorked = 0

    @Column(name = "days_off", nullable = false)
    Integer daysOff = 0

    @Column(name = "sick_days_taken", nullable = false)
    Integer sickDaysTaken = 0

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt

    // Additional absence and leave tracking fields
    @Column(name = "absence_rate", precision = 5, scale = 2)
    BigDecimal absenceRate = BigDecimal.ZERO

    @Column(name = "total_absence_days")
    Integer totalAbsenceDays = 0

    @Column(name = "remaining_leave_days")
    Integer remainingLeaveDays = 25

    @PrePersist
    @PreUpdate
    void validateDates() {
        if (periodStart && periodEnd && periodStart.isAfter(periodEnd)) {
            throw new IllegalArgumentException("Period start date must be before or equal to period end date")
        }
    }

    /**
     * Calculate completion rate as percentage
     */
    BigDecimal getCompletionRate() {
        if (totalAppointments == 0) return BigDecimal.ZERO
        return new BigDecimal(completedAppointments)
                .divide(new BigDecimal(totalAppointments), 4, BigDecimal.ROUND_HALF_UP)
                .multiply(new BigDecimal(100))
    }

    /**
     * Calculate cancellation rate as percentage
     */
    BigDecimal getCancellationRate() {
        if (totalAppointments == 0) return BigDecimal.ZERO
        return new BigDecimal(cancelledAppointments)
                .divide(new BigDecimal(totalAppointments), 4, BigDecimal.ROUND_HALF_UP)
                .multiply(new BigDecimal(100))
    }

    /**
     * Calculate no-show rate as percentage
     */
    BigDecimal getNoShowRate() {
        if (totalAppointments == 0) return BigDecimal.ZERO
        return new BigDecimal(noShowAppointments)
                .divide(new BigDecimal(totalAppointments), 4, BigDecimal.ROUND_HALF_UP)
                .multiply(new BigDecimal(100))
    }

    /**
     * Calculate attendance rate as percentage
     */
    BigDecimal getAttendanceRate() {
        int totalScheduledDays = daysWorked + daysOff
        if (totalScheduledDays == 0) return BigDecimal.ZERO
        return new BigDecimal(daysWorked)
                .divide(new BigDecimal(totalScheduledDays), 4, BigDecimal.ROUND_HALF_UP)
                .multiply(new BigDecimal(100))
    }

    /**
     * Get employee name
     */
    String getEmployeeName() {
        return employee?.fullName
    }

    /**
     * Check if this performance record is for the current period
     */
    boolean isCurrentPeriod() {
        LocalDate today = LocalDate.now()
        return !today.isBefore(periodStart) && !today.isAfter(periodEnd)
    }

    /**
     * Get period description
     */
    String getPeriodDescription() {
        return "${periodStart} to ${periodEnd}"
    }
}
