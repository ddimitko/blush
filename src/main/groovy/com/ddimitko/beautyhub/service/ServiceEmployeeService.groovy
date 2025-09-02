package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.entity.Employee
import com.ddimitko.beautyhub.entity.Service
import com.ddimitko.beautyhub.entity.ServiceEmployee
import com.ddimitko.beautyhub.repository.ServiceEmployeeRepository
import com.ddimitko.beautyhub.repository.ServiceRepository
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service as SpringService
import org.springframework.transaction.annotation.Transactional

import java.time.LocalDateTime

/**
 * Service for managing ServiceEmployee relationships
 * Replaces the legacy direct employee assignment to services
 */
@SpringService
@Slf4j
@Transactional
class ServiceEmployeeService {

    @Autowired
    private ServiceEmployeeRepository serviceEmployeeRepository

    @Autowired
    private ServiceRepository serviceRepository

    /**
     * Assign an employee to a service
     */
    ServiceEmployee assignEmployeeToService(Service service, Employee employee) {
        // Check if relationship already exists
        Optional<ServiceEmployee> existing = serviceEmployeeRepository.findByServiceAndEmployee(service, employee)
        
        ServiceEmployee result

        if (existing.isPresent()) {
            ServiceEmployee serviceEmployee = existing.get()
            if (!serviceEmployee.active) {
                // Reactivate existing relationship
                serviceEmployee.active = true
                result = serviceEmployeeRepository.save(serviceEmployee)
                log.info("Reactivated ServiceEmployee relationship: service=${service.name}, employee=${employee.fullName}")
            } else {
                result = serviceEmployee
            }
        } else {
            // Create new relationship
            ServiceEmployee serviceEmployee = new ServiceEmployee(
                service: service,
                employee: employee,
                active: true,
                createdAt: LocalDateTime.now()
            )
            result = serviceEmployeeRepository.save(serviceEmployee)
            log.info("Created new ServiceEmployee relationship: service=${service.name}, employee=${employee.fullName}")
        }

        // Auto-activate service if it was inactive and now has at least one active employee
        if (!service.active) {
            List<Employee> activeEmployees = getActiveEmployeesForService(service)
            if (!activeEmployees.isEmpty()) {
                service.active = true
                serviceRepository.save(service)
                log.info("Auto-activated service '${service.name}' as it now has active employees")
            }
        }

        return result
    }

    /**
     * Remove an employee from a service
     */
    void removeEmployeeFromService(Service service, Employee employee) {
        Optional<ServiceEmployee> existing = serviceEmployeeRepository.findByServiceAndEmployee(service, employee)

        if (existing.isPresent()) {
            ServiceEmployee serviceEmployee = existing.get()
            serviceEmployee.active = false
            serviceEmployeeRepository.save(serviceEmployee)
            log.info("Deactivated ServiceEmployee relationship: service=${service.name}, employee=${employee.fullName}")
        }
    }

    /**
     * Remove an employee from all services (used when terminating an employee)
     */
    void removeEmployeeFromAllServices(Employee employee) {
        List<ServiceEmployee> activeRelationships = serviceEmployeeRepository.findByEmployeeAndActiveTrue(employee)

        for (ServiceEmployee relationship : activeRelationships) {
            relationship.active = false
            serviceEmployeeRepository.save(relationship)
            log.info("Deactivated ServiceEmployee relationship: service=${relationship.service.name}, employee=${employee.fullName}")
        }

        log.info("Removed employee ${employee.fullName} from ${activeRelationships.size()} services")
    }

    /**
     * Get all active employees for a service
     */
    List<Employee> getActiveEmployeesForService(Service service) {
        return serviceEmployeeRepository.findActiveEmployeesByService(service)
            .collect { it.employee }
    }

    /**
     * Get all active services for an employee
     */
    List<Service> getActiveServicesForEmployee(Employee employee) {
        return serviceEmployeeRepository.findByEmployeeAndActiveTrue(employee)
            .collect { it.service }
    }

    /**
     * Check if an employee can provide a service
     */
    boolean canEmployeeProvideService(Employee employee, Service service) {
        return serviceEmployeeRepository.existsByServiceAndEmployeeAndActiveTrue(service, employee)
    }

    /**
     * Get all ServiceEmployee relationships for a service
     */
    List<ServiceEmployee> getServiceEmployeeRelationships(Service service) {
        return serviceEmployeeRepository.findByServiceAndActiveTrue(service)
    }

    /**
     * Bulk assign multiple employees to a service
     */
    List<ServiceEmployee> assignMultipleEmployeesToService(Service service, List<Employee> employees) {
        List<ServiceEmployee> relationships = []
        
        for (Employee employee : employees) {
            try {
                ServiceEmployee relationship = assignEmployeeToService(service, employee)
                relationships.add(relationship)
            } catch (Exception e) {
                log.error("Failed to assign employee ${employee.fullName} to service ${service.name}: ${e.message}", e)
            }
        }
        
        return relationships
    }

    /**
     * Remove all employees from a service
     */
    void removeAllEmployeesFromService(Service service) {
        List<ServiceEmployee> relationships = serviceEmployeeRepository.findByServiceAndActiveTrue(service)
        
        for (ServiceEmployee relationship : relationships) {
            relationship.active = false
            serviceEmployeeRepository.save(relationship)
        }
        
        log.info("Removed all employees from service: ${service.name}")
    }

    /**
     * Transfer service assignments from one employee to another
     */
    void transferServiceAssignments(Employee fromEmployee, Employee toEmployee) {
        List<ServiceEmployee> fromRelationships = serviceEmployeeRepository.findByEmployeeAndActiveTrue(fromEmployee)
        
        for (ServiceEmployee relationship : fromRelationships) {
            // Deactivate old relationship
            relationship.active = false
            serviceEmployeeRepository.save(relationship)
            
            // Create new relationship with target employee
            assignEmployeeToService(relationship.service, toEmployee)
        }
        
        log.info("Transferred ${fromRelationships.size()} service assignments from ${fromEmployee.fullName} to ${toEmployee.fullName}")
    }

    /**
     * Get statistics about service-employee relationships
     */
    Map<String, Object> getServiceEmployeeStats() {
        long totalRelationships = serviceEmployeeRepository.count()
        long activeRelationships = serviceEmployeeRepository.findAll().count { it.active }
        
        return [
            totalRelationships: totalRelationships,
            activeRelationships: activeRelationships,
            inactiveRelationships: totalRelationships - activeRelationships
        ]
    }
}
