package com.ddimitko.beautyhub.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import lombok.Data
import org.springframework.web.multipart.MultipartFile

@Data
class ComprehensiveConnectAccountRequest {
    // Business Information
    @NotBlank(message = "Business name is required")
    String businessName

    @Email(message = "Valid email is required")
    @NotBlank(message = "Business email is required")
    String businessEmail

    @NotBlank(message = "Business phone is required")
    String businessPhone

    String businessWebsite // Optional field

    @NotBlank(message = "Business address is required")
    String businessAddress

    @NotBlank(message = "Business city is required")
    String businessCity

    @NotBlank(message = "Business state is required")
    String businessState

    @NotBlank(message = "Business postal code is required")
    String businessPostalCode

    String businessCountry = "BG"

    // Company Information
    @NotBlank(message = "Company tax ID is required")
    String companyTaxId

    // Representative Information
    @NotBlank(message = "Representative first name is required")
    String representativeFirstName

    @NotBlank(message = "Representative last name is required")
    String representativeLastName

    @Email(message = "Valid representative email is required")
    @NotBlank(message = "Representative email is required")
    String representativeEmail

    @NotBlank(message = "Representative phone is required")
    String representativePhone

    @NotBlank(message = "Representative date of birth is required")
    String representativeDateOfBirth

    @NotBlank(message = "Representative address is required")
    String representativeAddress

    @NotBlank(message = "Representative city is required")
    String representativeCity

    @NotBlank(message = "Representative state is required")
    String representativeState

    @NotBlank(message = "Representative postal code is required")
    String representativePostalCode

    String representativeCountry = "BG"

    @NotBlank(message = "Representative title is required")
    String representativeTitle

    // Bank Account Information
    @NotBlank(message = "Bank account holder name is required")
    String bankAccountHolderName

    @NotBlank(message = "Bank account number is required")
    String bankAccountNumber

    @NotBlank(message = "Bank routing number is required")
    String bankRoutingNumber

    String bankAccountType = "checking"

    // Document Files
    MultipartFile identityDocumentFront
    MultipartFile identityDocumentBack
    MultipartFile addressDocument

    // Terms of Service
    @NotNull(message = "Terms of service acceptance is required")
    Boolean tosAccepted

    // Return URLs for onboarding
    @NotBlank(message = "Return URL is required")
    String returnUrl

    @NotBlank(message = "Refresh URL is required")
    String refreshUrl
}
