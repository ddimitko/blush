package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.entity.Appointment
import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.enums.NotificationType
import com.ddimitko.beautyhub.enums.AppointmentStatus

import java.time.LocalDateTime
import com.ddimitko.beautyhub.event.AppointmentCreatedEvent
import com.ddimitko.beautyhub.event.AppointmentUpdatedEvent
import com.ddimitko.beautyhub.event.AppointmentCancelledEvent
import com.ddimitko.beautyhub.event.AppointmentRefundedEvent
import com.ddimitko.beautyhub.event.AppointmentStatusChangedEvent
import com.ddimitko.beautyhub.repository.AppointmentRepository
import com.ddimitko.beautyhub.repository.UserRepository
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.ApplicationEventPublisher
import org.springframework.stereotype.Service
import org.springframework.transaction.event.TransactionalEventListener
import org.springframework.transaction.event.TransactionPhase

@Service
@Slf4j
class AppointmentEventService {

    @Autowired
    private AppointmentNotificationService appointmentNotificationService

    @Autowired
    private ApplicationEventPublisher eventPublisher

    @Autowired
    private AppointmentRepository appointmentRepository

    @Autowired
    private UserRepository userRepository

    @Autowired
    private WebSocketMessagingService webSocketMessagingService

    @Autowired
    private SlotAvailabilityService slotAvailabilityService

    /**
     * Publishes appointment creation event (to be handled after transaction commits)
     */
    void onAppointmentCreated(Appointment appointment) {
        log.info("Publishing appointment created event for appointment: ${appointment.id}")
        eventPublisher.publishEvent(new AppointmentCreatedEvent(appointment.id))
    }

    /**
     * Handles appointment creation event after transaction commits
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void handleAppointmentCreated(AppointmentCreatedEvent event) {
        log.info("Processing appointment created event for appointment: ${event.appointmentId}")

        try {
            // Fetch appointment with all relationships
            Appointment appointment = fetchAppointmentWithRelationships(event.appointmentId)
            if (appointment) {
                // Notify employee about new appointment
                appointmentNotificationService.notifyEmployeeOfNewAppointment(appointment)
                log.info("Successfully processed appointment created event for appointment: ${event.appointmentId}")
            } else {
                log.warn("Appointment not found for created event: ${event.appointmentId}")
            }
        } catch (Exception e) {
            log.error("Failed to process appointment created event for appointment: ${event.appointmentId}", e)
        }
    }

    /**
     * Publishes appointment update event (to be handled after transaction commits)
     */
    void onAppointmentUpdated(Appointment appointment, User updatedBy) {
        log.info("Publishing appointment updated event for appointment: ${appointment.id}")
        eventPublisher.publishEvent(new AppointmentUpdatedEvent(appointment.id, updatedBy.id))
    }

    /**
     * Handles appointment update event after transaction commits
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void handleAppointmentUpdated(AppointmentUpdatedEvent event) {
        log.info("Processing appointment updated event for appointment: ${event.appointmentId}")

        try {
            // Fetch appointment and user with all relationships
            Appointment appointment = fetchAppointmentWithRelationships(event.appointmentId)
            User updatedBy = userRepository.findById(event.updatedById).orElse(null)

            if (appointment && updatedBy) {
                // Determine who updated the appointment and notify the other party
                boolean updatedByCustomer = isCustomer(appointment, updatedBy)
                boolean updatedByEmployee = isEmployee(appointment, updatedBy)

                if (updatedByCustomer) {
                    // Customer updated appointment, notify employee
                    appointmentNotificationService.notifyEmployeeOfAppointmentUpdate(appointment)
                } else if (updatedByEmployee) {
                    // Employee updated appointment, notify customer (if they have an account)
                    appointmentNotificationService.notifyCustomerOfAppointmentUpdate(appointment)
                }

                log.info("Successfully processed appointment updated event for appointment: ${event.appointmentId}")
            } else {
                log.warn("Appointment or user not found for updated event: appointmentId=${event.appointmentId}, userId=${event.updatedById}")
            }
        } catch (Exception e) {
            log.error("Failed to process appointment updated event for appointment: ${event.appointmentId}", e)
        }
    }

    /**
     * Publishes appointment cancellation event (to be handled after transaction commits)
     */
    void onAppointmentCancelled(Appointment appointment, User cancelledBy) {
        log.info("Publishing appointment cancelled event for appointment: ${appointment.id}")
        eventPublisher.publishEvent(new AppointmentCancelledEvent(appointment.id, cancelledBy.id))
    }

    /**
     * Handles appointment cancellation event after transaction commits
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void handleAppointmentCancelled(AppointmentCancelledEvent event) {
        log.info("Processing appointment cancelled event for appointment: ${event.appointmentId}")

        try {
            // Fetch appointment and user with all relationships
            Appointment appointment = fetchAppointmentWithRelationships(event.appointmentId)
            User cancelledBy = userRepository.findById(event.cancelledById).orElse(null)

            if (appointment && cancelledBy) {
                // Determine who cancelled the appointment and notify the other party
                boolean cancelledByCustomer = isCustomer(appointment, cancelledBy)
                boolean cancelledByEmployee = isEmployee(appointment, cancelledBy)

                if (cancelledByCustomer) {
                    // Customer cancelled appointment, notify employee
                    appointmentNotificationService.notifyEmployeeOfAppointmentCancellation(appointment)
                } else if (cancelledByEmployee) {
                    // Employee cancelled appointment, notify customer (if they have an account)
                    appointmentNotificationService.notifyCustomerOfAppointmentCancellation(appointment)
                }

                log.info("Successfully processed appointment cancelled event for appointment: ${event.appointmentId}")
            } else {
                log.warn("Appointment or user not found for cancelled event: appointmentId=${event.appointmentId}, userId=${event.cancelledById}")
            }
        } catch (Exception e) {
            log.error("Failed to process appointment cancelled event for appointment: ${event.appointmentId}", e)
        }
    }

    /**
     * Publishes appointment refund event (to be handled after transaction commits)
     */
    void onAppointmentRefunded(Appointment appointment, User refundedBy) {
        log.info("Publishing appointment refunded event for appointment: ${appointment.id}")
        eventPublisher.publishEvent(new AppointmentRefundedEvent(appointment.id, refundedBy.id))
    }

    /**
     * Publishes appointment status change event (to be handled after transaction commits)
     */
    void onAppointmentStatusChanged(Appointment appointment, AppointmentStatus oldStatus, User changedBy) {
        log.info("Publishing appointment status changed event for appointment: ${appointment.id} from ${oldStatus} to ${appointment.status}")
        eventPublisher.publishEvent(new AppointmentStatusChangedEvent(appointment.id, oldStatus, appointment.status, changedBy.id))
    }

    /**
     * Handles appointment refund event after transaction commits
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void handleAppointmentRefunded(AppointmentRefundedEvent event) {
        log.info("Processing appointment refunded event for appointment: ${event.appointmentId}")

        try {
            // Fetch appointment and user with all relationships
            Appointment appointment = fetchAppointmentWithRelationships(event.appointmentId)
            User refundedBy = userRepository.findById(event.refundedById).orElse(null)

            if (appointment && refundedBy) {
                // Notify customer about refund processing
                appointmentNotificationService.notifyCustomerOfRefund(appointment)
                log.info("Successfully processed appointment refunded event for appointment: ${event.appointmentId}")
            } else {
                log.warn("Appointment or user not found for refunded event: appointmentId=${event.appointmentId}, userId=${event.refundedById}")
            }
        } catch (Exception e) {
            log.error("Failed to process appointment refunded event for appointment: ${event.appointmentId}", e)
        }
    }

    /**
     * Handles appointment status change event after transaction commits
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void handleAppointmentStatusChanged(AppointmentStatusChangedEvent event) {
        log.info("Processing appointment status changed event for appointment: ${event.appointmentId} from ${event.oldStatus} to ${event.newStatus}")

        try {
            // Fetch appointment and user with all relationships
            Appointment appointment = fetchAppointmentWithRelationships(event.appointmentId)
            User changedBy = userRepository.findById(event.changedById).orElse(null)

            if (appointment && changedBy) {
                // Handle specific status transitions
                handleStatusTransition(appointment, event.oldStatus, event.newStatus, changedBy)

                // Send real-time WebSocket notification to all relevant parties
                sendRealTimeStatusUpdate(appointment, event.oldStatus, event.newStatus)

                log.info("Successfully processed appointment status changed event for appointment: ${event.appointmentId}")
            } else {
                log.warn("Appointment or user not found for status changed event: appointmentId=${event.appointmentId}, userId=${event.changedById}")
            }
        } catch (Exception e) {
            log.error("Failed to process appointment status changed event for appointment: ${event.appointmentId}", e)
        }
    }

    /**
     * Checks if the user is the customer for this appointment
     */
    private boolean isCustomer(Appointment appointment, User user) {
        return appointment.user != null && appointment.user.id.equals(user.id)
    }

    /**
     * Checks if the user is the employee for this appointment
     */
    private boolean isEmployee(Appointment appointment, User user) {
        return appointment.employee?.user?.id?.equals(user.id)
    }

    /**
     * Fetches appointment with all relationships to avoid lazy loading issues
     */
    private Appointment fetchAppointmentWithRelationships(UUID appointmentId) {
        try {
            Appointment appointment = appointmentRepository.findById(appointmentId).orElse(null)
            if (appointment) {
                // Force initialization of all lazy-loaded relationships
                if (appointment.user) {
                    appointment.user.firstName // Trigger initialization
                    appointment.user.lastName
                    appointment.user.email
                }
                if (appointment.employee?.user) {
                    appointment.employee.user.firstName
                    appointment.employee.user.lastName
                    appointment.employee.user.email
                }
                if (appointment.service) {
                    appointment.service.name
                    appointment.service.price
                }
                if (appointment.shop) {
                    appointment.shop.name
                    appointment.shop.address
                }
            }
            return appointment
        } catch (Exception e) {
            log.error("Failed to fetch appointment with relationships: ${appointmentId}", e)
            return null
        }
    }

    /**
     * Handles specific status transition logic
     */
    private void handleStatusTransition(Appointment appointment, AppointmentStatus oldStatus, AppointmentStatus newStatus, User changedBy) {
        switch (newStatus) {
            case AppointmentStatus.COMPLETED:
                // Immediately trigger review notification for completed appointments
                if (!appointment.reviewRequested) {
                    try {
                        if (appointment.user) {
                            // Send notification and email for authenticated users
                            appointmentNotificationService.sendReviewNotification(appointment)
                            log.info("Sent immediate review notification for appointment ${appointment.id} to user ${appointment.user.email}")
                        } else if (appointment.guestEmail) {
                            // Send email only for guest users (no in-app notification)
                            appointmentNotificationService.sendGuestReviewEmail(appointment)
                            log.info("Sent immediate guest review email for appointment ${appointment.id} to ${appointment.guestEmail}")
                        }

                        // Mark review as requested to avoid duplicate notifications
                        appointment.reviewRequested = true
                        appointmentRepository.save(appointment)
                    } catch (Exception e) {
                        log.error("Failed to send immediate review notification for appointment ${appointment.id}", e)
                    }
                }

                // Update slot availability if appointment completed early
                try {
                    LocalDateTime completionTime = appointment.completedAt ?: LocalDateTime.now()
                    if (appointment.endDateTime.isAfter(completionTime)) {
                        log.info("Appointment ${appointment.id} completed early, updating slot availability")
                        slotAvailabilityService.handleEarlyCompletion(appointment, completionTime)

                        // Send real-time slot availability update
                        sendSlotAvailabilityUpdate(appointment, completionTime)
                    }
                } catch (Exception e) {
                    log.error("Failed to update slot availability for early completion of appointment ${appointment.id}", e)
                }
                break

            case AppointmentStatus.IN_PROGRESS:
                // Notify relevant parties that appointment has started
                appointmentNotificationService.notifyAppointmentStarted(appointment)

                // Handle early start - if appointment started before scheduled time
                try {
                    LocalDateTime now = LocalDateTime.now()
                    if (appointment.appointmentDateTime.isAfter(now)) {
                        log.info("Appointment ${appointment.id} started early, updating slot availability")
                        // For early starts, we need to handle the time before the scheduled start
                        // This time becomes unavailable earlier than expected
                        sendSlotAvailabilityUpdate(appointment, now)
                    }
                } catch (Exception e) {
                    log.error("Failed to handle early start for appointment ${appointment.id}", e)
                }
                break

            case AppointmentStatus.CANCELLED:
                // Handle cancellation notifications if not already handled by cancellation event
                break

            default:
                // General status change notification
                appointmentNotificationService.notifyStatusChanged(appointment, oldStatus, newStatus, changedBy)
                break
        }
    }

    /**
     * Sends real-time WebSocket notification for status updates
     */
    private void sendRealTimeStatusUpdate(Appointment appointment, AppointmentStatus oldStatus, AppointmentStatus newStatus) {
        try {
            Map<String, Object> statusUpdateData = [
                type: 'appointment_status_changed',
                appointmentId: appointment.id.toString(),
                oldStatus: oldStatus.toString(),
                newStatus: newStatus.toString(),
                appointmentDateTime: appointment.appointmentDateTime.toString(),
                serviceName: appointment.service?.name,
                shopName: appointment.shop?.name,
                employeeName: appointment.employee?.getFullName(),
                timestamp: new Date().time
            ]

            // Send to customer (if authenticated)
            if (appointment.user) {
                webSocketMessagingService.sendNotificationToUser(appointment.user.id.toString(), statusUpdateData)
                log.debug("Sent real-time status update to customer ${appointment.user.id}")
            }

            // Send to employee
            if (appointment.employee?.user) {
                webSocketMessagingService.sendNotificationToUser(appointment.employee.user.id.toString(), statusUpdateData)
                log.debug("Sent real-time status update to employee ${appointment.employee.user.id}")
            }

            // Send to shop owner (if different from employee)
            if (appointment.shop?.owner && !appointment.shop.owner.id.equals(appointment.employee?.user?.id)) {
                webSocketMessagingService.sendNotificationToUser(appointment.shop.owner.id.toString(), statusUpdateData)
                log.debug("Sent real-time status update to shop owner ${appointment.shop.owner.id}")
            }

        } catch (Exception e) {
            log.error("Failed to send real-time status update for appointment ${appointment.id}", e)
        }
    }

    /**
     * Sends real-time slot availability update when appointment completes early
     */
    private void sendSlotAvailabilityUpdate(Appointment appointment, LocalDateTime completionTime) {
        try {
            String dateString = appointment.appointmentDateTime.toLocalDate().toString()

            Map<String, Object> slotUpdateData = [
                type: 'slot_availability_changed',
                shopId: appointment.shop?.id?.toString(),
                serviceId: appointment.service?.id?.toString(),
                employeeId: appointment.employee?.id?.toString(),
                date: dateString,
                reason: 'early_completion',
                appointmentId: appointment.id.toString(),
                originalEndTime: appointment.endDateTime.toString(),
                actualCompletionTime: completionTime.toString(),
                timestamp: new Date().time
            ]

            // Broadcast to all users who might be booking slots for this date/employee/service
            String topic = "slots.${appointment.shop.id}.${appointment.service.id}.${appointment.employee.id}.${dateString}"
            webSocketMessagingService.broadcastToTopic(topic, slotUpdateData)

            log.info("Sent slot availability update for early completion of appointment ${appointment.id}")

        } catch (Exception e) {
            log.error("Failed to send slot availability update for appointment ${appointment.id}", e)
        }
    }
}
