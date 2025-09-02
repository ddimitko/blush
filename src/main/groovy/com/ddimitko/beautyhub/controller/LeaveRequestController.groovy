package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.dto.LeaveRequestCreateDto
import com.ddimitko.beautyhub.dto.LeaveRequestDto
import com.ddimitko.beautyhub.dto.LeaveRequestReviewDto
import com.ddimitko.beautyhub.dto.LeaveRequestUpdateDto
import com.ddimitko.beautyhub.entity.Employee
import com.ddimitko.beautyhub.entity.LeaveRequest
import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.repository.EmployeeRepository
import com.ddimitko.beautyhub.repository.LeaveRequestRepository
import com.ddimitko.beautyhub.repository.ShopRepository
import com.ddimitko.beautyhub.security.CustomUserPrincipal
import com.ddimitko.beautyhub.service.EmployeeService
import com.ddimitko.beautyhub.service.LeaveRequestService
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

import jakarta.validation.Valid
import java.time.LocalDate

@RestController
@RequestMapping("/api/leave-requests")
@Slf4j
class LeaveRequestController {

    @Autowired
    private LeaveRequestService leaveRequestService

    @Autowired
    private EmployeeService employeeService

    @Autowired
    private EmployeeRepository employeeRepository

    @Autowired
    private LeaveRequestRepository leaveRequestRepository

    @Autowired
    private ShopRepository shopRepository

    /**
     * Create a new leave request
     */
    @PostMapping("/employee/{employeeId}")
    @PreAuthorize("hasRole('EMPLOYEE')")
    ResponseEntity<?> createLeaveRequest(
            @PathVariable("employeeId") UUID employeeId,
            @Valid @RequestBody LeaveRequestCreateDto createDto,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user is the employee or owns the shop
            if (!employeeService.canUserAccessEmployee(userPrincipal.getId(), employeeId)) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only create leave requests for yourself"
                ])
            }

            LeaveRequestDto leaveRequest = leaveRequestService.createLeaveRequest(employeeId, createDto)
            
            return ResponseEntity.ok([
                message: "Leave request created successfully",
                leaveRequest: leaveRequest
            ])
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Invalid request",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Failed to create leave request: ${e.getMessage()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to create leave request",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Update a leave request
     */
    @PutMapping("/{leaveRequestId}/employee/{employeeId}")
    @PreAuthorize("hasRole('EMPLOYEE')")
    ResponseEntity<?> updateLeaveRequest(
            @PathVariable("leaveRequestId") UUID leaveRequestId,
            @PathVariable("employeeId") UUID employeeId,
            @Valid @RequestBody LeaveRequestUpdateDto updateDto,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user is the employee
            if (!employeeService.canUserAccessEmployee(userPrincipal.getId(), employeeId)) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only update your own leave requests"
                ])
            }

            LeaveRequestDto leaveRequest = leaveRequestService.updateLeaveRequest(leaveRequestId, employeeId, updateDto)
            
            return ResponseEntity.ok([
                message: "Leave request updated successfully",
                leaveRequest: leaveRequest
            ])
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Invalid request",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Failed to update leave request: ${e.getMessage()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to update leave request",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Cancel a leave request
     */
    @PostMapping("/{leaveRequestId}/cancel/employee/{employeeId}")
    @PreAuthorize("hasRole('EMPLOYEE')")
    ResponseEntity<?> cancelLeaveRequest(
            @PathVariable("leaveRequestId") UUID leaveRequestId,
            @PathVariable("employeeId") UUID employeeId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user is the employee
            if (!employeeService.canUserAccessEmployee(userPrincipal.getId(), employeeId)) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only cancel your own leave requests"
                ])
            }

            LeaveRequestDto leaveRequest = leaveRequestService.cancelLeaveRequest(leaveRequestId, employeeId)
            
            return ResponseEntity.ok([
                message: "Leave request cancelled successfully",
                leaveRequest: leaveRequest
            ])
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Invalid request",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Failed to cancel leave request: ${e.getMessage()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to cancel leave request",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Review a leave request (approve/reject)
     */
    @PostMapping("/{leaveRequestId}/review")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> reviewLeaveRequest(
            @PathVariable("leaveRequestId") UUID leaveRequestId,
            @Valid @RequestBody LeaveRequestReviewDto reviewDto,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            LeaveRequestDto leaveRequest = leaveRequestService.reviewLeaveRequest(
                    leaveRequestId, userPrincipal.getId(), reviewDto)
            
            return ResponseEntity.ok([
                message: "Leave request reviewed successfully",
                leaveRequest: leaveRequest
            ])
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Invalid request",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Failed to review leave request: ${e.getMessage()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to review leave request",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Get leave requests for an employee
     */
    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'OWNER')")
    ResponseEntity<?> getEmployeeLeaveRequests(
            @PathVariable("employeeId") UUID employeeId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Get the employee to check access
            Employee employee = employeeRepository.findByIdWithUserAndShop(employeeId)
                    .orElseThrow { new RuntimeException("Employee not found") }

            // Verify access - user must be the employee themselves or the shop owner
            boolean hasAccess = (employee.user?.id == userPrincipal.getId()) ||
                               (employee.shop.owner.id == userPrincipal.getId())

            if (!hasAccess) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only view your own leave requests or those of your employees"
                ])
            }

            Pageable pageable = PageRequest.of(page, size)
            Page<LeaveRequestDto> leaveRequests = leaveRequestService.getEmployeeLeaveRequests(employeeId, pageable)

            return ResponseEntity.ok([
                leaveRequests: leaveRequests.content,
                totalElements: leaveRequests.totalElements,
                totalPages: leaveRequests.totalPages,
                currentPage: page,
                pageSize: size
            ])
        } catch (Exception e) {
            log.error("Failed to get employee leave requests: ${e.getMessage()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to get leave requests",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Get leave requests for a shop (for owners)
     */
    @GetMapping("/shop/{shopId}")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getShopLeaveRequests(
            @PathVariable("shopId") UUID shopId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            Pageable pageable = PageRequest.of(page, size)
            Page<LeaveRequestDto> leaveRequests = leaveRequestService.getShopLeaveRequests(
                    shopId, userPrincipal.getId(), pageable)
            
            return ResponseEntity.ok([
                leaveRequests: leaveRequests.content,
                totalElements: leaveRequests.totalElements,
                totalPages: leaveRequests.totalPages,
                currentPage: page,
                pageSize: size
            ])
        } catch (Exception e) {
            log.error("Failed to get shop leave requests: ${e.getMessage()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to get leave requests",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Get pending leave requests for a shop
     */
    @GetMapping("/shop/{shopId}/pending")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getPendingLeaveRequests(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            List<LeaveRequestDto> pendingRequests = leaveRequestService.getPendingLeaveRequests(
                    shopId, userPrincipal.getId())
            
            return ResponseEntity.ok([
                pendingRequests: pendingRequests,
                count: pendingRequests.size()
            ])
        } catch (Exception e) {
            log.error("Failed to get pending leave requests: ${e.getMessage()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to get pending leave requests",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Check if employee is on leave for a specific date
     */
    @GetMapping("/employee/{employeeId}/check-leave")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'OWNER')")
    ResponseEntity<?> checkEmployeeLeave(
            @PathVariable("employeeId") UUID employeeId,
            @RequestParam(name = "date") String date,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify access
            if (!employeeService.canUserAccessEmployee(userPrincipal.getId(), employeeId)) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only check your own leave status"
                ])
            }

            LocalDate checkDate = LocalDate.parse(date)
            boolean isOnLeave = leaveRequestService.isEmployeeOnLeave(employeeId, checkDate)

            return ResponseEntity.ok([
                employeeId: employeeId,
                date: date,
                isOnLeave: isOnLeave
            ])
        } catch (Exception e) {
            log.error("Failed to check employee leave: ${e.getMessage()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to check leave status",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Get all approved absences for a shop within a date range (for calendar display)
     */
    @GetMapping("/shop/{shopId}/absences")
    @PreAuthorize("hasAnyAuthority('ROLE_OWNER', 'ROLE_EMPLOYEE')")
    ResponseEntity<?> getShopEmployeeAbsences(
            @PathVariable("shopId") UUID shopId,
            @RequestParam(name = "startDate") String startDate,
            @RequestParam(name = "endDate") String endDate,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify access - shop owner or employee at the shop
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found") }

            boolean hasAccess = shop.owner.id.equals(userPrincipal.getId()) ||
                               employeeService.isEmployeeAtShop(userPrincipal.getId(), shopId)

            if (!hasAccess) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only view absences for shops where you are the owner or an employee"
                ])
            }

            LocalDate start = LocalDate.parse(startDate)
            LocalDate end = LocalDate.parse(endDate)

            // Get all approved leave requests for the shop within the date range
            List<LeaveRequest> approvedLeaveRequests = leaveRequestRepository.findApprovedLeaveForShopAndDateRange(shop, start, end)

            List<Map<String, Object>> absences = approvedLeaveRequests.collect { leaveRequest ->
                [
                    id: leaveRequest.id,
                    employeeId: leaveRequest.employee.id,
                    employeeName: leaveRequest.employee.fullName,
                    leaveType: leaveRequest.leaveType.toString(),
                    startDate: leaveRequest.startDate.toString(),
                    endDate: leaveRequest.endDate.toString(),
                    reason: leaveRequest.reason,
                    status: leaveRequest.status.toString(),
                    calculatedLeaveDays: leaveRequest.calculatedLeaveDays
                ]
            }

            return ResponseEntity.ok([
                absences: absences,
                count: absences.size(),
                shopId: shopId,
                dateRange: [
                    startDate: startDate,
                    endDate: endDate
                ]
            ])
        } catch (Exception e) {
            log.error("Failed to get shop employee absences: ${e.getMessage()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to get employee absences",
                message: "An unexpected error occurred"
            ])
        }
    }
}
