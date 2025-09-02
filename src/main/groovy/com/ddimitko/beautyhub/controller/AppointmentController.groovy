package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.dto.*
import com.ddimitko.beautyhub.security.CustomUserPrincipal
import com.ddimitko.beautyhub.service.AppointmentService
import com.ddimitko.beautyhub.service.SlotLockingService
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import groovy.util.logging.Slf4j

import jakarta.validation.Valid
import java.time.LocalDate

@Slf4j
@RestController
@RequestMapping("/api/appointments")
@CrossOrigin(origins = "*", maxAge = 3600)
class AppointmentController {

    @Autowired
    private AppointmentService appointmentService

    @Autowired
    private SlotLockingService slotLockingService

    /**
     * Create a new appointment (supports both authenticated and guest users)
     */
    @PostMapping
    ResponseEntity<?> createAppointment(
            @Valid @RequestBody AppointmentCreationRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            UUID userId = userPrincipal?.getId()
            AppointmentResponse response = appointmentService.createAppointment(request, userId)
            
            return ResponseEntity.ok([
                message: "Appointment created successfully",
                appointment: response
            ])
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Appointment creation failed",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Failed to create appointment: ${e.getMessage()}", e)
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body([
                error: "Appointment creation failed",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Update an existing appointment
     */
    @PutMapping("/{appointmentId}")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> updateAppointment(
            @PathVariable("appointmentId") UUID appointmentId,
            @Valid @RequestBody AppointmentUpdateRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            AppointmentResponse response = appointmentService.updateAppointment(
                appointmentId, request, userPrincipal.getId()
            )
            
            return ResponseEntity.ok([
                message: "Appointment updated successfully",
                appointment: response
            ])
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Appointment update failed",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Appointment update failed",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Cancel an appointment
     */
    @PutMapping("/{appointmentId}/cancel")
    @PreAuthorize("isAuthenticated()")
    ResponseEntity<?> cancelAppointment(
            @PathVariable("appointmentId") UUID appointmentId,
            @RequestBody Map<String, Object> requestBody,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            String reason = requestBody.get("reason") as String ?: "No reason provided"
            BigDecimal refundAmount = null

            // Parse refund amount if provided
            if (requestBody.containsKey("refundAmount")) {
                def refundValue = requestBody.get("refundAmount")
                if (refundValue != null) {
                    refundAmount = new BigDecimal(refundValue.toString())
                }
            }

            AppointmentResponse response = appointmentService.cancelAppointment(
                appointmentId, reason, userPrincipal.getId(), refundAmount
            )

            return ResponseEntity.ok([
                message: "Appointment cancelled successfully",
                appointment: response
            ])
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Appointment cancellation failed",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Appointment cancellation failed",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Get available time slots for booking
     */
    @GetMapping("/available-slots")
    ResponseEntity<?> getAvailableSlots(
            @RequestParam("shopId") UUID shopId,
            @RequestParam("employeeId") String employeeIdParam,
            @RequestParam("serviceId") UUID serviceId,
            @RequestParam("date") String date) {
        try {
            LocalDate localDate = LocalDate.parse(date)

            // Handle "any" employee case
            if (employeeIdParam == "any") {
                List<AvailableSlotResponse> slots = appointmentService.getAvailableSlotsForAnyEmployee(
                    shopId, serviceId, localDate
                )
                return ResponseEntity.ok(slots)
            } else {
                UUID employeeId = UUID.fromString(employeeIdParam)
                List<AvailableSlotResponse> slots = appointmentService.getAvailableSlots(
                    shopId, employeeId, serviceId, localDate
                )
                return ResponseEntity.ok(slots)
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve available slots",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Lock a time slot temporarily
     */
    @PostMapping("/lock-slot")
    ResponseEntity<?> lockSlot(
            @Valid @RequestBody SlotLockRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            UUID userId = userPrincipal?.getId() ?: UUID.randomUUID() // Generate temp ID for guests
            
            boolean locked = slotLockingService.lockSlot(
                request.shopId, request.serviceId, request.employeeId, 
                request.dateTime, userId
            )
            
            if (locked) {
                return ResponseEntity.ok([
                    message: "Slot locked successfully",
                    lockToken: userId.toString(),
                    expiresIn: slotLockingService.getLockDuration().toMinutes()
                ])
            } else {
                return ResponseEntity.badRequest().body([
                    error: "Slot lock failed",
                    message: "Slot is already locked by another user"
                ])
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Slot lock failed",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Unlock a time slot
     */
    @PostMapping("/unlock-slot")
    ResponseEntity<?> unlockSlot(
            @Valid @RequestBody SlotLockRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            UUID userId

            // Determine user ID from different sources
            if (userPrincipal?.getId()) {
                userId = userPrincipal.getId()
            } else if (request.lockToken) {
                // Use lockToken as userId for guest users
                userId = UUID.fromString(request.lockToken)
            } else if (request.userId) {
                userId = request.userId
            } else {
                return ResponseEntity.badRequest().body([
                    error: "Slot unlock failed",
                    message: "User identification required"
                ])
            }

            slotLockingService.unlockSlotIfOwnedByUser(
                request.shopId, request.serviceId, request.employeeId,
                request.dateTime, userId
            )

            return ResponseEntity.ok([
                message: "Slot unlocked successfully"
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Slot unlock failed",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Release slot lock when payment fails
     */
    @PostMapping("/release-payment-lock")
    ResponseEntity<?> releasePaymentLock(
            @Valid @RequestBody SlotLockRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            UUID userId

            // Determine user ID from different sources
            if (userPrincipal?.getId()) {
                userId = userPrincipal.getId()
            } else if (request.lockToken) {
                // Use lockToken as userId for guest users
                userId = UUID.fromString(request.lockToken)
            } else if (request.userId) {
                userId = request.userId
            } else {
                return ResponseEntity.badRequest().body([
                    error: "Payment lock release failed",
                    message: "User identification required"
                ])
            }

            // Release the specific slot lock
            slotLockingService.unlockSlotIfOwnedByUser(
                request.shopId, request.serviceId, request.employeeId,
                request.dateTime, userId
            )

            return ResponseEntity.ok([
                message: "Payment lock released successfully"
            ])
        } catch (Exception e) {
            log.error("Failed to release payment lock: ${e.getMessage()}", e)
            return ResponseEntity.badRequest().body([
                error: "Payment lock release failed",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Validate existing lock token for a slot
     */
    @PostMapping("/get-lock-token")
    ResponseEntity<?> getLockToken(
            @Valid @RequestBody SlotLockRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            UUID userId

            // Determine user ID for validation
            if (userPrincipal?.getId()) {
                // Authenticated user
                userId = userPrincipal.getId()
            } else if (request.lockToken) {
                // Guest user - use provided lockToken as userId
                try {
                    userId = UUID.fromString(request.lockToken)
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body([
                        error: "Lock token validation failed",
                        message: "Invalid lock token format"
                    ])
                }
            } else {
                return ResponseEntity.badRequest().body([
                    error: "Lock token validation failed",
                    message: "Lock token is required for validation"
                ])
            }

            String lockOwner = slotLockingService.getSlotLockOwner(
                request.shopId, request.serviceId, request.employeeId, request.dateTime
            )

            if (lockOwner && lockOwner == userId.toString()) {
                return ResponseEntity.ok([
                    message: "Lock token validated successfully",
                    lockToken: lockOwner,
                    expiresIn: slotLockingService.getLockDuration().toMinutes(),
                    valid: true
                ])
            } else if (lockOwner) {
                return ResponseEntity.badRequest().body([
                    error: "Lock token validation failed",
                    message: "Slot is locked by another user",
                    valid: false
                ])
            } else {
                return ResponseEntity.badRequest().body([
                    error: "Lock token validation failed",
                    message: "Slot is not locked or lock has expired",
                    valid: false
                ])
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Lock token validation failed",
                message: e.getMessage(),
                valid: false
            ])
        }
    }

    /**
     * Get user's appointments
     */
    @GetMapping("/my-appointments")
    @PreAuthorize("isAuthenticated()")
    ResponseEntity<?> getMyAppointments(
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal,
            Pageable pageable) {
        try {
            Page<AppointmentResponse> appointments = appointmentService.getUserAppointments(
                userPrincipal.getId(), pageable
            )

            return ResponseEntity.ok(appointments)
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve appointments",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Get guest appointments by email (for preview before registration)
     */
    @GetMapping("/guest")
    ResponseEntity<?> getGuestAppointments(@RequestParam("email") String email) {
        try {
            List<AppointmentResponse> appointments = appointmentService.getGuestAppointments(email)

            // Return full information for guest appointments
            return ResponseEntity.ok(appointments)
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve guest appointments",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Get shop appointments (for owners and employees)
     */
    @GetMapping("/shop/{shopId}")
    @PreAuthorize("hasAnyRole('OWNER', 'EMPLOYEE')")
    ResponseEntity<?> getShopAppointments(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal,
            Pageable pageable) {
        try {
            Page<AppointmentResponse> appointments = appointmentService.getShopAppointments(
                shopId, userPrincipal.getId(), pageable
            )

            return ResponseEntity.ok(appointments)
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve shop appointments",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Get employee appointments
     */
    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAnyRole('OWNER', 'EMPLOYEE')")
    ResponseEntity<?> getEmployeeAppointments(
            @PathVariable("employeeId") UUID employeeId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal,
            Pageable pageable) {
        try {
            Page<AppointmentResponse> appointments = appointmentService.getEmployeeAppointments(
                employeeId, userPrincipal.getId(), pageable
            )

            return ResponseEntity.ok(appointments)
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve employee appointments",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Update appointment status
     */
    @PutMapping("/{appointmentId}/status")
    @PreAuthorize("hasAnyRole('OWNER', 'EMPLOYEE')")
    ResponseEntity<?> updateAppointmentStatus(
            @PathVariable("appointmentId") UUID appointmentId,
            @RequestBody Map<String, String> requestBody,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            String status = requestBody.get("status")
            if (!status) {
                return ResponseEntity.badRequest().body([
                    error: "Status update failed",
                    message: "Status is required"
                ])
            }

            AppointmentResponse response = appointmentService.updateAppointmentStatus(
                appointmentId, status, userPrincipal.getId()
            )

            return ResponseEntity.ok([
                message: "Appointment status updated successfully",
                appointment: response
            ])
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Status update failed",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Status update failed",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Get appointments by status
     */
    @GetMapping("/by-status")
    ResponseEntity<?> getAppointmentsByStatus(
            @RequestParam("status") String status,
            Pageable pageable) {
        try {
            Page<AppointmentResponse> appointments = appointmentService.getAppointmentsByStatus(
                status, pageable
            )

            return ResponseEntity.ok(appointments)
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve appointments by status",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Process refund for an appointment
     */
    @PostMapping("/{appointmentId}/refund")
    @PreAuthorize("hasAnyRole('OWNER', 'EMPLOYEE')")
    ResponseEntity<?> processAppointmentRefund(
            @PathVariable("appointmentId") UUID appointmentId,
            @RequestBody Map<String, Object> requestBody,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            BigDecimal amount = requestBody.get("amount") as BigDecimal
            String reason = requestBody.get("reason") as String ?: "Refund requested by shop"

            if (!amount || amount <= 0) {
                return ResponseEntity.badRequest().body([
                    error: "Invalid refund amount",
                    message: "Refund amount must be greater than 0"
                ])
            }

            AppointmentResponse response = appointmentService.processAppointmentRefund(
                appointmentId, amount, reason, userPrincipal.getId()
            )

            return ResponseEntity.ok([
                message: "Refund processed successfully",
                appointment: response
            ])
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Refund processing failed",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Error processing refund for appointment ${appointmentId}", e)
            return ResponseEntity.status(500).body([
                error: "Internal server error",
                message: "Failed to process refund"
            ])
        }
    }

    /**
     * Send appointment reminder to customer
     */
    @PostMapping("/{appointmentId}/send-reminder")
    @PreAuthorize("hasAnyRole('OWNER', 'EMPLOYEE')")
    ResponseEntity<?> sendAppointmentReminder(
            @PathVariable("appointmentId") UUID appointmentId,
            @RequestBody(required = false) Map<String, String> requestBody,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            log.info("Sending appointment reminder for appointment ${appointmentId} by user ${userPrincipal.getId()}")
            String customMessage = requestBody?.get("message")
            appointmentService.sendAppointmentReminder(appointmentId, userPrincipal.getId(), customMessage)

            log.info("Appointment reminder sent successfully for appointment ${appointmentId}")
            return ResponseEntity.ok([
                message: "Appointment reminder sent successfully"
            ])
        } catch (IllegalArgumentException e) {
            log.error("Failed to send reminder for appointment ${appointmentId}: ${e.getMessage()}")
            return ResponseEntity.badRequest().body([
                error: "Failed to send reminder",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Unexpected error sending reminder for appointment ${appointmentId}: ${e.getMessage()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to send reminder",
                message: "An unexpected error occurred: ${e.getMessage()}"
            ])
        }
    }

    /**
     * Get a specific appointment by ID
     */
    @GetMapping("/{appointmentId}")
    @PreAuthorize("isAuthenticated()")
    ResponseEntity<?> getAppointment(
            @PathVariable("appointmentId") UUID appointmentId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            AppointmentResponse appointment = appointmentService.getAppointmentById(
                appointmentId, userPrincipal.getId()
            )

            return ResponseEntity.ok(appointment)
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body([
                error: "Access denied",
                message: e.getMessage()
            ])
        } catch (RuntimeException e) {
            if (e.getMessage()?.toLowerCase()?.contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body([
                    error: "Appointment not found",
                    message: "The requested appointment was not found"
                ])
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build()
        } catch (Exception e) {
            log.error("Failed to retrieve appointment: ${e.getMessage()}", e)
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body([
                error: "Failed to retrieve appointment",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Get employee unavailable dates for appointment scheduling
     */
    @GetMapping("/employee/{employeeId}/unavailable-dates")
    ResponseEntity<?> getEmployeeUnavailableDates(@PathVariable("employeeId") UUID employeeId) {
        try {
            // For now, return empty array since we don't have off-days system yet
            // In the future, this would return actual unavailable dates from a time-off system
            List<String> unavailableDates = appointmentService.getEmployeeUnavailableDates(employeeId)

            return ResponseEntity.ok([
                employeeId: employeeId,
                unavailableDates: unavailableDates
            ])
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to get unavailable dates",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Error getting employee unavailable dates", e)
            return ResponseEntity.status(500).body([
                error: "Internal server error",
                message: "Failed to get employee unavailable dates"
            ])
        }
    }
}
