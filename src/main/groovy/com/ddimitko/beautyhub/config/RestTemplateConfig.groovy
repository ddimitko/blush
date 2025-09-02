package com.ddimitko.beautyhub.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.client.RestTemplate
import org.springframework.http.client.SimpleClientHttpRequestFactory

@Configuration
class RestTemplateConfig {

    @Bean
    RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory()
        factory.setConnectTimeout(10000) // 10 seconds
        factory.setReadTimeout(30000)    // 30 seconds
        
        return new RestTemplate(factory)
    }
}
