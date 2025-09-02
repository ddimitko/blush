package com.ddimitko.beautyhub.entity

import com.fasterxml.jackson.annotation.JsonIgnore
import groovy.transform.EqualsAndHashCode
import groovy.transform.ToString
import jakarta.persistence.*
import lombok.AllArgsConstructor
import lombok.Builder
import lombok.Data
import lombok.NoArgsConstructor
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp

import java.time.LocalDateTime

@Entity
@Table(name = "shop_stripe_details")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(excludes = ["shop"])
@ToString(excludes = ["shop"])
class ShopStripeDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    UUID id

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", nullable = false, unique = true)
    @JsonIgnore
    Shop shop

    // Stripe Connect Account Details
    @Column(name = "stripe_account_id")
    String stripeAccountId

    @Column(name = "stripe_onboarding_completed", nullable = false)
    Boolean stripeOnboardingCompleted = false

    // Stripe Subscription Details
    @Column(name = "subscription_id")
    String subscriptionId

    @Column(name = "stripe_customer_id")
    String stripeCustomerId

    @Column(name = "stripe_price_id")
    String stripePriceId

    // Metadata and tracking
    @Column(name = "last_stripe_sync")
    LocalDateTime lastStripeSync

    @Column(name = "stripe_webhook_endpoint_id")
    String stripeWebhookEndpointId

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt

    // Stripe Tax fields
    @Column(name = "tax_registration_id")
    String taxRegistrationId

    @Column(name = "tax_registration_country")
    String taxRegistrationCountry

    @Column(name = "tax_registration_status")
    String taxRegistrationStatus

    @Column(name = "tax_registration_date")
    LocalDateTime taxRegistrationDate

    @Column(name = "automatic_tax_enabled")
    Boolean automaticTaxEnabled = false

    @Column(name = "default_tax_code")
    String defaultTaxCode

    // Business information for tax purposes
    @Column(name = "business_registration_number")
    String businessRegistrationNumber

    @Column(name = "business_registration_country")
    String businessRegistrationCountry

    @Column(name = "vat_number")
    String vatNumber

    @Column(name = "vat_country")
    String vatCountry

    // TOS acceptance tracking (platform-side)
    @Column(name = "tos_accepted_date")
    LocalDateTime tosAcceptedDate

    @Column(name = "tos_accepted_ip")
    String tosAcceptedIp

    @Column(name = "tos_version")
    String tosVersion

    /**
     * Check if the shop can accept payments based on Stripe Connect setup
     */
    boolean canAcceptPayments() {
        return stripeAccountId && stripeOnboardingCompleted
    }

    /**
     * Check if subscription exists (actual status should be fetched from Stripe)
     */
    boolean hasSubscription() {
        return subscriptionId != null
    }

    /**
     * Check if tax registration is complete
     */
    boolean isTaxRegistrationComplete() {
        return taxRegistrationId && taxRegistrationStatus == "active"
    }

    /**
     * Check if automatic tax calculation is enabled
     */
    boolean isAutomaticTaxEnabled() {
        return automaticTaxEnabled && defaultTaxCode
    }

    /**
     * Check if Stripe Connect account is set up
     */
    boolean hasStripeAccount() {
        return stripeAccountId != null
    }

    /**
     * Check if onboarding is complete
     */
    boolean isOnboardingComplete() {
        return stripeOnboardingCompleted
    }
}
