package com.ddimitko.beautyhub.config

import com.ddimitko.beautyhub.service.ServiceEmployeeMigrationService
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.CommandLineRunner
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component

/**
 * Startup component that runs data migrations on application startup
 */
@Component
@Order(1000) // Run after other startup components
@Slf4j
class StartupMigrationRunner implements CommandLineRunner {

    @Autowired
    private ServiceEmployeeMigrationService migrationService

    @Override
    void run(String... args) throws Exception {
        log.info("Starting startup migrations...")
        
        try {
            // Check if migration is needed
            Map<String, Object> validationReport = migrationService.validateServiceEmployeeRelationships()
            
            boolean migrationNeeded = (Boolean) validationReport.migrationNeeded
            boolean assignmentNeeded = (Boolean) validationReport.assignmentNeeded
            
            if (!migrationNeeded && !assignmentNeeded) {
                log.info("No service-employee migration needed, all relationships are up to date")
                return
            }
            
            log.info("Service-employee migration needed. Starting automatic migration...")
            log.info("Migration report: ${validationReport}")
            
            // Perform the migration
            Map<String, Object> migrationResult = migrationService.performCompleteMigration()
            
            if (migrationResult.status == 'completed') {
                log.info("Service-employee migration completed successfully")
                log.info("Final report: ${migrationResult.finalReport}")
            } else {
                log.error("Service-employee migration failed: ${migrationResult.message}")
                // Don't throw exception to prevent application startup failure
                // The migration can be run manually via the admin API
            }
            
        } catch (Exception e) {
            log.error("Startup migration failed: ${e.message}", e)
            // Don't throw exception to prevent application startup failure
            log.warn("Migration can be run manually via /api/admin/migration/service-employee/migrate")
        }
        
        log.info("Startup migrations completed")
    }
}
