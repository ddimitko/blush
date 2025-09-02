package com.ddimitko.beautyhub.enums

enum LeaveType {
    VACATION('Vacation'),
    SICK_LEAVE('Sick Leave'),
    PERSONAL('Personal Leave'),
    MATERNITY('Maternity Leave'),
    PATERNITY('Paternity Leave'),
    EMERGENCY('Emergency Leave'),
    UNPAID('Unpaid Leave'),
    OTHER('Other')

    final String displayName

    LeaveType(String displayName) {
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
