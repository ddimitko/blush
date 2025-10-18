//
//  ReviewSubmissionSheet.swift
//  LunaraApp
//
//  Created by Lunara Team on 30/07/2025.
//

import SwiftUI
import PhotosUI

struct ReviewSubmissionSheet: View {
    let appointment: Appointment
    @Environment(\.dismiss) private var dismiss
    @State private var rating: Int = 0
    @State private var comment: String = ""
    @State private var isAnonymous: Bool = false
    @State private var isSubmitting: Bool = false
    @State private var showingError: Bool = false
    @State private var errorMessage: String = ""
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var selectedImageData: Data?
    @State private var showingImagePicker: Bool = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                // Header
                headerSection

                // Appointment Info
                appointmentInfoSection

                // Rating Section
                ratingSection

                // Comment Section
                commentSection

                // Photo Section
                photoSection

                // Anonymous Option
                anonymousSection

                Spacer()

                // Submit Button
                submitButton
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .navigationTitle("Leave a Review")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.secondaryText)
                }
            }
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage)
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        VStack(spacing: 12) {
            Image(systemName: "star.circle.fill")
                .font(.system(size: 48))
                .foregroundColor(LunaraColors.warmGold)
            
            VStack(spacing: 4) {
                Text("How was your experience?")
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundColor(LunaraColors.primaryText)
                
                Text("Share your feedback about your appointment")
                    .font(.body)
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
            }
        }
    }
    
    // MARK: - Appointment Info Section
    private var appointmentInfoSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(appointment.shopName)
                        .font(.headline)
                        .foregroundColor(LunaraColors.primaryText)
                    
                    Text(appointment.serviceName)
                        .font(.subheadline)
                        .foregroundColor(LunaraColors.secondaryText)
                    
                    Text("with \(appointment.employeeName)")
                        .font(.caption)
                        .foregroundColor(LunaraColors.secondaryText)
                }
                
                Spacer()
                
                Text(appointment.formattedDate)
                    .font(.caption)
                    .foregroundColor(LunaraColors.secondaryText)
            }
        }
        .padding(16)
        .background(LunaraColors.coolLightGray)
        .cornerRadius(12)
    }
    
    // MARK: - Rating Section
    private var ratingSection: some View {
        VStack(spacing: 16) {
            Text("Rate your experience")
                .font(.headline)
                .foregroundColor(LunaraColors.primaryText)
            
            HStack(spacing: 8) {
                ForEach(1...5, id: \.self) { star in
                    Button(action: {
                        rating = star
                    }) {
                        Image(systemName: star <= rating ? "star.fill" : "star")
                            .font(.system(size: 32))
                            .foregroundColor(star <= rating ? LunaraColors.warmGold : LunaraColors.secondaryText)
                    }
                    .scaleEffect(star <= rating ? 1.1 : 1.0)
                    .animation(.easeInOut(duration: 0.2), value: rating)
                }
            }
            
            if rating > 0 {
                Text(ratingDescription)
                    .font(.subheadline)
                    .foregroundColor(LunaraColors.secondaryText)
                    .animation(.easeInOut(duration: 0.2), value: rating)
            }
        }
    }
    
    // MARK: - Comment Section
    private var commentSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Add a comment (optional)")
                .font(.headline)
                .foregroundColor(LunaraColors.primaryText)
            
            TextField("Share details about your experience...", text: $comment, axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .lineLimit(4...8)
                .font(.body)
        }
    }
    
    // MARK: - Photo Section
    private var photoSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Add a photo (optional)")
                .font(.headline)
                .foregroundColor(LunaraColors.primaryText)

            if let imageData = selectedImageData,
               let uiImage = UIImage(data: imageData) {
                // Show selected image
                HStack {
                    Image(uiImage: uiImage)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: 80, height: 80)
                        .clipShape(RoundedRectangle(cornerRadius: 8))

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Photo selected")
                            .font(.subheadline)
                            .foregroundColor(LunaraColors.primaryText)

                        Button("Change photo") {
                            showingImagePicker = true
                        }
                        .font(.caption)
                        .foregroundColor(LunaraColors.warmGold)
                    }

                    Spacer()

                    Button(action: {
                        selectedPhoto = nil
                        selectedImageData = nil
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title2)
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                }
                .padding(12)
                .background(LunaraColors.coolLightGray)
                .cornerRadius(8)
            } else {
                // Photo picker button
                Button(action: {
                    showingImagePicker = true
                }) {
                    HStack {
                        Image(systemName: "camera.fill")
                            .font(.title2)
                            .foregroundColor(LunaraColors.warmGold)

                        VStack(alignment: .leading, spacing: 2) {
                            Text("Add a photo")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(LunaraColors.primaryText)

                            Text("Share a photo of your experience")
                                .font(.caption)
                                .foregroundColor(LunaraColors.secondaryText)
                        }

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                    .padding(16)
                    .background(LunaraColors.coolLightGray)
                    .cornerRadius(8)
                }
            }
        }
        .photosPicker(isPresented: $showingImagePicker, selection: $selectedPhoto, matching: .images)
        .onChange(of: selectedPhoto) { _, newPhoto in
            Task {
                if let newPhoto = newPhoto {
                    do {
                        if let data = try await newPhoto.loadTransferable(type: Data.self) {
                            await MainActor.run {
                                selectedImageData = data
                            }
                        }
                    } catch {
                        print("❌ Failed to load image: \(error)")
                    }
                }
            }
        }
    }

    // MARK: - Anonymous Section
    private var anonymousSection: some View {
        HStack {
            Toggle("Post anonymously", isOn: $isAnonymous)
                .font(.subheadline)
                .foregroundColor(LunaraColors.primaryText)
        }
    }
    
    // MARK: - Submit Button
    private var submitButton: some View {
        Button(action: submitReview) {
            HStack {
                if isSubmitting {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .scaleEffect(0.8)
                } else {
                    Image(systemName: "paperplane.fill")
                }
                
                Text(isSubmitting ? "Submitting..." : "Submit Review")
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(rating > 0 ? LunaraColors.warmGold : LunaraColors.secondaryText)
            .foregroundColor(.white)
            .cornerRadius(12)
        }
        .disabled(rating == 0 || isSubmitting)
    }
    
    // MARK: - Computed Properties
    private var ratingDescription: String {
        switch rating {
        case 1: return "Poor"
        case 2: return "Fair"
        case 3: return "Good"
        case 4: return "Very Good"
        case 5: return "Excellent"
        default: return ""
        }
    }
    
    // MARK: - Actions
    private func submitReview() {
        guard rating > 0 else { return }

        isSubmitting = true

        Task {
            do {
                if let imageData = selectedImageData {
                    // Submit review with image
                    let _ = try await APIClient.shared.createReviewWithImage(
                        appointmentId: appointment.id,
                        stars: rating,
                        comment: comment.isEmpty ? nil : comment,
                        anonymous: isAnonymous,
                        imageData: imageData
                    )
                } else {
                    // Submit text-only review
                    let request = ReviewCreationRequest(
                        appointmentId: appointment.id,
                        stars: rating,
                        comment: comment.isEmpty ? nil : comment,
                        anonymous: isAnonymous
                    )
                    let _ = try await APIClient.shared.createReview(request: request)
                }

                await MainActor.run {
                    isSubmitting = false
                    dismiss()

                    // Show success message via AppState
                    AppState.shared.presentAlert(AlertItem(
                        title: "Review Submitted",
                        message: "Thank you for your feedback! Your review helps other customers discover great services.",
                        primaryButton: AlertButton(title: "OK", action: {}, style: .default)
                    ))
                }
            } catch {
                await MainActor.run {
                    isSubmitting = false
                    errorMessage = "Failed to submit review. Please try again."
                    showingError = true
                }
            }
        }
    }
}

// MARK: - Preview
#Preview {
    ReviewSubmissionSheet(appointment: Appointment.previewPast)
}
