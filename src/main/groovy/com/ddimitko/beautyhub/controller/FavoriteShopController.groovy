package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.security.CustomUserPrincipal
import com.ddimitko.beautyhub.service.FavoriteShopService
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@Slf4j
@RestController
@RequestMapping("/api/favorites")
class FavoriteShopController {

    @Autowired
    private FavoriteShopService favoriteShopService

    /**
     * Add a shop to user's favorites
     */
    @PostMapping("/shops/{shopId}")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> addToFavorites(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            boolean added = favoriteShopService.addToFavorites(userPrincipal.getId(), shopId)
            
            if (added) {
                return ResponseEntity.ok([
                    message: "Shop added to favorites successfully",
                    favorited: true
                ])
            } else {
                return ResponseEntity.ok([
                    message: "Shop is already in favorites",
                    favorited: true
                ])
            }
        } catch (Exception e) {
            log.error("Error adding shop ${shopId} to favorites for user ${userPrincipal.getId()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to add shop to favorites",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Remove a shop from user's favorites
     */
    @DeleteMapping("/shops/{shopId}")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> removeFromFavorites(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            boolean removed = favoriteShopService.removeFromFavorites(userPrincipal.getId(), shopId)
            
            if (removed) {
                return ResponseEntity.ok([
                    message: "Shop removed from favorites successfully",
                    favorited: false
                ])
            } else {
                return ResponseEntity.ok([
                    message: "Shop was not in favorites",
                    favorited: false
                ])
            }
        } catch (Exception e) {
            log.error("Error removing shop ${shopId} from favorites for user ${userPrincipal.getId()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to remove shop from favorites",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Toggle favorite status for a shop
     */
    @PutMapping("/shops/{shopId}/toggle")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> toggleFavorite(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            boolean isFavorited = favoriteShopService.toggleFavorite(userPrincipal.getId(), shopId)
            
            return ResponseEntity.ok([
                message: isFavorited ? "Shop added to favorites" : "Shop removed from favorites",
                favorited: isFavorited
            ])
        } catch (Exception e) {
            log.error("Error toggling favorite status for shop ${shopId} and user ${userPrincipal.getId()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to toggle favorite status",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Check if a shop is favorited by the user
     */
    @GetMapping("/shops/{shopId}/status")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> getFavoriteStatus(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            boolean isFavorited = favoriteShopService.isShopFavorited(userPrincipal.getId(), shopId)
            
            return ResponseEntity.ok([
                favorited: isFavorited,
                shopId: shopId
            ])
        } catch (Exception e) {
            log.error("Error checking favorite status for shop ${shopId} and user ${userPrincipal.getId()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to check favorite status",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Get user's favorite shops
     */
    @GetMapping("/shops")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> getFavoriteShops(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            Pageable pageable = PageRequest.of(page, size)
            Page<Shop> favoriteShops = favoriteShopService.getUserFavoriteShops(userPrincipal.getId(), pageable)
            
            return ResponseEntity.ok([
                content: favoriteShops.content,
                totalElements: favoriteShops.totalElements,
                totalPages: favoriteShops.totalPages,
                currentPage: favoriteShops.number,
                size: favoriteShops.size,
                hasNext: favoriteShops.hasNext(),
                hasPrevious: favoriteShops.hasPrevious()
            ])
        } catch (Exception e) {
            log.error("Error getting favorite shops for user ${userPrincipal.getId()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to get favorite shops",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Get count of user's favorite shops
     */
    @GetMapping("/shops/count")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> getFavoriteShopsCount(
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            long count = favoriteShopService.getUserFavoriteShopsCount(userPrincipal.getId())
            
            return ResponseEntity.ok([
                count: count
            ])
        } catch (Exception e) {
            log.error("Error getting favorite shops count for user ${userPrincipal.getId()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to get favorite shops count",
                message: e.getMessage()
            ])
        }
    }
}
