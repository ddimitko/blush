package com.ddimitko.beautyhub.entity

import com.ddimitko.beautyhub.enums.AppointmentStatus
import com.ddimitko.beautyhub.enums.PaymentType
import groovy.transform.EqualsAndHashCode
import groovy.transform.ToString
import jakarta.persistence.*
import jakarta.validation.constraints.Future
import jakarta.validation.constraints.*
import lombok.AllArgsConstructor
import lombok.Builder
import lombok.Data
import lombok.NoArgsConstructor
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@Entity
@Table(name = "appointments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(excludes = ["user", "shop", "employee", "service"])
@ToString(excludes = ["user", "shop", "employee", "service"])
class Appointment {

    @Id
    @Column(name = "id")
    UUID id

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    User user

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", nullable = false)
    @NotNull(message = "Shop is required")
    Shop shop

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    @NotNull(message = "Employee is required")
    Employee employee

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    @NotNull(message = "Service is required")
    Service service

    @Column(name = "appointment_datetime", nullable = false)
    @NotNull(message = "Appointment date and time is required")
    LocalDateTime appointmentDateTime

    @Column(name = "end_datetime", nullable = false)
    LocalDateTime endDateTime

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    AppointmentStatus status = AppointmentStatus.PENDING

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_type", nullable = false)
    PaymentType paymentType

    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    @NotNull(message = "Total amount is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Total amount must be greater than 0")
    BigDecimal totalAmount

    @Column(name = "deposit_amount", precision = 10, scale = 2)
    BigDecimal depositAmount

    @Column(name = "payment_intent_id")
    String paymentIntentId

    @Column(name = "payment_method_id")
    String paymentMethodId

    @Column(name = "payment_status")
    String paymentStatus

    @Column(name = "refund_id")
    String refundId

    @Column(name = "refund_status")
    String refundStatus

    @Column(name = "refund_amount")
    BigDecimal refundAmount

    @Column(name = "refund_date")
    LocalDateTime refundDate

    @Column(name = "notes", columnDefinition = "TEXT")
    String notes

    @Column(name = "cancellation_reason")
    String cancellationReason

    @Column(name = "cancelled_at")
    LocalDateTime cancelledAt

    @Column(name = "cancelled_by")
    String cancelledBy

    @Column(name = "reminder_sent", nullable = false)
    Boolean reminderSent = false

    @Column(name = "daily_reminder_sent", nullable = true)
    Boolean dailyReminderSent = false

    @Column(name = "confirmation_sent", nullable = false)
    Boolean confirmationSent = false

    @Column(name = "review_requested", nullable = false, columnDefinition = "boolean default false")
    Boolean reviewRequested = false

    @Column(name = "completed_at")
    LocalDateTime completedAt

    @Column(name = "no_show_marked_at")
    LocalDateTime noShowMarkedAt

    // Guest user information (for unauthenticated bookings)
    @Column(name = "guest_email")
    @Email(message = "Guest email must be a valid email address")
    String guestEmail

    @Column(name = "guest_first_name")
    String guestFirstName

    @Column(name = "guest_last_name")
    String guestLastName

    @Column(name = "guest_phone")
    String guestPhone

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt

    @PrePersist
    void prePersist() {
        // Generate ID if not set
        if (!id) {
            id = UUID.randomUUID()
        }

        // Calculate end date time
        if (appointmentDateTime && service?.durationMinutes) {
            endDateTime = appointmentDateTime.plusMinutes(service.durationMinutes)
        }
    }

    @PreUpdate
    void updateEndDateTime() {
        if (appointmentDateTime && service?.durationMinutes) {
            endDateTime = appointmentDateTime.plusMinutes(service.durationMinutes)
        }
    }

    boolean canBeCancelled() {
        return status in [AppointmentStatus.CONFIRMED] &&
               appointmentDateTime.isAfter(LocalDateTime.now().plusHours(24))
    }

    boolean canBeModified() {
        return status in [AppointmentStatus.CONFIRMED] &&
               appointmentDateTime.isAfter(LocalDateTime.now().plusHours(24))
    }

    boolean isUpcoming() {
        return appointmentDateTime.isAfter(LocalDateTime.now()) &&
               status in [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]
    }

    boolean isPast() {
        return appointmentDateTime.isBefore(LocalDateTime.now())
    }

    boolean requiresPayment() {
        return paymentType == PaymentType.CARD && !paymentIntentId
    }

    boolean hasSuccessfulCardPayment() {
        return paymentType == PaymentType.CARD &&
               paymentIntentId &&
               paymentStatus?.toLowerCase() in ['succeeded', 'paid'] &&
               totalAmount > 0
    }

    boolean canBeRefunded() {
        return hasSuccessfulCardPayment() && !refundId
    }

    String getFormattedDateTime() {
        return appointmentDateTime.format(DateTimeFormatter.ofPattern("MMM dd, yyyy 'at' h:mm a"))
    }

    String getUserName() {
        return user?.getFullName()
    }

    String getCustomerName() {
        return user?.getFullName() ?: "${guestFirstName} ${guestLastName}".trim()
    }

    String getCustomerEmail() {
        return user?.email ?: guestEmail
    }

    boolean isGuestAppointment() {
        return user == null
    }

    String getEmployeeName() {
        return employee?.getFullName()
    }

    String getServiceName() {
        return service?.name
    }

    String getShopName() {
        return shop?.name
    }
}
