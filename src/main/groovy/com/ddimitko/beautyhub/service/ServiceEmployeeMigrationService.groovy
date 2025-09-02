package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.entity.Employee
import com.ddimitko.beautyhub.entity.Service
import com.ddimitko.beautyhub.entity.ServiceEmployee
import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.repository.EmployeeRepository
import com.ddimitko.beautyhub.repository.ServiceEmployeeRepository
import com.ddimitko.beautyhub.repository.ServiceRepository
import com.ddimitko.beautyhub.repository.ShopRepository
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service as SpringService
import org.springframework.transaction.annotation.Transactional

import java.time.LocalDateTime

/**
 * Service to migrate from legacy Service.employee relationship to ServiceEmployee join table
 * and eliminate fallback complexity
 */
@SpringService
@Slf4j
@Transactional
class ServiceEmployeeMigrationService {

    @Autowired
    private ServiceRepository serviceRepository

    @Autowired
    private EmployeeRepository employeeRepository

    @Autowired
    private ServiceEmployeeRepository serviceEmployeeRepository

    @Autowired
    private ShopRepository shopRepository

    /**
     * Migrate all services from legacy employee relationship to ServiceEmployee
     */
    void migrateAllServicesToServiceEmployee() {
        log.info("Starting migration of all services to ServiceEmployee relationship")
        
        List<Shop> allShops = shopRepository.findAll()
        int totalMigrated = 0
        int totalErrors = 0

        for (Shop shop : allShops) {
            try {
                int migrated = migrateShopServices(shop.id)
                totalMigrated += migrated
                log.info("Migrated ${migrated} services for shop: ${shop.name}")
            } catch (Exception e) {
                totalErrors++
                log.error("Failed to migrate services for shop ${shop.name}: ${e.message}", e)
            }
        }

        log.info("Migration completed. Total migrated: ${totalMigrated}, Errors: ${totalErrors}")
    }

    /**
     * Migrate services for a specific shop
     */
    int migrateShopServices(UUID shopId) {
        Shop shop = shopRepository.findById(shopId)
            .orElseThrow { new RuntimeException("Shop not found: ${shopId}") }

        List<Service> services = serviceRepository.findByShop(shop)
        int migratedCount = 0

        for (Service service : services) {
            if (migrateServiceToServiceEmployee(service)) {
                migratedCount++
            }
        }

        return migratedCount
    }

    /**
     * Migrate a single service from legacy employee relationship to ServiceEmployee
     */
    boolean migrateServiceToServiceEmployee(Service service) {
        try {
            // Check if service already has ServiceEmployee relationships
            if (service.serviceEmployees && !service.serviceEmployees.isEmpty()) {
                log.debug("Service ${service.name} already has ServiceEmployee relationships")
                
                // Clear legacy employee reference if ServiceEmployee exists
                if (service.employee != null) {
                    log.info("Clearing legacy employee reference for service: ${service.name}")
                    service.employee = null
                    serviceRepository.save(service)
                }
                return false
            }

            // Check if service has a legacy employee reference
            if (service.employee == null) {
                log.debug("Service ${service.name} has no employee reference to migrate")
                return false
            }

            Employee legacyEmployee = service.employee
            log.info("Migrating service '${service.name}' from legacy employee '${legacyEmployee.fullName}' to ServiceEmployee")

            // Create ServiceEmployee relationship
            ServiceEmployee serviceEmployee = new ServiceEmployee(
                service: service,
                employee: legacyEmployee,
                active: true,
                createdAt: LocalDateTime.now()
            )

            // Save the ServiceEmployee relationship
            serviceEmployeeRepository.save(serviceEmployee)

            // Clear the legacy employee reference
            service.employee = null
            serviceRepository.save(service)

            log.info("Successfully migrated service '${service.name}' to ServiceEmployee relationship")
            return true

        } catch (Exception e) {
            log.error("Failed to migrate service ${service.name}: ${e.message}", e)
            return false
        }
    }

    /**
     * Create ServiceEmployee relationships for services without any employee assignments
     */
    void assignDefaultEmployeesToUnassignedServices() {
        log.info("Starting assignment of default employees to unassigned services")

        List<Service> unassignedServices = serviceRepository.findServicesWithoutEmployees()
        int assignedCount = 0

        for (Service service : unassignedServices) {
            try {
                if (assignDefaultEmployeeToService(service)) {
                    assignedCount++
                }
            } catch (Exception e) {
                log.error("Failed to assign employee to service ${service.name}: ${e.message}", e)
            }
        }

        log.info("Assigned default employees to ${assignedCount} services")
    }

    /**
     * Assign the first available employee from the shop to a service
     */
    private boolean assignDefaultEmployeeToService(Service service) {
        List<Employee> shopEmployees = employeeRepository.findActiveEmployeesByShop(service.shop)
        
        if (shopEmployees.isEmpty()) {
            log.warn("No active employees found for shop ${service.shop.name}, cannot assign to service ${service.name}")
            return false
        }

        Employee defaultEmployee = shopEmployees.first()
        log.info("Assigning default employee '${defaultEmployee.fullName}' to service '${service.name}'")

        ServiceEmployee serviceEmployee = new ServiceEmployee(
            service: service,
            employee: defaultEmployee,
            active: true,
            createdAt: LocalDateTime.now()
        )

        serviceEmployeeRepository.save(serviceEmployee)
        return true
    }

    /**
     * Validate that all services have proper ServiceEmployee relationships
     */
    Map<String, Object> validateServiceEmployeeRelationships() {
        log.info("Validating ServiceEmployee relationships")

        List<Service> allServices = serviceRepository.findAll()
        List<Service> servicesWithLegacyEmployee = []
        List<Service> servicesWithoutEmployees = []
        List<Service> servicesWithServiceEmployee = []

        for (Service service : allServices) {
            if (service.employee != null) {
                servicesWithLegacyEmployee.add(service)
            }
            
            if (service.serviceEmployees == null || service.serviceEmployees.isEmpty()) {
                servicesWithoutEmployees.add(service)
            } else {
                servicesWithServiceEmployee.add(service)
            }
        }

        Map<String, Object> report = [
            totalServices: allServices.size(),
            servicesWithLegacyEmployee: servicesWithLegacyEmployee.size(),
            servicesWithoutEmployees: servicesWithoutEmployees.size(),
            servicesWithServiceEmployee: servicesWithServiceEmployee.size(),
            migrationNeeded: servicesWithLegacyEmployee.size() > 0,
            assignmentNeeded: servicesWithoutEmployees.size() > 0
        ]

        log.info("Validation report: ${report}")
        return report
    }

    /**
     * Clean up orphaned ServiceEmployee relationships
     */
    void cleanupOrphanedServiceEmployees() {
        log.info("Cleaning up orphaned ServiceEmployee relationships")

        List<ServiceEmployee> orphanedRelationships = serviceEmployeeRepository.findOrphanedServiceEmployees()
        
        if (orphanedRelationships.isEmpty()) {
            log.info("No orphaned ServiceEmployee relationships found")
            return
        }

        log.info("Found ${orphanedRelationships.size()} orphaned ServiceEmployee relationships")
        
        for (ServiceEmployee orphaned : orphanedRelationships) {
            try {
                serviceEmployeeRepository.delete(orphaned)
                log.debug("Deleted orphaned ServiceEmployee: ${orphaned.id}")
            } catch (Exception e) {
                log.error("Failed to delete orphaned ServiceEmployee ${orphaned.id}: ${e.message}", e)
            }
        }

        log.info("Cleanup completed")
    }

    /**
     * Perform complete migration and cleanup
     */
    Map<String, Object> performCompleteMigration() {
        log.info("Starting complete ServiceEmployee migration")

        Map<String, Object> initialReport = validateServiceEmployeeRelationships()
        
        if (!(Boolean) initialReport.migrationNeeded && !(Boolean) initialReport.assignmentNeeded) {
            log.info("No migration needed, all services already have proper ServiceEmployee relationships")
            return [
                status: 'completed',
                message: 'No migration needed',
                report: initialReport
            ]
        }

        try {
            // Step 1: Migrate legacy relationships
            if ((Boolean) initialReport.migrationNeeded) {
                migrateAllServicesToServiceEmployee()
            }

            // Step 2: Assign employees to unassigned services
            if ((Boolean) initialReport.assignmentNeeded) {
                assignDefaultEmployeesToUnassignedServices()
            }

            // Step 3: Clean up orphaned relationships
            cleanupOrphanedServiceEmployees()

            // Step 4: Final validation
            Map<String, Object> finalReport = validateServiceEmployeeRelationships()

            return [
                status: 'completed',
                message: 'Migration completed successfully',
                initialReport: initialReport,
                finalReport: finalReport
            ]

        } catch (Exception e) {
            log.error("Migration failed: ${e.message}", e)
            return [
                status: 'failed',
                message: "Migration failed: ${e.message}",
                error: e.message
            ]
        }
    }
}
