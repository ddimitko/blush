//
//  StripeConnectSetupView.swift
//  LunaraApp
//
//  Created by Lunara Team on 27/07/2025.
//

import SwiftUI
import Network

/// Stripe Connect setup form view
struct StripeConnectSetupView: View {
    // MARK: - Properties
    let shop: Shop
    let onSetupComplete: (Bool) -> Void
    
    // MARK: - State
    @StateObject private var stripeService = StripeConnectService.shared
    @State private var businessType: BusinessType = .company
    @State private var isLoading = false
    @State private var showingError = false
    @State private var errorMessage: String?
    
    // Business Information
    @State private var businessName: String = ""
    @State private var businessEmail: String = ""
    @State private var businessPhone: String = ""
    @State private var businessWebsite: String = ""
    @State private var businessAddress: String = ""
    @State private var businessCity: String = ""
    @State private var businessState: String = ""
    @State private var businessPostalCode: String = ""
    @State private var businessCountry: String = "BG"
    
    // Individual Information (for individual business type)
    @State private var firstName: String = ""
    @State private var lastName: String = ""
    @State private var email: String = ""
    @State private var phone: String = ""
    @State private var birthDay: Int = 1
    @State private var birthMonth: Int = 1
    @State private var birthYear: Int = 1990
    
    // Company Information (for company business type)
    @State private var companyName: String = ""
    @State private var taxId: String = ""
    @State private var companyPhone: String = ""
    @State private var companyStructure: String = "private_corporation"
    
    // Bank Account Information
    @State private var accountNumber: String = ""
    @State private var routingNumber: String = ""
    @State private var accountHolderName: String = ""
    @State private var accountHolderType: String = "individual"
    
    // Terms acceptance
    @State private var hasAcceptedTerms = false
    
    enum BusinessType: String, CaseIterable {
        case individual = "individual"
        case company = "company"
        
        var displayName: String {
            switch self {
            case .individual:
                return "Individual"
            case .company:
                return "Company"
            }
        }
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                headerSection
                
                // Business Type Selection
                businessTypeSection
                
                // Business Information
                businessInformationSection
                
                // Individual/Company specific information
                if businessType == .individual {
                    individualInformationSection
                } else {
                    companyInformationSection
                }
                
                // Bank Account Information
                bankAccountSection
                
                // Terms and Conditions
                termsSection
                
                // Submit Button
                submitButton
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 32)
        }
        .onAppear {
            prefillBusinessInformation()
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage ?? "An error occurred")
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        VStack(spacing: 12) {
            Text("Business Information")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(LunaraColors.primaryText)
            
            Text("Please provide your business details to set up payment processing.")
                .font(.system(size: 14))
                .foregroundColor(LunaraColors.secondaryText)
                .multilineTextAlignment(.center)
        }
        .padding(.top, 16)
    }
    
    // MARK: - Business Type Section
    private var businessTypeSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Business Type")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            Picker("Business Type", selection: $businessType) {
                ForEach(BusinessType.allCases, id: \.self) { type in
                    Text(type.displayName).tag(type)
                }
            }
            .pickerStyle(SegmentedPickerStyle())
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Business Information Section
    private var businessInformationSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Business Details")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            VStack(spacing: 12) {
                CustomTextField(
                    title: "Business Name",
                    text: $businessName,
                    placeholder: "Enter business name"
                )
                
                CustomTextField(
                    title: "Business Email",
                    text: $businessEmail,
                    placeholder: "business@example.com",
                    validationMessage: "Please enter a valid email address",
                    isValid: businessEmail.isEmpty || isValidEmail(businessEmail)
                )
                .keyboardType(.emailAddress)
                .autocapitalization(.none)

                CustomTextField(
                    title: "Business Phone",
                    text: $businessPhone,
                    placeholder: "+359 XX XXX XXXX"
                )
                .keyboardType(.phonePad)

                CustomTextField(
                    title: "Website (Optional)",
                    text: $businessWebsite,
                    placeholder: "https://example.com",
                    isRequired: false,
                    validationMessage: "Please enter a valid URL (e.g., https://example.com)",
                    isValid: businessWebsite.isEmpty || isValidURL(businessWebsite.hasPrefix("http") ? businessWebsite : "https://\(businessWebsite)")
                )
                .keyboardType(.URL)
                .autocapitalization(.none)
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Individual Information Section
    private var individualInformationSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Personal Information")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            VStack(spacing: 12) {
                HStack(spacing: 12) {
                    CustomTextField(
                        title: "First Name",
                        text: $firstName,
                        placeholder: "First name"
                    )
                    
                    CustomTextField(
                        title: "Last Name",
                        text: $lastName,
                        placeholder: "Last name"
                    )
                }
                
                CustomTextField(
                    title: "Email",
                    text: $email,
                    placeholder: "personal@example.com",
                    validationMessage: "Please enter a valid email address",
                    isValid: email.isEmpty || isValidEmail(email)
                )
                .keyboardType(.emailAddress)
                .autocapitalization(.none)
                
                CustomTextField(
                    title: "Phone",
                    text: $phone,
                    placeholder: "+359 XX XXX XXXX"
                )
                .keyboardType(.phonePad)
                
                // Date of Birth
                VStack(alignment: .leading, spacing: 8) {
                    Text("Date of Birth")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    HStack(spacing: 12) {
                        Picker("Day", selection: $birthDay) {
                            ForEach(1...31, id: \.self) { day in
                                Text("\(day)").tag(day)
                            }
                        }
                        .pickerStyle(WheelPickerStyle())
                        .frame(maxWidth: .infinity)
                        .clipped()
                        
                        Picker("Month", selection: $birthMonth) {
                            ForEach(1...12, id: \.self) { month in
                                Text("\(month)").tag(month)
                            }
                        }
                        .pickerStyle(WheelPickerStyle())
                        .frame(maxWidth: .infinity)
                        .clipped()
                        
                        Picker("Year", selection: $birthYear) {
                            ForEach(1950...2005, id: \.self) { year in
                                Text("\(year)").tag(year)
                            }
                        }
                        .pickerStyle(WheelPickerStyle())
                        .frame(maxWidth: .infinity)
                        .clipped()
                    }
                    .frame(height: 120)
                }
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Company Information Section
    private var companyInformationSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Company Information")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            VStack(spacing: 12) {
                CustomTextField(
                    title: "Company Name",
                    text: $companyName,
                    placeholder: "Company legal name"
                )
                
                CustomTextField(
                    title: "Tax ID (Optional)",
                    text: $taxId,
                    placeholder: "Company tax identification"
                )
                
                CustomTextField(
                    title: "Company Phone",
                    text: $companyPhone,
                    placeholder: "+359 XX XXX XXXX"
                )
                .keyboardType(.phonePad)
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Bank Account Section
    private var bankAccountSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Bank Account Information")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)

            // Information note for Bulgarian accounts
            if businessCountry == "BG" {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "info.circle.fill")
                            .foregroundColor(LunaraColors.info)

                        Text("Bulgarian Bank Account")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(LunaraColors.info)
                    }

                    Text("Please provide your Bulgarian IBAN (22 characters starting with BG). You can find this on your bank statement or online banking.")
                        .font(.system(size: 12))
                        .foregroundColor(LunaraColors.secondaryText)
                }
                .padding(12)
                .background(LunaraColors.info.opacity(0.1))
                .cornerRadius(8)
            }

            VStack(spacing: 12) {
                CustomTextField(
                    title: "Account Holder Name",
                    text: $accountHolderName,
                    placeholder: "Full name as it appears on bank account"
                )

                CustomTextField(
                    title: businessCountry == "BG" ? "Bulgarian IBAN" : "Account Number (IBAN)",
                    text: $accountNumber,
                    placeholder: businessCountry == "BG" ? "BG80 BNBG 9661 1020 3456 78" : "Enter your IBAN",
                    validationMessage: businessCountry == "BG" ?
                        "Please enter a valid Bulgarian IBAN (22 characters)" :
                        "Please enter a valid IBAN",
                    isValid: accountNumber.isEmpty || isValidIBAN(accountNumber)
                )
                .textInputAutocapitalization(.characters)
                .onChange(of: accountNumber) { _, newValue in
                    // Format IBAN with spaces for better readability
                    let cleaned = newValue.replacingOccurrences(of: " ", with: "").uppercased()
                    if cleaned.count <= 34 { // Maximum IBAN length
                        let formatted = formatIBANForDisplay(cleaned)
                        if formatted != newValue {
                            accountNumber = formatted
                        }
                    }
                }

                if businessCountry != "BG" {
                    CustomTextField(
                        title: "Routing Number",
                        text: $routingNumber,
                        placeholder: "Bank routing number"
                    )
                }

                // Account holder type selection
                VStack(alignment: .leading, spacing: 8) {
                    Text("Account Holder Type")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)

                    Picker("Account Holder Type", selection: $accountHolderType) {
                        Text("Individual").tag("individual")
                        Text("Company").tag("company")
                    }
                    .pickerStyle(SegmentedPickerStyle())
                }
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Terms Section
    private var termsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                Button(action: {
                    hasAcceptedTerms.toggle()
                }) {
                    Image(systemName: hasAcceptedTerms ? "checkmark.square.fill" : "square")
                        .font(.system(size: 20))
                        .foregroundColor(hasAcceptedTerms ? LunaraColors.warmGold : LunaraColors.secondaryText)
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("I accept the Stripe Connected Account Agreement and authorize Lunara to create a Stripe account on my behalf.")
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    Text("By checking this box, you agree to Stripe's terms of service and privacy policy.")
                        .font(.system(size: 12))
                        .foregroundColor(LunaraColors.secondaryText)
                }
                
                Spacer()
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Submit Button
    private var submitButton: some View {
        VStack(spacing: 12) {
            // Show validation errors if form is invalid
            if !isFormValid && !validationErrors.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(LunaraColors.error)

                        Text("Please fix the following issues:")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(LunaraColors.error)
                    }

                    ForEach(validationErrors.prefix(5), id: \.self) { error in
                        Text("• \(error)")
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.error)
                    }

                    if validationErrors.count > 5 {
                        Text("• ... and \(validationErrors.count - 5) more")
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.error)
                    }
                }
                .padding(12)
                .background(LunaraColors.error.opacity(0.1))
                .cornerRadius(8)
            }

            Button(action: {
                submitSetup()
            }) {
                HStack {
                    if isLoading {
                        ProgressView()
                            .scaleEffect(0.8)
                            .tint(.white)
                    } else {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 20))
                    }

                    Text(isLoading ? "Setting up..." : "Complete Setup")
                        .font(.system(size: 18, weight: .semibold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(isFormValid ? LunaraColors.warmGold : LunaraColors.secondaryText)
                .cornerRadius(12)
            }
            .disabled(!isFormValid || isLoading)
        }
    }
    
    // MARK: - Computed Properties
    private var isFormValid: Bool {
        // Basic required fields
        guard !businessName.isEmpty,
              !businessEmail.isEmpty,
              !businessPhone.isEmpty,
              !businessAddress.isEmpty,
              !businessCity.isEmpty,
              !businessPostalCode.isEmpty,
              !accountHolderName.isEmpty,
              !accountNumber.isEmpty,
              hasAcceptedTerms else {
            return false
        }

        // Email validation
        guard isValidEmail(businessEmail) else {
            return false
        }

        // Website validation (if provided)
        if !businessWebsite.isEmpty && !isValidURL(businessWebsite) {
            return false
        }

        // Business type specific validation
        if businessType == .company {
            guard !companyName.isEmpty else {
                return false
            }
        } else {
            guard !firstName.isEmpty,
                  !lastName.isEmpty,
                  !email.isEmpty,
                  isValidEmail(email) else {
                return false
            }
        }

        // Bank account validation
        guard isValidIBAN(accountNumber) else {
            return false
        }

        return true
    }

    private var validationErrors: [String] {
        var errors: [String] = []

        if businessName.isEmpty {
            errors.append("Business name is required")
        }

        if businessEmail.isEmpty {
            errors.append("Business email is required")
        } else if !isValidEmail(businessEmail) {
            errors.append("Please enter a valid business email")
        }

        if businessPhone.isEmpty {
            errors.append("Business phone is required")
        }

        if businessAddress.isEmpty {
            errors.append("Business address is required")
        }

        if businessCity.isEmpty {
            errors.append("Business city is required")
        }

        if businessPostalCode.isEmpty {
            errors.append("Business postal code is required")
        }

        if !businessWebsite.isEmpty && !isValidURL(businessWebsite) {
            errors.append("Please enter a valid website URL (e.g., https://example.com)")
        }

        if businessType == .individual {
            if firstName.isEmpty {
                errors.append("First name is required")
            }
            if lastName.isEmpty {
                errors.append("Last name is required")
            }
            if email.isEmpty {
                errors.append("Personal email is required")
            } else if !isValidEmail(email) {
                errors.append("Please enter a valid personal email")
            }
        } else {
            if companyName.isEmpty {
                errors.append("Company name is required")
            }
        }

        if accountHolderName.isEmpty {
            errors.append("Account holder name is required")
        }

        if accountNumber.isEmpty {
            errors.append("Bank account number (IBAN) is required")
        } else if !isValidIBAN(accountNumber) {
            if businessCountry == "BG" {
                errors.append("Please enter a valid Bulgarian IBAN (22 characters, e.g., BG80 BNBG 9661 1020 3456 78)")
            } else {
                errors.append("Please enter a valid IBAN for your country")
            }
        }

        if !hasAcceptedTerms {
            errors.append("You must accept the terms and conditions")
        }

        return errors
    }
    
    // MARK: - Methods
    private func prefillBusinessInformation() {
        businessName = shop.name
        businessEmail = shop.email
        businessPhone = shop.phone
        businessWebsite = shop.website ?? ""
        businessAddress = shop.address
        businessCity = shop.city
        businessState = shop.state
        businessPostalCode = shop.postalCode
        businessCountry = shop.country

        // For company type, prefill company name
        companyName = shop.name
    }
    
    private func submitSetup() {
        // Prevent multiple submissions
        guard !isLoading && isFormValid else {
            return
        }

        isLoading = true
        errorMessage = nil

        Task {
            do {
                let request = createConnectAccountRequest()
                _ = try await stripeService.createConnectAccount(shopId: shop.id, request: request)

                await MainActor.run {
                    isLoading = false
                    onSetupComplete(true)
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = error.localizedDescription
                    showingError = true
                    onSetupComplete(false)
                }
            }
        }
    }

    // MARK: - Validation Helper Methods
    private func isValidEmail(_ email: String) -> Bool {
        let emailRegex = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }

    private func isValidURL(_ urlString: String) -> Bool {
        guard let url = URL(string: urlString) else {
            return false
        }

        // Check if URL has a valid scheme (http or https)
        guard let scheme = url.scheme?.lowercased(),
              scheme == "http" || scheme == "https" else {
            return false
        }

        // Check if URL has a valid host
        guard let host = url.host, !host.isEmpty else {
            return false
        }

        return true
    }

    private func isValidIBAN(_ iban: String) -> Bool {
        // Remove spaces and convert to uppercase
        let cleanIBAN = iban.replacingOccurrences(of: " ", with: "").uppercased()

        // Basic IBAN format check (2 letters + 2 digits + up to 30 alphanumeric characters)
        let ibanRegex = "^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$"
        let ibanPredicate = NSPredicate(format: "SELF MATCHES %@", ibanRegex)

        guard ibanPredicate.evaluate(with: cleanIBAN) else {
            return false
        }

        // Check minimum length (15 characters is typical minimum)
        guard cleanIBAN.count >= 15 else {
            return false
        }

        // Country-specific validation for Bulgaria
        if cleanIBAN.hasPrefix("BG") {
            // Bulgarian IBAN should be exactly 22 characters
            guard cleanIBAN.count == 22 else {
                return false
            }

            // Check if it follows Bulgarian IBAN format: BG + 2 check digits + 4 bank code + 6 branch code + 8 account number
            let bankCode = String(cleanIBAN.dropFirst(4).prefix(4))
            let branchCode = String(cleanIBAN.dropFirst(8).prefix(6))
            let accountNumber = String(cleanIBAN.dropFirst(14).prefix(8))

            // Basic validation that these parts are alphanumeric
            let alphanumericRegex = "^[A-Z0-9]+$"
            let alphanumericPredicate = NSPredicate(format: "SELF MATCHES %@", alphanumericRegex)

            return alphanumericPredicate.evaluate(with: bankCode) &&
                   alphanumericPredicate.evaluate(with: branchCode) &&
                   alphanumericPredicate.evaluate(with: accountNumber)
        }

        return true
    }
    
    private func createConnectAccountRequest() -> StripeConnectAccountRequest {
        // Get user's IP and user agent for ToS acceptance
        let tosAcceptance = StripeConnectAccountRequest.TosAcceptanceInfo(
            date: Int(Date().timeIntervalSince1970),
            ip: getUserIP(),
            userAgent: getUserAgent()
        )

        let address = StripeConnectAccountRequest.AddressInfo(
            line1: businessAddress,
            line2: nil,
            city: businessCity,
            state: businessState.isEmpty ? nil : businessState,
            postalCode: businessPostalCode,
            country: businessCountry
        )

        var individual: StripeConnectAccountRequest.IndividualInfo?
        var company: StripeConnectAccountRequest.CompanyInfo?

        if businessType == .individual {
            individual = StripeConnectAccountRequest.IndividualInfo(
                firstName: firstName,
                lastName: lastName,
                email: email,
                phone: phone,
                dateOfBirth: StripeConnectAccountRequest.IndividualInfo.DateOfBirthInfo(
                    day: birthDay,
                    month: birthMonth,
                    year: birthYear
                ),
                address: address,
                ssn: nil
            )
        } else {
            company = StripeConnectAccountRequest.CompanyInfo(
                name: companyName,
                taxId: taxId.isEmpty ? nil : taxId,
                phone: companyPhone.isEmpty ? nil : companyPhone,
                address: address,
                structure: companyStructure
            )
        }

        // Clean and format the IBAN
        let cleanedAccountNumber = accountNumber.replacingOccurrences(of: " ", with: "").uppercased()

        // Determine if this is an IBAN or regular account number
        let isIBAN = cleanedAccountNumber.count >= 15 && cleanedAccountNumber.count <= 34 &&
                     cleanedAccountNumber.range(of: "^[A-Z]{2}[0-9]{2}[A-Z0-9]+$", options: .regularExpression) != nil

        let externalAccount = StripeConnectAccountRequest.ExternalAccountInfo(
            accountHolderName: accountHolderName.trimmingCharacters(in: .whitespacesAndNewlines),
            country: businessCountry,
            currency: "EUR",
            accountHolderType: accountHolderType,
            iban: isIBAN ? cleanedAccountNumber : nil,
            routingNumber: (!isIBAN && !routingNumber.isEmpty) ? routingNumber.trimmingCharacters(in: .whitespacesAndNewlines) : nil,
            accountNumber: !isIBAN ? cleanedAccountNumber : nil,
            sortCode: nil,
            bsbNumber: nil,
            institutionNumber: nil,
            transitNumber: nil
        )

        // Ensure website URL is properly formatted or nil
        let formattedWebsite: String? = {
            guard !businessWebsite.isEmpty else { return nil }

            let trimmed = businessWebsite.trimmingCharacters(in: .whitespacesAndNewlines)

            // If it doesn't start with http:// or https://, add https://
            if !trimmed.lowercased().hasPrefix("http://") && !trimmed.lowercased().hasPrefix("https://") {
                return "https://\(trimmed)"
            }

            return trimmed
        }()

        return StripeConnectAccountRequest(
            businessName: businessName.trimmingCharacters(in: .whitespacesAndNewlines),
            businessEmail: businessEmail.trimmingCharacters(in: .whitespacesAndNewlines),
            businessPhone: businessPhone.trimmingCharacters(in: .whitespacesAndNewlines),
            businessWebsite: formattedWebsite,
            businessAddress: businessAddress.trimmingCharacters(in: .whitespacesAndNewlines),
            businessCity: businessCity.trimmingCharacters(in: .whitespacesAndNewlines),
            businessState: businessState.isEmpty ? nil : businessState.trimmingCharacters(in: .whitespacesAndNewlines),
            businessPostalCode: businessPostalCode.trimmingCharacters(in: .whitespacesAndNewlines),
            businessCountry: businessCountry,
            businessType: businessType.rawValue,
            individual: individual,
            company: company,
            externalAccount: externalAccount,
            tosAcceptance: tosAcceptance
        )
    }
    
    private func getUserIP() -> String {
        // In a real app, you might want to get the actual IP
        // For now, return a placeholder
        return "127.0.0.1"
    }
    
    private func getUserAgent() -> String {
        return "LunaraApp/1.0 iOS"
    }

    private func formatIBANForDisplay(_ iban: String) -> String {
        // Add spaces every 4 characters for better readability
        var formatted = ""
        for (index, character) in iban.enumerated() {
            if index > 0 && index % 4 == 0 {
                formatted += " "
            }
            formatted += String(character)
        }
        return formatted
    }
}

// MARK: - Custom Text Field
struct CustomTextField: View {
    let title: String
    @Binding var text: String
    let placeholder: String
    var isRequired: Bool = true
    var validationMessage: String? = nil
    var isValid: Bool = true

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(title)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.primaryText)

                if isRequired {
                    Text("*")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.error)
                }

                Spacer()
            }

            TextField(placeholder, text: $text)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .font(.system(size: 16))
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(
                            !text.isEmpty && !isValid ? LunaraColors.error : Color.clear,
                            lineWidth: 1
                        )
                )

            if let validationMessage = validationMessage, !text.isEmpty && !isValid {
                Text(validationMessage)
                    .font(.system(size: 12))
                    .foregroundColor(LunaraColors.error)
            }
        }
    }
}

#Preview {
    StripeConnectSetupView(shop: Shop.preview) { success in
        print("Setup completed: \(success)")
    }
}
