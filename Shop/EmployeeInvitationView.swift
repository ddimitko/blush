//
//  EmployeeInvitationView.swift
//  LunaraApp
//
//  Created by Lunara Team on 24/07/2025.
//

import SwiftUI

/// View for inviting new employees to a shop
struct EmployeeInvitationView: View {
    // MARK: - Properties
    let shop: Shop
    let onEmployeeInvited: () -> Void
    
    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss
    
    // MARK: - State
    @StateObject private var shopService = ShopService.shared
    @State private var email = ""
    @State private var bio = ""
    @State private var specialties: [String] = []
    @State private var newSpecialty = ""
    @State private var yearsExperience = 0
    @State private var hourlyRate = ""
    @State private var commissionRate = 0.0
    
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showingError = false
    @State private var showingSuccess = false
    @State private var successMessage = ""
    
    // Validation states
    @State private var emailError: String?
    @State private var isValidatingEmail = false
    @State private var userExistsResponse: UserExistsResponse?
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 8) {
                        Text("Invite Employee")
                            .font(.system(size: 24, weight: .bold))
                            .foregroundColor(LunaraColors.primaryText)
                        
                        Text("Send an invitation to join \(shop.name)")
                            .font(.system(size: 16))
                            .foregroundColor(LunaraColors.secondaryText)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 16)
                    
                    // Form
                    VStack(spacing: 20) {
                        // Personal Information Section
                        sectionHeader("Personal Information")
                        
                        VStack(spacing: 16) {
                            // Email field with validation
                            VStack(alignment: .leading, spacing: 8) {
                                FormFieldView(
                                    title: "Email Address",
                                    text: $email,
                                    placeholder: "employee@example.com",
                                    isRequired: true,
                                    keyboardType: .emailAddress
                                )
                                .onChange(of: email) { _, newValue in
                                    validateEmail(newValue)
                                }
                                
                                if isValidatingEmail {
                                    HStack(spacing: 8) {
                                        ProgressView()
                                            .scaleEffect(0.8)
                                        Text("Checking email...")
                                            .font(.system(size: 12))
                                            .foregroundColor(LunaraColors.secondaryText)
                                    }
                                } else if let emailError = emailError {
                                    Text(emailError)
                                        .font(.system(size: 12))
                                        .foregroundColor(LunaraColors.error)
                                }

                                // User status indicator
                                if let userResponse = userExistsResponse {
                                    if userResponse.exists, let firstName = userResponse.firstName, let lastName = userResponse.lastName {
                                        HStack(spacing: 8) {
                                            Image(systemName: "person.circle.fill")
                                                .foregroundColor(LunaraColors.warmGold)
                                                .font(.system(size: 14))
                                            Text("**\(firstName) \(lastName)** will be invited to join your team")
                                                .font(.system(size: 12))
                                                .foregroundColor(LunaraColors.primaryText)
                                        }
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 8)
                                        .background(LunaraColors.warmGold.opacity(0.1))
                                        .cornerRadius(8)
                                    } else if !userResponse.exists {
                                        HStack(spacing: 8) {
                                            Image(systemName: "envelope.circle.fill")
                                                .foregroundColor(.orange)
                                                .font(.system(size: 14))
                                            Text("This user will receive an invitation to create an account and join your team")
                                                .font(.system(size: 12))
                                                .foregroundColor(LunaraColors.primaryText)
                                        }
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 8)
                                        .background(Color.orange.opacity(0.1))
                                        .cornerRadius(8)
                                    }
                                }
                            }
                            


                        }
                        
                        // Professional Information Section
                        sectionHeader("Professional Information")
                        
                        VStack(spacing: 16) {
                            FormFieldView(
                                title: "Bio",
                                text: $bio,
                                placeholder: "Brief description of experience and skills...",
                                isMultiline: true
                            )
                            
                            // Specialties
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Specialties")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(LunaraColors.primaryText)
                                
                                // Add specialty field
                                HStack {
                                    TextField("Add specialty", text: $newSpecialty)
                                        .textFieldStyle(RoundedBorderTextFieldStyle())
                                    
                                    Button("Add") {
                                        addSpecialty()
                                    }
                                    .disabled(newSpecialty.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                                    .foregroundColor(LunaraColors.warmGold)
                                }
                                
                                // Specialties list
                                if !specialties.isEmpty {
                                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2), spacing: 8) {
                                        ForEach(specialties, id: \.self) { specialty in
                                            HStack {
                                                Text(specialty)
                                                    .font(.system(size: 12))
                                                    .foregroundColor(LunaraColors.primaryText)
                                                
                                                Spacer()
                                                
                                                Button(action: {
                                                    removeSpecialty(specialty)
                                                }) {
                                                    Image(systemName: "xmark.circle.fill")
                                                        .foregroundColor(LunaraColors.error)
                                                        .font(.system(size: 14))
                                                }
                                            }
                                            .padding(.horizontal, 12)
                                            .padding(.vertical, 6)
                                            .background(LunaraColors.coolLightGray.opacity(0.5))
                                            .cornerRadius(8)
                                        }
                                    }
                                }
                            }
                            
                            HStack(spacing: 12) {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Years of Experience")
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundColor(LunaraColors.primaryText)
                                    
                                    Stepper(value: $yearsExperience, in: 0...50) {
                                        Text("\(yearsExperience) years")
                                            .font(.system(size: 16))
                                            .foregroundColor(LunaraColors.primaryText)
                                    }
                                }
                                
                                FormFieldView(
                                    title: "Hourly Rate ($)",
                                    text: $hourlyRate,
                                    placeholder: "50",
                                    keyboardType: .decimalPad
                                )
                            }
                            
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Commission Rate (\(max(0, min(100, Int((commissionRate * 100).rounded()))))%)")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(LunaraColors.primaryText)
                                
                                Slider(value: $commissionRate, in: 0...1, step: 0.05)
                                    .tint(LunaraColors.warmGold)
                            }
                        }
                    }
                    
                    // Send Invitation Button
                    Button(action: {
                        print("🔘 Button tapped!")
                        sendInvitation()
                    }) {
                        HStack {
                            if isLoading {
                                ProgressView()
                                    .scaleEffect(0.8)
                                    .tint(.white)
                            }
                            
                            Text(isLoading ? "Sending..." : "Send Invitation")
                                .font(.system(size: 16, weight: .medium))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            isFormValid ? LunaraColors.warmGold : LunaraColors.charcoalGray.opacity(0.3)
                        )
                        .cornerRadius(12)
                    }
                    .disabled(!isFormValid || isLoading)
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 32)
            }
            .navigationTitle("Invite Employee")
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
            Text(errorMessage ?? "An error occurred")
        }
        .alert("Success", isPresented: $showingSuccess) {
            Button("OK") {
                dismiss()
                onEmployeeInvited()
            }
        } message: {
            Text(successMessage)
        }
    }
    
    // MARK: - Section Header
    private func sectionHeader(_ title: String) -> some View {
        HStack {
            Text(title)
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            Spacer()
        }
    }
    
    // MARK: - Form Validation
    private var isFormValid: Bool {
        !email.isEmpty &&
        emailError == nil &&
        !isValidatingEmail
    }
    
    // MARK: - Methods
    private func addSpecialty() {
        let trimmedSpecialty = newSpecialty.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedSpecialty.isEmpty && !specialties.contains(trimmedSpecialty) {
            specialties.append(trimmedSpecialty)
            newSpecialty = ""
        }
    }
    
    private func removeSpecialty(_ specialty: String) {
        specialties.removeAll { $0 == specialty }
    }
    
    private func validateEmail(_ email: String) {
        guard !email.isEmpty else {
            emailError = nil
            isValidatingEmail = false
            return
        }

        // Basic email format validation
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)

        if !emailPredicate.evaluate(with: email) {
            emailError = "Please enter a valid email address"
            isValidatingEmail = false
            return
        }

        // Check if user exists (debounced)
        isValidatingEmail = true
        emailError = nil
        userExistsResponse = nil

        Task {
            do {
                try await Task.sleep(nanoseconds: 800_000_000) // 0.8 second debounce (matching web app)

                // Only validate if email hasn't changed
                guard email == self.email else {
                    await MainActor.run {
                        isValidatingEmail = false
                    }
                    return
                }

                let response = try await APIClient.shared.checkUserExists(email: email)
                await MainActor.run {
                    isValidatingEmail = false
                    userExistsResponse = response
                    emailError = nil // No error - we show status in the indicator instead
                }
            } catch {
                await MainActor.run {
                    isValidatingEmail = false
                    userExistsResponse = nil
                    // Don't set emailError for network issues - allow form to be valid
                    print("⚠️ Email validation failed: \(error.localizedDescription)")
                }
            }
        }
    }
    
    private func sendInvitation() {
        print("🚀 sendInvitation() called")
        print("🔍 Form validation state:")
        print("   - email: '\(email)'")
        print("   - email.isEmpty: \(!email.isEmpty)")
        print("   - emailError: \(String(describing: emailError))")
        print("   - isValidatingEmail: \(isValidatingEmail)")
        print("   - isFormValid: \(isFormValid)")
        print("   - isLoading: \(isLoading)")

        guard isFormValid && !isLoading else {
            print("❌ Form validation failed or already loading")
            return
        }

        isLoading = true
        errorMessage = nil

        let request = EmployeeInvitationRequest(
            email: email,
            bio: bio.isEmpty ? nil : bio,
            specialties: specialties.isEmpty ? nil : specialties.joined(separator: ", "),
            yearsExperience: yearsExperience,
            hourlyRate: hourlyRate.isEmpty ? nil : Double(hourlyRate),
            commissionRate: commissionRate
        )

        print("📤 Sending invitation request...")

        Task {
            do {
                // First test connection to backend
                print("🧪 Testing backend connection before invitation...")
                let connectionStatus = try await APIClient.shared.testConnection()
                print("✅ Backend connection test result: \(connectionStatus)")

                // Debug: Check user authentication and role
                let authService = AuthenticationService.shared
                print("🔍 User authenticated: \(authService.isAuthenticated)")
                if let user = authService.user {
                    print("🔍 User ID: \(user.id)")
                    print("🔍 User role: \(user.role)")
                    print("🔍 User email: \(user.email)")
                } else {
                    print("🔍 No user found in auth service")
                }

                // Debug: Check shop ownership
                print("🔍 Shop ID: \(shop.id)")
                print("🔍 Shop name: \(shop.name)")
                print("🔍 Shop owner ID: \(shop.owner.id)")
                print("🔍 Shop owner email: \(shop.owner.email)")
                print("🔍 Shop owner role: \(shop.owner.role)")

                // Check ID match
                if let user = authService.user {
                    print("🔍 ID Match: \(user.id == shop.owner.id ? "✅ YES" : "❌ NO")")
                    print("🔍 Email Match: \(user.email == shop.owner.email ? "✅ YES" : "❌ NO")")
                }



                // Check if current user owns this shop
                if let currentUser = authService.user {
                    if currentUser.email != shop.owner.email {
                        throw APIError.clientError("You can only invite employees to shops you own. This shop is owned by \(shop.owner.email), but you are logged in as \(currentUser.email).")
                    }
                } else {
                    throw APIError.unauthorized
                }

                _ = try await shopService.inviteEmployee(shopId: shop.id, request)
                await MainActor.run {
                    isLoading = false

                    // Use user's name if available, otherwise use email
                    let userName = userExistsResponse?.exists == true &&
                                  userExistsResponse?.firstName != nil &&
                                  userExistsResponse?.lastName != nil
                        ? "\(userExistsResponse!.firstName!) \(userExistsResponse!.lastName!)"
                        : email

                    successMessage = "An invitation has been sent to \(userName) to join your team."
                    showingSuccess = true
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    print("❌ Employee invitation failed: \(error)")

                    // Provide more specific error messages
                    if let apiError = error as? APIError {
                        switch apiError {
                        case .forbidden:
                            errorMessage = "You don't have permission to invite employees to this shop. Please make sure you are the shop owner."
                        case .unauthorized:
                            errorMessage = "Please log in to invite employees."
                        case .clientError(let message):
                            errorMessage = message
                        default:
                            errorMessage = apiError.localizedDescription
                        }
                    } else {
                        errorMessage = error.localizedDescription
                    }
                    showingError = true
                }
            }
        }
    }
}

#Preview {
    EmployeeInvitationView(shop: Shop.preview) {
        print("Employee invited")
    }
}
