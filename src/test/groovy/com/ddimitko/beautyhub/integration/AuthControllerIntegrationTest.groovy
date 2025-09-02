package com.ddimitko.beautyhub.integration

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
class AuthControllerIntegrationTest extends com.ddimitko.beautyhub.AbstractPostgresTest {

    @Autowired
    MockMvc mockMvc

    @Autowired
    UserRepository userRepository

    @Autowired
    PasswordEncoder passwordEncoder

    @BeforeEach
    void setup() {
        userRepository.deleteAll()
        def user = new User(
                email: "authuser@example.com",
                password: passwordEncoder.encode("P@ssw0rd123"),
                firstName: "Auth",
                lastName: "User",
                role: UserRole.USER,
                enabled: true,
                emailVerified: true
        )
        userRepository.save(user)
    }

    @Test
    void "login succeeds with normalized email and valid password"() {
        def payload = '{"email":"AUTHUSER@EXAMPLE.COM","password":"P@ssw0rd123"}'
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath('$.token').exists())
                .andExpect(jsonPath('$.refreshToken').exists())
                .andExpect(jsonPath('$.email').value('authuser@example.com'))
                .andExpect(jsonPath('$.type').value('Bearer'))
    }

    @Test
    void "login fails with invalid password"() {
        def payload = '{"email":"authuser@example.com","password":"wrong"}'
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath('$.error').value('Invalid credentials'))
    }
}

