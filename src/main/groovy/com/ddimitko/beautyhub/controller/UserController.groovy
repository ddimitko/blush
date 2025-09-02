package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.dto.UserProfileUpdateRequest
import com.ddimitko.beautyhub.dto.ChangePasswordRequest
import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.security.CustomUserPrincipal
import com.ddimitko.beautyhub.service.UserService
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile

import jakarta.validation.Valid
import java.awt.Image
import java.awt.image.BufferedImage
import javax.imageio.ImageIO

@RestController
@RequestMapping("/api/user")
@CrossOrigin(origins = "*", maxAge = 3600)
@Slf4j
class UserController {

    @Autowired
    private UserService userService

    @GetMapping("/debug-auth")
    ResponseEntity<?> debugAuth(@AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            if (userPrincipal == null) {
                return ResponseEntity.ok([
                    authenticated: false,
                    message: "No user principal found"
                ])
            }

            User user = userService.findById(userPrincipal.getId())

            return ResponseEntity.ok([
                authenticated: true,
                userId: userPrincipal.getId(),
                email: userPrincipal.getEmail(),
                authorities: userPrincipal.getAuthorities().collect { it.getAuthority() },
                databaseRole: user.role.name(),
                message: "Debug info for authentication troubleshooting"
            ])
        } catch (Exception e) {
            return ResponseEntity.ok([
                authenticated: false,
                error: e.getMessage(),
                message: "Error getting debug info"
            ])
        }
    }

    @GetMapping("/profile")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> getUserProfile(@AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            User user = userService.findById(userPrincipal.getId())

            // Create secure response DTO without sensitive data
            def userProfile = [
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
                avatar: user.avatar,
                role: user.role.name(),
                emailVerified: user.emailVerified,
                onboardingCompleted: user.onboardingCompleted,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
                // Explicitly exclude: password, internal IDs, payment details
            ]

            return ResponseEntity.ok(userProfile)
        } catch (Exception e) {
            log.error("Failed to retrieve user profile for user: ${userPrincipal.getId()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve user profile",
                message: "An error occurred while retrieving your profile"
            ])
        }
    }

    @PutMapping("/profile")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> updateUserProfile(
            @Valid @RequestBody UserProfileUpdateRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            User updatedUser = new User()
            updatedUser.firstName = request.firstName
            updatedUser.lastName = request.lastName
            updatedUser.phone = request.phone
            updatedUser.avatar = request.avatar

            User user = userService.updateUser(userPrincipal.getId(), updatedUser)
            
            return ResponseEntity.ok([
                message: "Profile updated successfully",
                user: [
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    phone: user.phone,
                    avatar: user.avatar,
                    role: user.role.name(),
                    emailVerified: user.emailVerified,
                    onboardingCompleted: user.onboardingCompleted,
                    updatedAt: user.updatedAt
                ]
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Profile update failed",
                message: e.getMessage()
            ])
        }
    }

    @PutMapping("/change-password")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            userService.changePassword(
                userPrincipal.getId(),
                request.currentPassword,
                request.newPassword
            )

            return ResponseEntity.ok([
                message: "Password changed successfully"
            ])
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Password change failed",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Password change failed",
                message: "An unexpected error occurred"
            ])
        }
    }

    @PostMapping("/avatar")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            log.debug("Avatar upload request: file=${file?.originalFilename}, size=${file?.size}, user=${userPrincipal?.email}")

            // Validate file
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body([
                    error: "No file provided"
                ])
            }

            // Validate file type
            String contentType = file.getContentType()
            if (!contentType?.startsWith("image/")) {
                return ResponseEntity.badRequest().body([
                    error: "Only image files are allowed"
                ])
            }

            // Validate file size (max 2MB for avatars)
            if (file.getSize() > 2 * 1024 * 1024) {
                return ResponseEntity.badRequest().body([
                    error: "File size must be less than 2MB"
                ])
            }

            // Enhanced file extension validation
            String originalFilename = file.getOriginalFilename()
            if (!originalFilename || originalFilename.trim().isEmpty()) {
                return ResponseEntity.badRequest().body([
                    error: "Invalid filename"
                ])
            }

            // Sanitize filename and validate extension
            String sanitizedFilename = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "")
            String extension = ""
            if (sanitizedFilename.contains('.')) {
                extension = sanitizedFilename.substring(sanitizedFilename.lastIndexOf('.')).toLowerCase()
            }

            // Only allow specific image extensions
            List<String> allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
            if (!allowedExtensions.contains(extension)) {
                return ResponseEntity.badRequest().body([
                    error: "Only JPG, JPEG, PNG, GIF, and WebP files are allowed"
                ])
            }

            // Generate secure filename using user ID (prevents cross-user access)
            String filename = "${userPrincipal.getId()}${extension}"

            // Get the absolute path to the project root uploads directory with avatars folder
            String projectRoot = System.getProperty("user.dir")
            File uploadsDir = new File(projectRoot, "uploads")
            File avatarsDir = new File(uploadsDir, "avatars")

            // Additional security: Ensure we're within the expected directory structure
            if (!avatarsDir.getCanonicalPath().startsWith(uploadsDir.getCanonicalPath())) {
                return ResponseEntity.badRequest().body([
                    error: "Invalid upload path"
                ])
            }

            log.debug("Avatar upload paths - root: ${projectRoot}, avatars dir: ${avatarsDir.absolutePath}, filename: ${filename}")

            // Create avatars directory if it doesn't exist
            if (!avatarsDir.exists()) {
                boolean created = avatarsDir.mkdirs()
                log.debug("Created avatars directory: ${created}")
            }

            // Delete existing avatar if it exists
            File[] existingFiles = avatarsDir.listFiles { dir, name ->
                name.startsWith(userPrincipal.getId().toString())
            }
            existingFiles?.each { it.delete() }

            // Process and save optimized image
            File destinationFile = new File(avatarsDir, filename)
            log.debug("Saving avatar to: ${destinationFile.absolutePath}")

            try {
                // Read the original image
                BufferedImage originalImage = ImageIO.read(file.getInputStream())

                // Optimize image while maintaining aspect ratio and quality
                BufferedImage optimizedImage = optimizeImageForAvatar(originalImage)

                // Save optimized image
                String formatName = extension.substring(1) // Remove the dot
                if (formatName.equals("jpg")) formatName = "jpeg"

                ImageIO.write(optimizedImage, formatName, destinationFile)
                log.debug("Optimized avatar image saved successfully")
            } catch (Exception e) {
                log.warn("Image optimization failed, saving original: ${e.getMessage()}")
                // Fallback to original file if optimization fails
                file.transferTo(destinationFile)
            }

            // Generate URL
            String avatarUrl = "/uploads/avatars/${filename}"

            // Update user avatar
            User updatedUser = new User()
            updatedUser.avatar = avatarUrl
            User user = userService.updateUser(userPrincipal.getId(), updatedUser)

            return ResponseEntity.ok([
                message: "Avatar uploaded successfully",
                avatarUrl: avatarUrl,
                user: [
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    phone: user.phone,
                    avatar: user.avatar,
                    role: user.role.name(),
                    emailVerified: user.emailVerified,
                    onboardingCompleted: user.onboardingCompleted,
                    updatedAt: user.updatedAt
                ]
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Avatar upload failed",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Optimize image for avatar use while maintaining aspect ratio and quality
     * @param originalImage The original BufferedImage
     * @return Optimized BufferedImage
     */
    private BufferedImage optimizeImageForAvatar(BufferedImage originalImage) {
        int originalWidth = originalImage.getWidth()
        int originalHeight = originalImage.getHeight()

        // Target size for avatars (max 512x512 for good quality without being too large)
        int maxSize = 512

        // Calculate new dimensions while maintaining aspect ratio
        int newWidth, newHeight
        if (originalWidth > originalHeight) {
            newWidth = Math.min(originalWidth, maxSize)
            newHeight = (int) ((double) originalHeight * newWidth / originalWidth)
        } else {
            newHeight = Math.min(originalHeight, maxSize)
            newWidth = (int) ((double) originalWidth * newHeight / originalHeight)
        }

        // Only resize if the image is larger than target
        if (originalWidth <= maxSize && originalHeight <= maxSize) {
            return originalImage
        }

        // Create optimized image with high quality scaling
        BufferedImage optimizedImage = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB)

        // Use high-quality scaling
        Image scaledImage = originalImage.getScaledInstance(newWidth, newHeight, Image.SCALE_SMOOTH)

        // Draw the scaled image
        optimizedImage.getGraphics().drawImage(scaledImage, 0, 0, null)
        optimizedImage.getGraphics().dispose()

        return optimizedImage
    }

    @GetMapping("/onboarding-status")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> getOnboardingStatus(@AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            User user = userService.findById(userPrincipal.getId())

            return ResponseEntity.ok([
                onboardingCompleted: user.onboardingCompleted
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve onboarding status",
                message: e.getMessage()
            ])
        }
    }

    @PutMapping("/complete-onboarding")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> completeOnboarding(@AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            User user = userService.findById(userPrincipal.getId())
            user.onboardingCompleted = true
            userService.save(user)

            return ResponseEntity.ok([
                message: "Onboarding completed successfully",
                onboardingCompleted: true
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to complete onboarding",
                message: e.getMessage()
            ])
        }
    }

    @PutMapping("/reset-onboarding")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> resetOnboarding(@AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            User user = userService.findById(userPrincipal.getId())
            user.onboardingCompleted = false
            userService.save(user)

            return ResponseEntity.ok([
                message: "Onboarding reset successfully",
                onboardingCompleted: false
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to reset onboarding",
                message: e.getMessage()
            ])
        }
    }

    @GetMapping("/check-email")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> checkEmailExists(@RequestParam("email") String email) {
        try {
            // Normalize email to lowercase for case-insensitive lookup
            String normalizedEmail = email?.toLowerCase()?.trim()
            User user = userService.findByEmail(normalizedEmail)
            boolean exists = user != null

            return ResponseEntity.ok([
                exists: exists,
                firstName: exists ? user.firstName : null,
                lastName: exists ? user.lastName : null
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to check email",
                message: e.getMessage()
            ])
        }
    }
}
