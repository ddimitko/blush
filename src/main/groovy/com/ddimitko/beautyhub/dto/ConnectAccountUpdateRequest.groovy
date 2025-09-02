package com.ddimitko.beautyhub.dto

import lombok.Data

@Data
class ConnectAccountUpdateRequest {
    // Business profile updates
    BusinessProfileUpdate businessProfile
    
    // Company information updates
    CompanyUpdate company
    
    // Individual information (for sole proprietors)
    IndividualUpdate individual
    
    @Data
    static class BusinessProfileUpdate {
        String name
        String url
        String supportPhone
        String supportEmail
        String productDescription
    }
    
    @Data
    static class CompanyUpdate {
        String name
        String phone
        String taxId
        AddressUpdate address
        
        @Data
        static class AddressUpdate {
            String line1
            String line2
            String city
            String state
            String postalCode
            String country = "US"
        }
    }
    
    @Data
    static class IndividualUpdate {
        String firstName
        String lastName
        String email
        String phone
        String ssnLast4
        DateOfBirthUpdate dob
        AddressUpdate address
        
        @Data
        static class DateOfBirthUpdate {
            Integer day
            Integer month
            Integer year
        }
        
        @Data
        static class AddressUpdate {
            String line1
            String line2
            String city
            String state
            String postalCode
            String country = "US"
        }
    }
}
