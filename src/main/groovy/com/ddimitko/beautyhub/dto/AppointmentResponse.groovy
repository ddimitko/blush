package com.ddimitko.beautyhub.dto

import com.ddimitko.beautyhub.enums.AppointmentStatus
import com.ddimitko.beautyhub.enums.PaymentType
import com.fasterxml.jackson.annotation.JsonFormat
import lombok.Data

import java.math.BigDecimal
import java.time.LocalDateTime
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

@Data
class AppointmentResponse {

    UUID id

    // Shop information
    UUID shopId
    String shopName
    String shopAddress
    String shopPhone
    String shopCountry

    // Employee information
    UUID employeeId
    String employeeName
    String employeeSpecialties

    // Service information
    UUID serviceId
    String serviceName
    String serviceDescription
    Integer serviceDurationMinutes
    BigDecimal servicePrice

    // User information (null for guest appointments)
    UUID userId
    String userName
    String userEmail

    // Guest information (null for authenticated user appointments)
    String guestEmail
    String guestFirstName
    String guestLastName
    String guestPhone

    // Appointment details - all times stored and returned in UTC
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    LocalDateTime appointmentDateTime

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    LocalDateTime endDateTime

    AppointmentStatus status
    PaymentType paymentType
    BigDecimal totalAmount
    BigDecimal depositAmount
    String notes
    
    // Payment information
    String paymentIntentId
    String paymentMethodId
    String paymentStatus

    // Refund information
    String refundId
    String refundStatus
    BigDecimal refundAmount

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    LocalDateTime refundDate

    // Cancellation information
    String cancellationReason

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    LocalDateTime cancelledAt

    String cancelledBy

    // Notification flags
    Boolean reminderSent
    Boolean confirmationSent

    // Timestamps - all in UTC
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    LocalDateTime createdAt

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    LocalDateTime updatedAt
    
    // Computed properties
    // Note: This returns UTC time - frontend should handle timezone conversion for display
    String getFormattedDateTime() {
        return appointmentDateTime?.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'"))
    }

    // UTC datetime string for frontend timezone conversion
    String getUtcDateTime() {
        return appointmentDateTime?.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'"))
    }
    
    String getCustomerName() {
        return userName ?: "${guestFirstName} ${guestLastName}".trim()
    }
    
    String getCustomerEmail() {
        return userEmail ?: guestEmail
    }
    
    boolean isGuestAppointment() {
        return userId == null
    }
    
    boolean canBeCancelled() {
        return status in [AppointmentStatus.CONFIRMED] &&
               appointmentDateTime?.isAfter(LocalDateTime.now(ZoneOffset.UTC).plusHours(1))
    }

    boolean canBeModified() {
        return status in [AppointmentStatus.CONFIRMED] &&
               appointmentDateTime?.isAfter(LocalDateTime.now(ZoneOffset.UTC).plusHours(1))
    }
    
    boolean isUpcoming() {
        return appointmentDateTime?.isAfter(LocalDateTime.now(ZoneOffset.UTC)) &&
               status in [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]
    }
    
    boolean requiresPayment() {
        return paymentType == PaymentType.CARD && !paymentIntentId
    }
}
