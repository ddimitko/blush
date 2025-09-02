package com.ddimitko.beautyhub.config

import com.stripe.Stripe
import com.stripe.net.RequestOptions
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Primary

@Configuration
class StripeConfig {

    @Value('${stripe.api.secret-key}')
    private String secretKey

    @Value('${stripe.api.publishable-key}')
    private String publishableKey

    @Value('${stripe.api.version}')
    private String apiVersion

    @Value('${stripe.webhook.secret}')
    private String webhookSecret

    @Value('${stripe.connect.client-id}')
    private String connectClientId

    @Bean
    @Primary
    RequestOptions stripeRequestOptions() {
        Stripe.apiKey = secretKey
        // Set shorter timeout to 10 seconds for Stripe API calls to prevent hanging
        Stripe.setConnectTimeout(10 * 1000)
        Stripe.setReadTimeout(10 * 1000)
        return RequestOptions.builder()
                .setApiKey(secretKey)
                .build()
    }

    @Bean
    String stripePublishableKey() {
        return publishableKey
    }

    @Bean
    String stripeWebhookSecret() {
        return webhookSecret
    }

    @Bean
    String stripeConnectClientId() {
        return connectClientId
    }
}
