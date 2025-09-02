package com.ddimitko.beautyhub.integration

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.BeforeEach
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.setup.MockMvcBuilders

import com.ddimitko.beautyhub.controller.TestController

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

class SmokeIntegrationTest {

    MockMvc mockMvc

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(new TestController()).build()
    }

    @Test
    void "test hello endpoint is reachable in test profile"() {
        mockMvc.perform(get("/api/test/hello").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath('$.message').exists())
    }

    @Test
    void "test health endpoint exists on TestController for test profile only"() {
        mockMvc.perform(get("/api/test/health").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath('$.status').value('UP'))
    }
}

