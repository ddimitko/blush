//
//  RegisterView.swift
//  LunaraApp
//
//  Created by Lunara Team on 14/07/2025.
//

import SwiftUI

/// Registration form view for new users
struct RegisterView: View {
    // MARK: - Environment Objects
    @EnvironmentObject var authService: AuthenticationService
    
    // MARK: - State
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var showPassword = false
    @State private var showConfirmPassword = false
    @State private var isLoading = false
    @State private var agreedToTerms = false
    
    // MARK: - Focus State
    @FocusState private var focusedField: Field?
    
    enum Field {
        case firstName, lastName, email, phone, password, confirmPassword
    }
    
    var body: some View {
        VStack(spacing: 24) {
            // Form Fields
            VStack(spacing: 16) {
                // Name Fields
                HStack(spacing: 12) {
                    LunaraTextField(
                        title: "First Name",
                        text: $firstName,
                        placeholder: "First name",
                        textContentType: .givenName
                    )
                    .focused($focusedField, equals: .firstName)
                    .onSubmit {
                        focusedField = .lastName
                    }
                    
                    LunaraTextField(
                        title: "Last Name",
                        text: $lastName,
                        placeholder: "Last name",
                        textContentType: .familyName
                    )
                    .focused($focusedField, equals: .lastName)
                    .onSubmit {
                        focusedField = .email
                    }
                }
                
                // Email Field
                LunaraTextField(
                    title: "Email",
                    text: $email,
                    placeholder: "Enter your email",
                    keyboardType: .emailAddress,
                    textContentType: .emailAddress,
                    autocapitalization: .never
                )
                .focused($focusedField, equals: .email)
                .onSubmit {
                    focusedField = .phone
                }
                
                // Phone Field
                LunaraTextField(
                    title: "Phone Number",
                    text: $phone,
                    placeholder: "+359888123456",
                    keyboardType: .phonePad,
                    textContentType: .telephoneNumber
                )
                .focused($focusedField, equals: .phone)
                .onSubmit {
                    focusedField = .password
                }
                .onChange(of: phone) { _, newValue in
                    // Format phone number to ensure it starts with +
                    phone = formatPhoneNumber(newValue)
                }
                
                // Password Field
                LunaraSecureField(
                    title: "Password",
                    text: $password,
                    placeholder: "Create a password",
                    showPassword: $showPassword
                )
                .focused($focusedField, equals: .password)
                .onSubmit {
                    focusedField = .confirmPassword
                }
                
                // Confirm Password Field
                LunaraSecureField(
                    title: "Confirm Password",
                    text: $confirmPassword,
                    placeholder: "Confirm your password",
                    showPassword: $showConfirmPassword
                )
                .focused($focusedField, equals: .confirmPassword)
                .onSubmit {
                    Task {
                        await handleRegister()
                    }
                }
                
                // Password Requirements
                passwordRequirements
            }
            
            // Terms and Conditions
            termsSection
            
            // Error Message
            if let errorMessage = authService.errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundColor(LunaraColors.error)
                    .multilineTextAlignment(.center)
                    .transition(.opacity)
            }
            
            // Register Button
            LunaraButton(
                title: "Create Account",
                isLoading: isLoading,
                action: {
                    Task {
                        await handleRegister()
                    }
                }
            )
            .disabled(!isFormValid || isLoading)
        }
        .onAppear {
            authService.clearError()
        }
        .onChange(of: authService.isLoading) { _, newValue in
            isLoading = newValue
        }
    }
    
    // MARK: - Password Requirements
    private var passwordRequirements: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Password must contain:")
                .font(.caption)
                .foregroundColor(LunaraColors.secondaryText)
            
            HStack(spacing: 8) {
                Image(systemName: password.count >= 8 ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(password.count >= 8 ? LunaraColors.success : LunaraColors.secondaryText)
                    .font(.caption)
                
                Text("At least 8 characters")
                    .font(.caption)
                    .foregroundColor(LunaraColors.secondaryText)
            }
            
            HStack(spacing: 8) {
                Image(systemName: hasUppercase ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(hasUppercase ? LunaraColors.success : LunaraColors.secondaryText)
                    .font(.caption)
                
                Text("One uppercase letter")
                    .font(.caption)
                    .foregroundColor(LunaraColors.secondaryText)
            }
            
            HStack(spacing: 8) {
                Image(systemName: hasLowercase ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(hasLowercase ? LunaraColors.success : LunaraColors.secondaryText)
                    .font(.caption)
                
                Text("One lowercase letter")
                    .font(.caption)
                    .foregroundColor(LunaraColors.secondaryText)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    
    // MARK: - Terms Section
    private var termsSection: some View {
        HStack(alignment: .top, spacing: 12) {
            Button(action: {
                agreedToTerms.toggle()
            }) {
                Image(systemName: agreedToTerms ? "checkmark.square.fill" : "square")
                    .foregroundColor(agreedToTerms ? LunaraColors.warmGold : LunaraColors.secondaryText)
                    .font(.system(size: 18))
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text("I agree to the Terms of Service and Privacy Policy")
                    .font(.system(size: 14, weight: .regular))
                    .foregroundColor(LunaraColors.primaryText)
                
                HStack(spacing: 16) {
                    Button("Terms of Service") {
                        // Open terms
                    }
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(LunaraColors.warmGold)
                    
                    Button("Privacy Policy") {
                        // Open privacy policy
                    }
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(LunaraColors.warmGold)
                }
            }
            
            Spacer()
        }
    }
    
    // MARK: - Computed Properties
    private var isFormValid: Bool {
        return !firstName.isEmpty &&
               !lastName.isEmpty &&
               !email.isEmpty &&
               email.contains("@") &&
               !phone.isEmpty &&
               isPhoneValid &&
               isPasswordValid &&
               password == confirmPassword &&
               agreedToTerms
    }

    private var isPhoneValid: Bool {
        // Validate phone number format: +[1-9][1-14 digits]
        let phoneRegex = "^\\+[1-9]\\d{1,14}$"
        let phonePredicate = NSPredicate(format: "SELF MATCHES %@", phoneRegex)
        return phonePredicate.evaluate(with: phone)
    }
    
    private var isPasswordValid: Bool {
        return password.count >= 8 && hasUppercase && hasLowercase
    }
    
    private var hasUppercase: Bool {
        return password.range(of: "[A-Z]", options: .regularExpression) != nil
    }
    
    private var hasLowercase: Bool {
        return password.range(of: "[a-z]", options: .regularExpression) != nil
    }
    
    // MARK: - Methods
    private func formatPhoneNumber(_ input: String) -> String {
        // Remove all non-digit characters except +
        let cleaned = input.replacingOccurrences(of: "[^+\\d]", with: "", options: .regularExpression)

        // If it doesn't start with +, add +359 (Bulgaria) as default
        if !cleaned.hasPrefix("+") {
            // Remove leading zeros and add +359
            let digitsOnly = cleaned.replacingOccurrences(of: "^0+", with: "", options: .regularExpression)
            if !digitsOnly.isEmpty {
                return "+359" + digitsOnly
            }
            return cleaned
        }

        return cleaned
    }

    private func handleRegister() async {
        // Clear any existing errors
        await MainActor.run {
            authService.clearError()
            focusedField = nil
        }
        
        // Validate passwords match
        guard password == confirmPassword else {
            await MainActor.run {
                authService.errorMessage = "Passwords do not match"
            }
            return
        }
        
        do {
            try await authService.register(
                email: email,
                password: password,
                firstName: firstName,
                lastName: lastName,
                phone: phone
            )
            
        } catch {
            // Error is handled by the AuthenticationService
            print("Registration failed: \(error)")
        }
    }
}

// MARK: - Preview
struct RegisterView_Previews: PreviewProvider {
    static var previews: some View {
        RegisterView()
            .environmentObject(AuthenticationService.shared)
            .padding()
    }
}
