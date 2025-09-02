package com.ddimitko.beautyhub.config

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.type.TypeFactory
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.cache.CacheManager
import org.springframework.cache.annotation.CachingConfigurer
import org.springframework.cache.annotation.EnableCaching
import org.springframework.cache.interceptor.CacheErrorHandler
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Role
import org.springframework.beans.factory.config.BeanDefinition
import org.springframework.data.redis.cache.RedisCacheConfiguration
import org.springframework.data.redis.cache.RedisCacheManager
import org.springframework.data.redis.connection.RedisConnectionFactory
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer
import org.springframework.data.redis.serializer.RedisSerializationContext
import org.springframework.data.redis.serializer.StringRedisSerializer

import java.time.Duration

@Configuration
@EnableCaching
@Slf4j
class CacheConfig implements CachingConfigurer {

    @Autowired
    private ObjectMapper objectMapper

    /**
     * Redis-based cache manager with optimized configurations
     */
    @Bean
    @Role(BeanDefinition.ROLE_INFRASTRUCTURE)
    CacheManager cacheManager(RedisConnectionFactory redisConnectionFactory) {
        log.info("Configuring Redis cache manager with optimized settings")

        // Create a properly configured ObjectMapper for caching
        ObjectMapper cacheObjectMapper = objectMapper.copy()

        // Enable default typing with proper configuration to preserve type information
        cacheObjectMapper.activateDefaultTyping(
            cacheObjectMapper.getPolymorphicTypeValidator(),
            ObjectMapper.DefaultTyping.NON_FINAL
        )

        // Create JSON serializer with the enhanced ObjectMapper
        GenericJackson2JsonRedisSerializer jsonSerializer = new GenericJackson2JsonRedisSerializer(cacheObjectMapper)

        // Default cache configuration
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofHours(1)) // Default TTL: 1 hour
            .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(jsonSerializer))
            .disableCachingNullValues()

        // Specific cache configurations for different data types
        Map<String, RedisCacheConfiguration> cacheConfigurations = [
            // User data - cache for 30 minutes
            'users': defaultConfig.entryTtl(Duration.ofMinutes(30)),
            
            // Shop data - cache for 2 hours (changes less frequently)
            'shops': defaultConfig.entryTtl(Duration.ofHours(2)),

            // Shop lists - cache for 30 minutes (separate from individual shops)
            'shop-lists': defaultConfig.entryTtl(Duration.ofMinutes(30)),
            
            // Services - cache for 4 hours (relatively static)
            'services': defaultConfig.entryTtl(Duration.ofHours(4)),
            
            // Appointments - cache for 15 minutes (frequently changing)
            'appointments': defaultConfig.entryTtl(Duration.ofMinutes(15)),
            
            // Available slots - cache for 5 minutes (real-time data)
            'available-slots': defaultConfig.entryTtl(Duration.ofMinutes(5)),
            
            // Ratings and reviews - cache for 6 hours (rarely change)
            'ratings': defaultConfig.entryTtl(Duration.ofHours(6)),
            
            // Notifications - cache for 10 minutes
            'notifications': defaultConfig.entryTtl(Duration.ofMinutes(10)),
            
            // Employee schedules - cache for 1 hour
            'schedules': defaultConfig.entryTtl(Duration.ofHours(1)),
            
            // Stripe data - cache for 30 minutes (external API calls)
            'stripe-data': defaultConfig.entryTtl(Duration.ofMinutes(30)),
            
            // Search results - cache for 15 minutes
            'search-results': defaultConfig.entryTtl(Duration.ofMinutes(15)),
            
            // Analytics data - cache for 1 hour
            'analytics': defaultConfig.entryTtl(Duration.ofHours(1)),
            
            // Static data (categories, etc.) - cache for 24 hours
            'static-data': defaultConfig.entryTtl(Duration.ofHours(24))
        ]

        return RedisCacheManager.builder(redisConnectionFactory)
            .cacheDefaults(defaultConfig)
            .withInitialCacheConfigurations(cacheConfigurations)
            .transactionAware()
            .build()
    }

    /**
     * Cache key generator for consistent cache keys
     */
    @Bean
    org.springframework.cache.interceptor.KeyGenerator customKeyGenerator() {
        return { target, method, params ->
            StringBuilder sb = new StringBuilder()
            sb.append(target.getClass().getSimpleName())
            sb.append('.')
            sb.append(method.getName())
            sb.append(':')
            
            if (params != null && params.length > 0) {
                for (int i = 0; i < params.length; i++) {
                    if (i > 0) sb.append(',')
                    sb.append(params[i]?.toString() ?: 'null')
                }
            }
            
            return sb.toString()
        }
    }

    /**
     * Cache error handler to prevent cache failures from breaking the application
     */
    @Bean
    @Role(BeanDefinition.ROLE_INFRASTRUCTURE)
    org.springframework.cache.interceptor.CacheErrorHandler cacheErrorHandler() {
        return new org.springframework.cache.interceptor.SimpleCacheErrorHandler() {
            @Override
            void handleCacheGetError(RuntimeException exception, org.springframework.cache.Cache cache, Object key) {
                log.warn("Cache GET error for cache '{}' and key '{}': {}", cache.getName(), key, exception.getMessage())
                // Don't throw exception - let the method execute normally
            }

            @Override
            void handleCachePutError(RuntimeException exception, org.springframework.cache.Cache cache, Object key, Object value) {
                log.warn("Cache PUT error for cache '{}' and key '{}': {}", cache.getName(), key, exception.getMessage())
                // Don't throw exception - continue execution
            }

            @Override
            void handleCacheEvictError(RuntimeException exception, org.springframework.cache.Cache cache, Object key) {
                log.warn("Cache EVICT error for cache '{}' and key '{}': {}", cache.getName(), key, exception.getMessage())
                // Don't throw exception - continue execution
            }

            @Override
            void handleCacheClearError(RuntimeException exception, org.springframework.cache.Cache cache) {
                log.warn("Cache CLEAR error for cache '{}': {}", cache.getName(), exception.getMessage())
                // Don't throw exception - continue execution
            }
        }
    }

    /**
     * Implement CachingConfigurer interface to provide error handler
     */
    @Override
    CacheErrorHandler errorHandler() {
        return cacheErrorHandler()
    }
}
