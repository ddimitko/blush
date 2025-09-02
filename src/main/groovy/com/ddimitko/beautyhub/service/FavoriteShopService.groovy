package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.repository.FavoriteShopRepository
import com.ddimitko.beautyhub.repository.ShopRepository
import com.ddimitko.beautyhub.repository.UserRepository
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Slf4j
@Service
@Transactional
class FavoriteShopService {

    @Autowired
    private FavoriteShopRepository favoriteShopRepository

    @Autowired
    private UserRepository userRepository

    @Autowired
    private ShopRepository shopRepository

    /**
     * Add a shop to user's favorites
     */
    boolean addToFavorites(UUID userId, UUID shopId) {
        try {
            User user = userRepository.findById(userId)
                .orElseThrow { new RuntimeException("User not found") }

            Shop shop = shopRepository.findById(shopId)
                .orElseThrow { new RuntimeException("Shop not found") }

            // Check if already favorited
            if (favoriteShopRepository.isShopFavoritedByUser(userId, shopId)) {
                log.debug("Shop ${shopId} is already favorited by user ${userId}")
                return false
            }

            // Add to favorites
            user.favoriteShops.add(shop)
            userRepository.save(user)

            log.info("Added shop ${shopId} to favorites for user ${userId}")
            return true

        } catch (Exception e) {
            log.error("Error adding shop ${shopId} to favorites for user ${userId}", e)
            throw new RuntimeException("Failed to add shop to favorites: ${e.message}")
        }
    }

    /**
     * Remove a shop from user's favorites
     */
    boolean removeFromFavorites(UUID userId, UUID shopId) {
        try {
            User user = userRepository.findById(userId)
                .orElseThrow { new RuntimeException("User not found") }

            Shop shop = shopRepository.findById(shopId)
                .orElseThrow { new RuntimeException("Shop not found") }

            // Check if favorited
            if (!favoriteShopRepository.isShopFavoritedByUser(userId, shopId)) {
                log.debug("Shop ${shopId} is not favorited by user ${userId}")
                return false
            }

            // Remove from favorites
            user.favoriteShops.remove(shop)
            userRepository.save(user)

            log.info("Removed shop ${shopId} from favorites for user ${userId}")
            return true

        } catch (Exception e) {
            log.error("Error removing shop ${shopId} from favorites for user ${userId}", e)
            throw new RuntimeException("Failed to remove shop from favorites: ${e.message}")
        }
    }

    /**
     * Toggle favorite status for a shop
     */
    boolean toggleFavorite(UUID userId, UUID shopId) {
        if (favoriteShopRepository.isShopFavoritedByUser(userId, shopId)) {
            return !removeFromFavorites(userId, shopId) // Return true if it was favorited (now removed)
        } else {
            addToFavorites(userId, shopId)
            return true // Return true as it's now favorited
        }
    }

    /**
     * Check if a shop is favorited by a user
     */
    boolean isShopFavorited(UUID userId, UUID shopId) {
        return favoriteShopRepository.isShopFavoritedByUser(userId, shopId)
    }

    /**
     * Get user's favorite shops with pagination
     */
    Page<Shop> getUserFavoriteShops(UUID userId, Pageable pageable) {
        return favoriteShopRepository.findFavoriteShopsByUser(userId, pageable)
    }

    /**
     * Get user's favorite shops as a list
     */
    List<Shop> getUserFavoriteShops(UUID userId) {
        return favoriteShopRepository.findFavoriteShopsByUser(userId)
    }

    /**
     * Get count of user's favorite shops
     */
    long getUserFavoriteShopsCount(UUID userId) {
        return favoriteShopRepository.countFavoriteShopsByUser(userId)
    }

    /**
     * Get count of users who favorited a shop
     */
    long getShopFavoritesCount(UUID shopId) {
        return favoriteShopRepository.countUsersByFavoriteShop(shopId)
    }
}
