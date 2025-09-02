package com.ddimitko.beautyhub.dto

import com.ddimitko.beautyhub.validation.ValidPassword
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import lombok.Data

@Data
class RegisterRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    String email

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @ValidPassword
    String password

    @NotBlank(message = "First name is required")
    String firstName

    @NotBlank(message = "Last name is required")
    String lastName

    @NotBlank(message = "Phone number is required")
    String phone
}
