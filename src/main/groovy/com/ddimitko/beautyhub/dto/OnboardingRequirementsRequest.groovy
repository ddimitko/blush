package com.ddimitko.beautyhub.dto

import jakarta.validation.constraints.NotBlank
import lombok.Data

@Data
class OnboardingRequirementsRequest {
    @NotBlank(message = "Country is required")
    String country = "BG"
    
    @NotBlank(message = "Business type is required")
    String businessType = "company" // individual or company
    
    String companyStructure // For companies: private_corporation, llc, partnership, etc.
    
    List<String> requestedCapabilities = ["card_payments", "transfers"]
    
    String serviceAgreement = "full" // full or recipient
    
    String onboardingType = "incremental" // incremental or upfront
}
