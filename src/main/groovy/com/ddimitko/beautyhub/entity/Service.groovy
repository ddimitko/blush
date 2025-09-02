package com.ddimitko.beautyhub.entity

import com.ddimitko.beautyhub.enums.ServiceCategory
import com.fasterxml.jackson.annotation.JsonIgnore
import groovy.transform.EqualsAndHashCode
import groovy.transform.ToString
import jakarta.persistence.*
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import lombok.AllArgsConstructor
import lombok.Data
import lombok.NoArgsConstructor
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp

import java.time.Duration
import java.time.LocalDateTime

@Entity
@Table(name = "services", uniqueConstraints = [
    @UniqueConstraint(columnNames = ["shop_id", "name"], name = "uk_service_shop_name")
])
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(excludes = ["employee", "shop", "appointments"])
@ToString(excludes = ["employee", "shop", "appointments"])
class Service {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    UUID id

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = true)
    Employee employee

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", nullable = false)
    Shop shop

    @Column(name = "name", nullable = false)
    @NotBlank(message = "Service name is required")
    String name

    @Column(name = "description", columnDefinition = "TEXT")
    String description

    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    @DecimalMin(value = "0.0", inclusive = false, message = "Price must be greater than 0")
    BigDecimal price

    @Column(name = "duration_minutes", nullable = false)
    @Min(value = 1, message = "Duration must be at least 1 minute")
    Integer durationMinutes

    @Column(name = "thumbnail")
    String thumbnail

    @Enumerated(EnumType.STRING)
    @Column(name = "category")
    ServiceCategory category

    @Column(name = "active", nullable = false)
    Boolean active = true

    @Column(name = "online_booking_enabled", nullable = false)
    Boolean onlineBookingEnabled = true

    @Column(name = "requires_deposit", nullable = false)
    Boolean requiresDeposit = false

    @Column(name = "deposit_amount", precision = 10, scale = 2)
    BigDecimal depositAmount

    @Column(name = "cancellation_policy")
    String cancellationPolicy

    @Column(name = "cleanup_time_minutes")
    Integer cleanupTimeMinutes = 0

    @Column(name = "booking_buffer_minutes", nullable = false)
    @Min(value = 0, message = "Booking buffer must be at least 0 minutes")
    Integer bookingBufferMinutes = 15

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt

    // Relationships
    @OneToMany(mappedBy = "service", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    Set<Appointment> appointments = new HashSet<>()

    @OneToMany(mappedBy = "service", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    Set<ServiceEmployee> serviceEmployees = new HashSet<>()

    Duration getDuration() {
        return Duration.ofMinutes(durationMinutes)
    }

    Duration getTotalDuration() {
        return Duration.ofMinutes(durationMinutes + preparationTimeMinutes + cleanupTimeMinutes)
    }

    String getFormattedPrice() {
        return "\$${price}"
    }

    String getFormattedDuration() {
        if (durationMinutes < 60) {
            return "${durationMinutes} min"
        } else {
            int hours = durationMinutes.intdiv(60)
            int minutes = durationMinutes % 60
            if (minutes == 0) {
                return "${hours}h"
            } else {
                return "${hours}h ${minutes}min"
            }
        }
    }

    boolean isBookable() {
        return active && onlineBookingEnabled && hasAvailableEmployees()
    }

    boolean hasAvailableEmployees() {
        return serviceEmployees?.any { it.active && it.employee?.isAvailable() }
    }

    List<Employee> getActiveEmployees() {
        return serviceEmployees?.findAll { it.active }?.collect { it.employee } ?: []
    }

    String getEmployeeName() {
        // Return the first active employee name
        def activeEmployees = getActiveEmployees()
        return activeEmployees ? activeEmployees.first()?.getFullName() : null
    }

    String getShopName() {
        return shop?.name
    }
}
