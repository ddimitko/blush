package com.ddimitko.beautyhub.dto

import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import lombok.Data

@Data
class EmployeeCreationRequest {
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
