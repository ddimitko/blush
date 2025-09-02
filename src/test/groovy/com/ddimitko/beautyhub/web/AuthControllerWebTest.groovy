package com.ddimitko.beautyhub.web

import com.ddimitko.beautyhub.config.JwtConfig
import com.ddimitko.beautyhub.controller.AuthController
import com.ddimitko.beautyhub.service.PasswordResetService
import com.ddimitko.beautyhub.service.UserService
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.http.MediaType
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc

import static org.mockito.ArgumentMatchers.any
import static org.mockito.Mockito.when
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

import com.ddimitko.beautyhub.exception.GlobalExceptionHandler
import org.springframework.context.annotation.Import

@WebMvcTest(controllers = [AuthController])
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles(["test"])
@Import([GlobalExceptionHandler])
class AuthControllerWebTest {

    @Autowired MockMvc mockMvc

    @MockBean JwtConfig jwtConfig
    @MockBean UserService userService
    @MockBean PasswordResetService passwordResetService
    @MockBean AuthenticationManager authenticationManager
    @MockBean com.ddimitko.beautyhub.service.MessageService messageService

    @Test
    void "validate endpoint returns 401 when token is invalid"() {
        when(jwtConfig.validateToken(any(String))).thenReturn(false)

        mockMvc.perform(post("/api/auth/validate")
                .header("Authorization", "Bearer faketoken")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath('$.valid').value(false))
    }

    @Test
    void "csrf endpoint returns 200 with message if CSRF disabled or token missing"() {
        mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath('$.message').exists())
    }
}

