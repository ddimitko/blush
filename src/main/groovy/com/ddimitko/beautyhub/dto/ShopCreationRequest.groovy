package com.ddimitko.beautyhub.dto

import com.ddimitko.beautyhub.enums.BusinessType
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.AssertTrue
import lombok.Data

@Data
class ShopCreationRequest {
    @NotBlank(message = "Business name is required")
    String name

    String description

    @NotEmpty(message = "At least one business type is required")
    Set<BusinessType> businessTypes

    @NotBlank(message = "Address is required")
    String address

    @NotBlank(message = "City is required")
    String city

    String state

    @NotBlank(message = "Postal code is required")
    String postalCode

    @NotBlank(message = "Country is required")
    String country

    @Pattern(regexp = '^\\+?[1-9]\\d{1,14}$', message = "Invalid phone number format")
    String phone

    @Email(message = "Invalid email format")
    String email

    @Pattern(regexp = '^$|^(https?://)?(www\\.)?[a-zA-Z0-9-]+(\\.[a-zA-Z]{2,})+(/.*)?$', message = "Invalid website URL format")
    String website

    Boolean acceptsCardPayments = false

    @NotNull(message = "Terms acceptance is required")
    @AssertTrue(message = "You must accept the terms and conditions")
    Boolean termsAccepted = false

    // Geocoding data for proximity search
    Double latitude
    Double longitude
}
