package com.ddimitko.beautyhub.config

import com.ddimitko.beautyhub.security.CustomUserDetailsService
import com.ddimitko.beautyhub.security.JwtAuthenticationFilter
import groovy.util.logging.Slf4j
import java.util.Arrays
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.env.Environment
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.dao.DaoAuthenticationProvider
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService
import org.springframework.security.oauth2.core.user.OAuth2User
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.AuthenticationSuccessHandler
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.security.web.csrf.CookieCsrfTokenRepository
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@Slf4j
class SecurityConfig {

    @Autowired
    private CustomUserDetailsService customUserDetailsService

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter

    @Autowired
    private com.ddimitko.beautyhub.security.RateLimitingFilter rateLimitingFilter

    @Autowired
    private Environment environment

    @Autowired(required = false)
    private OAuth2UserService<?, ?> oauth2UserService

    @Autowired(required = false)
    private AuthenticationSuccessHandler oauth2AuthenticationSuccessHandler

    @Value('${app.cors.allowed-origins}')
    private String allowedOrigins

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder()
    }



    @Bean
    DaoAuthenticationProvider daoAuthenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider()
        provider.setUserDetailsService(customUserDetailsService)
        provider.setPasswordEncoder(passwordEncoder())
        return provider
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager()
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, DaoAuthenticationProvider daoAuthenticationProvider) throws Exception {
        // Configure enhanced security for beauty platform with CSRF protection
        http = http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .ignoringRequestMatchers(
                    // Authentication endpoints (stateless JWT)
                    "/api/auth/login",
                    "/api/auth/register",
                    "/api/auth/refresh",
                    "/api/auth/refresh-current", // Current user token refresh (stateless JWT)
                    "/api/auth/logout", // Logout endpoint (stateless JWT)
                    "/api/auth/validate", // Token validation endpoint (stateless JWT)
                    "/api/auth/csrf", // CSRF token endpoint (must be accessible without CSRF token)
                    "/api/auth/oauth2/**", // OAuth2 endpoints

                    // Webhook endpoints (external services)
                    "/api/payments/webhook", // Stripe payment webhooks
                    "/api/subscriptions/webhook", // Stripe subscription webhooks
                    "/api/webhooks/**", // General webhook endpoints

                    // Public endpoints (no authentication required)
                    "/api/public/**", // Public endpoints
                    "/api/employee-invitations/**", // Employee invitation endpoints (public for unauthenticated users)
                    "/api/i18n/**", // Internationalization endpoints (public)

                    // Password reset endpoints (public, stateless)
                    "/api/auth/forgot-password", // Forgot password endpoint
                    "/api/auth/reset-password", // Reset password endpoint

                    // Guest appointment booking endpoints
                    "/api/appointments", // Guest appointment creation
                    "/api/appointments/available-slots", // Guest available slots checking
                    "/api/appointments/guest-appointments", // Guest appointment management
                    "/api/appointments/lock-slot", // Guest slot locking
                    "/api/appointments/unlock-slot", // Guest slot unlocking
                    "/api/payments/create-payment-intent", // Guest payment intent creation
                    "/api/payments/create-connect-payment-intent", // Guest Stripe Connect payment intent creation
                    "/api/payments/confirm-payment-intent", // Guest payment confirmation

                    // Stripe integration endpoints
                    "/api/subscriptions/setup-intent", // Shop creation setup intent
                    "/api/subscriptions/confirm-setup-and-create-shop", // Shop creation confirmation
                    "/api/stripe/connect/**", // Stripe Connect endpoints
                    "/api/stripe/tax/**", // Stripe Tax endpoints
                    "/api/stripe/publishable-key", // Public Stripe configuration

                    // User payment methods (Stripe integration for users)
                    "/api/user/payment-methods/**", // User payment methods management

                    // User favorites (authenticated user actions)
                    "/api/favorites/**", // User favorites management

                    // Public shop endpoints (no authentication required)
                    "/api/shops/search", // Public shop search
                    "/api/shops/business-types", // Public business types
                    "/api/shops/*/services", // Public shop services (wildcard pattern)
                    "/api/shops/*/ratings", // Public shop ratings (wildcard pattern)

                    // Guest review endpoints (public for guest users)
                    "/api/guest-reviews/**", // Guest review endpoints

                    // Public subscription plans (for shop creation)
                    "/api/subscription-plans", // Public subscription plans
                    "/api/subscription-plans/**", // Public subscription plan details

                    // Admin setup endpoints (public for initial setup)
                    "/api/admin/setup/**", // Admin setup endpoints

                    // Static file serving (public uploads)
                    "/uploads/**", // Direct upload access
                    "/api/uploads/**", // API upload access

                    // Monitoring endpoints (public for health checks)
                    "/actuator/**", // Spring Boot Actuator endpoints

                    // WebSocket endpoints
                    "/ws/**", // WebSocket endpoints
                    "/ws-notifications/**", // WebSocket notification endpoints
                    "/stomp/**", // STOMP endpoints

                    // Development/Test endpoints (only in dev/test profiles)
                    "/api/test/**", // Test endpoints
                    "/api/test-data/**", // Test data endpoints
                    "/api/websocket/**" // WebSocket test endpoints
                )
                .requireCsrfProtectionMatcher(request -> {
                    // Skip CSRF for mobile app requests (iOS/Android) that use JWT authentication
                    String userAgent = request.getHeader("User-Agent")
                    String origin = request.getHeader("Origin")
                    String xRequestedWith = request.getHeader("X-Requested-With")

                    // Check if this is a mobile app request
                    boolean isMobileApp = (userAgent != null && userAgent.contains("LunaraApp")) ||
                                         (origin != null && origin.startsWith("app://")) ||
                                         (xRequestedWith != null && xRequestedWith.equals("LunaraApp"))

                    if (isMobileApp) {
                        log.debug("🔒 CSRF: Skipping CSRF protection for mobile app request - User-Agent: ${userAgent}, Origin: ${origin}")
                        return false // Skip CSRF for mobile apps
                    }

                    // Apply CSRF protection for browser requests
                    String method = request.getMethod()
                    return !method.equals("GET") && !method.equals("HEAD") && !method.equals("TRACE") && !method.equals("OPTIONS")
                })
            )
            .headers(headers -> headers
                .frameOptions().deny()
                .contentTypeOptions().and()
                .httpStrictTransportSecurity(hstsConfig -> hstsConfig
                    .maxAgeInSeconds(31536000)
                    .includeSubDomains(true)
                    .preload(true)
                )
                .and()
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authenticationProvider(daoAuthenticationProvider)
            .authorizeHttpRequests(authz -> authz
                // Public endpoints
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/auth/oauth2/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/i18n/**").permitAll() // Internationalization endpoints
                .requestMatchers("/api/employee-invitations/**").permitAll() // Employee invitation endpoints (public for unauthenticated users)

                // OAuth2 endpoints
                .requestMatchers("/oauth2/**").permitAll()
                .requestMatchers("/login/oauth2/**").permitAll()
                .requestMatchers("/auth/oauth2/**").permitAll()
                // Development/Test endpoints (only in dev/test profiles)
                .requestMatchers("/api/test/**").access((authentication, context) ->
                    new org.springframework.security.authorization.AuthorizationDecision(isDevelopmentOrTest()))
                .requestMatchers("/api/test-data/**").access((authentication, context) ->
                    new org.springframework.security.authorization.AuthorizationDecision(isDevelopmentOrTest()))
                .requestMatchers("/api/websocket/**").access((authentication, context) ->
                    new org.springframework.security.authorization.AuthorizationDecision(isDevelopmentOrTest()))

                .requestMatchers("/ws/**").permitAll()
                .requestMatchers("/ws-notifications/**").permitAll()
                .requestMatchers("/stomp/**").permitAll()
                .requestMatchers("/notifications/**").permitAll()
                .requestMatchers("/api/shops/search").permitAll()
                .requestMatchers("/api/shops/business-types").permitAll()
                .requestMatchers("/api/shops/{id}/services").permitAll()
                .requestMatchers("/api/shops/{id}/ratings").permitAll()
                .requestMatchers("/api/ratings/shop/**").permitAll() // Public shop ratings endpoints
                .requestMatchers("/api/guest-reviews/**").permitAll() // Guest review endpoints
                .requestMatchers("/api/webhooks/**").permitAll()
                .requestMatchers("/api/subscriptions/webhook").permitAll() // Stripe subscription webhooks

                // Static file serving - uploads (avatars and shop images)
                .requestMatchers("/uploads/**").permitAll()
                .requestMatchers("/api/uploads/**").permitAll()

                // Appointment endpoints for guest users
                .requestMatchers("/api/appointments/available-slots").permitAll()
                .requestMatchers("/api/appointments/guest-appointments").permitAll()
                .requestMatchers("/api/appointments/lock-slot").permitAll()
                .requestMatchers("/api/appointments/unlock-slot").permitAll()
                .requestMatchers("/api/appointments").permitAll() // For guest appointment creation

                // Payment endpoints for guest users
                .requestMatchers("/api/payments/create-payment-intent").permitAll()
                .requestMatchers("/api/payments/create-connect-payment-intent").permitAll() // Stripe Connect payments
                .requestMatchers("/api/payments/confirm-payment-intent").permitAll()
                .requestMatchers("/api/payments/webhook").permitAll()

                // Stripe configuration endpoints (public for frontend initialization)
                .requestMatchers("/api/stripe/publishable-key").permitAll()

                // Subscription plans endpoints (public for shop creation)
                .requestMatchers("/api/subscription-plans").permitAll()
                .requestMatchers("/api/subscription-plans/**").permitAll()

                // Shop creation setup intent endpoints (for authenticated users during shop creation)
                .requestMatchers("/api/subscriptions/setup-intent").hasAnyAuthority("ROLE_USER", "ROLE_OWNER", "ROLE_EMPLOYEE")
                .requestMatchers("/api/subscriptions/confirm-setup-and-create-shop").hasAnyAuthority("ROLE_USER", "ROLE_OWNER", "ROLE_EMPLOYEE")

                // Subscription endpoints (for shop owners)
                .requestMatchers("/api/subscriptions/shops/**").hasRole("OWNER")

                // Admin setup endpoints (public for initial setup)
                .requestMatchers("/api/admin/setup/**").permitAll()

                // Actuator endpoints (for monitoring)
                .requestMatchers("/actuator/**").permitAll()

                // Admin endpoints (require ADMIN role)
                .requestMatchers("/api/admin/**").hasRole("ADMIN")

                // Owner endpoints
                .requestMatchers("/api/owner/**").hasRole("OWNER")

                // Employee endpoints
                .requestMatchers("/api/employee/**").hasRole("EMPLOYEE")

                // Employees management endpoints (for owners to manage employees)
                .requestMatchers("/api/employees/**").hasAnyAuthority("ROLE_OWNER", "ROLE_EMPLOYEE")

                // Notifications endpoints
                .requestMatchers("/api/notifications/**").hasAnyAuthority("ROLE_USER", "ROLE_OWNER", "ROLE_EMPLOYEE")

                // User endpoints
                .requestMatchers("/api/user/**").hasAnyAuthority("ROLE_USER", "ROLE_OWNER", "ROLE_EMPLOYEE")

                // Service endpoints
                .requestMatchers("/api/services/**").hasAnyAuthority("ROLE_OWNER", "ROLE_EMPLOYEE")
                .requestMatchers("/api/services").hasAnyAuthority("ROLE_OWNER", "ROLE_EMPLOYEE")

                // Public schedule endpoints for appointment booking
                .requestMatchers("/api/schedules/public/**").permitAll()

                // Schedule endpoints
                .requestMatchers("/api/schedules/**").hasAnyAuthority("ROLE_OWNER", "ROLE_EMPLOYEE")

                // All other requests need authentication
                .anyRequest().authenticated()
            )
            .headers(headers -> headers
                .frameOptions().deny()
                .contentTypeOptions().and()
                .httpStrictTransportSecurity(hstsConfig -> hstsConfig
                    .maxAgeInSeconds(31536000)
                    .includeSubDomains(true)
                    .preload(true)
                )
                .referrerPolicy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)
            )

        // Configure OAuth2 login if beans are available
        if (oauth2UserService && oauth2AuthenticationSuccessHandler) {
            http = http.oauth2Login(oauth2 -> oauth2
                .userInfoEndpoint(userInfo -> userInfo
                    .userService(oauth2UserService)
                )
                .successHandler(oauth2AuthenticationSuccessHandler)
                .failureUrl("/auth/oauth2/error")
            )
        }

        return http
            .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .build()
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration()

        // Parse configured origins
        List<String> configuredOrigins = Arrays.asList(allowedOrigins.split(","))

        // Add iOS app specific origins for development and production
        List<String> iosOrigins = Arrays.asList(
            "app://com.lunara.app",           // iOS app bundle identifier
            "app://com.lunara.LunaraApp",     // Alternative bundle identifier
            "capacitor://localhost",          // Capacitor framework
            "ionic://localhost",              // Ionic framework
            "https://localhost:8443",         // Development HTTPS endpoint
            "file://"                         // Local file access for iOS
        )

        // Combine all origins
        List<String> allOrigins = new ArrayList<>()
        allOrigins.addAll(configuredOrigins)
        allOrigins.addAll(iosOrigins)

        log.info("🌐 CORS Configuration - Allowed Origins: {}", allOrigins)

        configuration.setAllowedOriginPatterns(allOrigins)
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"))
        configuration.setAllowedHeaders(Arrays.asList("*"))
        configuration.setExposedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "X-Requested-With",
            "Accept",
            "Origin",
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers",
            "X-CSRF-TOKEN",
            "X-XSRF-TOKEN"  // Alternative CSRF header name
        ))
        configuration.setAllowCredentials(true)
        configuration.setMaxAge(3600L) // Cache preflight response for 1 hour

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource()
        source.registerCorsConfiguration("/**", configuration)
        return source
    }

    /**
     * Helper method to check if current profile is development or test
     */
    boolean isDevelopmentOrTest() {
        String[] activeProfiles = environment.getActiveProfiles()
        return activeProfiles.any { it in ['dev', 'development', 'test', 'local'] } ||
               activeProfiles.length == 0 // Default profile (development)
    }
}
