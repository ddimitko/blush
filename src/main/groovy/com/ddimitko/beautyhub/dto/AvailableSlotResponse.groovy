package com.ddimitko.beautyhub.dto

import com.fasterxml.jackson.annotation.JsonFormat
import lombok.Data

import java.math.BigDecimal
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.format.DateTimeFormatter

@Data
class AvailableSlotResponse {

    // All datetime fields are stored and returned in UTC
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    LocalDateTime dateTime

    @JsonFormat(pattern = "HH:mm")
    LocalTime startTime

    @JsonFormat(pattern = "HH:mm")
    LocalTime endTime

    boolean available
    boolean locked
    String lockedBy // User ID who locked the slot
    
    // Employee information
    UUID employeeId
    String employeeName
    
    // Service information
    UUID serviceId
    String serviceName
    Integer durationMinutes
    BigDecimal price
    
    // Backward compatibility field - returns UTC time in HH:mm format
    String getTime() {
        return startTime?.format(DateTimeFormatter.ofPattern("HH:mm"))
    }

    // Note: These formatting methods return UTC times
    // Frontend should handle timezone conversion for display
    String getFormattedTime() {
        return startTime?.format(DateTimeFormatter.ofPattern("HH:mm"))
    }

    String getFormattedTimeRange() {
        return "${startTime?.format(DateTimeFormatter.ofPattern('HH:mm'))} - ${endTime?.format(DateTimeFormatter.ofPattern('HH:mm'))}"
    }

    // UTC datetime string for frontend timezone conversion
    String getUtcDateTime() {
        return dateTime?.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'"))
    }

    boolean isBookable() {
        return available && !locked
    }
}
