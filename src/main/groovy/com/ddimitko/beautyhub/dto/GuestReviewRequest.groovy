package com.ddimitko.beautyhub.dto

import groovy.transform.ToString
import jakarta.validation.constraints.*
import lombok.AllArgsConstructor
import lombok.Data
import lombok.NoArgsConstructor

@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString
class GuestReviewRequest {

    @NotNull(message = "Appointment ID is required")
    UUID appointmentId

    @NotBlank(message = "Guest email is required")
    @Email(message = "Guest email must be a valid email address")
    String guestEmail

    @NotNull(message = "Rating is required")
    @Min(value = 1, message = "Rating must be at least 1 star")
    @Max(value = 5, message = "Rating cannot exceed 5 stars")
    Integer stars

    @Size(max = 1000, message = "Comment cannot exceed 1000 characters")
    String comment

    Boolean anonymous = false

    // Optional image URL (if uploaded separately)
    String imageUrl

    // Optional: If guest wants to create an account during review
    Boolean createAccount = false

    // Account creation fields (only used if createAccount is true)
    @Size(min = 2, max = 50, message = "First name must be between 2 and 50 characters")
    String firstName

    @Size(min = 2, max = 50, message = "Last name must be between 2 and 50 characters")
    String lastName

    @Size(min = 8, message = "Password must be at least 8 characters long")
    String password

    @Pattern(regexp = "^\\+[1-9]\\d{1,14}\$", message = "Phone number must be in international format (e.g., +1234567890)")
    String phoneNumber
}
