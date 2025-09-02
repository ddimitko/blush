package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.dto.LeaveRequestCreateDto
import com.ddimitko.beautyhub.dto.LeaveRequestDto
import com.ddimitko.beautyhub.dto.LeaveRequestReviewDto
import com.ddimitko.beautyhub.dto.LeaveRequestSummaryDto
import com.ddimitko.beautyhub.dto.LeaveRequestUpdateDto
import com.ddimitko.beautyhub.entity.Appointment
import com.ddimitko.beautyhub.entity.Employee
import com.ddimitko.beautyhub.entity.LeaveRequest
import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.enums.AppointmentStatus
import com.ddimitko.beautyhub.enums.LeaveRequestStatus
import com.ddimitko.beautyhub.enums.LeaveType
import com.ddimitko.beautyhub.repository.AppointmentRepository
import com.ddimitko.beautyhub.repository.EmployeeRepository
import com.ddimitko.beautyhub.repository.LeaveRequestRepository
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

import java.time.LocalDate
import java.time.LocalDateTime

@Service
@Slf4j
@Transactional
class LeaveRequestService {

    @Autowired
    private LeaveRequestRepository leaveRequestRepository

    @Autowired
    private EmployeeRepository employeeRepository

    @Autowired
    private AppointmentRepository appointmentRepository

    @Autowired
    private EmployeeService employeeService

    @Autowired
    private UserService userService

    @Autowired
    private NotificationService notificationService

    /**
     * Create a new leave request
     */
    LeaveRequestDto createLeaveRequest(UUID employeeId, LeaveRequestCreateDto createDto) {
        Employee employee = employeeRepository.findByIdWithUserAndShop(employeeId)
                .orElseThrow { new RuntimeException("Employee not found") }

        // Validate dates
        if (createDto.startDate.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Start date cannot be in the past")
        }

        if (createDto.startDate.isAfter(createDto.endDate)) {
            throw new IllegalArgumentException("Start date must be before or equal to end date")
        }

        // Validate minimum notice period (except for sick leave which can be emergency)
        if (createDto.leaveType != LeaveType.SICK_LEAVE) {
            long daysNotice = LocalDate.now().until(createDto.startDate).getDays()
            if (daysNotice < 7) { // Minimum 7 days notice for non-sick leave
                throw new IllegalArgumentException("Minimum 7 days notice required for ${createDto.leaveType.displayName.toLowerCase()} requests")
            }
        }

        // Check for overlapping leave requests
        if (leaveRequestRepository.hasOverlappingLeave(
                employee, createDto.startDate, createDto.endDate, UUID.randomUUID())) {
            throw new IllegalArgumentException("You already have a leave request for this period")
        }

        // Create leave request
        LeaveRequest leaveRequest = new LeaveRequest()
        leaveRequest.employee = employee
        leaveRequest.leaveType = createDto.leaveType
        leaveRequest.startDate = createDto.startDate
        leaveRequest.endDate = createDto.endDate
        leaveRequest.reason = createDto.reason
        leaveRequest.status = LeaveRequestStatus.PENDING
        leaveRequest.affectsAnnualLeave = isAnnualLeaveType(createDto.leaveType)

        // Calculate leave days based on employee's workdays
        Integer calculatedDays = (Integer) leaveRequest.getLeaveDays()
        leaveRequest.calculatedLeaveDays = calculatedDays

        // Check if employee has sufficient leave days (only for annual leave types)
        if (leaveRequest.affectsAnnualLeave && !employee.hasSufficientLeaveDays(calculatedDays)) {
            throw new IllegalArgumentException(
                "Insufficient leave days. Requested: ${calculatedDays}, Available: ${employee.getRemainingLeaveDays()}"
            )
        }

        leaveRequest = leaveRequestRepository.save(leaveRequest)

        // Notify shop owner
        notificationService.notifyLeaveRequestSubmitted(leaveRequest)

        log.info("Leave request created for employee ${employee.fullName} from ${createDto.startDate} to ${createDto.endDate}, ${calculatedDays} workdays")

        return convertToDto(leaveRequest)
    }

    /**
     * Update a leave request (only if pending)
     */
    LeaveRequestDto updateLeaveRequest(UUID leaveRequestId, UUID employeeId, LeaveRequestUpdateDto updateDto) {
        LeaveRequest leaveRequest = leaveRequestRepository.findById(leaveRequestId)
                .orElseThrow { new RuntimeException("Leave request not found") }

        // Verify ownership
        if (leaveRequest.employee.id != employeeId) {
            throw new IllegalArgumentException("You can only update your own leave requests")
        }

        // Only allow updates for pending requests
        if (leaveRequest.status != LeaveRequestStatus.PENDING) {
            throw new IllegalArgumentException("Only pending leave requests can be updated")
        }

        // Validate dates if provided
        LocalDate newStartDate = updateDto.startDate ?: leaveRequest.startDate
        LocalDate newEndDate = updateDto.endDate ?: leaveRequest.endDate

        if (newStartDate.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Start date cannot be in the past")
        }

        if (newStartDate.isAfter(newEndDate)) {
            throw new IllegalArgumentException("Start date must be before or equal to end date")
        }

        // Check for overlapping leave requests (excluding current one)
        if (leaveRequestRepository.hasOverlappingLeave(
                leaveRequest.employee, newStartDate, newEndDate, leaveRequestId)) {
            throw new IllegalArgumentException("You already have a leave request for this period")
        }

        // Update fields
        if (updateDto.leaveType) leaveRequest.leaveType = updateDto.leaveType
        if (updateDto.startDate) leaveRequest.startDate = updateDto.startDate
        if (updateDto.endDate) leaveRequest.endDate = updateDto.endDate
        if (updateDto.reason !== null) leaveRequest.reason = updateDto.reason

        leaveRequest = leaveRequestRepository.save(leaveRequest)

        log.info("Leave request updated for employee ${leaveRequest.employee.fullName}")

        return convertToDto(leaveRequest)
    }

    /**
     * Review a leave request (approve/reject)
     */
    LeaveRequestDto reviewLeaveRequest(UUID leaveRequestId, UUID reviewerId, LeaveRequestReviewDto reviewDto) {
        LeaveRequest leaveRequest = leaveRequestRepository.findById(leaveRequestId)
                .orElseThrow { new RuntimeException("Leave request not found") }

        User reviewer = userService.findById(reviewerId)

        // Verify reviewer is shop owner
        if (leaveRequest.employee.shop.owner.id != reviewerId) {
            throw new IllegalArgumentException("Only shop owners can review leave requests")
        }

        // Only allow review for pending requests
        if (leaveRequest.status != LeaveRequestStatus.PENDING) {
            throw new IllegalArgumentException("Only pending leave requests can be reviewed")
        }

        // Update leave request status
        leaveRequest.status = reviewDto.status
        leaveRequest.reviewedBy = reviewer
        leaveRequest.reviewedAt = LocalDateTime.now()
        leaveRequest.reviewNotes = reviewDto.reviewNotes

        // If approved and affects annual leave, deduct days from employee's balance
        if (reviewDto.status == LeaveRequestStatus.APPROVED && leaveRequest.affectsAnnualLeave) {
            Employee employee = leaveRequest.employee

            // Double-check employee still has sufficient leave days
            if (!employee.hasSufficientLeaveDays(leaveRequest.calculatedLeaveDays)) {
                throw new IllegalArgumentException(
                    "Employee no longer has sufficient leave days. Required: ${leaveRequest.calculatedLeaveDays}, Available: ${employee.getRemainingLeaveDays()}"
                )
            }

            // Log before deduction
            log.info("Before deduction - Employee ${employee.fullName}: usedLeaveDays = ${employee.usedLeaveDays}, deducting ${leaveRequest.calculatedLeaveDays} days")

            // Deduct leave days from employee's annual balance
            Integer previousUsedDays = employee.usedLeaveDays ?: 0
            employee.deductLeaveDays(leaveRequest.calculatedLeaveDays)

            // Force flush to ensure database update
            employee = employeeRepository.saveAndFlush(employee)

            // Log after deduction
            log.info("After deduction - Employee ${employee.fullName}: usedLeaveDays = ${employee.usedLeaveDays} (was ${previousUsedDays}). Remaining: ${employee.getRemainingLeaveDays()}")
        }

        leaveRequest = leaveRequestRepository.save(leaveRequest)

        // If approved, cancel any appointments during the leave period
        if (reviewDto.status == LeaveRequestStatus.APPROVED) {
            cancelAppointmentsDuringLeave(leaveRequest)
        }

        // Notify employee
        notificationService.notifyLeaveRequestReviewed(leaveRequest)

        log.info("Leave request ${reviewDto.status.name().toLowerCase()} for employee ${leaveRequest.employee.fullName} by ${reviewer.fullName}")

        return convertToDto(leaveRequest)
    }

    /**
     * Cancel a leave request
     */
    LeaveRequestDto cancelLeaveRequest(UUID leaveRequestId, UUID employeeId) {
        LeaveRequest leaveRequest = leaveRequestRepository.findById(leaveRequestId)
                .orElseThrow { new RuntimeException("Leave request not found") }

        // Verify ownership
        if (leaveRequest.employee.id != employeeId) {
            throw new IllegalArgumentException("You can only cancel your own leave requests")
        }

        // Check if can be cancelled
        if (!leaveRequest.canBeCancelled()) {
            throw new IllegalArgumentException("This leave request cannot be cancelled")
        }

        leaveRequest.status = LeaveRequestStatus.CANCELLED
        leaveRequest = leaveRequestRepository.save(leaveRequest)

        log.info("Leave request cancelled for employee ${leaveRequest.employee.fullName}")

        // Send notification to shop owner about the cancellation
        try {
            notificationService.createLeaveRequestCancelledNotification(leaveRequest)
        } catch (Exception e) {
            log.error("Failed to send leave request cancellation notification: ${e.message}", e)
        }

        return convertToDto(leaveRequest)
    }

    /**
     * Get leave requests for an employee
     */
    Page<LeaveRequestDto> getEmployeeLeaveRequests(UUID employeeId, Pageable pageable) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow { new RuntimeException("Employee not found") }

        Page<LeaveRequest> leaveRequests = leaveRequestRepository
                .findByEmployeeOrderByCreatedAtDesc(employee, pageable)

        List<LeaveRequestDto> dtos = leaveRequests.content.collect { convertToDto(it) }
        return new PageImpl<>(dtos, pageable, leaveRequests.totalElements)
    }

    /**
     * Get leave requests for a shop (for owners)
     */
    Page<LeaveRequestDto> getShopLeaveRequests(UUID shopId, UUID ownerId, Pageable pageable) {
        Shop shop = employeeService.getShopWithOwnershipCheck(shopId, ownerId)

        Page<LeaveRequest> leaveRequests = leaveRequestRepository
                .findByShopOrderByCreatedAtDesc(shop, pageable)

        List<LeaveRequestDto> dtos = leaveRequests.content.collect { convertToDto(it) }
        return new PageImpl<>(dtos, pageable, leaveRequests.totalElements)
    }

    /**
     * Get pending leave requests for a shop
     */
    List<LeaveRequestDto> getPendingLeaveRequests(UUID shopId, UUID ownerId) {
        Shop shop = employeeService.getShopWithOwnershipCheck(shopId, ownerId)

        List<LeaveRequest> pendingRequests = leaveRequestRepository.findPendingByShop(shop)
        return pendingRequests.collect { convertToDto(it) }
    }

    /**
     * Check if employee is on leave for a specific date
     */
    boolean isEmployeeOnLeave(UUID employeeId, LocalDate date) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow { new RuntimeException("Employee not found") }

        List<LeaveRequest> activeLeave = leaveRequestRepository.findActiveLeaveForDate(employee, date)
        return !activeLeave.isEmpty()
    }

    /**
     * Get employees on leave for a specific date
     */
    List<UUID> getEmployeesOnLeave(UUID shopId, LocalDate date) {
        Shop shop = employeeService.findShopById(shopId)
        List<LeaveRequest> activeLeave = leaveRequestRepository.findActiveLeaveForShopAndDate(shop, date)
        return activeLeave.collect { it.employee.id }
    }

    /**
     * Cancel appointments during approved leave period
     */
    private void cancelAppointmentsDuringLeave(LeaveRequest leaveRequest) {
        try {
            // Find appointments during the leave period
            LocalDateTime startDateTime = leaveRequest.startDate.atStartOfDay()
            LocalDateTime endDateTime = leaveRequest.endDate.atTime(23, 59, 59)

            List<Appointment> appointmentsDuringLeave = appointmentRepository
                .findByEmployeeAndAppointmentDateTimeBetween(
                    leaveRequest.employee, startDateTime, endDateTime)

            appointmentsDuringLeave.each { appointment ->
                if (appointment.status == AppointmentStatus.CONFIRMED) {
                    // Cancel the appointment
                    appointment.status = AppointmentStatus.CANCELLED
                    appointment.cancellationReason = "Employee on approved leave"
                    appointment.cancelledAt = LocalDateTime.now()
                    appointment.cancelledBy = "system"

                    appointmentRepository.save(appointment)

                    // Notify customer about cancellation due to leave
                    notificationService.notifyAppointmentCancellationDueToLeave(appointment)

                    log.info("Cancelled appointment ${appointment.id} due to approved leave for employee ${leaveRequest.employee.fullName}")
                }
            }
        } catch (Exception e) {
            log.error("Failed to cancel appointments during leave for employee ${leaveRequest.employee.fullName}: ${e.message}", e)
        }
    }

    /**
     * Determine if a leave type affects annual leave balance
     * Common types that affect annual leave: vacation/annual leave, maternity/paternity leave
     * Sick leave is unlimited and does not affect annual leave balance
     */
    private boolean isAnnualLeaveType(LeaveType leaveType) {
        return leaveType in [
            LeaveType.VACATION,      // Vacation/annual leave affects annual leave balance
            LeaveType.PERSONAL,      // Personal leave affects annual leave balance
            LeaveType.MATERNITY,     // Maternity leave affects annual leave balance
            LeaveType.PATERNITY      // Paternity leave affects annual leave balance
        ]
    }

    /**
     * Convert entity to DTO
     */
    private LeaveRequestDto convertToDto(LeaveRequest leaveRequest) {
        return new LeaveRequestDto(
                id: leaveRequest.id,
                employeeId: leaveRequest.employee.id,
                employeeName: leaveRequest.employee.fullName,
                employeeEmail: leaveRequest.employee.email,
                leaveType: leaveRequest.leaveType,
                startDate: leaveRequest.startDate,
                endDate: leaveRequest.endDate,
                reason: leaveRequest.reason,
                status: leaveRequest.status,
                leaveDays: leaveRequest.calculatedLeaveDays ?: leaveRequest.leaveDays,
                calculatedLeaveDays: leaveRequest.calculatedLeaveDays,
                affectsAnnualLeave: leaveRequest.affectsAnnualLeave,
                reviewedByUserId: leaveRequest.reviewedBy?.id,
                reviewerName: leaveRequest.reviewedBy?.fullName,
                reviewedAt: leaveRequest.reviewedAt,
                reviewNotes: leaveRequest.reviewNotes,
                createdAt: leaveRequest.createdAt,
                updatedAt: leaveRequest.updatedAt,
                canBeCancelled: leaveRequest.canBeCancelled(),
                canBeReviewed: leaveRequest.canBeReviewed(),
                isActive: leaveRequest.isActive(),
                isFuture: leaveRequest.isFuture()
        )
    }
}
