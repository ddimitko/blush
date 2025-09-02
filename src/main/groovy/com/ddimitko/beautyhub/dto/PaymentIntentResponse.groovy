package com.ddimitko.beautyhub.dto

import lombok.Data

@Data
class PaymentIntentResponse {

    String paymentIntentId
    String clientSecret
    BigDecimal amount
    String currency
    String status
    String paymentMethodId

    // Shop information
    String shopName
    String description
    String connectedAccountId

    // Tax information (if calculated)
    BigDecimal taxAmount
    BigDecimal taxRate
    BigDecimal totalAmount
    Boolean taxCalculated
    String taxCode
    String taxBehavior

    // Error information (if any)
    String errorMessage
    String errorCode
    
    boolean isSuccessful() {
        return status == "succeeded"
    }
    
    boolean requiresAction() {
        return status == "requires_action"
    }
    
    boolean requiresPaymentMethod() {
        return status == "requires_payment_method"
    }
}
