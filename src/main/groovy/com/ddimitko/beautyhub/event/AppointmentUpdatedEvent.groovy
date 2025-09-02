package com.ddimitko.beautyhub.event

/**
 * Event published when an appointment is updated
 * Only stores IDs to avoid lazy loading issues
 */
class AppointmentUpdatedEvent {
    final UUID appointmentId
    final UUID updatedById

    AppointmentUpdatedEvent(UUID appointmentId, UUID updatedById) {
        this.appointmentId = appointmentId
        this.updatedById = updatedById
    }
}
