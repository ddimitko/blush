package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.event.UserRegistrationEvent
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.event.EventListener
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service
import org.springframework.transaction.event.TransactionalEventListener
import org.springframework.transaction.event.TransactionPhase

@Service
@Slf4j
class UserStripeService {

    @Autowired
    private StripeCustomerService stripeCustomerService

    /**
     * Handle user registration event and create Stripe customer after transaction commit
     * This runs asynchronously after the user registration transaction is committed
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async("emailTaskExecutor")
    void handleUserRegistration(UserRegistrationEvent event) {
        try {
            log.info("Handling user registration event for Stripe customer creation: ${event.user.email}")
            
            // Create Stripe customer for the newly registered user
            String stripeCustomerId = stripeCustomerService.createStripeCustomer(event.user)
            
            log.info("Successfully created Stripe customer ${stripeCustomerId} for user: ${event.user.email}")
            
        } catch (Exception e) {
            log.error("Failed to create Stripe customer for user registration event: ${event.user.email}", e)
            // Don't rethrow the exception as this is an async operation
            // The user registration should still succeed even if Stripe customer creation fails
            // The customer can be created later when they try to add payment methods
        }
    }
}
