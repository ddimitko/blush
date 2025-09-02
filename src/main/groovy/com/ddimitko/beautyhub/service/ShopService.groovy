package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.dto.ShopCreationRequest
import com.ddimitko.beautyhub.dto.ShopCreationResponse
import com.ddimitko.beautyhub.dto.ShopWithSubscriptionRequest
import com.ddimitko.beautyhub.dto.ShopWithSubscriptionResponse
import com.ddimitko.beautyhub.dto.SubscriptionRequest
import com.ddimitko.beautyhub.dto.SubscriptionResponse

import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.enums.BusinessType
import com.ddimitko.beautyhub.repository.ShopRepository
import com.ddimitko.beautyhub.service.ShopStripeDetailsService
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.cache.annotation.Cacheable
import org.springframework.cache.annotation.CacheEvict
import org.springframework.cache.annotation.CachePut
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Slf4j
@Transactional
class ShopService {

    @Autowired
    private ShopRepository shopRepository

    @Autowired
    private UserService userService

    @Autowired
    private StripeService stripeService

    @Autowired
    private ShopStripeDetailsService shopStripeDetailsService

    Shop createShop(UUID ownerId, ShopCreationRequest request) {
        User owner = userService.findById(ownerId)

        // Upgrade user to OWNER role if they're creating a shop
        if (!owner.isOwner()) {
            owner = userService.upgradeToOwner(ownerId)
        }

        // Check if owner already has a shop (optional business rule)
        List<Shop> existingShops = shopRepository.findByOwner(owner)
        if (!existingShops.isEmpty()) {
            throw new IllegalArgumentException("You already have a shop. Multiple shops per owner not currently supported.")
        }

        Shop shop = new Shop()
        shop.owner = owner
        shop.name = request.name
        shop.description = request.description
        shop.businessTypes = request.businessTypes
        shop.address = request.address
        shop.city = request.city
        shop.state = request.state
        shop.postalCode = request.postalCode
        shop.country = request.country
        shop.phone = request.phone
        shop.email = request.email
        shop.website = request.website
        shop.acceptsCardPayments = request.acceptsCardPayments ?: false
        shop.latitude = request.latitude
        shop.longitude = request.longitude
        shop.active = false  // Shops start inactive until subscription is active
        // Note: subscription status is now managed in ShopStripeDetails

        return shopRepository.save(shop)
    }

    ShopCreationResponse createShopWithResponse(UUID ownerId, ShopCreationRequest request) {
        // Validate terms acceptance
        if (!request.termsAccepted) {
            throw new IllegalArgumentException("Terms and conditions must be accepted")
        }

        // For now, we'll create the shop immediately but mark it as requiring subscription
        // In a real implementation, you might want to create a "pending" shop that gets activated after subscription
        Shop shop = createShop(ownerId, request)

        ShopCreationResponse response = new ShopCreationResponse()
        response.shopId = shop.id
        response.message = "Shop information saved! Please complete your subscription to activate your account."
        response.name = shop.name
        response.address = shop.getFullAddress()
        response.requiresStripeSetup = shop.acceptsCardPayments && !shopStripeDetailsService.getStripeAccountId(shop)
        response.requiresSubscription = true // Always require subscription for new shops

        // Always require subscription for new professional accounts
        response.nextStep = "subscription_setup"

        return response
    }

    /**
     * Creates a shop and handles subscription in a single workflow
     */
    ShopWithSubscriptionResponse createShopWithSubscription(UUID ownerId, ShopWithSubscriptionRequest request) {
        try {
            // Step 1: Create the shop (unpublished initially)
            ShopCreationRequest shopRequest = new ShopCreationRequest()
            shopRequest.name = request.name
            shopRequest.description = request.description
            shopRequest.businessTypes = request.businessTypes
            shopRequest.address = request.address
            shopRequest.city = request.city
            shopRequest.state = request.state
            shopRequest.postalCode = request.postalCode
            shopRequest.country = request.country
            shopRequest.phone = request.phone
            shopRequest.email = request.email
            shopRequest.website = request.website
            shopRequest.acceptsCardPayments = request.acceptsCardPayments
            shopRequest.termsAccepted = request.termsAccepted
            shopRequest.latitude = request.latitude
            shopRequest.longitude = request.longitude

            Shop shop = createShop(ownerId, shopRequest)

            // Step 2: Attempt to create subscription
            SubscriptionRequest subscriptionRequest = new SubscriptionRequest()
            subscriptionRequest.stripePriceId = request.stripePriceId
            subscriptionRequest.customerName = request.customerName
            subscriptionRequest.customerEmail = request.customerEmail
            subscriptionRequest.billingAddressLine1 = request.address
            subscriptionRequest.billingCity = request.city
            subscriptionRequest.billingState = request.state
            subscriptionRequest.billingPostalCode = request.postalCode
            subscriptionRequest.billingCountry = request.country
            subscriptionRequest.termsAccepted = request.termsAccepted

            ShopWithSubscriptionResponse response = new ShopWithSubscriptionResponse()
            response.shopId = shop.id
            response.shopName = shop.name
            response.success = true

            try {
                // Try to create subscription
                SubscriptionResponse subscriptionResponse = stripeService.createSubscription(shop.id, subscriptionRequest)

                // Update shop based on subscription result
                if (subscriptionResponse.requiresPayment) {
                    // Payment required - subscription is incomplete, shop remains inactive
                    shop.active = false
                    response.subscriptionStatus = "incomplete"
                    response.clientSecret = subscriptionResponse.clientSecret
                    response.requiresPayment = true
                    response.message = "Shop created! Please complete payment to activate your shop."
                    response.shopActive = false
                } else {
                    // Payment successful - activate shop
                    shop.active = true
                    response.subscriptionStatus = "active"
                    response.requiresPayment = false
                    response.message = "Shop created and activated successfully!"
                    response.shopActive = true
                }

                response.subscriptionId = subscriptionResponse.subscriptionId
                shopRepository.save(shop)

            } catch (Exception subscriptionError) {
                // Subscription failed - keep shop inactive
                shop.active = false
                shopRepository.save(shop)

                response.subscriptionStatus = "incomplete"
                response.requiresPayment = false
                response.message = "Shop created but subscription failed. Please try again from your dashboard."
                response.shopActive = false
            }

            // Always redirect to owner dashboard
            response.redirectUrl = "/dashboard"
            return response

        } catch (Exception e) {
            throw new RuntimeException("Failed to create shop with subscription: ${e.message}", e)
        }
    }

    // @Cacheable(value = "shops", key = "#a0")
    Shop findById(UUID id) {
        try {
            return shopRepository.findById(id)
                    .orElseThrow { new RuntimeException("Shop not found with id: $id") }
        } catch (Exception e) {
            // If there's any cache-related issue, bypass cache and fetch directly
            log.warn("Cache issue in findById for shop ${id}, fetching directly: ${e.message}")
            return shopRepository.findById(id)
                    .orElseThrow { new RuntimeException("Shop not found with id: $id") }
        }
    }

    @Cacheable(value = "shops", key = "'gallery:' + #a0")
    Shop findByIdWithGallery(UUID id) {
        return shopRepository.findByIdWithGallery(id)
                .orElseThrow { new RuntimeException("Shop not found with id: $id") }
    }

    /**
     * Find shop by ID with owner check - allows shop owners to access their shops regardless of subscription status
     */
    Shop findShopByIdWithOwnerCheck(UUID shopId, UUID ownerId) {
        Shop shop = shopRepository.findByIdWithGallery(shopId)
                .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

        // Check if the user is the owner of this shop
        if (!shop.owner.id.equals(ownerId)) {
            throw new RuntimeException("Access denied: You can only access your own shops")
        }

        return shop
    }

    @Cacheable(value = "shops", key = "'active-gallery:' + #a0")
    @Transactional(readOnly = true)
    Shop findActiveShopByIdWithGallery(UUID id) {
        // First check if shop exists at all
        Optional<Shop> shopOptional = shopRepository.findByIdWithGallery(id)
        if (!shopOptional.isPresent()) {
            throw new RuntimeException("Shop not found with id: $id")
        }

        Shop shop = shopOptional.get()

        // Check if shop is active
        if (!shop.active) {
            throw new RuntimeException("Shop is not active with id: $id")
        }

        // Check if shop has subscription (required for public access)
        if (!shop.stripeDetails?.subscriptionId) {
            throw new RuntimeException("Shop does not have an active subscription with id: $id")
        }

        return shop
    }

    @Cacheable(value = "shops", key = "'active:' + #a0")
    Shop findActiveShopById(UUID id) {
        try {
            // Try to find shop with subscription first (production)
            Optional<Shop> shopWithSubscription = shopRepository.findActiveShopById(id)
            if (shopWithSubscription.isPresent()) {
                return shopWithSubscription.get()
            }

            // Fallback for development: find active shop without subscription requirement
            return shopRepository.findById(id)
                    .filter { shop -> shop.active }
                    .orElseThrow { new RuntimeException("Active shop not found with id: $id") }
        } catch (Exception e) {
            // If there's any cache-related issue, bypass cache and fetch directly
            log.warn("Cache issue in findActiveShopById for shop ${id}, fetching directly: ${e.message}")
            Optional<Shop> shopWithSubscription = shopRepository.findActiveShopById(id)
            if (shopWithSubscription.isPresent()) {
                return shopWithSubscription.get()
            }
            return shopRepository.findById(id)
                    .filter { shop -> shop.active }
                    .orElseThrow { new RuntimeException("Active shop not found with id: $id") }
        }
    }

    List<Shop> findByOwner(User owner) {
        return shopRepository.findByOwner(owner)
    }

    List<Shop> findByOwnerId(UUID ownerId) {
        User owner = userService.findById(ownerId)
        return shopRepository.findByOwnerWithGallery(owner)
    }

    @Cacheable(value = "shop-lists", key = "'active'")
    List<Shop> findActiveShops() {
        return shopRepository.findByActiveTrue()
    }

    Page<Shop> findActiveShops(Pageable pageable) {
        return shopRepository.findByActiveTrue(pageable)
    }

    List<Shop> findByBusinessType(BusinessType businessType) {
        return shopRepository.findByBusinessTypesContaining(businessType)
    }

    List<Shop> findPublishedShopsByBusinessType(BusinessType businessType) {
        return shopRepository.findByBusinessTypesContainingAndActiveTrue(businessType.name())
    }

    // @Cacheable(value = "search-results", key = "'shops:' + #name + ':' + #city + ':' + #minRating + ':' + #acceptsCard + ':' + #businessTypes + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    Page<Shop> searchShops(String name, String city, Double minRating, Boolean acceptsCard, List<String> businessTypes, Pageable pageable) {
        int offset = (int) pageable.getOffset()
        int limit = pageable.getPageSize()

        // Convert null or empty list to empty array to avoid PostgreSQL parameter issues
        String[] businessTypesArray = (businessTypes == null || businessTypes.isEmpty()) ?
            new String[0] : businessTypes.toArray(new String[0])

        List<Shop> shops = shopRepository.findShopsWithFiltersNative(name, city, minRating, acceptsCard, businessTypesArray, limit, offset)
        long total = shopRepository.countShopsWithFilters(name, city, minRating, acceptsCard, businessTypesArray)

        return new PageImpl<>(shops, pageable, total)
    }

    Page<Shop> searchShopsWithLocation(Double latitude, Double longitude, Double maxDistance, String name, String city,
                                     Double minRating, Boolean acceptsCard, List<String> businessTypes, Pageable pageable) {
        int offset = (int) pageable.getOffset()
        int limit = pageable.getPageSize()

        // Convert null or empty list to empty array to avoid PostgreSQL parameter issues
        String[] businessTypesArray = (businessTypes == null || businessTypes.isEmpty()) ?
            new String[0] : businessTypes.toArray(new String[0])

        List<Shop> shops = shopRepository.findShopsWithLocationAndFiltersNative(
            latitude, longitude, maxDistance, name, city, minRating, acceptsCard, businessTypesArray, limit, offset)
        long total = shopRepository.countShopsWithLocationAndFilters(
            latitude, longitude, maxDistance, name, city, minRating, acceptsCard, businessTypesArray)

        return new PageImpl<>(shops, pageable, total)
    }

    @CacheEvict(value = ["shops", "shop-lists", "search-results"], allEntries = true)
    @CachePut(value = "shops", key = "#a0")
    Shop updateShop(UUID id, ShopCreationRequest request) {
        Shop shop = findById(id)

        if (request.name) shop.name = request.name
        if (request.description) shop.description = request.description
        if (request.businessTypes) shop.businessTypes = request.businessTypes
        if (request.address) shop.address = request.address
        if (request.city) shop.city = request.city
        if (request.state) shop.state = request.state
        if (request.postalCode) shop.postalCode = request.postalCode
        if (request.country) shop.country = request.country
        if (request.phone) shop.phone = request.phone
        if (request.email) shop.email = request.email
        if (request.website) shop.website = request.website
        if (request.acceptsCardPayments != null) shop.acceptsCardPayments = request.acceptsCardPayments
        if (request.latitude != null) shop.latitude = request.latitude
        if (request.longitude != null) shop.longitude = request.longitude

        return shopRepository.save(shop)
    }

    @CacheEvict(value = ["shops", "shop-lists", "search-results"], allEntries = true)
    void deleteShop(UUID id) {
        Shop shop = findById(id)
        shop.active = false
        shopRepository.save(shop)
    }

    long countShopsByOwner(User owner) {
        return shopRepository.countByOwner(owner)
    }

    boolean hasShop(User owner) {
        return countShopsByOwner(owner) > 0
    }


}
