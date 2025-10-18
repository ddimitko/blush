//
//  PhotoPickerView.swift
//  LunaraApp
//
//  Created by Lunara Team on 28/07/2025.
//

import SwiftUI
import PhotosUI

/// Photo picker view for selecting multiple images
struct PhotoPickerView: UIViewControllerRepresentable {
    @Binding var selectedImages: [UIImage]
    let maxSelection: Int
    let onDismiss: () -> Void
    
    init(selectedImages: Binding<[UIImage]>, maxSelection: Int = 10, onDismiss: @escaping () -> Void) {
        self._selectedImages = selectedImages
        self.maxSelection = maxSelection
        self.onDismiss = onDismiss
    }
    
    func makeUIViewController(context: Context) -> PHPickerViewController {
        var configuration = PHPickerConfiguration()
        configuration.filter = .images
        configuration.selectionLimit = maxSelection
        configuration.preferredAssetRepresentationMode = .current
        
        let picker = PHPickerViewController(configuration: configuration)
        picker.delegate = context.coordinator
        return picker
    }
    
    func updateUIViewController(_ uiViewController: PHPickerViewController, context: Context) {
        // No updates needed
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, PHPickerViewControllerDelegate {
        let parent: PhotoPickerView
        
        init(_ parent: PhotoPickerView) {
            self.parent = parent
        }
        
        func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
            // Dismiss picker first
            picker.dismiss(animated: true)

            // Call onDismiss callback
            parent.onDismiss()

            // Process results if any
            guard !results.isEmpty else { return }

            Task {
                var images: [UIImage] = []

                for result in results {
                    do {
                        if let image = try await loadImage(from: result) {
                            images.append(image)
                        }
                    } catch {
                        print("Failed to load image: \(error)")
                    }
                }

                await MainActor.run {
                    self.parent.selectedImages = images
                }
            }
        }

        @MainActor
        private func loadImage(from result: PHPickerResult) async throws -> UIImage? {
            return try await withCheckedThrowingContinuation { continuation in
                result.itemProvider.loadObject(ofClass: UIImage.self) { object, error in
                    if let error = error {
                        continuation.resume(throwing: error)
                    } else if let image = object as? UIImage {
                        continuation.resume(returning: image)
                    } else {
                        continuation.resume(returning: nil)
                    }
                }
            }
        }
    }
}

/// Image validation and preparation utilities
struct ImageProcessor {
    static let maxFileSize: Int = 5 * 1024 * 1024 // 5MB
    static let maxDimension: CGFloat = 1024
    static let compressionQuality: CGFloat = 0.8
    
    /// Validate image size and type
    static func validateImage(_ image: UIImage) -> ValidationResult {
        // Check if image data can be created
        guard let imageData = image.jpegData(compressionQuality: 1.0) else {
            return .failure("Invalid image format")
        }
        
        // Check file size
        if imageData.count > maxFileSize {
            return .failure("Image is too large (max 5MB)")
        }
        
        return .success
    }
    
    /// Prepare image for upload by resizing and compressing
    static func prepareImageForUpload(_ image: UIImage) -> Data? {
        // Resize image if needed
        let resizedImage = resizeImage(image, maxDimension: maxDimension)
        
        // Compress to JPEG
        return resizedImage.jpegData(compressionQuality: compressionQuality)
    }
    
    /// Resize image while maintaining aspect ratio
    private static func resizeImage(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let size = image.size
        
        // Check if resizing is needed
        if size.width <= maxDimension && size.height <= maxDimension {
            return image
        }
        
        // Calculate new size maintaining aspect ratio
        let aspectRatio = size.width / size.height
        let newSize: CGSize
        
        if size.width > size.height {
            newSize = CGSize(width: maxDimension, height: maxDimension / aspectRatio)
        } else {
            newSize = CGSize(width: maxDimension * aspectRatio, height: maxDimension)
        }
        
        // Create resized image
        UIGraphicsBeginImageContextWithOptions(newSize, false, 0.0)
        image.draw(in: CGRect(origin: .zero, size: newSize))
        let resizedImage = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        
        return resizedImage ?? image
    }
    
    enum ValidationResult {
        case success
        case failure(String)
        
        var isValid: Bool {
            switch self {
            case .success:
                return true
            case .failure:
                return false
            }
        }
        
        var errorMessage: String? {
            switch self {
            case .success:
                return nil
            case .failure(let message):
                return message
            }
        }
    }
}

// MARK: - Preview
struct PhotoPickerView_Previews: PreviewProvider {
    static var previews: some View {
        Text("Photo Picker Preview")
            .sheet(isPresented: .constant(true)) {
                PhotoPickerView(
                    selectedImages: .constant([]),
                    maxSelection: 10
                ) {
                    // Dismiss action
                }
            }
    }
}
