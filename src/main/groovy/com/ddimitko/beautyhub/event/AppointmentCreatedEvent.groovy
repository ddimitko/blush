package com.ddimitko.beautyhub.event

/**
 * Event published when an appointment is created
 * Only stores the appointment ID to avoid lazy loading issues
 */
class AppointmentCreatedEvent {
    final UUID appointmentId

    AppointmentCreatedEvent(UUID appointmentId) {
        this.appointmentId = appointmentId
    }
}
