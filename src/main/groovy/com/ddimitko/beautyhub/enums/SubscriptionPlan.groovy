package com.ddimitko.beautyhub.enums

enum SubscriptionPlan {
    BASIC_MONTHLY("Basic Monthly", "basic_monthly", 2999, "month", "Basic plan with essential features"),
    BASIC_YEARLY("Basic Yearly", "basic_yearly", 29999, "year", "Basic plan with essential features - Save 17%"),
    PREMIUM_MONTHLY("Premium Monthly", "premium_monthly", 4999, "month", "Premium plan with advanced features"),
    PREMIUM_YEARLY("Premium Yearly", "premium_yearly", 49999, "year", "Premium plan with advanced features - Save 17%")

    final String displayName
    final String stripePriceId
    final Integer priceInCents
    final String interval
    final String description

    SubscriptionPlan(String displayName, String stripePriceId, Integer priceInCents, String interval, String description) {
        this.displayName = displayName
        this.stripePriceId = stripePriceId
        this.priceInCents = priceInCents
        this.interval = interval
        this.description = description
    }

    String getFormattedPrice() {
        return String.format('$%.2f', priceInCents / 100.0)
    }

    String getFormattedPriceWithInterval() {
        return "${getFormattedPrice()}/${interval}"
    }

    boolean isYearly() {
        return interval == "year"
    }

    boolean isMonthly() {
        return interval == "month"
    }

    static SubscriptionPlan fromStripePriceId(String stripePriceId) {
        return values().find { it.stripePriceId == stripePriceId }
    }
}
