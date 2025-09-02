package com.ddimitko.beautyhub.security

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Configuration
import org.springframework.messaging.simp.config.ChannelRegistration
import org.springframework.messaging.simp.config.MessageBrokerRegistry
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker
import org.springframework.web.socket.config.annotation.StompEndpointRegistry
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer
import org.springframework.beans.factory.annotation.Value
import groovy.util.logging.Slf4j

/**
 * Enhanced WebSocket security configuration with proper STOMP support
 */
@Configuration
@EnableWebSocketMessageBroker
@ConditionalOnProperty(name = "websocket.stomp.enabled", havingValue = "true", matchIfMissing = false)
@Slf4j
class WebSocketSecurityConfig implements WebSocketMessageBrokerConfigurer {

    @Autowired
    private WebSocketAuthInterceptor webSocketAuthInterceptor

    @Value('${app.websocket.allowed-origins}')
    private String allowedOrigins

    @Override
    void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable simple broker for topics
        config.enableSimpleBroker("/topic", "/queue")
        
        // Set application destination prefix
        config.setApplicationDestinationPrefixes("/app")
        
        // Set user destination prefix for private messages
        config.setUserDestinationPrefix("/user")
        
        // Configure heartbeat (25 seconds server heartbeat, 25 seconds client heartbeat)
        config.enableSimpleBroker("/topic", "/queue")
                .setHeartbeatValue([25000, 25000] as long[])
        
        log.info("✅ STOMP message broker configured with heartbeat: 25s")
    }

    @Override
    void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] origins = allowedOrigins.split(",")
        
        // Register STOMP endpoint with SockJS fallback
        registry.addEndpoint("/ws-stomp")
                .setAllowedOrigins(origins)
                .withSockJS()
                .setHeartbeatTime(25000)
                .setDisconnectDelay(5000)
        
        // Register native WebSocket endpoint
        registry.addEndpoint("/ws-stomp")
                .setAllowedOrigins(origins)
        
        log.info("✅ STOMP endpoints registered: /ws-stomp with origins: {}", origins)
    }

    @Override
    void configureClientInboundChannel(ChannelRegistration registration) {
        // Add authentication interceptor
        registration.interceptors(webSocketAuthInterceptor)
        
        // Configure thread pool for handling inbound messages
        registration.taskExecutor()
                .corePoolSize(4)
                .maxPoolSize(8)
                .keepAliveSeconds(60)
        
        log.info("✅ WebSocket inbound channel configured with authentication interceptor")
    }

    @Override
    void configureClientOutboundChannel(ChannelRegistration registration) {
        // Configure thread pool for handling outbound messages
        registration.taskExecutor()
                .corePoolSize(4)
                .maxPoolSize(8)
                .keepAliveSeconds(60)
        
        log.info("✅ WebSocket outbound channel configured")
    }
}
