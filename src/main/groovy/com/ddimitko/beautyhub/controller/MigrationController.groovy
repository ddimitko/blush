package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.service.ServiceEmployeeMigrationService
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

/**
 * Controller for data migration operations
 * Only accessible by system administrators
 */
@RestController
@RequestMapping("/api/admin/migration")
@Slf4j
class MigrationController {

    @Autowired
    private ServiceEmployeeMigrationService migrationService

    /**
     * Validate current state of service-employee relationships
     */
    @GetMapping("/service-employee/validate")
    @PreAuthorize("hasRole('ADMIN')")
    ResponseEntity<?> validateServiceEmployeeRelationships() {
        try {
            Map<String, Object> report = migrationService.validateServiceEmployeeRelationships()
            return ResponseEntity.ok([
                status: 'success',
                data: report
            ])
        } catch (Exception e) {
            log.error("Failed to validate service-employee relationships: ${e.message}", e)
            return ResponseEntity.internalServerError().body([
                status: 'error',
                message: "Validation failed: ${e.message}"
            ])
        }
    }

    /**
     * Perform complete service-employee migration
     */
    @PostMapping("/service-employee/migrate")
    @PreAuthorize("hasRole('ADMIN')")
    ResponseEntity<?> migrateServiceEmployeeRelationships() {
        try {
            log.info("Starting service-employee migration via API")
            Map<String, Object> result = migrationService.performCompleteMigration()
            
            if (result.status == 'completed') {
                return ResponseEntity.ok(result)
            } else {
                return ResponseEntity.internalServerError().body(result)
            }
        } catch (Exception e) {
            log.error("Migration failed: ${e.message}", e)
            return ResponseEntity.internalServerError().body([
                status: 'error',
                message: "Migration failed: ${e.message}"
            ])
        }
    }

    /**
     * Migrate services for a specific shop
     */
    @PostMapping("/service-employee/migrate/shop/{shopId}")
    @PreAuthorize("hasRole('ADMIN')")
    ResponseEntity<?> migrateShopServices(@PathVariable("shopId") UUID shopId) {
        try {
            int migratedCount = migrationService.migrateShopServices(shopId)
            return ResponseEntity.ok([
                status: 'success',
                message: "Migrated ${migratedCount} services for shop",
                migratedCount: migratedCount
            ])
        } catch (Exception e) {
            log.error("Failed to migrate shop services: ${e.message}", e)
            return ResponseEntity.internalServerError().body([
                status: 'error',
                message: "Migration failed: ${e.message}"
            ])
        }
    }

    /**
     * Clean up orphaned service-employee relationships
     */
    @PostMapping("/service-employee/cleanup")
    @PreAuthorize("hasRole('ADMIN')")
    ResponseEntity<?> cleanupOrphanedRelationships() {
        try {
            migrationService.cleanupOrphanedServiceEmployees()
            return ResponseEntity.ok([
                status: 'success',
                message: 'Cleanup completed successfully'
            ])
        } catch (Exception e) {
            log.error("Cleanup failed: ${e.message}", e)
            return ResponseEntity.internalServerError().body([
                status: 'error',
                message: "Cleanup failed: ${e.message}"
            ])
        }
    }

    /**
     * Assign default employees to services without employee assignments
     */
    @PostMapping("/service-employee/assign-defaults")
    @PreAuthorize("hasRole('ADMIN')")
    ResponseEntity<?> assignDefaultEmployees() {
        try {
            migrationService.assignDefaultEmployeesToUnassignedServices()
            return ResponseEntity.ok([
                status: 'success',
                message: 'Default employee assignment completed'
            ])
        } catch (Exception e) {
            log.error("Default assignment failed: ${e.message}", e)
            return ResponseEntity.internalServerError().body([
                status: 'error',
                message: "Assignment failed: ${e.message}"
            ])
        }
    }
}
