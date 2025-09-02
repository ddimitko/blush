package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.service.StripeCustomerService
import com.ddimitko.beautyhub.security.CustomUserPrincipal
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@Slf4j
@RestController
@RequestMapping("/api/user/payment-methods")
@CrossOrigin(origins = "*", maxAge = 3600)
class UserPaymentMethodController {

    @Autowired
    private StripeCustomerService stripeCustomerService

    /**
     * Get all payment methods for the authenticated user
     */
    @GetMapping
    ResponseEntity<?> getUserPaymentMethods(@AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            log.info("Getting payment methods for user: ${userPrincipal.getId()}")

            List<Map<String, Object>> paymentMethods = stripeCustomerService.getUserPaymentMethods(userPrincipal.getId())

            return ResponseEntity.ok([
                success: true,
                paymentMethods: paymentMethods
            ])

        } catch (Exception e) {
            log.error("Failed to get payment methods for user ${userPrincipal.getId()}: ${e.message}", e)
            return ResponseEntity.status(500).body([
                error: "Failed to retrieve payment methods",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Get the default payment method for the authenticated user
     */
    @GetMapping("/default")
    ResponseEntity<?> getDefaultPaymentMethod(@AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            log.info("Getting default payment method for user: ${userPrincipal.getId()}")

            Map<String, Object> defaultPaymentMethod = stripeCustomerService.getDefaultPaymentMethod(userPrincipal.getId())

            return ResponseEntity.ok([
                success: true,
                defaultPaymentMethod: defaultPaymentMethod
            ])

        } catch (Exception e) {
            log.error("Failed to get default payment method for user ${userPrincipal.getId()}: ${e.message}", e)
            return ResponseEntity.status(500).body([
                error: "Failed to retrieve default payment method",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Create a setup intent for adding a new payment method
     */
    @PostMapping("/setup-intent")
    ResponseEntity<?> createSetupIntent(@AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            log.info("Creating setup intent for user: ${userPrincipal.getId()}")
            
            Map<String, Object> setupIntent = stripeCustomerService.createSetupIntent(userPrincipal.getId())
            
            return ResponseEntity.ok([
                success: true,
                setupIntent: setupIntent
            ])
            
        } catch (Exception e) {
            log.error("Failed to create setup intent for user ${userPrincipal.getId()}: ${e.message}", e)
            return ResponseEntity.status(500).body([
                error: "Failed to create setup intent",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Remove a payment method
     */
    @DeleteMapping("/{paymentMethodId}")
    ResponseEntity<?> removePaymentMethod(
        @AuthenticationPrincipal CustomUserPrincipal userPrincipal,
        @PathVariable("paymentMethodId") String paymentMethodId
    ) {
        try {
            log.info("Removing payment method ${paymentMethodId} for user: ${userPrincipal.getId()}")
            
            stripeCustomerService.detachPaymentMethod(userPrincipal.getId(), paymentMethodId)
            
            return ResponseEntity.ok([
                success: true,
                message: "Payment method removed successfully"
            ])
            
        } catch (Exception e) {
            log.error("Failed to remove payment method ${paymentMethodId} for user ${userPrincipal.getId()}: ${e.message}", e)
            return ResponseEntity.status(500).body([
                error: "Failed to remove payment method",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Set a payment method as default
     */
    @PutMapping("/{paymentMethodId}/set-default")
    ResponseEntity<?> setDefaultPaymentMethod(
        @AuthenticationPrincipal CustomUserPrincipal userPrincipal,
        @PathVariable("paymentMethodId") String paymentMethodId
    ) {
        try {
            log.info("Setting default payment method ${paymentMethodId} for user: ${userPrincipal.getId()}")

            stripeCustomerService.setDefaultPaymentMethod(userPrincipal.getId(), paymentMethodId)

            return ResponseEntity.ok([
                success: true,
                message: "Default payment method set successfully"
            ])

        } catch (Exception e) {
            log.error("Failed to set default payment method ${paymentMethodId} for user ${userPrincipal.getId()}: ${e.message}", e)
            return ResponseEntity.status(500).body([
                error: "Failed to set default payment method",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Check if a card fingerprint already exists (for duplicate prevention)
     */
    @PostMapping("/check-duplicate")
    ResponseEntity<?> checkDuplicateCard(
        @AuthenticationPrincipal CustomUserPrincipal userPrincipal,
        @RequestBody Map<String, String> request
    ) {
        try {
            String fingerprint = request.get("fingerprint")
            if (!fingerprint) {
                return ResponseEntity.badRequest().body([
                    error: "Missing fingerprint",
                    message: "Card fingerprint is required"
                ])
            }

            boolean isDuplicate = stripeCustomerService.isDuplicateCard(userPrincipal.getId(), fingerprint)

            return ResponseEntity.ok([
                success: true,
                isDuplicate: isDuplicate
            ])

        } catch (Exception e) {
            log.error("Failed to check duplicate card for user ${userPrincipal.getId()}: ${e.message}", e)
            return ResponseEntity.status(500).body([
                error: "Failed to check duplicate card",
                message: e.getMessage()
            ])
        }
    }
}
