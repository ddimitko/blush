package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.dto.*
import com.ddimitko.beautyhub.entity.*
import com.ddimitko.beautyhub.enums.AppointmentStatus
import com.ddimitko.beautyhub.enums.DayOfWeek
import com.ddimitko.beautyhub.enums.PaymentType
import com.ddimitko.beautyhub.repository.*
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service as SpringService
import org.springframework.transaction.annotation.Transactional
import groovy.util.logging.Slf4j

import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneOffset

@Slf4j
@SpringService
@Transactional
class AppointmentService {

    @Autowired
    private AppointmentRepository appointmentRepository

    @Autowired
    private UserService userService

    @Autowired
    private ShopService shopService

    @Autowired
    private EmployeeService employeeService

    @Autowired
    private ServiceRepository serviceRepository

    @Autowired
    private EmployeeRepository employeeRepository

    @Autowired
    private ScheduleSlotRepository scheduleSlotRepository

    @Autowired
    private SlotLockingService slotLockingService

    @Autowired
    private StripeService stripeService

    @Autowired
    private PaymentService paymentService

    @Autowired
    private AppointmentEventService appointmentEventService

    @Autowired
    private AppointmentNotificationService appointmentNotificationService

    @Autowired
    private LeaveRequestService leaveRequestService

    @Autowired
    private PrometheusMetricsService prometheusMetricsService

    /**
     * Creates a new appointment (supports both authenticated and guest users)
     */
    AppointmentResponse createAppointment(AppointmentCreationRequest request, UUID authenticatedUserId = null) {
        // Record booking attempt for metrics
        prometheusMetricsService.recordBookingAttempt()
        def timer = prometheusMetricsService.startAppointmentCreationTimer()

        try {
            // Validate request
            validateAppointmentRequest(request, authenticatedUserId)

        // Validate slot lock token is provided
        if (!request.slotLockToken) {
            throw new IllegalArgumentException("Slot lock token is required for appointment creation")
        }

        // Parse and validate the lock token as UUID
        UUID lockTokenUUID
        try {
            lockTokenUUID = UUID.fromString(request.slotLockToken)
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid slot lock token format")
        }

        // Additional validation: Employees cannot book appointments for themselves
        if (authenticatedUserId) {
            Employee employee = employeeRepository.findById(request.employeeId)
                    .orElseThrow { new IllegalArgumentException("Employee not found") }

            if (employee.user?.id == authenticatedUserId) {
                throw new IllegalArgumentException("Employees cannot create appointments for themselves")
            }
        }

        // Get entities
        Shop shop = shopService.findById(request.shopId)
        Employee employee = employeeRepository.findById(request.employeeId)
                .orElseThrow { new RuntimeException("Employee not found") }
        com.ddimitko.beautyhub.entity.Service service = serviceRepository.findById(request.serviceId)
                .orElseThrow { new RuntimeException("Service not found") }

        // Validate that service belongs to the same shop
        if (service.shop.id != shop.id) {
            throw new IllegalArgumentException("Service does not belong to the specified shop")
        }

        // Validate that employee belongs to the same shop
        if (employee.shop.id != shop.id) {
            throw new IllegalArgumentException("Employee does not belong to the specified shop")
        }

        User user = null
        if (authenticatedUserId) {
            user = userService.findById(authenticatedUserId)
        } else if (request.isGuestBooking()) {
            // Check if a user with this email already exists
            user = userService.findByEmail(request.guestEmail)
            if (user) {
                // If user exists, link the appointment to them instead of creating as guest
                // This prevents duplicate accounts and ensures appointment history is maintained
            }
        }

        // Validate slot availability and lock ownership
        validateSlotAvailabilityAndLock(request, employee, service, lockTokenUUID)

        // Validate user doesn't have conflicting appointments
        validateUserConflicts(request, user)

        // Create appointment with a unique ID (don't use lock token as ID to prevent overwrites)
        Appointment appointment = new Appointment()
        appointment.id = UUID.randomUUID()  // Generate unique appointment ID
        appointment.user = user
        appointment.shop = shop
        appointment.employee = employee
        appointment.service = service
        appointment.appointmentDateTime = request.appointmentDateTime
        appointment.paymentType = request.paymentType
        appointment.totalAmount = service.price
        appointment.depositAmount = request.depositAmount ?: service.depositAmount ?: BigDecimal.ZERO
        appointment.notes = request.notes
        appointment.status = AppointmentStatus.CONFIRMED

        // Set guest information if not authenticated
        if (!user && request.isGuestBooking()) {
            appointment.guestEmail = request.guestEmail
            appointment.guestFirstName = request.guestFirstName
            appointment.guestLastName = request.guestLastName
            appointment.guestPhone = request.guestPhone
        }

        // Handle payment if required
        if (request.requiresPayment()) {
            handlePayment(appointment, request)
        }

        // Save appointment first
        appointment = appointmentRepository.save(appointment)

        // If appointment was successfully created, remove the slot lock from Redis
        // This migrates the slot from "locked" state to "booked" state in the database
        try {
            slotLockingService.unlockSlotIfOwnedByUser(
                    request.shopId, request.serviceId, request.employeeId,
                    request.appointmentDateTime, lockTokenUUID
            )
        } catch (Exception e) {
            // Log the error but don't fail the appointment creation
            // The slot lock will expire automatically after 5 minutes
            println("Warning: Failed to remove slot lock after successful appointment creation: ${e.getMessage()}")
        }

        // Trigger appointment created notification
        try {
            appointmentEventService.onAppointmentCreated(appointment)
        } catch (Exception e) {
            // Log error but don't fail appointment creation
            println("Warning: Failed to send appointment created notification: ${e.getMessage()}")
        }

        // Record successful booking for metrics
        prometheusMetricsService.recordSuccessfulBooking()
        prometheusMetricsService.recordAppointmentCreationTime(timer)

        return convertToResponse(appointment)

        } catch (Exception e) {
            // Record failed booking for metrics
            prometheusMetricsService.recordFailedBooking()
            prometheusMetricsService.recordAppointmentCreationTime(timer)
            throw e
        }
    }

    /**
     * Updates an existing appointment
     */
    AppointmentResponse updateAppointment(UUID appointmentId, AppointmentUpdateRequest request, UUID userId) {
        Appointment appointment = findAppointmentById(appointmentId)

        // Validate user can update this appointment
        validateUserCanModifyAppointment(appointment, userId)

        // Validate appointment can be modified
        if (!appointment.canBeModified()) {
            throw new IllegalArgumentException("Appointment cannot be modified")
        }

        // If rescheduling, validate new slot and lock token
        if (request.appointmentDateTime && !request.appointmentDateTime.equals(appointment.appointmentDateTime)) {
            validateRescheduleWithLock(appointment, request.appointmentDateTime, request.lockToken, userId)
        }

        // Update fields
        if (request.appointmentDateTime) {
            // Release the old slot lock if it exists and unlock the new slot
            if (request.lockToken) {
                // Validate and consume the lock token
                UUID lockTokenUUID = UUID.fromString(request.lockToken)
                boolean isValidLock = slotLockingService.isSlotLockedByUser(
                    appointment.shop.id,
                    appointment.service.id,
                    appointment.employee.id,
                    request.appointmentDateTime,
                    lockTokenUUID
                )

                if (!isValidLock) {
                    throw new IllegalArgumentException("Invalid or expired slot lock token")
                }

                // Unlock the slot since we're booking it
                slotLockingService.unlockSlot(
                    appointment.shop.id,
                    appointment.service.id,
                    appointment.employee.id,
                    request.appointmentDateTime
                )
            }

            appointment.appointmentDateTime = request.appointmentDateTime
            appointment.endDateTime = request.appointmentDateTime.plusMinutes(appointment.service.durationMinutes)
        }
        if (request.notes != null) {
            appointment.notes = request.notes
        }

        appointment = appointmentRepository.save(appointment)

        // Trigger appointment updated notification
        try {
            User updatedBy = userService.findById(userId)
            appointmentEventService.onAppointmentUpdated(appointment, updatedBy)
        } catch (Exception e) {
            // Log error but don't fail appointment update
            println("Warning: Failed to send appointment updated notification: ${e.getMessage()}")
        }

        return convertToResponse(appointment)
    }

    /**
     * Cancels an appointment
     */
    AppointmentResponse cancelAppointment(UUID appointmentId, String reason, UUID userId) {
        return cancelAppointment(appointmentId, reason, userId, null)
    }

    /**
     * Cancels an appointment with optional custom refund amount
     */
    AppointmentResponse cancelAppointment(UUID appointmentId, String reason, UUID userId, BigDecimal refundAmount) {
        Appointment appointment = findAppointmentById(appointmentId)

        // Validate user can cancel this appointment
        validateUserCanModifyAppointment(appointment, userId)

        // Check if user is shop owner or employee (they can cancel anytime and choose refund amount)
        boolean isShopOwner = appointment.shop?.owner?.id == userId
        boolean isEmployee = employeeService.isEmployeeAtShop(userId, appointment.shop.id)
        boolean canChooseRefundAmount = isShopOwner || isEmployee

        // Validate appointment can be cancelled (owners/employees bypass time restrictions)
        if (!canChooseRefundAmount && !appointment.canBeCancelled()) {
            throw new IllegalArgumentException("Appointment cannot be cancelled within 24 hours")
        }

        // Validate refund amount if provided
        if (refundAmount != null) {
            if (!canChooseRefundAmount) {
                throw new IllegalArgumentException("Only shop owners and employees can specify custom refund amounts")
            }
            if (refundAmount < 0 || refundAmount > appointment.totalAmount) {
                throw new IllegalArgumentException("Refund amount must be between 0 and ${appointment.totalAmount}")
            }
        }

        appointment.status = AppointmentStatus.CANCELLED
        appointment.cancellationReason = reason
        appointment.cancelledAt = LocalDateTime.now(ZoneOffset.UTC)
        appointment.cancelledBy = userId?.toString() ?: "guest"

        // Handle refund if appointment has successful card payment
        if (appointment.hasSuccessfulCardPayment()) {
            try {
                // Use custom refund amount if provided, otherwise full refund
                BigDecimal actualRefundAmount = refundAmount ?: appointment.totalAmount

                // Only process refund if amount > 0
                if (actualRefundAmount > 0) {
                    Map<String, Object> refundResult = paymentService.processRefund(
                        appointment.paymentIntentId,
                        actualRefundAmount,
                        reason
                    )

                    // Update appointment with refund information
                    appointment.refundId = refundResult.refundId as String
                    appointment.refundStatus = refundResult.status as String
                    appointment.refundAmount = actualRefundAmount
                    appointment.refundDate = LocalDateTime.now(ZoneOffset.UTC)
                }
            } catch (Exception e) {
                // Log error but don't fail appointment cancellation
                println("Warning: Failed to process refund for appointment ${appointmentId}: ${e.getMessage()}")
            }
        }

        appointment = appointmentRepository.save(appointment)

        // Trigger appointment cancelled notification
        try {
            User cancelledBy = userService.findById(userId)
            appointmentEventService.onAppointmentCancelled(appointment, cancelledBy)
        } catch (Exception e) {
            // Log error but don't fail appointment cancellation
            println("Warning: Failed to send appointment cancelled notification: ${e.getMessage()}")
        }

        return convertToResponse(appointment)
    }

    /**
     * Processes refund for an appointment (Owner/Employee only)
     */
    AppointmentResponse processAppointmentRefund(UUID appointmentId, BigDecimal amount, String reason, UUID userId) {
        Appointment appointment = findAppointmentById(appointmentId)

        // Validate user can process refunds for this appointment (shop owner or employee)
        User user = userService.findById(userId)
        boolean hasAccess = appointment.shop?.owner?.id == userId ||
                           employeeService.isEmployeeAtShop(userId, appointment.shop.id)

        if (!hasAccess) {
            throw new IllegalArgumentException("Access denied to process refunds for this appointment")
        }

        // Validate appointment has successful card payment
        if (!appointment.hasSuccessfulCardPayment()) {
            throw new IllegalArgumentException("Appointment has no successful card payment to refund")
        }

        // Validate refund amount
        if (amount > appointment.totalAmount) {
            throw new IllegalArgumentException("Refund amount cannot exceed appointment total")
        }

        // Check if already refunded
        if (appointment.refundId) {
            throw new IllegalArgumentException("Appointment has already been refunded")
        }

        try {
            // Process refund with Stripe
            Map<String, Object> refundResult = paymentService.processRefund(
                appointment.paymentIntentId,
                amount,
                reason
            )

            // Update appointment with refund information
            appointment.refundId = refundResult.refundId as String
            appointment.refundStatus = refundResult.status as String
            appointment.refundAmount = amount
            appointment.refundDate = LocalDateTime.now(ZoneOffset.UTC)

            appointment = appointmentRepository.save(appointment)

            // Trigger refund notification
            try {
                appointmentEventService.onAppointmentRefunded(appointment, user)
            } catch (Exception e) {
                // Log error but don't fail refund processing
                println("Warning: Failed to send refund notification: ${e.getMessage()}")
            }

            return convertToResponse(appointment)

        } catch (Exception e) {
            throw new RuntimeException("Failed to process refund: ${e.getMessage()}", e)
        }
    }

    /**
     * Gets available time slots for any employee who can provide the service on a given date
     */
    List<AvailableSlotResponse> getAvailableSlotsForAnyEmployee(UUID shopId, UUID serviceId, LocalDate date) {
        com.ddimitko.beautyhub.entity.Service service = serviceRepository.findById(serviceId)
                .orElseThrow { new RuntimeException("Service not found") }

        // Get all active employees who can provide this service
        List<Employee> availableEmployees = serviceEmployeeService.getActiveEmployeesForService(service)

        if (availableEmployees.isEmpty()) {
            return []
        }

        // Collect all available slots from all employees
        Set<AvailableSlotResponse> allSlots = new HashSet<>()

        availableEmployees.each { employee ->
            try {
                List<AvailableSlotResponse> employeeSlots = getAvailableSlots(shopId, employee.id, serviceId, date)
                allSlots.addAll(employeeSlots)
            } catch (Exception e) {
                log.warn("Failed to get slots for employee ${employee.id}: ${e.message}")
            }
        }

        // Convert to list and sort by time
        List<AvailableSlotResponse> sortedSlots = allSlots.toList()
        sortedSlots.sort { a, b ->
            LocalTime.parse(a.time).compareTo(LocalTime.parse(b.time))
        }

        return sortedSlots
    }

    /**
     * Gets available time slots for a specific employee and service on a given date
     */
    List<AvailableSlotResponse> getAvailableSlots(UUID shopId, UUID employeeId, UUID serviceId, LocalDate date) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow { new RuntimeException("Employee not found") }
        com.ddimitko.beautyhub.entity.Service service = serviceRepository.findById(serviceId)
                .orElseThrow { new RuntimeException("Service not found") }

        // Check if employee is on leave for this date
        if (leaveRequestService?.isEmployeeOnLeave(employeeId, date)) {
            return [] // Return empty list if employee is on leave
        }

        // Get employee's schedule for the day
        DayOfWeek dayOfWeek = DayOfWeek.valueOf(date.dayOfWeek.name())
        List<ScheduleSlot> scheduleSlots = scheduleSlotRepository
                .findByEmployeeAndDayOfWeekAndActiveTrue(employee, dayOfWeek)

        // Get existing appointments for the day
        LocalDateTime startOfDay = date.atStartOfDay()
        LocalDateTime endOfDay = date.atTime(23, 59, 59)
        List<Appointment> existingAppointments = appointmentRepository
                .findByEmployeeAndAppointmentDateTimeBetween(employee, startOfDay, endOfDay)

        // Generate available slots
        List<AvailableSlotResponse> availableSlots = []

        // Always use UTC for backend operations - frontend will handle timezone conversion
        LocalDateTime nowUtc = LocalDateTime.now(ZoneOffset.UTC)

        // Check if the requested date is "today" by comparing with both UTC and local dates
        // This handles cases where local time has crossed midnight but UTC hasn't (or vice versa)
        LocalDate nowUtcDate = nowUtc.toLocalDate()
        LocalDate nowLocalDate = LocalDateTime.now().toLocalDate() // System default timezone
        boolean isToday = date.equals(nowUtcDate) || date.equals(nowLocalDate)

        // Pre-calculate buffer-related values for optimization
        int bufferMinutes = service.bookingBufferMinutes ?: 15
        LocalDateTime earliestBookableTime = isToday ? nowUtc.plusMinutes(bufferMinutes) : null

        log.debug("Getting available slots for date: ${date}, current UTC time: ${nowUtc}, UTC date: ${nowUtcDate}, local date: ${nowLocalDate}, isToday: ${isToday}, buffer: ${bufferMinutes} minutes")

        scheduleSlots.each { slot ->
            LocalTime effectiveStartTime = slot.startTime

            // If booking for today, we need to ensure slots start after current time + buffer
            if (isToday) {
                LocalTime currentTimeUtc = nowUtc.toLocalTime()

                // If current time is after the schedule start time, adjust the effective start time
                if (currentTimeUtc.isAfter(slot.startTime)) {
                    LocalTime currentTimePlusBuffer = currentTimeUtc.plusMinutes(bufferMinutes)

                    // Calculate how many minutes from schedule start to current time + buffer
                    int minutesSinceStart = (int) Duration.between(slot.startTime, currentTimePlusBuffer).toMinutes()

                    // Calculate how many complete service slots to skip
                    int slotsToSkip = (int) Math.ceil((double) minutesSinceStart / service.durationMinutes)

                    // Set effective start time to the next available slot
                    effectiveStartTime = slot.startTime.plusMinutes(slotsToSkip * service.durationMinutes)

                    log.debug("Adjusted start time for today: original=${slot.startTime}, current=${currentTimeUtc}, buffer=${currentTimePlusBuffer}, effective=${effectiveStartTime}")
                }

                // If the effective start time is beyond the end time, skip this slot entirely
                // Handle both normal and cross-midnight schedules
                boolean shouldSkip = false
                if (slot.isCrossMidnightSlot()) {
                    // For cross-midnight slots, check if effective start time allows any valid appointments
                    // Skip if effective start time is after midnight and beyond end time
                    if (effectiveStartTime >= LocalTime.MIDNIGHT && effectiveStartTime.plusMinutes(service.durationMinutes) > slot.endTime) {
                        shouldSkip = true
                    }
                } else {
                    // For normal slots, use the original logic
                    if (effectiveStartTime.plusMinutes(service.durationMinutes) > slot.endTime) {
                        shouldSkip = true
                    }
                }

                if (shouldSkip) {
                    log.debug("Skipping schedule slot as effective start time ${effectiveStartTime} is beyond end time ${slot.endTime} (cross-midnight: ${slot.isCrossMidnightSlot()})")
                    return // Skip this schedule slot
                }
            }

            List<LocalTime> timeSlots = generateTimeSlots(effectiveStartTime, slot.endTime, service.durationMinutes)

            timeSlots.each { startTime ->
                LocalDateTime slotDateTime = date.atTime(startTime)
                LocalTime endTime = startTime.plusMinutes(service.durationMinutes)

                // Skip slots that are before the earliest bookable time (already handled by effective start time calculation)
                if (isToday && slotDateTime.isBefore(earliestBookableTime)) {
                    log.debug("Skipping slot ${slotDateTime} as it's before earliest bookable time ${earliestBookableTime}")
                    return // Skip this time slot
                }

                // Check if slot is available (not conflicting with existing appointments)
                boolean isAvailable = !hasConflictingAppointment(existingAppointments, slotDateTime, endTime)

                // Check if slot is locked
                boolean isLocked = slotLockingService.isSlotLocked(shopId, serviceId, employeeId, slotDateTime)

                AvailableSlotResponse slotResponse = new AvailableSlotResponse()
                slotResponse.dateTime = slotDateTime
                slotResponse.startTime = startTime
                slotResponse.endTime = endTime
                slotResponse.available = isAvailable
                slotResponse.locked = isLocked
                slotResponse.employeeId = employeeId
                slotResponse.employeeName = employee.fullName
                slotResponse.serviceId = serviceId
                slotResponse.serviceName = service.name
                slotResponse.durationMinutes = service.durationMinutes
                slotResponse.price = service.price

                if (isLocked) {
                    slotResponse.lockedBy = slotLockingService.getSlotLockOwner(shopId, serviceId, employeeId, slotDateTime)
                }

                // Only return available or locked slots - don't return booked appointments to frontend
                // End users don't need to see an employee's booked appointments
                if (isAvailable || isLocked) {
                    availableSlots.add(slotResponse)
                }
            }
        }
        
        return availableSlots.sort { it.dateTime }
    }

    /**
     * Links guest appointments to a registered user after email verification
     */
    void linkGuestAppointmentsToUser(String email, UUID userId) {
        List<Appointment> guestAppointments = appointmentRepository.findByGuestEmailAndUserIsNull(email)
        User user = userService.findById(userId)
        
        guestAppointments.each { appointment ->
            appointment.user = user
            // Keep guest information for audit trail
            appointmentRepository.save(appointment)
        }
    }

    /**
     * Gets appointments for a user (including linked guest appointments)
     */
    Page<AppointmentResponse> getUserAppointments(UUID userId, Pageable pageable) {
        User user = userService.findById(userId)
        Page<Appointment> appointments = appointmentRepository.findByUser(user, pageable)
        return appointments.map { convertToResponse(it) }
    }

    /**
     * Gets guest appointments by email (before registration)
     */
    List<AppointmentResponse> getGuestAppointments(String email) {
        List<Appointment> appointments = appointmentRepository.findByGuestEmailAndUserIsNull(email)
        return appointments.collect { convertToResponse(it) }
    }

    /**
     * Gets appointments for a specific shop
     */
    Page<AppointmentResponse> getShopAppointments(UUID shopId, UUID userId, Pageable pageable) {
        Shop shop = shopService.findById(shopId)

        // Validate user has access to this shop (owner or employee)
        User user = userService.findById(userId)
        boolean hasAccess = shop.owner.id.equals(userId) ||
                           employeeService.isEmployeeAtShop(userId, shopId)

        if (!hasAccess) {
            throw new IllegalArgumentException("Access denied to shop appointments")
        }

        Page<Appointment> appointments = appointmentRepository.findByShop(shop, pageable)
        return appointments.map { convertToResponse(it) }
    }

    /**
     * Gets appointments for a specific employee
     */
    Page<AppointmentResponse> getEmployeeAppointments(UUID employeeId, UUID userId, Pageable pageable) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow { new RuntimeException("Employee not found") }

        // Validate user has access to this employee's appointments (shop owner or the employee themselves)
        User user = userService.findById(userId)
        boolean hasAccess = employee.shop.owner.id.equals(userId) ||
                           employee.user.id.equals(userId)

        if (!hasAccess) {
            throw new IllegalArgumentException("Access denied to employee appointments")
        }

        Page<Appointment> appointments = appointmentRepository.findByEmployee(employee, pageable)
        return appointments.map { convertToResponse(it) }
    }

    /**
     * Gets a specific appointment by ID with access control
     */
    AppointmentResponse getAppointmentById(UUID appointmentId, UUID userId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow { new RuntimeException("Appointment not found") }

        User user = userService.findById(userId)

        // Check if user has access to this appointment
        boolean hasAccess = false

        // Customer access - if user is the customer
        if (appointment.user && appointment.user.id.equals(userId)) {
            hasAccess = true
        }

        // Employee access - if user is the employee assigned to this appointment
        if (appointment.employee.user && appointment.employee.user.id.equals(userId)) {
            hasAccess = true
        }

        // Shop owner access - if user owns the shop where appointment is scheduled
        if (appointment.shop.owner.id.equals(userId)) {
            hasAccess = true
        }

        if (!hasAccess) {
            throw new IllegalArgumentException("Access denied to this appointment")
        }

        return convertToResponse(appointment)
    }

    /**
     * Updates appointment status
     */
    AppointmentResponse updateAppointmentStatus(UUID appointmentId, String statusString, UUID userId) {
        Appointment appointment = findAppointmentById(appointmentId)

        // Validate user has permission to update status (shop owner or employee)
        User user = userService.findById(userId)
        boolean hasAccess = appointment.shop.owner.id.equals(userId) ||
                           appointment.employee.user.id.equals(userId)

        if (!hasAccess) {
            throw new IllegalArgumentException("Access denied to update appointment status")
        }

        // Parse and validate status
        AppointmentStatus newStatus
        try {
            newStatus = AppointmentStatus.valueOf(statusString.toUpperCase())
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid appointment status: ${statusString}")
        }

        // Validate status transition
        validateStatusTransition(appointment, newStatus)

        // Store old status for event
        AppointmentStatus oldStatus = appointment.status

        appointment.status = newStatus

        // Set completion timestamp if marking as completed
        if (newStatus == AppointmentStatus.COMPLETED && !appointment.completedAt) {
            appointment.completedAt = LocalDateTime.now()
        }

        appointment = appointmentRepository.save(appointment)

        // Trigger status change event for real-time notifications
        try {
            appointmentEventService.onAppointmentStatusChanged(appointment, oldStatus, user)
        } catch (Exception e) {
            // Log error but don't fail status update
            println("Warning: Failed to send appointment status change notification: ${e.getMessage()}")
        }

        return convertToResponse(appointment)
    }

    /**
     * Gets appointments by status
     */
    Page<AppointmentResponse> getAppointmentsByStatus(String statusString, Pageable pageable) {
        AppointmentStatus status
        try {
            status = AppointmentStatus.valueOf(statusString.toUpperCase())
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid appointment status: ${statusString}")
        }

        Page<Appointment> appointments = appointmentRepository.findByStatus(status, pageable)
        return appointments.map { convertToResponse(it) }
    }

    /**
     * Gets employee unavailable dates for appointment scheduling
     */
    List<String> getEmployeeUnavailableDates(UUID employeeId) {
        // Validate employee exists
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow { new RuntimeException("Employee not found") }

        // For now, return empty list since we don't have off-days system yet
        // In the future, this would query a time-off or unavailable dates table
        // and return dates in 'yyyy-MM-dd' format
        return []
    }

    /**
     * Sends appointment reminder to customer
     */
    void sendAppointmentReminder(UUID appointmentId, UUID userId, String customMessage = null) {
        log.info("Attempting to send reminder for appointment ${appointmentId} by user ${userId}")

        Appointment appointment = findAppointmentById(appointmentId)
        log.info("Found appointment: ${appointment.id}, status: ${appointment.status}, customer: ${appointment.user?.email ?: 'guest'}")

        // Validate user has permission to send reminder (shop owner or employee)
        User user = userService.findById(userId)
        boolean hasAccess = appointment.shop.owner.id.equals(userId) ||
                           appointment.employee.user.id.equals(userId)

        if (!hasAccess) {
            log.warn("Access denied for user ${userId} to send reminder for appointment ${appointmentId}")
            throw new IllegalArgumentException("Access denied to send appointment reminder")
        }

        // Only send reminders for confirmed or pending appointments
        if (appointment.status != AppointmentStatus.CONFIRMED && appointment.status != AppointmentStatus.PENDING) {
            log.warn("Cannot send reminder for appointment ${appointmentId} with status ${appointment.status}")
            throw new IllegalArgumentException("Can only send reminders for confirmed or pending appointments")
        }

        // Don't send reminders for past appointments
        if (appointment.appointmentDateTime.isBefore(LocalDateTime.now(ZoneOffset.UTC))) {
            log.warn("Cannot send reminder for past appointment ${appointmentId} scheduled for ${appointment.appointmentDateTime}")
            throw new IllegalArgumentException("Cannot send reminder for past appointments")
        }

        // Send reminder notification to customer (if they have an account)
        if (appointment.user) {
            log.info("Sending reminder notification to user ${appointment.user.email} for appointment ${appointmentId}")
            appointmentNotificationService.sendAppointmentReminder(appointment, customMessage)
        } else {
            log.warn("Cannot send reminder to guest appointment ${appointmentId}")
            throw new IllegalArgumentException("Cannot send reminder to guest appointments via notification system")
        }

        log.info("Successfully processed reminder request for appointment ${appointmentId}")
    }

    // Private helper methods

    private void validateAppointmentRequest(AppointmentCreationRequest request, UUID authenticatedUserId) {
        // Validate guest information if not authenticated
        if (!authenticatedUserId && !request.isGuestBooking()) {
            throw new IllegalArgumentException("Guest information is required for unauthenticated bookings")
        }

        // Validate employee self-booking prevention
        if (authenticatedUserId) {
            employeeService.validateEmployeeCannotBookWithThemselves(authenticatedUserId, request.employeeId)
        }

        // Validate appointment is in the future
        if (!request.appointmentDateTime.isAfter(LocalDateTime.now(ZoneOffset.UTC))) {
            throw new IllegalArgumentException("Appointment must be in the future")
        }
    }

    private void validateSlotAvailabilityAndLock(AppointmentCreationRequest request, Employee employee, Service service, UUID lockTokenUUID) {
        // Check for conflicting appointments
        LocalDateTime endTime = request.appointmentDateTime.plusMinutes(service.durationMinutes)
        List<Appointment> conflicts = appointmentRepository.findConflictingAppointments(
                employee, request.appointmentDateTime, endTime
        )

        if (!conflicts.isEmpty()) {
            throw new IllegalArgumentException("Time slot is not available")
        }

        // Validate slot is within employee's schedule
        DayOfWeek dayOfWeek = DayOfWeek.valueOf(request.appointmentDateTime.dayOfWeek.name())
        LocalTime appointmentTime = request.appointmentDateTime.toLocalTime()

        List<ScheduleSlot> scheduleSlots = scheduleSlotRepository
                .findByEmployeeAndDayOfWeekAndActiveTrue(employee, dayOfWeek)

        boolean withinSchedule = scheduleSlots.any { slot ->
            LocalTime appointmentEndTime = appointmentTime.plusMinutes(service.durationMinutes)

            if (slot.isCrossMidnightSlot()) {
                // Cross-midnight slot (e.g., 22:00 to 06:00 next day)
                // Appointment is valid if:
                // 1. It starts after slot start time and before midnight (22:00-23:59), OR
                // 2. It starts after midnight and ends before slot end time (00:00-06:00)
                boolean inFirstPart = appointmentTime >= slot.startTime && appointmentTime < LocalTime.MIDNIGHT
                boolean inSecondPart = appointmentTime >= LocalTime.MIDNIGHT && appointmentEndTime <= slot.endTime
                return inFirstPart || inSecondPart
            } else {
                // Normal slot (e.g., 09:00 to 17:00)
                return appointmentTime >= slot.startTime && appointmentEndTime <= slot.endTime
            }
        }

        if (!withinSchedule) {
            throw new IllegalArgumentException("Appointment time is outside employee's working hours")
        }

        // Validate that the slot is locked by the provided lock token
        if (!slotLockingService.isSlotLockedByUser(
                request.shopId, request.serviceId, request.employeeId,
                request.appointmentDateTime, lockTokenUUID)) {
            throw new IllegalArgumentException("Invalid or expired slot lock token")
        }
    }

    private void validateUserConflicts(AppointmentCreationRequest request, User user) {
        LocalDateTime endTime = request.appointmentDateTime.plusMinutes(
            serviceRepository.findById(request.serviceId)
                .orElseThrow { new RuntimeException("Service not found") }
                .durationMinutes
        )

        if (user != null) {
            // Check for authenticated user conflicts
            List<Appointment> userConflicts = appointmentRepository.findConflictingAppointmentsByUser(
                user, request.appointmentDateTime, endTime
            )

            if (!userConflicts.isEmpty()) {
                throw new IllegalArgumentException("You already have an appointment scheduled at this time")
            }
        } else if (request.guestEmail) {
            // Check for guest user conflicts by email
            List<Appointment> guestConflicts = appointmentRepository.findConflictingAppointmentsByGuestEmail(
                request.guestEmail, request.appointmentDateTime, endTime
            )

            if (!guestConflicts.isEmpty()) {
                throw new IllegalArgumentException("An appointment is already scheduled for this email at this time")
            }
        }
    }

    private void handlePayment(Appointment appointment, AppointmentCreationRequest request) {
        log.info("Handling payment for appointment. PaymentType: ${request.paymentType}, PaymentMethodId: ${request.paymentMethodId}")

        // Always respect the paymentType from the request
        appointment.paymentType = request.paymentType

        if (request.paymentType == PaymentType.CARD) {
            // Card payment - require payment intent, derive payment method if missing
            if (!request.paymentIntentId) {
                throw new IllegalArgumentException("Payment intent ID is required for card payments")
            }

            // Validate payment was actually successful by checking with Stripe
            try {
                def paymentValidation = paymentService.validatePaymentIntent(request.paymentIntentId)
                if (!paymentValidation.success || paymentValidation.status != 'succeeded') {
                    throw new IllegalArgumentException("Payment was not successful. Status: ${paymentValidation.status}")
                }

                appointment.paymentIntentId = request.paymentIntentId
                // Prefer request payment method, otherwise derive from Stripe validation
                def derivedPmId = request.paymentMethodId ?: (paymentValidation.paymentMethodId as String)
                appointment.paymentMethodId = derivedPmId
                appointment.paymentStatus = paymentValidation.status

                log.info("Card payment validated successfully. PaymentIntentId: ${request.paymentIntentId}, PaymentMethodId: ${derivedPmId}")
            } catch (Exception e) {
                log.error("Payment validation failed: ${e.message}")
                throw new IllegalArgumentException("Payment validation failed: ${e.message}")
            }
        } else if (request.paymentType == PaymentType.CASH) {
            // Cash payment - no additional validation needed
            appointment.paymentStatus = 'pending' // Cash payments are pending until paid at shop
            log.info("Set payment type to CASH")
        } else {
            throw new IllegalArgumentException("Invalid payment type: ${request.paymentType}")
        }
    }

    private void validateUserCanModifyAppointment(Appointment appointment, UUID userId) {
        // Allow customers to modify their own appointments
        boolean isCustomer = appointment.user?.id == userId

        // Allow employees to modify appointments assigned to them
        boolean isAssignedEmployee = appointment.employee?.user?.id == userId

        // Allow shop owners to modify appointments at their shops
        boolean isShopOwner = appointment.shop?.owner?.id == userId

        if (!isCustomer && !isAssignedEmployee && !isShopOwner) {
            throw new IllegalArgumentException("You can only modify appointments that belong to you or are assigned to you")
        }
    }

    private void validateReschedule(Appointment appointment, LocalDateTime newDateTime) {
        // Validate new time slot availability
        LocalDateTime endTime = newDateTime.plusMinutes(appointment.service.durationMinutes)
        List<Appointment> conflicts = appointmentRepository.findConflictingAppointments(
                appointment.employee, newDateTime, endTime
        )

        // Exclude current appointment from conflict check
        conflicts = conflicts.findAll { it.id != appointment.id }

        if (!conflicts.isEmpty()) {
            throw new IllegalArgumentException("New time slot is not available")
        }

        // Validate user doesn't have conflicting appointments at new time
        if (appointment.user != null) {
            List<Appointment> userConflicts = appointmentRepository.findConflictingAppointmentsByUser(
                appointment.user, newDateTime, endTime
            )

            // Exclude current appointment from user conflict check
            userConflicts = userConflicts.findAll { it.id != appointment.id }

            if (!userConflicts.isEmpty()) {
                throw new IllegalArgumentException("You already have an appointment scheduled at this time")
            }
        } else if (appointment.guestEmail) {
            List<Appointment> guestConflicts = appointmentRepository.findConflictingAppointmentsByGuestEmail(
                appointment.guestEmail, newDateTime, endTime
            )

            // Exclude current appointment from guest conflict check
            guestConflicts = guestConflicts.findAll { it.id != appointment.id }

            if (!guestConflicts.isEmpty()) {
                throw new IllegalArgumentException("An appointment is already scheduled for this email at this time")
            }
        }
    }

    private void validateRescheduleWithLock(Appointment appointment, LocalDateTime newDateTime, String lockToken, UUID userId) {
        // First do basic reschedule validation
        validateReschedule(appointment, newDateTime)

        // Validate new time is in the future
        if (!newDateTime.isAfter(LocalDateTime.now(ZoneOffset.UTC))) {
            throw new IllegalArgumentException("New appointment time must be in the future")
        }

        // Validate new time is within employee's schedule
        DayOfWeek dayOfWeek = DayOfWeek.valueOf(newDateTime.dayOfWeek.name())
        LocalTime appointmentTime = newDateTime.toLocalTime()

        List<ScheduleSlot> scheduleSlots = scheduleSlotRepository
                .findByEmployeeAndDayOfWeekAndActiveTrue(appointment.employee, dayOfWeek)

        boolean withinSchedule = scheduleSlots.any { slot ->
            appointmentTime >= slot.startTime &&
            appointmentTime.plusMinutes(appointment.service.durationMinutes) <= slot.endTime
        }

        if (!withinSchedule) {
            throw new IllegalArgumentException("New appointment time is outside employee's working hours")
        }

        // If lock token is provided, validate it
        if (lockToken) {
            try {
                UUID lockTokenUUID = UUID.fromString(lockToken)
                boolean isValidLock = slotLockingService.isSlotLockedByUser(
                    appointment.shop.id,
                    appointment.service.id,
                    appointment.employee.id,
                    newDateTime,
                    lockTokenUUID
                )

                if (!isValidLock) {
                    throw new IllegalArgumentException("Invalid or expired slot lock token")
                }
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid lock token format")
            }
        } else {
            // If no lock token provided, check if slot is currently locked by someone else
            boolean isLocked = slotLockingService.isSlotLocked(
                appointment.shop.id,
                appointment.service.id,
                appointment.employee.id,
                newDateTime
            )

            if (isLocked) {
                throw new IllegalArgumentException("Time slot is currently locked by another user")
            }
        }
    }

    private Appointment findAppointmentById(UUID appointmentId) {
        return appointmentRepository.findById(appointmentId)
                .orElseThrow { new RuntimeException("Appointment not found") }
    }

    private List<LocalTime> generateTimeSlots(LocalTime startTime, LocalTime endTime, Integer durationMinutes) {
        List<LocalTime> slots = []
        LocalTime current = startTime

        // Check if this is a cross-midnight schedule (startTime > endTime)
        boolean isCrossMidnight = startTime.isAfter(endTime)

        if (isCrossMidnight) {
            // Handle cross-midnight schedule (e.g., 22:00 to 06:00)
            // First part: from startTime to midnight
            while (current.plusMinutes(durationMinutes) <= LocalTime.MIDNIGHT || current.plusMinutes(durationMinutes) == LocalTime.MIDNIGHT) {
                slots.add(current)
                current = current.plusMinutes(durationMinutes)
                if (current >= LocalTime.MIDNIGHT) break
            }

            // Second part: from midnight to endTime
            current = LocalTime.MIDNIGHT
            while (current.plusMinutes(durationMinutes) <= endTime) {
                slots.add(current)
                current = current.plusMinutes(durationMinutes)
            }
        } else {
            // Normal schedule (e.g., 09:00 to 17:00)
            while (current.plusMinutes(durationMinutes) <= endTime) {
                slots.add(current)
                current = current.plusMinutes(durationMinutes)
            }
        }

        return slots
    }

    private boolean hasConflictingAppointment(List<Appointment> appointments, LocalDateTime startTime, LocalTime endTime) {
        LocalDateTime slotEndTime = startTime.toLocalDate().atTime(endTime)

        return appointments.any { appointment ->
            // Skip cancelled or no-show appointments
            if (appointment.status in [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW]) {
                return false
            }

            LocalDateTime appointmentStart = appointment.appointmentDateTime
            LocalDateTime appointmentEnd = appointment.endDateTime

            // For completed appointments, use actual completion time if earlier than scheduled
            if (appointment.status == AppointmentStatus.COMPLETED && appointment.completedAt) {
                appointmentEnd = appointment.completedAt
            }

            // Check for time overlap
            return appointmentStart < slotEndTime && appointmentEnd > startTime
        }
    }

    private void validateStatusTransition(Appointment appointment, AppointmentStatus newStatus) {
        AppointmentStatus currentStatus = appointment.status

        // Cannot change status of cancelled or completed appointments
        if (currentStatus == AppointmentStatus.CANCELLED) {
            throw new IllegalArgumentException("Cannot update status of cancelled appointment")
        }

        if (currentStatus == AppointmentStatus.COMPLETED) {
            throw new IllegalArgumentException("Cannot update status of completed appointment")
        }

        // Validate specific transitions
        switch (newStatus) {
            case AppointmentStatus.CONFIRMED:
                if (currentStatus != AppointmentStatus.PENDING) {
                    throw new IllegalArgumentException("Can only confirm pending appointments")
                }
                break
            case AppointmentStatus.COMPLETED:
                if (currentStatus != AppointmentStatus.CONFIRMED && currentStatus != AppointmentStatus.IN_PROGRESS) {
                    throw new IllegalArgumentException("Can only complete confirmed or in-progress appointments")
                }
                break
            case AppointmentStatus.NO_SHOW:
                if (currentStatus != AppointmentStatus.CONFIRMED) {
                    throw new IllegalArgumentException("Can only mark confirmed appointments as no-show")
                }
                // Validate appointment time has passed
                if (appointment.appointmentDateTime.isAfter(LocalDateTime.now(ZoneOffset.UTC))) {
                    throw new IllegalArgumentException("Cannot mark future appointments as no-show")
                }
                break
            case AppointmentStatus.CANCELLED:
                throw new IllegalArgumentException("Use cancelAppointment method to cancel appointments")
        }
    }

    private AppointmentResponse convertToResponse(Appointment appointment) {
        AppointmentResponse response = new AppointmentResponse()

        // Basic appointment info
        response.id = appointment.id
        response.appointmentDateTime = appointment.appointmentDateTime
        response.endDateTime = appointment.endDateTime
        response.status = appointment.status
        response.paymentType = appointment.paymentType
        response.totalAmount = appointment.totalAmount
        response.depositAmount = appointment.depositAmount
        response.notes = appointment.notes
        response.paymentIntentId = appointment.paymentIntentId
        response.paymentMethodId = appointment.paymentMethodId
        response.paymentStatus = appointment.paymentStatus
        response.refundId = appointment.refundId
        response.refundStatus = appointment.refundStatus
        response.refundAmount = appointment.refundAmount
        response.refundDate = appointment.refundDate
        response.cancellationReason = appointment.cancellationReason
        response.cancelledAt = appointment.cancelledAt
        response.cancelledBy = appointment.cancelledBy
        response.reminderSent = appointment.reminderSent
        response.confirmationSent = appointment.confirmationSent
        response.createdAt = appointment.createdAt
        response.updatedAt = appointment.updatedAt

        // Shop info
        response.shopId = appointment.shop.id
        response.shopName = appointment.shop.name
        response.shopAddress = appointment.shop.getFullAddress()
        response.shopPhone = appointment.shop.phone
        response.shopCountry = appointment.shop.country

        // Employee info
        response.employeeId = appointment.employee.id
        response.employeeName = appointment.employee.fullName
        response.employeeSpecialties = appointment.employee.specialties

        // Service info
        response.serviceId = appointment.service.id
        response.serviceName = appointment.service.name
        response.serviceDescription = appointment.service.description
        response.serviceDurationMinutes = appointment.service.durationMinutes
        response.servicePrice = appointment.service.price

        // User/Guest info
        if (appointment.user) {
            response.userId = appointment.user.id
            response.userName = appointment.user.fullName
            response.userEmail = appointment.user.email
        } else {
            response.guestEmail = appointment.guestEmail
            response.guestFirstName = appointment.guestFirstName
            response.guestLastName = appointment.guestLastName
            response.guestPhone = appointment.guestPhone
        }

        return response
    }
}
