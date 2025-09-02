package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.entity.*
import com.ddimitko.beautyhub.enums.*
import com.ddimitko.beautyhub.repository.*
import com.ddimitko.beautyhub.service.NotificationService
import com.ddimitko.beautyhub.security.CustomUserPrincipal
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Profile
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.web.bind.annotation.*

import java.time.LocalTime

@RestController
@RequestMapping("/api/test-data")
@CrossOrigin(origins = "*", maxAge = 3600)
@Profile(["dev", "development", "test", "local", "default"])
class TestDataController {

    @Autowired
    private UserRepository userRepository

    @Autowired
    private ShopRepository shopRepository

    @Autowired
    private ShopStripeDetailsRepository shopStripeDetailsRepository

    @Autowired
    private EmployeeRepository employeeRepository

    @Autowired
    private ServiceRepository serviceRepository

    @Autowired
    private ScheduleSlotRepository scheduleSlotRepository

    @Autowired
    private PasswordEncoder passwordEncoder

    @Autowired
    private NotificationService notificationService

    @PostMapping("/create")
    ResponseEntity<?> createTestData() {
        try {
            // Check if test data already exists
            if (userRepository.findByEmail("owner@testshop.com").isPresent()) {
                User existingOwner = userRepository.findByEmail("owner@testshop.com").get()
                List<Shop> existingShops = shopRepository.findByOwner(existingOwner)
                if (existingShops && !existingShops.isEmpty()) {
                    Shop existingShop = existingShops.first()
                    return ResponseEntity.ok([
                        message: "Test data already exists",
                        shopId: existingShop.id.toString(),
                        employeeId: existingShop.employees?.first()?.id?.toString(),
                        serviceIds: existingShop.services?.collect { it.id.toString() }
                    ])
                }
            }

            // Create shop owner user
            User owner = new User()
            owner.email = "owner@testshop.com"
            owner.firstName = "John"
            owner.lastName = "Smith"
            owner.password = passwordEncoder.encode("password123")
            owner.role = UserRole.OWNER
            owner.emailVerified = true
            owner.enabled = true
            owner = userRepository.save(owner)

            // Create shop with Stripe connected account
            Shop shop = new Shop()
            shop.owner = owner
            shop.name = "Elite Beauty Salon"
            shop.description = "Premium beauty services with expert stylists"
            shop.address = "123 Beauty Street"
            shop.city = "New York"
            shop.state = "NY"
            shop.postalCode = "10001"
            shop.country = "USA"
            shop.phone = "+1-555-0123"
            shop.email = "contact@elitebeauty.com"
            shop.acceptsCardPayments = true
            shop.active = true
            shop.businessTypes = [BusinessType.BEAUTY_SALON, BusinessType.HAIRDRESSER]
            shop = shopRepository.save(shop)

            // Create test Stripe details
            ShopStripeDetails stripeDetails = new ShopStripeDetails()
            stripeDetails.shop = shop
            stripeDetails.stripeAccountId = "acct_test_stripe_connected_account"
            stripeDetails.stripeOnboardingCompleted = true
            stripeDetails.subscriptionId = "sub_test_subscription_id"
            stripeDetails.stripeCustomerId = "cus_test_customer_id"
            stripeDetails.stripePriceId = "price_test_price_id"
            shopStripeDetailsRepository.save(stripeDetails)

            // Create employee user
            User employeeUser = new User()
            employeeUser.email = "stylist@testshop.com"
            employeeUser.firstName = "Sarah"
            employeeUser.lastName = "Johnson"
            employeeUser.password = passwordEncoder.encode("password123")
            employeeUser.role = UserRole.EMPLOYEE
            employeeUser.emailVerified = true
            employeeUser.enabled = true
            employeeUser = userRepository.save(employeeUser)

            // Create employee
            Employee employee = new Employee()
            employee.user = employeeUser
            employee.shop = shop
            employee.specialties = "Hair Cutting, Hair Coloring, Styling"
            employee.bio = "Expert stylist with 8 years of experience in modern hair techniques"
            employee.yearsExperience = 8
            employee.hourlyRate = new BigDecimal("45.00")
            employee.commissionRate = new BigDecimal("0.30")
            employee.active = true
            employee = employeeRepository.save(employee)

            // Create services
            com.ddimitko.beautyhub.entity.Service service1 = new com.ddimitko.beautyhub.entity.Service()
            service1.shop = shop
            service1.employee = employee
            service1.name = "Premium Haircut & Style"
            service1.description = "Professional haircut with wash, cut, and styling"
            service1.category = "Hair Services"
            service1.price = new BigDecimal("75.00")
            service1.durationMinutes = 90
            service1.depositAmount = new BigDecimal("25.00")
            service1.requiresDeposit = true
            service1.onlineBookingEnabled = true
            service1.preparationTimeMinutes = 10
            service1.cleanupTimeMinutes = 15
            service1.active = true
            service1 = serviceRepository.save(service1)

            com.ddimitko.beautyhub.entity.Service service2 = new com.ddimitko.beautyhub.entity.Service()
            service2.shop = shop
            service2.employee = employee
            service2.name = "Hair Color Treatment"
            service2.description = "Full hair coloring service with premium products"
            service2.category = "Hair Services"
            service2.price = new BigDecimal("150.00")
            service2.durationMinutes = 180
            service2.depositAmount = new BigDecimal("50.00")
            service2.requiresDeposit = true
            service2.onlineBookingEnabled = true
            service2.preparationTimeMinutes = 15
            service2.cleanupTimeMinutes = 20
            service2.active = true
            service2 = serviceRepository.save(service2)

            // Create employee schedule (Monday to Saturday)
            DayOfWeek[] workDays = [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
                                   DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY]

            workDays.each { day ->
                ScheduleSlot slot = new ScheduleSlot()
                slot.employee = employee
                slot.dayOfWeek = day
                slot.startTime = day == DayOfWeek.SATURDAY ? LocalTime.of(10, 0) : LocalTime.of(9, 0)
                slot.endTime = day == DayOfWeek.SATURDAY ? LocalTime.of(16, 0) : LocalTime.of(18, 0)
                slot.active = true
                scheduleSlotRepository.save(slot)
            }

            // Create test customer user
            User customer = new User()
            customer.email = "customer@example.com"
            customer.firstName = "Jane"
            customer.lastName = "Doe"
            customer.password = passwordEncoder.encode("password123")
            customer.role = UserRole.USER
            customer.emailVerified = true
            customer.enabled = true
            customer = userRepository.save(customer)

            return ResponseEntity.ok([
                message: "Test data created successfully!",
                shopId: shop.id.toString(),
                employeeId: employee.id.toString(),
                serviceIds: [service1.id.toString(), service2.id.toString()],
                customerId: customer.id.toString(),
                credentials: [
                    owner: [email: "owner@testshop.com", password: "password123"],
                    employee: [email: "stylist@testshop.com", password: "password123"],
                    customer: [email: "customer@example.com", password: "password123"]
                ]
            ])

        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to create test data",
                message: e.getMessage()
            ])
        }
    }

    @PostMapping("/notifications")
    ResponseEntity<?> createTestNotifications(@AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            if (!userPrincipal) {
                return ResponseEntity.badRequest().body([
                    error: "Authentication required",
                    message: "You must be logged in to create test notifications"
                ])
            }

            UUID userId = userPrincipal.getId()

            // Create various test notifications
            notificationService.createNotification(
                userId,
                "Welcome to BeautyHub!",
                "Thank you for joining BeautyHub. Start exploring amazing beauty services near you.",
                NotificationType.GENERAL,
                "/dashboard"
            )

            notificationService.createNotification(
                userId,
                "Appointment Confirmed",
                "Your appointment at Beauty Salon Downtown for Hair Cut & Style has been confirmed for tomorrow at 2:00 PM.",
                NotificationType.APPOINTMENT_CONFIRMED,
                "/appointments/123"
            )

            notificationService.createNotification(
                userId,
                "Payment Received",
                "Payment of \$75.00 has been successfully processed for your upcoming appointment.",
                NotificationType.PAYMENT_RECEIVED,
                "/appointments/123"
            )

            notificationService.createNotification(
                userId,
                "New Booking Request",
                "You have a new booking request from Sarah Johnson for Manicure service on Friday at 3:00 PM.",
                NotificationType.NEW_BOOKING,
                "/dashboard/appointments"
            )

            notificationService.createNotification(
                userId,
                "Appointment Reminder",
                "Don't forget! You have an appointment tomorrow at Hair Studio Elite for Hair Coloring at 10:00 AM.",
                NotificationType.APPOINTMENT_REMINDER,
                "/appointments/124"
            )

            return ResponseEntity.ok([
                message: "Test notifications created successfully",
                count: 5
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Test notification creation failed",
                message: e.getMessage()
            ])
        }
    }

    @GetMapping("/generate-hash")
    ResponseEntity<?> generateHash(@RequestParam String password) {
        try {
            String hash = passwordEncoder.encode(password)
            return ResponseEntity.ok([
                password: password,
                hash: hash,
                matches: passwordEncoder.matches(password, hash)
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([error: "Failed to generate hash", message: e.message])
        }
    }

    @DeleteMapping("/cleanup")
    ResponseEntity<?> cleanupTestData() {
        try {
            // Delete in reverse order of dependencies
            scheduleSlotRepository.deleteAll()
            serviceRepository.deleteAll()
            employeeRepository.deleteAll()
            shopRepository.deleteAll()
            userRepository.deleteAll()

            return ResponseEntity.ok([
                message: "Test data cleaned up successfully!"
            ])

        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to cleanup test data",
                message: e.getMessage()
            ])
        }
    }
}
