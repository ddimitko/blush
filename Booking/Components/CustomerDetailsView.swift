//
//  CustomerDetailsView.swift
//  LunaraApp
//
//  Created by Lunara Team on 23/07/2025.
//

import SwiftUI

/// View for collecting customer details during the booking flow
struct CustomerDetailsView: View {
    // MARK: - Properties
    let isAuthenticated: Bool
    let user: User?
    let onDetailsCompleted: (CustomerDetails) -> Void
    
    // MARK: - State
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var notes = ""
    @State private var isValidForm = false
    @State private var showingValidationErrors = false

    // Smart suggestions for auto-completion
    @State private var smartNameSuggestions: [String] = ["John", "Jane", "Michael", "Sarah", "David", "Emily"]
    @State private var smartLastNameSuggestions: [String] = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia"]
    @State private var smartEmailSuggestions: [String] = []
    
    // MARK: - Focus State
    @FocusState private var focusedField: Field?
    
    enum Field {
        case firstName, lastName, email, phone, notes
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                headerSection
                
                // Form
                formSection
                
                // Notes Section
                notesSection
                
                // Continue Button
                continueButton
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 32)
        }
        .onAppear {
            setupInitialData()
        }
        .onChange(of: firstName) { _, _ in validateForm() }
        .onChange(of: lastName) { _, _ in validateForm() }
        .onChange(of: email) { _, _ in validateForm() }
        .onChange(of: phone) { _, _ in validateForm() }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        VStack(spacing: 16) {
            // Title and Description
            VStack(spacing: 8) {
                Text("Your Details")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                
                if isAuthenticated {
                    Text("Please confirm your contact information")
                        .font(.system(size: 16))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)
                } else {
                    Text("We need your contact information to confirm your appointment")
                        .font(.system(size: 16))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)
                }
            }
            
            // Authentication Status
            if isAuthenticated {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(LunaraColors.warmGold)
                    
                    Text("Signed in as \(user?.firstName ?? "User")")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 8)
                        .fill(LunaraColors.warmGold.opacity(0.1))
                )
            } else {
                HStack(spacing: 8) {
                    Image(systemName: "person.circle")
                        .foregroundColor(LunaraColors.secondaryText)
                    
                    Text("Booking as guest")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 8)
                        .fill(LunaraColors.coolLightGray.opacity(0.5))
                )
            }
        }
    }
    
    // MARK: - Form Section
    private var formSection: some View {
        VStack(spacing: 16) {
            // Name Fields
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("First Name")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    TextField("Enter first name", text: $firstName)
                        .textFieldStyle(CustomTextFieldStyle())
                        .focused($focusedField, equals: .firstName)
                        .textContentType(.givenName)
                        .autocapitalization(.words)
                }
                
                VStack(alignment: .leading, spacing: 8) {
                    Text("Last Name")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    TextField("Enter last name", text: $lastName)
                        .textFieldStyle(CustomTextFieldStyle())
                        .focused($focusedField, equals: .lastName)
                        .textContentType(.familyName)
                        .autocapitalization(.words)
                }
            }
            
            // Email Field
            VStack(alignment: .leading, spacing: 8) {
                Text("Email Address")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.primaryText)
                
                TextField("Enter email address", text: $email)
                    .textFieldStyle(CustomTextFieldStyle())
                    .focused($focusedField, equals: .email)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
                    .autocorrectionDisabled()
            }
            
            // Phone Field
            VStack(alignment: .leading, spacing: 8) {
                Text("Phone Number")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.primaryText)
                
                TextField("Enter phone number", text: $phone)
                    .textFieldStyle(CustomTextFieldStyle())
                    .focused($focusedField, equals: .phone)
                    .textContentType(.telephoneNumber)
                    .keyboardType(.phonePad)
            }
            
            // Validation Errors
            if showingValidationErrors {
                validationErrorsView
            }
        }
    }
    
    // MARK: - Notes Section
    private var notesSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Special Requests (Optional)")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(LunaraColors.primaryText)
            
            TextField("Any special requests or notes for your appointment...", text: $notes, axis: .vertical)
                .textFieldStyle(CustomTextFieldStyle(minHeight: 80))
                .focused($focusedField, equals: .notes)
                .lineLimit(3...6)
        }
    }
    
    // MARK: - Continue Button
    private var continueButton: some View {
        Button(action: handleContinue) {
            Text("Continue to Payment")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(LunaraColors.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(isValidForm ? LunaraColors.warmGold : LunaraColors.coolLightGray)
                )
        }
        .disabled(!isValidForm)
        .animation(.easeInOut(duration: 0.2), value: isValidForm)
    }
    
    // MARK: - Validation Errors View
    private var validationErrorsView: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(validationErrors, id: \.self) { error in
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.circle.fill")
                        .foregroundColor(.red)
                        .font(.system(size: 12))
                    
                    Text(error)
                        .font(.system(size: 12))
                        .foregroundColor(.red)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.red.opacity(0.1))
        )
    }
    
    // MARK: - Computed Properties
    
    private var validationErrors: [String] {
        var errors: [String] = []
        
        if firstName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors.append("First name is required")
        }
        
        if lastName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors.append("Last name is required")
        }
        
        if email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors.append("Email address is required")
        } else if !isValidEmail(email) {
            errors.append("Please enter a valid email address")
        }
        
        if phone.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors.append("Phone number is required")
        } else if !isValidPhone(phone) {
            errors.append("Please enter a valid phone number")
        }
        
        return errors
    }
    
    // MARK: - Private Methods
    
    private func setupInitialData() {
        if let user = user {
            firstName = user.firstName
            lastName = user.lastName
            email = user.email
            phone = user.phone ?? ""
        }
        validateForm()
    }
    
    private func validateForm() {
        isValidForm = validationErrors.isEmpty
    }
    
    private func handleContinue() {
        if !isValidForm {
            showingValidationErrors = true
            return
        }
        
        let customerDetails = CustomerDetails(
            firstName: firstName.trimmingCharacters(in: .whitespacesAndNewlines),
            lastName: lastName.trimmingCharacters(in: .whitespacesAndNewlines),
            email: email.trimmingCharacters(in: .whitespacesAndNewlines),
            phone: phone.trimmingCharacters(in: .whitespacesAndNewlines),
            notes: notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : notes.trimmingCharacters(in: .whitespacesAndNewlines)
        )
        
        onDetailsCompleted(customerDetails)
    }
    
    private func isValidEmail(_ email: String) -> Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }
    
    private func isValidPhone(_ phone: String) -> Bool {
        let phoneRegex = "^[+]?[0-9]{10,15}$"
        let phonePredicate = NSPredicate(format: "SELF MATCHES %@", phoneRegex)
        return phonePredicate.evaluate(with: phone.replacingOccurrences(of: " ", with: "").replacingOccurrences(of: "-", with: "").replacingOccurrences(of: "(", with: "").replacingOccurrences(of: ")", with: ""))
    }
}

// MARK: - Custom Text Field Style
struct CustomTextFieldStyle: TextFieldStyle {
    let minHeight: CGFloat
    
    init(minHeight: CGFloat = 44) {
        self.minHeight = minHeight
    }
    
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .frame(minHeight: minHeight)
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .fill(LunaraColors.white)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(LunaraColors.coolLightGray, lineWidth: 1)
                    )
            )
    }
}

// MARK: - Preview
struct CustomerDetailsView_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            CustomerDetailsView(
                isAuthenticated: true,
                user: User.preview,
                onDetailsCompleted: { _ in }
            )
            .previewDisplayName("Authenticated User")
            
            CustomerDetailsView(
                isAuthenticated: false,
                user: nil,
                onDetailsCompleted: { _ in }
            )
            .previewDisplayName("Guest User")
        }
    }
}
