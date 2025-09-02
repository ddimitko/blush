package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.entity.Appointment
import com.ddimitko.beautyhub.enums.AppointmentStatus
import com.ddimitko.beautyhub.repository.AppointmentRepository
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

import java.time.LocalDateTime

@Service
@Slf4j
class AppointmentProgressionScheduler {

    @Autowired
    AppointmentRepository appointmentRepository

    @Autowired
    AppointmentService appointmentService

    @Autowired
    AppointmentEventService appointmentEventService

    @Autowired
    SystemUserService systemUserService

    /**
     * Automatically progress confirmed appointments to in-progress when their start time arrives
     * This runs every 5 minutes to ensure timely status updates
     */
    @Scheduled(cron = "0 */5 * * * *")
    @Transactional
    void progressAppointmentsToInProgress() {
        log.info("Starting scheduled appointment progression check")
        
        try {
            LocalDateTime now = LocalDateTime.now()
            
            // Find confirmed appointments that have reached or passed their start time
            List<Appointment> appointmentsToProgress = appointmentRepository
                .findByStatusAndAppointmentDateTimeBefore(AppointmentStatus.CONFIRMED, now)
            
            log.info("Found ${appointmentsToProgress.size()} appointments to progress to IN_PROGRESS")
            
            for (Appointment appointment : appointmentsToProgress) {
                try {
                    // Store old status for event
                    AppointmentStatus oldStatus = appointment.status
                    
                    // Update appointment status to IN_PROGRESS
                    appointment.status = AppointmentStatus.IN_PROGRESS
                    appointment = appointmentRepository.save(appointment)
                    
                    log.info("Automatically progressed appointment ${appointment.id} from ${oldStatus} to IN_PROGRESS")
                    
                    // Trigger status change event for real-time notifications and side effects
                    try {
                        // Use system user for automatic progression
                        appointmentEventService.onAppointmentStatusChanged(appointment, oldStatus, systemUserService.getSystemUser())
                    } catch (Exception e) {
                        log.error("Failed to send status change event for appointment ${appointment.id}", e)
                        // Don't fail the status update if event handling fails
                    }
                    
                } catch (Exception e) {
                    log.error("Failed to progress appointment ${appointment.id} to IN_PROGRESS", e)
                }
            }
            
            log.info("Completed scheduled appointment progression check")
            
        } catch (Exception e) {
            log.error("Error during appointment progression check", e)
        }
    }

    /**
     * Handle appointments that should have started but are still confirmed after a grace period
     * This runs every 30 minutes to check for appointments that might need attention
     */
    @Scheduled(cron = "0 */30 * * * *")
    @Transactional
    void handleDelayedAppointments() {
        log.info("Starting delayed appointment check")
        
        try {
            LocalDateTime now = LocalDateTime.now()
            LocalDateTime delayThreshold = now.minusMinutes(15) // 15 minutes grace period
            
            // Find confirmed appointments that are more than 15 minutes past their start time
            List<Appointment> delayedAppointments = appointmentRepository
                .findByStatusAndAppointmentDateTimeBefore(AppointmentStatus.CONFIRMED, delayThreshold)
            
            log.info("Found ${delayedAppointments.size()} delayed appointments (still CONFIRMED after 15+ minutes)")
            
            for (Appointment appointment : delayedAppointments) {
                try {
                    // Log the delayed appointment for monitoring purposes
                    log.warn("Appointment ${appointment.id} is delayed - scheduled for ${appointment.appointmentDateTime} but still CONFIRMED at ${now}")
                    
                    // Optionally, you could implement additional logic here:
                    // - Send notifications to shop owners/employees about delayed appointments
                    // - Automatically mark as no-show after a longer delay
                    // - Send reminders to customers
                    
                    // For now, we'll just log and let manual intervention handle it
                    // The existing no-show scheduler will handle appointments that are significantly overdue
                    
                } catch (Exception e) {
                    log.error("Failed to process delayed appointment ${appointment.id}", e)
                }
            }
            
            log.info("Completed delayed appointment check")
            
        } catch (Exception e) {
            log.error("Error during delayed appointment check", e)
        }
    }
}
