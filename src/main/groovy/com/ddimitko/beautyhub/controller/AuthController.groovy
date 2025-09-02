package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.config.JwtConfig
import com.ddimitko.beautyhub.dto.LoginRequest
import com.ddimitko.beautyhub.dto.LoginResponse
import com.ddimitko.beautyhub.dto.RefreshTokenRequest
import com.ddimitko.beautyhub.dto.RegisterRequest
import com.ddimitko.beautyhub.dto.ForgotPasswordRequest
import com.ddimitko.beautyhub.dto.ResetPasswordRequest
import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.enums.UserRole
import com.ddimitko.beautyhub.security.CustomUserPrincipal
import com.ddimitko.beautyhub.service.UserService
import com.ddimitko.beautyhub.service.PasswordResetService
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.Authentication
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import org.springframework.security.web.csrf.CsrfToken

import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", maxAge = 3600)
@Slf4j
class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager

    @Autowired
    private UserService userService

    @Autowired
    private JwtConfig jwtConfig

    @Autowired
    private PasswordResetService passwordResetService

    @PostMapping("/login")
    ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            // Normalize email to lowercase for case-insensitive authentication
            String normalizedEmail = loginRequest.email?.toLowerCase()?.trim()

            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    normalizedEmail,
                    loginRequest.password
                )
            )

            SecurityContextHolder.getContext().setAuthentication(authentication)
            CustomUserPrincipal userPrincipal = (CustomUserPrincipal) authentication.getPrincipal()
            String jwt = jwtConfig.generateToken(userPrincipal)
            String refreshToken = jwtConfig.generateRefreshToken(userPrincipal)

            User user = userService.findById(userPrincipal.getId())
            return ResponseEntity.ok(new LoginResponse(
                token: jwt,
                refreshToken: refreshToken,
                type: "Bearer",
                id: userPrincipal.getId(),
                email: userPrincipal.getEmail(),
                firstName: userPrincipal.getFirstName(),
                lastName: userPrincipal.getLastName(),
                avatar: user.avatar,
                roles: userPrincipal.getAuthorities().collect { it.getAuthority() }
            ))
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Invalid credentials",
                message: e.getMessage()
            ])
        }
    }

    @PostMapping("/register")
    ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        try {
            // Normalize email to lowercase for case-insensitive handling
            String normalizedEmail = registerRequest.email?.toLowerCase()?.trim()

            if (userService.existsByEmail(normalizedEmail)) {
                log.warn("Registration attempt with existing email: {}", normalizedEmail)
                return ResponseEntity.badRequest().body([
                    error: "Email is already taken!"
                ])
            }

            log.info("Creating new user with email: {}", normalizedEmail)
            User user = userService.createUser(
                normalizedEmail,
                registerRequest.password,
                registerRequest.firstName,
                registerRequest.lastName,
                registerRequest.phone,
                UserRole.USER
            )

            log.info("User created successfully with ID: {}", user.id)

            // Automatically authenticate the user after registration
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    normalizedEmail,
                    registerRequest.password
                )
            )

            SecurityContextHolder.getContext().setAuthentication(authentication)
            CustomUserPrincipal userPrincipal = (CustomUserPrincipal) authentication.getPrincipal()
            String jwt = jwtConfig.generateToken(userPrincipal)
            String refreshToken = jwtConfig.generateRefreshToken(userPrincipal)

            log.info("User registration and authentication completed for: {}", normalizedEmail)

            return ResponseEntity.ok(new LoginResponse(
                token: jwt,
                refreshToken: refreshToken,
                type: "Bearer",
                id: userPrincipal.getId(),
                email: userPrincipal.getEmail(),
                firstName: userPrincipal.getFirstName(),
                lastName: userPrincipal.getLastName(),
                avatar: user.avatar,
                roles: userPrincipal.getAuthorities().collect { it.getAuthority() }
            ))
        } catch (IllegalArgumentException e) {
            log.warn("Registration validation failed: {}", e.getMessage())
            return ResponseEntity.badRequest().body([
                error: "Registration failed",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Registration failed for email: {}", registerRequest.email, e)
            return ResponseEntity.badRequest().body([
                error: "Registration failed",
                message: "Could not create user account. Please check your information and try again."
            ])
        }
    }



    @PostMapping("/refresh")
    ResponseEntity<?> refreshToken(@Valid @RequestBody RefreshTokenRequest refreshRequest) {
        try {
            String refreshToken = refreshRequest.refreshToken

            if (!refreshToken) {
                return ResponseEntity.status(401).body([
                    error: "No refresh token provided"
                ])
            }

            // Validate refresh token
            if (!jwtConfig.validateRefreshToken(refreshToken)) {
                return ResponseEntity.status(401).body([
                    error: "Invalid or expired refresh token"
                ])
            }

            // Extract username from refresh token
            String userEmail = jwtConfig.extractUsername(refreshToken)
            if (!userEmail) {
                return ResponseEntity.status(401).body([
                    error: "Invalid refresh token - no user email"
                ])
            }

            User user = userService.findByEmail(userEmail)
            if (!user) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body([
                    error: "Invalid refresh token",
                    message: "User not found"
                ])
            }

            // Create new access token and refresh token
            CustomUserPrincipal userPrincipal = CustomUserPrincipal.create(user)
            String newJwt = jwtConfig.generateToken(userPrincipal)
            String newRefreshToken = jwtConfig.generateRefreshToken(userPrincipal)

            return ResponseEntity.ok(new LoginResponse(
                token: newJwt,
                refreshToken: newRefreshToken,
                type: "Bearer",
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar,
                roles: ["ROLE_${user.role.name()}".toString()]
            ))
        } catch (Exception e) {
            log.error("Token refresh failed: ${e.getMessage()}", e)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body([
                error: "Token refresh failed",
                message: "Invalid or expired refresh token"
            ])
        }
    }

    @PostMapping("/refresh-current")
    @PreAuthorize("isAuthenticated()")
    ResponseEntity<?> refreshCurrentUserToken(@AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Get fresh user data from database to ensure we have the latest role information
            User user = userService.findById(userPrincipal.getId())

            // Generate new tokens with fresh user data
            CustomUserPrincipal freshUserPrincipal = CustomUserPrincipal.create(user)
            String newAccessToken = jwtConfig.generateToken(freshUserPrincipal)
            String newRefreshToken = jwtConfig.generateRefreshToken(freshUserPrincipal)

            log.info("Token refreshed for user: ${user.email} with role: ${user.role}")

            return ResponseEntity.ok(new LoginResponse(
                token: newAccessToken,
                refreshToken: newRefreshToken,
                type: "Bearer",
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar,
                roles: freshUserPrincipal.getAuthorities().collect { it.getAuthority() }
            ))

        } catch (Exception e) {
            log.error("Current user token refresh failed: ${e.getMessage()}", e)
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body([
                error: "Token refresh failed",
                message: "Unable to refresh current user token"
            ])
        }
    }

    @GetMapping("/me")
    ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            if (!userPrincipal) {
                return ResponseEntity.status(401).body([
                    error: "No authentication found"
                ])
            }

            User user = userService.findById(userPrincipal.getId())
            if (!user) {
                return ResponseEntity.status(401).body([
                    error: "User not found"
                ])
            }

            if (!user.enabled) {
                return ResponseEntity.status(401).body([
                    error: "User account is disabled"
                ])
            }

            // Return user data in the same format as the User model expected by iOS
            return ResponseEntity.ok([
                id: user.id.toString(),
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
                avatar: user.avatar,
                role: user.role.name(),
                emailVerified: user.emailVerified,
                onboardingCompleted: user.onboardingCompleted,
                createdAt: user.createdAt?.toString(),
                updatedAt: user.updatedAt?.toString()
            ])
        } catch (Exception e) {
            return ResponseEntity.status(401).body([
                error: "Failed to get current user",
                message: e.getMessage()
            ])
        }
    }

    @PostMapping("/validate")
    ResponseEntity<?> validateToken(HttpServletRequest request) {
        try {
            String jwt = getJwtFromRequest(request)

            if (!jwt) {
                return ResponseEntity.status(401).body([
                    valid: false,
                    error: "No token provided"
                ])
            }

            // First check if token is structurally valid and not expired
            if (!jwtConfig.validateToken(jwt)) {
                return ResponseEntity.status(401).body([
                    valid: false,
                    error: "Invalid or expired token"
                ])
            }

            String userEmail = jwtConfig.extractUsername(jwt)
            User user
            try {
                user = userService.findByEmail(userEmail)
                if (!user) {
                    return ResponseEntity.status(401).body([
                        valid: false,
                        error: "User not found"
                    ])
                }
            } catch (RuntimeException e) {
                return ResponseEntity.status(401).body([
                    valid: false,
                    error: "User not found"
                ])
            }

            if (!user.enabled) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body([
                    valid: false,
                    error: "Account disabled",
                    message: "User account is disabled"
                ])
            }

            // Create secure user response without sensitive data
            def secureUserData = [
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar,
                roles: ["ROLE_${user.role.name()}".toString()]
                // Explicitly exclude: password, internal IDs, payment details
            ]

            return ResponseEntity.ok([
                valid: true,
                user: secureUserData
            ])
        } catch (Exception e) {
            log.error("Token validation failed: ${e.getMessage()}", e)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body([
                valid: false,
                error: "Token validation failed",
                message: "Invalid or expired token"
            ])
        }
    }

    @PostMapping("/logout")
    ResponseEntity<?> logoutUser() {
        SecurityContextHolder.clearContext()
        return ResponseEntity.ok([
            message: "User logged out successfully!"
        ])
    }

    @PostMapping("/forgot-password")
    ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        try {
            // Normalize email to lowercase for case-insensitive handling
            String normalizedEmail = request.email?.toLowerCase()?.trim()
            passwordResetService.initiatePasswordReset(normalizedEmail)

            // Always return success to prevent email enumeration
            return ResponseEntity.ok([
                message: "If an account with that email exists, we've sent a password reset link."
            ])
        } catch (Exception e) {
            // Log error but still return success message
            println("Error in forgot password: ${e.getMessage()}")
            return ResponseEntity.ok([
                message: "If an account with that email exists, we've sent a password reset link."
            ])
        }
    }

    @PostMapping("/reset-password")
    ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        try {
            boolean success = passwordResetService.resetPassword(request.token, request.newPassword)

            if (success) {
                return ResponseEntity.ok([
                    message: "Password has been reset successfully. You can now log in with your new password."
                ])
            } else {
                return ResponseEntity.badRequest().body([
                    error: "Invalid or expired reset token"
                ])
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Password reset failed",
                message: e.getMessage()
            ])
        }
    }

    @GetMapping("/validate-reset-token")
    ResponseEntity<?> validateResetToken(@RequestParam String token) {
        try {
            boolean isValid = passwordResetService.validateResetToken(token)

            if (isValid) {
                User user = passwordResetService.getUserByResetToken(token)
                return ResponseEntity.ok([
                    valid: true,
                    email: user?.email
                ])
            } else {
                return ResponseEntity.badRequest().body([
                    valid: false,
                    error: "Invalid or expired reset token"
                ])
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                valid: false,
                error: "Token validation failed"
            ])
        }
    }



    /**
     * Get CSRF token for frontend
     */
    @GetMapping("/csrf")
    ResponseEntity<?> getCsrfToken(HttpServletRequest request) {
        try {
            CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName())
            if (csrfToken) {
                return ResponseEntity.ok([
                    token: csrfToken.getToken(),
                    headerName: csrfToken.getHeaderName(),
                    parameterName: csrfToken.getParameterName()
                ])
            } else {
                return ResponseEntity.ok([
                    message: "CSRF protection is disabled or token not available"
                ])
            }
        } catch (Exception e) {
            log.error("Failed to get CSRF token", e)
            return ResponseEntity.internalServerError().body([
                error: "Failed to get CSRF token",
                message: e.getMessage()
            ])
        }
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization")
        if (bearerToken && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7)
        }
        return null
    }
}
