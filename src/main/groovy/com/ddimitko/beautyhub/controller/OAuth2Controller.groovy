package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.config.JwtConfig
import com.ddimitko.beautyhub.dto.FacebookAuthRequest
import com.ddimitko.beautyhub.dto.OAuth2AuthResponse
import com.ddimitko.beautyhub.dto.UserConnectionResponse
import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.entity.UserConnection
import com.ddimitko.beautyhub.security.CustomUserPrincipal
import com.ddimitko.beautyhub.service.OAuth2Service
import com.ddimitko.beautyhub.service.EmailService
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*

import jakarta.validation.Valid

@RestController
@RequestMapping("/api/auth/oauth2")
@CrossOrigin(origins = "*", maxAge = 3600)
class OAuth2Controller {

    @Autowired
    private OAuth2Service oAuth2Service

    @Autowired
    private JwtConfig jwtConfig

    @Autowired
    private EmailService emailService

    @PostMapping("/facebook")
    ResponseEntity<?> authenticateWithFacebook(@Valid @RequestBody FacebookAuthRequest request) {
        try {
            Map<String, Object> authResult = oAuth2Service.authenticateWithFacebook(request.accessToken)
            
            User user = authResult.user as User
            boolean isNewUser = authResult.isNewUser as boolean
            String provider = authResult.provider as String

            // Generate JWT token and refresh token
            CustomUserPrincipal userPrincipal = CustomUserPrincipal.create(user)
            String jwt = jwtConfig.generateToken(userPrincipal)
            String refreshToken = jwtConfig.generateRefreshToken(userPrincipal)

            OAuth2AuthResponse response = new OAuth2AuthResponse(
                jwt,
                refreshToken,
                user.id,
                user.email,
                user.firstName,
                user.lastName,
                user.phone,
                user.avatar,
                ["ROLE_${user.role.name()}".toString()],
                isNewUser,
                provider
            )

            // Send welcome email for new users (after transaction is committed)
            if (isNewUser) {
                try {
                    emailService.sendWelcomeEmail(user)
                } catch (Exception e) {
                    // Log error but don't fail the authentication
                    println("Warning: Failed to send welcome email to ${user.email}: ${e.getMessage()}")
                }
            }

            return ResponseEntity.ok(response)

        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Facebook authentication failed",
                message: e.getMessage()
            ])
        }
    }

    @PostMapping("/google")
    ResponseEntity<?> authenticateWithGoogle(@RequestBody Map<String, String> request) {
        try {
            String accessToken = request.accessToken

            if (!accessToken) {
                return ResponseEntity.badRequest().body([
                    error: "Access token is required"
                ])
            }

            Map<String, Object> authResult = oAuth2Service.authenticateWithGoogle(accessToken)

            User user = authResult.user as User
            boolean isNewUser = authResult.isNewUser as boolean
            String provider = authResult.provider as String

            // Generate JWT token and refresh token
            CustomUserPrincipal userPrincipal = CustomUserPrincipal.create(user)
            String jwt = jwtConfig.generateToken(userPrincipal)
            String refreshToken = jwtConfig.generateRefreshToken(userPrincipal)

            OAuth2AuthResponse response = new OAuth2AuthResponse(
                jwt,
                refreshToken,
                user.id,
                user.email,
                user.firstName,
                user.lastName,
                user.phone,
                user.avatar,
                ["ROLE_${user.role.name()}".toString()],
                isNewUser,
                provider
            )

            // Send welcome email for new users (after transaction is committed)
            if (isNewUser) {
                try {
                    emailService.sendWelcomeEmail(user)
                } catch (Exception e) {
                    // Log error but don't fail the authentication
                    println("Warning: Failed to send welcome email to ${user.email}: ${e.getMessage()}")
                }
            }

            return ResponseEntity.ok(response)

        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Google authentication failed",
                message: e.getMessage()
            ])
        }
    }

    @GetMapping("/connections")
    ResponseEntity<?> getUserConnections(Authentication authentication) {
        try {
            CustomUserPrincipal userPrincipal = (CustomUserPrincipal) authentication.getPrincipal()
            List<UserConnection> connections = oAuth2Service.getUserConnections(userPrincipal.getId())
            
            List<UserConnectionResponse> response = connections.collect { connection ->
                new UserConnectionResponse(
                    connection.id,
                    connection.provider,
                    connection.providerId,
                    connection.providerEmail,
                    connection.providerName,
                    connection.connectedAt
                )
            }

            return ResponseEntity.ok(response)

        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to get user connections",
                message: e.getMessage()
            ])
        }
    }

    @PostMapping("/connect/{provider}")
    ResponseEntity<?> connectProvider(@PathVariable("provider") String provider,
                                    @RequestBody Map<String, String> request,
                                    Authentication authentication) {
        try {
            CustomUserPrincipal userPrincipal = (CustomUserPrincipal) authentication.getPrincipal()
            String accessToken = request.accessToken

            if (!accessToken) {
                return ResponseEntity.badRequest().body([
                    error: "Access token is required"
                ])
            }

            UserConnection connection = oAuth2Service.connectProvider(
                userPrincipal.getId(), 
                provider, 
                accessToken
            )

            UserConnectionResponse response = new UserConnectionResponse(
                connection.id,
                connection.provider,
                connection.providerId,
                connection.providerEmail,
                connection.providerName,
                connection.connectedAt
            )

            return ResponseEntity.ok([
                message: "Provider connected successfully",
                connection: response
            ])

        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to connect provider",
                message: e.getMessage()
            ])
        }
    }

    @DeleteMapping("/disconnect/{provider}")
    ResponseEntity<?> disconnectProvider(@PathVariable("provider") String provider,
                                       Authentication authentication) {
        try {
            CustomUserPrincipal userPrincipal = (CustomUserPrincipal) authentication.getPrincipal()
            
            oAuth2Service.disconnectProvider(userPrincipal.getId(), provider)

            return ResponseEntity.ok([
                message: "Provider disconnected successfully"
            ])

        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to disconnect provider",
                message: e.getMessage()
            ])
        }
    }
}
