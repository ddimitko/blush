package com.ddimitko.beautyhub.enums

enum NotificationType {
    APPOINTMENT_REMINDER("Appointment Reminder"),
    APPOINTMENT_CONFIRMED("Appointment Confirmed"),
    APPOINTMENT_CANCELLED("Appointment Cancelled"),
    APPOINTMENT_RESCHEDULED("Appointment Rescheduled"),
    APPOINTMENT_CREATED("New Appointment Created"),
    APPOINTMENT_EDITED("Appointment Updated"),
    APPOINTMENT_CANCELLED_BY_CUSTOMER("Appointment Cancelled by Customer"),
    APPOINTMENT_CANCELLED_BY_EMPLOYEE("Appointment Cancelled by Employee"),
    APPOINTMENT_EDITED_BY_CUSTOMER("Appointment Updated by Customer"),
    APPOINTMENT_EDITED_BY_EMPLOYEE("Appointment Updated by Employee"),
    APPOINTMENT_REFUNDED("Appointment Refunded"),
    PAYMENT_RECEIVED("Payment Received"),
    PAYMENT_FAILED("Payment Failed"),
    NEW_BOOKING("New Booking"),
    BOOKING_CANCELLED("Booking Cancelled"),
    EMPLOYEE_INVITATION("Employee Invitation"),
    LEAVE_REQUEST_SUBMITTED("Leave Request Submitted"),
    LEAVE_REQUEST_APPROVED("Leave Request Approved"),
    LEAVE_REQUEST_REJECTED("Leave Request Rejected"),
    LEAVE_CANCELLED("Leave Request Cancelled"),
    SHOP_APPROVED("Shop Approved"),
    SHOP_REJECTED("Shop Rejected"),
    SUBSCRIPTION_EXPIRING("Subscription Expiring"),
    SUBSCRIPTION_RENEWED("Subscription Renewed"),
    SUBSCRIPTION_CANCELLED("Subscription Cancelled"),
    REVIEW_REQUEST("Review Request"),
    APPOINTMENT_NO_SHOW("Appointment No-Show"),
    APPOINTMENT_STARTED("Appointment Started"),
    APPOINTMENT_STATUS_CHANGED("Appointment Status Changed"),
    SYSTEM_MAINTENANCE("System Maintenance"),
    PROMOTIONAL("Promotional"),
    GENERAL("General")

    private final String displayName

    NotificationType(String displayName) {
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
