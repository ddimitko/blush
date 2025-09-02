package com.ddimitko.beautyhub.repository

import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.entity.ShopStripeDetails
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

@Repository
interface ShopStripeDetailsRepository extends JpaRepository<ShopStripeDetails, UUID> {

    Optional<ShopStripeDetails> findByShop(Shop shop)

    Optional<ShopStripeDetails> findByShopId(UUID shopId)

    Optional<ShopStripeDetails> findByStripeAccountId(String stripeAccountId)

    Optional<ShopStripeDetails> findBySubscriptionId(String subscriptionId)

    Optional<ShopStripeDetails> findByStripeCustomerId(String stripeCustomerId)

    @Query("SELECT ssd FROM ShopStripeDetails ssd WHERE ssd.stripeAccountId IS NOT NULL AND ssd.stripeOnboardingCompleted = false")
    List<ShopStripeDetails> findShopsWithIncompleteStripeOnboarding()

    @Query("SELECT ssd FROM ShopStripeDetails ssd WHERE ssd.subscriptionId IS NOT NULL")
    List<ShopStripeDetails> findShopsWithSubscriptions()

    @Query("SELECT ssd FROM ShopStripeDetails ssd WHERE ssd.lastStripeSync IS NULL OR ssd.lastStripeSync < :cutoffTime")
    List<ShopStripeDetails> findShopsNeedingStripeSync(@Param("cutoffTime") java.time.LocalDateTime cutoffTime)

    boolean existsByShopId(UUID shopId)

    boolean existsByStripeAccountId(String stripeAccountId)

    boolean existsBySubscriptionId(String subscriptionId)
}
