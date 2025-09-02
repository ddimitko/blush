package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.dto.GuestReviewRequest
import com.ddimitko.beautyhub.dto.GuestReviewResponse
import com.ddimitko.beautyhub.dto.RegisterRequest
import com.ddimitko.beautyhub.entity.Appointment
import com.ddimitko.beautyhub.entity.Rating
import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.repository.AppointmentRepository
import com.ddimitko.beautyhub.repository.RatingRepository
import com.ddimitko.beautyhub.repository.ShopRepository
import com.ddimitko.beautyhub.repository.UserRepository
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile

import java.awt.Image
import java.awt.image.BufferedImage
import java.io.File
import java.time.LocalDateTime
import javax.imageio.ImageIO

@Service
@Transactional
@Slf4j
class RatingService {

    @Autowired
    private RatingRepository ratingRepository

    @Autowired
    private AppointmentRepository appointmentRepository

    @Autowired
    private UserRepository userRepository

    @Autowired
    private ShopRepository shopRepository

    @Autowired
    private UserService userService

    /**
     * Create a new rating for an appointment
     */
    Rating createRating(UUID appointmentId, UUID userId, Integer stars, String comment, Boolean anonymous = false) {
        // Validate appointment exists and belongs to user
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow { new RuntimeException("Appointment not found") }

        User user = userRepository.findById(userId)
                .orElseThrow { new RuntimeException("User not found") }

        // Verify user is the customer of this appointment
        if (appointment.user?.id != userId) {
            throw new IllegalArgumentException("You can only rate your own appointments")
        }

        // Check if appointment is completed
        if (appointment.status.name() != 'COMPLETED') {
            throw new IllegalArgumentException("You can only rate completed appointments")
        }

        // Check if rating already exists for this appointment
        if (ratingRepository.existsByAppointment(appointment)) {
            throw new IllegalArgumentException("You have already rated this appointment")
        }

        // Create rating
        Rating rating = new Rating()
        rating.user = user
        rating.appointment = appointment
        rating.stars = stars
        rating.comment = comment?.trim()
        rating.anonymous = anonymous ?: false

        rating = ratingRepository.save(rating)

        // Update shop's rating average
        updateShopRating(appointment.shop)

        log.info("Created rating ${rating.id} for appointment ${appointmentId} by user ${userId}")
        return rating
    }

    /**
     * Create a new rating with image upload for an appointment
     */
    Rating createRatingWithImage(UUID appointmentId, UUID userId, Integer stars, String comment, Boolean anonymous = false, MultipartFile image = null) {
        // Validate appointment exists and belongs to user
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow { new RuntimeException("Appointment not found") }

        User user = userRepository.findById(userId)
                .orElseThrow { new RuntimeException("User not found") }

        // Verify user is the customer of this appointment
        if (appointment.user?.id != userId) {
            throw new IllegalArgumentException("You can only rate your own appointments")
        }

        // Check if appointment is completed
        if (appointment.status.name() != 'COMPLETED') {
            throw new IllegalArgumentException("You can only rate completed appointments")
        }

        // Check if rating already exists for this appointment
        if (ratingRepository.existsByAppointment(appointment)) {
            throw new IllegalArgumentException("You have already rated this appointment")
        }

        String imageUrl = null

        // Handle image upload if provided
        if (image && !image.isEmpty()) {
            imageUrl = uploadRatingImage(image, appointmentId)
        }

        // Create rating
        Rating rating = new Rating()
        rating.user = user
        rating.appointment = appointment
        rating.stars = stars
        rating.comment = comment?.trim()
        rating.anonymous = anonymous ?: false
        rating.imageUrl = imageUrl

        rating = ratingRepository.save(rating)

        // Update shop's rating average
        updateShopRating(appointment.shop)

        log.info("Created rating ${rating.id} for appointment ${appointmentId} by user ${userId} with image: ${imageUrl != null}")
        return rating
    }

    /**
     * Get rating for a specific appointment
     */
    Optional<Rating> getRatingByAppointment(UUID appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow { new RuntimeException("Appointment not found") }
        
        return ratingRepository.findByAppointment(appointment)
    }

    /**
     * Get all ratings for a shop
     */
    Page<Rating> getShopRatings(UUID shopId, Pageable pageable) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow { new RuntimeException("Shop not found") }
        
        return ratingRepository.findByShop(shop, pageable)
    }

    /**
     * Get all ratings by a user
     */
    List<Rating> getUserRatings(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow { new RuntimeException("User not found") }
        
        return ratingRepository.findByUser(user)
    }

    /**
     * Check if user can rate an appointment
     */
    boolean canRateAppointment(UUID appointmentId, UUID userId) {
        try {
            Appointment appointment = appointmentRepository.findById(appointmentId)
                    .orElse(null)
            
            if (!appointment) return false
            
            // Must be the customer of the appointment
            if (appointment.user?.id != userId) return false
            
            // Must be completed
            if (appointment.status.name() != 'COMPLETED') return false
            
            // Must not already have a rating
            return !ratingRepository.existsByAppointment(appointment)
            
        } catch (Exception e) {
            log.error("Error checking if user can rate appointment: ${e.message}")
            return false
        }
    }

    /**
     * Update shop's rating average based on all ratings
     */
    private void updateShopRating(Shop shop) {
        try {
            Double averageRating = ratingRepository.findAverageRatingByShop(shop)
            long ratingCount = ratingRepository.countByShop(shop)

            shop.ratingAverage = averageRating ?: 0.0
            shop.ratingCount = (int) ratingCount

            shopRepository.save(shop)
            
            log.info("Updated shop ${shop.id} rating: average=${shop.ratingAverage}, count=${shop.ratingCount}")
        } catch (Exception e) {
            log.error("Failed to update shop rating for shop ${shop.id}: ${e.message}")
        }
    }

    /**
     * Get shop rating statistics
     */
    Map<String, Object> getShopRatingStats(UUID shopId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow { new RuntimeException("Shop not found") }

        Double averageRating = ratingRepository.findAverageRatingByShop(shop) ?: 0.0
        long totalRatings = ratingRepository.countByShop(shop)

        Map<Integer, Long> starCounts = [:]
        for (int stars = 1; stars <= 5; stars++) {
            starCounts[stars] = ratingRepository.countByShopAndStars(shop, stars)
        }

        return [
            averageRating: averageRating,
            totalRatings: totalRatings,
            starCounts: starCounts,
            shopId: shopId
        ]
    }

    /**
     * Create a guest review and optionally create user account
     */
    GuestReviewResponse createGuestReview(GuestReviewRequest request) {
        // Validate appointment exists and is a guest appointment
        Appointment appointment = appointmentRepository.findById(request.appointmentId)
                .orElseThrow { new RuntimeException("Appointment not found") }

        // Verify this is a guest appointment
        if (appointment.user != null) {
            throw new IllegalArgumentException("This appointment is associated with a registered user account")
        }

        // Verify guest email matches
        if (!appointment.guestEmail?.equalsIgnoreCase(request.guestEmail)) {
            throw new IllegalArgumentException("Email does not match appointment records")
        }

        // Check if appointment is completed
        if (appointment.status.name() != 'COMPLETED') {
            throw new IllegalArgumentException("You can only rate completed appointments")
        }

        // Check if already reviewed by this guest
        if (hasGuestReviewedAppointment(request.appointmentId, request.guestEmail)) {
            throw new IllegalArgumentException("You have already rated this appointment")
        }

        User user = null
        boolean accountCreated = false

        // Handle account creation if requested
        if (request.createAccount && request.firstName && request.lastName && request.password) {
            try {
                // Check if user with this email already exists
                User existingUser = userRepository.findByEmailIgnoreCase(request.guestEmail)
                if (existingUser != null) {
                    throw new IllegalArgumentException("An account with this email already exists. Please log in to leave a review.")
                }

                // Create new user account
                RegisterRequest registerRequest = new RegisterRequest(
                    email: request.guestEmail,
                    firstName: request.firstName,
                    lastName: request.lastName,
                    password: request.password,
                    phoneNumber: request.phoneNumber
                )

                user = userService.registerUser(registerRequest)
                accountCreated = true

                // Link this appointment to the new user
                appointment.user = user
                appointmentRepository.save(appointment)

                log.info("Created new user account ${user.id} for guest review on appointment ${appointment.id}")
            } catch (Exception e) {
                log.error("Failed to create user account during guest review", e)
                // Continue with guest review even if account creation fails
                throw new IllegalArgumentException("Failed to create account: ${e.getMessage()}")
            }
        }

        // Create rating
        Rating rating = new Rating()
        rating.user = user // Will be null for guest reviews without account creation
        rating.appointment = appointment
        rating.stars = request.stars
        rating.comment = request.comment?.trim()
        rating.anonymous = request.anonymous ?: false
        rating.imageUrl = request.imageUrl?.trim()

        rating = ratingRepository.save(rating)

        // Update shop's rating average
        updateShopRating(appointment.shop)

        log.info("Created ${user ? 'user' : 'guest'} rating ${rating.id} for appointment ${request.appointmentId}")

        return new GuestReviewResponse(
            ratingId: rating.id,
            appointmentId: appointment.id,
            stars: rating.stars,
            comment: rating.comment,
            anonymous: rating.anonymous,
            imageUrl: rating.imageUrl,
            createdAt: rating.createdAt,
            shopName: appointment.shop?.name,
            serviceName: appointment.service?.name,
            employeeName: appointment.employee?.getFullName(),
            accountCreated: accountCreated,
            userId: user?.id,
            message: accountCreated ? "Review submitted and account created successfully!" : "Review submitted successfully!"
        )
    }

    /**
     * Check if guest can review an appointment
     */
    boolean canGuestReviewAppointment(UUID appointmentId, String guestEmail) {
        try {
            Appointment appointment = appointmentRepository.findById(appointmentId).orElse(null)
            if (!appointment) return false

            // Must be guest appointment
            if (appointment.user != null) return false

            // Email must match
            if (!appointment.guestEmail?.equalsIgnoreCase(guestEmail)) return false

            // Must be completed
            if (appointment.status.name() != 'COMPLETED') return false

            // Must not already be reviewed
            return !hasGuestReviewedAppointment(appointmentId, guestEmail)
        } catch (Exception e) {
            log.error("Error checking if guest can review appointment ${appointmentId}", e)
            return false
        }
    }

    /**
     * Check if guest has already reviewed an appointment
     */
    boolean hasGuestReviewedAppointment(UUID appointmentId, String guestEmail) {
        try {
            Appointment appointment = appointmentRepository.findById(appointmentId).orElse(null)
            if (!appointment) return false

            // Check if there's already a rating for this appointment
            return ratingRepository.existsByAppointment(appointment)
        } catch (Exception e) {
            log.error("Error checking if guest has reviewed appointment ${appointmentId}", e)
            return false
        }
    }

    /**
     * Upload rating image and return the URL
     */
    private String uploadRatingImage(MultipartFile file, UUID appointmentId) {
        try {
            // Validate file
            if (file.isEmpty()) {
                throw new IllegalArgumentException("No file provided")
            }

            // Validate file type
            String contentType = file.getContentType()
            if (!contentType?.startsWith("image/")) {
                throw new IllegalArgumentException("File must be an image")
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                throw new IllegalArgumentException("Image file size cannot exceed 5MB")
            }

            // Get file extension
            String originalFilename = file.originalFilename
            String extension = ""
            if (originalFilename?.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."))
            }

            // Validate extension
            List<String> allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"]
            if (!allowedExtensions.contains(extension.toLowerCase())) {
                throw new IllegalArgumentException("Invalid file type. Allowed types: JPG, JPEG, PNG, GIF, WEBP")
            }

            // Generate secure filename with timestamp and appointment ID
            String filename = "${System.currentTimeMillis()}_${appointmentId}${extension}"

            // Get the absolute path to the project root uploads directory
            String projectRoot = System.getProperty("user.dir")
            File uploadsDir = new File(projectRoot, "uploads")
            File ratingsDir = new File(uploadsDir, "ratings")

            // Create directories if they don't exist
            if (!ratingsDir.exists()) {
                ratingsDir.mkdirs()
            }

            File destinationFile = new File(ratingsDir, filename)

            // Resize image if it's too large (max 1200x1200)
            BufferedImage originalImage = ImageIO.read(file.inputStream)
            BufferedImage resizedImage = resizeImageIfNeeded(originalImage, 1200, 1200)

            // Save the image
            String formatName = extension.substring(1).toLowerCase()
            if (formatName == "jpg") formatName = "jpeg"
            ImageIO.write(resizedImage, formatName, destinationFile)

            // Generate URL
            String imageUrl = "/uploads/ratings/${filename}"

            log.info("Successfully uploaded rating image: ${imageUrl}")
            return imageUrl

        } catch (Exception e) {
            log.error("Failed to upload rating image for appointment ${appointmentId}: ${e.message}", e)
            throw new RuntimeException("Failed to upload image: ${e.message}")
        }
    }

    /**
     * Resize image if it exceeds the maximum dimensions
     */
    private BufferedImage resizeImageIfNeeded(BufferedImage originalImage, int maxWidth, int maxHeight) {
        int originalWidth = originalImage.width
        int originalHeight = originalImage.height

        // Check if resizing is needed
        if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
            return originalImage
        }

        // Calculate new dimensions maintaining aspect ratio
        double aspectRatio = (double) originalWidth / originalHeight
        int newWidth, newHeight

        if (originalWidth > originalHeight) {
            newWidth = maxWidth
            newHeight = (int) (maxWidth / aspectRatio)
        } else {
            newHeight = maxHeight
            newWidth = (int) (maxHeight * aspectRatio)
        }

        // Create resized image
        BufferedImage resizedImage = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB)
        Image scaledImage = originalImage.getScaledInstance(newWidth, newHeight, Image.SCALE_SMOOTH)
        resizedImage.graphics.drawImage(scaledImage, 0, 0, null)
        resizedImage.graphics.dispose()

        return resizedImage
    }
}
