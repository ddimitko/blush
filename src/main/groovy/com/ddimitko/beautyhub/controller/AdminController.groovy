package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.service.ImageCleanupService
import com.ddimitko.beautyhub.service.StripeDataMigrationService
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/admin")
class AdminController {

    @Autowired
    ImageCleanupService imageCleanupService

    @Autowired
    StripeDataMigrationService stripeDataMigrationService

    /**
     * Clean up orphaned image references in the database
     * Removes references to files that don't exist on disk
     */
    @PostMapping("/cleanup-images")
    @PreAuthorize("hasRole('ADMIN') or hasRole('OWNER')")  // Allow owners to clean their own data
    ResponseEntity<Map<String, String>> cleanupImages() {
        try {
            imageCleanupService.cleanupOrphanedImageReferences()
            return ResponseEntity.ok([
                status: "success",
                message: "Image cleanup completed successfully"
            ])
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body([
                status: "error", 
                message: "Image cleanup failed: ${e.message}"
            ])
        }
    }

    /**
     * Find unreferenced files on disk
     */
    @GetMapping("/unreferenced-files")
    @PreAuthorize("hasRole('ADMIN')")
    ResponseEntity<Map<String, String>> findUnreferencedFiles() {
        try {
            imageCleanupService.findUnreferencedFiles()
            return ResponseEntity.ok([
                status: "success",
                message: "Unreferenced files check completed - see server logs"
            ])
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body([
                status: "error",
                message: "Unreferenced files check failed: ${e.message}"
            ])
        }
    }

    /**
     * Migrate Stripe data from Shop entities to ShopStripeDetails
     */
    @PostMapping("/migrate-stripe-data")
    @PreAuthorize("hasRole('ADMIN')")
    ResponseEntity<Map<String, Object>> migrateStripeData() {
        try {
            stripeDataMigrationService.migrateStripeDataToSeparateEntity()
            return ResponseEntity.ok([
                status: "success",
                message: "Stripe data migration completed successfully"
            ])
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body([
                status: "error",
                message: "Stripe data migration failed: ${e.message}"
            ])
        }
    }

    /**
     * Validate Stripe data migration
     */
    @GetMapping("/validate-stripe-migration")
    @PreAuthorize("hasRole('ADMIN')")
    ResponseEntity<Map<String, Object>> validateStripeMigration() {
        try {
            Map<String, Object> validationResult = stripeDataMigrationService.validateMigration()
            return ResponseEntity.ok([
                status: "success",
                data: validationResult
            ])
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body([
                status: "error",
                message: "Stripe migration validation failed: ${e.message}"
            ])
        }
    }

    /**
     * Ensure all shops have Stripe details
     */
    @PostMapping("/ensure-stripe-details")
    @PreAuthorize("hasRole('ADMIN')")
    ResponseEntity<Map<String, Object>> ensureStripeDetails() {
        try {
            stripeDataMigrationService.ensureAllShopsHaveStripeDetails()
            return ResponseEntity.ok([
                status: "success",
                message: "Ensured all shops have Stripe details"
            ])
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body([
                status: "error",
                message: "Failed to ensure Stripe details: ${e.message}"
            ])
        }
    }
}
