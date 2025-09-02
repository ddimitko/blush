package com.ddimitko.beautyhub.controller

import org.springframework.context.annotation.Profile
import org.springframework.web.bind.annotation.CrossOrigin
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/test")
@CrossOrigin(origins = "*", maxAge = 3600)
@Profile(["dev", "development", "test", "local", "default"])
class TestController {

    @GetMapping("/hello")
    Map<String, Object> hello() {
        return [
            message: "Hello from BeautyHub Backend!",
            timestamp: new Date(),
            status: "Backend is running successfully",
            features: [
                "Spring Boot 3+",
                "PostgreSQL Database",
                "Redis Caching",
                "JWT Authentication",
                "WebSocket Support",
                "Stripe Integration Ready",
                "Firebase FCM Ready"
            ]
        ]
    }

    @GetMapping("/health")
    Map<String, Object> health() {
        return [
            status: "UP",
            timestamp: new Date(),
            application: "BeautyHub",
            version: "1.0.0"
        ]
    }
}
