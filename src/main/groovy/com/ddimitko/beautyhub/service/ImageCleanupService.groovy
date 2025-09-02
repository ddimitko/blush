package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.repository.ShopRepository
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths

@Service
class ImageCleanupService {

    @Autowired
    ShopRepository shopRepository

    /**
     * Clean up orphaned image references in the database
     * Removes references to files that don't exist on disk
     */
    @Transactional
    void cleanupOrphanedImageReferences() {
        println "=== Starting Image Cleanup ==="
        
        String projectRoot = System.getProperty("user.dir")
        int totalCleaned = 0
        
        List<Shop> allShops = shopRepository.findAll()
        
        for (Shop shop : allShops) {
            boolean shopUpdated = false
            
            // Clean up gallery images
            if (shop.gallery) {
                List<String> validGalleryImages = []
                
                for (String imageUrl : shop.gallery) {
                    if (imageFileExists(projectRoot, imageUrl)) {
                        validGalleryImages.add(imageUrl)
                    } else {
                        println "Removing orphaned gallery image: ${imageUrl} for shop: ${shop.name}"
                        totalCleaned++
                        shopUpdated = true
                    }
                }
                
                shop.gallery = validGalleryImages
            }
            
            // Clean up thumbnail if it doesn't exist
            if (shop.thumbnail && !imageFileExists(projectRoot, shop.thumbnail)) {
                println "Removing orphaned thumbnail: ${shop.thumbnail} for shop: ${shop.name}"
                
                // Set thumbnail to first valid gallery image if available
                if (shop.gallery && shop.gallery.size() > 0) {
                    shop.thumbnail = shop.gallery[0]
                    println "Set new thumbnail to: ${shop.thumbnail}"
                } else {
                    shop.thumbnail = null
                    println "No valid images found, cleared thumbnail"
                }
                
                totalCleaned++
                shopUpdated = true
            }
            
            // Save shop if it was updated
            if (shopUpdated) {
                shopRepository.save(shop)
                println "Updated shop: ${shop.name} (ID: ${shop.id})"
            }
        }
        
        println "=== Image Cleanup Complete ==="
        println "Total orphaned references cleaned: ${totalCleaned}"
    }
    
    /**
     * Check if an image file exists on disk
     */
    private boolean imageFileExists(String projectRoot, String imageUrl) {
        if (!imageUrl) return false
        
        try {
            // Remove leading slash if present
            String relativePath = imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl
            Path imagePath = Paths.get(projectRoot, relativePath)
            
            boolean exists = Files.exists(imagePath)
            if (!exists) {
                println "File not found: ${imagePath}"
            }
            
            return exists
        } catch (Exception e) {
            println "Error checking file existence for ${imageUrl}: ${e.message}"
            return false
        }
    }
    
    /**
     * List all image files that exist on disk but are not referenced in database
     */
    void findUnreferencedFiles() {
        println "=== Finding Unreferenced Files ==="
        
        String projectRoot = System.getProperty("user.dir")
        Path uploadsDir = Paths.get(projectRoot, "uploads")
        
        if (!Files.exists(uploadsDir)) {
            println "Uploads directory does not exist: ${uploadsDir}"
            return
        }
        
        // Get all image URLs from database
        Set<String> referencedImages = new HashSet<>()
        List<Shop> allShops = shopRepository.findAll()
        
        for (Shop shop : allShops) {
            if (shop.thumbnail) {
                referencedImages.add(shop.thumbnail)
            }
            if (shop.gallery) {
                referencedImages.addAll(shop.gallery)
            }
        }
        
        println "Found ${referencedImages.size()} image references in database"
        
        // Walk through uploads directory and find unreferenced files
        try {
            Files.walk(uploadsDir)
                .filter { Files.isRegularFile(it) }
                .filter { it.toString().matches(/.*\.(jpg|jpeg|png|gif|webp)$/i) }
                .forEach { Path filePath ->
                    String relativePath = uploadsDir.relativize(filePath).toString()
                    String imageUrl = "/uploads/" + relativePath.replace('\\', '/')
                    
                    if (!referencedImages.contains(imageUrl)) {
                        println "Unreferenced file: ${imageUrl}"
                    }
                }
        } catch (Exception e) {
            println "Error walking uploads directory: ${e.message}"
        }
        
        println "=== Unreferenced Files Check Complete ==="
    }
}
