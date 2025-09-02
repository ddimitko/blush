package com.ddimitko.beautyhub.config

import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer

@Configuration
class WebConfig implements WebMvcConfigurer {

    @Override
    void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Serve uploaded files from the uploads directory
        String projectRoot = System.getProperty("user.dir")
        String uploadsPath = "file:${projectRoot}/uploads/"

        // Serve files at /uploads/** (direct access)
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadsPath)
                .setCachePeriod(300) // Reduced cache to 5 minutes

        // Serve files at /api/uploads/** (API access)
        registry.addResourceHandler("/api/uploads/**")
                .addResourceLocations(uploadsPath)
                .setCachePeriod(300) // Reduced cache to 5 minutes
    }
}
