package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.entity.ShopStripeDetails
import com.ddimitko.beautyhub.security.CustomUserPrincipal
import com.ddimitko.beautyhub.service.ShopService
import com.ddimitko.beautyhub.service.ShopStripeDetailsService
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/shops/{shopId}/stripe")
@CrossOrigin(origins = "*", maxAge = 3600)
@Slf4j
class ShopStripeDetailsController {

    @Autowired
    private ShopService shopService

    @Autowired
    private ShopStripeDetailsService shopStripeDetailsService

    /**
     * Get Stripe details for a shop (owner only)
     */
    @GetMapping
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getShopStripeDetails(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only view Stripe details for your own shops"
                ])
            }

            Optional<ShopStripeDetails> stripeDetails = shopStripeDetailsService.getStripeDetailsByShopId(shopId)
            
            if (!stripeDetails.isPresent()) {
                return ResponseEntity.ok([
                    shopId: shopId,
                    hasStripeDetails: false,
                    message: "No Stripe details found for this shop"
                ])
            }

            ShopStripeDetails details = stripeDetails.get()
            
            // Return safe subset of Stripe details (no sensitive IDs in logs)
            return ResponseEntity.ok([
                shopId: shopId,
                hasStripeDetails: true,
                hasStripeAccount: details.stripeAccountId != null,
                stripeOnboardingCompleted: details.stripeOnboardingCompleted,
                hasSubscription: details.subscriptionId != null,
                hasCustomer: details.stripeCustomerId != null,
                lastStripeSync: details.lastStripeSync,
                createdAt: details.createdAt,
                updatedAt: details.updatedAt
            ])

        } catch (Exception e) {
            log.error("Error retrieving Stripe details for shop ${shopId}: ${e.message}", e)
            return ResponseEntity.status(500).body([
                error: "Failed to retrieve Stripe details",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Get current subscription status from Stripe API (real-time)
     */
    @GetMapping("/subscription-status")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getCurrentSubscriptionStatus(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only view subscription status for your own shops"
                ])
            }

            String status = shopStripeDetailsService.getCurrentSubscriptionStatus(shop)
            boolean isActive = shopStripeDetailsService.isSubscriptionActive(shop)

            return ResponseEntity.ok([
                shopId: shopId,
                subscriptionStatus: status,
                isActive: isActive,
                timestamp: new Date()
            ])

        } catch (Exception e) {
            log.error("Error retrieving subscription status for shop ${shopId}: ${e.message}", e)
            return ResponseEntity.status(500).body([
                error: "Failed to retrieve subscription status",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Check if shop can accept payments (real-time)
     */
    @GetMapping("/payment-capability")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getPaymentCapability(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only view payment capability for your own shops"
                ])
            }

            boolean canAcceptPayments = shopStripeDetailsService.canAcceptPayments(shop)
            String stripeAccountId = shopStripeDetailsService.getStripeAccountId(shop)

            return ResponseEntity.ok([
                shopId: shopId,
                canAcceptPayments: canAcceptPayments,
                acceptsCardPayments: shop.acceptsCardPayments,
                hasStripeAccount: stripeAccountId != null,
                timestamp: new Date()
            ])

        } catch (Exception e) {
            log.error("Error checking payment capability for shop ${shopId}: ${e.message}", e)
            return ResponseEntity.status(500).body([
                error: "Failed to check payment capability",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Get Stripe account status (for Connect accounts)
     */
    @GetMapping("/account-status")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getStripeAccountStatus(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only view account status for your own shops"
                ])
            }

            Optional<ShopStripeDetails> stripeDetails = shopStripeDetailsService.getStripeDetailsByShopId(shopId)
            
            if (!stripeDetails.isPresent() || !stripeDetails.get().stripeAccountId) {
                return ResponseEntity.ok([
                    shopId: shopId,
                    hasStripeAccount: false,
                    message: "No Stripe Connect account found for this shop"
                ])
            }

            ShopStripeDetails details = stripeDetails.get()
            
            return ResponseEntity.ok([
                shopId: shopId,
                hasStripeAccount: true,
                onboardingCompleted: details.stripeOnboardingCompleted,
                canAcceptPayments: details.canAcceptPayments(),
                lastSync: details.lastStripeSync,
                timestamp: new Date()
            ])

        } catch (Exception e) {
            log.error("Error retrieving Stripe account status for shop ${shopId}: ${e.message}", e)
            return ResponseEntity.status(500).body([
                error: "Failed to retrieve Stripe account status",
                message: e.getMessage()
            ])
        }
    }
}
