package com.ddimitko.beautyhub.dto

import jakarta.validation.constraints.NotBlank
import lombok.Data

@Data
class SubscriptionUpdateRequest {
    @NotBlank(message = "New price ID is required")
    String newStripePriceId
    
    // Optional: Proration behavior
    Boolean prorate = true
    
    // Optional: When to apply the change
    String prorationBehavior = "create_prorations" // create_prorations, none, always_invoice
}
