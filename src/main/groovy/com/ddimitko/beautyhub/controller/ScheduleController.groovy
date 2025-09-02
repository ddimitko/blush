package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.dto.ScheduleSlotRequest
import com.ddimitko.beautyhub.dto.ScheduleSlotResponse
import com.ddimitko.beautyhub.entity.Employee
import com.ddimitko.beautyhub.entity.ScheduleSlot
import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.enums.DayOfWeek
import com.ddimitko.beautyhub.repository.EmployeeRepository
import com.ddimitko.beautyhub.repository.ScheduleSlotRepository
import com.ddimitko.beautyhub.repository.ShopRepository
import com.ddimitko.beautyhub.security.CustomUserPrincipal
import com.ddimitko.beautyhub.service.EmployeeService
import groovy.util.logging.Slf4j
import jakarta.validation.Valid
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.Pageable
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

import java.time.LocalTime

@Slf4j
@RestController
@RequestMapping("/api/schedules")
@CrossOrigin(origins = "*", maxAge = 3600)
class ScheduleController {

    @Autowired
    private ScheduleSlotRepository scheduleSlotRepository

    @Autowired
    private EmployeeRepository employeeRepository

    @Autowired
    private ShopRepository shopRepository

    @Autowired
    private EmployeeService employeeService

    /**
     * Get employee schedule
     */
    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAnyAuthority('ROLE_OWNER', 'ROLE_EMPLOYEE')")
    ResponseEntity<?> getEmployeeSchedule(
            @PathVariable("employeeId") UUID employeeId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            Employee employee = employeeRepository.findByIdWithUserAndShop(employeeId)
                    .orElseThrow { new RuntimeException("Employee not found") }

            // Verify access - owner of shop or the employee themselves
            boolean hasAccess = employee.shop.owner.id.equals(userPrincipal.getId()) ||
                               employee.user.id.equals(userPrincipal.getId())

            if (!hasAccess) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only view schedules for your own employees or your own schedule"
                ])
            }

            // For management purposes, include both active and inactive slots
            List<ScheduleSlot> scheduleSlots = scheduleSlotRepository.findByEmployee(employee)
            
            // Group by day of week
            Map<String, List<Map<String, Object>>> scheduleByDay = [:]
            DayOfWeek.values().each { day ->
                scheduleByDay[day.name()] = []
            }

            scheduleSlots.each { slot ->
                scheduleByDay[slot.dayOfWeek.name()].add([
                    id: slot.id,
                    dayOfWeek: slot.dayOfWeek.name(),
                    startTime: slot.startTime.toString(), // UTC time
                    endTime: slot.endTime.toString(), // UTC time
                    formattedTimeRange: slot.getFormattedTimeRange(), // UTC time formatted
                    active: slot.active, // Include active status
                    durationMinutes: slot.getDurationMinutes(),
                    active: slot.active
                ])
            }

            return ResponseEntity.ok([
                employeeId: employee.id,
                employeeName: employee.fullName,
                schedule: scheduleByDay
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve schedule",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Create or update employee schedule slots (Owner only)
     */
    @PostMapping("/employee/{employeeId}")
    @PreAuthorize("hasAuthority('ROLE_OWNER')")
    ResponseEntity<?> updateEmployeeSchedule(
            @PathVariable("employeeId") UUID employeeId,
            @Valid @RequestBody List<ScheduleSlotRequest> scheduleRequests,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            println("DEBUG: updateEmployeeSchedule called by user ${userPrincipal.getId()}")
            println("DEBUG: User authorities: ${userPrincipal.getAuthorities().collect { it.getAuthority() }}")

            Employee employee = employeeRepository.findByIdWithUserAndShop(employeeId)
                    .orElseThrow { new RuntimeException("Employee not found") }

            println("DEBUG: Employee shop owner: ${employee.shop.owner.id}")
            println("DEBUG: Current user: ${userPrincipal.getId()}")

            // Verify access - owner of shop only
            boolean hasAccess = employee.shop.owner.id.equals(userPrincipal.getId())

            if (!hasAccess) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only manage schedules for your own employees or your own schedule",
                    debug: [
                        userId: userPrincipal.getId(),
                        shopOwnerId: employee.shop.owner.id,
                        userAuthorities: userPrincipal.getAuthorities().collect { it.getAuthority() }
                    ]
                ])
            }

            // Get ALL existing schedule slots (both active and inactive) to preserve timestamps
            List<ScheduleSlot> allExistingSlots = scheduleSlotRepository.findByEmployee(employee)

            // Convert existing slots to a map for easy lookup
            Map<String, ScheduleSlot> existingSlotMap = [:]
            allExistingSlots.each { slot ->
                String slotKey = "${slot.dayOfWeek.name()}-${slot.startTime}-${slot.endTime}"
                existingSlotMap[slotKey] = slot
            }

            // Separate requests into updates and creates
            List<ScheduleSlotRequest> slotsToUpdate = []
            List<ScheduleSlotRequest> slotsToCreate = []

            scheduleRequests.each { request ->
                log.debug("Processing request: ID=${request.id}, dayOfWeek=${request.dayOfWeek}, startTime=${request.startTime}, endTime=${request.endTime}")
                if (request.id) {
                    // Has ID - this is an update to existing slot
                    log.debug("Adding to update list: ${request.id}")
                    slotsToUpdate.add(request)
                } else {
                    // No ID - this is a new slot
                    log.debug("Adding to create list: ${request.dayOfWeek} ${request.startTime}-${request.endTime}")
                    slotsToCreate.add(request)
                }
            }

            log.debug("Schedule update for ${employee.fullName}: ${slotsToUpdate.size()} to update, ${slotsToCreate.size()} to create")

            // Update existing slots
            List<ScheduleSlot> updatedSlots = []
            slotsToUpdate.each { request ->
                try {
                    ScheduleSlot slot = scheduleSlotRepository.findById(UUID.fromString(request.id))
                            .orElseThrow { new RuntimeException("Schedule slot not found: ${request.id}") }

                    // Verify the slot belongs to this employee
                    if (!slot.employee.id.equals(employee.id)) {
                        throw new RuntimeException("Schedule slot does not belong to this employee")
                    }

                    log.debug("Updating schedule slot for ${employee.fullName}: ${request.id} ${request.dayOfWeek} ${request.startTime}-${request.endTime} (UTC)")

                    // Update slot properties
                    slot.dayOfWeek = DayOfWeek.valueOf(request.dayOfWeek)
                    slot.startTime = LocalTime.parse(request.startTime)
                    slot.endTime = LocalTime.parse(request.endTime)
                    slot.active = true // Ensure it's active when updated

                    updatedSlots.add(scheduleSlotRepository.save(slot))
                } catch (Exception e) {
                    log.error("Failed to update schedule slot ${request.id}: ${e.getMessage()}")
                    throw new RuntimeException("Failed to update schedule slot: ${e.getMessage()}")
                }
            }

            // Create new schedule slots
            // Times are expected to be in UTC format from frontend
            List<ScheduleSlot> newSlots = []
            slotsToCreate.each { request ->
                log.debug("Creating schedule slot for ${employee.fullName}: ${request.dayOfWeek} ${request.startTime}-${request.endTime} (UTC)")

                ScheduleSlot slot = new ScheduleSlot()
                slot.employee = employee
                slot.dayOfWeek = DayOfWeek.valueOf(request.dayOfWeek)
                slot.startTime = LocalTime.parse(request.startTime) // UTC time from frontend
                slot.endTime = LocalTime.parse(request.endTime) // UTC time from frontend
                // active defaults to true from entity definition

                newSlots.add(scheduleSlotRepository.save(slot))
            }

            // Calculate final active slots count
            int currentActiveSlots = allExistingSlots.count { it.active }
            int finalActiveSlots = currentActiveSlots + newSlots.size()

            return ResponseEntity.ok([
                message: "Schedule updated successfully",
                employeeId: employee.id.toString(),
                employeeName: employee.fullName,
                slotsCreated: newSlots.size(),
                slotsUpdated: updatedSlots.size(),
                totalActiveSlots: finalActiveSlots
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to update schedule",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Soft delete a specific schedule slot (deactivate)
     */
    @DeleteMapping("/slot/{slotId}")
    @PreAuthorize("hasAnyAuthority('ROLE_OWNER', 'ROLE_EMPLOYEE')")
    ResponseEntity<?> deleteScheduleSlot(
            @PathVariable("slotId") UUID slotId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            ScheduleSlot slot = scheduleSlotRepository.findByIdWithEmployeeAndShop(slotId)
                    .orElseThrow { new RuntimeException("Schedule slot not found") }

            // Verify access
            boolean hasAccess = slot.employee.shop.owner.id.equals(userPrincipal.getId()) ||
                               slot.employee.user.id.equals(userPrincipal.getId())

            if (!hasAccess) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only delete your own schedule slots"
                ])
            }

            slot.active = false
            scheduleSlotRepository.save(slot)

            return ResponseEntity.ok([
                message: "Schedule slot deactivated successfully",
                slotId: slot.id.toString(),
                active: slot.active,
                updatedAt: slot.updatedAt.toString()
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to delete schedule slot",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Update a specific schedule slot
     */
    @PutMapping("/slot/{slotId}")
    @PreAuthorize("hasAnyAuthority('ROLE_OWNER', 'ROLE_EMPLOYEE')")
    ResponseEntity<?> updateScheduleSlot(
            @PathVariable("slotId") UUID slotId,
            @Valid @RequestBody ScheduleSlotRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            ScheduleSlot slot = scheduleSlotRepository.findByIdWithEmployeeAndShop(slotId)
                    .orElseThrow { new RuntimeException("Schedule slot not found") }

            // Verify access
            boolean hasAccess = slot.employee.shop.owner.id.equals(userPrincipal.getId()) ||
                               slot.employee.user.id.equals(userPrincipal.getId())

            if (!hasAccess) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only update your own schedule slots"
                ])
            }

            // Update slot properties
            slot.dayOfWeek = DayOfWeek.valueOf(request.dayOfWeek)
            slot.startTime = LocalTime.parse(request.startTime) // UTC time from frontend
            slot.endTime = LocalTime.parse(request.endTime) // UTC time from frontend

            scheduleSlotRepository.save(slot)

            return ResponseEntity.ok([
                message: "Schedule slot updated successfully",
                slotId: slot.id.toString(),
                dayOfWeek: slot.dayOfWeek.name(),
                startTime: slot.startTime.toString(),
                endTime: slot.endTime.toString(),
                updatedAt: slot.updatedAt.toString()
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to update schedule slot",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Hard delete a specific schedule slot (permanent removal)
     */
    @DeleteMapping("/slot/{slotId}/hard")
    @PreAuthorize("hasAnyAuthority('ROLE_OWNER', 'ROLE_EMPLOYEE')")
    ResponseEntity<?> hardDeleteScheduleSlot(
            @PathVariable("slotId") UUID slotId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            ScheduleSlot slot = scheduleSlotRepository.findByIdWithEmployeeAndShop(slotId)
                    .orElseThrow { new RuntimeException("Schedule slot not found") }

            // Verify access
            boolean hasAccess = slot.employee.shop.owner.id.equals(userPrincipal.getId()) ||
                               slot.employee.user.id.equals(userPrincipal.getId())

            if (!hasAccess) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only delete your own schedule slots"
                ])
            }

            // Check if slot has any future appointments
            // TODO: Add validation to prevent deletion of slots with future appointments

            scheduleSlotRepository.delete(slot)

            return ResponseEntity.ok([
                message: "Schedule slot permanently deleted"
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to permanently delete schedule slot",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Toggle schedule slot active status (Owner only)
     */
    @PutMapping("/slot/{slotId}/toggle")
    @PreAuthorize("hasAuthority('ROLE_OWNER')")
    ResponseEntity<?> toggleScheduleSlot(
            @PathVariable("slotId") UUID slotId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            ScheduleSlot slot = scheduleSlotRepository.findByIdWithEmployeeAndShop(slotId)
                    .orElseThrow { new RuntimeException("Schedule slot not found") }

            // Verify ownership (owner only)
            if (!slot.employee.shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only modify schedule slots for your own employees"
                ])
            }

            // Toggle active status
            slot.active = !slot.active
            scheduleSlotRepository.save(slot)

            log.debug("Toggled schedule slot for ${slot.employee.fullName}: ${slot.dayOfWeek.name()} ${slot.startTime}-${slot.endTime} to ${slot.active ? 'active' : 'inactive'}")

            return ResponseEntity.ok([
                message: "Schedule slot ${slot.active ? 'activated' : 'deactivated'} successfully".toString(),
                slotId: slot.id.toString(),
                active: slot.active,
                updatedAt: slot.updatedAt.toString(),
                employeeName: slot.employee.fullName,
                dayOfWeek: slot.dayOfWeek.name(),
                timeRange: slot.getFormattedTimeRange()
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to toggle schedule slot",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Get employee schedule for public appointment booking (no authentication required)
     */
    @GetMapping("/public/employee/{employeeId}")
    ResponseEntity<?> getPublicEmployeeSchedule(@PathVariable("employeeId") UUID employeeId) {
        try {
            Employee employee = employeeRepository.findByIdWithUserAndShop(employeeId)
                    .orElseThrow { new RuntimeException("Employee not found") }

            List<ScheduleSlot> scheduleSlots = scheduleSlotRepository.findByEmployeeAndActiveTrue(employee)

            // Return simplified schedule data for public use
            // Times are returned in UTC format
            List<Map<String, Object>> publicSchedule = scheduleSlots.collect { slot ->
                [
                    dayOfWeek: slot.dayOfWeek.name(),
                    startTime: slot.startTime.toString(), // UTC time
                    endTime: slot.endTime.toString(), // UTC time
                    active: slot.active
                ]
            }

            return ResponseEntity.ok([
                employeeId: employee.id,
                schedule: publicSchedule
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve employee schedule",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Get my schedule (for employees)
     */
    @GetMapping("/my-schedule")
    @PreAuthorize("hasAuthority('ROLE_EMPLOYEE')")
    ResponseEntity<?> getMySchedule(@AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            List<Employee> employeeProfiles = employeeService.getEmployeesByUser(userPrincipal.getId())

            List<Map<String, Object>> schedules = []
            employeeProfiles.each { employee ->
                List<ScheduleSlot> scheduleSlots = scheduleSlotRepository.findByEmployeeAndActiveTrue(employee)

                Map<String, List<Map<String, Object>>> scheduleByDay = [:]
                DayOfWeek.values().each { day ->
                    scheduleByDay[day.name()] = []
                }

                scheduleSlots.each { slot ->
                    scheduleByDay[slot.dayOfWeek.name()].add([
                        id: slot.id,
                        dayOfWeek: slot.dayOfWeek.name(),
                        startTime: slot.startTime.toString(), // UTC time
                        endTime: slot.endTime.toString(), // UTC time
                        formattedTimeRange: slot.getFormattedTimeRange(), // UTC time formatted
                        durationMinutes: slot.getDurationMinutes(),
                        active: slot.active
                    ])
                }

                schedules.add([
                    employeeId: employee.id,
                    shopId: employee.shop.id,
                    shopName: employee.shop.name,
                    schedule: scheduleByDay
                ])
            }

            return ResponseEntity.ok(schedules)
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve your schedule",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Get all employee schedules for a shop (Owner only)
     */
    @GetMapping("/shop/{shopId}")
    @PreAuthorize("hasAuthority('ROLE_OWNER')")
    ResponseEntity<?> getShopSchedules(
            @PathVariable("shopId") UUID shopId,
            @RequestParam(name = "employeeId", required = false) UUID employeeId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify shop ownership
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found") }

            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only view schedules for your own shop"
                ])
            }

            // Get employees for the shop
            List<Employee> employees
            if (employeeId) {
                // Filter by specific employee
                Employee employee = employeeRepository.findByIdWithUserAndShop(employeeId)
                        .orElseThrow { new RuntimeException("Employee not found") }

                if (!employee.shop.id.equals(shopId)) {
                    return ResponseEntity.status(400).body([
                        error: "Invalid employee",
                        message: "Employee does not belong to this shop"
                    ])
                }
                employees = [employee]
            } else {
                // Get all active employees for the shop
                employees = employeeService.getActiveEmployeesByShop(shopId)
            }

            List<Map<String, Object>> schedules = []
            employees.each { employee ->
                // Get ALL schedule slots (both active and inactive) for management purposes
                List<ScheduleSlot> scheduleSlots = scheduleSlotRepository.findByEmployee(employee)

                Map<String, List<Map<String, Object>>> scheduleByDay = [:]
                DayOfWeek.values().each { day ->
                    scheduleByDay[day.name()] = []
                }

                scheduleSlots.each { slot ->
                    scheduleByDay[slot.dayOfWeek.name()].add([
                        id: slot.id,
                        dayOfWeek: slot.dayOfWeek.name(),
                        startTime: slot.startTime.toString(), // UTC time
                        endTime: slot.endTime.toString(), // UTC time
                        formattedTimeRange: slot.getFormattedTimeRange(), // UTC time formatted
                        durationMinutes: slot.getDurationMinutes(),
                        active: slot.active
                    ])
                }

                schedules.add([
                    employeeId: employee.id,
                    employeeName: employee.fullName,
                    employeeEmail: employee.user.email,
                    schedule: scheduleByDay
                ])
            }

            return ResponseEntity.ok([
                shopId: shopId,
                shopName: shop.name,
                schedules: schedules
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve shop schedules",
                message: e.getMessage()
            ])
        }
    }
}
