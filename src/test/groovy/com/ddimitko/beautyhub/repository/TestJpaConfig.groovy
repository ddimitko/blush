package com.ddimitko.beautyhub.repository

import org.springframework.boot.jdbc.DataSourceBuilder
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Primary
import org.springframework.test.context.ActiveProfiles
import javax.sql.DataSource

@TestConfiguration
@ActiveProfiles(["test"]) 
class TestJpaConfig {

    @Bean
    @Primary
    DataSource dataSource() {
        // Use the same Postgres the CI service provides (or developer's local)
        return DataSourceBuilder.create()
                .url(System.getenv("SPRING_DATASOURCE_URL") ?: "jdbc:postgresql://localhost:5432/beautyhub_test")
                .username(System.getenv("SPRING_DATASOURCE_USERNAME") ?: "postgres")
                .password(System.getenv("SPRING_DATASOURCE_PASSWORD") ?: "postgres")
                .driverClassName("org.postgresql.Driver")
                .build()
    }
}

