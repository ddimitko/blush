package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.dto.PaymentIntentRequest
import com.ddimitko.beautyhub.dto.PaymentIntentResponse
import com.ddimitko.beautyhub.entity.Appointment
import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.repository.AppointmentRepository
import com.ddimitko.beautyhub.repository.ShopRepository
import com.ddimitko.beautyhub.repository.UserRepository
import com.ddimitko.beautyhub.service.ShopStripeDetailsService
import com.ddimitko.beautyhub.service.StripeCustomerService
import com.stripe.Stripe
import com.stripe.model.PaymentIntent
import com.stripe.model.Refund
import com.stripe.param.PaymentIntentCreateParams
import com.stripe.param.RefundCreateParams
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service as SpringService

import java.time.LocalDateTime

@SpringService
@Slf4j
class PaymentService {

    @Autowired
    private ShopRepository shopRepository

    @Autowired
    private AppointmentRepository appointmentRepository

    @Autowired
    private UserRepository userRepository

    @Autowired
    private ShopStripeDetailsService shopStripeDetailsService

    @Autowired
    private StripeCustomerService stripeCustomerService

    @Autowired
    private StripeConnectTaxService stripeConnectTaxService

    @Value('${stripe.api.secret-key:}')
    private String stripeSecretKey

    /**
     * Creates a payment intent for appointment booking using real Stripe API
     */
    PaymentIntentResponse createPaymentIntent(PaymentIntentRequest request) {
        Shop shop = shopRepository.findById(request.shopId)
                .orElseThrow { new RuntimeException("Shop not found") }

        if (!shop.acceptsCardPayments) {
            throw new IllegalArgumentException("Shop does not accept card payments")
        }

        // Determine currency based on shop's country if not provided
        String currency = request.currency
        if (!currency) {
            currency = getCurrencyForCountry(shop.country).toLowerCase()
        }

        // For testing: allow shops without connected accounts (direct payments)
        String stripeAccountId = shopStripeDetailsService.getStripeAccountId(shop)
        boolean useConnectedAccount = shopStripeDetailsService.canAcceptPayments(shop) && stripeAccountId

        try {
            // Set Stripe API key
            Stripe.apiKey = stripeSecretKey

            // For tax-inclusive pricing, customer pays exactly the service amount
            Long amountInCents = Math.round(request.amount * 100)

            // Create payment intent with Stripe
            PaymentIntentCreateParams.Builder paramsBuilder = PaymentIntentCreateParams.builder()
                .setAmount(amountInCents)
                .setCurrency(currency)
                .setDescription(request.description)
                .putMetadata("shop_id", request.shopId.toString())
                .putMetadata("service_id", request.serviceId.toString())
                .putMetadata("customer_email", request.customerEmail ?: "")
                .putMetadata("customer_name", request.customerName ?: "")
                .putMetadata("shop_country", shop.country ?: "")
                .putMetadata("tax_behavior", "inclusive")

            // Only add connected account details if shop has completed onboarding
            if (useConnectedAccount) {
                paramsBuilder
                    .setApplicationFeeAmount(Math.round(amountInCents * 0.05)) // 5% platform fee
                    .setOnBehalfOf(stripeAccountId) // Charge on behalf of connected account
                    .setTransferData(
                        PaymentIntentCreateParams.TransferData.builder()
                            .setDestination(stripeAccountId)
                            .build()
                    )
            }

            PaymentIntentCreateParams params = paramsBuilder.build()

            PaymentIntent paymentIntent = PaymentIntent.create(params)

            PaymentIntentResponse response = new PaymentIntentResponse()
            response.paymentIntentId = paymentIntent.getId()
            response.clientSecret = paymentIntent.getClientSecret()
            response.amount = request.amount
            response.currency = paymentIntent.getCurrency()
            response.status = paymentIntent.getStatus()
            response.shopName = shop.name
            response.description = request.description
            response.connectedAccountId = stripeAccountId
            response.taxBehavior = 'inclusive'
            response.taxCalculated = false

            return response

        } catch (Exception e) {
            throw new RuntimeException("Failed to create payment intent: ${e.getMessage()}", e)
        }
    }

    /**
     * Creates a Stripe Connect Direct Charge payment intent for appointment booking
     */
    Map<String, Object> createConnectPaymentIntent(Map<String, Object> request) {
        UUID shopId = UUID.fromString(request.shopId as String)
        UUID serviceId = UUID.fromString(request.serviceId as String)

        Shop shop = shopRepository.findById(shopId)
                .orElseThrow { new RuntimeException("Shop not found") }

        if (!shop.acceptsCardPayments) {
            throw new IllegalArgumentException("Shop does not accept card payments")
        }

        // Check if shop has Stripe Connect account
        String stripeAccountId = shopStripeDetailsService.getStripeAccountId(shop)
        if (!stripeAccountId) {
            throw new IllegalArgumentException("Shop does not have a Stripe Connect account configured")
        }

        // Check if shop can accept payments
        if (!shopStripeDetailsService.canAcceptPayments(shop)) {
            throw new IllegalArgumentException("Shop is not ready to accept payments. Please complete Stripe Connect onboarding.")
        }

        // Determine currency based on shop's country if not provided
        String currency = request.currency as String
        if (!currency) {
            currency = getCurrencyForCountry(shop.country).toLowerCase()
        }

        BigDecimal amount = request.amount as BigDecimal
        String description = request.description as String ?: "Payment for service at ${shop.name}"

        // Get Stripe customer ID if user is authenticated
        String stripeCustomerId = null
        if (request.userId) {
            try {
                UUID userId = UUID.fromString(request.userId as String)
                stripeCustomerId = stripeCustomerService.getOrCreateStripeCustomer(userRepository.findById(userId).orElse(null))
                log.info("Using Stripe customer ID: ${stripeCustomerId} for user: ${userId}")
            } catch (Exception e) {
                log.warn("Failed to get/create Stripe customer for user ${request.userId}: ${e.message}")
                // Continue without customer ID for guest-like experience
            }
        }

        try {
            // Set Stripe API key
            Stripe.apiKey = stripeSecretKey

            // For tax-inclusive pricing, customer pays exactly the service amount
            // The shop covers taxes and fees
            Long finalAmountInCents = Math.round(amount * 100)

            // Calculate tax if automatic tax is enabled (for reporting purposes)
            Map<String, Object> taxCalculation = null
            if (shop.stripeDetails?.automaticTaxEnabled) {
                try {
                    taxCalculation = stripeConnectTaxService.calculateTaxForPayment(shopId, [
                        amount: amount,
                        currency: currency,
                        customerCountry: request.customerCountry ?: shop.country,
                        customerEmail: request.customerEmail,
                        customerName: request.customerName,
                        taxBehavior: 'inclusive' // Tax is included in the service price
                    ])
                } catch (Exception e) {
                    log.warn("Tax calculation failed, proceeding without tax: ${e.message}")
                }
            }

            // Create payment intent with Stripe Connect Direct Charge
            PaymentIntentCreateParams.Builder paramsBuilder = PaymentIntentCreateParams.builder()
                .setAmount(finalAmountInCents) // Customer pays exactly the service amount
                .setCurrency(currency)
                .setDescription(description)
                .setOnBehalfOf(stripeAccountId) // Direct charge to connected account
                .setTransferData(
                    PaymentIntentCreateParams.TransferData.builder()
                        .setDestination(stripeAccountId)
                        .build()
                )

            // Add customer if authenticated user
            if (stripeCustomerId) {
                paramsBuilder.setCustomer(stripeCustomerId)
                log.info("Payment intent created with customer: ${stripeCustomerId}")

                // Add setup_future_usage if user wants to save payment method
                Boolean savePaymentMethod = request.savePaymentMethod as Boolean
                if (savePaymentMethod) {
                    paramsBuilder.setSetupFutureUsage(PaymentIntentCreateParams.SetupFutureUsage.OFF_SESSION)
                    log.info("Payment intent configured to save payment method for future use")
                }
            }

            paramsBuilder
                .putMetadata("shop_id", shopId.toString())
                .putMetadata("service_id", serviceId.toString())
                .putMetadata("customer_email", request.customerEmail as String ?: "")
                .putMetadata("customer_name", request.customerName as String ?: "")
                .putMetadata("shop_country", shop.country ?: "")
                .putMetadata("payment_type", "connect_direct_charge")
                .putMetadata("tax_behavior", "inclusive")

            // Add tax information to metadata if calculated
            if (taxCalculation?.taxCalculated) {
                paramsBuilder
                    .putMetadata("tax_amount", taxCalculation.taxAmount.toString())
                    .putMetadata("tax_rate", taxCalculation.taxRate.toString())
                    .putMetadata("tax_code", taxCalculation.taxCode as String ?: "")
                    .putMetadata("customer_country", taxCalculation.customerCountry as String ?: "")
                    .putMetadata("tax_behavior", taxCalculation.taxBehavior as String ?: "inclusive")
            }

            // Add automatic tax configuration if enabled
            if (shop.stripeDetails?.automaticTaxEnabled) {
                paramsBuilder.putMetadata("automatic_tax_enabled", "true")
            }

            // Add payment method types if specified
            List<String> paymentMethodTypes = request.paymentMethodTypes as List<String>
            if (paymentMethodTypes) {
                paymentMethodTypes.each { type ->
                    paramsBuilder.addPaymentMethodType(type)
                }
            } else {
                // Default payment method types
                paramsBuilder.addPaymentMethodType("card")
            }

            PaymentIntent paymentIntent = PaymentIntent.create(paramsBuilder.build())

            Map<String, Object> response = [
                paymentIntentId: paymentIntent.getId(),
                clientSecret: paymentIntent.getClientSecret(),
                amount: amount,
                currency: currency,
                status: paymentIntent.getStatus(),
                shopName: shop.name,
                description: description,
                connectedAccountId: stripeAccountId
            ]

            // Add tax information to response if calculated
            if (taxCalculation?.taxCalculated) {
                response.putAll([
                    taxAmount: taxCalculation.taxAmount,
                    taxRate: taxCalculation.taxRate,
                    totalAmount: finalAmountInCents / 100, // Customer pays exactly the service amount
                    taxCalculated: true,
                    taxCode: taxCalculation.taxCode,
                    taxBehavior: taxCalculation.taxBehavior ?: 'inclusive'
                ])
            } else {
                response.putAll([
                    taxBehavior: 'inclusive',
                    taxCalculated: false
                ])
            }

            return response

        } catch (Exception e) {
            throw new RuntimeException("Failed to create Stripe Connect payment intent: ${e.getMessage()}", e)
        }
    }

    /**
     * Validates a payment intent to ensure it was successfully processed
     */
    Map<String, Object> validatePaymentIntent(String paymentIntentId) {
        try {
            // Set Stripe API key
            Stripe.apiKey = stripeSecretKey

            // Retrieve the payment intent from Stripe
            PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId)

            return [
                success: paymentIntent.getStatus() == 'succeeded',
                status: paymentIntent.getStatus(),
                amount: paymentIntent.getAmount() / 100.0,
                currency: paymentIntent.getCurrency(),
                paymentMethodId: paymentIntent.getPaymentMethod()
            ]

        } catch (Exception e) {
            log.error("Failed to validate payment intent ${paymentIntentId}: ${e.getMessage()}")
            return [
                success: false,
                status: 'failed',
                error: e.getMessage()
            ]
        }
    }

    /**
     * Confirms a payment intent after successful payment
     */
    PaymentIntentResponse confirmPaymentIntent(String paymentIntentId, String paymentMethodId) {
        try {
            // Set Stripe API key
            Stripe.apiKey = stripeSecretKey

            // Retrieve the payment intent from Stripe
            PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId)

            PaymentIntentResponse response = new PaymentIntentResponse()
            response.paymentIntentId = paymentIntent.getId()
            response.status = paymentIntent.getStatus()
            response.paymentMethodId = paymentMethodId
            response.amount = paymentIntent.getAmount() / 100.0 // Convert from cents

            return response

        } catch (Exception e) {
            throw new RuntimeException("Failed to confirm payment intent: ${e.getMessage()}", e)
        }
    }

    /**
     * Processes refund for cancelled appointments
     */
    Map<String, Object> processRefund(String paymentIntentId, BigDecimal amount, String reason) {
        try {
            // Set Stripe API key
            Stripe.apiKey = stripeSecretKey

            // Convert amount to cents for Stripe
            Long amountInCents = Math.round(amount * 100)

            // Create refund with Stripe
            RefundCreateParams params = RefundCreateParams.builder()
                .setPaymentIntent(paymentIntentId)
                .setAmount(amountInCents)
                .setReason(RefundCreateParams.Reason.REQUESTED_BY_CUSTOMER)
                .putMetadata("reason", reason ?: "Appointment cancelled")
                .build()

            Refund refund = Refund.create(params)

            return [
                refundId: refund.getId(),
                status: refund.getStatus(),
                amount: refund.getAmount() / 100.0,
                currency: refund.getCurrency(),
                reason: reason
            ]

        } catch (Exception e) {
            throw new RuntimeException("Failed to process refund: ${e.getMessage()}", e)
        }
    }

    /**
     * Updates appointment with payment information
     */
    void updateAppointmentPayment(UUID appointmentId, String paymentIntentId, String status) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow { new RuntimeException("Appointment not found") }

        appointment.paymentIntentId = paymentIntentId
        appointment.paymentStatus = status

        appointmentRepository.save(appointment)
    }

    /**
     * Updates appointment with refund information
     */
    void updateAppointmentRefund(String paymentIntentId, String refundId, String refundStatus, BigDecimal refundAmount) {
        Appointment appointment = appointmentRepository.findByPaymentIntentId(paymentIntentId)
                .orElseThrow { new RuntimeException("Appointment not found for payment intent: ${paymentIntentId}") }

        appointment.refundId = refundId
        appointment.refundStatus = refundStatus
        appointment.refundAmount = refundAmount
        appointment.refundDate = LocalDateTime.now()

        appointmentRepository.save(appointment)
    }

    /**
     * Validates payment amount matches service price
     */
    boolean validatePaymentAmount(UUID serviceId, BigDecimal amount) {
        // This would validate against the service price
        // For now, return true as mock implementation
        return true
    }

    /**
     * Get currency code based on country (supports both country codes and names)
     */
    String getCurrencyForCountry(String country) {
        Map<String, String> currencyMap = [
            // Country codes (ISO 3166-1 alpha-2)
            'BG': 'bgn',
            'US': 'usd',
            'CA': 'cad',
            'GB': 'gbp',
            'DE': 'eur',
            'FR': 'eur',
            'IT': 'eur',
            'ES': 'eur',
            'NL': 'eur',
            'BE': 'eur',
            'AT': 'eur',
            'PT': 'eur',
            'GR': 'eur',
            'IE': 'eur',
            'FI': 'eur',
            'LU': 'eur',
            'SI': 'eur',
            'SK': 'eur',
            'EE': 'eur',
            'LV': 'eur',
            'LT': 'eur',
            'MT': 'eur',
            'CY': 'eur',
            'AU': 'aud',
            'NZ': 'nzd',
            'JP': 'jpy',
            'CH': 'chf',
            'SE': 'sek',
            'NO': 'nok',
            'DK': 'dkk',
            'PL': 'pln',
            'CZ': 'czk',
            'HU': 'huf',
            'RO': 'ron',
            'HR': 'hrk',
            'RS': 'rsd',
            'TR': 'try',
            'RU': 'rub',
            'UA': 'uah',
            'IN': 'inr',
            'CN': 'cny',
            'KR': 'krw',
            'SG': 'sgd',
            'HK': 'hkd',
            'MY': 'myr',
            'TH': 'thb',
            'PH': 'php',
            'ID': 'idr',
            'VN': 'vnd',
            'BR': 'brl',
            'MX': 'mxn',
            'AR': 'ars',
            'CL': 'clp',
            'CO': 'cop',
            'PE': 'pen',
            'ZA': 'zar',
            'EG': 'egp',
            'IL': 'ils',
            'SA': 'sar',
            'AE': 'aed',
            'KW': 'kwd',
            'QA': 'qar',
            // Full country names (for backward compatibility)
            'Bulgaria': 'bgn',
            'United States': 'usd',
            'USA': 'usd',
            'Canada': 'cad',
            'United Kingdom': 'gbp',
            'UK': 'gbp',
            'Germany': 'eur',
            'France': 'eur',
            'Italy': 'eur',
            'Spain': 'eur',
            'Netherlands': 'eur',
            'Belgium': 'eur',
            'Austria': 'eur',
            'Portugal': 'eur',
            'Greece': 'eur',
            'Ireland': 'eur',
            'Finland': 'eur',
            'Luxembourg': 'eur',
            'Slovenia': 'eur',
            'Slovakia': 'eur',
            'Estonia': 'eur',
            'Latvia': 'eur',
            'Lithuania': 'eur',
            'Malta': 'eur',
            'Cyprus': 'eur',
            'Australia': 'aud',
            'New Zealand': 'nzd',
            'Japan': 'jpy',
            'Switzerland': 'chf',
            'Sweden': 'sek',
            'Norway': 'nok',
            'Denmark': 'dkk',
            'Poland': 'pln',
            'Czech Republic': 'czk',
            'Hungary': 'huf',
            'Romania': 'ron',
            'Croatia': 'hrk',
            'Serbia': 'rsd',
            'Turkey': 'try',
            'Russia': 'rub',
            'Ukraine': 'uah',
            'India': 'inr',
            'China': 'cny',
            'South Korea': 'krw',
            'Singapore': 'sgd',
            'Hong Kong': 'hkd',
            'Malaysia': 'myr',
            'Thailand': 'thb',
            'Philippines': 'php',
            'Indonesia': 'idr',
            'Vietnam': 'vnd',
            'Brazil': 'brl',
            'Mexico': 'mxn',
            'Argentina': 'ars',
            'Chile': 'clp',
            'Colombia': 'cop',
            'Peru': 'pen',
            'South Africa': 'zar',
            'Egypt': 'egp',
            'Israel': 'ils',
            'Saudi Arabia': 'sar',
            'UAE': 'aed',
            'Kuwait': 'kwd',
            'Qatar': 'qar'
        ]
        return (currencyMap[country] ?: 'usd').toUpperCase() // Default to USD if country not found
    }
}
