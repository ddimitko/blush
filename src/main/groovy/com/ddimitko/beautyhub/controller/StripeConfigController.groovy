package com.ddimitko.beautyhub.controller

import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@Slf4j
@RestController
@RequestMapping("/api/stripe")
@CrossOrigin(origins = "*", maxAge = 3600)
class StripeConfigController {

    @Autowired
    private String stripePublishableKey

    @GetMapping("/publishable-key")
    ResponseEntity<?> getPublishableKey() {
        try {
            return ResponseEntity.ok([
                publishableKey: stripePublishableKey
            ])
        } catch (Exception e) {
            log.error("Failed to retrieve Stripe publishable key", e)
            return ResponseEntity.status(500).body([
                error: "Failed to retrieve Stripe configuration",
                message: e.getMessage()
            ])
        }
    }
}
