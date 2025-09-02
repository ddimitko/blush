package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.entity.Employee
import com.ddimitko.beautyhub.entity.Service
import com.ddimitko.beautyhub.entity.ScheduleSlot
import com.ddimitko.beautyhub.dto.ShopSummaryDTO
import com.ddimitko.beautyhub.service.ShopService
import com.ddimitko.beautyhub.service.EmployeeService
import com.ddimitko.beautyhub.repository.ServiceRepository
import com.ddimitko.beautyhub.repository.ScheduleSlotRepository
import com.ddimitko.beautyhub.enums.DayOfWeek

import java.time.LocalTime
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.transaction.annotation.Transactional
import groovy.util.logging.Slf4j

@Slf4j
@RestController
@RequestMapping("/api/public")
class PublicController {

    @Autowired
    private ShopService shopService

    @Autowired
    private EmployeeService employeeService

    @Autowired
    private ServiceRepository serviceRepository

    @Autowired
    private ScheduleSlotRepository scheduleSlotRepository

    @GetMapping("/shops")
    @Transactional(readOnly = true)
    ResponseEntity<?> getShops(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "sortBy", defaultValue = "name") String sortBy,
            @RequestParam(value = "sortDir", defaultValue = "asc") String sortDir,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "city", required = false) String city,
            @RequestParam(value = "minRating", required = false) Double minRating,
            @RequestParam(value = "acceptsCard", required = false) Boolean acceptsCard,
            @RequestParam(value = "businessTypes", required = false) List<String> businessTypes,
            @RequestParam(value = "latitude", required = false) Double latitude,
            @RequestParam(value = "longitude", required = false) Double longitude,
            @RequestParam(value = "maxDistance", required = false) Double maxDistance) {

        Page<Shop> shops

        // Use location-based search if coordinates are provided
        if (latitude != null && longitude != null) {
            // For location-based search, we don't use traditional sorting as distance takes precedence
            Pageable pageable = PageRequest.of(page, size)
            shops = shopService.searchShopsWithLocation(latitude, longitude, maxDistance, name, city, minRating, acceptsCard, businessTypes, pageable)
        } else {
            // Traditional search with sorting
            Sort sort = sortDir.equalsIgnoreCase("desc") ?
                Sort.by(sortBy).descending() : Sort.by(sortBy).ascending()
            Pageable pageable = PageRequest.of(page, size, sort)
            shops = shopService.searchShops(name, city, minRating, acceptsCard, businessTypes, pageable)
        }

        // Convert to DTOs to avoid Hibernate proxy serialization issues
        List<ShopSummaryDTO> shopDTOs = shops.content.collect { shop ->
            // Force load business types since native queries don't fetch @ElementCollection
            shop.businessTypes.size() // This triggers lazy loading
            ShopSummaryDTO.fromShop(shop)
        }

        Map<String, Object> response = [
            content: shopDTOs,
            totalElements: shops.totalElements,
            totalPages: shops.totalPages,
            size: shops.size,
            number: shops.number,
            first: shops.first,
            last: shops.last,
            empty: shops.empty
        ]

        return ResponseEntity.ok(response)
    }

    @GetMapping("/geocode/reverse")
    ResponseEntity<?> reverseGeocode(
            @RequestParam("latitude") Double latitude,
            @RequestParam("longitude") Double longitude) {
        try {
            // For now, return a simple response. In production, you would integrate with a geocoding service
            // like Google Maps Geocoding API, OpenStreetMap Nominatim, or similar
            Map<String, Object> response = [
                latitude: latitude,
                longitude: longitude,
                address: "Location at ${latitude}, ${longitude}".toString(),
                city: "Unknown City",
                country: "Unknown Country",
                formatted_address: "${latitude}, ${longitude}".toString()
            ]

            return ResponseEntity.ok(response)
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to reverse geocode location",
                message: e.getMessage()
            ])
        }
    }

    @GetMapping("/geocode/forward")
    ResponseEntity<?> forwardGeocode(@RequestParam("address") String address) {
        try {
            // For now, return a mock response. In production, you would integrate with a geocoding service
            // like Google Maps Geocoding API, OpenStreetMap Nominatim, or similar

            // Mock coordinates for common cities (for demo purposes)
            Map<String, List<Double>> mockCoordinates = [
                "new york": [40.7128, -74.0060],
                "london": [51.5074, -0.1278],
                "paris": [48.8566, 2.3522],
                "tokyo": [35.6762, 139.6503],
                "sofia": [42.6977, 23.3219],
                "los angeles": [34.0522, -118.2437],
                "chicago": [41.8781, -87.6298],
                "miami": [25.7617, -80.1918]
            ]

            String normalizedAddress = address.toLowerCase()
            List<Double> coordinates = null

            // Try to find coordinates for known cities
            for (Map.Entry<String, List<Double>> entry : mockCoordinates.entrySet()) {
                if (normalizedAddress.contains(entry.key)) {
                    coordinates = entry.value
                    break
                }
            }

            // Default to New York if no match found
            if (!coordinates) {
                coordinates = [40.7128, -74.0060]
            }

            Map<String, Object> response = [
                address: address,
                latitude: coordinates[0],
                longitude: coordinates[1],
                formatted_address: address
            ]

            return ResponseEntity.ok(response)
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to geocode address",
                message: e.getMessage()
            ])
        }
    }

    @GetMapping("/shops/{id}")
    ResponseEntity<?> getShop(@PathVariable("id") UUID id) {
        try {
            // Use active shop lookup to match the same criteria as shop listing
            Shop shop = shopService.findActiveShopByIdWithGallery(id)
            // Force load business types since they might be lazy-loaded
            shop.businessTypes.size() // This triggers lazy loading
            // Gallery is already loaded by the findActiveShopByIdWithGallery method
            ShopSummaryDTO shopDTO = ShopSummaryDTO.fromShop(shop)
            return ResponseEntity.ok(shopDTO)
        } catch (RuntimeException e) {
            log.warn("Shop not found with id ${id}: ${e.message}")
            return ResponseEntity.notFound().build()
        }
    }

    @GetMapping("/shops/{id}/employees")
    ResponseEntity<?> getShopEmployees(@PathVariable("id") UUID id) {
        try {
            // Use a dedicated service method that handles transactions properly
            List<Map<String, Object>> employeeData = employeeService.getPublicEmployeesByShop(id)
            return ResponseEntity.ok([data: employeeData])
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build()
        }
    }

    @GetMapping("/shops/{id}/services")
    @Transactional(readOnly = true)
    ResponseEntity<?> getShopServices(@PathVariable("id") UUID id) {
        try {
            // Use active shop lookup to ensure consistency
            Shop shop = shopService.findActiveShopById(id)
            // Use customer-facing query that only shows services with active employees
            List<Service> services = serviceRepository.findCustomerBookableServicesByShop(shop)
            return ResponseEntity.ok([
                data: services.collect { service ->
                    [
                        id: service.id,
                        name: service.name,
                        description: service.description,
                        price: service.price,
                        durationMinutes: service.durationMinutes,
                        depositAmount: service.depositAmount,
                        category: service.category,
                        active: service.active,
                        bookingBufferMinutes: service.bookingBufferMinutes,
                        // Use ServiceEmployee relationship for employee info
                        employees: service.serviceEmployees?.findAll { it.active }?.collect { se ->
                            [
                                id: se.employee.id,
                                name: se.employee.fullName
                            ]
                        } ?: [],
                        shopId: service.shop?.id,
                        shopName: service.shop?.name,
                        formattedPrice: service.formattedPrice,
                        formattedDuration: service.formattedDuration,
                        createdAt: service.createdAt
                    ]
                }
            ])
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build()
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve shop services",
                message: e.getMessage()
            ])
        }
    }

    @GetMapping("/shops/{id}/hours")
    @Transactional(readOnly = true)
    ResponseEntity<?> getShopHours(@PathVariable("id") UUID id) {
        try {
            // Use active shop lookup to ensure consistency
            Shop shop = shopService.findActiveShopById(id)

            // Use the same method as the employees endpoint to ensure consistency
            List<Employee> employees = employeeService.getActiveEmployeesByShop(shop.id)

            if (employees.isEmpty()) {
                return ResponseEntity.ok([data: []])
            }

            // Aggregate schedule slots by day of week
            Map<DayOfWeek, List<ScheduleSlot>> schedulesByDay = [:]

            employees.each { employee ->
                // Get schedule slots for each employee using repository
                List<ScheduleSlot> employeeSlots = scheduleSlotRepository.findByEmployeeAndActiveTrue(employee)
                employeeSlots.each { slot ->
                    if (!schedulesByDay[slot.dayOfWeek]) {
                        schedulesByDay[slot.dayOfWeek] = []
                    }
                    schedulesByDay[slot.dayOfWeek].add(slot)
                }
            }

            // Create shop hours by finding earliest start and latest end for each day
            List<Map> shopHours = []
            DayOfWeek.values().each { day ->
                List<ScheduleSlot> daySlots = schedulesByDay[day] ?: []

                if (daySlots.isEmpty()) {
                    shopHours.add([
                        dayOfWeek: day.name(),
                        closed: true
                    ])
                } else {
                    LocalTime earliestStart = daySlots.collect { it.startTime }.min()
                    LocalTime latestEnd = daySlots.collect { it.endTime }.max()

                    shopHours.add([
                        dayOfWeek: day.name(),
                        closed: false,
                        openTime: earliestStart.toString(),
                        closeTime: latestEnd.toString()
                    ])
                }
            }

            return ResponseEntity.ok([
                data: shopHours,
                debug: [
                    employeeCount: employees.size(),
                    employees: employees.collect { [id: it.id, name: it.fullName] },
                    schedulesByDay: schedulesByDay.collectEntries { k, v -> [k.name(), v.size()] }
                ]
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve shop hours",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Get employee services using ServiceEmployee relationship
     */
    private List<Map<String, Object>> getEmployeeServices(Employee employee) {
        try {
            // Use ServiceEmployee relationship exclusively
            return employee.serviceEmployees?.findAll { it.active }?.collect { serviceEmployee ->
                [
                    id: serviceEmployee.service.id,
                    name: serviceEmployee.service.name,
                    price: serviceEmployee.service.price,
                    durationMinutes: serviceEmployee.service.durationMinutes
                ]
            } ?: []
        } catch (Exception e) {
            log.warn("Failed to load services for employee ${employee.id}: ${e.message}")
            return []
        }
    }
}
