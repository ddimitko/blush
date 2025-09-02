package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.dto.PaymentIntentRequest
import com.ddimitko.beautyhub.dto.PaymentIntentResponse
import com.ddimitko.beautyhub.security.CustomUserPrincipal
import com.ddimitko.beautyhub.service.PaymentService
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

import jakarta.validation.Valid

@Slf4j
@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*", maxAge = 3600)
class PaymentController {

    @Autowired
    private PaymentService paymentService

    /**
     * Create a payment intent for appointment booking
     */
    @PostMapping("/create-payment-intent")
    ResponseEntity<?> createPaymentIntent(
            @Valid @RequestBody PaymentIntentRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Set customer information if authenticated
            if (userPrincipal) {
                request.customerEmail = userPrincipal.getEmail()
                request.customerName = "${userPrincipal.getFirstName()} ${userPrincipal.getLastName()}".trim()
            }

            PaymentIntentResponse response = paymentService.createPaymentIntent(request)
            
            return ResponseEntity.ok(response)
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Payment intent creation failed",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Payment intent creation failed: ${e.getMessage()}", e)
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body([
                error: "Payment intent creation failed",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Create a Stripe Connect Direct Charge payment intent for appointment booking
     * Supports both authenticated and guest users
     */
    @PostMapping("/create-connect-payment-intent")
    ResponseEntity<?> createConnectPaymentIntent(
            @Valid @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            log.info("Creating Stripe Connect payment intent for shop: ${request.shopId}, user: ${userPrincipal?.getId() ?: 'guest'}")

            // Set customer information if authenticated
            if (userPrincipal) {
                request.customerEmail = userPrincipal.getEmail()
                request.customerName = "${userPrincipal.getFirstName()} ${userPrincipal.getLastName()}".trim()
                request.userId = userPrincipal.getId() // Add user ID for Stripe customer lookup
                log.debug("Using authenticated user info: ${request.customerEmail}")
            } else {
                log.debug("Processing as guest user with email: ${request.customerEmail}")
            }

            Map<String, Object> response = paymentService.createConnectPaymentIntent(request)

            log.info("Successfully created Stripe Connect payment intent: ${response.paymentIntentId}")
            return ResponseEntity.ok(response)
        } catch (IllegalArgumentException e) {
            log.error("Connect payment intent creation failed - Invalid argument: ${e.getMessage()}")
            return ResponseEntity.badRequest().body([
                error: "Connect payment intent creation failed",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Connect payment intent creation failed - Unexpected error: ${e.getMessage()}", e)
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body([
                error: "Connect payment intent creation failed",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Confirm payment intent after successful payment
     */
    @PostMapping("/confirm-payment-intent")
    ResponseEntity<?> confirmPaymentIntent(
            @RequestParam String paymentIntentId,
            @RequestParam String paymentMethodId) {
        try {
            PaymentIntentResponse response = paymentService.confirmPaymentIntent(
                paymentIntentId, paymentMethodId
            )

            return ResponseEntity.ok([
                message: "Payment confirmed successfully",
                payment: response
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Payment confirmation failed",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Handle payment webhook from Stripe (for production use)
     */
    @PostMapping("/webhook")
    ResponseEntity<?> handleWebhook(@RequestBody String payload, @RequestHeader("Stripe-Signature") String signature) {
        try {
            // In production, verify webhook signature and process events
            // For now, return success
            return ResponseEntity.ok([
                message: "Webhook received"
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Webhook processing failed",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Confirm payment for an appointment
     */
    @PostMapping("/confirm-payment")
    ResponseEntity<?> confirmPayment(@RequestBody Map<String, Object> requestBody) {
        try {
            String paymentIntentId = requestBody.get("paymentIntentId") as String
            String appointmentId = requestBody.get("appointmentId") as String

            if (!paymentIntentId || !appointmentId) {
                return ResponseEntity.badRequest().body([
                    error: "Payment confirmation failed",
                    message: "Payment intent ID and appointment ID are required"
                ])
            }

            // For testing purposes, simulate successful payment confirmation
            return ResponseEntity.ok([
                message: "Payment confirmed successfully",
                paymentStatus: "succeeded",
                paymentIntentId: paymentIntentId,
                appointmentId: appointmentId
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Payment confirmation failed",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Get payment status for an appointment
     */
    @GetMapping("/status/{appointmentId}")
    ResponseEntity<?> getPaymentStatus(@PathVariable("appointmentId") UUID appointmentId) {
        try {
            // This would check the payment status for the appointment
            return ResponseEntity.ok([
                appointmentId: appointmentId,
                paymentStatus: "pending",
                message: "Payment status endpoint - to be implemented"
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve payment status",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Process refund for an appointment
     */
    @PostMapping("/refund")
    ResponseEntity<?> processRefund(
            @RequestParam("paymentIntentId") String paymentIntentId,
            @RequestParam("amount") BigDecimal amount,
            @RequestParam(value = "reason", required = false) String reason) {
        try {
            Map<String, Object> refundResult = paymentService.processRefund(
                paymentIntentId, amount, reason
            )

            // Update appointment with refund information
            paymentService.updateAppointmentRefund(
                paymentIntentId,
                refundResult.refundId as String,
                refundResult.status as String,
                amount
            )

            return ResponseEntity.ok([
                message: "Refund processed successfully",
                refund: refundResult
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Refund processing failed",
                message: e.getMessage()
            ])
        }
    }
}
