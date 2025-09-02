package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.entity.ShopStripeDetails
import com.stripe.exception.StripeException
import com.stripe.model.Customer
import com.stripe.model.Subscription
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service

@Service
@Slf4j
class StripeBillingServiceHelper {

    @Autowired
    private ShopStripeDetailsService shopStripeDetailsService

    /**
     * Helper method to get subscription ID safely
     */
    String getSubscriptionId(Shop shop) {
        return shopStripeDetailsService.getSubscriptionId(shop)
    }

    /**
     * Helper method to get customer ID safely
     */
    String getCustomerId(Shop shop) {
        return shopStripeDetailsService.getStripeCustomerId(shop)
    }

    /**
     * Helper method to check if subscription is active (fetches from Stripe)
     */
    boolean isSubscriptionActive(Shop shop) {
        return shopStripeDetailsService.isSubscriptionActive(shop)
    }

    /**
     * Helper method to get current subscription status from Stripe
     */
    String getCurrentSubscriptionStatus(Shop shop) {
        return shopStripeDetailsService.getCurrentSubscriptionStatus(shop)
    }

    /**
     * Helper method to update subscription details
     */
    void updateSubscriptionDetails(Shop shop, String subscriptionId, String customerId, String priceId) {
        shopStripeDetailsService.updateSubscription(shop, subscriptionId, customerId, priceId)
    }

    /**
     * Helper method to clear subscription details
     */
    void clearSubscriptionDetails(Shop shop) {
        shopStripeDetailsService.clearSubscription(shop)
    }

    /**
     * Helper method to safely retrieve subscription from Stripe
     */
    Subscription retrieveSubscription(Shop shop) throws StripeException {
        String subscriptionId = getSubscriptionId(shop)
        if (!subscriptionId) {
            throw new IllegalArgumentException("Shop does not have a subscription")
        }
        return Subscription.retrieve(subscriptionId)
    }

    /**
     * Helper method to safely retrieve customer from Stripe
     */
    Customer retrieveCustomer(Shop shop) throws StripeException {
        String customerId = getCustomerId(shop)
        if (!customerId) {
            throw new IllegalArgumentException("Shop does not have a Stripe customer")
        }
        return Customer.retrieve(customerId)
    }

    /**
     * Helper method to validate subscription exists and is active
     */
    boolean validateAndSyncSubscription(Shop shop) {
        try {
            String subscriptionId = getSubscriptionId(shop)
            if (!subscriptionId) {
                return false
            }

            Subscription subscription = Subscription.retrieve(subscriptionId)
            boolean isActive = subscription.status == "active" || subscription.status == "trialing"

            // Note: We don't update local status anymore since we fetch from Stripe per request
            log.info("Subscription ${subscriptionId} status from Stripe: ${subscription.status}, active: ${isActive}")

            return isActive

        } catch (StripeException e) {
            if (e.code == "resource_missing") {
                log.warn("Subscription not found in Stripe for shop ${shop.id}, clearing local data")
                clearSubscriptionDetails(shop)
                return false
            }
            log.error("Stripe error validating subscription for shop ${shop.id}: ${e.message}", e)
            return false
        }
    }

    /**
     * Helper method to check if shop has subscription setup
     */
    boolean hasSubscriptionSetup(Shop shop) {
        String subscriptionId = getSubscriptionId(shop)
        return subscriptionId != null
    }

    /**
     * Helper method to check if shop has customer setup
     */
    boolean hasCustomerSetup(Shop shop) {
        String customerId = getCustomerId(shop)
        return customerId != null
    }

    /**
     * Helper method to get subscription status without throwing exceptions
     */
    String getSubscriptionStatusSafe(Shop shop) {
        try {
            return getCurrentSubscriptionStatus(shop)
        } catch (Exception e) {
            log.warn("Could not get subscription status for shop ${shop.id}: ${e.message}")
            return "incomplete"
        }
    }

    /**
     * Helper method to check if subscription requires payment
     */
    boolean requiresPayment(Shop shop) {
        String status = getSubscriptionStatusSafe(shop)
        return status == "incomplete" || status == "past_due" || status == "unpaid"
    }

    /**
     * Helper method to get Stripe price ID
     */
    String getStripePriceId(Shop shop) {
        ShopStripeDetails stripeDetails = shopStripeDetailsService.getStripeDetailsByShopId(shop.id).orElse(null)
        return stripeDetails?.stripePriceId
    }

    /**
     * Helper method to update only customer ID
     */
    void updateCustomerId(Shop shop, String customerId) {
        String existingSubscriptionId = getSubscriptionId(shop)
        String existingPriceId = getStripePriceId(shop)
        shopStripeDetailsService.updateSubscription(shop, existingSubscriptionId, customerId, existingPriceId)
    }

    /**
     * Helper method to update only subscription ID
     */
    void updateSubscriptionId(Shop shop, String subscriptionId) {
        String existingCustomerId = getCustomerId(shop)
        String existingPriceId = getStripePriceId(shop)
        shopStripeDetailsService.updateSubscription(shop, subscriptionId, existingCustomerId, existingPriceId)
    }

    /**
     * Helper method to update only price ID
     */
    void updatePriceId(Shop shop, String priceId) {
        String existingSubscriptionId = getSubscriptionId(shop)
        String existingCustomerId = getCustomerId(shop)
        shopStripeDetailsService.updateSubscription(shop, existingSubscriptionId, existingCustomerId, priceId)
    }
}
