package com.ddimitko.beautyhub

import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.BeforeAll
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.DockerClientFactory
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Testcontainers

@Testcontainers
abstract class AbstractPostgresTest {

    static PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("beautyhub_test")
            .withUsername("postgres")
            .withPassword("postgres")

    @BeforeAll
    static void startContainer() {
        // Attempt to start container; if Docker not available, skip the tests via assumption
        if (!DockerClientFactory.instance().isDockerAvailable()) {
            throw new org.opentest4j.TestAbortedException("Docker not available for Testcontainers")
        }
        POSTGRES.start()
    }

    @AfterAll
    static void stopContainer() {
        POSTGRES.stop()
    }

    @DynamicPropertySource
    static void registerProps(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl)
        registry.add("spring.datasource.username", POSTGRES::getUsername)
        registry.add("spring.datasource.password", POSTGRES::getPassword)
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver")
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop")
    }
}

