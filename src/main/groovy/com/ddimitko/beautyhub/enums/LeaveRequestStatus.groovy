package com.ddimitko.beautyhub.enums

enum LeaveRequestStatus {
    PENDING('Pending Review'),
    APPROVED('Approved'),
    REJECTED('Rejected'),
    CANCELLED('Cancelled')

    final String displayName

    LeaveRequestStatus(String displayName) {
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
