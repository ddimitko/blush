package com.ddimitko.beautyhub.config

import io.github.cdimascio.dotenv.Dotenv
import io.github.cdimascio.dotenv.DotenvException
import groovy.util.logging.Slf4j
import org.springframework.context.ApplicationContextInitializer
import org.springframework.context.ConfigurableApplicationContext
import org.springframework.core.env.ConfigurableEnvironment
import org.springframework.core.env.MapPropertySource
import org.springframework.stereotype.Component

/**
 * Configuration class that loads environment variables from .env file
 * This ensures that .env variables are available to Spring Boot
 */
@Component
@Slf4j
class EnvironmentConfig implements ApplicationContextInitializer<ConfigurableApplicationContext> {

    @Override
    void initialize(ConfigurableApplicationContext applicationContext) {
        loadDotenvFile(applicationContext.getEnvironment())
    }

    /**
     * Load .env file and add variables to Spring Environment
     */
    private void loadDotenvFile(ConfigurableEnvironment environment) {
        try {
            log.info("🔧 Loading environment variables from .env file...")

            // Load .env file from project root
            Dotenv dotenv = Dotenv.configure()
                .directory(".")
                .filename(".env")
                .ignoreIfMalformed()
                .ignoreIfMissing()
                .load()

            // Convert dotenv entries to a Map
            Map<String, Object> dotenvMap = new HashMap<>()
            dotenv.entries().forEach { entry ->
                dotenvMap.put(entry.getKey(), entry.getValue())
            }

            // Add to Spring Environment with high priority
            if (!dotenvMap.isEmpty()) {
                MapPropertySource dotenvPropertySource = new MapPropertySource("dotenv", dotenvMap)
                environment.getPropertySources().addFirst(dotenvPropertySource)
                
                log.info("✅ Successfully loaded {} environment variables from .env file", dotenvMap.size())
                
                // Log loaded variables (without sensitive values)
                if (log.isDebugEnabled()) {
                    dotenvMap.keySet().forEach { key ->
                        String value = dotenvMap.get(key).toString()
                        if (isSensitiveKey(key)) {
                            log.debug("  🔐 {}: {}...", key, value.length() > 10 ? value.substring(0, 10) : "***")
                        } else {
                            log.debug("  📝 {}: {}", key, value)
                        }
                    }
                }
            } else {
                log.warn("⚠️ No environment variables found in .env file")
            }

        } catch (DotenvException e) {
            log.warn("⚠️ Could not load .env file: {}", e.getMessage())
            log.info("💡 This is normal if running in production with system environment variables")
        } catch (Exception e) {
            log.error("❌ Error loading .env file: {}", e.getMessage(), e)
        }
    }

    /**
     * Check if a key contains sensitive information
     */
    private boolean isSensitiveKey(String key) {
        String lowerKey = key.toLowerCase()
        return lowerKey.contains("password") ||
               lowerKey.contains("secret") ||
               lowerKey.contains("key") ||
               lowerKey.contains("token") ||
               lowerKey.contains("credential")
    }

    /**
     * Static method to load .env for early initialization
     * This can be called from the main application class
     */
    static void loadEnvironmentVariables() {
        try {
            Dotenv dotenv = Dotenv.configure()
                .directory(".")
                .filename(".env")
                .ignoreIfMalformed()
                .ignoreIfMissing()
                .load()

            // Set system properties so they're available everywhere
            dotenv.entries().forEach { entry ->
                if (System.getProperty(entry.getKey()) == null) {
                    System.setProperty(entry.getKey(), entry.getValue())
                }
            }

            System.out.println("✅ Environment variables loaded from .env file")

        } catch (Exception e) {
            System.err.println("⚠️ Could not load .env file: " + e.getMessage())
        }
    }
}
