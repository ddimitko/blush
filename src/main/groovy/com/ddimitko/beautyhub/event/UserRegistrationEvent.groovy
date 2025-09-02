package com.ddimitko.beautyhub.event

import com.ddimitko.beautyhub.entity.User
import org.springframework.context.ApplicationEvent

/**
 * Event published when a user successfully registers
 * Used to trigger welcome email sending after transaction commit
 */
class UserRegistrationEvent extends ApplicationEvent {
    
    private final User user
    
    UserRegistrationEvent(User user) {
        super(user)
        this.user = user
    }
    
    User getUser() {
        return user
    }
}
