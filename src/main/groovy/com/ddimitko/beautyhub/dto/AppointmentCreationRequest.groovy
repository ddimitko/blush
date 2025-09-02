package com.ddimitko.beautyhub.dto

import com.ddimitko.beautyhub.enums.PaymentType
import com.fasterxml.jackson.annotation.JsonFormat
import com.fasterxml.jackson.annotation.JsonIgnore
import jakarta.validation.constraints.*
import lombok.Data

import java.math.BigDecimal
import java.time.LocalDateTime

@Data
class AppointmentCreationRequest {

    @NotNull(message = "Shop ID is required")
    UUID shopId

    @NotNull(message = "Employee ID is required")
    UUID employeeId

    @NotNull(message = "Service ID is required")
    UUID serviceId

    // Appointment datetime expected in UTC format from frontend
    @NotNull(message = "Appointment date and time is required")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    LocalDateTime appointmentDateTime
    
    @NotNull(message = "Payment type is required")
    PaymentType paymentType
    
    @Size(max = 1000, message = "Notes cannot exceed 1000 characters")
    String notes

    // Slot lock token (required for appointment creation)
    @NotBlank(message = "Slot lock token is required")
    String slotLockToken

    // Guest user information (required if user is not authenticated)
    @Email(message = "Valid email is required for guest bookings")
    String guestEmail
    
    @Size(min = 1, max = 100, message = "First name must be between 1 and 100 characters")
    String guestFirstName
    
    @Size(min = 1, max = 100, message = "Last name must be between 1 and 100 characters")
    String guestLastName
    
    @Pattern(regexp = "^\\+?[1-9]\\d{1,14}\$", message = "Invalid phone number format")
    String guestPhone
    
    // Stripe payment information (if payment type is CARD)
    String paymentIntentId
    String paymentMethodId
    

    
    // Deposit amount (optional, defaults to service deposit requirement)
    @DecimalMin(value = "0.0", message = "Deposit amount cannot be negative")
    BigDecimal depositAmount
    
    @JsonIgnore
    boolean isGuestBooking() {
        return guestEmail != null && !guestEmail.trim().isEmpty()
    }

    @JsonIgnore
    boolean requiresPayment() {
        return paymentType == PaymentType.CARD
    }
}
