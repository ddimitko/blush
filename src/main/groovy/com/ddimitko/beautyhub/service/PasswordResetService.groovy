package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.repository.UserRepository
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.redis.core.RedisTemplate
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service

import java.security.SecureRandom
import java.time.Duration
import java.util.concurrent.TimeUnit

@Service
@Slf4j
class PasswordResetService {

    @Autowired
    private UserRepository userRepository

    @Autowired
    private EmailService emailService

    @Autowired
    private RedisTemplate<String, String> redisTemplate

    @Autowired
    private PasswordEncoder passwordEncoder

    private static final String RESET_TOKEN_PREFIX = "password_reset:"
    private static final int TOKEN_LENGTH = 32
    private static final Duration TOKEN_EXPIRY = Duration.ofHours(24)

    /**
     * Initiate password reset process
     */
    void initiatePasswordReset(String email) {
        log.info("Initiating password reset for email: ${email}")
        
        User user = userRepository.findByEmail(email).orElse(null)
        if (!user) {
            log.warn("Password reset requested for non-existent email: ${email}")
            // Don't reveal whether email exists or not for security
            return
        }

        // Generate secure reset token
        String resetToken = generateSecureToken()
        
        // Store token in Redis with expiration
        String redisKey = RESET_TOKEN_PREFIX + resetToken
        redisTemplate.opsForValue().set(redisKey, user.id.toString(), TOKEN_EXPIRY.toMinutes(), TimeUnit.MINUTES)
        
        // Send password reset email
        emailService.sendPasswordResetEmail(user, resetToken)
        
        log.info("Password reset token generated and email sent for user: ${user.id}")
    }

    /**
     * Validate password reset token
     */
    boolean validateResetToken(String token) {
        if (!token) {
            return false
        }
        
        String redisKey = RESET_TOKEN_PREFIX + token
        String userId = redisTemplate.opsForValue().get(redisKey)
        return userId != null
    }

    /**
     * Reset password using token
     */
    boolean resetPassword(String token, String newPassword) {
        log.info("Attempting password reset with token")
        
        if (!token || !newPassword) {
            log.warn("Invalid token or password provided for reset")
            return false
        }

        String redisKey = RESET_TOKEN_PREFIX + token
        String userIdStr = redisTemplate.opsForValue().get(redisKey)
        
        if (!userIdStr) {
            log.warn("Invalid or expired reset token used")
            return false
        }

        try {
            UUID userId = UUID.fromString(userIdStr)
            User user = userRepository.findById(userId).orElse(null)
            
            if (!user) {
                log.error("User not found for valid reset token: ${userId}")
                return false
            }

            // Update password
            user.password = passwordEncoder.encode(newPassword)
            userRepository.save(user)
            
            // Remove used token from Redis
            redisTemplate.delete(redisKey)
            
            log.info("Password successfully reset for user: ${userId}")
            return true
            
        } catch (Exception e) {
            log.error("Error resetting password", e)
            return false
        }
    }

    /**
     * Get user by reset token (for validation purposes)
     */
    User getUserByResetToken(String token) {
        if (!token) {
            return null
        }
        
        String redisKey = RESET_TOKEN_PREFIX + token
        String userIdStr = redisTemplate.opsForValue().get(redisKey)
        
        if (!userIdStr) {
            return null
        }

        try {
            UUID userId = UUID.fromString(userIdStr)
            return userRepository.findById(userId).orElse(null)
        } catch (Exception e) {
            log.error("Error getting user by reset token", e)
            return null
        }
    }

    /**
     * Generate cryptographically secure random token
     */
    private String generateSecureToken() {
        SecureRandom random = new SecureRandom()
        byte[] bytes = new byte[TOKEN_LENGTH]
        random.nextBytes(bytes)
        
        StringBuilder token = new StringBuilder()
        for (byte b : bytes) {
            token.append(String.format("%02x", b & 0xff))
        }
        
        return token.toString()
    }

    /**
     * Clean up expired tokens (can be called by scheduled task)
     */
    void cleanupExpiredTokens() {
        log.info("Cleaning up expired password reset tokens")
        // Redis automatically handles expiration, but we can add manual cleanup if needed
        // This method is here for potential future use
    }
}
