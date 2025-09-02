package com.ddimitko.beautyhub.dto

import lombok.Data

@Data
class PaymentMethodResponse {
    String id
    String type
    CardDetails card
    BillingDetails billingDetails
    Long created
    Boolean isDefault = false

    @Data
    static class CardDetails {
        String brand
        String last4
        Long expMonth
        Long expYear
    }

    @Data
    static class BillingDetails {
        String name
        String email
        Address address

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
}
