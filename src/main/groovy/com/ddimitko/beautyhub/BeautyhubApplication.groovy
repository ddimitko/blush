package com.ddimitko.beautyhub

import com.ddimitko.beautyhub.config.EnvironmentConfig
import org.springframework.boot.SpringApplication
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.scheduling.annotation.EnableAsync
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
@EnableAsync
class BeautyhubApplication {

    static void main(String[] args) {
        // Load .env file before starting Spring Boot
        EnvironmentConfig.loadEnvironmentVariables()

        // Create Spring Application
        SpringApplication app = new SpringApplication(BeautyhubApplication)

        // Add the environment initializer
        app.addInitializers(new EnvironmentConfig())

        // Set active profiles from environment variable if available
        String activeProfiles = System.getProperty("SPRING_PROFILES_ACTIVE")
        if (activeProfiles) {
            app.setAdditionalProfiles(activeProfiles.split(","))
        }

        // Run the application
        app.run(args)
    }

}
