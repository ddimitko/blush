package com.ddimitko.beautyhub.repository

import com.ddimitko.beautyhub.entity.DeviceToken
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

import java.time.LocalDateTime

@Repository
interface DeviceTokenRepository extends JpaRepository<DeviceToken, UUID> {

    /**
     * Find device token by user ID and token string
     */
    DeviceToken findByUserIdAndToken(UUID userId, String token)

    /**
     * Find device token by token string only
     */
    DeviceToken findByToken(String token)

    /**
     * Find all active device tokens for a user
     */
    List<DeviceToken> findByUserIdAndActive(UUID userId, Boolean active)

    /**
     * Find active device tokens for a user on a specific platform
     */
    List<DeviceToken> findByUserIdAndPlatformAndActive(UUID userId, String platform, Boolean active)

    /**
     * Find all device tokens for a user on a specific platform
     */
    List<DeviceToken> findByUserIdAndPlatform(UUID userId, String platform)

    /**
     * Find inactive tokens older than specified date
     */
    List<DeviceToken> findByActiveAndLastUsedBefore(Boolean active, LocalDateTime date)

    /**
     * Find expired tokens (not used in last 30 days)
     */
    @Query("SELECT dt FROM DeviceToken dt WHERE dt.lastUsed < :cutoffDate")
    List<DeviceToken> findExpiredTokens(@Param("cutoffDate") LocalDateTime cutoffDate)

    /**
     * Count active tokens for a user
     */
    @Query("SELECT COUNT(dt) FROM DeviceToken dt WHERE dt.userId = :userId AND dt.active = true")
    Long countActiveTokensByUserId(@Param("userId") UUID userId)

    /**
     * Count active tokens by platform
     */
    @Query("SELECT COUNT(dt) FROM DeviceToken dt WHERE dt.platform = :platform AND dt.active = true")
    Long countActiveTokensByPlatform(@Param("platform") String platform)

    /**
     * Find all active iOS tokens
     */
    @Query("SELECT dt FROM DeviceToken dt WHERE dt.platform = 'ios' AND dt.active = true")
    List<DeviceToken> findAllActiveIOSTokens()

    /**
     * Find all active Android tokens
     */
    @Query("SELECT dt FROM DeviceToken dt WHERE dt.platform = 'android' AND dt.active = true")
    List<DeviceToken> findAllActiveAndroidTokens()

    /**
     * Deactivate all tokens for a user
     */
    @Query("UPDATE DeviceToken dt SET dt.active = false WHERE dt.userId = :userId")
    void deactivateAllTokensForUser(@Param("userId") UUID userId)

    /**
     * Delete old inactive tokens
     */
    @Query("DELETE FROM DeviceToken dt WHERE dt.active = false AND dt.lastUsed < :cutoffDate")
    void deleteOldInactiveTokens(@Param("cutoffDate") LocalDateTime cutoffDate)
}
