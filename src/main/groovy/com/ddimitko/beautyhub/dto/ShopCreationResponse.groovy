package com.ddimitko.beautyhub.dto

import lombok.Data

@Data
class ShopCreationResponse {
    UUID shopId
    String message
    String name
    String address
    Boolean requiresStripeSetup
    Boolean requiresSubscription
    String nextStep
    String subscriptionId
    Boolean subscriptionActive = false
}
