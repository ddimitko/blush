package com.ddimitko.beautyhub.config

import com.ddimitko.beautyhub.config.JwtConfig
import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.entity.UserConnection
import com.ddimitko.beautyhub.enums.UserRole
import com.ddimitko.beautyhub.repository.UserConnectionRepository
import com.ddimitko.beautyhub.repository.UserRepository
import groovy.util.logging.Slf4j
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.core.Authentication
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest
import org.springframework.security.oauth2.core.user.OAuth2User
import org.springframework.security.web.authentication.AuthenticationSuccessHandler
import org.springframework.transaction.annotation.Transactional

import java.time.LocalDateTime

@Configuration
@Slf4j
class OAuth2Config {

    @Autowired
    UserRepository userRepository

    @Autowired
    UserConnectionRepository userConnectionRepository

    @Autowired
    JwtConfig jwtConfig

    @Bean
    @ConditionalOnProperty(name = "spring.security.oauth2.client.registration.facebook.client-id")
    DefaultOAuth2UserService oauth2UserService() {
        return new DefaultOAuth2UserService() {
            @Override
            @Transactional
            OAuth2User loadUser(OAuth2UserRequest userRequest) {
                OAuth2User oauth2User = super.loadUser(userRequest)
                
                String registrationId = userRequest.clientRegistration.registrationId
                String providerId = oauth2User.getAttribute("id")
                String email = oauth2User.getAttribute("email")
                String name = oauth2User.getAttribute("name")
                
                log.info("OAuth2 login attempt - Provider: {}, Email: {}", registrationId, email)
                
                // Find or create user connection
                UserConnection connection = userConnectionRepository
                    .findByProviderAndProviderId(registrationId, providerId)
                    .orElse(null)
                
                User user
                if (connection) {
                    // Existing connection
                    user = connection.user
                    log.info("Found existing OAuth2 connection for user: {}", user.email)
                } else {
                    // Check if user exists by email
                    user = userRepository.findByEmail(email).orElse(null)
                    
                    if (!user) {
                        // Create new user
                        String[] nameParts = name?.split(" ") ?: ["", ""]
                        String firstName = nameParts[0] ?: "User"
                        String lastName = nameParts.length > 1 ? nameParts[1] : ""
                        
                        user = new User(
                            firstName: firstName,
                            lastName: lastName,
                            email: email,
                            password: "", // OAuth2 users don't need password
                            role: UserRole.USER,
                            emailVerified: true, // OAuth2 emails are pre-verified
                            enabled: true,
                            provider: registrationId,
                            providerId: providerId
                        )
                        user = userRepository.save(user)
                        log.info("Created new user from OAuth2: {}", email)
                    }
                    
                    // Create connection
                    connection = new UserConnection(
                        user: user,
                        provider: registrationId,
                        providerId: providerId,
                        providerEmail: email,
                        providerName: name,
                        connectedAt: LocalDateTime.now()
                    )
                    userConnectionRepository.save(connection)
                    log.info("Created new OAuth2 connection for user: {}", email)
                }
                
                // Update connection info
                connection.providerEmail = email
                connection.providerName = name
                connection.updatedAt = LocalDateTime.now()
                userConnectionRepository.save(connection)
                
                return oauth2User
            }
        }
    }

    @Bean
    @ConditionalOnProperty(name = "spring.security.oauth2.client.registration.facebook.client-id")
    AuthenticationSuccessHandler oauth2AuthenticationSuccessHandler() {
        return new AuthenticationSuccessHandler() {
            @Override
            void onAuthenticationSuccess(HttpServletRequest request, 
                                       HttpServletResponse response, 
                                       Authentication authentication) {
                OAuth2User oauth2User = (OAuth2User) authentication.principal
                String email = oauth2User.getAttribute("email")
                
                // Find user by email
                User user = userRepository.findByEmail(email).orElse(null)
                if (user) {
                    // Generate JWT token and refresh token
                    String token = jwtConfig.generateToken(user.email)
                    String refreshToken = jwtConfig.generateRefreshToken(user.email)

                    // Redirect to frontend with tokens
                    String frontendUrl = System.getenv("FRONTEND_URL") ?: "https://localhost:3000"
                    String redirectUrl = "${frontendUrl}/auth/oauth2/success?token=${token}&refreshToken=${refreshToken}"

                    response.sendRedirect(redirectUrl)
                    log.info("OAuth2 authentication successful for user: {}", email)
                } else {
                    // Redirect to error page
                    String frontendUrl = System.getenv("FRONTEND_URL") ?: "https://localhost:3000"
                    String redirectUrl = "${frontendUrl}/auth/oauth2/error"
                    response.sendRedirect(redirectUrl)
                    log.error("OAuth2 authentication failed - user not found: {}", email)
                }
            }
        }
    }
}
