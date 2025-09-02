package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.entity.Employee
import com.ddimitko.beautyhub.repository.EmployeeRepository
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import java.time.LocalDate

@Service
@Slf4j
class DatabaseMigrationService {

    @Autowired
    private EmployeeRepository employeeRepository

    @PersistenceContext
    private EntityManager entityManager

    /**
     * Run database migrations after application startup
     */
    @EventListener(ApplicationReadyEvent)
    @Transactional
    void runMigrations() {
        log.info("Starting database migrations...")
        
        try {
            migrateEmployeeLeaveData()
            removeUnusedServiceColumns()
            log.info("Database migrations completed successfully")
        } catch (Exception e) {
            log.error("Database migration failed: ${e.getMessage()}", e)
        }
    }

    /**
     * Migrate employee leave data - set default values for new columns
     */
    private void migrateEmployeeLeaveData() {
        log.info("Migrating employee leave data...")
        
        List<Employee> employees = employeeRepository.findAll()
        int updatedCount = 0
        
        employees.each { employee ->
            boolean needsUpdate = false
            
            // Set default annual leave days if null
            if (employee.annualLeaveDays == null) {
                employee.annualLeaveDays = 25
                needsUpdate = true
            }
            
            // Set default used leave days if null
            if (employee.usedLeaveDays == null) {
                employee.usedLeaveDays = 0
                needsUpdate = true
            }
            
            // Set default leave year start if null
            if (employee.leaveYearStart == null) {
                // Set to beginning of current year or hire date anniversary
                LocalDate hireDate = employee.hireDate?.toLocalDate()
                if (hireDate) {
                    LocalDate currentYear = LocalDate.of(LocalDate.now().year, hireDate.monthValue, hireDate.dayOfMonth)
                    // If the anniversary hasn't passed this year, use last year's anniversary
                    if (currentYear.isAfter(LocalDate.now())) {
                        currentYear = currentYear.minusYears(1)
                    }
                    employee.leaveYearStart = currentYear
                } else {
                    // Default to January 1st of current year
                    employee.leaveYearStart = LocalDate.of(LocalDate.now().year, 1, 1)
                }
                needsUpdate = true
            }
            
            if (needsUpdate) {
                employeeRepository.save(employee)
                updatedCount++
                log.debug("Updated leave data for employee: ${employee.fullName}")
            }
        }
        
        log.info("Updated leave data for ${updatedCount} employees")
    }

    @Transactional
    void removeUnusedServiceColumns() {
        log.info("Removing unused service columns...")

        try {
            // Check if preparation_time_minutes column exists before trying to drop it
            def result = entityManager.createNativeQuery("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'services'
                AND column_name = 'preparation_time_minutes'
            """).getResultList()

            if (!result.isEmpty()) {
                entityManager.createNativeQuery("ALTER TABLE services DROP COLUMN preparation_time_minutes").executeUpdate()
                log.info("Dropped unused preparation_time_minutes column from services table")
            } else {
                log.info("preparation_time_minutes column does not exist, skipping")
            }
        } catch (Exception e) {
            log.warn("Failed to drop preparation_time_minutes column: ${e.message}")
        }
    }
}
