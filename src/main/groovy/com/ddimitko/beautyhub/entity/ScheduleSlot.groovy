package com.ddimitko.beautyhub.entity

import com.ddimitko.beautyhub.enums.DayOfWeek
import groovy.transform.EqualsAndHashCode
import groovy.transform.ToString
import jakarta.persistence.*
import jakarta.validation.constraints.NotNull
import lombok.AllArgsConstructor
import lombok.Builder
import lombok.Data
import lombok.NoArgsConstructor
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp

import java.time.LocalDateTime
import java.time.LocalTime
import java.time.format.DateTimeFormatter

@Entity
@Table(name = "schedule_slots")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(excludes = ["employee"])
@ToString(excludes = ["employee"])
class ScheduleSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    UUID id

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    @NotNull(message = "Employee is required")
    Employee employee

    @Enumerated(EnumType.STRING)
    @Column(name = "day_of_week", nullable = false)
    @NotNull(message = "Day of week is required")
    DayOfWeek dayOfWeek

    @Column(name = "start_time", nullable = false)
    @NotNull(message = "Start time is required")
    LocalTime startTime // Stored in UTC timezone

    @Column(name = "end_time", nullable = false)
    @NotNull(message = "End time is required")
    LocalTime endTime // Stored in UTC timezone

    @Column(name = "active", nullable = false)
    Boolean active = true

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt

    @PrePersist
    @PreUpdate
    void validateTimes() {
        if (startTime && endTime) {
            // Allow cross-midnight schedules (e.g., 22:00 to 06:00 next day)
            // In such cases, endTime can be before startTime when stored as UTC
            // The validation should ensure times are valid LocalTime objects
            // Cross-midnight validation will be handled at the business logic level
            if (startTime == endTime) {
                throw new IllegalArgumentException("Start time and end time cannot be the same")
            }
        }
    }

    boolean isValidTimeSlot() {
        return startTime && endTime && startTime != endTime
    }

    boolean isCrossMidnightSlot() {
        return startTime && endTime && startTime.isAfter(endTime)
    }

    String getFormattedTimeRange() {
        // Note: This returns UTC time formatted - frontend should handle timezone conversion for display
        String startFormatted = startTime.format(DateTimeFormatter.ofPattern('HH:mm'))
        String endFormatted = endTime.format(DateTimeFormatter.ofPattern('HH:mm'))

        if (isCrossMidnightSlot()) {
            return "${startFormatted} - ${endFormatted} (+1)"
        } else {
            return "${startFormatted} - ${endFormatted}"
        }
    }

    String getEmployeeName() {
        return employee?.getFullName()
    }

    int getDurationMinutes() {
        if (startTime && endTime) {
            return (int) java.time.Duration.between(startTime, endTime).toMinutes()
        }
        return 0
    }
}
