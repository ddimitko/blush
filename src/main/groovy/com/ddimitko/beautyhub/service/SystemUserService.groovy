package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.enums.UserRole
import com.ddimitko.beautyhub.repository.UserRepository
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

import jakarta.annotation.PostConstruct

@Service
@Slf4j
class SystemUserService {

    @Autowired
    private UserRepository userRepository

    @Autowired
    private PasswordEncoder passwordEncoder

    private static final String SYSTEM_USER_EMAIL = "system@lunara.internal"
    private static final String SYSTEM_USER_FIRST_NAME = "Lunara"
    private static final String SYSTEM_USER_LAST_NAME = "System"

    private User systemUser

    /**
     * Initialize the system user on application startup
     */
    @PostConstruct
    @Transactional
    void initializeSystemUser() {
        try {
            // Check if system user already exists
            Optional<User> existingSystemUser = userRepository.findByEmail(SYSTEM_USER_EMAIL)
            
            if (existingSystemUser.isPresent()) {
                systemUser = existingSystemUser.get()
                log.info("System user found: ${systemUser.id}")
            } else {
                // Create system user
                systemUser = createSystemUser()
                log.info("System user created: ${systemUser.id}")
            }
        } catch (Exception e) {
            log.error("Failed to initialize system user", e)
            throw new RuntimeException("Failed to initialize system user", e)
        }
    }

    /**
     * Get the system user instance
     */
    User getSystemUser() {
        if (systemUser == null) {
            // Fallback: try to find system user if not initialized
            Optional<User> existingSystemUser = userRepository.findByEmail(SYSTEM_USER_EMAIL)
            if (existingSystemUser.isPresent()) {
                systemUser = existingSystemUser.get()
            } else {
                throw new RuntimeException("System user not initialized")
            }
        }
        return systemUser
    }

    /**
     * Check if a user is the system user
     */
    boolean isSystemUser(User user) {
        if (user == null || systemUser == null) {
            return false
        }
        return user.id.equals(systemUser.id)
    }

    /**
     * Check if a user ID belongs to the system user
     */
    boolean isSystemUser(UUID userId) {
        if (userId == null || systemUser == null) {
            return false
        }
        return userId.equals(systemUser.id)
    }

    /**
     * Create the system user
     */
    private User createSystemUser() {
        User user = new User()
        user.email = SYSTEM_USER_EMAIL
        user.password = passwordEncoder.encode(UUID.randomUUID().toString()) // Random password
        user.firstName = SYSTEM_USER_FIRST_NAME
        user.lastName = SYSTEM_USER_LAST_NAME
        user.role = UserRole.ADMIN
        user.emailVerified = true
        user.enabled = true
        user.onboardingCompleted = true
        user.avatar = generateSystemAvatar()

        return userRepository.save(user)
    }

    /**
     * Generate a system avatar placeholder
     */
    private String generateSystemAvatar() {
        // Create a simple placeholder avatar for the system user
        return "https://ui-avatars.com/api/?name=${SYSTEM_USER_FIRST_NAME}+${SYSTEM_USER_LAST_NAME}&background=BFA054&color=FFFFFF&size=200&rounded=true"
    }

    /**
     * Get display name for system actions
     */
    String getSystemDisplayName() {
        return "Lunara System"
    }

    /**
     * Get system user for automatic appointment progression
     */
    User getSystemUserForAppointmentProgression() {
        return getSystemUser()
    }
}
