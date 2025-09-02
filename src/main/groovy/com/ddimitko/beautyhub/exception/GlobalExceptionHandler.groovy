package com.ddimitko.beautyhub.exception

import com.ddimitko.beautyhub.service.MessageService
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ControllerAdvice
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.validation.FieldError
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.AuthenticationException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.dao.EmptyResultDataAccessException
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException
import jakarta.persistence.EntityNotFoundException
import jakarta.validation.ConstraintViolationException

@ControllerAdvice
@Slf4j
class GlobalExceptionHandler {

    @Autowired
    private MessageService messageService

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = [:]
        ex.getBindingResult().getAllErrors().each { error ->
            String fieldName = ((FieldError) error).getField()
            String errorMessage = error.getDefaultMessage()
            errors[fieldName] = errorMessage
        }

        // Debug logging
        log.error("Validation failed: {}", errors)

        // Get the first error message for the main message
        String firstErrorMessage = errors.values().iterator().next()

        return ResponseEntity.badRequest().body([
            error: messageService.getErrorMessage("validation.failed", "Validation failed"),
            message: firstErrorMessage,
            details: errors
        ])
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<?> handleIllegalArgumentException(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body([
            error: messageService.getErrorMessage("invalid.request", "Invalid request"),
            message: ex.getMessage()
        ])
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<?> handleHttpMessageNotReadableException(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest().body([
            error: messageService.getErrorMessage("invalid.request.body", "Invalid request body"),
            message: messageService.getMessage("error.request.body.malformed", "Required request body is missing or malformed")
        ])
    }

    @ExceptionHandler(AuthenticationCredentialsNotFoundException.class)
    ResponseEntity<?> handleAuthenticationCredentialsNotFoundException(AuthenticationCredentialsNotFoundException ex) {
        log.warn("Authentication credentials not found: ${ex.message}")
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body([
            error: messageService.getErrorMessage("auth.required", "Authentication required"),
            message: messageService.getMessage("error.auth.credentials.required", "Please provide valid authentication credentials")
        ])
    }

    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<?> handleAuthenticationException(AuthenticationException ex) {
        log.warn("Authentication failed: ${ex.message}")
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body([
            error: messageService.getErrorMessage("auth.failed", "Authentication failed"),
            message: messageService.getMessage("error.auth.invalid.credentials", "Invalid authentication credentials")
        ])
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<?> handleAccessDeniedException(AccessDeniedException ex) {
        log.warn("Access denied: ${ex.message}")

        // Get current authentication for debugging
        def authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication()
        def authorities = authentication?.getAuthorities()?.collect { it.getAuthority() } ?: []
        def principal = authentication?.getPrincipal()

        log.warn("DEBUG: Access denied for user: ${principal?.class?.simpleName}")
        log.warn("DEBUG: User authorities: ${authorities}")
        log.warn("DEBUG: Exception details: ${ex.message}")

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body([
            error: messageService.getErrorMessage("access.denied", "Access denied"),
            message: messageService.getMessage("error.auth.forbidden", "You do not have permission to access this resource"),
            debug: [
                userType: principal?.class?.simpleName,
                authorities: authorities,
                exceptionMessage: ex.message
            ]
        ])
    }

    @ExceptionHandler(EntityNotFoundException.class)
    ResponseEntity<?> handleEntityNotFoundException(EntityNotFoundException ex) {
        log.warn("Entity not found: ${ex.message}")
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body([
            error: messageService.getErrorMessage("entity.not.found", "Resource not found"),
            message: ex.getMessage() ?: messageService.getMessage("error.resource.not.found", "The requested resource was not found")
        ])
    }

    @ExceptionHandler(EmptyResultDataAccessException.class)
    ResponseEntity<?> handleEmptyResultDataAccessException(EmptyResultDataAccessException ex) {
        log.warn("Empty result data access: ${ex.message}")
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body([
            error: messageService.getErrorMessage("entity.not.found", "Resource not found"),
            message: messageService.getMessage("error.resource.not.found", "The requested resource was not found")
        ])
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<?> handleDataIntegrityViolationException(DataIntegrityViolationException ex) {
        log.warn("Data integrity violation: ${ex.message}")
        return ResponseEntity.status(HttpStatus.CONFLICT).body([
            error: messageService.getErrorMessage("data.integrity.violation", "Data integrity violation"),
            message: messageService.getMessage("error.data.conflict", "The operation conflicts with existing data")
        ])
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<?> handleConstraintViolationException(ConstraintViolationException ex) {
        log.warn("Constraint violation: ${ex.message}")
        Map<String, String> errors = [:]
        ex.getConstraintViolations().each { violation ->
            String fieldName = violation.getPropertyPath().toString()
            String errorMessage = violation.getMessage()
            errors[fieldName] = errorMessage
        }

        return ResponseEntity.badRequest().body([
            error: messageService.getErrorMessage("validation.failed", "Validation failed"),
            message: messageService.getMessage("error.validation.constraint", "Validation constraints were not met"),
            details: errors
        ])
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<?> handleMethodArgumentTypeMismatchException(MethodArgumentTypeMismatchException ex) {
        log.warn("Method argument type mismatch: ${ex.message}")
        return ResponseEntity.badRequest().body([
            error: messageService.getErrorMessage("invalid.parameter", "Invalid parameter"),
            message: messageService.getMessage("error.parameter.type", "Invalid parameter type: ${ex.getName()}")
        ])
    }

    @ExceptionHandler(RuntimeException.class)
    ResponseEntity<?> handleRuntimeException(RuntimeException ex) {
        // Check if this is actually a "not found" scenario based on message
        if (ex.message?.toLowerCase()?.contains("not found")) {
            log.warn("RuntimeException with 'not found' message treated as 404: ${ex.message}")
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body([
                error: messageService.getErrorMessage("entity.not.found", "Resource not found"),
                message: ex.getMessage()
            ])
        }

        // Check if this is an access denied scenario
        if (ex.message?.toLowerCase()?.contains("access denied") ||
            ex.message?.toLowerCase()?.contains("unauthorized") ||
            ex.message?.toLowerCase()?.contains("forbidden")) {
            log.warn("RuntimeException with access denied message treated as 403: ${ex.message}")
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body([
                error: messageService.getErrorMessage("access.denied", "Access denied"),
                message: ex.getMessage()
            ])
        }

        log.error("RuntimeException caught by GlobalExceptionHandler: ${ex.class.name}: ${ex.message}", ex)
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body([
            error: messageService.getErrorMessage("internal.server", "Internal server error"),
            message: messageService.getMessage("error.general", "An unexpected error occurred"),
            debug: [
                exceptionType: ex.class.name,
                exceptionMessage: ex.message
            ]
        ])
    }
}
