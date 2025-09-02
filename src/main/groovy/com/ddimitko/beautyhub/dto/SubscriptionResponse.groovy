package com.ddimitko.beautyhub.dto

import lombok.Data

@Data
class SubscriptionResponse {
    UUID shopId
    String subscriptionId
    String customerId
    String status
    String message
    String clientSecret  // For Payment Element integration
    Boolean requiresPayment = false  // True if payment is required to complete subscription
    String stripePriceId
    String planDisplayName
    Integer amount
    String currency
    String interval
    Date currentPeriodStart
    Date currentPeriodEnd
    Date nextBillingDate
    Date createdAt = new Date()
    Boolean isActive = true
    Boolean cancelAtPeriodEnd = false
    Date canceledAt
    String customerPortalUrl

    // Trial-related fields
    Boolean isTrialing = false
    Date trialStart
    Date trialEnd
    Integer trialDaysRemaining
    Boolean trialExpired = false
}
