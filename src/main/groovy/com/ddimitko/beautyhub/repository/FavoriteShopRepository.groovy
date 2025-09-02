package com.ddimitko.beautyhub.repository

import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.entity.User
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

@Repository
interface FavoriteShopRepository extends JpaRepository<User, UUID> {

    /**
     * Check if a user has favorited a specific shop
     */
    @Query("SELECT CASE WHEN COUNT(u) > 0 THEN true ELSE false END FROM User u JOIN u.favoriteShops fs WHERE u.id = :userId AND fs.id = :shopId")
    boolean isShopFavoritedByUser(@Param("userId") UUID userId, @Param("shopId") UUID shopId)

    /**
     * Get all favorite shops for a user with pagination
     */
    @Query("SELECT fs FROM User u JOIN u.favoriteShops fs WHERE u.id = :userId ORDER BY fs.name ASC")
    Page<Shop> findFavoriteShopsByUser(@Param("userId") UUID userId, Pageable pageable)

    /**
     * Get all favorite shops for a user as a list
     */
    @Query("SELECT fs FROM User u JOIN u.favoriteShops fs WHERE u.id = :userId ORDER BY fs.name ASC")
    List<Shop> findFavoriteShopsByUser(@Param("userId") UUID userId)

    /**
     * Count favorite shops for a user
     */
    @Query("SELECT COUNT(fs) FROM User u JOIN u.favoriteShops fs WHERE u.id = :userId")
    long countFavoriteShopsByUser(@Param("userId") UUID userId)

    /**
     * Get users who have favorited a specific shop
     */
    @Query("SELECT u FROM User u JOIN u.favoriteShops fs WHERE fs.id = :shopId")
    List<User> findUsersByFavoriteShop(@Param("shopId") UUID shopId)

    /**
     * Count users who have favorited a specific shop
     */
    @Query("SELECT COUNT(u) FROM User u JOIN u.favoriteShops fs WHERE fs.id = :shopId")
    long countUsersByFavoriteShop(@Param("shopId") UUID shopId)
}
