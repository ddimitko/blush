package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.dto.*
import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.entity.ShopStripeDetails
import com.ddimitko.beautyhub.repository.ShopRepository
import com.ddimitko.beautyhub.service.StripeBillingService
import com.stripe.Stripe
import com.stripe.exception.StripeException
import com.stripe.model.*
import com.stripe.param.*
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId

@Service
@Transactional
@Slf4j
class SubscriptionManagementService {

    @Autowired
    private ShopRepository shopRepository

    @Autowired
    private ShopStripeDetailsService shopStripeDetailsService

    @Autowired
    private StripeBillingService stripeBillingService

    @Value('${stripe.api.secret-key}')
    private String stripeSecretKey

    SubscriptionManagementService() {
        // Stripe.apiKey will be set in @PostConstruct or initialization
    }

    /**
     * Get detailed subscription information including trial status
     */
    SubscriptionResponse getDetailedSubscriptionInfo(UUID shopId) {
        try {
            Stripe.apiKey = stripeSecretKey
            
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)
            
            if (!stripeDetails.hasSubscription()) {
                throw new RuntimeException("Shop does not have a subscription")
            }

            // Fetch subscription from Stripe
            Subscription subscription = Subscription.retrieve(stripeDetails.subscriptionId)
            
            // Get price details
            Price price = Price.retrieve(subscription.items.data[0].price.id)
            Product product = Product.retrieve(price.product as String)

            SubscriptionResponse response = new SubscriptionResponse()
            response.shopId = shopId
            response.subscriptionId = subscription.id
            response.customerId = subscription.customer
            response.status = subscription.status
            response.stripePriceId = price.id
            response.planDisplayName = product.name
            response.amount = price.unitAmount
            response.currency = price.currency
            response.interval = price.recurring.interval
            // Handle period dates - Use correct Stripe property names
            try {
                // Get current period from the first subscription item using correct property names
                if (subscription.items?.data && subscription.items.data.size() > 0) {
                    def subscriptionItem = subscription.items.data[0]
                    Long currentPeriodStartTimestamp = subscriptionItem.currentPeriodStart
                    Long currentPeriodEndTimestamp = subscriptionItem.currentPeriodEnd

                    response.currentPeriodStart = currentPeriodStartTimestamp ? new Date(currentPeriodStartTimestamp * 1000) : null
                    response.currentPeriodEnd = currentPeriodEndTimestamp ? new Date(currentPeriodEndTimestamp * 1000) : null
                    response.nextBillingDate = response.currentPeriodEnd
                } else {
                    // Fallback to billing cycle anchor if items not available
                    Long billingCycleAnchor = subscription.billingCycleAnchor
                    response.currentPeriodStart = billingCycleAnchor ? new Date(billingCycleAnchor * 1000) : null
                    response.currentPeriodEnd = null
                    response.nextBillingDate = null
                }

                // Get created timestamp from subscription
                Long createdTimestamp = subscription.created
                response.createdAt = createdTimestamp ? new Date(createdTimestamp * 1000) : null
            } catch (Exception e) {
                log.debug("Could not access period dates: ${e.message}")
                response.currentPeriodStart = null
                response.currentPeriodEnd = null
                response.nextBillingDate = null
                response.createdAt = null
            }
            response.isActive = (subscription.status == "active" || subscription.status == "trialing")

            try {
                response.cancelAtPeriodEnd = subscription.cancelAtPeriodEnd ?: false
            } catch (Exception e) {
                log.debug("Could not access cancelAtPeriodEnd: ${e.message}")
                response.cancelAtPeriodEnd = false
            }

            // Trial information
            if (subscription.status == "trialing") {
                try {
                    Long trialStartTimestamp = subscription.trialStart
                    Long trialEndTimestamp = subscription.trialEnd

                    if (trialEndTimestamp) {
                        response.isTrialing = true
                        response.trialStart = trialStartTimestamp ? new Date(trialStartTimestamp * 1000) : null
                        response.trialEnd = new Date(trialEndTimestamp * 1000)

                        // Calculate days remaining
                        long trialEndMillis = trialEndTimestamp * 1000
                        long nowMillis = System.currentTimeMillis()
                        long daysRemaining = Math.max(0, (trialEndMillis - nowMillis) / (24 * 60 * 60 * 1000))
                        response.trialDaysRemaining = (int) daysRemaining
                        response.trialExpired = daysRemaining <= 0
                    }
                } catch (Exception e) {
                    log.debug("Could not access trial dates: ${e.message}")
                    response.isTrialing = false
                }
            }

            try {
                Long canceledAtTimestamp = subscription.canceledAt
                response.canceledAt = canceledAtTimestamp ? new Date(canceledAtTimestamp * 1000) : null
            } catch (Exception e) {
                log.debug("Could not access canceledAt: ${e.message}")
                response.canceledAt = null
            }

            response.message = "Subscription details retrieved successfully"
            return response

        } catch (StripeException e) {
            log.error("Stripe error getting subscription details for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to retrieve subscription details: ${e.message}")
        } catch (Exception e) {
            log.error("Error getting subscription details for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to retrieve subscription details: ${e.message}")
        }
    }

    /**
     * Update subscription plan (upgrade/downgrade)
     */
    SubscriptionResponse updateSubscriptionPlan(UUID shopId, SubscriptionUpdateRequest request) {
        try {
            Stripe.apiKey = stripeSecretKey
            
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)
            
            if (!stripeDetails.hasSubscription()) {
                throw new RuntimeException("Shop does not have a subscription to update")
            }

            // Fetch current subscription
            Subscription subscription = Subscription.retrieve(stripeDetails.subscriptionId)
            
            // Update subscription item with new price
            SubscriptionItem subscriptionItem = subscription.items.data[0]
            
            SubscriptionUpdateParams updateParams = SubscriptionUpdateParams.builder()
                    .addItem(SubscriptionUpdateParams.Item.builder()
                            .setId(subscriptionItem.id)
                            .setPrice(request.newStripePriceId)
                            .build())
                    .setProrationBehavior(SubscriptionUpdateParams.ProrationBehavior.valueOf(
                            request.prorationBehavior.toUpperCase()))
                    .build()

            Subscription updatedSubscription = subscription.update(updateParams)
            
            // Update stored price ID
            shopStripeDetailsService.updateSubscription(shop, updatedSubscription.id, 
                    updatedSubscription.customer, request.newStripePriceId)

            log.info("Successfully updated subscription plan for shop ${shopId}: ${request.newStripePriceId}")
            
            return getDetailedSubscriptionInfo(shopId)

        } catch (StripeException e) {
            log.error("Stripe error updating subscription for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to update subscription: ${e.message}")
        } catch (Exception e) {
            log.error("Error updating subscription for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to update subscription: ${e.message}")
        }
    }

    /**
     * Cancel subscription
     */
    SubscriptionResponse cancelSubscription(UUID shopId, boolean cancelImmediately = false) {
        try {
            Stripe.apiKey = stripeSecretKey
            
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)
            
            if (!stripeDetails.hasSubscription()) {
                throw new RuntimeException("Shop does not have a subscription to cancel")
            }

            Subscription subscription = Subscription.retrieve(stripeDetails.subscriptionId)
            
            if (cancelImmediately) {
                // Cancel immediately
                subscription = subscription.cancel()
                log.info("Immediately cancelled subscription for shop ${shopId}")
            } else {
                // Cancel at period end
                SubscriptionUpdateParams updateParams = SubscriptionUpdateParams.builder()
                        .setCancelAtPeriodEnd(true)
                        .build()
                subscription = subscription.update(updateParams)
                log.info("Scheduled subscription cancellation at period end for shop ${shopId}")
            }
            
            return getDetailedSubscriptionInfo(shopId)

        } catch (StripeException e) {
            log.error("Stripe error cancelling subscription for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to cancel subscription: ${e.message}")
        } catch (Exception e) {
            log.error("Error cancelling subscription for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to cancel subscription: ${e.message}")
        }
    }

    /**
     * Reactivate a cancelled subscription (if still within period)
     */
    SubscriptionResponse reactivateSubscription(UUID shopId) {
        try {
            Stripe.apiKey = stripeSecretKey
            
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)
            
            if (!stripeDetails.hasSubscription()) {
                throw new RuntimeException("Shop does not have a subscription to reactivate")
            }

            Subscription subscription = Subscription.retrieve(stripeDetails.subscriptionId)
            
            try {
                if (!subscription.cancelAtPeriodEnd) {
                    throw new RuntimeException("Subscription is not scheduled for cancellation")
                }
            } catch (Exception e) {
                log.debug("Could not access cancelAtPeriodEnd: ${e.message}")
                throw new RuntimeException("Subscription is not scheduled for cancellation")
            }
            
            // Remove cancellation
            SubscriptionUpdateParams updateParams = SubscriptionUpdateParams.builder()
                    .setCancelAtPeriodEnd(false)
                    .build()
            subscription = subscription.update(updateParams)
            
            log.info("Reactivated subscription for shop ${shopId}")
            
            return getDetailedSubscriptionInfo(shopId)

        } catch (StripeException e) {
            log.error("Stripe error reactivating subscription for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to reactivate subscription: ${e.message}")
        } catch (Exception e) {
            log.error("Error reactivating subscription for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to reactivate subscription: ${e.message}")
        }
    }
}
