package com.ddimitko.beautyhub.service

import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.web.multipart.MultipartFile

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.security.MessageDigest
import java.util.regex.Pattern

@Service
@Slf4j
class FileUploadSecurityService {

    @Value('${app.upload.allowed-types:image/jpeg,image/png,image/gif,image/webp}')
    private String allowedTypes

    @Value('${app.upload.max-files-per-user:50}')
    private int maxFilesPerUser

    @Value('${app.upload.scan-for-viruses:false}')
    private boolean virusScanEnabled

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    private static final Pattern SAFE_FILENAME_PATTERN = Pattern.compile(/^[a-zA-Z0-9._-]+$/)
    
    // Known malicious file signatures (magic bytes)
    private static final Map<String, List<String>> MALICIOUS_SIGNATURES = [
        'executable': ['4D5A', '7F454C46'], // PE and ELF executables
        'script': ['3C3F706870', '3C73637269707420'], // PHP and script tags
        'archive': ['504B0304', '526172211A07'] // ZIP and RAR (can contain malware)
    ]

    /**
     * Validates uploaded file for security compliance
     */
    FileValidationResult validateFile(MultipartFile file, String userId = null) {
        log.debug("Validating file: ${file.originalFilename}, size: ${file.size}, type: ${file.contentType}")

        try {
            // Basic validation
            if (file.isEmpty()) {
                return new FileValidationResult(false, "File is empty")
            }

            // File size validation
            if (file.size > MAX_FILE_SIZE) {
                return new FileValidationResult(false, "File size exceeds maximum allowed size (10MB)")
            }

            // Content type validation
            if (!isAllowedContentType(file.contentType)) {
                return new FileValidationResult(false, "File type not allowed: ${file.contentType}")
            }

            // Filename validation
            if (!isValidFilename(file.originalFilename)) {
                return new FileValidationResult(false, "Invalid filename: ${file.originalFilename}")
            }

            // Magic byte validation
            if (!isValidFileSignature(file)) {
                return new FileValidationResult(false, "File signature validation failed")
            }

            // User file count validation
            if (userId && !isWithinUserFileLimit(userId)) {
                return new FileValidationResult(false, "User has exceeded maximum file upload limit")
            }

            // Virus scan (if enabled)
            if (virusScanEnabled && !passesVirusScan(file)) {
                return new FileValidationResult(false, "File failed virus scan")
            }

            return new FileValidationResult(true, "File validation passed")

        } catch (Exception e) {
            log.error("Error during file validation", e)
            return new FileValidationResult(false, "File validation error: ${e.message}")
        }
    }

    /**
     * Generates secure filename with timestamp and hash
     */
    String generateSecureFilename(String originalFilename) {
        String extension = getFileExtension(originalFilename)
        String timestamp = System.currentTimeMillis().toString()
        String hash = generateFileHash(originalFilename + timestamp)
        return "${timestamp}_${hash.substring(0, 8)}.${extension}"
    }

    /**
     * Sanitizes filename for safe storage
     */
    String sanitizeFilename(String filename) {
        if (!filename) return "unknown"
        
        // Remove path traversal attempts
        filename = filename.replaceAll(/[\/\\]/, "")
        
        // Remove special characters except dots, hyphens, underscores
        filename = filename.replaceAll(/[^a-zA-Z0-9._-]/, "_")
        
        // Limit length
        if (filename.length() > 100) {
            String extension = getFileExtension(filename)
            String baseName = filename.substring(0, 100 - extension.length() - 1)
            filename = "${baseName}.${extension}"
        }
        
        return filename
    }

    private boolean isAllowedContentType(String contentType) {
        if (!contentType) return false
        
        List<String> allowed = allowedTypes.split(',').collect { it.trim() }
        return allowed.contains(contentType)
    }

    private boolean isValidFilename(String filename) {
        if (!filename) return false
        
        // Check for path traversal
        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            return false
        }
        
        // Check for null bytes
        if (filename.contains('\0')) {
            return false
        }
        
        // Check length
        if (filename.length() > 255) {
            return false
        }
        
        return true
    }

    private boolean isValidFileSignature(MultipartFile file) {
        try {
            byte[] fileBytes = file.getBytes()
            if (fileBytes.length < 4) return false
            
            String fileSignature = bytesToHex(fileBytes[0..Math.min(15, fileBytes.length - 1)])
            
            // Check against known malicious signatures
            for (def category : MALICIOUS_SIGNATURES) {
                for (String signature : category.value) {
                    if (fileSignature.startsWith(signature)) {
                        log.warn("Malicious file signature detected: ${signature}")
                        return false
                    }
                }
            }
            
            // Validate image signatures for image files
            if (file.contentType?.startsWith("image/")) {
                return isValidImageSignature(fileSignature, file.contentType)
            }
            
            return true
            
        } catch (Exception e) {
            log.error("Error validating file signature", e)
            return false
        }
    }

    private boolean isValidImageSignature(String signature, String contentType) {
        Map<String, List<String>> imageSignatures = [
            'image/jpeg': ['FFD8FF'],
            'image/png': ['89504E47'],
            'image/gif': ['474946383761', '474946383961'],
            'image/webp': ['52494646']
        ]
        
        List<String> validSignatures = imageSignatures[contentType]
        if (!validSignatures) return false
        
        return validSignatures.any { signature.startsWith(it) }
    }

    private boolean isWithinUserFileLimit(String userId) {
        // This would typically check against database
        // For now, return true - implement based on your user file tracking
        return true
    }

    private boolean passesVirusScan(MultipartFile file) {
        // Implement virus scanning integration here
        // This could integrate with ClamAV or other antivirus solutions
        log.debug("Virus scan not implemented - skipping")
        return true
    }

    private String getFileExtension(String filename) {
        if (!filename || !filename.contains('.')) return ""
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase()
    }

    private String generateFileHash(String input) {
        MessageDigest md = MessageDigest.getInstance("SHA-256")
        byte[] hash = md.digest(input.getBytes("UTF-8"))
        return bytesToHex(hash)
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder result = new StringBuilder()
        for (byte b : bytes) {
            result.append(String.format("%02X", b))
        }
        return result.toString()
    }

    /**
     * File validation result class
     */
    static class FileValidationResult {
        final boolean valid
        final String message
        
        FileValidationResult(boolean valid, String message) {
            this.valid = valid
            this.message = message
        }
    }
}
