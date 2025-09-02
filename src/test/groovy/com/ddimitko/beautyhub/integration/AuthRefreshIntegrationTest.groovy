package com.ddimitko.beautyhub.integration

import com.ddimitko.beautyhub.config.JwtConfig
import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.enums.UserRole
import com.ddimitko.beautyhub.repository.UserRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles(["test"]) 
class AuthRefreshIntegrationTest extends com.ddimitko.beautyhub.AbstractPostgresTest {

    @Autowired MockMvc mockMvc
    @Autowired UserRepository userRepository
    @Autowired PasswordEncoder passwordEncoder
    @Autowired JwtConfig jwtConfig

    @BeforeEach
    void setup() {
        userRepository.deleteAll()
        def user = new User(
                email: "refreshuser@example.com",
                password: passwordEncoder.encode("P@ssw0rd123"),
                firstName: "Refresh",
                lastName: "User",
                role: UserRole.USER,
                enabled: true,
                emailVerified: true
        )
        userRepository.save(user)
    }

    @Test
    void "refresh token endpoint returns new tokens for valid refresh token"() {
        def refreshToken = jwtConfig.generateRefreshToken("refreshuser@example.com")
        def payload = "{" +
                "\"refreshToken\":\"${refreshToken}\"" +
                "}"

        mockMvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath('$.token').exists())
                .andExpect(jsonPath('$.refreshToken').exists())
                .andExpect(jsonPath('$.email').value('refreshuser@example.com'))
    }

    @Test
    void "refresh token endpoint rejects invalid refresh token"() {
        def payload = '{"refreshToken":"invalid.token.value"}'
        mockMvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath('$.error').value('Token refresh failed'))
    }
}

