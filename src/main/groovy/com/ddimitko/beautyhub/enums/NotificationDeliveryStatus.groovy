package com.ddimitko.beautyhub.enums

enum NotificationDeliveryStatus {
    PENDING("Pending"),
    PARTIALLY_DELIVERED("Partially Delivered"),
    DELIVERED("Delivered"),
    FAILED("Failed"),
    EXPIRED("Expired"),
    RETRYING("Retrying")

    private final String displayName

    NotificationDeliveryStatus(String displayName) {
        this.displayName = displayName
    }

    String getDisplayName() {
        return displayName
    }

    @Override
    String toString() {
        return displayName
    }
}
