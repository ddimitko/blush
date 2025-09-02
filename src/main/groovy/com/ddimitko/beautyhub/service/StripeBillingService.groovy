package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.dto.*
import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.entity.ShopStripeDetails
import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.enums.BusinessType
import com.ddimitko.beautyhub.enums.SubscriptionPlan
import com.ddimitko.beautyhub.repository.ShopRepository
import com.ddimitko.beautyhub.repository.UserRepository
import com.ddimitko.beautyhub.service.ShopStripeDetailsService
import com.ddimitko.beautyhub.service.StripeBillingServiceHelper
import com.stripe.exception.StripeException
import com.stripe.model.*
import com.stripe.model.billingportal.Session as PortalSession
import com.stripe.param.*
import com.stripe.param.SetupIntentCreateParams
import com.stripe.param.billingportal.SessionCreateParams
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Slf4j
class StripeBillingService {

    @Autowired
    private ShopRepository shopRepository

    @Autowired
    private ShopStripeDetailsService shopStripeDetailsService

    @Autowired
    private StripeBillingServiceHelper stripeBillingServiceHelper

    @Autowired
    private StripeCustomerService stripeCustomerService

    @Autowired
    private UserRepository userRepository

    /**
     * Creates a subscription with incomplete status for payment collection
     * This creates the subscription immediately but requires payment to activate
     */
    Map<String, Object> createPaymentIntent(UUID shopId, Map<String, Object> request) {
        try {
            log.info("Creating subscription with payment intent for shop: ${shopId}")

            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            // Check subscription status from Stripe details
            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)
            if (stripeDetails.hasSubscription()) {
                // Fetch actual status from Stripe API for security
                try {
                    Subscription subscription = Subscription.retrieve(stripeDetails.subscriptionId)
                    if (subscription.status == "active" || subscription.status == "trialing") {
                        throw new IllegalArgumentException("Shop already has an active subscription")
                    }
                } catch (StripeException e) {
                    log.warn("Could not verify subscription status from Stripe: ${e.message}")
                }
            }

            String stripePriceId = request.stripePriceId
            String customerName = request.customerName
            String customerEmail = request.customerEmail
            Map<String, String> billingAddress = request.billingAddress

            log.info("Validating customer details for subscription creation")

            // Validate required fields
            if (!stripePriceId?.trim()) {
                throw new IllegalArgumentException("Subscription plan is required")
            }
            if (!customerName?.trim()) {
                throw new IllegalArgumentException("Customer name is required")
            }
            if (!customerEmail?.trim()) {
                throw new IllegalArgumentException("Customer email is required")
            }
            if (!billingAddress?.line1?.trim()) {
                throw new IllegalArgumentException("Billing address is required")
            }
            if (!billingAddress?.city?.trim()) {
                throw new IllegalArgumentException("City is required")
            }
            if (!billingAddress?.country?.trim()) {
                throw new IllegalArgumentException("Country is required")
            }

            // Use shop owner's existing Stripe customer
            String customerId = stripeCustomerService.getOrCreateStripeCustomer(shop.owner)
            log.info("Using shop owner's Stripe customer: ${customerId} for shop: ${shopId}")

            // Update customer with billing details
            try {
                CustomerUpdateParams.Address.Builder addressBuilder = CustomerUpdateParams.Address.builder()
                    .setLine1(billingAddress.line1.trim())
                    .setCity(billingAddress.city.trim())
                    .setCountry(billingAddress.country.trim())

                if (billingAddress.line2?.trim()) {
                    addressBuilder.setLine2(billingAddress.line2.trim())
                }
                if (billingAddress.state?.trim()) {
                    addressBuilder.setState(billingAddress.state.trim())
                }
                if (billingAddress.postal_code?.trim()) {
                    addressBuilder.setPostalCode(billingAddress.postal_code.trim())
                }

                CustomerUpdateParams updateParams = CustomerUpdateParams.builder()
                    .setName(customerName.trim())
                    .setEmail(customerEmail.trim())
                    .setAddress(addressBuilder.build())
                    .build()

                Customer customer = Customer.retrieve(customerId)
                customer.update(updateParams)
                log.info("Successfully updated shop owner's Stripe customer: ${customerId}")
            } catch (StripeException e) {
                log.error("Stripe customer update failed: ${e.message}", e)
                throw new IllegalArgumentException("Failed to update customer account: ${e.userMessage ?: e.message}")
            }

            // Create subscription with incomplete status - this will create a payment intent automatically
            SubscriptionCreateParams subscriptionParams = SubscriptionCreateParams.builder()
                .setCustomer(customerId)
                .addItem(
                    SubscriptionCreateParams.Item.builder()
                        .setPrice(stripePriceId)
                        .build()
                )
                .setPaymentBehavior(SubscriptionCreateParams.PaymentBehavior.DEFAULT_INCOMPLETE)
                .setPaymentSettings(
                    SubscriptionCreateParams.PaymentSettings.builder()
                        .setSaveDefaultPaymentMethod(SubscriptionCreateParams.PaymentSettings.SaveDefaultPaymentMethod.ON_SUBSCRIPTION)
                        .setPaymentMethodTypes(["card"])
                        .build()
                )
                .putMetadata("shop_id", shopId.toString())
                .putMetadata("shop_name", shop.name)
                .addExpand("latest_invoice")
                .addExpand("latest_invoice.payment_intent")
                .build()

            log.info("Creating subscription with customer: ${customerId}, price: ${stripePriceId}")
            Subscription subscription = Subscription.create(subscriptionParams)
            log.info("Subscription created: ${subscription.id}, status: ${subscription.status}")

            // Extract client secret from the subscription's payment intent
            String clientSecret = null
            String paymentIntentId = null
            try {
                log.info("Extracting client secret from subscription ${subscription.id}")
                log.info("Subscription status: ${subscription.status}")
                log.info("Latest invoice: ${subscription.latestInvoice}")

                if (subscription.latestInvoice) {
                    def latestInvoice = subscription.latestInvoice
                    Invoice invoice = null

                    if (latestInvoice instanceof String) {
                        log.info("Latest invoice is string ID: ${latestInvoice}")
                        invoice = Invoice.retrieve(latestInvoice)
                    } else {
                        log.info("Latest invoice is object")
                        invoice = latestInvoice
                    }

                    log.info("Invoice ID: ${invoice?.id}, Payment Intent: ${invoice?.getPaymentIntent()}")

                    if (invoice?.getPaymentIntent()) {
                        def paymentIntentRef = invoice.getPaymentIntent()
                        PaymentIntent pi = null

                        if (paymentIntentRef instanceof String) {
                            log.info("Payment intent is string ID: ${paymentIntentRef}")
                            pi = PaymentIntent.retrieve(paymentIntentRef)
                        } else {
                            log.info("Payment intent is object")
                            pi = paymentIntentRef
                        }

                        if (pi) {
                            clientSecret = pi.clientSecret
                            paymentIntentId = pi.id
                            log.info("Extracted client secret for payment intent: ${paymentIntentId}")
                        }
                    }
                }
            } catch (Exception e) {
                log.error("Error extracting client secret: ${e.message}", e)
            }

            if (!clientSecret) {
                log.error("No client secret found for subscription ${subscription.id}")
                log.error("Subscription details: status=${subscription.status}, latestInvoice=${subscription.latestInvoice}")
                throw new RuntimeException("Failed to create subscription - no client secret available")
            }

            log.info("Successfully created subscription for shop ${shopId}: subscription=${subscription.id}, paymentIntent=${paymentIntentId}")

            // Store subscription ID temporarily (will be activated after payment)
            shopStripeDetailsService.updateSubscription(shop, subscription.id, customerId, stripePriceId)

            return [
                subscriptionId: subscription.id,
                paymentIntentId: paymentIntentId,
                clientSecret: clientSecret,
                status: subscription.status,
                customerId: customerId,
                stripePriceId: stripePriceId,
                requiresPayment: true
            ]

        } catch (StripeException e) {
            log.error("Stripe error creating subscription for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to create subscription: ${e.message}")
        } catch (Exception e) {
            log.error("Error creating subscription for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to create subscription: ${e.message}")
        }
    }

    /**
     * Creates a payment intent for subscription setup (new workflow)
     * This creates only a payment intent for collecting payment method, not a subscription
     */
    Map<String, Object> createSubscriptionSetupPaymentIntent(UUID shopId, Map<String, Object> request) {
        try {
            log.info("Creating subscription setup payment intent for shop: ${shopId}")

            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            if (shopStripeDetailsService.isSubscriptionActive(shop)) {
                throw new IllegalArgumentException("Shop already has an active subscription")
            }

            String stripePriceId = request.stripePriceId as String
            if (!stripePriceId) {
                throw new IllegalArgumentException("Price ID is required")
            }

            // Get price to calculate amount
            Price price = Price.retrieve(stripePriceId)
            if (!price) {
                throw new IllegalArgumentException("Invalid price ID: ${stripePriceId}")
            }

            // Use shop owner's existing Stripe customer
            String customerName = request.customerName as String
            String customerEmail = request.customerEmail as String
            Map<String, Object> billingAddress = request.billingAddress as Map<String, Object>

            if (!customerName || !customerEmail) {
                throw new IllegalArgumentException("Customer name and email are required")
            }

            // Get the shop owner's existing Stripe customer
            String customerId = stripeCustomerService.getOrCreateStripeCustomer(shop.owner)
            log.info("Using shop owner's Stripe customer: ${customerId} for shop: ${shopId}")

            // Update customer with billing details if provided
            if (billingAddress) {
                CustomerUpdateParams.Builder updateBuilder = CustomerUpdateParams.builder()
                    .setName(customerName.trim())
                    .setEmail(customerEmail.trim())

                CustomerUpdateParams.Address.Builder addressBuilder = CustomerUpdateParams.Address.builder()
                    .setLine1(billingAddress.line1 as String)
                    .setCity(billingAddress.city as String)
                    .setCountry(billingAddress.country as String)

                if (billingAddress.line2) {
                    addressBuilder.setLine2(billingAddress.line2 as String)
                }
                if (billingAddress.state) {
                    addressBuilder.setState(billingAddress.state as String)
                }
                if (billingAddress.postal_code) {
                    addressBuilder.setPostalCode(billingAddress.postal_code as String)
                }

                updateBuilder.setAddress(addressBuilder.build())

                Customer customer = Customer.retrieve(customerId)
                customer.update(updateBuilder.build())
                log.info("Updated shop owner's Stripe customer ${customerId} with billing details")
            }

            // Create setup intent for collecting payment method (not charging immediately)
            SetupIntentCreateParams setupIntentParams = SetupIntentCreateParams.builder()
                .setCustomer(customerId)
                .setUsage(SetupIntentCreateParams.Usage.OFF_SESSION)
                .setDescription("Payment method setup for subscription to ${shop.name}")
                .putMetadata("shop_id", shopId.toString())
                .putMetadata("stripe_price_id", stripePriceId)
                .putMetadata("setup_type", "subscription")
                .setAutomaticPaymentMethods(
                    SetupIntentCreateParams.AutomaticPaymentMethods.builder()
                        .setEnabled(true)
                        .build()
                )
                .build()

            SetupIntent setupIntent = SetupIntent.create(setupIntentParams)
            log.info("Created setup intent: ${setupIntent.id} for shop: ${shopId}")

            // Store customer ID and setup intent temporarily
            shopStripeDetailsService.updateSubscription(shop, null, customerId, stripePriceId)

            return [
                setupIntentId: setupIntent.id,
                clientSecret: setupIntent.clientSecret,
                customerId: customerId,
                stripePriceId: stripePriceId,
                amount: price.unitAmount,
                currency: price.currency,
                requiresPayment: true
            ]

        } catch (StripeException e) {
            log.error("Stripe error creating subscription setup payment intent for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to create payment intent: ${e.message}")
        } catch (Exception e) {
            log.error("Error creating subscription setup payment intent for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to create payment intent: ${e.message}")
        }
    }

    /**
     * Creates a subscription intent for Payment Element integration
     * WARNING: This method creates and persists a complete subscription
     */
    Map<String, Object> createSubscriptionIntent(UUID shopId, Map<String, Object> request) {
        try {
            log.info("Creating subscription intent for shop: ${shopId}")

            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            if (shopStripeDetailsService.isSubscriptionActive(shop)) {
                throw new IllegalArgumentException("Shop already has an active subscription")
            }

            String stripePriceId = request.stripePriceId as String
            if (!stripePriceId) {
                throw new IllegalArgumentException("Price ID is required")
            }

            // Validate that the price exists in Stripe
            try {
                Price.retrieve(stripePriceId)
            } catch (StripeException e) {
                log.error("Invalid Stripe price ID: ${stripePriceId}", e)
                throw new IllegalArgumentException("The selected subscription plan is not available. Please try a different plan.")
            }

            // Extract customer details from request
            String customerName = request.customerName as String
            String customerEmail = request.customerEmail as String
            Map<String, String> billingAddress = request.billingAddress as Map<String, String>

            // Enhanced validation - ensure all required fields are present before making Stripe API calls
            if (!customerName?.trim()) {
                throw new IllegalArgumentException("Customer name is required and cannot be empty")
            }

            if (!customerEmail?.trim()) {
                throw new IllegalArgumentException("Customer email is required and cannot be empty")
            }

            // Validate email format
            if (!customerEmail.matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                throw new IllegalArgumentException("Please provide a valid email address")
            }

            if (!billingAddress) {
                throw new IllegalArgumentException("Billing address is required")
            }

            if (!billingAddress.line1?.trim()) {
                throw new IllegalArgumentException("Billing address line 1 is required")
            }

            if (!billingAddress.city?.trim()) {
                throw new IllegalArgumentException("Billing city is required")
            }

            if (!billingAddress.country?.trim()) {
                throw new IllegalArgumentException("Billing country is required")
            }

            if (!billingAddress.postal_code?.trim()) {
                throw new IllegalArgumentException("Postal code is required")
            }

            // Country-specific validation
            String country = billingAddress.country.toUpperCase()
            switch (country) {
                case 'US':
                case 'CA':
                case 'AU':
                    if (!billingAddress.state?.trim()) {
                        throw new IllegalArgumentException("State/Province is required for ${country}")
                    }
                    break
            }

            log.info("✅ Customer details validation passed for shop ${shopId}")

            // Use shop owner's existing Stripe customer
            String customerId = stripeCustomerService.getOrCreateStripeCustomer(shop.owner)
            log.info("🔄 Using shop owner's Stripe customer: ${customerId} for shop: ${shopId}")

            // Update customer with validated billing details
            try {
                CustomerUpdateParams.Address.Builder addressBuilder = CustomerUpdateParams.Address.builder()
                    .setLine1(billingAddress.line1.trim())
                    .setCity(billingAddress.city.trim())
                    .setCountry(billingAddress.country.trim())

                if (billingAddress.line2?.trim()) {
                    addressBuilder.setLine2(billingAddress.line2.trim())
                }
                if (billingAddress.state?.trim()) {
                    addressBuilder.setState(billingAddress.state.trim())
                }
                if (billingAddress.postal_code?.trim()) {
                    addressBuilder.setPostalCode(billingAddress.postal_code.trim())
                }

                CustomerUpdateParams updateParams = CustomerUpdateParams.builder()
                    .setName(customerName.trim())
                    .setEmail(customerEmail.trim())
                    .setAddress(addressBuilder.build())
                    .build()

                Customer customer = Customer.retrieve(customerId)
                customer.update(updateParams)
                log.info("✅ Successfully updated shop owner's Stripe customer: ${customerId}")
            } catch (StripeException e) {
                log.error("❌ Stripe customer update failed: ${e.message}", e)
                throw new IllegalArgumentException("Failed to update customer account: ${e.userMessage ?: e.message}")
            }

            // Create subscription with incomplete status for Payment Element
            // Always require immediate payment to ensure payment method is collected
            // Following Stripe's documentation: https://docs.stripe.com/billing/subscriptions/build-subscriptions
            SubscriptionCreateParams subscriptionParams = SubscriptionCreateParams.builder()
                .setCustomer(customerId)
                .addItem(
                    SubscriptionCreateParams.Item.builder()
                        .setPrice(stripePriceId)
                        .build()
                )
                .setPaymentBehavior(SubscriptionCreateParams.PaymentBehavior.DEFAULT_INCOMPLETE)
                .setPaymentSettings(
                    SubscriptionCreateParams.PaymentSettings.builder()
                        .setSaveDefaultPaymentMethod(SubscriptionCreateParams.PaymentSettings.SaveDefaultPaymentMethod.ON_SUBSCRIPTION)
                        .setPaymentMethodTypes(["card"])
                        .build()
                )
                .putMetadata("shop_id", shopId.toString())
                .putMetadata("shop_name", shop.name)
                .addExpand("latest_invoice")
                .addExpand("latest_invoice.payment_intent")
                .build()

            log.info("Creating subscription with params: customer=${customerId}, price=${stripePriceId}")
            Subscription subscription = Subscription.create(subscriptionParams)
            log.info("Subscription created: ${subscription.id}, status: ${subscription.status}")

            // Extract client secret from latest invoice payment_intent for Payment Element
            // Following Stripe's documentation: https://docs.stripe.com/billing/subscriptions/build-subscriptions
            String clientSecret = null

            log.info("Extracting client secret from subscription ${subscription.id}")
            log.info("Subscription status: ${subscription.status}")
            log.info("Latest invoice: ${subscription.latestInvoice}")

            try {
                // Check if latest invoice is expanded
                if (subscription.latestInvoice) {
                    def latestInvoice = subscription.latestInvoice
                    log.info("Latest invoice type: ${latestInvoice.getClass().name}")

                    if (latestInvoice instanceof String) {
                        // Latest invoice is just an ID, need to retrieve the full invoice
                        log.info("Retrieving invoice by ID: ${latestInvoice}")
                        Invoice invoice = Invoice.retrieve(latestInvoice)
                        log.info("Retrieved invoice: ${invoice.id}, status: ${invoice.status}, payment_intent: ${invoice.paymentIntent}")

                        // Check if invoice has a payment_intent
                        if (invoice.paymentIntent) {
                            if (invoice.paymentIntent instanceof String) {
                                log.info("Retrieving payment intent by ID: ${invoice.paymentIntent}")
                                PaymentIntent paymentIntent = PaymentIntent.retrieve(invoice.paymentIntent)
                                clientSecret = paymentIntent.clientSecret
                                log.info("Client secret extracted from payment_intent: ${clientSecret}")
                            } else {
                                // Payment intent is already expanded
                                clientSecret = invoice.paymentIntent.clientSecret
                                log.info("Client secret extracted from expanded payment_intent: ${clientSecret}")
                            }
                        } else {
                            log.info("Invoice ${invoice.id} does not have a payment_intent")
                        }
                    } else {
                        // Latest invoice is already expanded
                        log.info("Latest invoice is expanded, checking payment_intent")
                        if (latestInvoice.paymentIntent?.clientSecret) {
                            clientSecret = latestInvoice.paymentIntent.clientSecret
                            log.info("Client secret extracted from expanded latest invoice payment_intent: ${clientSecret}")
                        } else {
                            log.info("Expanded latest invoice does not have payment_intent with client_secret")
                        }
                    }
                } else {
                    log.info("No latest invoice found on subscription")
                }
            } catch (Exception e) {
                log.error("Error extracting client secret from payment_intent: ${e.message}", e)
                // Don't throw here - we'll handle this case below
            }

            if (!clientSecret) {
                log.warn("No client secret found for subscription ${subscription.id} with status ${subscription.status}")
                log.warn("This might indicate an issue with subscription creation or the subscription doesn't require payment")
            } else {
                log.info("Successfully extracted client secret for subscription ${subscription.id}")
            }

            log.info("Successfully created subscription intent for shop ${shopId}: ${subscription.id}")

            // Only persist subscription details after successful creation
            // Customer ID was already persisted above after successful customer creation
            try {
                // Update Stripe details instead of shop directly
                ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)
                stripeDetails.subscriptionId = subscription.id
                stripeDetails.stripePriceId = request.stripePriceId
                shopStripeDetailsService.save(stripeDetails)

                shop.active = false // Will be updated via webhook when payment succeeds
                shopRepository.save(shop)
                log.info("✅ Persisted subscription details to database: subscriptionId=${subscription.id}, priceId=${request.stripePriceId}")
            } catch (Exception e) {
                log.error("❌ Failed to persist subscription details to database: ${e.message}", e)
                // If we can't save to database, we should clean up the Stripe subscription
                try {
                    subscription.cancel()
                    log.info("🧹 Cleaned up Stripe subscription due to database persistence failure")
                } catch (Exception cleanupError) {
                    log.error("❌ Failed to cleanup Stripe subscription: ${cleanupError.message}", cleanupError)
                }
                throw new RuntimeException("Failed to save subscription details: ${e.message}")
            }

            return [
                subscriptionId: subscription.id,
                clientSecret: clientSecret,
                status: subscription.status,
                customerId: customerId,
                stripePriceId: request.stripePriceId
            ]

        } catch (StripeException e) {
            log.error("Stripe error creating subscription intent for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to create subscription intent: ${e.message}")
        } catch (Exception e) {
            log.error("Error creating subscription intent for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to create subscription intent: ${e.message}")
        }
    }

    /**
     * Confirms setup intent and creates/activates subscription for existing shop
     * Similar to confirmSetupAndCreateShop but for existing shops
     */
    @Transactional
    Map<String, Object> confirmSetupAndActivateSubscription(UUID shopId, String setupIntentId) {
        try {
            log.info("Confirming setup intent and activating subscription for shop: ${shopId}, setupIntentId: ${setupIntentId}")

            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            if (shopStripeDetailsService.isSubscriptionActive(shop)) {
                throw new IllegalArgumentException("Shop already has an active subscription")
            }

            // Retrieve the setup intent to get metadata
            SetupIntent setupIntent = SetupIntent.retrieve(setupIntentId)
            log.info("Retrieved setup intent: ${setupIntent.id}, status: ${setupIntent.status}")

            if (setupIntent.status != "succeeded") {
                throw new IllegalArgumentException("Setup intent has not succeeded")
            }

            String customerId = setupIntent.customer
            String stripePriceId = setupIntent.metadata.get("stripe_price_id")
            String paymentMethodId = setupIntent.paymentMethod

            if (!customerId || !stripePriceId || !paymentMethodId) {
                throw new IllegalArgumentException("Missing required data from setup intent")
            }

            log.info("Setup intent confirmed - Customer: ${customerId}, Price: ${stripePriceId}, PaymentMethod: ${paymentMethodId}")

            // Create subscription with the attached payment method and 30-day free trial
            SubscriptionCreateParams subscriptionParams = SubscriptionCreateParams.builder()
                .setCustomer(customerId)
                .setDefaultPaymentMethod(paymentMethodId)
                .addItem(SubscriptionCreateParams.Item.builder()
                    .setPrice(stripePriceId)
                    .build())
                .setTrialPeriodDays(30L) // 30-day free trial
                .addExpand("latest_invoice.payment_intent")
                .putMetadata("shop_id", shop.id.toString())
                .putMetadata("shop_name", shop.name)
                .build()

            Subscription subscription = Subscription.create(subscriptionParams)
            log.info("Created subscription: ${subscription.id} with status: ${subscription.status}")

            // Update shop with Stripe details
            shopStripeDetailsService.updateSubscription(shop, subscription.id, customerId, stripePriceId)

            // Activate shop if subscription is active or trialing
            if (subscription.status == "active" || subscription.status == "trialing") {
                shop.active = true
                shopRepository.save(shop)
                log.info("Activated shop: ${shop.id} with status: ${subscription.status}")
            }

            return [
                success: true,
                shopId: shop.id,
                shopName: shop.name,
                shopActive: shop.active,
                subscriptionId: subscription.id,
                subscriptionStatus: subscription.status,
                customerId: customerId,
                paymentMethodId: paymentMethodId,
                message: shop.active ? "Subscription activated successfully!" : "Subscription created! Activation pending."
            ]

        } catch (StripeException e) {
            log.error("Stripe error confirming setup and activating subscription: ${e.getMessage()}", e)
            throw new RuntimeException("Failed to confirm setup and activate subscription: ${e.getMessage()}")
        } catch (Exception e) {
            log.error("Error confirming setup and activating subscription: ${e.getMessage()}", e)
            throw new RuntimeException("Failed to confirm setup and activate subscription: ${e.getMessage()}")
        }
    }

    /**
     * Confirms and creates/activates a subscription after successful payment (supports both workflows)
     * New workflow: Creates subscription after payment confirmation
     * Old workflow: Activates existing subscription after payment
     */
    Map<String, Object> confirmSubscription(UUID shopId, String paymentIntentId) {
        try {
            log.info("Confirming subscription for shop: ${shopId}, paymentIntentId: ${paymentIntentId}")

            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            // Check if this is the new workflow (no existing subscription) or old workflow
            if (stripeBillingServiceHelper.hasSubscriptionSetup(shop)) {
                // Old workflow - subscription already exists, just activate it
                return confirmExistingSubscription(shop, paymentIntentId)
            } else {
                // New workflow - create subscription after payment confirmation
                return createSubscriptionAfterPayment(shop, paymentIntentId)
            }

        } catch (StripeException e) {
            log.error("Stripe error confirming subscription for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to confirm subscription: ${e.message}")
        } catch (Exception e) {
            log.error("Error confirming subscription for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to confirm subscription: ${e.message}")
        }
    }

    /**
     * Handles the old workflow where subscription already exists
     */
    private Map<String, Object> confirmExistingSubscription(Shop shop, String paymentIntentId) {
        // Retrieve the subscription to check its current status
        Subscription subscription = stripeBillingServiceHelper.retrieveSubscription(shop)
        log.info("Retrieved existing subscription: ${subscription.id}, status: ${subscription.status}")

        if (subscription.status == "active" || subscription.status == "trialing") {
            // Subscription is already active, just update shop status
            shop.active = true
            shopRepository.save(shop)

            log.info("Subscription ${subscription.id} is already active for shop ${shop.id}")

            return [
                success: true,
                subscriptionId: subscription.id,
                paymentIntentId: paymentIntentId,
                status: subscription.status,
                shopActive: true,
                message: "Subscription is active"
            ]
        } else if (subscription.status == "incomplete") {
            // Check if payment was successful
            PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId)
            log.info("Retrieved payment intent: ${paymentIntent.id}, status: ${paymentIntent.status}")

            if (paymentIntent.status == "succeeded") {
                // Payment succeeded, subscription should automatically become active
                // Refresh subscription status from Stripe
                String subscriptionId = shop.stripeDetails?.subscriptionId
                if (subscriptionId) {
                    subscription = Subscription.retrieve(subscriptionId)

                    // Update shop with current subscription status
                    shop.active = (subscription.status == "active" || subscription.status == "trialing")
                    shopRepository.save(shop)
                }

                log.info("Successfully activated shop ${shop.id} with subscription ${subscription.id}, status: ${subscription.status}")

                return [
                    success: true,
                    subscriptionId: subscription.id,
                    paymentIntentId: paymentIntentId,
                    status: subscription.status,
                    shopActive: shop.active,
                    message: "Subscription activated successfully"
                ]
            } else {
                log.warn("Payment intent ${paymentIntentId} is not successful, status: ${paymentIntent.status}")
                return [
                    success: false,
                    subscriptionId: subscription.id,
                    paymentIntentId: paymentIntentId,
                    status: subscription.status,
                    shopActive: false,
                    message: "Payment is still pending or failed"
                ]
            }
        } else {
            log.warn("Subscription ${subscription.id} has unexpected status: ${subscription.status}")
            return [
                success: false,
                subscriptionId: subscription.id,
                paymentIntentId: paymentIntentId,
                status: subscription.status,
                shopActive: false,
                message: "Subscription has unexpected status: ${subscription.status}"
            ]
        }
    }

    /**
     * Handles the new workflow where subscription is created after setup intent confirmation
     */
    private Map<String, Object> createSubscriptionAfterPayment(Shop shop, String setupIntentId) {
        // Retrieve and validate setup intent
        SetupIntent setupIntent = SetupIntent.retrieve(setupIntentId)
        log.info("Retrieved setup intent: ${setupIntent.id}, status: ${setupIntent.status}")

        if (setupIntent.status != "succeeded") {
            throw new RuntimeException("Setup intent ${setupIntentId} has status: ${setupIntent.status}, expected 'succeeded'")
        }

        // Get payment method from setup intent
        String paymentMethodId = setupIntent.paymentMethod
        if (!paymentMethodId) {
            throw new RuntimeException("No payment method found on setup intent ${setupIntentId}")
        }

        // Get required data from setup intent metadata
        String stripePriceId = setupIntent.metadata.get("stripe_price_id")
        if (!stripePriceId) {
            throw new RuntimeException("No stripe_price_id found in setup intent metadata")
        }

        // Ensure we have customer ID
        String customerId = shop.stripeDetails?.stripeCustomerId ?: setupIntent.customer
        if (!customerId) {
            throw new RuntimeException("No customer ID found for shop ${shop.id}")
        }

        log.info("Creating subscription with customer: ${customerId}, paymentMethod: ${paymentMethodId}, price: ${stripePriceId}")

        // Payment method is already attached by the setup intent, just set as default
        Customer customer = Customer.retrieve(customerId)
        customer.update(CustomerUpdateParams.builder()
            .setInvoiceSettings(CustomerUpdateParams.InvoiceSettings.builder()
                .setDefaultPaymentMethod(paymentMethodId)
                .build())
            .build())

        log.info("Set payment method ${paymentMethodId} as default for customer ${customerId}")

        // Create subscription with the attached payment method
        SubscriptionCreateParams subscriptionParams = SubscriptionCreateParams.builder()
            .setCustomer(customerId)
            .setDefaultPaymentMethod(paymentMethodId)
            .addItem(SubscriptionCreateParams.Item.builder()
                .setPrice(stripePriceId)
                .build())
            .setPaymentBehavior(SubscriptionCreateParams.PaymentBehavior.DEFAULT_INCOMPLETE)
            .setPaymentSettings(SubscriptionCreateParams.PaymentSettings.builder()
                .setSaveDefaultPaymentMethod(SubscriptionCreateParams.PaymentSettings.SaveDefaultPaymentMethod.ON_SUBSCRIPTION)
                .setPaymentMethodTypes(["card"])
                .build())
            .putMetadata("shop_id", shop.id.toString())
            .putMetadata("shop_name", shop.name)
            .putMetadata("setup_intent_id", setupIntentId)
            .build()

        Subscription subscription = Subscription.create(subscriptionParams)
        log.info("Created subscription: ${subscription.id}, status: ${subscription.status}")

        // Update shop with subscription details
        ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)
        stripeDetails.subscriptionId = subscription.id
        stripeDetails.stripeCustomerId = customerId
        stripeDetails.stripePriceId = stripePriceId
        shopStripeDetailsService.save(stripeDetails)

        shop.active = (subscription.status == "active" || subscription.status == "trialing")
        shopRepository.save(shop)

        log.info("Successfully created and activated subscription ${subscription.id} for shop ${shop.id}")

        return [
            success: true,
            subscriptionId: subscription.id,
            setupIntentId: setupIntentId,
            paymentMethodId: paymentMethodId,
            customerId: customerId,
            status: subscription.status,
            shopActive: shop.active,
            message: "Subscription created and activated successfully"
        ]
    }

    /**
     * Creates a Stripe customer and subscription for a shop
     */
    SubscriptionResponse createSubscription(UUID shopId, SubscriptionRequest request) {
        try {
            log.info("Starting subscription creation for shop: ${shopId}")

            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            // Check if shop already has an active subscription via Stripe details
            if (shop.stripeDetails?.subscriptionId) {
                // Validate with Stripe to see if it's actually active
                try {
                    Subscription existingSubscription = Subscription.retrieve(shop.stripeDetails.subscriptionId)
                    if (existingSubscription.status == "active" || existingSubscription.status == "trialing") {
                        throw new IllegalArgumentException("Shop already has an active subscription")
                    }
                } catch (StripeException e) {
                    log.warn("Could not verify existing subscription ${shop.stripeDetails.subscriptionId}: ${e.message}")
                }
            }

            log.info("Creating Stripe customer for shop: ${shopId}")
            // Create or retrieve Stripe customer
            Customer customer = createOrRetrieveCustomer(shop, request)
            log.info("Stripe customer created/retrieved: ${customer.id}")

            // Validate that the price exists in Stripe
            log.info("Validating Stripe price: ${request.stripePriceId}")
            try {
                Price.retrieve(request.stripePriceId)
            } catch (StripeException e) {
                log.error("Invalid Stripe price ID: ${request.stripePriceId}", e)
                throw new IllegalArgumentException("The selected subscription plan is not available. Please try a different plan.")
            }

            log.info("Creating Stripe subscription with price: ${request.stripePriceId}")
            // Create subscription with default_incomplete payment behavior
            // This follows Stripe's recommended approach for subscriptions
            log.debug("Stripe subscription params: customer=${customer.id}, price=${request.stripePriceId}")

            // Check if the price requires immediate payment by retrieving price details
            Price priceDetails = Price.retrieve(request.stripePriceId)

            log.info("Price details: amount=${priceDetails.unitAmount}, currency=${priceDetails.currency}")

            // Always require immediate payment for all subscriptions
            // This ensures payment method is collected and validated before subscription activation
            SubscriptionCreateParams.PaymentBehavior paymentBehavior = SubscriptionCreateParams.PaymentBehavior.DEFAULT_INCOMPLETE

            Subscription subscription = Subscription.create(SubscriptionCreateParams.builder()
                    .setCustomer(customer.id)
                    .addItem(SubscriptionCreateParams.Item.builder()
                            .setPrice(request.stripePriceId)
                            .build())
                    .setTrialPeriodDays(30L) // 30-day free trial
                    .setPaymentBehavior(paymentBehavior)
                    .setPaymentSettings(SubscriptionCreateParams.PaymentSettings.builder()
                            .setSaveDefaultPaymentMethod(SubscriptionCreateParams.PaymentSettings.SaveDefaultPaymentMethod.ON_SUBSCRIPTION)
                            .setPaymentMethodTypes(["card"])
                            .build())
                    .putMetadata("shop_id", shop.id.toString())
                    .putMetadata("shop_name", shop.name)
                    .addExpand("latest_invoice.payment_intent")
                    .build())

            log.info("Stripe subscription created successfully: ${subscription.id}")

            log.info("Stripe subscription created: ${subscription.id} with status: ${subscription.status}")

            // Update shop with subscription details
            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)
            stripeDetails.stripeCustomerId = customer.id
            stripeDetails.subscriptionId = subscription.id
            stripeDetails.stripePriceId = request.stripePriceId
            shopStripeDetailsService.save(stripeDetails)

            // Activate shop immediately if subscription is active (no payment required)
            // Otherwise, keep inactive until payment succeeds via webhook
            if (subscription.status == "active" || subscription.status == "trialing") {
                shop.active = true
                log.info("Shop ${shopId} activated immediately - subscription status: ${subscription.status}")
            } else {
                shop.active = false
                log.info("Shop ${shopId} kept inactive - will be activated via webhook when payment succeeds")
            }

            shopRepository.save(shop)

            log.info("Shop updated with subscription details")

            // Build response
            return buildSubscriptionResponse(shop, subscription, customer)

        } catch (StripeException e) {
            log.error("Stripe error creating subscription for shop ${shopId}: ${e.message}", e)
            String userMessage = e.userMessage ?: e.message
            if (e.code == "resource_missing") {
                userMessage = "The selected subscription plan is not available. Please try a different plan."
            } else if (e.code == "invalid_request_error") {
                userMessage = "Invalid subscription request. Please check your payment details."
            }
            throw new IllegalArgumentException(userMessage)
        } catch (Exception e) {
            log.error("Unexpected error creating subscription for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to create subscription: ${e.message}")
        }
    }

    /**
     * Retrieves subscription details for a shop directly from Stripe API
     */
    SubscriptionResponse getSubscriptionDetails(UUID shopId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

        // Get Stripe details from ShopStripeDetails table
        ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)

        log.info("🔍 Getting subscription details for shop ${shopId}: subscriptionId=${stripeDetails.subscriptionId}, customerId=${stripeDetails.stripeCustomerId}, active=${shop.active}")

        try {
            if (!stripeDetails.subscriptionId) {
                log.info("📋 No subscription ID found for shop ${shopId}")
                // Return a response indicating no subscription instead of throwing an error
                SubscriptionResponse response = new SubscriptionResponse()
                response.shopId = shop.id
                response.subscriptionId = null
                response.customerId = stripeDetails.stripeCustomerId
                response.status = "incomplete"
                response.isActive = false
                response.requiresPayment = true
                response.message = "No subscription found. Please set up a subscription to activate your shop."
                response.amount = 0
                response.currency = getShopCurrency(shop)
                response.interval = "month"
                response.planDisplayName = "No Plan"
                response.cancelAtPeriodEnd = false
                return response
            }

            log.info("🔄 Retrieving subscription from Stripe API: ${stripeDetails.subscriptionId}")
            Subscription subscription = Subscription.retrieve(stripeDetails.subscriptionId)
            log.info("✅ Retrieved subscription from Stripe: ${subscription.id}, status: ${subscription.status}")

            Customer customer = null
            if (stripeDetails.stripeCustomerId) {
                log.info("🔄 Retrieving customer from Stripe API: ${stripeDetails.stripeCustomerId}")
                customer = Customer.retrieve(stripeDetails.stripeCustomerId)
                log.info("✅ Retrieved customer from Stripe: ${customer.id}")
            }

            // Sync local database with Stripe data
            boolean needsUpdate = false
            boolean isActive = subscription.status == "active" || subscription.status == "trialing"
            if (shop.active != isActive) {
                log.info("🔄 Syncing shop active status: ${shop.active} -> ${isActive}")
                shop.active = isActive
                needsUpdate = true
            }

            if (needsUpdate) {
                shopRepository.save(shop)
                log.info("✅ Synced local database with Stripe data")
            }

            return buildSubscriptionResponse(shop, subscription, customer)

        } catch (StripeException e) {
            if (e.code == "resource_missing") {
                log.warn("Subscription ${stripeDetails.subscriptionId} not found in Stripe for shop ${shopId}, cleaning up local data")
                // Clean up local subscription data
                stripeDetails.subscriptionId = null
                shopStripeDetailsService.save(stripeDetails)

                // Return a response indicating subscription needs to be set up
                SubscriptionResponse response = new SubscriptionResponse()
                response.shopId = shop.id
                response.subscriptionId = null
                response.customerId = stripeDetails.stripeCustomerId
                response.status = "incomplete"
                response.isActive = false
                response.requiresPayment = true
                response.message = "Subscription not found in Stripe. Please set up a new subscription."
                response.amount = 0
                response.currency = getShopCurrency(shop)
                response.interval = "month"
                response.planDisplayName = "No Plan"
                response.cancelAtPeriodEnd = false
                return response
            }
            log.error("Stripe error retrieving subscription for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to retrieve subscription: ${e.userMessage ?: e.message}")
        }
    }

    /**
     * Creates a customer portal session for subscription management
     */
    CustomerPortalResponse createCustomerPortalSession(UUID shopId, CustomerPortalRequest request) {
        try {
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            // Get Stripe details from ShopStripeDetails table
            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)

            if (!stripeDetails.stripeCustomerId) {
                throw new IllegalArgumentException("Shop does not have a Stripe customer")
            }

            PortalSession session = PortalSession.create(SessionCreateParams.builder()
                    .setCustomer(stripeDetails.stripeCustomerId)
                    .setReturnUrl(request.returnUrl)
                    .build())

            CustomerPortalResponse response = new CustomerPortalResponse()
            response.url = session.url
            response.sessionId = session.id
            return response

        } catch (StripeException e) {
            log.error("Stripe error creating customer portal session for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to create customer portal session: ${e.userMessage ?: e.message}")
        }
    }

    /**
     * Cancels a subscription
     */
    void cancelSubscription(UUID shopId) {
        try {
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            // Get Stripe details from ShopStripeDetails table
            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)

            if (!stripeDetails.subscriptionId) {
                throw new IllegalArgumentException("Shop does not have an active subscription")
            }

            Subscription subscription = Subscription.retrieve(stripeDetails.subscriptionId)
            subscription.cancel()

            shop.active = false
            shopRepository.save(shop)

        } catch (StripeException e) {
            log.error("Stripe error canceling subscription for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to cancel subscription: ${e.userMessage ?: e.message}")
        }
    }

    /**
     * Validates subscription status and syncs with Stripe
     */
    boolean validateSubscription(UUID shopId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

        // Get Stripe details from ShopStripeDetails table
        ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)

        try {
            if (!stripeDetails.subscriptionId) {
                return false
            }

            Subscription subscription = Subscription.retrieve(stripeDetails.subscriptionId)
            boolean isActive = subscription.status == "active" || subscription.status == "trialing"

            // Update active status based on subscription status
            if (shop.active != isActive) {
                shop.active = isActive
                shopRepository.save(shop)
                log.info("Synced subscription status for shop ${shopId}: ${subscription.status}, active: ${isActive}")
            }

            return isActive

        } catch (StripeException e) {
            if (e.code == "resource_missing") {
                log.warn("Subscription ${stripeDetails.subscriptionId} not found in Stripe for shop ${shopId}, cleaning up local data")
                // Clean up local subscription data
                stripeDetails.subscriptionId = null
                shopStripeDetailsService.save(stripeDetails)
                shop.active = false
                shopRepository.save(shop)
                return false
            }
            log.error("Stripe error validating subscription for shop ${shopId}: ${e.message}", e)
            return false
        }
    }

    /**
     * Gets the current subscription status directly from Stripe
     */
    String getCurrentSubscriptionStatus(UUID shopId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

        // Get Stripe details from ShopStripeDetails table
        ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)

        try {
            if (!stripeDetails.subscriptionId) {
                return "incomplete"
            }

            Subscription subscription = Subscription.retrieve(stripeDetails.subscriptionId)
            return subscription.status

        } catch (StripeException e) {
            if (e.code == "resource_missing") {
                log.warn("Subscription ${stripeDetails.subscriptionId} not found in Stripe for shop ${shopId}, cleaning up local data")
                // Clean up local subscription data
                stripeDetails.subscriptionId = null
                shopStripeDetailsService.save(stripeDetails)
                return "incomplete"
            }
            log.error("Stripe error getting subscription status for shop ${shopId}: ${e.message}", e)
            return "incomplete"
        }
    }

    private Customer createOrRetrieveCustomer(Shop shop, SubscriptionRequest request) throws StripeException {
        if (shop.stripeDetails?.stripeCustomerId) {
            return Customer.retrieve(shop.stripeDetails.stripeCustomerId)
        }

        return Customer.create(CustomerCreateParams.builder()
                .setName(request.customerName)
                .setEmail(request.customerEmail)
                .setAddress(CustomerCreateParams.Address.builder()
                        .setLine1(request.billingAddressLine1)
                        .setLine2(request.billingAddressLine2)
                        .setCity(request.billingCity)
                        .setState(request.billingState)
                        .setPostalCode(request.billingPostalCode)
                        .setCountry(request.billingCountry)
                        .build())
                .putMetadata("shop_id", shop.id.toString())
                .putMetadata("shop_name", shop.name)
                .build())
    }

    /**
     * Step A: Create SetupIntent for shop creation workflow
     * Uses existing user's Stripe Customer and creates SetupIntent for payment method collection
     */
    Map<String, Object> createSetupIntentForShopCreation(UUID userId, Map<String, Object> request) {
        try {
            log.info("Creating setup intent for shop creation - user: ${userId}")

            String stripePriceId = request.stripePriceId as String
            String customerName = request.customerName as String
            String customerEmail = request.customerEmail as String
            String customerPhone = request.customerPhone as String

            if (!stripePriceId || !customerName || !customerEmail) {
                throw new IllegalArgumentException("Price ID, customer name, and email are required")
            }

            // Get the user and their existing Stripe customer
            User user = userRepository.findById(userId)
                .orElseThrow { new RuntimeException("User not found with id: $userId") }

            String customerId = stripeCustomerService.getOrCreateStripeCustomer(user)
            log.info("Using existing Stripe customer: ${customerId} for user: ${userId}")

            // Update customer with billing details if provided
            if (request.billingAddressLine1) {
                CustomerUpdateParams.Builder updateBuilder = CustomerUpdateParams.builder()
                    .setName(customerName.trim())
                    .setEmail(customerEmail.trim())

                if (customerPhone?.trim()) {
                    updateBuilder.setPhone(customerPhone.trim())
                }

                CustomerUpdateParams.Address.Builder addressBuilder = CustomerUpdateParams.Address.builder()
                    .setLine1(request.billingAddressLine1 as String)
                    .setCity(request.billingCity as String)
                    .setState(request.billingState as String)
                    .setPostalCode(request.billingPostalCode as String)
                    .setCountry(request.billingCountry as String ?: "US")

                if (request.billingAddressLine2) {
                    addressBuilder.setLine2(request.billingAddressLine2 as String)
                }

                updateBuilder.setAddress(addressBuilder.build())

                Customer customer = Customer.retrieve(customerId)
                customer.update(updateBuilder.build())
                log.info("Updated Stripe customer ${customerId} with billing details")
            }

            // Get price information
            Price price = Price.retrieve(stripePriceId)
            log.info("Retrieved price: ${price.id} - ${price.unitAmount} ${price.currency}")

            // Create SetupIntent
            SetupIntentCreateParams setupIntentParams = SetupIntentCreateParams.builder()
                .setCustomer(customerId)
                .addPaymentMethodType("card")
                .setUsage(SetupIntentCreateParams.Usage.OFF_SESSION)
                .putMetadata("user_id", userId.toString())
                .putMetadata("customer_id", customerId)
                .putMetadata("stripe_price_id", stripePriceId)
                .putMetadata("shop_creation", "true")
                .build()

            SetupIntent setupIntent = SetupIntent.create(setupIntentParams)
            log.info("Created setup intent: ${setupIntent.id}")

            return [
                setupIntentId: setupIntent.id,
                clientSecret: setupIntent.clientSecret,
                customerId: customerId,
                stripePriceId: stripePriceId,
                amount: price.unitAmount,
                currency: price.currency,
                status: setupIntent.status
            ]

        } catch (StripeException e) {
            log.error("Stripe error creating setup intent: ${e.getMessage()}", e)
            throw new RuntimeException("Failed to create setup intent: ${e.getMessage()}")
        } catch (Exception e) {
            log.error("Error creating setup intent: ${e.getMessage()}", e)
            throw new RuntimeException("Failed to create setup intent: ${e.getMessage()}")
        }
    }

    /**
     * Steps C & D: Confirm SetupIntent and create shop with subscription
     * Confirms the SetupIntent, creates the shop, and activates subscription
     */
    @Transactional
    Map<String, Object> confirmSetupAndCreateShop(UUID userId, Map<String, Object> request, Closure<Shop> shopCreator) {
        try {
            log.info("Confirming setup and creating shop for user: ${userId}")

            String setupIntentId = request.setupIntentId as String
            Map<String, Object> shopData = request.shopData as Map<String, Object>

            if (!setupIntentId || !shopData) {
                throw new IllegalArgumentException("Setup Intent ID and shop data are required")
            }

            // Step C: Retrieve and confirm SetupIntent
            SetupIntent setupIntent = SetupIntent.retrieve(setupIntentId)
            log.info("Retrieved setup intent: ${setupIntent.id} with status: ${setupIntent.status}")

            if (setupIntent.status != "succeeded") {
                throw new IllegalArgumentException("SetupIntent must be succeeded to proceed")
            }

            String customerId = setupIntent.customer
            String paymentMethodId = setupIntent.paymentMethod
            String stripePriceId = setupIntent.metadata.get("stripe_price_id")

            if (!customerId || !paymentMethodId || !stripePriceId) {
                throw new IllegalArgumentException("Missing required data from SetupIntent")
            }

            log.info("Payment method ${paymentMethodId} attached to customer ${customerId}")

            // Create shop using the provided closure
            Shop shop = shopCreator.call(userId, shopData)
            log.info("Created shop: ${shop.id}")

            // Step D: Create subscription with attached payment method and 30-day free trial
            SubscriptionCreateParams subscriptionParams = SubscriptionCreateParams.builder()
                .setCustomer(customerId)
                .setDefaultPaymentMethod(paymentMethodId)
                .addItem(SubscriptionCreateParams.Item.builder()
                    .setPrice(stripePriceId)
                    .build())
                .setTrialPeriodDays(30L) // 30-day free trial
                .addExpand("latest_invoice.payment_intent")
                .putMetadata("shop_id", shop.id.toString())
                .putMetadata("shop_name", shop.name)
                .build()

            Subscription subscription = Subscription.create(subscriptionParams)
            log.info("Created subscription: ${subscription.id} with status: ${subscription.status}")

            // Update shop with Stripe details
            shopStripeDetailsService.updateSubscription(shop, subscription.id, customerId, stripePriceId)

            // Activate shop if subscription is active or trialing
            if (subscription.status == "active" || subscription.status == "trialing") {
                shop.active = true
                shopRepository.save(shop)
                log.info("Activated shop: ${shop.id} with status: ${subscription.status}")
            }

            return [
                success: true,
                shopId: shop.id,
                shopName: shop.name,
                shopActive: shop.active,
                subscriptionId: subscription.id,
                subscriptionStatus: subscription.status,
                customerId: customerId,
                paymentMethodId: paymentMethodId,
                message: shop.active ? "Shop created and activated successfully!" : "Shop created! Subscription activation pending."
            ]

        } catch (StripeException e) {
            log.error("Stripe error confirming setup and creating shop: ${e.getMessage()}", e)
            throw new RuntimeException("Failed to confirm setup and create shop: ${e.getMessage()}")
        } catch (Exception e) {
            log.error("Error confirming setup and creating shop: ${e.getMessage()}", e)
            throw new RuntimeException("Failed to confirm setup and create shop: ${e.getMessage()}")
        }
    }



    private SubscriptionResponse buildSubscriptionResponse(Shop shop, Subscription subscription, Customer customer) {
        SubscriptionResponse response = new SubscriptionResponse()
        response.shopId = shop.id
        response.subscriptionId = subscription.id
        response.customerId = customer.id
        response.status = subscription.status

        // Extract client secret from latest invoice payment_intent for Payment Element
        // Following Stripe's documentation: https://docs.stripe.com/billing/subscriptions/build-subscriptions
        try {
            if (subscription.latestInvoice && subscription.latestInvoice instanceof String) {
                // Latest invoice is just an ID, need to retrieve the full invoice
                Invoice invoice = Invoice.retrieve(subscription.latestInvoice)
                log.debug("Retrieved invoice: ${invoice.id}, status: ${invoice.status}")

                // Check if invoice has a payment_intent
                if (invoice.paymentIntent && invoice.paymentIntent instanceof String) {
                    PaymentIntent paymentIntent = PaymentIntent.retrieve(invoice.paymentIntent)
                    response.clientSecret = paymentIntent.clientSecret
                    log.info("Client secret extracted from payment_intent for Payment Element: ${response.clientSecret}")
                } else if (invoice.paymentIntent?.clientSecret) {
                    response.clientSecret = invoice.paymentIntent.clientSecret
                    log.info("Client secret extracted from expanded payment_intent for Payment Element: ${response.clientSecret}")
                } else {
                    log.debug("Invoice ${invoice.id} does not have a payment_intent - this is normal for paid invoices, free trials, or certain subscription states")
                }
            } else if (subscription.latestInvoice?.paymentIntent?.clientSecret) {
                // Latest invoice is already expanded
                response.clientSecret = subscription.latestInvoice.paymentIntent.clientSecret
                log.info("Client secret extracted from expanded latest invoice payment_intent for Payment Element: ${response.clientSecret}")
            } else {
                log.debug("No client secret found in subscription latest invoice payment_intent - this is normal for active subscriptions")
                log.debug("Subscription latest invoice: ${subscription.latestInvoice}")
            }
        } catch (Exception e) {
            log.debug("Error extracting client secret from payment_intent: ${e.message} - this is normal for active subscriptions")
            log.debug("Subscription latest invoice: ${subscription.latestInvoice}")
        }

        // Get price details from subscription
        if (subscription.items?.data?.size() > 0) {
            def subscriptionItem = subscription.items.data[0]
            def price = subscriptionItem.price
            response.stripePriceId = price.id
            response.amount = price.unitAmount
            response.currency = price.currency
            response.interval = price.recurring?.interval

            // Get the actual plan name from the price or product
            String planName = price.nickname
            if (!planName && price.product) {
                try {
                    // If price doesn't have nickname, get product name
                    if (price.product instanceof String) {
                        Product product = Product.retrieve(price.product)
                        planName = product.name
                    } else {
                        planName = price.product.name
                    }
                } catch (Exception e) {
                    log.debug("Could not retrieve product name: ${e.message}")
                    planName = "Subscription Plan"
                }
            }
            response.planDisplayName = planName ?: "Subscription Plan"
        } else {
            response.amount = 0
            response.currency = getShopCurrency(shop)
            response.interval = "month"
            response.planDisplayName = "Unknown Plan"
        }

        // Handle period dates - Access as methods in Stripe SDK
        try {
            Long currentPeriodStartTimestamp = subscription.currentPeriodStart
            Long currentPeriodEndTimestamp = subscription.currentPeriodEnd

            response.currentPeriodStart = currentPeriodStartTimestamp ? new Date(currentPeriodStartTimestamp * 1000) : null
            response.currentPeriodEnd = currentPeriodEndTimestamp ? new Date(currentPeriodEndTimestamp * 1000) : null
            // For active subscriptions, the next billing date is the current period end
            response.nextBillingDate = response.currentPeriodEnd
        } catch (Exception e) {
            log.debug("Could not access period dates: ${e.message}")
            response.currentPeriodStart = null
            response.currentPeriodEnd = null
            response.nextBillingDate = null
        }

        response.isActive = subscription.status == "active" || subscription.status == "trialing"

        try {
            response.cancelAtPeriodEnd = subscription.getCancelAtPeriodEnd() ?: false
        } catch (Exception e) {
            log.debug("Could not access cancelAtPeriodEnd: ${e.message}")
            response.cancelAtPeriodEnd = false
        }

        try {
            Long canceledAtTimestamp = subscription.getCanceledAt()
            response.canceledAt = canceledAtTimestamp ? new Date(canceledAtTimestamp * 1000) : null
        } catch (Exception e) {
            log.debug("Could not access canceledAt: ${e.message}")
            response.canceledAt = null
        }

        // Set requiresPayment based on subscription status and client secret availability
        response.requiresPayment = (subscription.status == "incomplete" || subscription.status == "incomplete_expired") && response.clientSecret

        response.message = subscription.status == "incomplete" ?
            "Subscription created. Complete payment to activate." :
            "Subscription details retrieved successfully"
        return response
    }

    /**
     * Gets the currency for a shop based on its country
     */
    private String getShopCurrency(Shop shop) {
        switch (shop.country?.toLowerCase()) {
            case 'bg':
            case 'bulgaria':
                return 'bgn'
            case 'us':
            case 'usa':
            case 'united states':
                return 'usd'
            case 'gb':
            case 'uk':
            case 'united kingdom':
                return 'gbp'
            case 'de':
            case 'germany':
            case 'fr':
            case 'france':
            case 'it':
            case 'italy':
            case 'es':
            case 'spain':
                return 'eur'
            default:
                return 'usd' // Default fallback
        }
    }

    /**
     * Gets payment methods for a shop's customer
     */
    List<Map<String, Object>> getPaymentMethods(UUID shopId) {
        try {
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            // Get Stripe details from ShopStripeDetails table
            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)

            if (!stripeDetails.stripeCustomerId) {
                return []
            }

            Customer customer = Customer.retrieve(stripeDetails.stripeCustomerId)
            PaymentMethodCollection paymentMethods = PaymentMethod.list(
                PaymentMethodListParams.builder()
                    .setCustomer(customer.id)
                    .setType(PaymentMethodListParams.Type.CARD)
                    .build()
            )

            List<Map<String, Object>> result = []
            paymentMethods.data.each { pm ->
                result.add([
                    id: pm.id,
                    type: pm.type,
                    card: [
                        brand: pm.card?.brand,
                        last4: pm.card?.last4,
                        exp_month: pm.card?.expMonth,
                        exp_year: pm.card?.expYear
                    ],
                    billing_details: [
                        name: pm.billingDetails?.name,
                        email: pm.billingDetails?.email
                    ],
                    created: pm.created,
                    is_default: (customer.invoiceSettings?.defaultPaymentMethod == pm.id)
                ])
            }

            return result
        } catch (StripeException e) {
            log.error("Stripe error retrieving payment methods for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to retrieve payment methods: ${e.userMessage ?: e.message}")
        }
    }

    /**
     * Gets invoices for a shop's subscription
     */
    List<Map<String, Object>> getInvoices(UUID shopId, int limit, String startingAfter) {
        try {
            log.info("Getting invoices for shop ${shopId}")
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            // Get Stripe details from ShopStripeDetails table
            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)

            if (!stripeDetails.stripeCustomerId) {
                log.warn("Shop ${shopId} does not have a Stripe customer ID")
                return []
            }

            log.info("Calling Stripe API for customer ${stripeDetails.stripeCustomerId}")

            InvoiceListParams.Builder paramsBuilder = InvoiceListParams.builder()
                .setCustomer(stripeDetails.stripeCustomerId)
                .setLimit(limit.longValue())

            if (startingAfter) {
                paramsBuilder.setStartingAfter(startingAfter)
            }

            InvoiceCollection invoices = Invoice.list(paramsBuilder.build())
            log.info("Retrieved ${invoices.data.size()} invoices from Stripe")

            List<Map<String, Object>> result = []
            invoices.data.each { invoice ->
                result.add([
                    id: invoice.id,
                    amount_due: invoice.amountDue,
                    amount_paid: invoice.amountPaid,
                    amount_remaining: invoice.amountRemaining,
                    currency: invoice.currency,
                    status: invoice.status,
                    created: invoice.created,
                    due_date: invoice.dueDate,
                    hosted_invoice_url: invoice.hostedInvoiceUrl,
                    invoice_pdf: invoice.invoicePdf,
                    number: invoice.number,
                    period_start: invoice.periodStart,
                    period_end: invoice.periodEnd,
                    subscription_id: stripeDetails.subscriptionId, // Use the subscription ID from stripe details
                    total: invoice.total
                ])
            }

            return result
        } catch (StripeException e) {
            log.error("Stripe error retrieving invoices for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to retrieve invoices: ${e.userMessage ?: e.message}")
        }
    }

    /**
     * Gets upcoming invoice for a shop's subscription
     */
    Map<String, Object> getUpcomingInvoice(UUID shopId) {
        try {
            log.info("Getting upcoming invoice for shop ${shopId}")
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            // Get Stripe details from ShopStripeDetails table
            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)

            if (!stripeDetails.stripeCustomerId || !stripeDetails.subscriptionId) {
                log.warn("Shop ${shopId} missing customer ID or subscription ID")
                return null
            }

            log.info("Calling Stripe API for upcoming invoice - customer: ${stripeDetails.stripeCustomerId}, subscription: ${stripeDetails.subscriptionId}")

            Map<String, Object> params = [
                customer: stripeDetails.stripeCustomerId,
                subscription: stripeDetails.subscriptionId
            ]

            log.info("About to call Invoice.createPreview with params: ${params}")
            Invoice upcomingInvoice = Invoice.createPreview(params)
            log.info("Successfully retrieved upcoming invoice: ${upcomingInvoice?.id}")

            return [
                id: upcomingInvoice.id,
                amount_due: upcomingInvoice.amountDue,
                amount_paid: upcomingInvoice.amountPaid,
                amount_remaining: upcomingInvoice.amountRemaining,
                currency: upcomingInvoice.currency,
                status: upcomingInvoice.status,
                created: upcomingInvoice.created,
                due_date: upcomingInvoice.dueDate,
                period_start: upcomingInvoice.periodStart,
                period_end: upcomingInvoice.periodEnd,
                subscription_id: stripeDetails.subscriptionId, // Use the subscription ID from stripe details
                total: upcomingInvoice.total
            ]
        } catch (StripeException e) {
            if (e.code == "invoice_upcoming_none") {
                log.info("No upcoming invoice found for shop ${shopId}")
                return null // No upcoming invoice
            }
            log.error("Stripe error retrieving upcoming invoice for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to retrieve upcoming invoice: ${e.userMessage ?: e.message}")
        } catch (Exception e) {
            log.error("Unexpected error retrieving upcoming invoice for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to retrieve upcoming invoice: ${e.message}")
        }
    }

    /**
     * Sets default payment method for a shop's customer
     */
    void setDefaultPaymentMethod(UUID shopId, String paymentMethodId) {
        try {
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            // Get Stripe details from ShopStripeDetails table
            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)

            if (!stripeDetails.stripeCustomerId) {
                throw new RuntimeException("Shop does not have a Stripe customer ID")
            }

            // Verify the payment method exists and belongs to this customer
            PaymentMethod paymentMethod = PaymentMethod.retrieve(paymentMethodId)
            if (paymentMethod.customer != stripeDetails.stripeCustomerId) {
                throw new RuntimeException("Payment method does not belong to this customer")
            }

            // Update customer's default payment method
            Customer customer = Customer.retrieve(stripeDetails.stripeCustomerId)
            customer.update(CustomerUpdateParams.builder()
                .setInvoiceSettings(CustomerUpdateParams.InvoiceSettings.builder()
                    .setDefaultPaymentMethod(paymentMethodId)
                    .build())
                .build())

            log.info("Set payment method ${paymentMethodId} as default for shop ${shopId}")
        } catch (StripeException e) {
            log.error("Stripe error setting default payment method for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to set default payment method: ${e.userMessage ?: e.message}")
        }
    }

    /**
     * Removes a payment method from a shop's customer
     */
    void removePaymentMethod(UUID shopId, String paymentMethodId) {
        try {
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            // Get Stripe details from ShopStripeDetails table
            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)

            if (!stripeDetails.stripeCustomerId) {
                throw new RuntimeException("Shop does not have a Stripe customer ID")
            }

            // Verify the payment method exists and belongs to this customer
            PaymentMethod paymentMethod = PaymentMethod.retrieve(paymentMethodId)
            if (paymentMethod.customer != stripeDetails.stripeCustomerId) {
                throw new RuntimeException("Payment method does not belong to this customer")
            }

            // Check if this is the default payment method
            Customer customer = Customer.retrieve(stripeDetails.stripeCustomerId)
            String defaultPaymentMethodId = customer.invoiceSettings?.defaultPaymentMethod
            if (defaultPaymentMethodId == paymentMethodId) {
                throw new RuntimeException("Cannot remove the default payment method. Please set another payment method as default first.")
            }

            // Detach the payment method
            paymentMethod.detach()

            log.info("Removed payment method ${paymentMethodId} from shop ${shopId}")
        } catch (StripeException e) {
            log.error("Stripe error removing payment method for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to remove payment method: ${e.userMessage ?: e.message}")
        }
    }
}
