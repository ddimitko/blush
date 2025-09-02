package com.ddimitko.beautyhub.service

import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.redis.core.RedisTemplate
import org.springframework.data.redis.core.script.DefaultRedisScript
import org.springframework.stereotype.Service
import org.springframework.scheduling.annotation.Scheduled

import jakarta.annotation.PostConstruct
import java.time.Duration
import java.time.Instant
import java.util.concurrent.TimeUnit
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

/**
 * Service for handling rate limiting across the application
 * Uses atomic Redis operations to prevent race conditions
 */
@Service
@Slf4j
class RateLimitingService {

    @Autowired
    private RedisTemplate<String, String> redisTemplate

    // Configurable rate limiting settings
    @Value('${rate.limit.auth.max-requests:5}')
    private int authMaxRequests

    @Value('${rate.limit.auth.window-minutes:15}')
    private int authWindowMinutes

    @Value('${rate.limit.api.max-requests:100}')
    private int apiMaxRequests

    @Value('${rate.limit.api.window-minutes:1}')
    private int apiWindowMinutes

    @Value('${rate.limit.payment.max-requests:3}')
    private int paymentMaxRequests

    @Value('${rate.limit.payment.window-minutes:5}')
    private int paymentWindowMinutes

    // In-memory fallback for Redis failures
    private final Map<String, RateLimitInfo> memoryFallback = new ConcurrentHashMap<>()
    private final AtomicLong memoryCleanupCounter = new AtomicLong(0)

    // Lua script for atomic rate limiting
    private static final String RATE_LIMIT_LUA_SCRIPT = """
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local current_time = tonumber(ARGV[3])

        local current = redis.call('GET', key)
        if current == false then
            current = 0
        else
            current = tonumber(current)
        end

        if current >= limit then
            local ttl = redis.call('TTL', key)
            return {0, current, ttl > 0 and ttl or window}
        else
            local newCount = redis.call('INCR', key)
            if newCount == 1 then
                redis.call('EXPIRE', key, window)
            end
            local ttl = redis.call('TTL', key)
            return {1, newCount, ttl > 0 and ttl or window}
        end
    """

    private DefaultRedisScript<List> rateLimitScript

    // Rate limiting configurations - will be populated from properties
    private Map<String, RateLimitConfig> rateLimits = new ConcurrentHashMap<>()

    @PostConstruct
    void initializeRateLimits() {
        // Initialize Redis script
        rateLimitScript = new DefaultRedisScript<>()
        rateLimitScript.setScriptText(RATE_LIMIT_LUA_SCRIPT)
        rateLimitScript.setResultType(List.class)

        // Initialize rate limiting configurations from properties
        rateLimits.putAll([
            // Authentication endpoints - configurable limits
            'auth': new RateLimitConfig(authMaxRequests, Duration.ofMinutes(authWindowMinutes)),
            'login': new RateLimitConfig(authMaxRequests, Duration.ofMinutes(authWindowMinutes)),
            'register': new RateLimitConfig(authMaxRequests - 2, Duration.ofMinutes(authWindowMinutes)),
            'password-reset': new RateLimitConfig(3, Duration.ofHours(1)),

            // File upload endpoints
            'file-upload': new RateLimitConfig(10, Duration.ofMinutes(10)),
            'avatar-upload': new RateLimitConfig(5, Duration.ofMinutes(10)),

            // API endpoints - configurable limits
            'api-general': new RateLimitConfig(apiMaxRequests, Duration.ofMinutes(apiWindowMinutes)),
            'api-search': new RateLimitConfig(30, Duration.ofMinutes(1)),

            // Appointment booking - moderate limits
            'appointment-create': new RateLimitConfig(5, Duration.ofMinutes(5)),
            'slot-lock': new RateLimitConfig(10, Duration.ofMinutes(1)),

            // Payment endpoints - configurable limits
            'payment': new RateLimitConfig(paymentMaxRequests, Duration.ofMinutes(paymentWindowMinutes)),

            // Admin endpoints - moderate limits
            'admin': new RateLimitConfig(50, Duration.ofMinutes(1)),

            // WebSocket connections
            'websocket-connect': new RateLimitConfig(5, Duration.ofMinutes(1))
        ])

        log.info("Rate limiting service initialized with {} configurations", rateLimits.size())
    }

    /**
     * Check if a request is allowed and record it atomically
     * Returns true if allowed, false if rate limited
     */
    boolean isRequestAllowed(String identifier, String endpoint, String clientIp = null) {
        try {
            RateLimitConfig config = getRateLimitConfig(endpoint)
            if (!config) {
                // No rate limit configured - allow request
                return true
            }

            String key = buildRateLimitKey(identifier, endpoint, clientIp)
            RateLimitResult result = checkAndRecordRateLimit(key, config)

            if (!result.allowed) {
                log.warn("Rate limit exceeded for key: {} (current: {}, max: {})",
                        key, result.currentCount, config.maxRequests)
            }

            return result.allowed

        } catch (Exception e) {
            log.error("Rate limiting check failed for endpoint '{}' and identifier '{}': {}",
                     endpoint, identifier, e.getMessage())
            // On error, try memory fallback
            return checkMemoryFallback(identifier, endpoint, clientIp)
        }
    }

    /**
     * Atomic rate limit check and record using Lua script
     */
    private RateLimitResult checkAndRecordRateLimit(String key, RateLimitConfig config) {
        try {
            List<String> keys = [key]
            Object[] args = [
                config.maxRequests.toString(),
                config.windowDuration.seconds.toString(),
                System.currentTimeMillis().toString()
            ]

            List<Long> result = redisTemplate.execute(rateLimitScript, keys, args)

            boolean allowed = result[0] == 1L
            long currentCount = result[1]
            long ttlSeconds = result[2]

            return new RateLimitResult(allowed, currentCount, ttlSeconds)

        } catch (Exception e) {
            log.error("Redis rate limiting failed for key '{}': {}", key, e.getMessage())
            throw e
        }
    }

    /**
     * Memory fallback for when Redis is unavailable
     */
    private boolean checkMemoryFallback(String identifier, String endpoint, String clientIp) {
        try {
            RateLimitConfig config = getRateLimitConfig(endpoint)
            if (!config) return true

            String key = buildRateLimitKey(identifier, endpoint, clientIp)
            long currentTime = System.currentTimeMillis()

            // Periodic cleanup every 1000 requests
            if (memoryCleanupCounter.incrementAndGet() % 1000 == 0) {
                cleanupExpiredMemoryEntries(currentTime)
            }

            RateLimitInfo info = memoryFallback.compute(key) { k, existing ->
                if (existing == null || (currentTime - existing.windowStart) > config.windowDuration.toMillis()) {
                    return new RateLimitInfo(currentTime, 1)
                } else if (existing.count >= config.maxRequests) {
                    return existing // Don't increment if at limit
                } else {
                    existing.count++
                    return existing
                }
            }

            boolean allowed = info.count <= config.maxRequests
            if (!allowed) {
                log.warn("Memory fallback rate limit exceeded for key: {} (current: {}, max: {})",
                        key, info.count, config.maxRequests)
            }

            return allowed

        } catch (Exception e) {
            log.error("Memory fallback rate limiting failed: {}", e.getMessage())
            return true // Allow on error
        }
    }

    /**
     * Get remaining requests for a given identifier and endpoint
     */
    RateLimitStatus getRateLimitStatus(String identifier, String endpoint, String clientIp = null) {
        try {
            RateLimitConfig config = getRateLimitConfig(endpoint)
            if (!config) {
                return new RateLimitStatus(true, -1, -1, null)
            }

            String key = buildRateLimitKey(identifier, endpoint, clientIp)
            String countStr = redisTemplate.opsForValue().get(key)
            int currentCount = countStr ? Integer.parseInt(countStr) : 0
            
            Long ttl = redisTemplate.getExpire(key, TimeUnit.SECONDS)
            Instant resetTime = ttl > 0 ? Instant.now().plusSeconds(ttl) : null
            
            int remaining = Math.max(0, config.maxRequests - currentCount)
            boolean allowed = currentCount < config.maxRequests
            
            return new RateLimitStatus(allowed, remaining, config.maxRequests, resetTime)
            
        } catch (Exception e) {
            log.error("Failed to get rate limit status: {}", e.getMessage())
            return new RateLimitStatus(true, -1, -1, null)
        }
    }

    /**
     * Record a successful request (increment counter)
     * @deprecated Use isRequestAllowed() instead which handles both check and record atomically
     */
    @Deprecated
    void recordRequest(String identifier, String endpoint, String clientIp = null) {
        // This method is now deprecated as the atomic isRequestAllowed() handles both check and record
        log.debug("recordRequest() called - consider using isRequestAllowed() for atomic operation")
    }

    /**
     * Cleanup expired entries from memory fallback
     */
    private void cleanupExpiredMemoryEntries(long currentTime) {
        try {
            Iterator<Map.Entry<String, RateLimitInfo>> iterator = memoryFallback.entrySet().iterator()
            int cleanedCount = 0

            while (iterator.hasNext()) {
                Map.Entry<String, RateLimitInfo> entry = iterator.next()
                RateLimitInfo info = entry.getValue()

                // Find the config for this key to get the correct window duration
                String key = entry.getKey()
                String endpoint = extractEndpointFromKey(key)
                RateLimitConfig config = getRateLimitConfig(endpoint)

                if (config && (currentTime - info.windowStart) > config.windowDuration.toMillis()) {
                    iterator.remove()
                    cleanedCount++
                }
            }

            if (cleanedCount > 0) {
                log.debug("Cleaned up {} expired memory fallback entries", cleanedCount)
            }

        } catch (Exception e) {
            log.error("Failed to cleanup expired memory entries: {}", e.getMessage())
        }
    }

    /**
     * Extract endpoint from rate limit key for cleanup purposes
     */
    private String extractEndpointFromKey(String key) {
        try {
            // Key format: "rate_limit:endpoint:user:id" or "rate_limit:endpoint:ip:address"
            String[] parts = key.split(":")
            return parts.length > 1 ? parts[1] : "api-general"
        } catch (Exception e) {
            return "api-general"
        }
    }

    /**
     * Scheduled cleanup of memory fallback entries
     */
    @Scheduled(fixedRate = 300000) // Every 5 minutes
    void scheduledMemoryCleanup() {
        if (!memoryFallback.isEmpty()) {
            long currentTime = System.currentTimeMillis()
            cleanupExpiredMemoryEntries(currentTime)
            log.debug("Scheduled memory cleanup completed. Current entries: {}", memoryFallback.size())
        }
    }

    /**
     * Reset rate limit for a specific identifier and endpoint (admin function)
     */
    void resetRateLimit(String identifier, String endpoint, String clientIp = null) {
        try {
            String key = buildRateLimitKey(identifier, endpoint, clientIp)
            redisTemplate.delete(key)
            log.info("Rate limit reset for key: {}", key)
        } catch (Exception e) {
            log.error("Failed to reset rate limit: {}", e.getMessage())
        }
    }

    /**
     * Get rate limit configuration for an endpoint
     */
    private RateLimitConfig getRateLimitConfig(String endpoint) {
        // Try exact match first
        RateLimitConfig config = rateLimits[endpoint]
        if (config) return config

        // Try pattern matching for common endpoints
        if (endpoint.startsWith('auth') || endpoint.contains('login') || endpoint.contains('register')) {
            return rateLimits['auth']
        }
        if (endpoint.contains('upload')) {
            return rateLimits['file-upload']
        }
        if (endpoint.contains('payment') || endpoint.contains('stripe')) {
            return rateLimits['payment']
        }
        if (endpoint.contains('admin')) {
            return rateLimits['admin']
        }
        if (endpoint.contains('appointment')) {
            return rateLimits['appointment-create']
        }
        if (endpoint.contains('search')) {
            return rateLimits['api-search']
        }

        // Default to general API limits
        return rateLimits['api-general']
    }

    /**
     * Build Redis key for rate limiting
     */
    private String buildRateLimitKey(String identifier, String endpoint, String clientIp) {
        StringBuilder keyBuilder = new StringBuilder("rate_limit:")
        keyBuilder.append(endpoint).append(":")
        
        if (identifier) {
            keyBuilder.append("user:").append(identifier)
        } else if (clientIp) {
            keyBuilder.append("ip:").append(clientIp)
        } else {
            keyBuilder.append("anonymous")
        }
        
        return keyBuilder.toString()
    }

    /**
     * Get current rate limiting statistics and health information
     */
    Map<String, Object> getStatistics() {
        return [
            configurations: rateLimits.collectEntries { k, v ->
                [k, [maxRequests: v.maxRequests, windowDuration: v.windowDuration.toString()]]
            },
            memoryFallback: [
                entries: memoryFallback.size(),
                cleanupCounter: memoryCleanupCounter.get()
            ],
            redisHealth: checkRedisHealth()
        ]
    }

    /**
     * Check Redis connectivity
     */
    private boolean checkRedisHealth() {
        try {
            redisTemplate.opsForValue().get("health-check")
            return true
        } catch (Exception e) {
            return false
        }
    }

    /**
     * Rate limit configuration class
     */
    static class RateLimitConfig {
        final int maxRequests
        final Duration windowDuration

        RateLimitConfig(int maxRequests, Duration windowDuration) {
            this.maxRequests = maxRequests
            this.windowDuration = windowDuration
        }
    }

    /**
     * Rate limit status class
     */
    static class RateLimitStatus {
        final boolean allowed
        final int remaining
        final int limit
        final Instant resetTime

        RateLimitStatus(boolean allowed, int remaining, int limit, Instant resetTime) {
            this.allowed = allowed
            this.remaining = remaining
            this.limit = limit
            this.resetTime = resetTime
        }

        Map<String, Object> toMap() {
            return [
                allowed: allowed,
                remaining: remaining,
                limit: limit,
                resetTime: resetTime?.toString()
            ]
        }
    }

    /**
     * Internal result class for atomic rate limiting operations
     */
    private static class RateLimitResult {
        final boolean allowed
        final long currentCount
        final long ttlSeconds

        RateLimitResult(boolean allowed, long currentCount, long ttlSeconds) {
            this.allowed = allowed
            this.currentCount = currentCount
            this.ttlSeconds = ttlSeconds
        }
    }

    /**
     * Memory fallback rate limit information
     */
    private static class RateLimitInfo {
        long windowStart
        int count

        RateLimitInfo(long windowStart, int count) {
            this.windowStart = windowStart
            this.count = count
        }
    }
}
