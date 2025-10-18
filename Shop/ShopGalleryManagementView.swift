//
//  ShopGalleryManagementView.swift
//  LunaraApp
//
//  Created by Lunara Team on 28/07/2025.
//

import SwiftUI
import Kingfisher

/// Shop gallery management view for owners
struct ShopGalleryManagementView: View {
    // MARK: - Properties
    let initialShop: Shop

    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var shopService: ShopService
    @EnvironmentObject private var appState: AppState
    @StateObject private var authService = AuthenticationService.shared

    // MARK: - State
    @State private var currentShop: Shop
    @State private var isLoading = false
    @State private var showingPhotoPicker = false
    @State private var selectedImages: [UIImage] = []
    @State private var uploadingImages: Set<String> = []
    @State private var errorMessage: String?
    @State private var showingError = false
    @State private var successMessage: String?
    @State private var showingSuccess = false
    @State private var showingDeleteConfirmation = false
    @State private var imageToDelete: String?
    @State private var showingGalleryViewer = false
    @State private var selectedImageIndex = 0

    // MARK: - Initialization
    init(shop: Shop) {
        self.initialShop = shop
        self._currentShop = State(initialValue: shop)
    }
    
    // MARK: - Constants
    private let maxGalleryImages = 10
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 12), count: 2)
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header Info
                headerInfoView
                
                // Gallery Content
                ScrollView {
                    LazyVStack(spacing: 24) {
                        // Add Photos Section
                        addPhotosSection
                        
                        // Current Gallery
                        if !(currentShop.gallery?.isEmpty ?? true) {
                            currentGallerySection
                        } else {
                            emptyGalleryView
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 32)
                }
            }
            .navigationTitle("Gallery Management")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.secondaryText)
                }
            }
        }
        .sheet(isPresented: $showingPhotoPicker) {
            PhotoPickerView(
                selectedImages: $selectedImages,
                maxSelection: maxGalleryImages - (currentShop.gallery?.count ?? 0)
            ) {
                showingPhotoPicker = false
            }
        }
        .sheet(isPresented: $showingGalleryViewer) {
            ShopGalleryView(
                images: currentShop.gallery ?? [],
                selectedIndex: $selectedImageIndex
            )
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage ?? "An error occurred")
        }
        .alert("Success", isPresented: $showingSuccess) {
            Button("OK") { }
        } message: {
            Text(successMessage ?? "Operation completed successfully")
        }
        .alert("Delete Image", isPresented: $showingDeleteConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                if let imageUrl = imageToDelete {
                    deleteImage(imageUrl)
                }
            }
        } message: {
            Text("Are you sure you want to delete this image? This action cannot be undone.")
        }
        .onChange(of: selectedImages) { _, images in
            if !images.isEmpty {
                uploadImages(images)
                selectedImages = []
            }
        }
        .onAppear {
            // Debug: Check authentication status and permissions
            Task {
                let isAuthenticated = authService.isAuthenticated
                let currentUser = authService.user
                let userRole = currentUser?.role
                let isOwner = currentUser?.isOwner ?? false
                let isShopOwner = currentUser?.id == currentShop.owner.id

                print("🔍 Gallery Management Debug:")
                print("  - Is authenticated: \(isAuthenticated)")
                print("  - Current user: \(currentUser?.email ?? "none")")
                print("  - User role: \(userRole?.rawValue ?? "none")")
                print("  - Is owner role: \(isOwner)")
                print("  - Shop ID: \(currentShop.id)")
                print("  - Shop name: \(currentShop.name)")
                print("  - Shop owner ID: \(currentShop.owner.id)")
                print("  - Is shop owner: \(isShopOwner)")

                await MainActor.run {
                    if !isAuthenticated {
                        errorMessage = "Authentication required. Please log in to manage gallery."
                        showingError = true
                    } else if !isOwner {
                        errorMessage = "Owner role required. Only shop owners can manage gallery."
                        showingError = true
                    } else if !isShopOwner {
                        errorMessage = "Access denied. You can only manage your own shop's gallery."
                        showingError = true
                    } else {
                        // All checks passed - authentication and permissions verified
                        print("✅ All authentication and permission checks passed")
                    }
                }
            }
        }
    }
    
    // MARK: - Header Info View
    private var headerInfoView: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Gallery Images")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    Text("\(currentShop.gallery?.count ?? 0) of \(maxGalleryImages) images")
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                }

                Spacer()

                // Progress indicator
                if isLoading {
                    ProgressView()
                        .scaleEffect(0.8)
                }
            }

            // Gallery limit progress bar
            ProgressView(value: Double(currentShop.gallery?.count ?? 0), total: Double(maxGalleryImages))
                .progressViewStyle(LinearProgressViewStyle(tint: LunaraColors.warmGold))
                .scaleEffect(y: 0.5)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(LunaraColors.coolLightGray.opacity(0.3))
    }
    
    // MARK: - Add Photos Section
    private var addPhotosSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Add Photos")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(LunaraColors.primaryText)
            
            Button(action: {
                showingPhotoPicker = true
            }) {
                HStack(spacing: 12) {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 20))
                        .foregroundColor(LunaraColors.warmGold)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Add Photos")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(LunaraColors.primaryText)
                        
                        Text("Select up to \(maxGalleryImages - (currentShop.gallery?.count ?? 0)) more images")
                            .font(.system(size: 14))
                            .foregroundColor(LunaraColors.secondaryText)

                        // Debug: Test upload button
                        if ProcessInfo.processInfo.environment["DEBUG_GALLERY"] == "1" {
                            Button("🧪 Test Upload (Debug)") {
                                testUpload()
                            }
                            .font(.system(size: 12))
                            .foregroundColor(.blue)
                            .padding(.top, 4)
                        }
                    }
                    
                    Spacer()
                    
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(LunaraColors.white)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(LunaraColors.coolLightGray, lineWidth: 1)
                )
            }
            .disabled((currentShop.gallery?.count ?? 0) >= maxGalleryImages || isLoading)
            .opacity((currentShop.gallery?.count ?? 0) >= maxGalleryImages ? 0.6 : 1.0)
        }
    }
    
    // MARK: - Current Gallery Section
    private var currentGallerySection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Current Gallery")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
                
                if currentShop.thumbnail != nil {
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.warmGold)
                        
                        Text("Thumbnail set")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(LunaraColors.warmGold)
                    }
                }
            }
            
            LazyVGrid(columns: columns, spacing: 12) {
                ForEach((currentShop.gallery ?? []).indices, id: \.self) { index in
                    let gallery = currentShop.gallery ?? []
                    GalleryImageCard(
                        imageUrl: gallery[index],
                        isThumbnail: gallery[index] == currentShop.thumbnail,
                        isUploading: uploadingImages.contains(gallery[index]),
                        onTap: {
                            selectedImageIndex = index
                            showingGalleryViewer = true
                        },
                        onSetThumbnail: {
                            setThumbnail(gallery[index])
                        },
                        onDelete: {
                            imageToDelete = gallery[index]
                            showingDeleteConfirmation = true
                        }
                    )
                }
            }
        }
    }
    
    // MARK: - Empty Gallery View
    private var emptyGalleryView: some View {
        VStack(spacing: 16) {
            Image(systemName: "photo.on.rectangle.angled")
                .font(.system(size: 48))
                .foregroundColor(LunaraColors.charcoalGray.opacity(0.3))
            
            VStack(spacing: 8) {
                Text("No Gallery Images")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text("Add photos to showcase your shop and attract more customers")
                    .font(.system(size: 14))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(.vertical, 40)
    }
    
    // MARK: - Actions
    
    private func uploadImages(_ images: [UIImage]) {
        guard !images.isEmpty else { return }
        
        isLoading = true
        
        Task {
            for image in images {
                // Validate image
                let validation = ImageProcessor.validateImage(image)
                guard validation.isValid else {
                    await MainActor.run {
                        errorMessage = validation.errorMessage
                        showingError = true
                        isLoading = false
                    }
                    return
                }
                
                // Prepare image data
                guard let imageData = ImageProcessor.prepareImageForUpload(image) else {
                    await MainActor.run {
                        errorMessage = "Failed to process image"
                        showingError = true
                        isLoading = false
                    }
                    return
                }
                
                do {
                    let _ = try await shopService.uploadGalleryImage(shopId: currentShop.id, imageData: imageData)

                    await MainActor.run {
                        if images.count == 1 {
                            successMessage = "Image uploaded successfully"
                        } else if image == images.last {
                            successMessage = "All images uploaded successfully"
                        }

                        if image == images.last {
                            showingSuccess = true
                            isLoading = false
                            // Refresh shop data after successful upload
                            refreshShopData()
                        }
                    }
                } catch {
                    await MainActor.run {
                        // Provide more specific error messages
                        if error.localizedDescription.contains("403") || error.localizedDescription.contains("Forbidden") {
                            errorMessage = "Access denied. Please check your permissions or try logging in again."
                        } else if error.localizedDescription.contains("401") || error.localizedDescription.contains("Unauthorized") {
                            errorMessage = "Authentication failed. Please log in again."
                        } else if error.localizedDescription.contains("Network") || error.localizedDescription.contains("network") {
                            errorMessage = "Network error. Please check your connection and try again."
                        } else {
                            errorMessage = "Upload failed: \(error.localizedDescription)"
                        }

                        // Delay showing error to ensure view is in window hierarchy
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                            showingError = true
                        }
                        isLoading = false
                    }
                    return
                }
            }
        }
    }
    
    private func deleteImage(_ imageUrl: String) {
        isLoading = true
        
        Task {
            do {
                try await shopService.deleteGalleryImage(shopId: currentShop.id, imageUrl: imageUrl)

                await MainActor.run {
                    successMessage = "Image deleted successfully"
                    showingSuccess = true
                    isLoading = false
                    // Refresh shop data after successful deletion
                    refreshShopData()
                }
            } catch {
                await MainActor.run {
                    if error.localizedDescription.contains("403") || error.localizedDescription.contains("Forbidden") {
                        errorMessage = "Access denied. You don't have permission to delete this image."
                    } else if error.localizedDescription.contains("401") || error.localizedDescription.contains("Unauthorized") {
                        errorMessage = "Authentication failed. Please log in again."
                    } else {
                        errorMessage = "Delete failed: \(error.localizedDescription)"
                    }
                    showingError = true
                    isLoading = false
                }
            }
        }
    }
    
    private func setThumbnail(_ imageUrl: String) {
        isLoading = true
        
        Task {
            do {
                try await shopService.setShopThumbnail(shopId: currentShop.id, imageUrl: imageUrl)

                await MainActor.run {
                    successMessage = "Thumbnail updated successfully"
                    showingSuccess = true
                    isLoading = false
                    // Refresh shop data after successful thumbnail update
                    refreshShopData()
                }
            } catch {
                await MainActor.run {
                    if error.localizedDescription.contains("403") || error.localizedDescription.contains("Forbidden") {
                        errorMessage = "Access denied. You don't have permission to set the thumbnail."
                    } else if error.localizedDescription.contains("401") || error.localizedDescription.contains("Unauthorized") {
                        errorMessage = "Authentication failed. Please log in again."
                    } else {
                        errorMessage = "Thumbnail update failed: \(error.localizedDescription)"
                    }
                    showingError = true
                    isLoading = false
                }
            }
        }
    }

    // MARK: - Data Refresh

    private func refreshShopData() {
        Task {
            do {
                // Fetch updated shop data from the service
                let updatedShop = try await shopService.refreshShopData(shopId: currentShop.id)
                await MainActor.run {
                    currentShop = updatedShop
                    print("🔄 Shop data refreshed - Gallery count: \(updatedShop.gallery?.count ?? 0)")
                }
            } catch {
                print("⚠️ Failed to refresh shop data: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Debug Methods

    private func testUpload() {
        print("🧪 Testing gallery upload with dummy image data...")

        // Create a small test image (1x1 pixel JPEG)
        let testImageData = createTestImageData()

        isLoading = true

        Task {
            do {
                let response = try await shopService.uploadGalleryImage(shopId: currentShop.id, imageData: testImageData)

                await MainActor.run {
                    successMessage = "Test upload successful: \(response.message)"
                    showingSuccess = true
                    isLoading = false
                    // Refresh shop data after test upload
                    refreshShopData()
                }
            } catch {
                await MainActor.run {
                    errorMessage = "Test upload failed: \(error.localizedDescription)"
                    showingError = true
                    isLoading = false
                }
            }
        }
    }

    private func createTestImageData() -> Data {
        // Create a minimal 1x1 pixel JPEG image
        let size = CGSize(width: 1, height: 1)
        let renderer = UIGraphicsImageRenderer(size: size)
        let image = renderer.image { context in
            UIColor.red.setFill()
            context.fill(CGRect(origin: .zero, size: size))
        }
        return image.jpegData(compressionQuality: 0.8) ?? Data()
    }
}

// MARK: - Gallery Image Card
struct GalleryImageCard: View {
    let imageUrl: String
    let isThumbnail: Bool
    let isUploading: Bool
    let onTap: () -> Void
    let onSetThumbnail: () -> Void
    let onDelete: () -> Void

    @State private var showingActions = false

    var body: some View {
        ZStack {
            // Image
            KFImage(URL(string: getImageUrl(imageUrl)))
                .downloader(ImageService.shared.downloader)
                .onFailure { error in
                    print("❌ Image loading failed: \(error)")
                }
                .placeholder {
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .overlay(
                            ProgressView()
                                .scaleEffect(0.8)
                        )
                }
                .resizable()
                .aspectRatio(contentMode: .fill)
            .frame(height: 120)
            .clipped()
            .cornerRadius(12)
            .onTapGesture {
                onTap()
            }

            // Thumbnail badge
            if isThumbnail {
                VStack {
                    HStack {
                        Spacer()

                        HStack(spacing: 4) {
                            Image(systemName: "star.fill")
                                .font(.system(size: 10))
                                .foregroundColor(.white)

                            Text("Thumbnail")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(.white)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(LunaraColors.warmGold)
                        .cornerRadius(8)
                        .padding(.top, 8)
                        .padding(.trailing, 8)
                    }

                    Spacer()
                }
            }

            // Actions button
            VStack {
                HStack {
                    Spacer()

                    Button(action: {
                        showingActions = true
                    }) {
                        Image(systemName: "ellipsis.circle.fill")
                            .font(.system(size: 24))
                            .foregroundColor(.white)
                            .background(Color.black.opacity(0.5))
                            .clipShape(Circle())
                    }
                    .padding(.top, 8)
                    .padding(.trailing, 8)
                }

                Spacer()
            }

            // Upload overlay
            if isUploading {
                Rectangle()
                    .fill(Color.black.opacity(0.5))
                    .overlay(
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    )
                    .cornerRadius(12)
            }
        }
        .actionSheet(isPresented: $showingActions) {
            ActionSheet(
                title: Text("Image Actions"),
                buttons: [
                    .default(Text(isThumbnail ? "Remove as Thumbnail" : "Set as Thumbnail")) {
                        if !isThumbnail {
                            onSetThumbnail()
                        }
                    },
                    .destructive(Text("Delete Image")) {
                        onDelete()
                    },
                    .cancel()
                ]
            )
        }
    }

    private func getImageUrl(_ url: String) -> String {
        // Return empty string for nil/empty URLs to prevent invalid requests
        if url.isEmpty {
            return ""
        }
        if url.starts(with: "http") {
            return url
        }
        return "https://109.104.206.19:8443\(url)"
    }
}

#Preview {
    ShopGalleryManagementView(shop: Shop.preview)
        .environmentObject(AppState.shared)
        .environmentObject(ShopService.shared)
}
