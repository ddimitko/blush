package com.ddimitko.beautyhub.dto

import jakarta.validation.constraints.NotNull
import lombok.Data

import java.time.LocalDateTime

@Data
class SlotLockRequest {
    
    @NotNull(message = "Shop ID is required")
    UUID shopId
    
    @NotNull(message = "Service ID is required")
    UUID serviceId
    
    @NotNull(message = "Employee ID is required")
    UUID employeeId
    
    @NotNull(message = "Date and time is required")
    LocalDateTime dateTime
    
    // Optional user ID for authenticated users
    UUID userId

    // Optional lock token for unlocking
    String lockToken
}
