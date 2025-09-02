package com.ddimitko.beautyhub.dto

import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import lombok.Data

@Data
class EmployeeCreationWithUserRequest {
    // User creation fields
    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    String email
    
    @NotBlank(message = "First name is required")
    @Size(min = 1, max = 100, message = "First name must be between 1 and 100 characters")
    String firstName
    
    @NotBlank(message = "Last name is required")
    @Size(min = 1, max = 100, message = "Last name must be between 1 and 100 characters")
    String lastName
    
    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    String password

    // This field is used for frontend validation only
    String confirmPassword

    // Phone number field
    String phone

    // Employee profile fields
    String bio
    String specialties
    
    @Min(value = 0, message = "Years of experience cannot be negative")
    @Max(value = 50, message = "Years of experience cannot exceed 50")
    Integer yearsExperience
    
    @DecimalMin(value = "0.0", message = "Hourly rate cannot be negative")
    BigDecimal hourlyRate
    
    @DecimalMin(value = "0.0", message = "Commission rate cannot be negative")
    BigDecimal commissionRate
}
