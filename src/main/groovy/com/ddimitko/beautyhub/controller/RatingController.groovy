package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.entity.Rating
import com.ddimitko.beautyhub.security.CustomUserPrincipal
import com.ddimitko.beautyhub.service.RatingService
import groovy.util.logging.Slf4j
import jakarta.validation.Valid
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotNull
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile

@Slf4j
@RestController
@RequestMapping("/api/ratings")
@CrossOrigin(origins = "*", maxAge = 3600)
class RatingController {

    @Autowired
    private RatingService ratingService

    /**
     * Create a new rating for an appointment
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> createRating(
            @Valid @RequestBody CreateRatingRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            Rating rating = ratingService.createRating(
                request.appointmentId,
                userPrincipal.getId(),
                request.stars,
                request.comment,
                request.anonymous
            )

            return ResponseEntity.ok([
                message: "Rating created successfully",
                rating: convertToResponse(rating)
            ])
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Invalid request",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Failed to create rating", e)
            return ResponseEntity.internalServerError().body([
                error: "Failed to create rating",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Create a new rating with image upload for an appointment
     */
    @PostMapping("/with-image")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> createRatingWithImage(
            @RequestParam("appointmentId") UUID appointmentId,
            @RequestParam("stars") Integer stars,
            @RequestParam(value = "comment", required = false) String comment,
            @RequestParam(value = "anonymous", defaultValue = "false") Boolean anonymous,
            @RequestParam(value = "image", required = false) MultipartFile image,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            Rating rating = ratingService.createRatingWithImage(
                appointmentId,
                userPrincipal.getId(),
                stars,
                comment,
                anonymous,
                image
            )

            return ResponseEntity.ok([
                message: "Rating created successfully",
                rating: convertToResponse(rating)
            ])
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Invalid request",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Failed to create rating with image", e)
            return ResponseEntity.internalServerError().body([
                error: "Failed to create rating",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Get rating for a specific appointment
     */
    @GetMapping("/appointment/{appointmentId}")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> getRatingByAppointment(
            @PathVariable("appointmentId") UUID appointmentId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            Optional<Rating> ratingOpt = ratingService.getRatingByAppointment(appointmentId)
            
            if (ratingOpt.isPresent()) {
                return ResponseEntity.ok([
                    rating: convertToResponse(ratingOpt.get())
                ])
            } else {
                return ResponseEntity.ok([
                    rating: null,
                    canRate: ratingService.canRateAppointment(appointmentId, userPrincipal.getId())
                ])
            }
        } catch (Exception e) {
            log.error("Failed to get rating for appointment ${appointmentId}", e)
            return ResponseEntity.internalServerError().body([
                error: "Failed to get rating",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Get all ratings for a shop
     */
    @GetMapping("/shop/{shopId}")
    ResponseEntity<?> getShopRatings(
            @PathVariable("shopId") UUID shopId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending())
            Page<Rating> ratings = ratingService.getShopRatings(shopId, pageable)

            return ResponseEntity.ok([
                ratings: ratings.content.collect { convertToResponse(it) },
                totalElements: ratings.totalElements,
                totalPages: ratings.totalPages,
                currentPage: page,
                size: size
            ])
        } catch (Exception e) {
            log.error("Failed to get shop ratings for shop ${shopId}", e)
            return ResponseEntity.internalServerError().body([
                error: "Failed to get shop ratings",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Get shop rating statistics
     */
    @GetMapping("/shop/{shopId}/stats")
    ResponseEntity<?> getShopRatingStats(@PathVariable("shopId") UUID shopId) {
        try {
            Map<String, Object> stats = ratingService.getShopRatingStats(shopId)
            return ResponseEntity.ok(stats)
        } catch (Exception e) {
            log.error("Failed to get shop rating stats for shop ${shopId}", e)
            return ResponseEntity.internalServerError().body([
                error: "Failed to get rating statistics",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Get user's ratings
     */
    @GetMapping("/my-ratings")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYEE', 'OWNER')")
    ResponseEntity<?> getUserRatings(@AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            List<Rating> ratings = ratingService.getUserRatings(userPrincipal.getId())
            
            return ResponseEntity.ok([
                ratings: ratings.collect { convertToResponse(it) }
            ])
        } catch (Exception e) {
            log.error("Failed to get user ratings for user ${userPrincipal.getId()}", e)
            return ResponseEntity.internalServerError().body([
                error: "Failed to get your ratings",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Check if user can rate an appointment
     */
    @GetMapping("/can-rate/{appointmentId}")
    @PreAuthorize("hasAnyAuthority('ROLE_USER', 'ROLE_EMPLOYEE', 'ROLE_OWNER')")
    ResponseEntity<?> canRateAppointment(
            @PathVariable("appointmentId") UUID appointmentId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            boolean canRate = ratingService.canRateAppointment(appointmentId, userPrincipal.getId())
            return ResponseEntity.ok([canRate: canRate])
        } catch (Exception e) {
            log.error("Failed to check if user can rate appointment ${appointmentId}", e)
            return ResponseEntity.ok([canRate: false])
        }
    }

    /**
     * Convert Rating entity to response DTO
     */
    private Map<String, Object> convertToResponse(Rating rating) {
        return [
            id: rating.id,
            stars: rating.stars,
            comment: rating.comment,
            anonymous: rating.anonymous,
            imageUrl: rating.imageUrl,
            userName: rating.getUserName(),
            shopName: rating.getShopName(),
            employeeName: rating.getEmployeeName(),
            serviceName: rating.getServiceName(),
            appointmentId: rating.appointment?.id,
            createdAt: rating.createdAt,
            formattedDate: rating.getFormattedDate()
        ]
    }

    /**
     * Request DTO for creating ratings
     */
    static class CreateRatingRequest {
        @NotNull(message = "Appointment ID is required")
        UUID appointmentId

        @NotNull(message = "Rating is required")
        @Min(value = 1, message = "Rating must be at least 1 star")
        @Max(value = 5, message = "Rating cannot exceed 5 stars")
        Integer stars

        String comment

        Boolean anonymous = false
    }
}
