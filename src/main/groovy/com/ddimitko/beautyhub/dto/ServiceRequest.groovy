package com.ddimitko.beautyhub.dto

import com.ddimitko.beautyhub.enums.ServiceCategory
import jakarta.validation.constraints.*
import lombok.Data

@Data
class ServiceRequest {

    @NotBlank(message = "Service name is required")
    @Size(min = 2, max = 100, message = "Service name must be between 2 and 100 characters")
    String name

    @Size(max = 500, message = "Description cannot exceed 500 characters")
    String description

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.01", message = "Price must be greater than 0")
    @Digits(integer = 8, fraction = 2, message = "Price must be a valid monetary amount")
    BigDecimal price

    @NotNull(message = "Duration is required")
    @Min(value = 1, message = "Duration must be at least 1 minute")
    @Max(value = 1440, message = "Duration cannot exceed 24 hours")
    Integer durationMinutes

    @DecimalMin(value = "0.00", message = "Deposit amount cannot be negative")
    @Digits(integer = 8, fraction = 2, message = "Deposit amount must be a valid monetary amount")
    BigDecimal depositAmount

    @NotNull(message = "Category is required")
    ServiceCategory category

    @NotNull(message = "Shop ID is required")
    UUID shopId

    // Employee IDs are now optional - services can be created without employees (inactive)
    List<UUID> employeeIds = []

    // Active status - defaults to true if employees are assigned, false if no employees
    Boolean active

    @Min(value = 0, message = "Booking buffer must be at least 0 minutes")
    @Max(value = 120, message = "Booking buffer cannot exceed 2 hours")
    Integer bookingBufferMinutes = 15
}
