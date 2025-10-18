//
//  LoginView.swift
//  LunaraApp
//
//  Created by Lunara Team on 14/07/2025.
//

import SwiftUI

/// Login form view with email and password fields
struct LoginView: View {
    // MARK: - Environment Objects
    @EnvironmentObject var authService: AuthenticationService
    
    // MARK: - State
    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false
    @State private var isLoading = false
    @State private var isFacebookLoading = false

    
    // MARK: - Focus State
    @FocusState private var focusedField: Field?
    
    enum Field {
        case email, password
    }
    
    var body: some View {
        VStack(spacing: 24) {
            // Form Fields
            VStack(spacing: 16) {
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
                    focusedField = .password
                }
                
                // Password Field
                LunaraSecureField(
                    title: "Password",
                    text: $password,
                    placeholder: "Enter your password",
                    showPassword: $showPassword
                )
                .focused($focusedField, equals: .password)
                .onSubmit {
                    Task {
                        await handleLogin()
                    }
                }
            }
            
            // Error Message
            if let errorMessage = authService.errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundColor(LunaraColors.error)
                    .multilineTextAlignment(.center)
                    .transition(.opacity)
            }
            
            // Login Button
            LunaraButton(
                title: "Sign In",
                isLoading: isLoading,
                action: {
                    Task {
                        await handleLogin()
                    }
                }
            )
            .disabled(!isFormValid || isLoading)

            // Divider with "OR"
            HStack {
                Rectangle()
                    .frame(height: 1)
                    .foregroundColor(LunaraColors.charcoalGray.opacity(0.2))

                Text("OR")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(LunaraColors.charcoalGray.opacity(0.6))
                    .padding(.horizontal, 16)

                Rectangle()
                    .frame(height: 1)
                    .foregroundColor(LunaraColors.charcoalGray.opacity(0.2))
            }
            .padding(.vertical, 8)

            // Facebook Login Button
            Button(action: {
                Task {
                    await handleFacebookLogin()
                }
            }) {
                HStack(spacing: 12) {
                    if isFacebookLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .scaleEffect(0.8)
                    } else {
                        Image(systemName: "f.square.fill")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(.white)
                    }

                    Text(isFacebookLoading ? "Connecting..." : "Continue with Facebook")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color(red: 24/255, green: 119/255, blue: 242/255)) // Facebook blue
                .cornerRadius(12)
            }
            .disabled(isLoading || isFacebookLoading)

            // Continue as Guest
            Button(action: {
                authService.continueAsGuest()
            }) {
                HStack(spacing: 8) {
                    Image(systemName: "person.crop.circle")
                        .font(.system(size: 16, weight: .medium))

                    Text("Continue as Guest")
                        .font(.system(size: 16, weight: .medium))
                }
                .foregroundColor(LunaraColors.charcoalGray)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(LunaraColors.coolLightGray)
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(LunaraColors.charcoalGray.opacity(0.2), lineWidth: 1)
                )
            }
            .disabled(isLoading || isFacebookLoading)

            // Forgot Password
            Button("Forgot Password?") {
                // TODO: Implement forgot password
            }
            .font(.system(size: 14, weight: .medium))
            .foregroundColor(LunaraColors.warmGold)
        }
        .onAppear {
            authService.clearError()
        }
        .onChange(of: authService.isLoading) { _, newValue in
            isLoading = newValue
        }
        .onChange(of: FacebookAuthService.shared.isLoading) { _, newValue in
            isFacebookLoading = newValue
        }
    }
    
    // MARK: - Computed Properties
    private var isFormValid: Bool {
        return !email.isEmpty && 
               !password.isEmpty && 
               email.contains("@") && 
               password.count >= 8
    }

    
    // MARK: - Methods
    private func handleLogin() async {
        // Clear any existing errors
        await MainActor.run {
            authService.clearError()
            focusedField = nil
        }
        
        do {
            try await authService.login(email: email, password: password)
            

            
        } catch {
            // Error is handled by the AuthenticationService
            print("Login failed: \(error)")
        }
    }

    private func handleFacebookLogin() async {
        // Clear any existing errors
        await MainActor.run {
            authService.clearError()
            focusedField = nil
            isFacebookLoading = true
        }

        do {
            try await authService.loginWithFacebook()

            await MainActor.run {
                isFacebookLoading = false
            }

        } catch {
            await MainActor.run {
                isFacebookLoading = false
            }
            // Error is handled by the AuthenticationService
            print("Facebook login failed: \(error)")
        }
    }

}

// MARK: - Lunara Text Field
struct LunaraTextField: View {
    let title: String
    @Binding var text: String
    let placeholder: String
    var keyboardType: UIKeyboardType = .default
    var textContentType: UITextContentType? = nil
    var autocapitalization: TextInputAutocapitalization = .sentences
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(LunaraColors.charcoalGray)
            
            TextField(placeholder, text: $text)
                .textFieldStyle(LunaraTextFieldStyle())
                .keyboardType(keyboardType)
                .textContentType(textContentType)
                .textInputAutocapitalization(autocapitalization)
        }
    }
}

// MARK: - Lunara Secure Field
struct LunaraSecureField: View {
    let title: String
    @Binding var text: String
    let placeholder: String
    @Binding var showPassword: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(LunaraColors.charcoalGray)
            
            HStack {
                if showPassword {
                    TextField(placeholder, text: $text)
                        .textContentType(.password)
                } else {
                    SecureField(placeholder, text: $text)
                        .textContentType(.password)
                }
                
                Button(action: {
                    showPassword.toggle()
                }) {
                    Image(systemName: showPassword ? "eye.slash" : "eye")
                        .foregroundColor(LunaraColors.charcoalGray.opacity(0.6))
                }
            }
            .textFieldStyle(LunaraTextFieldStyle())
        }
    }
}

// MARK: - Lunara Text Field Style
struct LunaraTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(LunaraColors.inputBackground)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(LunaraColors.inputBorder, lineWidth: 1)
            )
    }
}

// MARK: - Lunara Button
struct LunaraButton: View {
    let title: String
    var isLoading: Bool = false
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: LunaraColors.buttonPrimaryText))
                        .scaleEffect(0.8)
                } else {
                    Text(title)
                        .font(.system(size: 16, weight: .semibold))
                }
            }
            .foregroundColor(LunaraColors.buttonPrimaryText)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(LunaraColors.buttonPrimary)
            .cornerRadius(12)
        }
        .disabled(isLoading)
    }
}

// MARK: - Preview
struct LoginView_Previews: PreviewProvider {
    static var previews: some View {
        LoginView()
            .environmentObject(AuthenticationService.shared)
            .padding()
    }
}
