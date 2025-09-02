package com.ddimitko.beautyhub.validation

import jakarta.validation.Constraint
import jakarta.validation.Payload

import java.lang.annotation.Documented
import java.lang.annotation.ElementType
import java.lang.annotation.Retention
import java.lang.annotation.RetentionPolicy
import java.lang.annotation.Target

@Documented
@Constraint(validatedBy = PasswordValidator.class)
@Target([ElementType.FIELD, ElementType.PARAMETER])
@Retention(RetentionPolicy.RUNTIME)
@interface ValidPassword {
    String message() default "Password must contain at least one uppercase letter, one lowercase letter, and be at least 8 characters long"
    Class<?>[] groups() default []
    Class<? extends Payload>[] payload() default []
}
