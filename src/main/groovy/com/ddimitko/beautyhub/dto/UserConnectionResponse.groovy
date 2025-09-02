package com.ddimitko.beautyhub.dto

import java.time.LocalDateTime

class UserConnectionResponse {
    
    UUID id
    String provider
    String providerId
    String providerEmail
    String providerName
    LocalDateTime connectedAt
    
    UserConnectionResponse(UUID id, String provider, String providerId, String providerEmail, 
                          String providerName, LocalDateTime connectedAt) {
        this.id = id
        this.provider = provider
        this.providerId = providerId
        this.providerEmail = providerEmail
        this.providerName = providerName
        this.connectedAt = connectedAt
    }
}
