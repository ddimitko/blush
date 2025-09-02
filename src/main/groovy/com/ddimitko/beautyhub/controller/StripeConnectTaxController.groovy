package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.service.StripeConnectTaxService
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@Slf4j
@RestController
@RequestMapping("/api/stripe/tax")
@CrossOrigin(origins = ["https://localhost:3000", "http://localhost:3000"])
class StripeConnectTaxController {

    @Autowired
    private StripeConnectTaxService stripeConnectTaxService

    /**
     * Get tax registration requirements for a country
     */
    @GetMapping("/requirements/{countryCode}")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<Map<String, Object>> getTaxRegistrationRequirements(@PathVariable("countryCode") String countryCode) {
        try {
            log.info("Getting tax registration requirements for country: ${countryCode}")
            Map<String, Object> requirements = stripeConnectTaxService.getTaxRegistrationRequirements(countryCode)
            return ResponseEntity.ok(requirements)
        } catch (Exception e) {
            log.error("Error getting tax registration requirements: ${e.message}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to get tax registration requirements",
                message: e.message
            ])
        }
    }

    /**
     * Register shop for tax collection
     */
    @PostMapping("/register/{shopId}")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<Map<String, Object>> registerShopForTax(
        @PathVariable("shopId") UUID shopId,
        @RequestBody Map<String, Object> registrationData
    ) {
        try {
            log.info("Registering shop for tax: ${shopId}")
            Map<String, Object> result = stripeConnectTaxService.registerShopForTax(shopId, registrationData)
            return ResponseEntity.ok(result)
        } catch (Exception e) {
            log.error("Error registering shop for tax: ${e.message}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to register for tax",
                message: e.message
            ])
        }
    }

    /**
     * Enable automatic tax calculation for shop
     */
    @PostMapping("/enable-automatic/{shopId}")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<Map<String, Object>> enableAutomaticTaxCalculation(@PathVariable("shopId") UUID shopId) {
        try {
            log.info("Enabling automatic tax calculation for shop: ${shopId}")
            Map<String, Object> result = stripeConnectTaxService.enableAutomaticTaxCalculation(shopId)
            return ResponseEntity.ok(result)
        } catch (Exception e) {
            log.error("Error enabling automatic tax calculation: ${e.message}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to enable automatic tax calculation",
                message: e.message
            ])
        }
    }

    /**
     * Get tax registration status for shop
     */
    @GetMapping("/status/{shopId}")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<Map<String, Object>> getTaxRegistrationStatus(@PathVariable("shopId") UUID shopId) {
        try {
            log.info("Getting tax registration status for shop: ${shopId}")
            Map<String, Object> status = stripeConnectTaxService.getTaxRegistrationStatus(shopId)
            return ResponseEntity.ok(status)
        } catch (Exception e) {
            log.error("Error getting tax registration status: ${e.message}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to get tax registration status",
                message: e.message
            ])
        }
    }

    /**
     * Calculate tax for payment
     */
    @PostMapping("/calculate/{shopId}")
    @PreAuthorize("hasRole('OWNER') or hasRole('EMPLOYEE') or hasRole('USER')")
    ResponseEntity<Map<String, Object>> calculateTaxForPayment(
        @PathVariable("shopId") UUID shopId,
        @RequestBody Map<String, Object> paymentData
    ) {
        try {
            log.info("Calculating tax for payment: ${shopId}")
            Map<String, Object> taxCalculation = stripeConnectTaxService.calculateTaxForPayment(shopId, paymentData)
            return ResponseEntity.ok(taxCalculation)
        } catch (Exception e) {
            log.error("Error calculating tax for payment: ${e.message}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to calculate tax",
                message: e.message
            ])
        }
    }

    /**
     * Get supported tax codes
     */
    @GetMapping("/tax-codes")
    ResponseEntity<Map<String, Object>> getSupportedTaxCodes() {
        try {
            Map<String, Object> taxCodes = [
                supportedCodes: [
                    [
                        code: "txcd_20040001",
                        name: "Beauty Services - General",
                        description: "General beauty and personal care services"
                    ],
                    [
                        code: "txcd_20040007", 
                        name: "Hair Care Services",
                        description: "Hair cutting, styling, coloring, and treatments"
                    ],
                    [
                        code: "txcd_20040009",
                        name: "Nail Care Services", 
                        description: "Manicures, pedicures, and nail treatments"
                    ],
                    [
                        code: "txcd_20040010",
                        name: "Spa and Wellness Services",
                        description: "Spa treatments, massages, and wellness services"
                    ]
                ]
            ]
            return ResponseEntity.ok(taxCodes)
        } catch (Exception e) {
            log.error("Error getting supported tax codes: ${e.message}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to get supported tax codes",
                message: e.message
            ])
        }
    }
}
