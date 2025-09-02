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
import java.time.ZoneOffset

@Service
@Slf4j
class AppointmentReminderScheduler {

    @Autowired
    private AppointmentRepository appointmentRepository

    @Autowired
    private AppointmentNotificationService appointmentNotificationService

    /**
     * Send appointment reminders every hour for appointments happening in the next 24 hours
     * This runs every hour at minute 0
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    void sendAppointmentReminders() {
        log.info("Starting scheduled appointment reminder check")
        
        try {
            LocalDateTime nowUtc = LocalDateTime.now(ZoneOffset.UTC)
            LocalDateTime reminderStart = nowUtc.plusHours(23) // 23 hours from now
            LocalDateTime reminderEnd = nowUtc.plusHours(25)   // 25 hours from now (1-hour window)
            
            // Find appointments that need reminders
            List<Appointment> appointmentsNeedingReminders = appointmentRepository
                .findByAppointmentDateTimeBetweenAndStatusAndReminderSentFalse(
                    reminderStart, 
                    reminderEnd, 
                    AppointmentStatus.CONFIRMED
                )
            
            log.info("Found ${appointmentsNeedingReminders.size()} appointments needing reminders")
            
            for (Appointment appointment : appointmentsNeedingReminders) {
                try {
                    // Only send reminders to appointments with registered users (not guests)
                    if (appointment.user) {
                        // Initialize entities to prevent lazy loading issues
                        initializeAppointmentEntities(appointment)

                        appointmentNotificationService.sendAppointmentReminder(appointment)

                        // Mark reminder as sent to avoid duplicate reminders
                        appointment.reminderSent = true
                        appointmentRepository.save(appointment)

                        log.info("Sent reminder for appointment ${appointment.id} to user ${appointment.user.email}")
                    } else {
                        log.info("Skipping reminder for guest appointment ${appointment.id}")
                    }
                } catch (Exception e) {
                    log.error("Failed to send reminder for appointment ${appointment.id}", e)
                }
            }
            
            log.info("Completed scheduled appointment reminder check")
        } catch (Exception e) {
            log.error("Error during scheduled appointment reminder check", e)
        }
    }

    /**
     * Send appointment reminders for appointments happening tomorrow
     * This runs daily at 9 AM
     */
    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    void sendDailyAppointmentReminders() {
        log.info("Starting daily appointment reminder check")
        
        try {
            LocalDateTime nowUtc = LocalDateTime.now(ZoneOffset.UTC)
            LocalDateTime tomorrowStart = nowUtc.plusDays(1).withHour(0).withMinute(0).withSecond(0).withNano(0)
            LocalDateTime tomorrowEnd = tomorrowStart.plusDays(1).minusSeconds(1)
            
            // Find appointments for tomorrow that haven't received daily reminders
            List<Appointment> tomorrowAppointments = appointmentRepository
                .findByAppointmentDateTimeBetweenAndStatusAndDailyReminderSentFalse(
                    tomorrowStart, 
                    tomorrowEnd, 
                    AppointmentStatus.CONFIRMED
                )
            
            log.info("Found ${tomorrowAppointments.size()} appointments for tomorrow needing daily reminders")
            
            for (Appointment appointment : tomorrowAppointments) {
                try {
                    if (appointment.user) {
                        // Initialize entities to prevent lazy loading issues
                        initializeAppointmentEntities(appointment)

                        String customMessage = "Don't forget about your appointment tomorrow!"
                        appointmentNotificationService.sendAppointmentReminder(appointment, customMessage)

                        // Mark daily reminder as sent
                        appointment.dailyReminderSent = true
                        appointmentRepository.save(appointment)

                        log.info("Sent daily reminder for appointment ${appointment.id} to user ${appointment.user.email}")
                    }
                } catch (Exception e) {
                    log.error("Failed to send daily reminder for appointment ${appointment.id}", e)
                }
            }
            
            log.info("Completed daily appointment reminder check")
        } catch (Exception e) {
            log.error("Error during daily appointment reminder check", e)
        }
    }

    /**
     * Clean up old reminder flags for completed appointments
     * This runs daily at midnight
     */
    @Scheduled(cron = "0 0 0 * * *")
    void cleanupOldReminderFlags() {
        log.info("Starting cleanup of old reminder flags")
        
        try {
            LocalDateTime cutoffDate = LocalDateTime.now(ZoneOffset.UTC).minusDays(7)
            
            // Reset reminder flags for old completed/cancelled appointments
            int updatedCount = appointmentRepository.resetReminderFlagsForOldAppointments(cutoffDate)
            
            log.info("Reset reminder flags for ${updatedCount} old appointments")
        } catch (Exception e) {
            log.error("Error during reminder flags cleanup", e)
        }
    }

    /**
     * Initialize lazy-loaded entities to prevent LazyInitializationException
     */
    private void initializeAppointmentEntities(Appointment appointment) {
        try {
            // Force initialization of lazy-loaded entities
            if (appointment.user) {
                appointment.user.firstName // Access property to trigger initialization
                appointment.user.lastName
                appointment.user.email
            }
            if (appointment.employee) {
                appointment.employee.user?.firstName // Access nested properties
                appointment.employee.user?.lastName
            }
            if (appointment.service) {
                appointment.service.name // Access service name
            }
            if (appointment.shop) {
                appointment.shop.name // Access shop name
                appointment.shop.address
            }
        } catch (Exception e) {
            log.warn("Failed to initialize appointment entities for appointment: ${appointment.id}", e)
        }
    }
}
