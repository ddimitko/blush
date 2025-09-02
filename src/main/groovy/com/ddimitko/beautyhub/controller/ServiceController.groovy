package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.dto.ServiceRequest
import com.ddimitko.beautyhub.entity.Employee
import com.ddimitko.beautyhub.entity.Service
import com.ddimitko.beautyhub.entity.ServiceEmployee
import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.enums.ServiceCategory
import com.ddimitko.beautyhub.repository.EmployeeRepository
import com.ddimitko.beautyhub.repository.ServiceRepository
import com.ddimitko.beautyhub.repository.ServiceEmployeeRepository
import com.ddimitko.beautyhub.repository.ShopRepository
import com.ddimitko.beautyhub.security.CustomUserPrincipal
import groovy.util.logging.Slf4j
import jakarta.validation.Valid
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpStatus
import org.springframework.data.domain.Pageable
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

import jakarta.persistence.EntityNotFoundException

@RestController
@RequestMapping("/api/services")
@CrossOrigin(origins = "*", maxAge = 3600)
@Slf4j
class ServiceController {

    @Autowired
    private ServiceRepository serviceRepository

    @Autowired
    private ShopRepository shopRepository

    @Autowired
    private EmployeeRepository employeeRepository

    @Autowired
    private ServiceEmployeeRepository serviceEmployeeRepository

    @Autowired
    private com.ddimitko.beautyhub.service.ServiceEmployeeService serviceEmployeeService

    @Autowired
    private com.ddimitko.beautyhub.service.EmployeeService employeeService

    /**
     * Get all available service categories
     */
    @GetMapping("/categories")
    ResponseEntity<?> getServiceCategories() {
        try {
            return ResponseEntity.ok([
                categories: ServiceCategory.getAllCategories()
            ])
        } catch (Exception e) {
            return ResponseEntity.status(500).body([
                error: "Failed to retrieve service categories",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Get services with optional filtering
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'EMPLOYEE')")
    ResponseEntity<?> getServices(
            @RequestParam(value = "shopId", required = false) UUID shopId,
            @RequestParam(value = "employeeId", required = false) UUID employeeId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {

        println("=== SERVICE CONTROLLER REACHED ===")
        println("Shop ID param: ${shopId}")
        println("Employee ID param: ${employeeId}")
        println("User: ${userPrincipal?.getEmail()}")

        try {
            log.debug("Service request for user: ${userPrincipal.getId()}, shop: ${shopId}")

            List<Service> services = []

            if (shopId) {
                Shop shop = shopRepository.findById(shopId)
                        .orElseThrow { new RuntimeException("Shop not found") }

                println("Shop found: ${shop.name}")
                println("Shop owner ID: ${shop.owner.id}")
                println("User ID: ${userPrincipal.getId()}")
                println("Owner match: ${shop.owner.id.equals(userPrincipal.getId())}")

                // Check if user is employee at this shop
                boolean isEmployee = false
                try {
                    isEmployee = employeeService.isEmployeeAtShop(userPrincipal.getId(), shopId)
                    println("Is employee: ${isEmployee}")
                } catch (Exception e) {
                    println("ERROR checking employee status: ${e.getMessage()}")
                    e.printStackTrace()
                    isEmployee = false
                }

                // Verify access - owner of shop or employee of shop
                boolean hasAccess = shop.owner.id.equals(userPrincipal.getId()) || isEmployee

                println("Has access: ${hasAccess}")

                if (!hasAccess) {
                    println("ACCESS DENIED - returning 403")
                    return ResponseEntity.status(403).body([
                        error: "Access denied",
                        message: "You can only view services for shops you own or work at",
                        debug: [
                            userId: userPrincipal.getId(),
                            shopOwnerId: shop.owner.id,
                            isOwner: shop.owner.id.equals(userPrincipal.getId()),
                            isEmployee: isEmployee,
                            userAuthorities: userPrincipal.getAuthorities().collect { it.getAuthority() }
                        ]
                    ])
                }

                services = serviceRepository.findAllByShopWithEmployeeAndUser(shop)
            } else if (employeeId) {
                Employee employee = employeeRepository.findById(employeeId)
                        .orElseThrow { new EntityNotFoundException("Employee not found with id: ${employeeId}") }

                // Verify access - owner of shop or the employee themselves
                boolean hasAccess = employee.shop.owner.id.equals(userPrincipal.getId()) ||
                                   employee.user.id.equals(userPrincipal.getId())

                if (!hasAccess) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body([
                        error: "Access denied",
                        message: "You can only view services for your own employees"
                    ])
                }

                services = serviceRepository.findByEmployeeAndActiveTrueWithEmployeeAndUser(employee)
            } else {
                return ResponseEntity.badRequest().body([
                    error: "Missing parameter",
                    message: "Either shopId or employeeId is required"
                ])
            }

            return ResponseEntity.ok([
                data: services.collect { service ->
                    def activeEmployees = service.getActiveEmployees()
                    [
                        id: service.id,
                        name: service.name,
                        description: service.description,
                        price: service.price,
                        durationMinutes: service.durationMinutes,
                        depositAmount: service.depositAmount,
                        category: service.category?.name(),
                        active: service.active,
                        bookingBufferMinutes: service.bookingBufferMinutes,
                        employeeId: service.employee?.id,
                        employeeName: service.employee?.fullName,
                        employees: activeEmployees.collect { emp ->
                            [
                                id: emp.id,
                                name: emp.fullName
                            ]
                        },
                        shopId: service.shop.id,
                        shopName: service.shop.name,
                        formattedPrice: service.formattedPrice,
                        formattedDuration: service.formattedDuration,
                        createdAt: service.createdAt
                    ]
                }
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve services",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Get a specific service
     */
    @GetMapping("/{serviceId}")
    @PreAuthorize("hasAnyRole('OWNER', 'EMPLOYEE', 'USER')")
    ResponseEntity<?> getService(@PathVariable("serviceId") UUID serviceId) {
        try {
            Service service = serviceRepository.findByIdWithServiceEmployees(serviceId)
                    .orElseThrow { new EntityNotFoundException("Service not found with id: ${serviceId}") }

            // Get active employees safely - handle potential lazy loading issues
            def activeEmployees = []
            try {
                activeEmployees = service.getActiveEmployees()
            } catch (Exception e) {
                // If getActiveEmployees fails due to lazy loading, fetch employees manually
                activeEmployees = serviceEmployeeRepository.findActiveEmployeesByService(service)
                        .collect { it.employee }
            }

            return ResponseEntity.ok([
                id: service.id,
                name: service.name,
                description: service.description,
                price: service.price,
                durationMinutes: service.durationMinutes,
                depositAmount: service.depositAmount,
                category: service.category?.name(),
                active: service.active,
                bookingBufferMinutes: service.bookingBufferMinutes,
                employeeId: service.employee?.id,
                employeeName: service.employee?.fullName,
                employees: activeEmployees.collect { emp ->
                    [
                        id: emp.id,
                        name: emp.fullName
                    ]
                },
                shopId: service.shop.id,
                shopName: service.shop.name,
                formattedPrice: service.formattedPrice,
                formattedDuration: service.formattedDuration,
                createdAt: service.createdAt
            ])
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body([
                error: "Service not found",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Failed to retrieve service: ${e.getMessage()}", e)
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body([
                error: "Failed to retrieve service",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Create a new service
     */
    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_OWNER')")
    ResponseEntity<?> createService(
            @Valid @RequestBody ServiceRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            Shop shop = shopRepository.findById(request.shopId)
                    .orElseThrow { new RuntimeException("Shop not found") }

            // Verify that the user owns the shop
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only create services for your own shops"
                ])
            }

            // Check for duplicate service name within the shop
            List<Service> existingServices = serviceRepository.findByShopAndNameIgnoreCase(shop, request.name)
            if (!existingServices.isEmpty()) {
                return ResponseEntity.badRequest().body([
                    error: "Duplicate service name",
                    message: "A service with this name already exists in your shop"
                ])
            }

            // Validate employees if provided
            List<Employee> employees = []
            if (request.employeeIds && !request.employeeIds.isEmpty()) {
                for (UUID employeeId : request.employeeIds) {
                    Employee employee = employeeRepository.findByIdWithUser(employeeId)
                            .orElseThrow { new RuntimeException("Employee not found: ${employeeId}") }

                    // Verify that the employee belongs to the shop
                    if (!employee.shop.id.equals(shop.id)) {
                        return ResponseEntity.badRequest().body([
                            error: "Invalid employee",
                            message: "Employee ${employee.fullName} does not belong to this shop"
                        ])
                    }
                    employees.add(employee)
                }
            }

            // Determine active status: true if employees are assigned, false if no employees
            boolean isActive = request.active != null ? request.active : !employees.isEmpty()

            Service service = new Service()
            service.name = request.name
            service.description = request.description
            service.price = request.price
            service.durationMinutes = request.durationMinutes
            service.depositAmount = request.depositAmount ?: BigDecimal.ZERO
            service.category = request.category
            service.active = isActive
            service.onlineBookingEnabled = true
            service.requiresDeposit = request.depositAmount && request.depositAmount > BigDecimal.ZERO
            service.bookingBufferMinutes = request.bookingBufferMinutes ?: 15
            service.employee = employees.isEmpty() ? null : employees.first() // For backward compatibility
            service.shop = shop

            service = serviceRepository.save(service)

            // Create ServiceEmployee relationships
            for (Employee employee : employees) {
                ServiceEmployee serviceEmployee = new ServiceEmployee()
                serviceEmployee.service = service
                serviceEmployee.employee = employee
                serviceEmployee.active = true
                serviceEmployeeRepository.save(serviceEmployee)
            }

            return ResponseEntity.ok([
                message: "Service created successfully",
                service: [
                    id: service.id,
                    name: service.name,
                    description: service.description,
                    price: service.price,
                    durationMinutes: service.durationMinutes,
                    depositAmount: service.depositAmount,
                    active: service.active,
                    bookingBufferMinutes: service.bookingBufferMinutes,
                    employeeIds: employees.collect { it.id },
                    employeeNames: employees.collect { it.fullName },
                    shopId: service.shop.id
                ]
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to create service",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Update a service
     */
    @PutMapping("/{serviceId}")
    @PreAuthorize("hasAuthority('ROLE_OWNER')")
    ResponseEntity<?> updateService(
            @PathVariable("serviceId") UUID serviceId,
            @Valid @RequestBody ServiceRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            Service service = serviceRepository.findById(serviceId)
                    .orElseThrow { new RuntimeException("Service not found") }

            // Verify that the user owns the shop
            if (!service.shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only update services for your own shops"
                ])
            }

            // Handle employee assignment - ServiceRequest uses employeeIds (plural)
            if (request.employeeIds && !request.employeeIds.isEmpty()) {
                // Validate all employee IDs first
                List<Employee> employees = []
                for (UUID employeeId : request.employeeIds) {
                    Employee employee = employeeRepository.findByIdWithUser(employeeId)
                            .orElseThrow { new RuntimeException("Employee not found: ${employeeId}") }

                    // Verify that the employee belongs to the shop
                    if (!employee.shop.id.equals(service.shop.id)) {
                        return ResponseEntity.badRequest().body([
                            error: "Invalid employee",
                            message: "Employee ${employee.fullName} does not belong to this shop"
                        ])
                    }
                    employees.add(employee)
                }

                // Update legacy employee field (use first employee for backward compatibility)
                service.employee = employees.first()

                // Update ServiceEmployee relationships
                // First, deactivate all existing relationships
                List<ServiceEmployee> existingRelationships = serviceEmployeeRepository.findByService(service)
                existingRelationships.each { it.active = false }
                serviceEmployeeRepository.saveAll(existingRelationships)

                // Create or reactivate relationships for the new employees
                for (Employee employee : employees) {
                    ServiceEmployee existingRelationship = serviceEmployeeRepository
                            .findByServiceAndEmployee(service, employee)
                            .orElse(null)

                    if (existingRelationship) {
                        // Reactivate existing relationship
                        existingRelationship.active = true
                        serviceEmployeeRepository.save(existingRelationship)
                    } else {
                        // Create new relationship
                        ServiceEmployee newRelationship = new ServiceEmployee(
                                service: service,
                                employee: employee,
                                active: true
                        )
                        serviceEmployeeRepository.save(newRelationship)
                    }
                }
            } else {
                // If no employees provided, clear all assignments
                service.employee = null

                // Deactivate all ServiceEmployee relationships
                List<ServiceEmployee> existingRelationships = serviceEmployeeRepository.findByService(service)
                existingRelationships.each { it.active = false }
                serviceEmployeeRepository.saveAll(existingRelationships)
            }

            // Check for duplicate service name within the shop (excluding current service)
            List<Service> existingServices = serviceRepository.findByShopAndNameIgnoreCase(service.shop, request.name)
            existingServices = existingServices.findAll { it.id != serviceId }
            if (!existingServices.isEmpty()) {
                return ResponseEntity.badRequest().body([
                    error: "Duplicate service name",
                    message: "A service with this name already exists in your shop"
                ])
            }

            // Update service fields
            service.name = request.name
            service.description = request.description
            service.price = request.price
            service.durationMinutes = request.durationMinutes
            service.depositAmount = request.depositAmount ?: BigDecimal.ZERO
            service.category = request.category
            service.requiresDeposit = request.depositAmount && request.depositAmount > BigDecimal.ZERO
            service.bookingBufferMinutes = request.bookingBufferMinutes ?: service.bookingBufferMinutes ?: 15

            // Update active status if provided, otherwise determine based on employee assignment
            if (request.active != null) {
                service.active = request.active
            } else {
                // Auto-determine active status: active if has employees, inactive if no employees
                service.active = (service.employee != null || (request.employeeIds && !request.employeeIds.isEmpty()))
            }

            service = serviceRepository.save(service)

            return ResponseEntity.ok([
                message: "Service updated successfully",
                service: [
                    id: service.id,
                    name: service.name,
                    description: service.description,
                    price: service.price,
                    durationMinutes: service.durationMinutes,
                    depositAmount: service.depositAmount,
                    employeeId: service.employee?.id,
                    employeeName: service.employee?.fullName
                ]
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to update service",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Activate a service
     */
    @PutMapping("/{serviceId}/activate")
    @PreAuthorize("hasAuthority('ROLE_OWNER')")
    ResponseEntity<?> activateService(
            @PathVariable("serviceId") UUID serviceId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            Service service = serviceRepository.findById(serviceId)
                    .orElseThrow { new RuntimeException("Service not found") }

            // Verify that the user owns the shop
            if (!service.shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only activate services for your own shops"
                ])
            }

            // Check if service has at least one active employee
            List<Employee> activeEmployees = serviceEmployeeService.getActiveEmployeesForService(service)
            if (activeEmployees.isEmpty()) {
                return ResponseEntity.badRequest().body([
                    error: "Cannot activate service",
                    message: "Service must have at least one active employee assigned before it can be activated"
                ])
            }

            // Activate the service
            service.active = true
            serviceRepository.save(service)

            log.info("Service '${service.name}' activated by owner ${userPrincipal.getEmail()}")

            return ResponseEntity.ok([
                message: "Service activated successfully"
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to activate service",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Deactivate a service (soft delete)
     */
    @PutMapping("/{serviceId}/deactivate")
    @PreAuthorize("hasAuthority('ROLE_OWNER')")
    ResponseEntity<?> deactivateService(
            @PathVariable("serviceId") UUID serviceId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            Service service = serviceRepository.findById(serviceId)
                    .orElseThrow { new RuntimeException("Service not found") }

            // Verify that the user owns the shop
            if (!service.shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only deactivate services for your own shops"
                ])
            }

            // Soft delete by setting active to false
            service.active = false
            serviceRepository.save(service)

            log.info("Service '${service.name}' deactivated by owner ${userPrincipal.getEmail()}")

            return ResponseEntity.ok([
                message: "Service deactivated successfully"
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to deactivate service",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Delete a service permanently (hard delete)
     */
    @DeleteMapping("/{serviceId}")
    @PreAuthorize("hasAuthority('ROLE_OWNER')")
    ResponseEntity<?> deleteService(
            @PathVariable("serviceId") UUID serviceId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            Service service = serviceRepository.findById(serviceId)
                    .orElseThrow { new RuntimeException("Service not found") }

            // Verify that the user owns the shop
            if (!service.shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only delete services for your own shops"
                ])
            }

            // Remove all employee assignments from this service
            serviceEmployeeService.removeAllEmployeesFromService(service)

            // Hard delete the service
            serviceRepository.delete(service)

            log.info("Service '${service.name}' permanently deleted by owner ${userPrincipal.getEmail()}")

            return ResponseEntity.ok([
                message: "Service deleted permanently"
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to delete service",
                message: e.getMessage()
            ])
        }
    }
}
