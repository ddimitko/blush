package com.ddimitko.beautyhub.dto

import lombok.Data

@Data
class ConnectAccountResponse {
    String accountId
    String stripeAccountId  // Added missing property
    String onboardingUrl
    String dashboardUrl
    String status
    String message
    Boolean onboardingCompleted = false
    Boolean chargesEnabled = false
    Boolean payoutsEnabled = false
    Boolean detailsSubmitted = false  // Added missing property
    Date createdAt = new Date()

    // Account details
    String businessType
    String country
    String email
    String defaultCurrency

    // Business profile
    Map<String, Object> businessProfile = [:]

    // Requirements and actions
    Boolean requiresAction = false
    List<String> currentlyDue = []
    List<String> eventuallyDue = []
    List<String> pastDue = []

    // Requirements for onboarding completion
    Requirements requirements

    // Account capabilities
    Map<String, String> capabilities = [:]

    // Verification errors
    List<VerificationError> errors = []

    @Data
    static class Requirements {
        List<String> currentlyDue = []
        List<String> eventuallyDue = []
        List<String> pastDue = []
        List<String> pendingVerification = []
        List<String> alternatives = []
        Long currentDeadline
        String disabledReason
    }

    @Data
    static class VerificationError {
        String code
        String reason
        String requirement
    }
}
