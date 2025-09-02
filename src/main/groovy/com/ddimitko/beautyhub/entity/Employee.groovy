package com.ddimitko.beautyhub.entity

import com.ddimitko.beautyhub.enums.DayOfWeek
import com.fasterxml.jackson.annotation.JsonIgnore
import groovy.transform.EqualsAndHashCode
import groovy.transform.ToString
import jakarta.persistence.*
import lombok.AllArgsConstructor
import lombok.Builder
import lombok.Data
import lombok.NoArgsConstructor
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp

import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime

@Entity
@Table(name = "employees")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(excludes = ["user", "shop", "services", "scheduleSlots", "appointments", "leaveRequests"])
@ToString(excludes = ["user", "shop", "services", "scheduleSlots", "appointments", "leaveRequests"])
class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    UUID id

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    User user

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", nullable = false)
    Shop shop

    @Column(name = "bio", columnDefinition = "TEXT")
    String bio

    @Column(name = "specialties")
    String specialties

    @Column(name = "years_experience")
    Integer yearsExperience

    @Column(name = "hourly_rate")
    BigDecimal hourlyRate

    @Column(name = "commission_rate")
    BigDecimal commissionRate

    @Column(name = "active", nullable = false)
    Boolean active = true

    @Column(name = "hire_date")
    LocalDateTime hireDate

    @Column(name = "terminated_at")
    LocalDateTime terminatedAt

    // For tracking invitation status - transient field populated from invitation data
    @Transient
    String invitationStatus

    // For tracking invitation ID - transient field populated from invitation data (used for cancellation)
    @Transient
    UUID invitationId

    // Annual leave tracking
    @Column(name = "annual_leave_days")
    Integer annualLeaveDays = 25 // Default 25 days per year

    @Column(name = "used_leave_days")
    Integer usedLeaveDays = 0

    @Column(name = "leave_year_start")
    LocalDate leaveYearStart

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt

    // Relationships
    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    Set<Service> services = new HashSet<>()

    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    Set<ServiceEmployee> serviceEmployees = new HashSet<>()

    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    Set<ScheduleSlot> scheduleSlots = new HashSet<>()

    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    Set<Appointment> appointments = new HashSet<>()

    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    Set<LeaveRequest> leaveRequests = new HashSet<>()

    String getFullName() {
        return user?.getFullName()
    }

    String getEmail() {
        return user?.email
    }

    String getPhone() {
        return user?.phone
    }

    boolean isAvailable() {
        return active && user?.enabled
    }

    /**
     * Get remaining annual leave days
     */
    Integer getRemainingLeaveDays() {
        Integer annual = annualLeaveDays ?: 25
        Integer used = usedLeaveDays ?: 0
        return Math.max(0, annual - used)
    }

    /**
     * Check if employee has sufficient leave days
     */
    boolean hasSufficientLeaveDays(Integer requestedDays) {
        return getRemainingLeaveDays() >= (requestedDays ?: 0)
    }

    /**
     * Get the current leave year start date
     */
    LocalDate getCurrentLeaveYearStart() {
        if (leaveYearStart) {
            return leaveYearStart
        }
        // Default to hire date anniversary or January 1st
        LocalDate hireAnniversary = hireDate?.toLocalDate() ?: LocalDate.of(LocalDate.now().year, 1, 1)
        LocalDate currentYear = LocalDate.of(LocalDate.now().year, hireAnniversary.monthValue, hireAnniversary.dayOfMonth)

        // If the anniversary hasn't passed this year, use last year's anniversary
        if (currentYear.isAfter(LocalDate.now())) {
            currentYear = currentYear.minusYears(1)
        }

        return currentYear
    }

    /**
     * Get the current leave year end date
     */
    LocalDate getCurrentLeaveYearEnd() {
        return getCurrentLeaveYearStart().plusYears(1).minusDays(1)
    }

    /**
     * Reset leave days for new leave year
     */
    void resetLeaveYear() {
        this.usedLeaveDays = 0
        this.leaveYearStart = getCurrentLeaveYearStart().plusYears(1)
    }

    /**
     * Deduct leave days
     */
    void deductLeaveDays(Integer days) {
        this.usedLeaveDays = (this.usedLeaveDays ?: 0) + (days ?: 0)
    }

    /**
     * Calculate used leave days from approved leave requests that affect annual leave
     */
    Integer calculateUsedLeaveDays() {
        if (!leaveRequests) {
            return 0
        }

        return leaveRequests
            .findAll { it.status == com.ddimitko.beautyhub.enums.LeaveRequestStatus.APPROVED && it.affectsAnnualLeave }
            .sum { it.calculatedLeaveDays ?: it.leaveDays ?: 0 } ?: 0
    }

    /**
     * Get workdays from schedule slots
     */
    Set<DayOfWeek> getWorkdays() {
        return scheduleSlots?.findAll { it.active }?.collect { it.dayOfWeek }?.toSet() ?: []
    }
}
