package com.ddimitko.beautyhub.entity

import com.ddimitko.beautyhub.enums.LeaveRequestStatus
import com.ddimitko.beautyhub.enums.LeaveType
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
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.temporal.ChronoUnit

@Entity
@Table(name = "leave_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(excludes = ["employee", "reviewedBy"])
@ToString(excludes = ["employee", "reviewedBy"])
class LeaveRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    UUID id

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    @NotNull(message = "Employee is required")
    @JsonIgnore
    Employee employee

    @Enumerated(EnumType.STRING)
    @Column(name = "leave_type", nullable = false)
    @NotNull(message = "Leave type is required")
    LeaveType leaveType

    @Column(name = "start_date", nullable = false)
    @NotNull(message = "Start date is required")
    LocalDate startDate

    @Column(name = "end_date", nullable = false)
    @NotNull(message = "End date is required")
    LocalDate endDate

    @Column(name = "reason", columnDefinition = "TEXT")
    String reason

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    LeaveRequestStatus status = LeaveRequestStatus.PENDING

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_user_id")
    @JsonIgnore
    User reviewedBy

    @Column(name = "reviewed_at")
    LocalDateTime reviewedAt

    @Column(name = "review_notes", columnDefinition = "TEXT")
    String reviewNotes

    // Calculated leave days (stored when request is created)
    @Column(name = "calculated_leave_days")
    Integer calculatedLeaveDays

    // Whether this leave affects annual leave balance
    @Column(name = "affects_annual_leave")
    Boolean affectsAnnualLeave = true

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt

    @PrePersist
    @PreUpdate
    void validateDates() {
        if (startDate && endDate && startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Start date must be before or equal to end date")
        }
        // Remove past date validation for @PrePersist as it's handled in service layer
    }

    /**
     * Calculate the number of leave days based on employee's workdays
     */
    long getLeaveDays() {
        if (!startDate || !endDate || !employee) return 0

        Set<com.ddimitko.beautyhub.enums.DayOfWeek> workdays = employee.getWorkdays()
        if (workdays.isEmpty()) {
            // Default to Monday-Friday if no schedule defined
            workdays = [
                com.ddimitko.beautyhub.enums.DayOfWeek.MONDAY,
                com.ddimitko.beautyhub.enums.DayOfWeek.TUESDAY,
                com.ddimitko.beautyhub.enums.DayOfWeek.WEDNESDAY,
                com.ddimitko.beautyhub.enums.DayOfWeek.THURSDAY,
                com.ddimitko.beautyhub.enums.DayOfWeek.FRIDAY
            ] as Set
        }

        long workdaysCount = 0
        LocalDate current = startDate

        while (!current.isAfter(endDate)) {
            // Convert Java DayOfWeek to our custom DayOfWeek enum
            java.time.DayOfWeek javaDayOfWeek = current.dayOfWeek
            com.ddimitko.beautyhub.enums.DayOfWeek customDayOfWeek =
                com.ddimitko.beautyhub.enums.DayOfWeek.valueOf(javaDayOfWeek.name())

            if (workdays.contains(customDayOfWeek)) {
                workdaysCount++
            }
            current = current.plusDays(1)
        }

        return workdaysCount
    }

    /**
     * Check if the leave request is currently active
     */
    boolean isActive() {
        if (status != LeaveRequestStatus.APPROVED) return false
        LocalDate today = LocalDate.now()
        return !today.isBefore(startDate) && !today.isAfter(endDate)
    }

    /**
     * Check if the leave request is in the future
     */
    boolean isFuture() {
        return startDate && startDate.isAfter(LocalDate.now())
    }

    /**
     * Check if the leave request overlaps with a given date
     */
    boolean overlapsWithDate(LocalDate date) {
        if (status != LeaveRequestStatus.APPROVED) return false
        return !date.isBefore(startDate) && !date.isAfter(endDate)
    }

    /**
     * Get the employee's full name
     */
    String getEmployeeName() {
        return employee?.fullName
    }

    /**
     * Get the reviewer's full name
     */
    String getReviewerName() {
        return reviewedBy?.fullName
    }

    /**
     * Check if the request can be cancelled
     */
    boolean canBeCancelled() {
        return status == LeaveRequestStatus.PENDING || 
               (status == LeaveRequestStatus.APPROVED && isFuture())
    }

    /**
     * Check if the request can be reviewed
     */
    boolean canBeReviewed() {
        return status == LeaveRequestStatus.PENDING
    }
}
