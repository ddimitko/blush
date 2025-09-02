package com.ddimitko.beautyhub.integration

import com.ddimitko.beautyhub.dto.RegisterRequest
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

import groovy.json.JsonSlurper
import org.springframework.test.context.TestPropertySource

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles(["test"])
@TestPropertySource(properties = [
        "app.jwt.secret=dummy-test-secret-key-min-32-bytes-xxxxxxxxxxxxxx",
        "app.jwt.expiration=3600000",
        "app.jwt.refresh-expiration=604800000"
])
class AuthRegisterAndMeIntegrationTest extends com.ddimitko.beautyhub.AbstractPostgresTest {

    @Autowired
    MockMvc mockMvc

    @Autowired
    UserRepository userRepository

    @Autowired
    PasswordEncoder passwordEncoder

    @BeforeEach
    void setup() {
        userRepository.deleteAll()
    }

    @Test
    void "register user success and then /me returns user data with Bearer token"() {
        def payload = '''{
            "email": "new.user@example.com",
            "password": "GoodPassw0rd",
            "firstName": "New",
            "lastName": "User",
            "phone": "+359888123456"
        }'''

        def mvcResult = mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath('$.token').exists())
                .andReturn()

        def token = new groovy.json.JsonSlurper().parseText(mvcResult.response.contentAsString).token

        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer ${token}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath('$.email').value('new.user@example.com'))
                .andExpect(jsonPath('$.id').exists())
    }

    @Test
    void "register duplicate email returns bad request"() {
        userRepository.save(new User(
                email: "dupe@example.com",
                password: passwordEncoder.encode("P@ssw0rd123"),
                firstName: "Dupe",
                lastName: "User",
                phone: "+359888000000",
                enabled: true
        ))

        def payload = '''{
            "email": "dupe@example.com",
            "password": "GoodPassw0rd",
            "firstName": "Another",
            "lastName": "User",
            "phone": "+359888999999"
        }'''

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath('$.error').value('Email is already taken!'))
    }
}

