package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.dto.*
import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.entity.ShopStripeDetails
import com.ddimitko.beautyhub.enums.BusinessType
import com.ddimitko.beautyhub.repository.ShopRepository
import com.ddimitko.beautyhub.service.ShopStripeDetailsService
import com.stripe.exception.SignatureVerificationException
import com.stripe.model.Event
import com.stripe.model.Subscription
import com.stripe.net.Webhook
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
@Slf4j
class StripeService {

    @Autowired
    private ShopRepository shopRepository

    @Autowired
    private StripeBillingService stripeBillingService

    @Autowired
    private StripeConnectService stripeConnectService

    @Autowired
    private ShopStripeDetailsService shopStripeDetailsService

    @Autowired
    private StripeBillingServiceHelper stripeBillingServiceHelper

    @Autowired
    private StripeConnectTaxService stripeConnectTaxService

    @Value('${stripe.webhook.secret}')
    private String webhookSecret

    /**
     * Creates a payment intent for subscription payment collection ONLY
     */
    Map<String, Object> createPaymentIntent(UUID shopId, Map<String, Object> request) {
        return stripeBillingService.createPaymentIntent(shopId, request)
    }

    /**
     * Confirms and activates a subscription after successful payment
     */
    Map<String, Object> confirmSubscription(UUID shopId, String paymentIntentId) {
        return stripeBillingService.confirmSubscription(shopId, paymentIntentId)
    }

    /**
     * Confirms setup intent and activates subscription for existing shop
     */
    Map<String, Object> confirmSetupAndActivateSubscription(UUID shopId, String setupIntentId) {
        return stripeBillingService.confirmSetupAndActivateSubscription(shopId, setupIntentId)
    }

    /**
     * Creates a payment intent for subscription setup (new workflow)
     */
    Map<String, Object> createSubscriptionSetupPaymentIntent(UUID shopId, Map<String, Object> request) {
        return stripeBillingService.createSubscriptionSetupPaymentIntent(shopId, request)
    }

    /**
     * Creates a Stripe subscription intent for Payment Element integration
     */
    Map<String, Object> createSubscriptionIntent(UUID shopId, Map<String, Object> request) {
        return stripeBillingService.createSubscriptionIntent(shopId, request)
    }

    /**
     * Creates a SetupIntent for shop creation workflow (Step A)
     */
    Map<String, Object> createSetupIntentForShopCreation(UUID userId, Map<String, Object> request) {
        return stripeBillingService.createSetupIntentForShopCreation(userId, request)
    }

    /**
     * Confirms SetupIntent and creates shop with subscription (Steps C & D)
     */
    Map<String, Object> confirmSetupAndCreateShop(UUID userId, Map<String, Object> request, Closure<Shop> shopCreator) {
        return stripeBillingService.confirmSetupAndCreateShop(userId, request, shopCreator)
    }

    /**
     * Creates a Stripe subscription using the billing service
     */
    SubscriptionResponse createSubscription(UUID shopId, SubscriptionRequest request) {
        return stripeBillingService.createSubscription(shopId, request)
    }

    /**
     * Validates an existing subscription
     */
    boolean validateSubscription(UUID shopId) {
        return stripeBillingService.validateSubscription(shopId)
    }

    /**
     * Cancels a subscription
     */
    void cancelSubscription(UUID shopId) {
        stripeBillingService.cancelSubscription(shopId)
    }

    /**
     * Gets subscription details for a shop
     */
    SubscriptionResponse getSubscriptionDetails(UUID shopId) {
        return stripeBillingService.getSubscriptionDetails(shopId)
    }

    /**
     * Gets the current subscription status directly from Stripe
     */
    String getCurrentSubscriptionStatus(UUID shopId) {
        return stripeBillingService.getCurrentSubscriptionStatus(shopId)
    }

    /**
     * Creates a customer portal session for subscription management
     */
    CustomerPortalResponse createCustomerPortalSession(UUID shopId, CustomerPortalRequest request) {
        return stripeBillingService.createCustomerPortalSession(shopId, request)
    }

    /**
     * Gets payment methods for a shop's customer
     */
    List<Map<String, Object>> getPaymentMethods(UUID shopId) {
        return stripeBillingService.getPaymentMethods(shopId)
    }

    /**
     * Gets invoices for a shop's subscription
     */
    List<Map<String, Object>> getInvoices(UUID shopId, int limit, String startingAfter) {
        return stripeBillingService.getInvoices(shopId, limit, startingAfter)
    }

    /**
     * Gets upcoming invoice for a shop's subscription
     */
    Map<String, Object> getUpcomingInvoice(UUID shopId) {
        return stripeBillingService.getUpcomingInvoice(shopId)
    }

    /**
     * Sets default payment method for a shop's customer
     */
    void setDefaultPaymentMethod(UUID shopId, String paymentMethodId) {
        stripeBillingService.setDefaultPaymentMethod(shopId, paymentMethodId)
    }

    /**
     * Removes a payment method from a shop's customer
     */
    void removePaymentMethod(UUID shopId, String paymentMethodId) {
        stripeBillingService.removePaymentMethod(shopId, paymentMethodId)
    }

    /**
     * Creates a Stripe Connect account
     */
    ConnectAccountResponse createConnectAccount(UUID shopId, ConnectAccountRequest request) {
        return stripeConnectService.createConnectAccount(shopId, request)
    }

    /**
     * Gets Connect account details
     */
    ConnectAccountResponse getConnectAccountDetails(UUID shopId) {
        return stripeConnectService.getConnectAccountDetails(shopId)
    }

    /**
     * Updates Connect account information using API calls
     */
    ConnectAccountResponse updateConnectAccount(UUID shopId, Map<String, Object> updateData) {
        return stripeConnectService.updateConnectAccount(shopId, updateData)
    }

    /**
     * Submits Connect account for review
     */
    ConnectAccountResponse submitConnectAccountForReview(UUID shopId) {
        return stripeConnectService.submitForReview(shopId)
    }

    /**
     * Creates an Account Session for embedded onboarding
     */
    Map<String, Object> createAccountSession(UUID shopId) {
        return stripeConnectService.createAccountSession(shopId)
    }

    /**
     * Creates an Account Link for onboarding
     */
    ConnectAccountResponse createAccountLink(UUID shopId, String returnUrl, String refreshUrl) {
        return stripeConnectService.createAccountLink(shopId, returnUrl, refreshUrl)
    }

    /**
     * Creates a dashboard link for Connect account
     */
    String createDashboardLink(UUID shopId) {
        return stripeConnectService.createDashboardLink(shopId)
    }

    /**
     * Gets Connect account balance
     */
    Map<String, Object> getConnectAccountBalance(UUID shopId) {
        return stripeConnectService.getAccountBalance(shopId)
    }

    /**
     * Gets Connect account payouts
     */
    Map<String, Object> getConnectAccountPayouts(UUID shopId, int limit, String startingAfter) {
        return stripeConnectService.getAccountPayouts(shopId, limit, startingAfter)
    }

    /**
     * Gets Connect account transactions
     */
    Map<String, Object> getConnectAccountTransactions(UUID shopId, int limit, String startingAfter) {
        return stripeConnectService.getAccountTransactions(shopId, limit, startingAfter)
    }

    /**
     * Creates a comprehensive Connect account with documents
     */
    ConnectAccountResponse createComprehensiveConnectAccount(UUID shopId, ComprehensiveConnectAccountRequest request) {
        return stripeConnectService.createComprehensiveConnectAccount(shopId, request)
    }

    /**
     * Updates Connect account with comprehensive information and documents
     */
    ConnectAccountResponse updateComprehensiveConnectAccount(UUID shopId, ComprehensiveConnectAccountRequest request) {
        return stripeConnectService.updateComprehensiveConnectAccount(shopId, request)
    }

    /**
     * Updates Connect account using API onboarding approach
     */
    ConnectAccountResponse updateApiOnboardingAccount(UUID shopId, ApiOnboardingUpdateRequest request) {
        return stripeConnectService.updateApiOnboardingAccount(shopId, request)
    }

    /**
     * Gets onboarding requirements for a specific configuration
     */
    Map<String, Object> getOnboardingRequirements(OnboardingRequirementsRequest request) {
        return stripeConnectService.getOnboardingRequirements(request)
    }

    // ===== STRIPE TAX METHODS =====

    /**
     * Calculate tax for a transaction using Stripe Tax
     */
    Map<String, Object> calculateTaxWithStripe(UUID shopId, Map<String, Object> request) {
        log.info("Calculating tax with Stripe for shop: ${shopId}")
        return stripeConnectTaxService.calculateTaxForPayment(shopId, request)
    }



    /**
     * Gets Connect account requirements for a specific shop
     */
    Map<String, Object> getConnectAccountRequirements(UUID shopId) {
        return stripeConnectService.getConnectAccountRequirements(shopId)
    }

    /**
     * Processes Stripe webhook events with signature verification
     */
    void processWebhookEvent(String payload, String sigHeader) {
        try {
            Event event = Webhook.constructEvent(payload, sigHeader, webhookSecret)

            log.info("Processing Stripe webhook event: ${event.type}")

            switch (event.type) {
                // Subscription events
                case "customer.subscription.created":
                case "customer.subscription.updated":
                case "customer.subscription.deleted":
                    handleSubscriptionEvent(event)
                    break

                // Account events (Connect)
                case "account.updated":
                    handleAccountEvent(event)
                    break

                // Invoice events
                case "invoice.payment_succeeded":
                case "invoice.payment_failed":
                case "invoice.finalized":
                case "invoice.voided":
                    handleInvoiceEvent(event)
                    break

                // Payment events
                case "payment_intent.succeeded":
                case "payment_intent.payment_failed":
                    handlePaymentEvent(event)
                    break

                // Tax events (Stripe Tax)
                case "tax.calculation.created":
                case "tax.transaction.created":
                    handleTaxEvent(event)
                    break

                // Payout events
                case "payout.created":
                case "payout.updated":
                case "payout.paid":
                case "payout.failed":
                    handlePayoutEvent(event)
                    break

                default:
                    log.info("Unhandled webhook event type: ${event.type}")
                    createUnhandledEventAuditLog(event)
            }

        } catch (SignatureVerificationException e) {
            log.error("Invalid webhook signature: ${e.message}")
            throw new RuntimeException("Invalid webhook signature")
        } catch (Exception e) {
            log.error("Error processing webhook: ${e.message}", e)
            throw new RuntimeException("Error processing webhook: ${e.message}")
        }
    }

    void handleSubscriptionEvent(Event event) {
        Subscription subscription = (Subscription) event.dataObjectDeserializer.object.orElse(null)
        if (!subscription) {
            log.warn("No subscription data in webhook event")
            return
        }

        String shopId = subscription.metadata?.get("shop_id")
        if (!shopId) {
            log.warn("No shop_id in subscription metadata")
            return
        }

        try {
            Shop shop = shopRepository.findById(UUID.fromString(shopId)).orElse(null)
            if (!shop) {
                log.warn("Shop not found for subscription webhook: ${shopId}")
                return
            }

            log.info("Processing subscription webhook for shop ${shopId}: subscription ${subscription.id} status ${subscription.status}")

            // Ensure subscription ID is saved (critical for successful subscription tracking)
            String currentSubscriptionId = stripeBillingServiceHelper.getSubscriptionId(shop)
            if (!currentSubscriptionId || currentSubscriptionId != subscription.id) {
                log.info("Updating subscription ID for shop ${shopId}: ${currentSubscriptionId} -> ${subscription.id}")
                stripeBillingServiceHelper.updateSubscriptionId(shop, subscription.id)
            }

            // Note: We don't store subscription status locally anymore - it's fetched from Stripe per request

            // Update shop activation based on subscription status
            switch (subscription.status) {
                case "active":
                case "trialing":
                    shop.active = true  // Activate shop when subscription is active
                    log.info("Shop ${shopId} activated with ${subscription.status} subscription")
                    break
                case "incomplete":
                case "incomplete_expired":
                case "canceled":
                case "unpaid":
                case "past_due":
                    shop.active = false
                    log.info("Shop ${shopId} deactivated - subscription status: ${subscription.status}")
                    break
                default:
                    shop.active = false
                    log.info("Shop ${shopId} deactivated - unknown subscription status: ${subscription.status}")
            }

            shopRepository.save(shop)

            log.info("Successfully updated shop ${shopId}: subscriptionId=${subscription.id}, status=${subscription.status}, active=${shop.active}")

        } catch (Exception e) {
            log.error("Error handling subscription event for shop ${shopId}: ${e.message}", e)
        }
    }

    private void handleAccountEvent(Event event) {
        com.stripe.model.Account account = (com.stripe.model.Account) event.dataObjectDeserializer.object.orElse(null)
        if (!account) {
            log.warn("No account data in webhook event")
            return
        }

        String shopId = account.metadata?.get("shop_id")
        if (!shopId) {
            log.warn("No shop_id in account metadata")
            return
        }

        try {
            Shop shop = shopRepository.findById(UUID.fromString(shopId)).orElse(null)
            if (!shop) {
                log.warn("Shop not found for account webhook: ${shopId}")
                return
            }

            // Update onboarding status
            boolean onboardingCompleted = account.chargesEnabled && account.payoutsEnabled
            shopStripeDetailsService.updateOnboardingStatus(shop, onboardingCompleted)
            shop.acceptsCardPayments = onboardingCompleted
            shopRepository.save(shop)

            log.info("Updated Connect account status for shop ${shopId}: onboarding completed = ${onboardingCompleted}, acceptsCardPayments = ${onboardingCompleted}")

        } catch (Exception e) {
            log.error("Error handling account event for shop ${shopId}: ${e.message}", e)
        }
    }

    private void handleInvoiceEvent(Event event) {
        log.info("Processing invoice event: ${event.type}")

        try {
            com.stripe.model.Invoice invoice = (com.stripe.model.Invoice) event.dataObjectDeserializer.object.orElse(null)
            if (!invoice) {
                log.warn("No invoice data in webhook event")
                return
            }

            String shopId = invoice.metadata?.get("shop_id")
            if (!shopId) {
                log.warn("No shop_id in invoice metadata")
                return
            }

            Shop shop = shopRepository.findById(UUID.fromString(shopId)).orElse(null)
            if (!shop) {
                log.warn("Shop not found for invoice webhook: ${shopId}")
                return
            }

            log.info("Processed invoice event for shop ${shopId}: ${invoice.id} status ${invoice.status}")

        } catch (Exception e) {
            log.error("Error processing invoice webhook: ${e.message}", e)
        }
    }

    private void handlePaymentEvent(Event event) {
        log.info("Processing payment event: ${event.type}")

        try {
            com.stripe.model.PaymentIntent paymentIntent = (com.stripe.model.PaymentIntent) event.dataObjectDeserializer.object.orElse(null)
            if (!paymentIntent) {
                log.warn("No payment intent data in webhook event")
                return
            }

            String shopId = paymentIntent.metadata?.get("shop_id")
            if (!shopId) {
                log.warn("No shop_id in payment intent metadata")
                return
            }

            Shop shop = shopRepository.findById(UUID.fromString(shopId)).orElse(null)
            if (!shop) {
                log.warn("Shop not found for payment webhook: ${shopId}")
                return
            }

            log.info("Processed payment event for shop ${shopId}: ${paymentIntent.id} amount ${paymentIntent.amount}")

        } catch (Exception e) {
            log.error("Error processing payment webhook: ${e.message}", e)
        }
    }

    private void handleTaxEvent(Event event) {
        log.info("Processing tax event: ${event.type}")
        // Tax events are now handled by StripeConnectTaxService
        // This is just for logging purposes
    }



    private void handlePayoutEvent(Event event) {
        log.info("Processing payout event: ${event.type}")

        try {
            com.stripe.model.Payout payout = (com.stripe.model.Payout) event.dataObjectDeserializer.object.orElse(null)
            if (!payout) {
                log.warn("No payout data in webhook event")
                return
            }

            // Find shop by Stripe account ID
            Shop shop = null
            if (payout.account) {
                Optional<ShopStripeDetails> stripeDetailsOpt = shopStripeDetailsService.findByStripeAccountId(payout.account)
                if (stripeDetailsOpt.isPresent()) {
                    shop = stripeDetailsOpt.get().shop
                }
            }

            log.info("Processed payout event: ${payout.id} status ${payout.status} for account ${payout.account}")

        } catch (Exception e) {
            log.error("Error processing payout webhook: ${e.message}", e)
        }
    }

    private void createUnhandledEventAuditLog(Event event) {
        log.info("Unhandled webhook event: ${event.type}")
    }
}
