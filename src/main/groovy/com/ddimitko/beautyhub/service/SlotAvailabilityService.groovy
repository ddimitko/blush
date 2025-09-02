package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.entity.Appointment
import com.ddimitko.beautyhub.entity.Employee
import com.ddimitko.beautyhub.entity.ScheduleSlot
import com.ddimitko.beautyhub.enums.DayOfWeek
import com.ddimitko.beautyhub.repository.AppointmentRepository
import com.ddimitko.beautyhub.repository.ScheduleSlotRepository
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service

import java.time.LocalDateTime
import java.time.LocalTime

@Service
@Slf4j
class SlotAvailabilityService {

    @Autowired
    private AppointmentRepository appointmentRepository

    @Autowired
    private ScheduleSlotRepository scheduleSlotRepository

    @Autowired
    private SlotUpdateService slotUpdateService

    @Autowired
    private WebSocketMessagingService webSocketMessagingService

    /**
     * Handles early completion of an appointment and updates slot availability
     */
    void handleEarlyCompletion(Appointment appointment, LocalDateTime completionTime) {
        log.info("Processing early completion for appointment ${appointment.id}")

        try {
            // Calculate the time freed up by early completion
            LocalDateTime originalEndTime = appointment.endDateTime
            long minutesFreed = java.time.Duration.between(completionTime, originalEndTime).toMinutes()

            if (minutesFreed <= 0) {
                log.info("Appointment ${appointment.id} completed at or after scheduled time, no slots to free")
                return
            }

            log.info("Appointment ${appointment.id} completed ${minutesFreed} minutes early")

            // Check if the freed time can accommodate new appointments
            // Use the service's duration as the minimum meaningful slot duration
            if (minutesFreed >= appointment.service.durationMinutes) {
                // Broadcast slot availability change
                broadcastSlotAvailabilityChange(appointment, completionTime, originalEndTime)
            }

        } catch (Exception e) {
            log.error("Failed to handle early completion for appointment ${appointment.id}", e)
        }
    }

    /**
     * Checks if a time slot is available considering early completions
     */
    boolean isSlotAvailableWithEarlyCompletions(Employee employee, LocalDateTime startTime, LocalDateTime endTime) {
        // Get all appointments for the employee on this date
        LocalDateTime dayStart = startTime.toLocalDate().atStartOfDay()
        LocalDateTime dayEnd = startTime.toLocalDate().atTime(23, 59, 59)
        List<Appointment> dayAppointments = appointmentRepository.findByEmployeeAndAppointmentDateTimeBetween(
            employee, dayStart, dayEnd
        )

        // Check for conflicts, considering potential early completions
        for (Appointment appointment : dayAppointments) {
            // Skip cancelled or no-show appointments
            if (appointment.status in ['CANCELLED', 'NO_SHOW']) {
                continue
            }

            LocalDateTime appointmentStart = appointment.appointmentDateTime
            LocalDateTime appointmentEnd = appointment.endDateTime

            // If appointment is completed, use actual completion time if earlier
            if (appointment.status == 'COMPLETED' && appointment.completedAt) {
                appointmentEnd = appointment.completedAt
            }

            // Check for overlap
            if (hasTimeOverlap(startTime, endTime, appointmentStart, appointmentEnd)) {
                return false
            }
        }

        return true
    }



    /**
     * Checks if two time ranges overlap
     */
    private boolean hasTimeOverlap(LocalDateTime start1, LocalDateTime end1, 
                                   LocalDateTime start2, LocalDateTime end2) {
        return start1.isBefore(end2) && end1.isAfter(start2)
    }

    /**
     * Broadcasts slot availability change due to early completion
     */
    private void broadcastSlotAvailabilityChange(Appointment appointment, 
                                                LocalDateTime completionTime, 
                                                LocalDateTime originalEndTime) {
        try {
            // Create available slot information for the freed time
            String dateString = appointment.appointmentDateTime.toLocalDate().toString()
            
            Map<String, Object> availabilityUpdate = [
                type: 'SLOT_AVAILABLE',
                action: 'EARLY_COMPLETION',
                shopId: appointment.shop.id.toString(),
                serviceId: appointment.service.id.toString(),
                employeeId: appointment.employee.id.toString(),
                date: dateString,
                availableFrom: completionTime.toString(),
                availableUntil: originalEndTime.toString(),
                appointmentId: appointment.id.toString(),
                minutesFreed: java.time.Duration.between(completionTime, originalEndTime).toMinutes(),
                timestamp: LocalDateTime.now().toString()
            ]

            // Use existing slot update service to broadcast
            String topic = slotUpdateService.generateSlotTopic(
                appointment.shop.id,
                appointment.service.id,
                appointment.employee.id,
                dateString
            )

            // Broadcast the availability change using WebSocket messaging service directly
            webSocketMessagingService.broadcastToTopic(topic, availabilityUpdate)

            log.info("Broadcasted slot availability change for early completion of appointment ${appointment.id}")

        } catch (Exception e) {
            log.error("Failed to broadcast slot availability change for appointment ${appointment.id}", e)
        }
    }

    /**
     * Recalculates available slots for a specific date considering early completions
     */
    List<Map<String, Object>> getUpdatedAvailableSlots(Employee employee, 
                                                       com.ddimitko.beautyhub.entity.Service service,
                                                       LocalDateTime date) {
        List<Map<String, Object>> availableSlots = []

        try {
            // Get employee's schedule for the day
            DayOfWeek dayOfWeek = DayOfWeek.valueOf(date.dayOfWeek.name())
            List<ScheduleSlot> scheduleSlots = scheduleSlotRepository
                .findByEmployeeAndDayOfWeekAndActiveTrue(employee, dayOfWeek)

            if (scheduleSlots.isEmpty()) {
                return availableSlots
            }

            // Get all appointments for this employee on this date
            LocalDateTime dayStart = date.toLocalDate().atStartOfDay()
            LocalDateTime dayEnd = date.toLocalDate().atTime(23, 59, 59)
            List<Appointment> dayAppointments = appointmentRepository.findByEmployeeAndAppointmentDateTimeBetween(
                employee, dayStart, dayEnd
            )

            // Generate time slots and check availability
            for (ScheduleSlot scheduleSlot : scheduleSlots) {
                LocalTime currentTime = scheduleSlot.startTime
                LocalTime endTime = scheduleSlot.endTime

                while (currentTime.plusMinutes(service.durationMinutes) <= endTime) {
                    LocalDateTime slotDateTime = date.toLocalDate().atTime(currentTime)
                    LocalDateTime slotEndTime = slotDateTime.plusMinutes(service.durationMinutes)

                    // Check if this slot is available considering early completions
                    boolean isAvailable = isSlotAvailableWithEarlyCompletions(employee, slotDateTime, slotEndTime)

                    if (isAvailable) {
                        availableSlots.add([
                            dateTime: slotDateTime.toString(),
                            startTime: currentTime.toString(),
                            endTime: slotEndTime.toLocalTime().toString(),
                            available: true,
                            employeeId: employee.id.toString(),
                            serviceId: service.id.toString(),
                            durationMinutes: service.durationMinutes
                        ])
                    }

                    // Move to next slot using service duration
                    currentTime = currentTime.plusMinutes(service.durationMinutes)
                }
            }

        } catch (Exception e) {
            log.error("Failed to calculate updated available slots for employee ${employee.id}", e)
        }

        return availableSlots
    }
}
