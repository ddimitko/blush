package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.entity.Appointment
import com.ddimitko.beautyhub.entity.Employee
import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.enums.UserRole
import com.ddimitko.beautyhub.repository.UserRepository
import com.ddimitko.beautyhub.repository.AppointmentRepository
import com.ddimitko.beautyhub.repository.EmployeeRepository
import com.ddimitko.beautyhub.repository.ShopRepository
import com.ddimitko.beautyhub.service.EmailService
import com.ddimitko.beautyhub.service.StripeCustomerService
import com.ddimitko.beautyhub.event.UserRegistrationEvent
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.ApplicationEventPublisher
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

@Service
@Transactional
@Slf4j
class UserService {

    @Autowired
    private UserRepository userRepository

    @Autowired
    private PasswordEncoder passwordEncoder

    @Autowired
    private EmailService emailService

    @Autowired
    private AppointmentRepository appointmentRepository

    @Autowired
    private ApplicationEventPublisher applicationEventPublisher

    @Autowired
    private StripeCustomerService stripeCustomerService

    @Autowired
    private EmployeeRepository employeeRepository

    @Autowired
    private ShopRepository shopRepository

    User createUser(String email, String password, String firstName, String lastName, String phone = null, UserRole role = UserRole.USER) {
        return createUserInternal(email, password, firstName, lastName, phone, role, true)
    }

    User createUserWithoutWelcomeEmail(String email, String password, String firstName, String lastName, String phone = null, UserRole role = UserRole.USER) {
        return createUserInternal(email, password, firstName, lastName, phone, role, false)
    }

    private User createUserInternal(String email, String password, String firstName, String lastName, String phone, UserRole role, boolean sendWelcomeEmail) {
        // Normalize email to lowercase for case-insensitive handling
        String normalizedEmail = email?.toLowerCase()?.trim()

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new IllegalArgumentException("User with email $normalizedEmail already exists")
        }

        // Validate and normalize phone number if provided
        if (phone) {
            phone = validateAndNormalizePhoneNumber(phone)
        }

        User user = new User()
        user.email = normalizedEmail
        user.password = passwordEncoder.encode(password)
        user.firstName = firstName
        user.lastName = lastName
        user.phone = phone
        // Assign placeholder avatar using initials
        user.avatar = generatePlaceholderAvatar(firstName, lastName)
        user.role = role

        User savedUser = userRepository.save(user)

        // Send welcome email asynchronously ONLY after successful transaction commit
        if (sendWelcomeEmail && savedUser.id) {
            // Use Spring's ApplicationEventPublisher to send email after transaction commit
            applicationEventPublisher.publishEvent(new UserRegistrationEvent(savedUser))
        }

        return savedUser
    }

    /**
     * Validate and normalize phone number to match backend requirements
     */
    private String validateAndNormalizePhoneNumber(String phone) {
        if (!phone) {
            return phone
        }

        // Remove all non-digit characters except +
        String cleaned = phone.replaceAll("[^+\\d]", "")

        // Convert Bulgarian phone numbers from 0xxx format to +359xxx format
        if (!cleaned.startsWith("+")) {
            if (cleaned.startsWith("0") && cleaned.length() >= 9) {
                // Bulgarian phone number starting with 0 - convert to +359
                cleaned = "+359" + cleaned.substring(1)
            } else {
                throw new IllegalArgumentException("Phone number must include country code (e.g., +359888123456)")
            }
        }

        // Validate format: +[1-9][0-14 more digits]
        if (!cleaned.matches("^\\+[1-9]\\d{1,14}\$")) {
            throw new IllegalArgumentException("Phone number must be in international format (e.g., +359888123456)")
        }

        return cleaned
    }

    private String generatePlaceholderAvatar(String firstName, String lastName) {
        String initials = "${firstName?.charAt(0) ?: ''}${lastName?.charAt(0) ?: ''}".toUpperCase()
        // Using a simple avatar service that generates avatars based on initials
        return "https://ui-avatars.com/api/?name=${initials}&background=6366f1&color=ffffff&size=128"
    }

    User updateUser(UUID userId, User updatedUser) {
        User user = findById(userId)
        
        if (updatedUser.firstName != null) {
            user.firstName = updatedUser.firstName
        }
        if (updatedUser.lastName != null) {
            user.lastName = updatedUser.lastName
        }
        if (updatedUser.phone != null) {
            user.phone = updatedUser.phone
        }
        if (updatedUser.avatar != null) {
            user.avatar = updatedUser.avatar
        }
        
        user.updatedAt = LocalDateTime.now()
        User savedUser = userRepository.save(user)

        // Update Stripe customer information if user has a Stripe customer ID
        try {
            stripeCustomerService.updateStripeCustomer(savedUser)
        } catch (Exception e) {
            log.warn("Failed to update Stripe customer for user ${userId}: ${e.message}")
            // Don't fail the user update if Stripe update fails
        }

        return savedUser
    }

    User findById(UUID userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found with id: ${userId}"))
    }

    User findByEmail(String email) {
        // Normalize email to lowercase for case-insensitive lookup
        String normalizedEmail = email?.toLowerCase()?.trim()
        return userRepository.findByEmail(normalizedEmail)
            .orElse(null)
    }

    boolean existsByEmail(String email) {
        // Normalize email to lowercase for case-insensitive lookup
        String normalizedEmail = email?.toLowerCase()?.trim()
        return userRepository.existsByEmail(normalizedEmail)
    }

    User save(User user) {
        return userRepository.save(user)
    }

    User upgradeToOwner(UUID userId) {
        User user = findById(userId)
        user.role = UserRole.OWNER
        return userRepository.save(user)
    }

    User upgradeToEmployee(UUID userId) {
        User user = findById(userId)
        if (user.role == UserRole.USER) {
            user.role = UserRole.EMPLOYEE
        }
        return userRepository.save(user)
    }

    User demoteFromEmployee(UUID userId) {
        User user = findById(userId)
        // Only demote if user is currently an employee and not an owner
        if (user.role == UserRole.EMPLOYEE) {
            user.role = UserRole.USER
        }
        return userRepository.save(user)
    }

    User createAdminUser(String email, String password, String firstName, String lastName, String phone = null) {
        // Normalize email to lowercase for case-insensitive handling
        String normalizedEmail = email?.toLowerCase()?.trim()

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new IllegalArgumentException("User with email $normalizedEmail already exists")
        }

        User user = new User()
        user.email = normalizedEmail
        user.password = passwordEncoder.encode(password)
        user.firstName = firstName
        user.lastName = lastName
        user.phone = phone
        user.avatar = generatePlaceholderAvatar(firstName, lastName)
        user.role = UserRole.ADMIN
        user.emailVerified = true // Admin users are pre-verified
        user.enabled = true

        User savedUser = userRepository.save(user)
        println("Admin user created: ${savedUser.email}")
        return savedUser
    }

    List<User> findByRole(UserRole role) {
        return userRepository.findByRole(role)
    }

    User changePassword(UUID userId, String currentPassword, String newPassword) {
        User user = findById(userId)

        if (!passwordEncoder.matches(currentPassword, user.password)) {
            throw new IllegalArgumentException("Current password is incorrect")
        }

        user.password = passwordEncoder.encode(newPassword)
        return userRepository.save(user)
    }

    /**
     * Disables a user account
     */
    User disableUser(UUID userId) {
        User user = findById(userId)
        user.enabled = false
        user.updatedAt = LocalDateTime.now()
        return userRepository.save(user)
    }

    /**
     * Enables a user account
     */
    User enableUser(UUID userId) {
        User user = findById(userId)
        user.enabled = true
        user.updatedAt = LocalDateTime.now()
        return userRepository.save(user)
    }

    /**
     * Soft delete user by disabling
     */
    void deleteUser(UUID userId) {
        disableUser(userId)
    }

    /**
     * Verifies a user's email
     */
    User verifyEmail(UUID userId) {
        User user = findById(userId)
        user.emailVerified = true
        user.updatedAt = LocalDateTime.now()
        return userRepository.save(user)
    }

    /**
     * Links guest appointments to a user after email verification
     */
    void linkGuestAppointments(User user) {
        List<Appointment> guestAppointments = appointmentRepository.findByGuestEmailAndUserIsNull(user.email)

        guestAppointments.each { appointment ->
            appointment.user = user
            // Keep guest information for audit trail
            appointmentRepository.save(appointment)
        }
    }

    /**
     * Checks if a user can become an employee
     * A user can become an employee if they are not already an employee at any shop
     */
    boolean canUserBecomeEmployee(UUID userId) {
        User user = findById(userId)
        List<Employee> existingEmployeeProfiles = employeeRepository.findByUser(user)
        return existingEmployeeProfiles.isEmpty()
    }

    /**
     * Checks if a user can create a shop
     * A user can create a shop if they don't already own a shop
     */
    boolean canUserCreateShop(UUID userId) {
        User user = findById(userId)
        List<Shop> existingShops = shopRepository.findByOwner(user)
        return existingShops.isEmpty()
    }
}
