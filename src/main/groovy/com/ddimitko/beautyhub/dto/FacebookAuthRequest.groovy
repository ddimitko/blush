package com.ddimitko.beautyhub.dto

import jakarta.validation.constraints.NotBlank

class FacebookAuthRequest {
    
    @NotBlank(message = "Access token is required")
    String accessToken
    
    // Optional: User ID from Facebook (for additional validation)
    String userID
}
