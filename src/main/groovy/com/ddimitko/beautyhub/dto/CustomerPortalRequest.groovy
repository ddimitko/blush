package com.ddimitko.beautyhub.dto

import jakarta.validation.constraints.NotBlank
import lombok.Data

@Data
class CustomerPortalRequest {
    @NotBlank(message = "Return URL is required")
    String returnUrl
}
