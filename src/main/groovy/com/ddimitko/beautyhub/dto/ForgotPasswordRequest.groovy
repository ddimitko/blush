package com.ddimitko.beautyhub.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank

class ForgotPasswordRequest {
    
    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    String email
}
