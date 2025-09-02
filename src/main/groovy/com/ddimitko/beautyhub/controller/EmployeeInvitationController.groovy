package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.dto.EmployeeInvitationAcceptRequest
import com.ddimitko.beautyhub.entity.Employee
import com.ddimitko.beautyhub.entity.EmployeeInvitation
import com.ddimitko.beautyhub.security.CustomUserPrincipal
import com.ddimitko.beautyhub.service.EmployeeService
import jakarta.validation.Valid
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/employee-invitations")
class EmployeeInvitationController {

    @Autowired
    private EmployeeService employeeService

    /**
     * Get invitation details by token (for invitation acceptance page)
     */
    @GetMapping("/{token}")
    ResponseEntity<?> getInvitationDetails(@PathVariable("token") String token) {
        try {
            EmployeeInvitation invitation = employeeService.getInvitationByToken(token)
            
            if (!invitation.isValid()) {
                return ResponseEntity.badRequest().body([
                    error: "Invitation expired",
                    message: "This invitation has expired or is no longer valid"
                ])
            }
            
            return ResponseEntity.ok([
                email: invitation.email,
                shopName: invitation.shop.name,
                shopOwnerName: (invitation.invitedBy.firstName + " " + invitation.invitedBy.lastName).toString(),
                expiresAt: invitation.expiresAt,
                bio: invitation.bio,
                specialties: invitation.specialties,
                yearsExperience: invitation.yearsExperience,
                hourlyRate: invitation.hourlyRate,
                commissionRate: invitation.commissionRate
            ])
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Invalid invitation",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to get invitation details",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Accept employee invitation for new users (requires account setup)
     */
    @PostMapping("/{token}/accept")
    ResponseEntity<?> acceptInvitation(
            @PathVariable("token") String token,
            @Valid @RequestBody EmployeeInvitationAcceptRequest request) {
        try {
            Employee employee = employeeService.acceptInvitation(
                token,
                request.firstName,
                request.lastName,
                request.password,
                request.phone
            )

            return ResponseEntity.ok([
                message: "Invitation accepted successfully",
                employeeId: employee.id,
                employeeName: employee.fullName,
                shopName: employee.shop.name,
                redirectUrl: "/dashboard"
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

    /**
     * Accept employee invitation for existing users (no account setup needed)
     */
    @PostMapping("/{token}/accept-existing")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> acceptInvitationExistingUser(
            @PathVariable("token") String token,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            Employee employee = employeeService.acceptInvitationForExistingUser(token, userPrincipal.getId())

            // Get updated user with new role
            def updatedUser = employee.user

            return ResponseEntity.ok([
                message: "Invitation accepted successfully",
                employeeId: employee.id,
                employeeName: employee.fullName,
                shopName: employee.shop.name,
                redirectUrl: "/dashboard",
                user: [
                    id: updatedUser.id,
                    email: updatedUser.email,
                    firstName: updatedUser.firstName,
                    lastName: updatedUser.lastName,
                    role: updatedUser.role.toString(),
                    avatar: updatedUser.avatar,
                    phone: updatedUser.phone
                ]
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
}
