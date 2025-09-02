package com.ddimitko.beautyhub.dto

import jakarta.validation.constraints.*
import lombok.Data

@Data
class PaymentIntentRequest {
    
    @NotNull(message = "Shop ID is required")
    UUID shopId
    
    @NotNull(message = "Service ID is required")
    UUID serviceId
    
    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    BigDecimal amount
    
    @NotBlank(message = "Currency is required")
    String currency = "usd"
    
    @Size(max = 500, message = "Description cannot exceed 500 characters")
    String description
    
    // Customer information
    String customerEmail
    String customerName
    
    // Metadata for tracking
    Map<String, String> metadata = [:]
}
