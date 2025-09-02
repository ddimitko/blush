package com.ddimitko.beautyhub.event

/**
 * Event published when an appointment is cancelled
 * Only stores IDs to avoid lazy loading issues
 */
class AppointmentCancelledEvent {
    final UUID appointmentId
    final UUID cancelledById

    AppointmentCancelledEvent(UUID appointmentId, UUID cancelledById) {
        this.appointmentId = appointmentId
        this.cancelledById = cancelledById
    }
}
