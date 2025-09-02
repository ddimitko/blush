package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.dto.EmployeeCreationRequest
import com.ddimitko.beautyhub.dto.EmployeeCreationWithUserRequest
import com.ddimitko.beautyhub.dto.EmployeeInvitationRequest
import com.ddimitko.beautyhub.entity.Employee
import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.security.CustomUserPrincipal
import com.ddimitko.beautyhub.repository.EmployeeRepository
import com.ddimitko.beautyhub.service.EmployeeService
import com.ddimitko.beautyhub.service.ShopService
import groovy.util.logging.Slf4j
import jakarta.validation.Valid
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/employees")
@CrossOrigin(origins = "*", maxAge = 3600)
@Slf4j
class EmployeeController {

    @Autowired
    private EmployeeService employeeService

    @Autowired
    private ShopService shopService

    @Autowired
    private EmployeeRepository employeeRepository

    @PostMapping("/shops/{shopId}/invite")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> inviteEmployee(
            @PathVariable("shopId") UUID shopId,
            @Valid @RequestBody EmployeeInvitationRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only manage employees for your own shops"
                ])
            }

            Employee employee = employeeService.inviteUserAsEmployee(shopId, request.email, request, userPrincipal.getId())

            // Check if this is a placeholder (invitation sent) or real employee (existing user)
            String message = employee.active ?
                "Employee added successfully" :
                "Invitation sent successfully"

            return ResponseEntity.ok([
                message: message,
                employeeId: employee.id,
                employeeName: employee.fullName ?: "Pending",
                email: employee.email,
                isInvitation: !employee.active
            ])
        } catch (IllegalArgumentException e) {
            log.error("Employee invitation failed with IllegalArgumentException: ${e.message}", e)
            return ResponseEntity.badRequest().body([
                error: "Employee invitation failed",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Employee invitation failed with unexpected error: ${e.message}", e)
            return ResponseEntity.badRequest().body([
                error: "Employee invitation failed",
                message: "An unexpected error occurred: ${e.message}"
            ])
        }
    }

    @PostMapping("/shops/{shopId}/create")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> createEmployee(
            @PathVariable("shopId") UUID shopId,
            @Valid @RequestBody EmployeeCreationWithUserRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only create employees for your own shops"
                ])
            }

            Employee employee = employeeService.createEmployeeWithNewUser(shopId, request)
            return ResponseEntity.ok([
                message: "Employee created successfully",
                employeeId: employee.id,
                employeeName: employee.fullName,
                email: employee.email
            ])
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Employee creation failed",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Employee creation failed",
                message: "An unexpected error occurred"
            ])
        }
    }

    @GetMapping("/shops/{shopId}")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getShopEmployees(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body([
                    error: "Access denied",
                    message: "You can only view employees for your own shops"
                ])
            }

            List<Employee> employees = employeeService.getEmployeesAndInvitationsByShop(shopId)
            return ResponseEntity.ok(employees.collect { employee ->
                [
                    id: employee.id,
                    name: employee.fullName,
                    email: employee.email,
                    phone: employee.phone,
                    bio: employee.bio,
                    specialties: employee.specialties,
                    yearsExperience: employee.yearsExperience,
                    hourlyRate: employee.hourlyRate,
                    commissionRate: employee.commissionRate,
                    hireDate: employee.hireDate,
                    active: employee.active,
                    invitationStatus: employee.invitationStatus,
                    invitationId: employee.invitationId, // Include invitation ID for cancellation
                    avatar: employee.user?.avatar
                ]
            })
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build()
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve employees",
                message: "An unexpected error occurred"
            ])
        }
    }

    @PutMapping("/{employeeId}")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> updateEmployee(
            @PathVariable("employeeId") UUID employeeId,
            @Valid @RequestBody EmployeeCreationRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            Employee employee = employeeService.updateEmployee(employeeId, request)
            
            // Verify that the user owns the shop where this employee works
            if (!employee.shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only update employees for your own shops"
                ])
            }

            return ResponseEntity.ok([
                message: "Employee updated successfully",
                employeeId: employee.id,
                employeeName: employee.fullName
            ])
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build()
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Employee update failed",
                message: e.getMessage()
            ])
        }
    }

    @DeleteMapping("/{employeeId}")
    @PreAuthorize("hasAuthority('ROLE_OWNER')")
    ResponseEntity<?> terminateEmployee(
            @PathVariable("employeeId") UUID employeeId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Get the employee to check ownership
            Employee employee = employeeRepository.findByIdWithUser(employeeId)
                    .orElseThrow { new RuntimeException("Employee not found") }

            if (!employee.shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only terminate employees for your own shops"
                ])
            }

            String employeeName = employee.fullName
            String employeeEmail = employee.email

            employeeService.terminateEmployee(employeeId)

            return ResponseEntity.ok([
                message: "Employee terminated successfully",
                employeeName: employeeName,
                employeeEmail: employeeEmail,
                note: "Employee access has been revoked and their role has been adjusted accordingly"
            ])
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build()
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Employee termination failed",
                message: e.getMessage()
            ])
        }
    }

    @GetMapping("/my-profiles")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'OWNER')")
    ResponseEntity<?> getMyEmployeeProfiles(@AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            List<Employee> employees = employeeService.getEmployeesByUser(userPrincipal.getId())
            if (employees.isEmpty()) {
                return ResponseEntity.notFound().body([
                    error: "Employee profiles not found",
                    message: "You don't have any employee profiles"
                ])
            }

            return ResponseEntity.ok(employees.collect { employee ->
                [
                    id: employee.id,
                    shopId: employee.shop.id,
                    shopName: employee.shop.name,
                    bio: employee.bio,
                    specialties: employee.specialties,
                    yearsExperience: employee.yearsExperience,
                    hourlyRate: employee.hourlyRate,
                    commissionRate: employee.commissionRate,
                    hireDate: employee.hireDate,
                    active: employee.active,
                    avatar: employee.user?.avatar
                ]
            })
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve employee profiles",
                message: "An unexpected error occurred"
            ])
        }
    }

    @GetMapping("/my-shops")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'OWNER')")
    ResponseEntity<?> getMyEmployeeShops(@AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Only return active employee profiles
            List<Employee> employees = employeeService.getActiveEmployeeProfilesByUser(userPrincipal.getId())
            return ResponseEntity.ok(employees.collect { employee ->
                [
                    id: employee.shop.id,
                    employeeId: employee.id,
                    name: employee.shop.name,
                    description: employee.shop.description,
                    address: employee.shop.getFullAddress(),
                    country: employee.shop.country,
                    phone: employee.shop.phone,
                    email: employee.shop.email,
                    bio: employee.bio,
                    specialties: employee.specialties,
                    yearsExperience: employee.yearsExperience
                ]
            })
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve employee shops",
                message: "An unexpected error occurred"
            ])
        }
    }

    @GetMapping("/access-check")
    @PreAuthorize("hasAnyAuthority('ROLE_EMPLOYEE', 'ROLE_OWNER')")
    ResponseEntity<?> checkEmployeeAccess(@AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            boolean hasAccess = employeeService.canAccessEmployeeFeatures(userPrincipal.getId())
            List<Employee> activeProfiles = employeeService.getActiveEmployeeProfilesByUser(userPrincipal.getId())

            return ResponseEntity.ok([
                hasAccess: hasAccess,
                activeProfilesCount: activeProfiles.size(),
                message: hasAccess ? "Employee access granted" : "No active employee profiles found"
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to check employee access",
                message: "An unexpected error occurred"
            ])
        }
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'OWNER')")
    ResponseEntity<?> getEmployeeByUserId(
            @PathVariable("userId") UUID userId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Only allow users to get their own employee data
            if (!userId.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only access your own employee data"
                ])
            }

            List<Employee> employees = employeeService.getActiveEmployeeProfilesByUser(userId)
            if (employees.isEmpty()) {
                return ResponseEntity.notFound().body([
                    error: "Employee profile not found",
                    message: "No active employee profile found for this user"
                ])
            }

            // Return the first active employee profile (most users will have only one)
            Employee employee = employees.first()

            return ResponseEntity.ok([
                id: employee.id,
                fullName: employee.fullName,
                email: employee.email,
                phone: employee.phone,
                bio: employee.bio,
                specialties: employee.specialties,
                yearsExperience: employee.yearsExperience,
                hourlyRate: employee.hourlyRate,
                commissionRate: employee.commissionRate,
                hireDate: employee.hireDate,
                active: employee.active,
                annualLeaveDays: employee.annualLeaveDays ?: 25,
                usedLeaveDays: employeeService.calculateUsedLeaveDays(employee.id),
                leaveYearStart: employee.leaveYearStart?.toString(),
                leaveYearEnd: employee.getCurrentLeaveYearEnd()?.toString(),
                remainingLeaveDays: employee.getRemainingLeaveDays(),
                shop: [
                    id: employee.shop.id,
                    name: employee.shop.name,
                    country: employee.shop.country
                ]
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve employee data",
                message: "An unexpected error occurred"
            ])
        }
    }

    @PostMapping("/{employeeId}/recalculate-leave")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'OWNER')")
    ResponseEntity<?> recalculateUsedLeaveDays(
            @PathVariable("employeeId") UUID employeeId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Check if user can access this employee's data
            if (!employeeService.canUserAccessEmployee(userPrincipal.getId(), employeeId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body([error: "Access denied"])
            }

            employeeService.recalculateUsedLeaveDays(employeeId)

            return ResponseEntity.ok([message: "Used leave days recalculated successfully"])
        } catch (Exception e) {
            log.error("Error recalculating used leave days: ${e.message}", e)
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body([error: "Failed to recalculate used leave days"])
        }
    }



    @PostMapping("/invitations/{shopId}/accept")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> acceptInvitationThroughApp(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Check if user already has an employee profile at this shop
            if (employeeService.isEmployeeAtShop(userPrincipal.getId(), shopId)) {
                return ResponseEntity.badRequest().body([
                    error: "Already an employee",
                    message: "You are already an employee at this shop"
                ])
            }

            // Create employee profile for the authenticated user
            EmployeeCreationRequest employeeRequest = new EmployeeCreationRequest()
            // Set default values - user can update these later
            employeeRequest.bio = ""
            employeeRequest.specialties = ""
            employeeRequest.yearsExperience = 0
            employeeRequest.hourlyRate = BigDecimal.ZERO
            employeeRequest.commissionRate = BigDecimal.ZERO

            Employee employee = employeeService.createEmployee(shopId, userPrincipal.getId(), employeeRequest)

            return ResponseEntity.ok([
                message: "Invitation accepted successfully",
                employeeId: employee.id,
                employeeName: employee.fullName,
                shopName: employee.shop.name
            ])
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to accept invitation",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to accept invitation",
                message: "An unexpected error occurred"
            ])
        }
    }

    @PostMapping("/shops/{shopId}/assign-owner")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> assignOwnerAsEmployee(
            @PathVariable("shopId") UUID shopId,
            @Valid @RequestBody EmployeeCreationRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only assign yourself as an employee at your own shops"
                ])
            }

            // Check if owner is already an employee at this shop
            if (employeeService.isEmployeeAtShop(userPrincipal.getId(), shopId)) {
                return ResponseEntity.badRequest().body([
                    error: "Already an employee",
                    message: "You are already an employee at this shop"
                ])
            }

            Employee employee = employeeService.assignOwnerAsEmployee(shopId, userPrincipal.getId(), request)

            return ResponseEntity.ok([
                message: "Successfully assigned yourself as an employee",
                employeeId: employee.id,
                employeeName: employee.fullName,
                shopName: employee.shop.name
            ])
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Owner assignment failed",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Unexpected error during owner assignment: ${e.message}", e)
            return ResponseEntity.status(500).body([
                error: "Owner assignment failed",
                message: "An unexpected error occurred"
            ])
        }
    }

    @DeleteMapping("/invitations/{invitationId}")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> cancelInvitation(
            @PathVariable("invitationId") UUID invitationId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            employeeService.cancelInvitation(invitationId, userPrincipal.getId())

            return ResponseEntity.ok([
                message: "Invitation cancelled successfully"
            ])
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to cancel invitation",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Failed to cancel invitation: ${e.message}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to cancel invitation",
                message: "An unexpected error occurred"
            ])
        }
    }
}
