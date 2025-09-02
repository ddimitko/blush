package com.ddimitko.beautyhub.dto

import lombok.Data

@Data
class SubscriptionPlanResponse {
    String id                    // Stripe Price ID
    String productId             // Stripe Product ID
    String name                  // Product name
    String displayName           // Display name for UI
    String description           // Product description
    Integer priceInCents         // Price in cents
    String currency              // Currency code (USD, EUR, etc.)
    String interval              // Billing interval (month, year)
    Integer intervalCount        // Interval count (1 for monthly, 1 for yearly, etc.)
    String formattedPrice        // Formatted price string ($29.99)
    String formattedPriceWithInterval // Formatted price with interval ($29.99/month)
    Boolean isYearly = false     // True if yearly plan

    // Trial-related fields
    Boolean hasFreeTrial = true  // All plans include 30-day free trial
    Integer trialDays = 30       // Number of trial days
    String trialDescription = "30-day free trial included" // Trial description for UI
    Boolean isMonthly = false    // True if monthly plan
    Boolean recommended = false  // True if this plan is recommended
    String savings              // Savings text for yearly plans
    List<String> features = []   // List of plan features
    Date createdAt = new Date()  // When this response was created
}
