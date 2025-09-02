package com.ddimitko.beautyhub.validation

import jakarta.validation.ConstraintValidator
import jakarta.validation.ConstraintValidatorContext

class PasswordValidator implements ConstraintValidator<ValidPassword, String> {

    @Override
    void initialize(ValidPassword constraintAnnotation) {
        // No initialization needed
    }

    @Override
    boolean isValid(String password, ConstraintValidatorContext context) {
        if (password == null || password.trim().isEmpty()) {
            return false
        }

        // Check minimum length (8 characters)
        if (password.length() < 8) {
            return false
        }

        // Check for at least one uppercase letter
        boolean hasUppercase = password.any { Character.isUpperCase(it as char) }
        
        // Check for at least one lowercase letter
        boolean hasLowercase = password.any { Character.isLowerCase(it as char) }

        return hasUppercase && hasLowercase
    }
}
