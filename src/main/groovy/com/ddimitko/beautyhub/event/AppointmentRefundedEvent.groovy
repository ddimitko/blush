package com.ddimitko.beautyhub.event

/**
 * Event published when an appointment is refunded
 * Only stores IDs to avoid lazy loading issues
 */
class AppointmentRefundedEvent {
    final UUID appointmentId
    final UUID refundedById

    AppointmentRefundedEvent(UUID appointmentId, UUID refundedById) {
        this.appointmentId = appointmentId
        this.refundedById = refundedById
    }
}
