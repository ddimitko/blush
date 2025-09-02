package com.ddimitko.beautyhub.event

import com.ddimitko.beautyhub.enums.AppointmentStatus

/**
 * Event published when an appointment status changes
 */
class AppointmentStatusChangedEvent {
    final UUID appointmentId
    final AppointmentStatus oldStatus
    final AppointmentStatus newStatus
    final UUID changedById
    final Date timestamp

    AppointmentStatusChangedEvent(UUID appointmentId, AppointmentStatus oldStatus, AppointmentStatus newStatus, UUID changedById) {
        this.appointmentId = appointmentId
        this.oldStatus = oldStatus
        this.newStatus = newStatus
        this.changedById = changedById
        this.timestamp = new Date()
    }
}
