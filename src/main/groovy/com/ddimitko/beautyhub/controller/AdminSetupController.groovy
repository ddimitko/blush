package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.enums.UserRole
import com.ddimitko.beautyhub.service.UserService
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/admin/setup")
@Slf4j
class AdminSetupController {

    @Autowired
    private UserService userService

    /**
     * Create initial admin user (only works if no admin users exist)
     * This is a temporary endpoint for initial setup
     */
    @PostMapping("/create-initial-admin")
    ResponseEntity<?> createInitialAdmin() {
        try {
            log.info("Initial admin user creation attempt")

            // Check if any admin users already exist
            List<User> existingAdmins = userService.findByRole(UserRole.ADMIN)
            if (!existingAdmins.isEmpty()) {
                return ResponseEntity.status(403).body([
                    error: "Admin user already exists",
                    message: "Initial admin creation is only allowed when no admin users exist",
                    existingAdmins: existingAdmins.size()
                ])
            }

            // Create admin user with your email (only you should have admin access)
            User adminUser = userService.createAdminUser(
                "ddimitko@gmail.com",  // Your email
                "AdminPassword123!",
                "Dimitar",
                "Dimitkov",
                "+359888123456"
            )

            log.info("Initial admin user created successfully: ${adminUser.email}")

            return ResponseEntity.ok([
                message: "Initial admin user created successfully",
                user: [
                    id: adminUser.id,
                    email: adminUser.email,
                    firstName: adminUser.firstName,
                    lastName: adminUser.lastName,
                    role: adminUser.role.name()
                ],
                instructions: [
                    "You can now login to the admin dashboard at /admin",
                    "Use the credentials: ddimitko@gmail.com / AdminPassword123!",
                    "Please change the password after first login"
                ]
            ])

        } catch (Exception e) {
            log.error("Initial admin user creation failed", e)
            return ResponseEntity.status(500).body([
                error: "Admin user creation failed",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Check admin setup status
     */
    @GetMapping("/status")
    ResponseEntity<?> getSetupStatus() {
        try {
            List<User> existingAdmins = userService.findByRole(UserRole.ADMIN)
            
            return ResponseEntity.ok([
                adminUsersExist: !existingAdmins.isEmpty(),
                adminUserCount: existingAdmins.size(),
                setupRequired: existingAdmins.isEmpty(),
                message: existingAdmins.isEmpty() ? 
                    "No admin users found. Use POST /api/admin/setup/create-initial-admin to create one." :
                    "Admin users already exist. Setup is complete."
            ])
        } catch (Exception e) {
            log.error("Failed to check admin setup status", e)
            return ResponseEntity.status(500).body([
                error: "Failed to check setup status",
                message: e.getMessage()
            ])
        }
    }
}
