//
//  ProfileView.swift
//  LunaraApp
//
//  Created by Lunara Team on 14/07/2025.
//

import SwiftUI
import Kingfisher

/// Profile view for user account management
struct ProfileView: View {
    @EnvironmentObject var authService: AuthenticationService
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) private var dismiss

    // Edit mode state
    @State private var isEditing = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showingError = false
    @State private var showingShopCreation = false

    // Form fields
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var phone = ""

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Profile Header
                    profileHeader

                    // Edit Profile Form
                    editProfileForm

                    // Business Opportunity Section (for USER role only)
                    businessOpportunitySection

                    // Sign Out Section
                    signOutSection
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
            }
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    if !isEditing {
                        Button("Done") {
                            appState.dismissSheet()
                        }
                        .foregroundColor(LunaraColors.secondaryText)
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    if isEditing {
                        HStack(spacing: 12) {
                            Button("Cancel") {
                                cancelEditing()
                            }
                            .foregroundColor(LunaraColors.secondaryText)

                            Button("Save") {
                                saveProfile()
                            }
                            .foregroundColor(LunaraColors.warmGold)
                            .disabled(isLoading || !isFormValid)
                        }
                    } else {
                        Button("Edit") {
                            startEditing()
                        }
                        .foregroundColor(LunaraColors.warmGold)
                    }
                }
            }
        }
        .onAppear {
            loadUserData()
        }
        .sheet(isPresented: $showingShopCreation) {
            ShopCreationView(onShopCreated: {
                // Handle successful shop creation
                print("Shop created successfully from profile")
            })
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage ?? "An error occurred")
        }
    }

    // MARK: - Profile Header
    private var profileHeader: some View {
        VStack(spacing: 16) {
            // Avatar
            KFImage(URL(string: authService.user?.avatar ?? ""))
                .downloader(ImageService.shared.downloader)
                .onFailure { error in
                    print("❌ Avatar image loading failed: \(error)")
                }
                .placeholder {
                    Circle()
                        .fill(LunaraColors.warmGold)
                        .overlay(
                            Text(authService.user?.initials ?? "U")
                                .font(.system(size: 32, weight: .semibold))
                                .foregroundColor(.white)
                        )
                }
                .resizable()
                .aspectRatio(contentMode: .fill)
            .frame(width: 80, height: 80)
            .clipShape(Circle())

            // User Info
            VStack(spacing: 4) {
                Text(authService.user?.fullName ?? "User")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)

                Text(authService.user?.email ?? "")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)

                // Role Badge
                HStack {
                    Image(systemName: roleIcon)
                        .font(.system(size: 12, weight: .semibold))

                    Text(authService.user?.role.displayName ?? "User")
                        .font(.system(size: 12, weight: .semibold))
                }
                .foregroundColor(LunaraColors.warmGold)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(LunaraColors.warmGold.opacity(0.1))
                .cornerRadius(16)
            }
        }
        .padding(.vertical, 8)
    }

    // MARK: - Edit Profile Form
    private var editProfileForm: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Personal Information")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)

            VStack(spacing: 16) {
                // First Name
                VStack(alignment: .leading, spacing: 8) {
                    Text("First Name")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)

                    TextField("Enter your first name", text: $firstName)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .disabled(!isEditing)
                        .opacity(isEditing ? 1.0 : 0.7)
                }

                // Last Name
                VStack(alignment: .leading, spacing: 8) {
                    Text("Last Name")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)

                    TextField("Enter your last name", text: $lastName)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .disabled(!isEditing)
                        .opacity(isEditing ? 1.0 : 0.7)
                }

                // Phone
                VStack(alignment: .leading, spacing: 8) {
                    Text("Phone Number")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)

                    TextField("Enter your phone number", text: $phone)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .keyboardType(.phonePad)
                        .disabled(!isEditing)
                        .opacity(isEditing ? 1.0 : 0.7)
                }

                // Email (read-only)
                VStack(alignment: .leading, spacing: 8) {
                    Text("Email Address")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)

                    TextField("", text: .constant(authService.user?.email ?? ""))
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .disabled(true)
                        .opacity(0.7)
                }
            }
            .padding(16)
            .background(LunaraColors.cardBackground)
            .cornerRadius(12)
        }
    }

    // MARK: - Business Opportunity Section
    @ViewBuilder
    private var businessOpportunitySection: some View {
        if authService.user?.role == .user {
            VStack(alignment: .leading, spacing: 16) {
                Text("Business Opportunity")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)

                BusinessOpportunityHorizontalCardView {
                    showingShopCreation = true
                }
            }
        }
    }

    // MARK: - Sign Out Section
    private var signOutSection: some View {
        VStack(spacing: 16) {
            Button(action: {
                Task {
                    await authService.logout()
                }
            }) {
                HStack {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .font(.system(size: 16, weight: .semibold))

                    Text("Sign Out")
                        .font(.system(size: 16, weight: .semibold))
                }
                .foregroundColor(LunaraColors.error)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(LunaraColors.error.opacity(0.1))
                .cornerRadius(12)
            }

            Text("Version 1.0.0")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .padding(.top, 8)
    }

    // MARK: - Computed Properties
    private var roleIcon: String {
        switch authService.user?.role {
        case .owner:
            return "crown"
        case .employee:
            return "person.badge.key"
        case .admin:
            return "shield"
        default:
            return "person"
        }
    }

    private var isFormValid: Bool {
        return !firstName.trimmingCharacters(in: .whitespaces).isEmpty &&
               !lastName.trimmingCharacters(in: .whitespaces).isEmpty &&
               !phone.trimmingCharacters(in: .whitespaces).isEmpty
    }

    // MARK: - Helper Methods
    private func loadUserData() {
        guard let user = authService.user else { return }
        firstName = user.firstName
        lastName = user.lastName
        phone = user.phone ?? ""
    }

    private func startEditing() {
        isEditing = true
    }

    private func cancelEditing() {
        isEditing = false
        loadUserData() // Reset form to original values
    }

    private func saveProfile() {
        guard isFormValid else { return }

        isLoading = true
        errorMessage = nil

        let request = UserUpdateRequest(
            firstName: firstName.trimmingCharacters(in: .whitespaces),
            lastName: lastName.trimmingCharacters(in: .whitespaces),
            phone: phone.trimmingCharacters(in: .whitespaces),
            avatar: nil // Avatar upload not implemented yet
        )

        Task {
            do {
                _ = try await authService.updateUserProfile(request)

                await MainActor.run {
                    isLoading = false
                    isEditing = false
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = error.localizedDescription
                    showingError = true
                }
            }
        }
    }
}


// MARK: - Preview
struct ProfileView_Previews: PreviewProvider {
    static var previews: some View {
        ProfileView()
            .environmentObject(AuthenticationService.shared)
    }
}
