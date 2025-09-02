package com.ddimitko.beautyhub.enums

enum SubscriptionStatus {
    PENDING,        // Subscription created but payment not completed
    CONFIRMED,      // Payment successful, subscription active
    FAILED,         // Payment failed
    CANCELLED,      // Subscription cancelled
    EXPIRED         // Subscription expired
}
