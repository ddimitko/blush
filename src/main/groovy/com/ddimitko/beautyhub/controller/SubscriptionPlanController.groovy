package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.dto.SubscriptionPlanResponse
import com.ddimitko.beautyhub.service.StripeProductService
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/subscription-plans")
@CrossOrigin(origins = "*", maxAge = 3600)
class SubscriptionPlanController {

    @Autowired
    private StripeProductService stripeProductService

    @GetMapping
    ResponseEntity<?> getAvailableSubscriptionPlans() {
        try {
            List<SubscriptionPlanResponse> plans = stripeProductService.getAvailableSubscriptionPlans()
            return ResponseEntity.ok([
                plans: plans,
                message: "Subscription plans retrieved successfully",
                count: plans.size()
            ])
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body([
                error: "Failed to fetch subscription plans",
                message: e.getMessage()
            ])
        }
    }

    @GetMapping("/{priceId}")
    ResponseEntity<?> getSubscriptionPlanByPriceId(@PathVariable("priceId") String priceId) {
        try {
            SubscriptionPlanResponse plan = stripeProductService.getSubscriptionPlanByPriceId(priceId)
            if (plan) {
                return ResponseEntity.ok([
                    plan: plan,
                    message: "Subscription plan retrieved successfully"
                ])
            } else {
                return ResponseEntity.notFound().build()
            }
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body([
                error: "Failed to fetch subscription plan",
                message: e.getMessage()
            ])
        }
    }

    @PostMapping("/setup-defaults")
    ResponseEntity<?> setupDefaultPlans() {
        try {
            stripeProductService.createDefaultSubscriptionPlans()
            return ResponseEntity.ok([
                message: "Default subscription plans created successfully"
            ])
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body([
                error: "Failed to create default plans",
                message: e.getMessage()
            ])
        }
    }
}
