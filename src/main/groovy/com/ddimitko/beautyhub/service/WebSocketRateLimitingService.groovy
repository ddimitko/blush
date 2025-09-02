package com.ddimitko.beautyhub.service

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.redis.core.RedisTemplate
import org.springframework.stereotype.Service
import groovy.util.logging.Slf4j

import java.time.Duration
import java.util.concurrent.ConcurrentHashMap

/**
 * Rate limiting service specifically for WebSocket connections and operations
 */
@Service
@Slf4j
class WebSocketRateLimitingService {

    @Autowired
    private RedisTemplate<String, String> redisTemplate

    // In-memory fallback for when Redis is unavailable
    private final Map<String, RateLimitInfo> memoryLimits = new ConcurrentHashMap<>()

    // Rate limiting configurations
    private static final int MAX_CONNECTIONS_PER_IP = 10
    private static final int MAX_CONNECTIONS_PER_USER = 5
    private static final int MAX_SUBSCRIPTIONS_PER_SESSION = 50
    private static final int MAX_MESSAGES_PER_MINUTE = 100
    
    private static final Duration CONNECTION_WINDOW = Duration.ofMinutes(5)
    private static final Duration MESSAGE_WINDOW = Duration.ofMinutes(1)
    private static final Duration SUBSCRIPTION_WINDOW = Duration.ofHours(1)

    /**
     * Check if a new WebSocket connection is allowed for the given IP
     */
    boolean isConnectionAllowed(String clientIp) {
        String key = "ws:conn:ip:${clientIp}"
        return checkRateLimit(key, MAX_CONNECTIONS_PER_IP, CONNECTION_WINDOW)
    }

    /**
     * Check if a new WebSocket connection is allowed for the given user
     */
    boolean isUserConnectionAllowed(String userId) {
        String key = "ws:conn:user:${userId}"
        return checkRateLimit(key, MAX_CONNECTIONS_PER_USER, CONNECTION_WINDOW)
    }

    /**
     * Check if a subscription is allowed for the given session
     */
    boolean isSubscriptionAllowed(String sessionId) {
        String key = "ws:sub:session:${sessionId}"
        return checkRateLimit(key, MAX_SUBSCRIPTIONS_PER_SESSION, SUBSCRIPTION_WINDOW)
    }

    /**
     * Check if sending a message is allowed for the given session
     */
    boolean isMessageAllowed(String sessionId) {
        String key = "ws:msg:session:${sessionId}"
        return checkRateLimit(key, MAX_MESSAGES_PER_MINUTE, MESSAGE_WINDOW)
    }

    /**
     * Record a WebSocket connection attempt
     */
    void recordConnection(String clientIp, String userId = null) {
        recordRequest("ws:conn:ip:${clientIp}", CONNECTION_WINDOW)
        if (userId) {
            recordRequest("ws:conn:user:${userId}", CONNECTION_WINDOW)
        }
        log.debug("Recorded WebSocket connection for IP: {}, User: {}", clientIp, userId)
    }

    /**
     * Record a subscription attempt
     */
    void recordSubscription(String sessionId, String topic) {
        recordRequest("ws:sub:session:${sessionId}", SUBSCRIPTION_WINDOW)
        log.debug("Recorded subscription for session: {}, topic: {}", sessionId, topic)
    }

    /**
     * Record a message send attempt
     */
    void recordMessage(String sessionId) {
        recordRequest("ws:msg:session:${sessionId}", MESSAGE_WINDOW)
        log.debug("Recorded message for session: {}", sessionId)
    }

    /**
     * Get rate limit status for a specific key
     */
    RateLimitStatus getRateLimitStatus(String key, int limit, Duration window) {
        try {
            String countStr = redisTemplate.opsForValue().get(key)
            int currentCount = countStr ? Integer.parseInt(countStr) : 0
            long ttl = redisTemplate.getExpire(key)
            
            return new RateLimitStatus(
                limit: limit,
                remaining: Math.max(0, limit - currentCount),
                resetTime: ttl > 0 ? System.currentTimeMillis() + (ttl * 1000) : null
            )
        } catch (Exception e) {
            log.warn("Failed to get rate limit status from Redis for key {}: {}", key, e.getMessage())
            return getMemoryRateLimitStatus(key, limit, window)
        }
    }

    /**
     * Check rate limit using Redis with memory fallback
     */
    private boolean checkRateLimit(String key, int limit, Duration window) {
        try {
            return checkRedisRateLimit(key, limit, window)
        } catch (Exception e) {
            log.warn("Redis rate limiting failed for key {}, falling back to memory: {}", key, e.getMessage())
            return checkMemoryRateLimit(key, limit, window)
        }
    }

    /**
     * Check rate limit using Redis
     */
    private boolean checkRedisRateLimit(String key, int limit, Duration window) {
        String countStr = redisTemplate.opsForValue().get(key)
        int currentCount = countStr ? Integer.parseInt(countStr) : 0
        
        if (currentCount >= limit) {
            log.debug("Rate limit exceeded for key: {} (current: {}, limit: {})", key, currentCount, limit)
            return false
        }
        
        return true
    }

    /**
     * Check rate limit using in-memory storage
     */
    private boolean checkMemoryRateLimit(String key, int limit, Duration window) {
        long currentTime = System.currentTimeMillis()
        RateLimitInfo info = memoryLimits.get(key)
        
        if (info == null) {
            return true
        }
        
        // Clean up expired entries
        if (currentTime - info.windowStart > window.toMillis()) {
            memoryLimits.remove(key)
            return true
        }
        
        return info.count < limit
    }

    /**
     * Record a request using Redis with memory fallback
     */
    private void recordRequest(String key, Duration window) {
        try {
            recordRedisRequest(key, window)
        } catch (Exception e) {
            log.debug("Failed to record request in Redis for key {}, using memory: {}", key, e.getMessage())
            recordMemoryRequest(key, window)
        }
    }

    /**
     * Record a request using Redis
     */
    private void recordRedisRequest(String key, Duration window) {
        Long newCount = redisTemplate.opsForValue().increment(key)
        if (newCount == 1) {
            // Set expiration only for new keys - now uses correct window duration
            redisTemplate.expire(key, window)
        }
    }

    /**
     * Record a request using in-memory storage
     */
    private void recordMemoryRequest(String key, Duration window) {
        long currentTime = System.currentTimeMillis()
        memoryLimits.compute(key) { k, info ->
            if (info == null || (currentTime - info.windowStart) > window.toMillis()) {
                return new RateLimitInfo(windowStart: currentTime, count: 1)
            } else {
                info.count++
                return info
            }
        }
    }

    /**
     * Get rate limit status from memory
     */
    private RateLimitStatus getMemoryRateLimitStatus(String key, int limit, Duration window) {
        long currentTime = System.currentTimeMillis()
        RateLimitInfo info = memoryLimits.get(key)
        
        if (info == null || (currentTime - info.windowStart) > window.toMillis()) {
            return new RateLimitStatus(
                limit: limit,
                remaining: limit,
                resetTime: null
            )
        }
        
        return new RateLimitStatus(
            limit: limit,
            remaining: Math.max(0, limit - info.count),
            resetTime: info.windowStart + window.toMillis()
        )
    }

    /**
     * Clean up expired memory entries
     */
    void cleanupExpiredEntries() {
        long currentTime = System.currentTimeMillis()
        long expiredThreshold = currentTime - CONNECTION_WINDOW.toMillis()
        
        memoryLimits.entrySet().removeIf { entry ->
            entry.value.windowStart < expiredThreshold
        }
        
        log.debug("Cleaned up expired rate limit entries, remaining: {}", memoryLimits.size())
    }

    /**
     * Get current rate limiting statistics
     */
    Map<String, Object> getStatistics() {
        return [
            memoryEntries: memoryLimits.size(),
            configurations: [
                maxConnectionsPerIp: MAX_CONNECTIONS_PER_IP,
                maxConnectionsPerUser: MAX_CONNECTIONS_PER_USER,
                maxSubscriptionsPerSession: MAX_SUBSCRIPTIONS_PER_SESSION,
                maxMessagesPerMinute: MAX_MESSAGES_PER_MINUTE
            ],
            windows: [
                connectionWindow: CONNECTION_WINDOW.toString(),
                messageWindow: MESSAGE_WINDOW.toString(),
                subscriptionWindow: SUBSCRIPTION_WINDOW.toString()
            ]
        ]
    }

    /**
     * Rate limit information for memory storage
     */
    private static class RateLimitInfo {
        long windowStart
        int count
    }

    /**
     * Rate limit status response
     */
    static class RateLimitStatus {
        int limit
        int remaining
        Long resetTime
    }
}
