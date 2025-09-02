package com.ddimitko.beautyhub.dto

import lombok.Data

@Data
class ShopWithSubscriptionResponse {
    UUID shopId
    String shopName
    String message
    Boolean success

    // Subscription details
    String subscriptionStatus  // Use Stripe's native status strings
    String subscriptionId
    String clientSecret
    Boolean requiresPayment

    // Next steps
    String redirectUrl
    Boolean shopActive
}
