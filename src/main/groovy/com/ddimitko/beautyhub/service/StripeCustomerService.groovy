package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.repository.UserRepository
import com.stripe.exception.StripeException
import com.stripe.model.Customer
import com.stripe.model.PaymentMethod
import com.stripe.param.CustomerCreateParams
import com.stripe.param.PaymentMethodListParams
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional
@Slf4j
class StripeCustomerService {

    @Autowired
    private UserRepository userRepository

    /**
     * Creates a Stripe customer for a user
     * This is called during user registration to enable payment methods management
     */
    String createStripeCustomer(User user) {
        try {
            log.info("Creating Stripe customer for user: ${user.id} (${user.email})")

            // Check if user already has a Stripe customer ID
            if (user.stripeCustomerId) {
                log.warn("User ${user.id} already has Stripe customer ID: ${user.stripeCustomerId}")
                return user.stripeCustomerId
            }

            // Create Stripe customer
            CustomerCreateParams customerParams = CustomerCreateParams.builder()
                .setName(user.getFullName())
                .setEmail(user.email)
                .setPhone(user.phone)
                .putMetadata("user_id", user.id.toString())
                .putMetadata("user_role", user.role.toString())
                .putMetadata("created_via", "user_registration")
                .build()

            Customer customer = Customer.create(customerParams)
            log.info("Successfully created Stripe customer: ${customer.id} for user: ${user.id}")

            // Update user with Stripe customer ID
            user.stripeCustomerId = customer.id
            userRepository.save(user)
            log.info("Updated user ${user.id} with Stripe customer ID: ${customer.id}")

            return customer.id

        } catch (StripeException e) {
            log.error("Failed to create Stripe customer for user ${user.id}: ${e.message}", e)
            throw new RuntimeException("Failed to create Stripe customer: ${e.message}", e)
        } catch (Exception e) {
            log.error("Unexpected error creating Stripe customer for user ${user.id}: ${e.message}", e)
            throw new RuntimeException("Unexpected error creating Stripe customer: ${e.message}", e)
        }
    }

    /**
     * Retrieves or creates a Stripe customer for a user
     */
    String getOrCreateStripeCustomer(User user) {
        if (user.stripeCustomerId) {
            try {
                // Verify the customer still exists in Stripe
                Customer.retrieve(user.stripeCustomerId)
                return user.stripeCustomerId
            } catch (StripeException e) {
                log.warn("Stripe customer ${user.stripeCustomerId} not found for user ${user.id}, creating new one")
                user.stripeCustomerId = null
                userRepository.save(user)
            }
        }

        return createStripeCustomer(user)
    }

    /**
     * Gets payment methods for a user with default payment method information from Stripe
     */
    List<Map<String, Object>> getUserPaymentMethods(UUID userId) {
        try {
            User user = userRepository.findById(userId)
                .orElseThrow { new RuntimeException("User not found with id: $userId") }

            if (!user.stripeCustomerId) {
                log.info("User ${userId} has no Stripe customer ID, returning empty payment methods list")
                return []
            }

            // Get customer to find default payment method
            Customer customer = Customer.retrieve(user.stripeCustomerId)
            String defaultPaymentMethodId = customer.getInvoiceSettings()?.getDefaultPaymentMethod()

            // Get all payment methods
            PaymentMethodListParams params = PaymentMethodListParams.builder()
                .setCustomer(user.stripeCustomerId)
                .setType(PaymentMethodListParams.Type.CARD)
                .build()

            List<PaymentMethod> paymentMethods = PaymentMethod.list(params).getData()

            return paymentMethods.collect { pm ->
                [
                    id: pm.id,
                    type: pm.type,
                    isDefault: pm.id == defaultPaymentMethodId,
                    card: pm.card ? [
                        brand: pm.card.brand,
                        last4: pm.card.last4,
                        expMonth: pm.card.expMonth,
                        expYear: pm.card.expYear,
                        fingerprint: pm.card.fingerprint // For duplicate detection
                    ] : null,
                    created: pm.created
                ]
            }

        } catch (StripeException e) {
            log.error("Failed to retrieve payment methods for user ${userId}: ${e.message}", e)
            throw new RuntimeException("Failed to retrieve payment methods: ${e.message}", e)
        }
    }

    /**
     * Detaches a payment method from a user
     */
    void detachPaymentMethod(UUID userId, String paymentMethodId) {
        try {
            User user = userRepository.findById(userId)
                .orElseThrow { new RuntimeException("User not found with id: $userId") }

            if (!user.stripeCustomerId) {
                throw new RuntimeException("User has no Stripe customer ID")
            }

            // Get customer to check if this is the default payment method
            Customer customer = Customer.retrieve(user.stripeCustomerId)
            String defaultPaymentMethodId = customer.getInvoiceSettings()?.getDefaultPaymentMethod()

            // Prevent removing the default payment method
            if (paymentMethodId == defaultPaymentMethodId) {
                throw new RuntimeException("Cannot remove default payment method. Please set another payment method as default first.")
            }

            PaymentMethod paymentMethod = PaymentMethod.retrieve(paymentMethodId)

            // Verify the payment method belongs to this user's customer
            if (paymentMethod.customer != user.stripeCustomerId) {
                throw new RuntimeException("Payment method does not belong to this user")
            }

            paymentMethod.detach()
            log.info("Successfully detached payment method ${paymentMethodId} from user ${userId}")

        } catch (StripeException e) {
            log.error("Failed to detach payment method ${paymentMethodId} for user ${userId}: ${e.message}", e)
            throw new RuntimeException("Failed to detach payment method: ${e.message}", e)
        }
    }

    /**
     * Sets a payment method as the default for a user in Stripe
     */
    void setDefaultPaymentMethod(UUID userId, String paymentMethodId) {
        try {
            User user = userRepository.findById(userId)
                .orElseThrow { new RuntimeException("User not found with id: $userId") }

            if (!user.stripeCustomerId) {
                throw new RuntimeException("User has no Stripe customer ID")
            }

            // Verify the payment method exists and belongs to this user
            PaymentMethod paymentMethod = PaymentMethod.retrieve(paymentMethodId)
            if (paymentMethod.customer != user.stripeCustomerId) {
                throw new RuntimeException("Payment method does not belong to this user")
            }

            // Update the customer's default payment method in Stripe
            Customer customer = Customer.retrieve(user.stripeCustomerId)
            Map<String, Object> updateParams = [
                invoice_settings: [
                    default_payment_method: paymentMethodId
                ]
            ]
            customer.update(updateParams)

            log.info("Set payment method ${paymentMethodId} as default for user ${userId} in Stripe")

        } catch (StripeException e) {
            log.error("Failed to set default payment method ${paymentMethodId} for user ${userId}: ${e.message}", e)
            throw new RuntimeException("Failed to set default payment method: ${e.message}", e)
        }
    }

    /**
     * Gets the default payment method for a user from Stripe
     */
    Map<String, Object> getDefaultPaymentMethod(UUID userId) {
        try {
            User user = userRepository.findById(userId)
                .orElseThrow { new RuntimeException("User not found with id: $userId") }

            if (!user.stripeCustomerId) {
                log.info("User ${userId} has no Stripe customer ID")
                return null
            }

            Customer customer = Customer.retrieve(user.stripeCustomerId)
            String defaultPaymentMethodId = customer.getInvoiceSettings()?.getDefaultPaymentMethod()

            if (!defaultPaymentMethodId) {
                log.info("User ${userId} has no default payment method set")
                return null
            }

            PaymentMethod paymentMethod = PaymentMethod.retrieve(defaultPaymentMethodId)

            return [
                id: paymentMethod.id,
                type: paymentMethod.type,
                isDefault: true,
                card: paymentMethod.card ? [
                    brand: paymentMethod.card.brand,
                    last4: paymentMethod.card.last4,
                    expMonth: paymentMethod.card.expMonth,
                    expYear: paymentMethod.card.expYear,
                    fingerprint: paymentMethod.card.fingerprint
                ] : null,
                created: paymentMethod.created
            ]

        } catch (StripeException e) {
            log.error("Failed to retrieve default payment method for user ${userId}: ${e.message}", e)
            return null
        }
    }

    /**
     * Checks if a card with the same fingerprint already exists for the user
     */
    boolean isDuplicateCard(UUID userId, String fingerprint) {
        try {
            List<Map<String, Object>> paymentMethods = getUserPaymentMethods(userId)

            return paymentMethods.any { pm ->
                pm.card?.fingerprint == fingerprint
            }

        } catch (Exception e) {
            log.error("Failed to check for duplicate cards for user ${userId}: ${e.message}", e)
            // Return false to allow the operation to continue if check fails
            return false
        }
    }

    /**
     * Updates a user's Stripe customer information
     */
    void updateStripeCustomer(User user) {
        try {
            if (!user.stripeCustomerId) {
                log.info("User ${user.id} has no Stripe customer ID, skipping update")
                return
            }

            Customer customer = Customer.retrieve(user.stripeCustomerId)
            
            Map<String, Object> updateParams = [:]
            
            if (customer.name != user.getFullName()) {
                updateParams.name = user.getFullName()
            }
            
            if (customer.email != user.email) {
                updateParams.email = user.email
            }
            
            if (customer.phone != user.phone) {
                updateParams.phone = user.phone
            }

            if (updateParams) {
                customer.update(updateParams)
                log.info("Updated Stripe customer ${user.stripeCustomerId} for user ${user.id}")
            }

        } catch (StripeException e) {
            log.error("Failed to update Stripe customer for user ${user.id}: ${e.message}", e)
            // Don't throw exception for update failures as it's not critical
        }
    }

    /**
     * Creates a setup intent for adding a new payment method
     */
    Map<String, Object> createSetupIntent(UUID userId) {
        try {
            User user = userRepository.findById(userId)
                .orElseThrow { new RuntimeException("User not found with id: $userId") }

            String customerId = getOrCreateStripeCustomer(user)

            com.stripe.param.SetupIntentCreateParams params = com.stripe.param.SetupIntentCreateParams.builder()
                .setCustomer(customerId)
                .addPaymentMethodType("card")
                .setUsage(com.stripe.param.SetupIntentCreateParams.Usage.OFF_SESSION)
                .putMetadata("user_id", userId.toString())
                .build()

            com.stripe.model.SetupIntent setupIntent = com.stripe.model.SetupIntent.create(params)

            return [
                setupIntentId: setupIntent.id,
                clientSecret: setupIntent.clientSecret,
                customerId: customerId
            ]

        } catch (StripeException e) {
            log.error("Failed to create setup intent for user ${userId}: ${e.message}", e)
            throw new RuntimeException("Failed to create setup intent: ${e.message}", e)
        }
    }
}
