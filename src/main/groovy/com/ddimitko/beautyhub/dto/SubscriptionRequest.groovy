package com.ddimitko.beautyhub.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.AssertTrue
import jakarta.validation.constraints.Pattern
import lombok.Data

@Data
class SubscriptionRequest {
    @NotBlank(message = "Stripe price ID is required")
    String stripePriceId

    // Payment method ID is no longer required - will be collected via Payment Element
    // @NotBlank(message = "Payment method ID is required")
    // String paymentMethodId

    // Customer information
    @NotBlank(message = "Customer name is required")
    String customerName

    @Email(message = "Valid email is required")
    @NotBlank(message = "Customer email is required")
    String customerEmail

    // Billing address
    @NotBlank(message = "Billing address is required")
    String billingAddressLine1

    String billingAddressLine2

    @NotBlank(message = "Billing city is required")
    String billingCity

    @NotBlank(message = "Billing state is required")
    String billingState

    @NotBlank(message = "Billing postal code is required")
    String billingPostalCode

    String billingCountry = "US"

    // Terms acceptance
    @NotNull(message = "Terms must be accepted")
    @AssertTrue(message = "You must accept the terms and conditions")
    Boolean termsAccepted = false
}
