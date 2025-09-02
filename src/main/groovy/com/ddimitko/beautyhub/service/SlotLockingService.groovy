package com.ddimitko.beautyhub.service

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.redis.core.RedisTemplate
import org.springframework.stereotype.Service
import groovy.util.logging.Slf4j

import java.time.Duration
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@Service
@Slf4j
class SlotLockingService {

    @Autowired
    private RedisTemplate<String, Object> redisTemplate

    @Autowired
    private SlotUpdateService slotUpdateService

    private static final Duration LOCK_DURATION = Duration.ofMinutes(5)
    private static final String LOCK_PREFIX = "slot_lock:"

    boolean lockSlot(UUID shopId, UUID serviceId, UUID employeeId, LocalDateTime dateTime, UUID userId) {
        String lockKey = generateLockKey(shopId, serviceId, employeeId, dateTime)

        // Try to set the lock with expiration
        Boolean lockAcquired = redisTemplate.opsForValue()
                .setIfAbsent(lockKey, userId.toString(), LOCK_DURATION)

        // Broadcast slot lock event via RabbitMQ and WebSocket if lock was acquired
        if (lockAcquired) {
            slotUpdateService.broadcastSlotLocked(shopId, serviceId, employeeId, dateTime, userId)
        }

        return lockAcquired ?: false
    }

    boolean isSlotLocked(UUID shopId, UUID serviceId, UUID employeeId, LocalDateTime dateTime) {
        String lockKey = generateLockKey(shopId, serviceId, employeeId, dateTime)
        return redisTemplate.hasKey(lockKey)
    }

    String getSlotLockOwner(UUID shopId, UUID serviceId, UUID employeeId, LocalDateTime dateTime) {
        String lockKey = generateLockKey(shopId, serviceId, employeeId, dateTime)
        return (String) redisTemplate.opsForValue().get(lockKey)
    }

    boolean isSlotLockedByUser(UUID shopId, UUID serviceId, UUID employeeId, LocalDateTime dateTime, UUID userId) {
        String lockOwner = getSlotLockOwner(shopId, serviceId, employeeId, dateTime)
        return lockOwner == userId.toString()
    }

    /**
     * Lock a slot for guest users using email as identifier
     */
    boolean lockSlotForGuest(UUID shopId, UUID serviceId, UUID employeeId, LocalDateTime dateTime, String guestEmail) {
        String lockKey = generateLockKey(shopId, serviceId, employeeId, dateTime)
        String guestIdentifier = "guest:${guestEmail}"

        // Try to set the lock with expiration
        Boolean lockAcquired = redisTemplate.opsForValue()
                .setIfAbsent(lockKey, guestIdentifier, LOCK_DURATION)

        // Broadcast slot lock event via RabbitMQ and WebSocket if lock was acquired
        if (lockAcquired) {
            // Use a temporary UUID for guest users for WebSocket broadcasting
            UUID tempUserId = UUID.nameUUIDFromBytes(guestEmail.bytes)
            slotUpdateService.broadcastSlotLocked(shopId, serviceId, employeeId, dateTime, tempUserId)
        }

        return lockAcquired ?: false
    }

    /**
     * Check if a slot is locked by a guest user
     */
    boolean isSlotLockedByGuest(UUID shopId, UUID serviceId, UUID employeeId, LocalDateTime dateTime, String guestEmail) {
        String lockOwner = getSlotLockOwner(shopId, serviceId, employeeId, dateTime)
        String expectedGuestIdentifier = "guest:${guestEmail}"
        return lockOwner == expectedGuestIdentifier
    }

    void unlockSlot(UUID shopId, UUID serviceId, UUID employeeId, LocalDateTime dateTime) {
        String lockKey = generateLockKey(shopId, serviceId, employeeId, dateTime)

        // Get the lock owner before deleting (for WebSocket broadcast)
        String lockOwner = (String) redisTemplate.opsForValue().get(lockKey)

        // Delete the lock
        Boolean wasDeleted = redisTemplate.delete(lockKey)

        // Broadcast slot unlock event via RabbitMQ and WebSocket if lock was actually deleted
        if (wasDeleted && lockOwner) {
            UUID ownerId = UUID.fromString(lockOwner)
            slotUpdateService.broadcastSlotUnlocked(shopId, serviceId, employeeId, dateTime, ownerId)
        }
    }

    void unlockSlotIfOwnedByUser(UUID shopId, UUID serviceId, UUID employeeId, LocalDateTime dateTime, UUID userId) {
        if (isSlotLockedByUser(shopId, serviceId, employeeId, dateTime, userId)) {
            unlockSlot(shopId, serviceId, employeeId, dateTime)
        }
    }

    void extendLock(UUID shopId, UUID serviceId, UUID employeeId, LocalDateTime dateTime, UUID userId) {
        if (isSlotLockedByUser(shopId, serviceId, employeeId, dateTime, userId)) {
            String lockKey = generateLockKey(shopId, serviceId, employeeId, dateTime)
            redisTemplate.expire(lockKey, LOCK_DURATION)
        }
    }

    List<String> getUserLockedSlots(UUID userId) {
        Set<String> keys = redisTemplate.keys("${LOCK_PREFIX}*")
        List<String> userSlots = []
        
        keys?.each { key ->
            String lockOwner = (String) redisTemplate.opsForValue().get(key)
            if (lockOwner == userId.toString()) {
                userSlots.add(key.replace(LOCK_PREFIX, ""))
            }
        }
        
        return userSlots
    }

    void unlockAllUserSlots(UUID userId) {
        Set<String> keys = redisTemplate.keys("${LOCK_PREFIX}*")

        keys?.each { key ->
            String lockOwner = (String) redisTemplate.opsForValue().get(key)
            if (lockOwner == userId.toString()) {
                // Parse the key to get slot details for WebSocket broadcast
                String slotInfo = key.replace(LOCK_PREFIX, "")
                String[] parts = slotInfo.split(":")

                if (parts.length >= 4) {
                    try {
                        UUID shopId = UUID.fromString(parts[0])
                        UUID serviceId = UUID.fromString(parts[1])
                        UUID employeeId = UUID.fromString(parts[2])
                        LocalDateTime dateTime = LocalDateTime.parse(parts[3])

                        // Delete the lock
                        Boolean wasDeleted = redisTemplate.delete(key)

                        // Broadcast unlock event if lock was deleted
                        if (wasDeleted) {
                            slotUpdateService.broadcastSlotUnlocked(shopId, serviceId, employeeId, dateTime, userId)
                        }
                    } catch (Exception e) {
                        log.warn("Failed to parse slot info for WebSocket broadcast: ${slotInfo}", e)
                        // Still delete the lock even if broadcast fails
                        redisTemplate.delete(key)
                    }
                } else {
                    // Fallback: just delete the lock without broadcast
                    redisTemplate.delete(key)
                }
            }
        }
    }

    /**
     * Clean up expired locks and broadcast unlock events
     */
    void cleanupExpiredLocks() {
        Set<String> keys = redisTemplate.keys("${LOCK_PREFIX}*")

        keys?.each { key ->
            // Check if key still exists (might have expired)
            if (!redisTemplate.hasKey(key)) {
                // Key has expired, parse and broadcast unlock
                String slotInfo = key.replace(LOCK_PREFIX, "")
                String[] parts = slotInfo.split(":")

                if (parts.length >= 4) {
                    try {
                        UUID shopId = UUID.fromString(parts[0])
                        UUID serviceId = UUID.fromString(parts[1])
                        UUID employeeId = UUID.fromString(parts[2])
                        LocalDateTime dateTime = LocalDateTime.parse(parts[3])

                        // Broadcast unlock event for expired lock
                        slotUpdateService.broadcastSlotUnlocked(shopId, serviceId, employeeId, dateTime, null)
                    } catch (Exception e) {
                        log.warn("Failed to parse expired slot info: ${slotInfo}", e)
                    }
                }
            }
        }
    }

    private String generateLockKey(UUID shopId, UUID serviceId, UUID employeeId, LocalDateTime dateTime) {
        String formattedDateTime = dateTime.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        return "${LOCK_PREFIX}${shopId}:${serviceId}:${employeeId}:${formattedDateTime}"
    }

    Duration getLockDuration() {
        return LOCK_DURATION
    }


}
