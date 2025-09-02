package com.ddimitko.beautyhub.config

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.type.TypeFactory
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.cache.annotation.EnableCaching
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.data.redis.cache.RedisCacheManager
import org.springframework.data.redis.connection.RedisConnectionFactory
import org.springframework.data.redis.core.RedisTemplate
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer
import org.springframework.data.redis.serializer.StringRedisSerializer

import java.time.Duration

@Configuration
@EnableCaching
class RedisConfig {

    @Autowired
    private ObjectMapper objectMapper

    @Bean
    RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>()
        template.setConnectionFactory(connectionFactory)

        // Use String serializer for keys
        template.setKeySerializer(new StringRedisSerializer())
        template.setHashKeySerializer(new StringRedisSerializer())

        // Create a properly configured ObjectMapper for Redis operations
        ObjectMapper redisObjectMapper = objectMapper.copy()

        // Enable default typing with proper configuration to preserve type information
        redisObjectMapper.activateDefaultTyping(
            redisObjectMapper.getPolymorphicTypeValidator(),
            ObjectMapper.DefaultTyping.NON_FINAL
        )

        // Use JSON serializer for values with the enhanced ObjectMapper
        GenericJackson2JsonRedisSerializer jsonSerializer = new GenericJackson2JsonRedisSerializer(redisObjectMapper)
        template.setValueSerializer(jsonSerializer)
        template.setHashValueSerializer(jsonSerializer)

        template.afterPropertiesSet()
        return template
    }

    // CacheManager is now configured in CacheConfig.groovy for better organization
}
