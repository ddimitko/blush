package com.ddimitko.beautyhub.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import lombok.Data

@Data
class ConnectAccountRequest {
    @NotBlank(message = "Business name is required")
    String businessName

    @Email(message = "Valid email is required")
    @NotBlank(message = "Business email is required")
    String businessEmail

    @NotBlank(message = "Business phone is required")
    String businessPhone

    @NotBlank(message = "Business website is required")
    String businessWebsite

    @NotBlank(message = "Business address is required")
    String businessAddress

    @NotBlank(message = "Business city is required")
    String businessCity

    // State is optional for countries that don't have states (like Bulgaria)
    String businessState

    @NotBlank(message = "Business postal code is required")
    String businessPostalCode

    @NotBlank(message = "Business country is required")
    String businessCountry = "BG"

    // Business type and structure
    String businessType = "company" // individual or company
    String companyStructure // For companies: private_corporation, llc, partnership, etc.

    // Onboarding strategy
    String onboardingType = "incremental" // incremental or upfront

    // Capabilities requested
    List<String> requestedCapabilities = ["card_payments", "transfers"]

    // Service agreement type
    String serviceAgreement = "full" // full or recipient

    // Return URLs for onboarding (optional for API onboarding)
    String returnUrl
    String refreshUrl

    // Individual information (for individual business type)
    IndividualInfo individual

    // Company information (for company business type)
    CompanyInfo company

    // External account (bank details)
    ExternalAccountInfo externalAccount

    // Terms of Service acceptance
    TosAcceptanceInfo tosAcceptance

    // Compliance information
    ComplianceInfo compliance

    @Data
    static class IndividualInfo {
        @NotBlank(message = "First name is required")
        String firstName

        @NotBlank(message = "Last name is required")
        String lastName

        @Email(message = "Valid email is required")
        @NotBlank(message = "Email is required")
        String email

        @NotBlank(message = "Phone is required")
        String phone

        DateOfBirthInfo dateOfBirth
        AddressInfo address
        String ssn // Optional, country-dependent

        @Data
        static class DateOfBirthInfo {
            Integer day
            Integer month
            Integer year
        }

        @Data
        static class AddressInfo {
            @NotBlank(message = "Address line 1 is required")
            String line1
            String line2
            @NotBlank(message = "City is required")
            String city
            String state
            @NotBlank(message = "Postal code is required")
            String postalCode
            @NotBlank(message = "Country is required")
            String country
        }
    }

    @Data
    static class CompanyInfo {
        @NotBlank(message = "Company name is required")
        String name

        @NotBlank(message = "Phone is required")
        String phone

        String taxId // Optional, country-dependent
        AddressInfo address

        @Data
        static class AddressInfo {
            @NotBlank(message = "Address line 1 is required")
            String line1
            String line2
            @NotBlank(message = "City is required")
            String city
            String state
            @NotBlank(message = "Postal code is required")
            String postalCode
            @NotBlank(message = "Country is required")
            String country
        }
    }

    @Data
    static class ExternalAccountInfo {
        @NotBlank(message = "Account holder name is required")
        String accountHolderName

        @NotBlank(message = "Country is required")
        String country

        @NotBlank(message = "Currency is required")
        String currency

        String accountHolderType = "individual" // individual or company

        // IBAN (for EU countries)
        String iban

        // US/CA bank account details
        String routingNumber
        String accountNumber

        // UK bank account details
        String sortCode

        // Australian bank account details
        String bsbNumber

        // Canadian bank account details
        String institutionNumber
        String transitNumber
    }

    @Data
    static class TosAcceptanceInfo {
        Long date
        String ip
        String userAgent
    }

    @Data
    static class ComplianceInfo {
        Boolean legalComplianceDeclaration = false
        String vatRegistrationStatus = "not_required" // not_required, registered, will_register
        String vatNumber
        String vatCountry
        Boolean invoicingCustomers = false
        Boolean incomeReporting = false
        Boolean dac7Compliance = false
        Boolean refundsDisputes = false
    }
}
