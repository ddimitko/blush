package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.dto.*
import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.security.CustomUserPrincipal
import com.ddimitko.beautyhub.service.ShopService
import com.ddimitko.beautyhub.service.ShopStripeDetailsService
import com.ddimitko.beautyhub.service.StripeService
import groovy.util.logging.Slf4j
import jakarta.validation.Valid
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@Slf4j
@RestController
@RequestMapping("/api/stripe/connect")
@CrossOrigin(origins = "*", maxAge = 3600)
class StripeConnectController {

    @Autowired
    private StripeService stripeService

    @Autowired
    private ShopService shopService

    @Autowired
    private ShopStripeDetailsService shopStripeDetailsService

    @PostMapping("/accounts/{shopId}")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> createConnectAccount(
            @PathVariable("shopId") UUID shopId,
            @Valid @RequestBody ConnectAccountRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only create Connect accounts for your own shops"
                ])
            }

            ConnectAccountResponse response = stripeService.createConnectAccount(shopId, request)
            return ResponseEntity.ok(response)
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Connect account creation failed",
                message: e.getMessage()
            ])
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body([
                error: "Connect account creation failed",
                message: e.getMessage()
            ])
        }
    }

    @GetMapping("/accounts/{shopId}")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getConnectAccountDetails(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only view Connect accounts for your own shops"
                ])
            }

            ConnectAccountResponse response = stripeService.getConnectAccountDetails(shopId)
            return ResponseEntity.ok(response)
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body([
                error: "No Connect account found",
                message: e.getMessage(),
                hasAccount: false
            ])
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body([
                error: "Failed to retrieve Connect account",
                message: e.getMessage()
            ])
        }
    }

    @PutMapping("/accounts/{shopId}")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> updateConnectAccount(
            @PathVariable("shopId") UUID shopId,
            @Valid @RequestBody ConnectAccountUpdateRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only update Connect accounts for your own shops"
                ])
            }

            // Convert request to map for the service
            Map<String, Object> updateData = [:]
            
            if (request.businessProfile) {
                updateData.businessProfile = [
                    name: request.businessProfile.name,
                    url: request.businessProfile.url,
                    supportPhone: request.businessProfile.supportPhone,
                    supportEmail: request.businessProfile.supportEmail,
                    productDescription: request.businessProfile.productDescription
                ].findAll { k, v -> v != null }
            }
            
            if (request.company) {
                Map companyData = [
                    name: request.company.name,
                    phone: request.company.phone,
                    taxId: request.company.taxId
                ].findAll { k, v -> v != null }
                
                if (request.company.address) {
                    companyData.address = [
                        line1: request.company.address.line1,
                        line2: request.company.address.line2,
                        city: request.company.address.city,
                        state: request.company.address.state,
                        postalCode: request.company.address.postalCode,
                        country: request.company.address.country
                    ].findAll { k, v -> v != null }
                }
                
                updateData.company = companyData
            }

            ConnectAccountResponse response = stripeService.updateConnectAccount(shopId, updateData)
            return ResponseEntity.ok(response)
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Connect account update failed",
                message: e.getMessage()
            ])
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body([
                error: "Connect account update failed",
                message: e.getMessage()
            ])
        }
    }

    @PostMapping("/accounts/{shopId}/submit")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> submitConnectAccountForReview(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only submit Connect accounts for your own shops"
                ])
            }

            ConnectAccountResponse response = stripeService.submitConnectAccountForReview(shopId)
            return ResponseEntity.ok(response)
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Connect account submission failed",
                message: e.getMessage()
            ])
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body([
                error: "Connect account submission failed",
                message: e.getMessage()
            ])
        }
    }

    @PostMapping("/accounts/{shopId}/account-session")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> createAccountSession(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only create account sessions for your own shops"
                ])
            }

            Map<String, Object> sessionData = stripeService.createAccountSession(shopId)
            return ResponseEntity.ok(sessionData)
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Account session creation failed",
                message: e.getMessage()
            ])
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body([
                error: "Account session creation failed",
                message: e.getMessage()
            ])
        }
    }

    @PostMapping("/accounts/{shopId}/account-link")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> createAccountLink(
            @PathVariable("shopId") UUID shopId,
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only create account links for your own shops"
                ])
            }

            String returnUrl = request.get("returnUrl") ?: "http://localhost:3000/dashboard?connect=success"
            String refreshUrl = request.get("refreshUrl") ?: "http://localhost:3000/dashboard?connect=refresh"

            ConnectAccountResponse response = stripeService.createAccountLink(shopId, returnUrl, refreshUrl)
            return ResponseEntity.ok(response)
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Account link creation failed",
                message: e.getMessage()
            ])
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body([
                error: "Account link creation failed",
                message: e.getMessage()
            ])
        }
    }

    @PostMapping("/accounts/{shopId}/dashboard-link")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> createDashboardLink(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only create dashboard links for your own shops"
                ])
            }

            String dashboardUrl = stripeService.createDashboardLink(shopId)
            return ResponseEntity.ok([
                dashboardUrl: dashboardUrl,
                message: "Dashboard link created successfully"
            ])
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Dashboard link creation failed",
                message: e.getMessage()
            ])
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body([
                error: "Dashboard link creation failed",
                message: e.getMessage()
            ])
        }
    }

    @PostMapping("/accounts/{shopId}/comprehensive")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> createComprehensiveConnectAccount(
            @PathVariable("shopId") UUID shopId,
            @ModelAttribute ComprehensiveConnectAccountRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only create Connect accounts for your own shops"
                ])
            }

            // Check if shop already has a Stripe account
            String stripeAccountId = shopStripeDetailsService.getStripeAccountId(shop)
            if (stripeAccountId) {
                // Update existing account with comprehensive information
                ConnectAccountResponse response = stripeService.updateComprehensiveConnectAccount(shopId, request)
                return ResponseEntity.ok([
                    success: true,
                    message: "Connect account updated successfully with comprehensive information",
                    data: response
                ])
            } else {
                // Create new comprehensive account
                ConnectAccountResponse response = stripeService.createComprehensiveConnectAccount(shopId, request)
                return ResponseEntity.ok([
                    success: true,
                    message: "Comprehensive Connect account created successfully",
                    data: response
                ])
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Account creation failed",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Error creating comprehensive Connect account for shop ${shopId}: ${e.getMessage()}", e)
            return ResponseEntity.status(500).body([
                error: "Internal server error",
                message: "Failed to create comprehensive Connect account"
            ])
        }
    }

    @PostMapping("/requirements")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getOnboardingRequirements(
            @Valid @RequestBody OnboardingRequirementsRequest request) {
        try {
            Map<String, Object> requirements = stripeService.getOnboardingRequirements(request)
            return ResponseEntity.ok([
                success: true,
                data: requirements
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Requirements retrieval failed",
                message: e.getMessage()
            ])
        }
    }

    @GetMapping("/accounts/{shopId}/requirements")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getConnectAccountRequirements(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only view Connect account requirements for your own shops"
                ])
            }

            Map<String, Object> requirements = stripeService.getConnectAccountRequirements(shopId)
            return ResponseEntity.ok(requirements)
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body([
                error: "No Connect account found",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            return ResponseEntity.status(500).body([
                error: "Failed to retrieve Connect account requirements",
                message: e.getMessage()
            ])
        }
    }

    @PutMapping("/accounts/{shopId}/api-onboarding")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> updateApiOnboardingAccount(
            @PathVariable("shopId") UUID shopId,
            @Valid @RequestBody ApiOnboardingUpdateRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            log.info("Received API onboarding request for shop ${shopId}: ${request}")
            log.debug("Request details - businessProfile: ${request.businessProfile}, company: ${request.company}, individual: ${request.individual}, externalAccount: ${request.externalAccount}, tosAcceptance: ${request.tosAcceptance}")
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only update Connect accounts for your own shops"
                ])
            }

            ConnectAccountResponse response = stripeService.updateApiOnboardingAccount(shopId, request)
            return ResponseEntity.ok([
                success: true,
                message: "API onboarding account updated successfully",
                data: response
            ])
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "API onboarding update failed",
                message: e.getMessage()
            ])
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body([
                error: "API onboarding update failed",
                message: e.getMessage()
            ])
        }
    }

    @GetMapping("/accounts/{shopId}/balance")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getAccountBalance(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only view balance for your own shops"
                ])
            }

            def balance = stripeService.getConnectAccountBalance(shopId)
            return ResponseEntity.ok(balance)
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve account balance",
                message: e.getMessage()
            ])
        }
    }

    @GetMapping("/accounts/{shopId}/payouts")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getAccountPayouts(
            @PathVariable("shopId") UUID shopId,
            @RequestParam(value = "limit", defaultValue = "10") int limit,
            @RequestParam(value = "starting_after", required = false) String startingAfter,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only view payouts for your own shops"
                ])
            }

            def payoutsResult = stripeService.getConnectAccountPayouts(shopId, limit, startingAfter)
            return ResponseEntity.ok([
                data: payoutsResult.data,
                hasMore: payoutsResult.hasMore
            ])
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve payouts",
                message: e.getMessage()
            ])
        }
    }

    @GetMapping("/accounts/{shopId}/transactions")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getAccountTransactions(
            @PathVariable("shopId") UUID shopId,
            @RequestParam(value = "limit", defaultValue = "10") int limit,
            @RequestParam(value = "starting_after", required = false) String startingAfter,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that the user owns the shop
            Shop shop = shopService.findById(shopId)
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only view transactions for your own shops"
                ])
            }

            def transactionsResult = stripeService.getConnectAccountTransactions(shopId, limit, startingAfter)
            return ResponseEntity.ok([
                data: transactionsResult.data,
                hasMore: transactionsResult.hasMore
            ])
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve transactions",
                message: e.getMessage()
            ])
        }
    }
}
