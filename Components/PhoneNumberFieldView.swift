//
//  PhoneNumberFieldView.swift
//  LunaraApp
//
//  Created by Lunara Team on 24/07/2025.
//

import SwiftUI

// MARK: - Country Code Model
struct CountryCode: Identifiable, Equatable {
    let id = UUID()
    let code: String
    let name: String
    let dialCode: String
    let flag: String
    let phonePattern: String?
    let exampleNumber: String
    
    static func == (lhs: CountryCode, rhs: CountryCode) -> Bool {
        return lhs.code == rhs.code
    }
}

// MARK: - Phone Number Field View
struct PhoneNumberFieldView: View {
    let title: String
    @Binding var phoneNumber: String
    @Binding var selectedCountryCode: String
    let placeholder: String
    let errorMessage: String?
    let isRequired: Bool
    let enableRealTimeValidation: Bool
    
    @State private var validationState: FormValidationState = .idle
    @State private var debounceTimer: Timer?
    @State private var showingCountryPicker = false
    @State private var formattedNumber = ""
    @FocusState private var isFocused: Bool
    
    private let countryValidation = CountryValidationService.shared
    
    // Available country codes
    private let countryCodes: [CountryCode] = [
        CountryCode(
            code: "BG",
            name: "Bulgaria",
            dialCode: "+359",
            flag: "🇧🇬",
            phonePattern: "^\\+?359[2-9][0-9]{7,8}$",
            exampleNumber: "+359 2 123 4567"
        ),
        CountryCode(
            code: "US",
            name: "United States",
            dialCode: "+1",
            flag: "🇺🇸",
            phonePattern: "^\\+?1?[2-9][0-9]{2}[2-9][0-9]{2}[0-9]{4}$",
            exampleNumber: "+1 (555) 123-4567"
        ),
        CountryCode(
            code: "GB",
            name: "United Kingdom",
            dialCode: "+44",
            flag: "🇬🇧",
            phonePattern: "^\\+?44[1-9][0-9]{8,9}$",
            exampleNumber: "+44 20 7123 4567"
        ),
        CountryCode(
            code: "DE",
            name: "Germany",
            dialCode: "+49",
            flag: "🇩🇪",
            phonePattern: "^\\+?49[1-9][0-9]{6,11}$",
            exampleNumber: "+49 30 12345678"
        ),
        CountryCode(
            code: "FR",
            name: "France",
            dialCode: "+33",
            flag: "🇫🇷",
            phonePattern: "^\\+?33[1-9][0-9]{8}$",
            exampleNumber: "+33 1 23 45 67 89"
        ),
        CountryCode(
            code: "CA",
            name: "Canada",
            dialCode: "+1",
            flag: "🇨🇦",
            phonePattern: "^\\+?1?[2-9][0-9]{2}[2-9][0-9]{2}[0-9]{4}$",
            exampleNumber: "+1 (555) 123-4567"
        ),
        CountryCode(
            code: "AU",
            name: "Australia",
            dialCode: "+61",
            flag: "🇦🇺",
            phonePattern: "^\\+?61[2-9][0-9]{8}$",
            exampleNumber: "+61 2 1234 5678"
        )
    ]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Title with validation indicator
            HStack {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(LunaraColors.charcoalGray)
                
                if isRequired {
                    Text("*")
                        .foregroundColor(.red)
                }
                
                Spacer()
                
                // Real-time validation indicator
                if enableRealTimeValidation && !phoneNumber.isEmpty {
                    validationIndicator
                }
            }
            
            // Phone Number Input with Country Code
            HStack(spacing: 0) {
                // Country Code Selector
                Button(action: {
                    showingCountryPicker = true
                }) {
                    HStack(spacing: 8) {
                        Text(selectedCountry?.flag ?? "🌍")
                            .font(.title3)
                        
                        Text(selectedCountry?.dialCode ?? "+1")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(LunaraColors.charcoalGray)
                        
                        Image(systemName: "chevron.down")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 12)
                    .background(
                        Rectangle()
                            .fill(LunaraColors.coolLightGray.opacity(0.3))
                    )
                }
                .buttonStyle(PlainButtonStyle())
                
                // Divider
                Rectangle()
                    .fill(borderColor)
                    .frame(width: 1)
                
                // Phone Number Input
                TextField(placeholder, text: $formattedNumber)
                    .keyboardType(.phonePad)
                    .focused($isFocused)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 12)
                    .onChange(of: formattedNumber) { _, newValue in
                        handlePhoneNumberChange(newValue)
                    }
                    .onAppear {
                        updateFormattedNumber()
                    }
            }
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.white)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(borderColor, lineWidth: isFocused ? 2 : 1)
                    )
            )
            
            // Error/Validation Message
            if let displayMessage = displayMessage {
                HStack {
                    Image(systemName: validationState.isValid ? "checkmark.circle.fill" : "exclamationmark.circle.fill")
                        .foregroundColor(validationState.color)
                    Text(displayMessage)
                        .font(.caption)
                        .foregroundColor(validationState.color)
                    Spacer()
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
            
            // Helper Text
            if displayMessage == nil {
                Text("Example: \(selectedCountry?.exampleNumber ?? "+1 (555) 123-4567")")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .sheet(isPresented: $showingCountryPicker) {
            CountryCodePickerView(
                countryCodes: countryCodes,
                selectedCountryCode: $selectedCountryCode,
                onSelection: { countryCode in
                    selectedCountryCode = countryCode
                    updateFormattedNumber()
                    if enableRealTimeValidation {
                        scheduleValidation()
                    }
                }
            )
        }
    }
    
    // MARK: - Computed Properties
    
    private var selectedCountry: CountryCode? {
        return countryCodes.first { $0.code == selectedCountryCode }
    }
    
    private var borderColor: Color {
        if errorMessage != nil {
            return .red
        }
        
        if enableRealTimeValidation && !phoneNumber.isEmpty {
            return validationState.color
        }
        
        return isFocused ? LunaraColors.warmGold : LunaraColors.coolLightGray
    }
    
    private var displayMessage: String? {
        // Prioritize external error message
        if let errorMessage = errorMessage {
            return errorMessage
        }
        
        // Show validation message if real-time validation is enabled
        if enableRealTimeValidation {
            return validationState.message
        }
        
        return nil
    }
    
    @ViewBuilder
    private var validationIndicator: some View {
        switch validationState {
        case .validating:
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: LunaraColors.warmGold))
                .scaleEffect(0.7)
        case .valid:
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(.green)
                .font(.caption)
        case .invalid:
            Image(systemName: "exclamationmark.circle.fill")
                .foregroundColor(.red)
                .font(.caption)
        case .warning:
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(.orange)
                .font(.caption)
        case .idle:
            EmptyView()
        }
    }
    
    // MARK: - Methods
    
    private func handlePhoneNumberChange(_ newValue: String) {
        // Extract only digits from the formatted input
        let digitsOnly = newValue.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
        
        // Update the raw phone number
        if let country = selectedCountry {
            phoneNumber = country.dialCode + digitsOnly
        } else {
            phoneNumber = digitsOnly
        }
        
        // Format the display number
        formattedNumber = formatPhoneNumber(digitsOnly, for: selectedCountryCode)
        
        // Schedule validation
        if enableRealTimeValidation {
            scheduleValidation()
        }
    }
    
    private func updateFormattedNumber() {
        // Extract digits from the current phone number
        let digitsOnly = phoneNumber.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
        
        // Remove country code if present
        var nationalNumber = digitsOnly
        if let country = selectedCountry {
            let dialCodeDigits = country.dialCode.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
            if nationalNumber.hasPrefix(dialCodeDigits) {
                nationalNumber = String(nationalNumber.dropFirst(dialCodeDigits.count))
            }
        }
        
        formattedNumber = formatPhoneNumber(nationalNumber, for: selectedCountryCode)
    }
    
    private func formatPhoneNumber(_ number: String, for countryCode: String) -> String {
        switch countryCode {
        case "BG":
            return formatBulgarianNumber(number)
        case "US", "CA":
            return formatNorthAmericanNumber(number)
        case "GB":
            return formatUKNumber(number)
        case "DE":
            return formatGermanNumber(number)
        case "FR":
            return formatFrenchNumber(number)
        case "AU":
            return formatAustralianNumber(number)
        default:
            return number
        }
    }
    
    private func formatBulgarianNumber(_ number: String) -> String {
        let digits = number.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
        
        if digits.count <= 1 {
            return digits
        } else if digits.count <= 3 {
            return digits
        } else if digits.count <= 6 {
            return "\(digits.prefix(1)) \(digits.dropFirst().prefix(3)) \(digits.dropFirst(4))"
        } else {
            return "\(digits.prefix(1)) \(digits.dropFirst().prefix(3)) \(digits.dropFirst(4).prefix(3)) \(digits.dropFirst(7))"
        }
    }
    
    private func formatNorthAmericanNumber(_ number: String) -> String {
        let digits = number.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
        
        if digits.count <= 3 {
            return "(\(digits)"
        } else if digits.count <= 6 {
            return "(\(digits.prefix(3))) \(digits.dropFirst(3))"
        } else {
            return "(\(digits.prefix(3))) \(digits.dropFirst(3).prefix(3))-\(digits.dropFirst(6))"
        }
    }
    
    private func formatUKNumber(_ number: String) -> String {
        let digits = number.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
        
        if digits.count <= 2 {
            return digits
        } else if digits.count <= 6 {
            return "\(digits.prefix(2)) \(digits.dropFirst(2))"
        } else {
            return "\(digits.prefix(2)) \(digits.dropFirst(2).prefix(4)) \(digits.dropFirst(6))"
        }
    }
    
    private func formatGermanNumber(_ number: String) -> String {
        let digits = number.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
        
        if digits.count <= 2 {
            return digits
        } else if digits.count <= 10 {
            return "\(digits.prefix(2)) \(digits.dropFirst(2))"
        } else {
            return "\(digits.prefix(2)) \(digits.dropFirst(2).prefix(8))"
        }
    }
    
    private func formatFrenchNumber(_ number: String) -> String {
        let digits = number.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
        
        if digits.count <= 1 {
            return digits
        } else if digits.count <= 3 {
            return "\(digits.prefix(1)) \(digits.dropFirst())"
        } else if digits.count <= 5 {
            return "\(digits.prefix(1)) \(digits.dropFirst().prefix(2)) \(digits.dropFirst(3))"
        } else if digits.count <= 7 {
            return "\(digits.prefix(1)) \(digits.dropFirst().prefix(2)) \(digits.dropFirst(3).prefix(2)) \(digits.dropFirst(5))"
        } else {
            return "\(digits.prefix(1)) \(digits.dropFirst().prefix(2)) \(digits.dropFirst(3).prefix(2)) \(digits.dropFirst(5).prefix(2)) \(digits.dropFirst(7))"
        }
    }
    
    private func formatAustralianNumber(_ number: String) -> String {
        let digits = number.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
        
        if digits.count <= 1 {
            return digits
        } else if digits.count <= 5 {
            return "\(digits.prefix(1)) \(digits.dropFirst())"
        } else {
            return "\(digits.prefix(1)) \(digits.dropFirst().prefix(4)) \(digits.dropFirst(5))"
        }
    }
    
    @MainActor
    private func scheduleValidation() {
        // Cancel previous timer
        debounceTimer?.invalidate()
        
        // Set validating state immediately for non-empty text
        if !phoneNumber.isEmpty {
            validationState = .validating
        } else {
            validationState = .idle
            return
        }
        
        // Schedule validation with debounce
        debounceTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: false) { _ in
            Task { @MainActor in
                performValidation()
            }
        }
    }
    
    @MainActor
    private func performValidation() {
        guard !phoneNumber.isEmpty else {
            validationState = .idle
            return
        }
        
        let isValid = countryValidation.validatePhoneNumber(phoneNumber, for: selectedCountryCode)
        validationState = isValid ? .valid : .invalid("Invalid phone number format")
    }
}

// MARK: - Country Code Picker View
struct CountryCodePickerView: View {
    let countryCodes: [CountryCode]
    @Binding var selectedCountryCode: String
    let onSelection: (String) -> Void
    
    @Environment(\.dismiss) private var dismiss
    @State private var searchText = ""
    
    var filteredCountries: [CountryCode] {
        if searchText.isEmpty {
            return countryCodes.sorted { $0.name < $1.name }
        } else {
            return countryCodes.filter { country in
                country.name.localizedCaseInsensitiveContains(searchText) ||
                country.dialCode.contains(searchText) ||
                country.code.localizedCaseInsensitiveContains(searchText)
            }.sorted { $0.name < $1.name }
        }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Search Bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.secondary)
                    
                    TextField("Search countries...", text: $searchText)
                        .textFieldStyle(PlainTextFieldStyle())
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(LunaraColors.coolLightGray.opacity(0.3))
                
                Divider()
                
                // Country List
                List(filteredCountries) { country in
                    CountryCodeRow(
                        country: country,
                        isSelected: country.code == selectedCountryCode,
                        onTap: {
                            onSelection(country.code)
                            dismiss()
                        }
                    )
                }
                .listStyle(PlainListStyle())
            }
            .navigationTitle("Select Country")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.warmGold)
                }
            }
        }
    }
}

// MARK: - Country Code Row
struct CountryCodeRow: View {
    let country: CountryCode
    let isSelected: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                Text(country.flag)
                    .font(.title2)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(country.name)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(LunaraColors.charcoalGray)
                    
                    Text(country.dialCode)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                if isSelected {
                    Image(systemName: "checkmark")
                        .foregroundColor(LunaraColors.warmGold)
                        .fontWeight(.semibold)
                }
            }
            .padding(.vertical, 8)
            .contentShape(Rectangle())
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Preview
#Preview {
    VStack(spacing: 20) {
        PhoneNumberFieldView(
            title: "Phone Number",
            phoneNumber: .constant(""),
            selectedCountryCode: .constant("BG"),
            placeholder: "Enter phone number",
            errorMessage: nil,
            isRequired: true,
            enableRealTimeValidation: true
        )
        
        Spacer()
    }
    .padding()
}
