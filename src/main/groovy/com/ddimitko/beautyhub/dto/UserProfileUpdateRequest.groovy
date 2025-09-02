package com.ddimitko.beautyhub.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

class UserProfileUpdateRequest {
    
    @NotBlank(message = "First name is required")
    @Size(max = 100, message = "First name must not exceed 100 characters")
    String firstName

    @NotBlank(message = "Last name is required")
    @Size(max = 100, message = "Last name must not exceed 100 characters")
    String lastName

    @Size(max = 20, message = "Phone number must not exceed 20 characters")
    String phone

    @Size(max = 500, message = "Avatar URL must not exceed 500 characters")
    String avatar
}
