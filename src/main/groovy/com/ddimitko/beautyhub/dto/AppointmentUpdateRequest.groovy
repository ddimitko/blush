package com.ddimitko.beautyhub.dto

import com.fasterxml.jackson.annotation.JsonFormat
import jakarta.validation.constraints.*
import lombok.Data

import java.time.LocalDateTime

@Data
class AppointmentUpdateRequest {

    // Appointment datetime expected in UTC format from frontend
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    LocalDateTime appointmentDateTime

    @Size(max = 1000, message = "Notes cannot exceed 1000 characters")
    String notes

    // Slot locking validation for rescheduling
    String lockToken

    // Only allow updates to these fields
    // Service, employee, and payment details cannot be changed after creation
}
