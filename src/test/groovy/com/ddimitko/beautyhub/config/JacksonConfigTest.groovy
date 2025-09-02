package com.ddimitko.beautyhub.config

import org.junit.jupiter.api.Test

import static org.assertj.core.api.Assertions.assertThat

class JacksonConfigTest {

    @Test
    void "object mapper is configured with UTC and disables timestamps"() {
        def mapper = new JacksonConfig().objectMapper()
        assertThat(mapper.getSerializationConfig().getTimeZone().getID()).isEqualTo("UTC")
        assertThat(mapper.isEnabled(com.fasterxml.jackson.databind.SerializationFeature.FAIL_ON_EMPTY_BEANS)).isFalse()
        assertThat(mapper.isEnabled(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)).isFalse()
    }
}

