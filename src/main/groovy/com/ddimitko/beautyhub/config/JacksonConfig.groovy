package com.ddimitko.beautyhub.config

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.datatype.hibernate6.Hibernate6Module
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateTimeSerializer
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateTimeDeserializer
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Primary
import org.springframework.context.annotation.Role
import org.springframework.beans.factory.config.BeanDefinition

import java.time.format.DateTimeFormatter
import java.time.LocalDateTime
import java.util.TimeZone

@Configuration
class JacksonConfig {

    @Bean
    @Primary
    @Role(BeanDefinition.ROLE_INFRASTRUCTURE)
    ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper()

        // Register Hibernate module to handle lazy loading and proxies
        Hibernate6Module hibernateModule = new Hibernate6Module()
        hibernateModule.configure(Hibernate6Module.Feature.FORCE_LAZY_LOADING, false)
        hibernateModule.configure(Hibernate6Module.Feature.USE_TRANSIENT_ANNOTATION, false)
        hibernateModule.configure(Hibernate6Module.Feature.SERIALIZE_IDENTIFIER_FOR_LAZY_NOT_LOADED_OBJECTS, true)
        mapper.registerModule(hibernateModule)

        // Register Java Time module with custom datetime formatting
        JavaTimeModule javaTimeModule = new JavaTimeModule()

        // Configure LocalDateTime serialization to include timezone info (UTC)
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'")
        javaTimeModule.addSerializer(LocalDateTime.class, new LocalDateTimeSerializer(formatter))

        mapper.registerModule(javaTimeModule)

        // Configure serialization features
        mapper.configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false)
        mapper.configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)

        // Set timezone to UTC
        mapper.setTimeZone(TimeZone.getTimeZone("UTC"))

        return mapper
    }

    /**
     * Set the default timezone for the application
     */
    static {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"))
    }
}
