package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.entity.ShopStripeDetails
import com.ddimitko.beautyhub.repository.ShopStripeDetailsRepository
import com.stripe.exception.StripeException
import com.stripe.model.Subscription
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

import java.time.LocalDateTime

@Service
@Transactional
@Slf4j
class ShopStripeDetailsService {

    @Autowired
    private ShopStripeDetailsRepository shopStripeDetailsRepository

    /**
     * Get or create Stripe details for a shop
     */
    ShopStripeDetails getOrCreateStripeDetails(Shop shop) {
        return shopStripeDetailsRepository.findByShop(shop)
                .orElseGet {
                    log.info("Creating new Stripe details for shop: ${shop.id}")
                    ShopStripeDetails stripeDetails = new ShopStripeDetails()
                    stripeDetails.shop = shop
                    stripeDetails.stripeOnboardingCompleted = false
                    return shopStripeDetailsRepository.save(stripeDetails)
                }
    }

    /**
     * Get Stripe details by shop ID
     */
    Optional<ShopStripeDetails> getStripeDetailsByShopId(UUID shopId) {
        return shopStripeDetailsRepository.findByShopId(shopId)
    }

    /**
     * Update Stripe account information
     */
    ShopStripeDetails updateStripeAccount(Shop shop, String stripeAccountId, boolean onboardingCompleted) {
        ShopStripeDetails stripeDetails = getOrCreateStripeDetails(shop)
        stripeDetails.stripeAccountId = stripeAccountId
        stripeDetails.stripeOnboardingCompleted = onboardingCompleted
        stripeDetails.lastStripeSync = LocalDateTime.now()
        return shopStripeDetailsRepository.save(stripeDetails)
    }

    /**
     * Update subscription information
     */
    ShopStripeDetails updateSubscription(Shop shop, String subscriptionId, String customerId, String priceId) {
        ShopStripeDetails stripeDetails = getOrCreateStripeDetails(shop)
        stripeDetails.subscriptionId = subscriptionId
        stripeDetails.stripeCustomerId = customerId
        stripeDetails.stripePriceId = priceId
        stripeDetails.lastStripeSync = LocalDateTime.now()
        return shopStripeDetailsRepository.save(stripeDetails)
    }

    /**
     * Update onboarding status
     */
    ShopStripeDetails updateOnboardingStatus(Shop shop, boolean completed) {
        ShopStripeDetails stripeDetails = getOrCreateStripeDetails(shop)
        stripeDetails.stripeOnboardingCompleted = completed
        stripeDetails.lastStripeSync = LocalDateTime.now()
        return shopStripeDetailsRepository.save(stripeDetails)
    }

    /**
     * Clear subscription information (for cancellations)
     */
    ShopStripeDetails clearSubscription(Shop shop) {
        ShopStripeDetails stripeDetails = getOrCreateStripeDetails(shop)
        stripeDetails.subscriptionId = null
        stripeDetails.stripeCustomerId = null
        stripeDetails.stripePriceId = null
        stripeDetails.lastStripeSync = LocalDateTime.now()
        return shopStripeDetailsRepository.save(stripeDetails)
    }

    /**
     * Update last sync time
     */
    ShopStripeDetails updateLastSync(Shop shop) {
        ShopStripeDetails stripeDetails = getOrCreateStripeDetails(shop)
        stripeDetails.lastStripeSync = LocalDateTime.now()
        return shopStripeDetailsRepository.save(stripeDetails)
    }

    /**
     * Find shops that need Stripe sync (haven't been synced recently)
     */
    List<ShopStripeDetails> findShopsNeedingSync(int hoursAgo) {
        LocalDateTime cutoffTime = LocalDateTime.now().minusHours(hoursAgo)
        return shopStripeDetailsRepository.findShopsNeedingStripeSync(cutoffTime)
    }

    /**
     * Find shops with incomplete onboarding
     */
    List<ShopStripeDetails> findShopsWithIncompleteOnboarding() {
        return shopStripeDetailsRepository.findShopsWithIncompleteStripeOnboarding()
    }

    /**
     * Check if shop has active subscription (should fetch from Stripe API)
     */
    boolean hasActiveSubscription(Shop shop) {
        Optional<ShopStripeDetails> stripeDetails = shopStripeDetailsRepository.findByShop(shop)
        return stripeDetails.isPresent() && stripeDetails.get().hasSubscription()
    }

    /**
     * Check if shop can accept payments
     */
    boolean canAcceptPayments(Shop shop) {
        Optional<ShopStripeDetails> stripeDetails = shopStripeDetailsRepository.findByShop(shop)
        return shop.acceptsCardPayments &&
               stripeDetails.isPresent() &&
               stripeDetails.get().canAcceptPayments()
    }

    /**
     * Save Stripe details
     */
    ShopStripeDetails save(ShopStripeDetails stripeDetails) {
        return shopStripeDetailsRepository.save(stripeDetails)
    }

    /**
     * Find Stripe details by Stripe account ID
     */
    Optional<ShopStripeDetails> findByStripeAccountId(String stripeAccountId) {
        return shopStripeDetailsRepository.findByStripeAccountId(stripeAccountId)
    }

    /**
     * Get current subscription status from Stripe API (per-request for security)
     */
    String getCurrentSubscriptionStatus(Shop shop) {
        Optional<ShopStripeDetails> stripeDetails = shopStripeDetailsRepository.findByShop(shop)
        if (!stripeDetails.isPresent() || !stripeDetails.get().subscriptionId) {
            return "incomplete"
        }

        try {
            Subscription subscription = Subscription.retrieve(stripeDetails.get().subscriptionId)
            return subscription.status
        } catch (StripeException e) {
            log.error("Error fetching subscription status from Stripe for shop ${shop.id}: ${e.message}", e)
            return "error"
        }
    }

    /**
     * Check if subscription is active (fetches from Stripe API per request)
     */
    boolean isSubscriptionActive(Shop shop) {
        String status = getCurrentSubscriptionStatus(shop)
        return status == "active" || status == "trialing"
    }

    /**
     * Get Stripe customer ID for a shop
     */
    String getStripeCustomerId(Shop shop) {
        Optional<ShopStripeDetails> stripeDetails = shopStripeDetailsRepository.findByShop(shop)
        return stripeDetails.isPresent() ? stripeDetails.get().stripeCustomerId : null
    }

    /**
     * Get subscription ID for a shop
     */
    String getSubscriptionId(Shop shop) {
        Optional<ShopStripeDetails> stripeDetails = shopStripeDetailsRepository.findByShop(shop)
        return stripeDetails.isPresent() ? stripeDetails.get().subscriptionId : null
    }

    /**
     * Get Stripe account ID for a shop
     */
    String getStripeAccountId(Shop shop) {
        Optional<ShopStripeDetails> stripeDetails = shopStripeDetailsRepository.findByShop(shop)
        return stripeDetails.isPresent() ? stripeDetails.get().stripeAccountId : null
    }
}
