package com.ddimitko.beautyhub.enums

enum NotificationPriority {
    LOW("Low"),
    NORMAL("Normal"),
    HIGH("High"),
    URGENT("Urgent")

    private final String displayName

    NotificationPriority(String displayName) {
        this.displayName = displayName
    }

    String getDisplayName() {
        return displayName
    }

    @Override
    String toString() {
        return displayName
    }

    /**
     * Get retry delay in minutes based on priority
     */
    long getRetryDelayMinutes(int retryAttempt) {
        switch (this) {
            case URGENT:
                return Math.min(Math.pow(2, retryAttempt) as long, 15) // 2, 4, 8, 15 minutes max
            case HIGH:
                return Math.min(Math.pow(3, retryAttempt) as long, 30) // 3, 9, 27, 30 minutes max
            case NORMAL:
                return Math.min(Math.pow(5, retryAttempt) as long, 60) // 5, 25, 60 minutes max
            case LOW:
                return Math.min(Math.pow(10, retryAttempt) as long, 240) // 10, 100, 240 minutes max
            default:
                return Math.min(Math.pow(5, retryAttempt) as long, 60)
        }
    }

    /**
     * Get maximum retry attempts based on priority
     */
    int getMaxRetries() {
        switch (this) {
            case URGENT:
                return 5
            case HIGH:
                return 4
            case NORMAL:
                return 3
            case LOW:
                return 2
            default:
                return 3
        }
    }
}
