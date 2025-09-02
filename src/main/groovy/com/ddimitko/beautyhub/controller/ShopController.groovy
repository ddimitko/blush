package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.dto.ShopCreationRequest
import com.ddimitko.beautyhub.dto.ShopCreationResponse
import com.ddimitko.beautyhub.dto.ShopWithSubscriptionRequest
import com.ddimitko.beautyhub.dto.ShopWithSubscriptionResponse
import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.entity.Service
import com.ddimitko.beautyhub.enums.BusinessType
import com.ddimitko.beautyhub.repository.ServiceRepository
import com.ddimitko.beautyhub.repository.ShopRepository
import com.ddimitko.beautyhub.security.CustomUserPrincipal
import com.ddimitko.beautyhub.service.ShopService
import groovy.util.logging.Slf4j
import jakarta.validation.Valid
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile

import jakarta.servlet.http.HttpServletRequest

import java.io.File
import java.awt.Image
import java.awt.image.BufferedImage
import javax.imageio.ImageIO

@Slf4j
@RestController
@RequestMapping("/api/shops")
class ShopController {

    @Autowired
    private ShopService shopService

    @Autowired
    private ServiceRepository serviceRepository

    @Autowired
    private ShopRepository shopRepository

    @PostMapping
    @PreAuthorize("hasAnyRole('USER', 'OWNER', 'EMPLOYEE')")
    ResponseEntity<?> createShop(
            @Valid @RequestBody ShopCreationRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            log.debug("Shop creation request received for user: ${userPrincipal.getId()}")
            log.debug("Business types: ${request.businessTypes}, Terms accepted: ${request.termsAccepted}")

            ShopCreationResponse response = shopService.createShopWithResponse(userPrincipal.getId(), request)
            println("Shop creation successful: ${response}")
            return ResponseEntity.ok(response)
        } catch (IllegalArgumentException e) {
            println("IllegalArgumentException in shop creation: ${e.getMessage()}")
            e.printStackTrace()
            return ResponseEntity.badRequest().body([
                error: "Shop creation failed",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Shop creation failed: ${e.getMessage()}", e)
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body([
                error: "Shop creation failed",
                message: "An unexpected error occurred"
            ])
        }
    }

    @PostMapping("/with-subscription")
    @PreAuthorize("isAuthenticated()")
    ResponseEntity<?> createShopWithSubscription(
            @Valid @RequestBody ShopWithSubscriptionRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            ShopWithSubscriptionResponse response = shopService.createShopWithSubscription(userPrincipal.getId(), request)
            return ResponseEntity.ok(response)
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body([
                error: "Shop creation failed",
                message: e.getMessage()
            ])
        } catch (Exception e) {
            log.error("Shop creation failed: ${e.getMessage()}", e)
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body([
                error: "Shop creation failed",
                message: "An unexpected error occurred"
            ])
        }
    }

    @GetMapping("/{id}")
    ResponseEntity<?> getShop(@PathVariable("id") UUID id) {
        try {
            Shop shop = shopService.findById(id)
            return ResponseEntity.ok(shop)
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build()
        }
    }

    @GetMapping("/{id}/details")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getShopDetails(@PathVariable("id") UUID id, @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Allow shop owners to access their shop details regardless of subscription status
            Shop shop = shopService.findShopByIdWithOwnerCheck(id, userPrincipal.getId())
            // Force load business types and gallery since they might be lazy-loaded
            shop.businessTypes.size()
            if (shop.gallery) {
                shop.gallery.size()
            }
            return ResponseEntity.ok(shop)
        } catch (RuntimeException e) {
            log.warn("Shop details not found for id ${id} and user ${userPrincipal.getId()}: ${e.message}")
            return ResponseEntity.notFound().build()
        }
    }

    @GetMapping
    ResponseEntity<?> getShops(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "sortBy", defaultValue = "name") String sortBy,
            @RequestParam(value = "sortDir", defaultValue = "asc") String sortDir,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "city", required = false) String city,
            @RequestParam(value = "minRating", required = false) Double minRating,
            @RequestParam(value = "acceptsCard", required = false) Boolean acceptsCard,
            @RequestParam(value = "businessTypes", required = false) List<String> businessTypes) {

        Sort sort = sortDir.equalsIgnoreCase("desc") ?
            Sort.by(sortBy).descending() : Sort.by(sortBy).ascending()
        Pageable pageable = PageRequest.of(page, size, sort)

        Page<Shop> shops = shopService.searchShops(name, city, minRating, acceptsCard, businessTypes, pageable)
        return ResponseEntity.ok(shops)
    }

    @GetMapping("/by-type/{businessType}")
    ResponseEntity<?> getShopsByBusinessType(@PathVariable("businessType") BusinessType businessType) {
        try {
            List<Shop> shops = shopService.findPublishedShopsByBusinessType(businessType)
            return ResponseEntity.ok(shops)
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to fetch shops",
                message: e.getMessage()
            ])
        }
    }

    @GetMapping("/my-shops")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getMyShops(@AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            println("=== GET MY SHOPS DEBUG ===")
            println("User Principal: ${userPrincipal}")
            println("User ID: ${userPrincipal?.getId()}")
            println("User Authorities: ${userPrincipal?.getAuthorities()}")

            if (!userPrincipal) {
                log.warn("User principal is null in getMyShops")
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body([
                    error: "Authentication required",
                    message: "User not authenticated"
                ])
            }

            List<Shop> shops = shopService.findByOwnerId(userPrincipal.getId())
            println("Found ${shops.size()} shops for user ${userPrincipal.getId()}")
            return ResponseEntity.ok(shops)
        } catch (Exception e) {
            log.error("Error in getMyShops: ${e.class.name}: ${e.message}", e)
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body([
                error: "Internal server error",
                message: "An unexpected error occurred"
            ])
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> updateShop(
            @PathVariable("id") UUID id,
            @Valid @RequestBody ShopCreationRequest request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            Shop shop = shopService.findById(id)
            
            // Check if the authenticated user owns this shop
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body([
                    error: "Access denied",
                    message: "You can only update your own shops"
                ])
            }
            
            Shop updatedShop = shopService.updateShop(id, request)
            return ResponseEntity.ok(updatedShop)
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build()
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Shop update failed",
                message: e.getMessage()
            ])
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> deleteShop(
            @PathVariable("id") UUID id,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            Shop shop = shopService.findById(id)
            
            // Check if the authenticated user owns this shop
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body([
                    error: "Access denied",
                    message: "You can only delete your own shops"
                ])
            }
            
            shopService.deleteShop(id)
            return ResponseEntity.ok([
                message: "Shop deleted successfully"
            ])
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build()
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Shop deletion failed",
                message: e.getMessage()
            ])
        }
    }

    @GetMapping("/business-types")
    ResponseEntity<?> getBusinessTypes() {
        return ResponseEntity.ok(BusinessType.values().collect {
            [value: it.name(), displayName: it.getDisplayName()]
        })
    }

    /**
     * Get services for a specific shop
     */
    @GetMapping("/{shopId}/services")
    ResponseEntity<?> getShopServices(@PathVariable("shopId") UUID shopId) {
        try {
            Shop shop = shopService.findById(shopId)
            List<Service> services = serviceRepository.findByShopAndActiveTrue(shop)

            return ResponseEntity.ok([
                data: services.collect { service ->
                    [
                        id: service.id,
                        name: service.name,
                        description: service.description,
                        price: service.price,
                        durationMinutes: service.durationMinutes,
                        depositAmount: service.depositAmount,
                        category: service.category,
                        active: service.active,
                        bookingBufferMinutes: service.bookingBufferMinutes,
                        employeeId: service.employee?.id,
                        employeeName: service.employee?.fullName,
                        shopId: service.shop?.id,
                        shopName: service.shop?.name,
                        formattedPrice: service.formattedPrice,
                        formattedDuration: service.formattedDuration,
                        createdAt: service.createdAt
                    ]
                }
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to retrieve shop services",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Upload image to shop gallery
     */
    @PostMapping("/{shopId}/gallery")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> uploadGalleryImage(
            @PathVariable("shopId") UUID shopId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal,
            HttpServletRequest request) {
        try {
            log.info("🖼️ Gallery upload request for shop: ${shopId}, file: ${file?.originalFilename}, user: ${userPrincipal?.email}")
            log.info("🖼️ Request headers - User-Agent: ${request.getHeader('User-Agent')}, Origin: ${request.getHeader('Origin')}, X-Requested-With: ${request.getHeader('X-Requested-With')}")

            Shop shop = shopService.findById(shopId)
            if (!shop) {
                log.warn("🖼️ Shop not found: ${shopId}")
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body([
                    error: "Shop not found",
                    message: "Shop with the specified ID was not found"
                ])
            }

            // Check if the authenticated user owns this shop
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                log.warn("🖼️ Access denied - User ${userPrincipal.getId()} tried to upload to shop ${shopId} owned by ${shop.owner.id}")
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body([
                    error: "Access denied",
                    message: "You can only manage your own shop's gallery"
                ])
            }

            // Validate file
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body([
                    error: "No file provided"
                ])
            }

            // Validate file type
            String contentType = file.getContentType()
            if (!contentType?.startsWith("image/")) {
                return ResponseEntity.badRequest().body([
                    error: "Only image files are allowed"
                ])
            }

            // Validate file size (max 5MB)
            if (file.getSize() > 5 * 1024 * 1024) {
                return ResponseEntity.badRequest().body([
                    error: "File size must be less than 5MB"
                ])
            }

            // Check gallery limit (max 10 photos)
            if (shop.gallery && shop.gallery.size() >= 10) {
                return ResponseEntity.badRequest().body([
                    error: "Gallery limit reached. Maximum 10 photos allowed per shop."
                ])
            }

            // Enhanced file extension validation
            String originalFilename = file.getOriginalFilename()
            if (!originalFilename || originalFilename.trim().isEmpty()) {
                return ResponseEntity.badRequest().body([
                    error: "Invalid filename"
                ])
            }

            // Sanitize filename and validate extension
            String sanitizedFilename = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "")
            String extension = ""
            if (sanitizedFilename.contains('.')) {
                extension = sanitizedFilename.substring(sanitizedFilename.lastIndexOf('.')).toLowerCase()
            }

            // Only allow specific image extensions
            List<String> allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
            if (!allowedExtensions.contains(extension)) {
                return ResponseEntity.badRequest().body([
                    error: "Only JPG, JPEG, PNG, GIF, and WebP files are allowed"
                ])
            }

            // Generate secure filename with timestamp and shop ID
            String filename = "${System.currentTimeMillis()}${extension}"

            // Get the absolute path to the project root uploads directory with shop-specific folder
            String projectRoot = System.getProperty("user.dir")
            File uploadsDir = new File(projectRoot, "uploads")
            File shopsDir = new File(uploadsDir, "shops")

            // Prevent path traversal attacks
            String sanitizedShopId = shopId.toString().replaceAll("[^a-zA-Z0-9-]", "")
            File shopDir = new File(shopsDir, sanitizedShopId)

            println "=== FILE UPLOAD PATHS ==="
            println "Project root: ${projectRoot}"
            println "Shop dir: ${shopDir.absolutePath}"
            println "Filename: ${filename}"

            // Additional security: Ensure we're within the expected directory structure
            if (!shopDir.getCanonicalPath().startsWith(shopsDir.getCanonicalPath())) {
                return ResponseEntity.badRequest().body([
                    error: "Invalid upload path"
                ])
            }

            // Create directory structure if it doesn't exist
            if (!shopDir.exists()) {
                boolean created = shopDir.mkdirs()
                log.debug("Created shop directory: ${created}")
            }

            // Process and save optimized image
            File destinationFile = new File(shopDir, filename)
            log.debug("Saving file to: ${destinationFile.absolutePath}")

            try {
                // Read the original image
                BufferedImage originalImage = ImageIO.read(file.getInputStream())

                // Optimize image while maintaining aspect ratio and quality
                BufferedImage optimizedImage = optimizeImageForGallery(originalImage)

                // Save optimized image
                String formatName = extension.substring(1) // Remove the dot
                if (formatName.equals("jpg")) formatName = "jpeg"

                ImageIO.write(optimizedImage, formatName, destinationFile)
                println "Optimized gallery image saved successfully"
            } catch (Exception e) {
                println "Image optimization failed, saving original: ${e.getMessage()}"
                // Fallback to original file if optimization fails
                file.transferTo(destinationFile)
            }

            // Generate URL (assuming the uploads folder is served statically)
            String imageUrl = "/uploads/shops/${shopId}/${filename}"

            // Add to gallery
            if (!shop.gallery) {
                shop.gallery = []
            }
            shop.gallery.add(imageUrl)

            // If this is the first image, set it as thumbnail
            if (!shop.thumbnail) {
                shop.thumbnail = imageUrl
            }

            shopRepository.save(shop)

            log.info("🖼️ Gallery upload successful for shop ${shopId}, image: ${imageUrl}, total gallery count: ${shop.gallery.size()}")
            return ResponseEntity.ok([
                message: "Image uploaded successfully",
                imageUrl: imageUrl,
                galleryCount: shop.gallery.size()
            ])
        } catch (Exception e) {
            log.error("Gallery upload failed for shop ${shopId}: ${e.message}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to upload image",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Delete image from shop gallery
     */
    @DeleteMapping("/{shopId}/gallery")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> deleteGalleryImage(
            @PathVariable("shopId") UUID shopId,
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            Shop shop = shopService.findById(shopId)

            // Check if the authenticated user owns this shop
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only manage your own shop's gallery"
                ])
            }

            String imageUrl = request.get("imageUrl")
            if (!imageUrl) {
                return ResponseEntity.badRequest().body([
                    error: "Image URL is required"
                ])
            }

            // Validate that the image URL belongs to this shop
            if (!imageUrl.startsWith("/uploads/shops/${shopId}/")) {
                return ResponseEntity.badRequest().body([
                    error: "Invalid image URL for this shop"
                ])
            }

            if (shop.gallery?.remove(imageUrl)) {
                // Delete the physical file
                try {
                    String projectRoot = System.getProperty("user.dir")
                    String relativePath = imageUrl.substring("/uploads/".length()) // Remove /uploads/ prefix
                    File fileToDelete = new File(projectRoot, "uploads/${relativePath}")

                    if (fileToDelete.exists() && fileToDelete.isFile()) {
                        boolean deleted = fileToDelete.delete()
                        println "Physical file deletion: ${deleted} for ${fileToDelete.absolutePath}"
                    }
                } catch (Exception e) {
                    println "Failed to delete physical file: ${e.getMessage()}"
                    // Continue with database update even if file deletion fails
                }

                // If this was the thumbnail, set a new one or clear it
                if (shop.thumbnail == imageUrl) {
                    shop.thumbnail = shop.gallery?.isEmpty() ? null : shop.gallery[0]
                }

                shopRepository.save(shop)

                return ResponseEntity.ok([
                    message: "Image deleted successfully",
                    galleryCount: shop.gallery.size()
                ])
            } else {
                return ResponseEntity.badRequest().body([
                    error: "Image not found in gallery"
                ])
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to delete image",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Set shop thumbnail
     */
    @PutMapping("/{shopId}/thumbnail")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> setThumbnail(
            @PathVariable("shopId") UUID shopId,
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            Shop shop = shopService.findById(shopId)

            // Check if the authenticated user owns this shop
            if (!shop.owner.id.equals(userPrincipal.getId())) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only manage your own shop's gallery"
                ])
            }

            String imageUrl = request.get("imageUrl")
            if (!imageUrl) {
                return ResponseEntity.badRequest().body([
                    error: "Image URL is required"
                ])
            }

            // Validate that the image URL belongs to this shop
            if (!imageUrl.startsWith("/uploads/shops/${shopId}/")) {
                return ResponseEntity.badRequest().body([
                    error: "Invalid image URL for this shop"
                ])
            }

            if (!shop.gallery?.contains(imageUrl)) {
                return ResponseEntity.badRequest().body([
                    error: "Image must be in gallery to set as thumbnail"
                ])
            }

            shop.thumbnail = imageUrl
            shopRepository.save(shop)

            return ResponseEntity.ok([
                message: "Thumbnail updated successfully",
                thumbnail: shop.thumbnail
            ])
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to update thumbnail",
                message: e.getMessage()
            ])
        }
    }

    /**
     * Optimize image for gallery use while maintaining aspect ratio and quality
     * @param originalImage The original BufferedImage
     * @return Optimized BufferedImage
     */
    private BufferedImage optimizeImageForGallery(BufferedImage originalImage) {
        int originalWidth = originalImage.getWidth()
        int originalHeight = originalImage.getHeight()

        // Target size for gallery images (max 1200x800 for good quality without being too large)
        int maxWidth = 1200
        int maxHeight = 800

        // Calculate new dimensions while maintaining aspect ratio
        double widthRatio = (double) maxWidth / originalWidth
        double heightRatio = (double) maxHeight / originalHeight
        double ratio = Math.min(widthRatio, heightRatio)

        // Only resize if the image is larger than target
        if (ratio >= 1.0) {
            return originalImage
        }

        int newWidth = (int) (originalWidth * ratio)
        int newHeight = (int) (originalHeight * ratio)

        // Create optimized image with high quality scaling
        BufferedImage optimizedImage = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB)

        // Use high-quality scaling
        Image scaledImage = originalImage.getScaledInstance(newWidth, newHeight, Image.SCALE_SMOOTH)

        // Draw the scaled image
        optimizedImage.getGraphics().drawImage(scaledImage, 0, 0, null)
        optimizedImage.getGraphics().dispose()

        return optimizedImage
    }
}
