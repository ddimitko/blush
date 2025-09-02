package com.ddimitko.beautyhub.controller

import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Profile
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

import jakarta.servlet.http.HttpServletRequest

/**
 * Controller for testing CORS configuration
 * Only available in development and test profiles
 */
@Slf4j
@RestController
@RequestMapping("/api/cors-test")
@Profile(["dev", "development", "test", "local", "default"])
class CorsTestController {

    @Value('${app.cors.allowed-origins}')
    private String allowedOrigins

    @Value('${app.websocket.allowed-origins}')
    private String allowedWebSocketOrigins

    /**
     * Simple GET endpoint to test CORS preflight
     */
    @GetMapping("/simple")
    ResponseEntity<?> simpleGet(HttpServletRequest request) {
        return ResponseEntity.ok([
            message: "CORS test successful",
            timestamp: new Date(),
            origin: request.getHeader("Origin"),
            userAgent: request.getHeader("User-Agent"),
            method: request.getMethod()
        ])
    }

    /**
     * POST endpoint to test CORS with complex requests
     */
    @PostMapping("/complex")
    ResponseEntity<?> complexPost(@RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        return ResponseEntity.ok([
            message: "CORS POST test successful",
            timestamp: new Date(),
            origin: request.getHeader("Origin"),
            userAgent: request.getHeader("User-Agent"),
            method: request.getMethod(),
            receivedBody: body ?: [:]
        ])
    }

    /**
     * OPTIONS endpoint to manually test preflight
     */
    @RequestMapping(value = "/preflight", method = RequestMethod.OPTIONS)
    ResponseEntity<?> preflight(HttpServletRequest request) {
        return ResponseEntity.ok([
            message: "CORS preflight test",
            timestamp: new Date(),
            origin: request.getHeader("Origin"),
            requestMethod: request.getHeader("Access-Control-Request-Method"),
            requestHeaders: request.getHeader("Access-Control-Request-Headers")
        ])
    }

    /**
     * Get current CORS configuration
     */
    @GetMapping("/config")
    ResponseEntity<?> getCorsConfig() {
        return ResponseEntity.ok([
            corsAllowedOrigins: allowedOrigins.split(",").collect { it.trim() },
            websocketAllowedOrigins: allowedWebSocketOrigins.split(",").collect { it.trim() },
            timestamp: new Date()
        ])
    }

    /**
     * Test endpoint that requires authentication
     */
    @GetMapping("/authenticated")
    @PreAuthorize("isAuthenticated()")
    ResponseEntity<?> authenticatedTest(HttpServletRequest request) {
        return ResponseEntity.ok([
            message: "CORS authenticated test successful",
            timestamp: new Date(),
            origin: request.getHeader("Origin"),
            authenticated: true
        ])
    }

    /**
     * Test endpoint with custom headers
     */
    @PostMapping("/custom-headers")
    ResponseEntity<?> customHeaders(
            @RequestHeader(value = "X-Custom-Header", required = false) String customHeader,
            @RequestHeader(value = "X-CSRF-TOKEN", required = false) String csrfToken,
            HttpServletRequest request) {
        
        return ResponseEntity.ok([
            message: "CORS custom headers test successful",
            timestamp: new Date(),
            origin: request.getHeader("Origin"),
            customHeader: customHeader,
            csrfToken: csrfToken != null ? "Present" : "Not present",
            allHeaders: request.getHeaderNames().toList().collectEntries { name ->
                [name, request.getHeader(name)]
            }
        ])
    }
}
