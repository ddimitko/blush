package com.ddimitko.beautyhub.dto

import jakarta.validation.constraints.Email
import lombok.Data

@Data
class ApiOnboardingUpdateRequest {
    // Business profile information
    BusinessProfile businessProfile
    
    // Company information (for business_type = company)
    Company company
    
    // Individual information (for business_type = individual)
    Individual individual
    
    // External account (bank account)
    ExternalAccount externalAccount
    
    // Terms of Service acceptance
    TosAcceptance tosAcceptance
    
    @Data
    static class BusinessProfile {
        String name
        String url
        String supportPhone
        @Email
        String supportEmail
        String productDescription
        String mcc // Merchant Category Code
    }
    
    @Data
    static class Company {
        String name
        String phone
        String taxId
        Address address
        Boolean taxIdProvided
        
        @Data
        static class Address {
            String line1
            String line2
            String city
            String state
            String postalCode
            String country
        }
    }
    
    @Data
    static class Individual {
        String firstName
        String lastName
        @Email
        String email
        String phone
        String idNumber
        String ssnLast4
        DateOfBirth dob
        Address address
        
        @Data
        static class DateOfBirth {
            Integer day
            Integer month
            Integer year
        }
        
        @Data
        static class Address {
            String line1
            String line2
            String city
            String state
            String postalCode
            String country
        }
    }
    
    @Data
    static class ExternalAccount {
        String country
        String currency
        String accountHolderName
        String accountHolderType // individual or company
        String routingNumber
        String accountNumber
    }
    
    @Data
    static class TosAcceptance {
        Long date // Unix timestamp
        String ip
        String userAgent
        String serviceAgreement = "full"
    }
}
