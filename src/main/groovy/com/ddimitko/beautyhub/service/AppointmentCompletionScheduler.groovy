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
class AppointmentCompletionScheduler {

    @Autowired
    AppointmentRepository appointmentRepository

    @Autowired
    AppointmentNotificationService appointmentNotificationService

    @Autowired
    SystemUserService systemUserService

    /**
     * Mark appointments as completed after their end time and send review notifications
     * This runs every 30 minutes
     */
    @Scheduled(cron = "0 */30 * * * *")
    @Transactional
    void markAppointmentsAsCompleted() {
        log.info("Starting scheduled appointment completion check")
        
        try {
            LocalDateTime now = LocalDateTime.now()
            
            // Find confirmed and in-progress appointments that have passed their end time
            List<Appointment> confirmedAppointments = appointmentRepository
                .findByStatusAndEndDateTimeBefore(AppointmentStatus.CONFIRMED, now)
            List<Appointment> inProgressAppointments = appointmentRepository
                .findByStatusAndEndDateTimeBefore(AppointmentStatus.IN_PROGRESS, now)

            List<Appointment> appointmentsToComplete = []
            appointmentsToComplete.addAll(confirmedAppointments)
            appointmentsToComplete.addAll(inProgressAppointments)
            
            log.info("Found ${appointmentsToComplete.size()} appointments to mark as completed")
            
            for (Appointment appointment : appointmentsToComplete) {
                try {
                    // Mark appointment as completed
                    appointment.status = AppointmentStatus.COMPLETED
                    appointment.completedAt = now
                    appointmentRepository.save(appointment)
                    
                    log.info("Marked appointment ${appointment.id} as completed")
                    
                    // Send review notification to customer (both authenticated and guest users)
                    if (!appointment.reviewRequested) {
                        try {
                            if (appointment.user) {
                                // Send notification and email for authenticated users
                                appointmentNotificationService.sendReviewNotification(appointment)
                                log.info("Sent review notification for appointment ${appointment.id} to user ${appointment.user.email}")
                            } else if (appointment.guestEmail) {
                                // Send email only for guest users (no in-app notification)
                                appointmentNotificationService.sendGuestReviewEmail(appointment)
                                log.info("Sent guest review email for appointment ${appointment.id} to ${appointment.guestEmail}")
                            }

                            // Mark review as requested to avoid duplicate notifications
                            appointment.reviewRequested = true
                            appointmentRepository.save(appointment)
                        } catch (Exception e) {
                            log.error("Failed to send review notification for appointment ${appointment.id}", e)
                        }
                    } else {
                        log.info("Skipping review notification for appointment ${appointment.id} - already requested")
                    }
                    
                } catch (Exception e) {
                    log.error("Failed to mark appointment ${appointment.id} as completed", e)
                }
            }
            
            log.info("Completed appointment completion check")
        } catch (Exception e) {
            log.error("Error during appointment completion check", e)
        }
    }

    /**
     * Clean up old completed appointments (optional - for performance)
     * This runs daily at 2 AM
     */
    @Scheduled(cron = "0 0 2 * * *")
    void cleanupOldCompletedAppointments() {
        log.info("Starting cleanup of old completed appointments")
        
        try {
            LocalDateTime cutoffDate = LocalDateTime.now().minusMonths(6) // Keep 6 months of history
            
            // You could implement archiving logic here if needed
            // For now, we'll just log the count of old appointments
            int oldAppointmentsCount = appointmentRepository
                .countByStatusAndCompletedAtBefore(AppointmentStatus.COMPLETED, cutoffDate)
            
            log.info("Found ${oldAppointmentsCount} completed appointments older than 6 months")
            
            // Implement archiving logic here if needed
            // Example: Move to archive table, compress data, etc.
            
        } catch (Exception e) {
            log.error("Error during old appointments cleanup", e)
        }
    }

    /**
     * Handle no-show appointments
     * This runs every hour to check for appointments that should be marked as no-show
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    void handleNoShowAppointments() {
        log.info("Starting no-show appointment check")
        
        try {
            LocalDateTime now = LocalDateTime.now()
            LocalDateTime noShowThreshold = now.minusHours(1) // 1 hour grace period
            
            // Find confirmed appointments that are past their time + grace period
            List<Appointment> potentialNoShows = appointmentRepository
                .findByStatusAndEndDateTimeBefore(AppointmentStatus.CONFIRMED, noShowThreshold)
            
            log.info("Found ${potentialNoShows.size()} potential no-show appointments")
            
            for (Appointment appointment : potentialNoShows) {
                try {
                    // Check if appointment should be marked as no-show
                    // (This could include additional business logic)
                    
                    appointment.status = AppointmentStatus.NO_SHOW
                    appointment.noShowMarkedAt = now
                    appointmentRepository.save(appointment)
                    
                    log.info("Marked appointment ${appointment.id} as no-show")
                    
                    // Optionally send notification to shop owner/employee
                    try {
                        appointmentNotificationService.sendNoShowNotification(appointment)
                    } catch (Exception e) {
                        log.error("Failed to send no-show notification for appointment ${appointment.id}", e)
                    }
                    
                } catch (Exception e) {
                    log.error("Failed to mark appointment ${appointment.id} as no-show", e)
                }
            }
            
            log.info("Completed no-show appointment check")
        } catch (Exception e) {
            log.error("Error during no-show appointment check", e)
        }
    }
}
