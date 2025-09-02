package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.dto.*
import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.enums.BusinessType
import com.ddimitko.beautyhub.security.CustomUserPrincipal
import com.ddimitko.beautyhub.service.ShopService
import com.ddimitko.beautyhub.service.StripeService
import com.ddimitko.beautyhub.service.SubscriptionManagementService
import com.ddimitko.beautyhub.service.UserService
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/subscriptions")
@CrossOrigin(origins = "*", maxAge = 3600)
@Slf4j
class SubscriptionController {

    @Autowired
    private StripeService stripeService

    @Autowired
    private SubscriptionManagementService subscriptionManagementService

    @Autowired
    private ShopService shopService

    @Autowired
    private UserService userService

    @PostMapping("/shops/{shopId}/setup-payment-intent")
    @PreAuthorize("isAuthenticated()")
    ResponseEntity<?> createSubscriptionSetupPaymentIntent(
            @PathVariable("shopId") UUID shopId,
            @Valid @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only create subscription setup payment intents for your own shops"
                ])
            }

            Map<String, Object> result = stripeService.createSubscriptionSetupPaymentIntent(shopId, request)
            return ResponseEntity.ok(result)
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Invalid request",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to create subscription setup payment intent",
                message: e.getMessage()
            ])
        }
    }

    @PostMapping("/shops/{shopId}/intent")
    @PreAuthorize("isAuthenticated()")
    ResponseEntity<?> createSubscriptionIntent(
            @PathVariable("shopId") UUID shopId,
            @Valid @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only create subscription intents for your own shops"
                ])
            }

            // Create subscription intent for Payment Element
            def response = stripeService.createSubscriptionIntent(shopId, request)
            return ResponseEntity.ok(response)
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Subscription intent creation failed",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Subscription intent creation failed",
                message: "An unexpected error occurred: ${e.getMessage()}"
            ])
        }
    }

    @PostMapping("/shops/{shopId}")
    @PreAuthorize("isAuthenticated()")
    ResponseEntity<?> createSubscription(
            @PathVariable("shopId") UUID shopId,
            @Valid @RequestBody SubscriptionRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Debug logging
            log.info("Received subscription request for shopId: {}", shopId)
            log.info("Request stripePriceId: '{}'", request.stripePriceId)
            log.info("Request customerName: '{}'", request.customerName)
            log.info("Request customerEmail: '{}'", request.customerEmail)
            log.info("Request billingCity: '{}'", request.billingCity)
            log.info("Request termsAccepted: '{}'", request.termsAccepted)
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only create subscriptions for your own shops"
                ])
            }

            SubscriptionResponse response = stripeService.createSubscription(shopId, request)
            return ResponseEntity.ok(response)
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Subscription creation failed",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Subscription creation failed",
                message: "An unexpected error occurred: ${e.getMessage()}"
            ])
        }
    }

    @PostMapping("/shops/{shopId}/payment-intent")
    @PreAuthorize("isAuthenticated()")
    ResponseEntity<?> createPaymentIntent(
            @PathVariable("shopId") UUID shopId,
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only create payment intents for your own shops"
                ])
            }

            // Ensure user has OWNER role (upgrade if they own a shop but don't have the role yet)
            User user = userService.findById(userPrincipal.getId())
            if (!user.isOwner()) {
                log.info("Upgrading user ${user.id} to OWNER role for payment intent creation")
                user = userService.upgradeToOwner(user.id)
            }

            Map<String, Object> result = stripeService.createPaymentIntent(shopId, request)
            return ResponseEntity.ok(result)
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Invalid request",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to create payment intent",
                message: e.getMessage()
            ])
        }
    }

    @PostMapping("/shops/{shopId}/confirm-subscription")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> confirmSubscription(
            @PathVariable("shopId") UUID shopId,
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only confirm subscriptions for your own shops"
                ])
            }

            String paymentIntentId = request.paymentIntentId
            if (!paymentIntentId) {
                return ResponseEntity.badRequest().body([
                    error: "Invalid request",
                    message: "Payment Intent ID is required"
                ])
            }

            Map<String, Object> result = stripeService.confirmSubscription(shopId, paymentIntentId)
            return ResponseEntity.ok(result)
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Invalid request",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to confirm subscription",
                message: e.getMessage()
            ])
        }
    }

    @PostMapping("/shops/{shopId}/confirm-setup-and-activate")
    @PreAuthorize("isAuthenticated()")
    ResponseEntity<?> confirmSetupAndActivateSubscription(
            @PathVariable("shopId") UUID shopId,
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only confirm subscriptions for your own shops"
                ])
            }

            // Ensure user has OWNER role (upgrade if they own a shop but don't have the role yet)
            User user = userService.findById(userPrincipal.getId())
            if (!user.isOwner()) {
                log.info("Upgrading user ${user.id} to OWNER role for subscription confirmation")
                user = userService.upgradeToOwner(user.id)
            }

            String setupIntentId = request.setupIntentId
            if (!setupIntentId) {
                return ResponseEntity.badRequest().body([
                    error: "Invalid request",
                    message: "Setup Intent ID is required"
                ])
            }

            Map<String, Object> result = stripeService.confirmSetupAndActivateSubscription(shopId, setupIntentId)
            return ResponseEntity.ok(result)
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Invalid request",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to confirm setup and activate subscription",
                message: e.getMessage()
            ])
        }
    }

    @GetMapping("/shops/{shopId}")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getSubscriptionDetails(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only view subscriptions for your own shops"
                ])
            }

            SubscriptionResponse response = stripeService.getSubscriptionDetails(shopId)
            return ResponseEntity.ok(response)
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve subscription",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve subscription",
                message: "An unexpected error occurred"
            ])
        }
    }

    @DeleteMapping("/shops/{shopId}")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> cancelSubscription(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only cancel subscriptions for your own shops"
                ])
            }

            stripeService.cancelSubscription(shopId)
            return ResponseEntity.ok([
                message: "Subscription cancelled successfully",
                shopId: shopId
            ])
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Subscription cancellation failed",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Subscription cancellation failed",
                message: "An unexpected error occurred"
            ])
        }
    }

    @PostMapping("/validate/{shopId}")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> validateSubscription(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only validate subscriptions for your own shops"
                ])
            }

            boolean isValid = stripeService.validateSubscription(shopId)
            return ResponseEntity.ok([
                shopId: shopId,
                subscriptionValid: isValid,
                message: isValid ? "Subscription is valid" : "Subscription is not valid"
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Subscription validation failed",
                message: "An unexpected error occurred"
            ])
        }
    }

    @PostMapping("/activate/{shopId}")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> activateShop(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify shop ownership
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only activate shops you own"
                ])
            }

            // Check if shop has a subscription
            if (!shop.stripeDetails?.subscriptionId) {
                return ResponseEntity.badRequest().body([
                    error: "No subscription found",
                    message: "Shop must have a subscription to be activated"
                ])
            }

            // Validate subscription with Stripe and activate if valid
            boolean isValid = stripeService.validateSubscription(shopId)
            if (isValid) {
                // Manually activate the shop
                shop.active = true
                shopRepository.save(shop)

                log.info("Manually activated shop ${shopId} with valid subscription")

                return ResponseEntity.ok([
                    success: true,
                    message: "Shop activated successfully",
                    shopActive: shop.active,
                    subscriptionStatus: "active"  // Return the status directly since subscription is valid
                ])
            } else {
                return ResponseEntity.badRequest().body([
                    error: "Invalid subscription",
                    message: "Cannot activate shop with invalid subscription"
                ])
            }

        } catch (Exception e) {
            log.error("Error activating shop ${shopId}: ${e.message}", e)
            return ResponseEntity.badRequest().body([
                error: "Activation failed",
                message: e.getMessage()
            ])
        }
    }

    @PostMapping("/customer-portal/{shopId}")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> createCustomerPortalSession(
            @PathVariable("shopId") UUID shopId,
            @Valid @RequestBody CustomerPortalRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only create customer portal sessions for your own shops"
                ])
            }

            CustomerPortalResponse response = stripeService.createCustomerPortalSession(shopId, request)
            return ResponseEntity.ok(response)
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Customer portal session creation failed",
                message: e.getMessage()
            ])
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body([
                error: "Customer portal session creation failed",
                message: e.getMessage()
            ])
        }
    }



    @PostMapping("/webhook")
    ResponseEntity<?> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {
        try {
            stripeService.processWebhookEvent(payload, sigHeader)
            return ResponseEntity.ok([message: "Webhook processed successfully"])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Webhook processing failed",
                message: e.getMessage()
            ])
        }
    }

    // ===== COMPLIANCE ENDPOINTS =====

    @PostMapping("/{shopId}/compliance/subscription")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> createComplianceSubscription(
            @PathVariable("shopId") UUID shopId,
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only manage compliance for your own shops"
                ])
            }

            // Verify shop has Stripe account
            if (!shop.stripeDetails?.stripeAccountId) {
                return ResponseEntity.badRequest().body([
                    error: "Stripe account required",
                    message: "Shop must have a connected Stripe account for compliance management"
                ])
            }

            Map<String, Object> result = stripeService.createComplianceSubscription(shopId, request)
            return ResponseEntity.ok(result)
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to create compliance subscription",
                message: e.getMessage()
            ])
        }
    }

    @PutMapping("/{shopId}/compliance/vat")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> updateVatDetails(
            @PathVariable("shopId") UUID shopId,
            @RequestBody Map<String, Object> vatData,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only manage VAT details for your own shops"
                ])
            }

            // Verify shop has Stripe account for compliance tracking
            if (!shop.stripeDetails?.stripeAccountId) {
                return ResponseEntity.badRequest().body([
                    error: "Stripe account required",
                    message: "Shop must have a connected Stripe account for VAT compliance management"
                ])
            }

            // Add Stripe account ID to VAT data for tracking
            vatData.stripeAccountId = shop.stripeDetails.stripeAccountId

            Map<String, Object> result = stripeService.updateShopVatDetails(shopId, vatData)
            return ResponseEntity.ok(result)
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to update VAT details",
                message: e.getMessage()
            ])
        }
    }

    @GetMapping("/{shopId}/compliance/status")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getComplianceStatus(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only view compliance status for your own shops"
                ])
            }

            Map<String, Object> status = stripeService.getShopComplianceStatus(shopId)

            // Add Stripe account information to response
            if (shop.stripeDetails?.stripeAccountId) {
                status.stripeAccountId = shop.stripeDetails.stripeAccountId
                status.stripeOnboardingCompleted = shop.stripeDetails.stripeOnboardingCompleted
            }

            return ResponseEntity.ok(status)
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to get compliance status",
                message: e.getMessage()
            ])
        }
    }

    @PostMapping("/{shopId}/compliance/health-check")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> performHealthCheck(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only perform health checks for your own shops"
                ])
            }

            Map<String, Object> healthCheck = stripeService.performComplianceHealthCheck(shopId)

            // Add Stripe account information to response
            if (shop.stripeDetails?.stripeAccountId) {
                healthCheck.stripeAccountId = shop.stripeDetails.stripeAccountId
            }

            return ResponseEntity.ok(healthCheck)
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to perform health check",
                message: e.getMessage()
            ])
        }
    }

    @PostMapping("/sync-status/{shopId}")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> syncSubscriptionStatus(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only sync subscription status for your own shops"
                ])
            }

            // Get current status from Stripe and validate/sync
            String stripeStatus = stripeService.getCurrentSubscriptionStatus(shopId)
            boolean isValid = stripeService.validateSubscription(shopId)

            // Refresh shop data
            shop = shopService.findById(shopId)

            return ResponseEntity.ok([
                success: true,
                message: "Subscription status synced successfully",
                stripeStatus: stripeStatus,
                shopActive: shop.active,
                isValid: isValid
            ])
        } catch (Exception e) {
            log.error("Error syncing subscription status for shop ${shopId}: ${e.message}", e)
            return ResponseEntity.badRequest().body([
                error: "Sync failed",
                message: e.getMessage()
            ])
        }
    }

    @GetMapping("/shops/{shopId}/payment-methods")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getPaymentMethods(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only view payment methods for your own shops"
                ])
            }

            def paymentMethods = stripeService.getPaymentMethods(shopId)
            return ResponseEntity.ok([data: paymentMethods])
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve payment methods",
                message: e.getMessage()
            ])
        }
    }

    @GetMapping("/shops/{shopId}/invoices")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getInvoices(
            @PathVariable("shopId") UUID shopId,
            @RequestParam(value = "limit", defaultValue = "10") int limit,
            @RequestParam(value = "starting_after", required = false) String startingAfter,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            log.info("Getting invoices for shop ${shopId} with limit ${limit}")
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                log.warn("Access denied for user ${userPrincipal.getId()} to shop ${shopId}")
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only view invoices for your own shops"
                ])
            }

            def invoices = stripeService.getInvoices(shopId, limit, startingAfter)
            log.info("Successfully retrieved ${invoices?.size() ?: 0} invoices for shop ${shopId}")
            return ResponseEntity.ok([data: invoices])
        } catch (RuntimeException e) {
            log.error("Error retrieving invoices for shop ${shopId}: ${e.message}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve invoices",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Unexpected error retrieving invoices for shop ${shopId}: ${e.message}", e)
            return ResponseEntity.status(500).body([
                error: "Internal server error",
                message: "An unexpected error occurred"
            ])
        }
    }

    @GetMapping("/shops/{shopId}/upcoming-invoice")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getUpcomingInvoice(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            log.info("Getting upcoming invoice for shop ${shopId}")
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                log.warn("Access denied for user ${userPrincipal.getId()} to shop ${shopId}")
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only view upcoming invoice for your own shops"
                ])
            }

            def upcomingInvoice = stripeService.getUpcomingInvoice(shopId)
            if (upcomingInvoice == null) {
                log.info("No upcoming invoice found for shop ${shopId}")
                return ResponseEntity.ok([data: null])
            }
            log.info("Successfully retrieved upcoming invoice for shop ${shopId}: ${upcomingInvoice.id}")
            return ResponseEntity.ok(upcomingInvoice)
        } catch (RuntimeException e) {
            log.error("Error retrieving upcoming invoice for shop ${shopId}: ${e.message}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve upcoming invoice",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Unexpected error retrieving upcoming invoice for shop ${shopId}: ${e.message}", e)
            return ResponseEntity.status(500).body([
                error: "Internal server error",
                message: "An unexpected error occurred"
            ])
        }
    }

    @PostMapping("/setup-intent")
    @PreAuthorize("isAuthenticated()")
    ResponseEntity<?> createSetupIntent(
            @Valid @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            log.info("Creating setup intent for user: {}", userPrincipal.getId())

            Map<String, Object> result = stripeService.createSetupIntentForShopCreation(userPrincipal.getId(), request)
            return ResponseEntity.ok(result)
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Invalid request",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Error creating setup intent for user ${userPrincipal.getId()}", e)
            return ResponseEntity.status(500).body([
                error: "Setup intent creation failed",
                message: "An unexpected error occurred"
            ])
        }
    }

    @PostMapping("/confirm-setup-and-create-shop")
    @PreAuthorize("isAuthenticated()")
    ResponseEntity<?> confirmSetupAndCreateShop(
            @Valid @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            log.info("Confirming setup and creating shop for user: {}", userPrincipal.getId())

            // Create a closure that handles shop creation to avoid circular dependency
            def shopCreator = { UUID uid, Map<String, Object> shopData ->
                // Convert map to ShopCreationRequest
                ShopCreationRequest shopRequest = new ShopCreationRequest()
                shopRequest.name = shopData.name as String
                shopRequest.description = shopData.description as String
                shopRequest.address = shopData.address as String
                shopRequest.city = shopData.city as String
                shopRequest.state = shopData.state as String
                shopRequest.postalCode = shopData.postalCode as String
                shopRequest.country = shopData.country as String
                shopRequest.phone = shopData.phone as String
                shopRequest.email = shopData.email as String
                shopRequest.website = shopData.website as String
                // Convert business types from strings to enum values
                Set<BusinessType> businessTypes = new HashSet<>()
                if (shopData.businessTypes instanceof List) {
                    shopData.businessTypes.each { type ->
                        if (type instanceof String) {
                            businessTypes.add(BusinessType.valueOf(type))
                        } else if (type instanceof BusinessType) {
                            businessTypes.add(type)
                        }
                    }
                }
                shopRequest.businessTypes = businessTypes
                shopRequest.acceptsCardPayments = shopData.acceptsCardPayments as Boolean ?: false
                shopRequest.termsAccepted = shopData.termsAccepted as Boolean ?: true
                shopRequest.latitude = shopData.latitude as Double
                shopRequest.longitude = shopData.longitude as Double

                // Use ShopService to create the shop
                return shopService.createShop(uid, shopRequest)
            }

            Map<String, Object> result = stripeService.confirmSetupAndCreateShop(userPrincipal.getId(), request, shopCreator)
            return ResponseEntity.ok(result)
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Invalid request",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Error confirming setup and creating shop for user ${userPrincipal.getId()}", e)
            return ResponseEntity.status(500).body([
                error: "Shop creation failed",
                message: "An unexpected error occurred"
            ])
        }
    }

    // ===== SUBSCRIPTION MANAGEMENT ENDPOINTS =====

    @GetMapping("/shops/{shopId}/detailed")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getDetailedSubscriptionInfo(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only view subscription details for your own shops"
                ])
            }

            SubscriptionResponse response = subscriptionManagementService.getDetailedSubscriptionInfo(shopId)
            return ResponseEntity.ok(response)
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve detailed subscription information",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Error getting detailed subscription info for shop ${shopId}", e)
            return ResponseEntity.status(500).body([
                error: "Internal server error",
                message: "An unexpected error occurred"
            ])
        }
    }

    @PutMapping("/shops/{shopId}/plan")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> updateSubscriptionPlan(
            @PathVariable("shopId") UUID shopId,
            @Valid @RequestBody SubscriptionUpdateRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only update subscriptions for your own shops"
                ])
            }

            SubscriptionResponse response = subscriptionManagementService.updateSubscriptionPlan(shopId, request)
            return ResponseEntity.ok(response)
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to update subscription plan",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Error updating subscription plan for shop ${shopId}", e)
            return ResponseEntity.status(500).body([
                error: "Internal server error",
                message: "An unexpected error occurred"
            ])
        }
    }

    @PostMapping("/shops/{shopId}/cancel")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> cancelSubscription(
            @PathVariable("shopId") UUID shopId,
            @RequestBody(required = false) Map<String, Object> request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only cancel subscriptions for your own shops"
                ])
            }

            boolean cancelImmediately = request?.get("cancelImmediately") as Boolean ?: false
            SubscriptionResponse response = subscriptionManagementService.cancelSubscription(shopId, cancelImmediately)
            return ResponseEntity.ok(response)
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to cancel subscription",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Error cancelling subscription for shop ${shopId}", e)
            return ResponseEntity.status(500).body([
                error: "Internal server error",
                message: "An unexpected error occurred"
            ])
        }
    }

    @PostMapping("/shops/{shopId}/payment-methods/{paymentMethodId}/default")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> setDefaultPaymentMethod(
            @PathVariable("shopId") UUID shopId,
            @PathVariable("paymentMethodId") String paymentMethodId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only manage payment methods for your own shops"
                ])
            }

            stripeService.setDefaultPaymentMethod(shopId, paymentMethodId)
            return ResponseEntity.ok([
                message: "Default payment method updated successfully",
                shopId: shopId,
                paymentMethodId: paymentMethodId
            ])
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to set default payment method",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Error setting default payment method for shop ${shopId}", e)
            return ResponseEntity.status(500).body([
                error: "Internal server error",
                message: "An unexpected error occurred"
            ])
        }
    }

    @DeleteMapping("/shops/{shopId}/payment-methods/{paymentMethodId}")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> removePaymentMethod(
            @PathVariable("shopId") UUID shopId,
            @PathVariable("paymentMethodId") String paymentMethodId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only manage payment methods for your own shops"
                ])
            }

            stripeService.removePaymentMethod(shopId, paymentMethodId)
            return ResponseEntity.ok([
                message: "Payment method removed successfully",
                shopId: shopId,
                paymentMethodId: paymentMethodId
            ])
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to remove payment method",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Error removing payment method for shop ${shopId}", e)
            return ResponseEntity.status(500).body([
                error: "Internal server error",
                message: "An unexpected error occurred"
            ])
        }
    }

    @PostMapping("/shops/{shopId}/reactivate")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> reactivateSubscription(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only reactivate subscriptions for your own shops"
                ])
            }

            SubscriptionResponse response = subscriptionManagementService.reactivateSubscription(shopId)
            return ResponseEntity.ok(response)
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to reactivate subscription",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Error reactivating subscription for shop ${shopId}", e)
            return ResponseEntity.status(500).body([
                error: "Internal server error",
                message: "An unexpected error occurred"
            ])
        }
    }
}
