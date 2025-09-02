package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.dto.GuestReviewRequest
import com.ddimitko.beautyhub.dto.GuestReviewResponse
import com.ddimitko.beautyhub.entity.Appointment
import com.ddimitko.beautyhub.entity.Rating
import com.ddimitko.beautyhub.service.AppointmentService
import com.ddimitko.beautyhub.service.RatingService
import groovy.util.logging.Slf4j
import jakarta.validation.Valid
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@Slf4j
@RestController
@RequestMapping("/api/guest-reviews")
class GuestReviewController {

    @Autowired
    private RatingService ratingService

    @Autowired
    private AppointmentService appointmentService

    /**
     * Get guest appointment details for review (public endpoint)
     */
    @GetMapping("/appointment/{appointmentId}")
    ResponseEntity<?> getGuestAppointmentForReview(
            @PathVariable("appointmentId") UUID appointmentId,
            @RequestParam("email") String guestEmail) {
        try {
            Appointment appointment = appointmentService.findById(appointmentId)
            
            // Verify this is a guest appointment with matching email
            if (appointment.user != null) {
                return ResponseEntity.badRequest().body([
                    error: "Invalid request",
                    message: "This appointment is associated with a registered user account"
                ])
            }
            
            if (!appointment.guestEmail?.equalsIgnoreCase(guestEmail)) {
                return ResponseEntity.badRequest().body([
                    error: "Invalid request", 
                    message: "Email does not match appointment records"
                ])
            }
            
            // Check if appointment is completed
            if (appointment.status.name() != 'COMPLETED') {
                return ResponseEntity.badRequest().body([
                    error: "Invalid request",
                    message: "You can only review completed appointments"
                ])
            }
            
            // Check if already reviewed
            boolean alreadyReviewed = ratingService.hasGuestReviewedAppointment(appointmentId, guestEmail)
            if (alreadyReviewed) {
                return ResponseEntity.badRequest().body([
                    error: "Already reviewed",
                    message: "You have already reviewed this appointment"
                ])
            }
            
            return ResponseEntity.ok([
                appointment: [
                    id: appointment.id,
                    serviceName: appointment.service?.name,
                    shopName: appointment.shop?.name,
                    employeeName: appointment.employee?.getFullName(),
                    appointmentDateTime: appointment.appointmentDateTime,
                    guestName: appointment.getCustomerName()
                ],
                canReview: true
            ])
        } catch (Exception e) {
            log.error("Failed to get guest appointment for review ${appointmentId}", e)
            return ResponseEntity.badRequest().body([
                error: "Appointment not found",
                message: "Could not find appointment or invalid access"
            ])
        }
    }

    /**
     * Submit guest review (public endpoint)
     */
    @PostMapping
    ResponseEntity<?> submitGuestReview(@Valid @RequestBody GuestReviewRequest request) {
        try {
            GuestReviewResponse response = ratingService.createGuestReview(request)
            
            return ResponseEntity.ok([
                message: response.accountCreated ? 
                    "Review submitted successfully and account created! Please check your email to verify your account." :
                    "Review submitted successfully! Thank you for your feedback.",
                review: response
            ])
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Invalid request",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Failed to submit guest review for appointment ${request.appointmentId}", e)
            return ResponseEntity.internalServerError().body([
                error: "Failed to submit review",
                message: "An unexpected error occurred. Please try again later."
            ])
        }
    }

    /**
     * Check if guest can review appointment (public endpoint)
     */
    @GetMapping("/can-review/{appointmentId}")
    ResponseEntity<?> canGuestReviewAppointment(
            @PathVariable("appointmentId") UUID appointmentId,
            @RequestParam("email") String guestEmail) {
        try {
            boolean canReview = ratingService.canGuestReviewAppointment(appointmentId, guestEmail)
            return ResponseEntity.ok([canReview: canReview])
        } catch (Exception e) {
            log.error("Failed to check if guest can review appointment ${appointmentId}", e)
            return ResponseEntity.ok([canReview: false])
        }
    }
}
