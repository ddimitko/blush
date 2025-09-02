package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.entity.ShopStripeDetails
import com.ddimitko.beautyhub.repository.ShopRepository
import com.ddimitko.beautyhub.repository.ShopStripeDetailsRepository
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Slf4j
class StripeDataMigrationService {

    @Autowired
    private ShopRepository shopRepository

    @Autowired
    private ShopStripeDetailsRepository shopStripeDetailsRepository

    /**
     * Migrates existing Stripe data from Shop entities to ShopStripeDetails
     * This should be run once during deployment
     */
    @Transactional
    void migrateStripeDataToSeparateEntity() {
        log.info("Starting migration of Stripe data to separate entity...")
        
        List<Shop> allShops = shopRepository.findAll()
        int migrated = 0
        int skipped = 0
        
        for (Shop shop : allShops) {
            try {
                // Check if migration already exists
                if (shopStripeDetailsRepository.existsByShopId(shop.id)) {
                    log.debug("Stripe details already exist for shop ${shop.id}, skipping...")
                    skipped++
                    continue
                }
                
                // Create new ShopStripeDetails entity
                ShopStripeDetails stripeDetails = ShopStripeDetails.builder()
                    .shop(shop)
                    .stripeAccountId(getOldStripeAccountId(shop))
                    .stripeOnboardingCompleted(getOldStripeOnboardingCompleted(shop))
                    .subscriptionId(getOldSubscriptionId(shop))
                    .stripeCustomerId(getOldStripeCustomerId(shop))
                    .stripePriceId(getOldStripePriceId(shop))
                    .build()
                
                shopStripeDetailsRepository.save(stripeDetails)
                migrated++
                
                log.debug("Migrated Stripe data for shop ${shop.id}")
                
            } catch (Exception e) {
                log.error("Error migrating Stripe data for shop ${shop.id}: ${e.message}", e)
            }
        }
        
        log.info("Migration completed: ${migrated} shops migrated, ${skipped} shops skipped")
    }

    /**
     * Helper methods to safely extract old Stripe data
     * These use reflection to access fields that may no longer exist
     */
    private String getOldStripeAccountId(Shop shop) {
        try {
            return shop.metaClass.getProperty(shop, 'stripeAccountId') as String
        } catch (Exception e) {
            return null
        }
    }

    private Boolean getOldStripeOnboardingCompleted(Shop shop) {
        try {
            return shop.metaClass.getProperty(shop, 'stripeOnboardingCompleted') as Boolean ?: false
        } catch (Exception e) {
            return false
        }
    }

    private String getOldSubscriptionId(Shop shop) {
        try {
            return shop.metaClass.getProperty(shop, 'subscriptionId') as String
        } catch (Exception e) {
            return null
        }
    }

    private String getOldStripeCustomerId(Shop shop) {
        try {
            return shop.metaClass.getProperty(shop, 'stripeCustomerId') as String
        } catch (Exception e) {
            return null
        }
    }

    private String getOldStripePriceId(Shop shop) {
        try {
            return shop.metaClass.getProperty(shop, 'stripePriceId') as String
        } catch (Exception e) {
            return null
        }
    }

    /**
     * Validates that all Stripe data has been properly migrated
     */
    @Transactional(readOnly = true)
    Map<String, Object> validateMigration() {
        long totalShops = shopRepository.count()
        long shopsWithStripeDetails = shopStripeDetailsRepository.count()
        
        List<UUID> shopsWithoutStripeDetails = []
        List<Shop> allShops = shopRepository.findAll()
        
        for (Shop shop : allShops) {
            if (!shopStripeDetailsRepository.existsByShopId(shop.id)) {
                shopsWithoutStripeDetails.add(shop.id)
            }
        }
        
        return [
            totalShops: totalShops,
            shopsWithStripeDetails: shopsWithStripeDetails,
            migrationComplete: totalShops == shopsWithStripeDetails,
            shopsWithoutStripeDetails: shopsWithoutStripeDetails
        ]
    }

    /**
     * Creates ShopStripeDetails for shops that don't have them
     */
    @Transactional
    void ensureAllShopsHaveStripeDetails() {
        List<Shop> allShops = shopRepository.findAll()
        int created = 0
        
        for (Shop shop : allShops) {
            if (!shopStripeDetailsRepository.existsByShopId(shop.id)) {
                ShopStripeDetails stripeDetails = new ShopStripeDetails()
                stripeDetails.shop = shop
                stripeDetails.stripeOnboardingCompleted = false
                
                shopStripeDetailsRepository.save(stripeDetails)
                created++
                log.info("Created empty Stripe details for shop ${shop.id}")
            }
        }
        
        log.info("Ensured Stripe details exist for all shops: ${created} created")
    }
}
