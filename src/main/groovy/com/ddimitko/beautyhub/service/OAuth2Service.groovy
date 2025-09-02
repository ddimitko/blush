package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.entity.UserConnection
import com.ddimitko.beautyhub.enums.UserRole
import com.ddimitko.beautyhub.repository.UserConnectionRepository
import com.ddimitko.beautyhub.repository.UserRepository
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.client.RestTemplate
import org.springframework.web.client.HttpClientErrorException

@Slf4j
@Service
class OAuth2Service {

    @Autowired
    private UserService userService

    @Autowired
    private UserConnectionRepository userConnectionRepository

    @Autowired
    private UserRepository userRepository

    @Autowired
    private PasswordEncoder passwordEncoder

    @Autowired
    private EmailService emailService

    private final RestTemplate restTemplate = new RestTemplate()
    private final ObjectMapper objectMapper = new ObjectMapper()

    /**
     * Authenticate user with Facebook
     */
    @Transactional
    Map<String, Object> authenticateWithFacebook(String accessToken) {
        try {
            // Verify token and get user info from Facebook
            Map<String, Object> facebookUser = getFacebookUserInfo(accessToken)
            
            String email = facebookUser.email
            String facebookId = facebookUser.id
            String firstName = facebookUser.first_name ?: ""
            String lastName = facebookUser.last_name ?: ""
            String avatarUrl = facebookUser.picture?.data?.url

            // Check if user connection already exists
            Optional<UserConnection> existingConnection = userConnectionRepository
                .findByProviderAndProviderId("facebook", facebookId)

            User user
            boolean isNewUser = false

            if (existingConnection.isPresent()) {
                // User already connected with Facebook
                user = existingConnection.get().user
            } else {
                // Check if user exists by email
                User existingUser = userService.findByEmail(email)
                
                if (existingUser) {
                    // Link Facebook account to existing user
                    user = existingUser
                    createUserConnection(user, "facebook", facebookId, email, 
                                       "${firstName} ${lastName}".trim(), avatarUrl)
                } else {
                    // Create new user account
                    user = createUserFromFacebookData(email, firstName, lastName, avatarUrl)
                    createUserConnection(user, "facebook", facebookId, email, 
                                       "${firstName} ${lastName}".trim(), avatarUrl)
                    isNewUser = true
                }
            }

            return [
                user: user,
                isNewUser: isNewUser,
                provider: "facebook"
            ]

        } catch (Exception e) {
            throw new IllegalArgumentException("Facebook authentication failed: ${e.getMessage()}")
        }
    }

    /**
     * Authenticate user with Google
     */
    @Transactional
    Map<String, Object> authenticateWithGoogle(String accessToken) {
        try {
            // Verify token and get user info from Google
            Map<String, Object> googleUser = getGoogleUserInfo(accessToken)

            String email = googleUser.email
            String googleId = googleUser.id
            String firstName = googleUser.given_name ?: ""
            String lastName = googleUser.family_name ?: ""
            String avatarUrl = googleUser.picture

            // Check if user connection already exists
            Optional<UserConnection> existingConnection = userConnectionRepository
                .findByProviderAndProviderId("google", googleId)

            User user
            boolean isNewUser = false

            if (existingConnection.isPresent()) {
                // User already connected with Google
                user = existingConnection.get().user
            } else {
                // Check if user exists by email
                User existingUser = userService.findByEmail(email)

                if (existingUser) {
                    // Link Google account to existing user
                    user = existingUser
                    createUserConnection(user, "google", googleId, email,
                                       "${firstName} ${lastName}".trim(), avatarUrl)
                } else {
                    // Create new user account
                    user = createUserFromGoogleData(email, firstName, lastName, avatarUrl)
                    createUserConnection(user, "google", googleId, email,
                                       "${firstName} ${lastName}".trim(), avatarUrl)
                    isNewUser = true
                }
            }

            return [
                user: user,
                isNewUser: isNewUser,
                provider: "google"
            ]

        } catch (Exception e) {
            throw new IllegalArgumentException("Google authentication failed: ${e.getMessage()}")
        }
    }

    /**
     * Get user information from Facebook Graph API
     */
    private Map<String, Object> getFacebookUserInfo(String accessToken) {
        try {
            String url = "https://graph.facebook.com/me?fields=id,email,first_name,last_name,picture&access_token=${accessToken}"
            String response = restTemplate.getForObject(url, String.class)
            
            JsonNode jsonNode = objectMapper.readTree(response)
            
            if (jsonNode.has("error")) {
                throw new IllegalArgumentException("Invalid Facebook access token")
            }

            return objectMapper.convertValue(jsonNode, Map.class)
            
        } catch (HttpClientErrorException e) {
            throw new IllegalArgumentException("Failed to verify Facebook token: ${e.getMessage()}")
        }
    }

    /**
     * Get user information from Google OAuth2 API
     */
    private Map<String, Object> getGoogleUserInfo(String accessToken) {
        try {
            String url = "https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}"
            String response = restTemplate.getForObject(url, String.class)

            JsonNode jsonNode = objectMapper.readTree(response)

            if (jsonNode.has("error")) {
                throw new IllegalArgumentException("Invalid Google access token")
            }

            return objectMapper.convertValue(jsonNode, Map.class)

        } catch (HttpClientErrorException e) {
            throw new IllegalArgumentException("Failed to verify Google token: ${e.getMessage()}")
        }
    }

    /**
     * Create a new user from Facebook data
     */
    private User createUserFromFacebookData(String email, String firstName, String lastName, String avatarUrl) {
        // Generate a random password for OAuth users (they won't use it)
        String randomPassword = UUID.randomUUID().toString()

        // Create user directly without separate transaction to ensure atomicity
        User user = new User()
        user.email = email
        user.password = passwordEncoder.encode(randomPassword)
        user.firstName = firstName
        user.lastName = lastName
        user.phone = null // OAuth users don't provide phone initially
        user.role = UserRole.USER

        // Set avatar if provided by Facebook
        if (avatarUrl) {
            user.avatar = avatarUrl
        } else {
            // Generate placeholder avatar using initials
            user.avatar = generatePlaceholderAvatar(firstName, lastName)
        }

        User savedUser = userRepository.save(user)

        return savedUser
    }

    /**
     * Create a new user from Google data
     */
    private User createUserFromGoogleData(String email, String firstName, String lastName, String avatarUrl) {
        // Generate a random password for OAuth users (they won't use it)
        String randomPassword = UUID.randomUUID().toString()

        // Create user directly without separate transaction to ensure atomicity
        User user = new User()
        user.email = email
        user.password = passwordEncoder.encode(randomPassword)
        user.firstName = firstName
        user.lastName = lastName
        user.phone = null // OAuth users don't provide phone initially
        user.role = UserRole.USER

        // Set avatar if provided by Google
        if (avatarUrl) {
            user.avatar = avatarUrl
        } else {
            // Generate placeholder avatar using initials
            user.avatar = generatePlaceholderAvatar(firstName, lastName)
        }

        User savedUser = userRepository.save(user)

        return savedUser
    }

    /**
     * Create a user connection record
     */
    private UserConnection createUserConnection(User user, String provider, String providerId, 
                                              String providerEmail, String providerName, String providerAvatar) {
        UserConnection connection = new UserConnection()
        connection.user = user
        connection.provider = provider
        connection.providerId = providerId
        connection.providerEmail = providerEmail
        connection.providerName = providerName
        connection.providerAvatar = providerAvatar
        
        return userConnectionRepository.save(connection)
    }

    /**
     * Get user connections
     */
    List<UserConnection> getUserConnections(UUID userId) {
        return userConnectionRepository.findByUserId(userId)
    }

    /**
     * Disconnect a provider from user account
     */
    @Transactional
    void disconnectProvider(UUID userId, String provider) {
        userConnectionRepository.deleteByUserIdAndProvider(userId, provider)
    }

    /**
     * Connect a provider to existing user account
     */
    @Transactional
    UserConnection connectProvider(UUID userId, String provider, String accessToken) {
        User user = userService.findById(userId)
        
        if (provider == "facebook") {
            Map<String, Object> facebookUser = getFacebookUserInfo(accessToken)
            String facebookId = facebookUser.id
            String email = facebookUser.email
            String firstName = facebookUser.first_name ?: ""
            String lastName = facebookUser.last_name ?: ""
            String avatarUrl = facebookUser.picture?.data?.url
            
            // Check if this Facebook account is already connected to another user
            if (userConnectionRepository.existsByProviderAndProviderId("facebook", facebookId)) {
                throw new IllegalArgumentException("This Facebook account is already connected to another user")
            }
            
            return createUserConnection(user, "facebook", facebookId, email,
                                     "${firstName} ${lastName}".trim(), avatarUrl)
        } else if (provider == "google") {
            Map<String, Object> googleUser = getGoogleUserInfo(accessToken)
            String googleId = googleUser.id
            String email = googleUser.email
            String firstName = googleUser.given_name ?: ""
            String lastName = googleUser.family_name ?: ""
            String avatarUrl = googleUser.picture

            // Check if this Google account is already connected to another user
            if (userConnectionRepository.existsByProviderAndProviderId("google", googleId)) {
                throw new IllegalArgumentException("This Google account is already connected to another user")
            }

            return createUserConnection(user, "google", googleId, email,
                                     "${firstName} ${lastName}".trim(), avatarUrl)
        }

        throw new IllegalArgumentException("Unsupported provider: ${provider}")
    }

    /**
     * Generate placeholder avatar using user initials
     */
    private String generatePlaceholderAvatar(String firstName, String lastName) {
        String initials = ""
        if (firstName) {
            initials += firstName.charAt(0).toUpperCase()
        }
        if (lastName) {
            initials += lastName.charAt(0).toUpperCase()
        }
        if (!initials) {
            initials = "U" // Default to "U" for User
        }

        // Generate a simple placeholder avatar URL with initials
        return "https://ui-avatars.com/api/?name=${initials}&background=BFA054&color=fff&size=200"
    }
}
