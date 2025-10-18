//
//  FormFieldView.swift
//  LunaraApp
//
//  Created by Lunara Team on 16/07/2025.
//

import SwiftUI
import Combine

// MARK: - Form Validation State
enum FormValidationState: Equatable {
    case idle
    case validating
    case valid
    case invalid(String)
    case warning(String)

    var isValid: Bool {
        switch self {
        case .valid, .idle, .warning:
            return true
        case .invalid, .validating:
            return false
        }
    }

    var message: String? {
        switch self {
        case .invalid(let message), .warning(let message):
            return message
        default:
            return nil
        }
    }

    var color: Color {
        switch self {
        case .valid:
            return .green
        case .invalid:
            return .red
        case .warning:
            return .orange
        case .validating:
            return LunaraColors.warmGold
        case .idle:
            return LunaraColors.coolLightGray
        }
    }
}

// MARK: - Form Validation Rule
enum FormValidationRule {
    case none
    case required
    case email
    case phone(countryCode: String)
    case postalCode(countryCode: String)
    case minLength(Int)
    case maxLength(Int)
    case custom((String) -> FormValidationState)

    func validate(_ text: String, countryValidation: CountryValidationService = .shared) -> FormValidationState {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)

        switch self {
        case .none:
            return .idle
        case .required:
            return trimmed.isEmpty ? .invalid("This field is required") : .valid
        case .email:
            return validateEmail(trimmed)
        case .phone(let countryCode):
            return validatePhone(trimmed, countryCode: countryCode, countryValidation: countryValidation)
        case .postalCode(let countryCode):
            return validatePostalCode(trimmed, countryCode: countryCode, countryValidation: countryValidation)
        case .minLength(let min):
            return trimmed.count < min ? .invalid("Minimum \(min) characters required") : .valid
        case .maxLength(let max):
            return trimmed.count > max ? .invalid("Maximum \(max) characters allowed") : .valid
        case .custom(let validator):
            return validator(trimmed)
        }
    }

    private func validateEmail(_ email: String) -> FormValidationState {
        if email.isEmpty { return .idle }

        let emailRegex = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
        let isValid = NSPredicate(format: "SELF MATCHES %@", emailRegex).evaluate(with: email)
        return isValid ? .valid : .invalid("Invalid email format")
    }

    private func validatePhone(_ phone: String, countryCode: String, countryValidation: CountryValidationService) -> FormValidationState {
        if phone.isEmpty { return .idle }

        let isValid = countryValidation.validatePhoneNumber(phone, for: countryCode)
        return isValid ? .valid : .invalid("Invalid phone number format")
    }

    private func validatePostalCode(_ postalCode: String, countryCode: String, countryValidation: CountryValidationService) -> FormValidationState {
        if postalCode.isEmpty { return .idle }

        let isValid = countryValidation.validatePostalCode(postalCode, for: countryCode)
        return isValid ? .valid : .invalid("Invalid postal code format")
    }
}

struct FormFieldView: View {
    let title: String
    @Binding var text: String
    let placeholder: String
    let errorMessage: String?
    let isRequired: Bool
    let isMultiline: Bool
    let keyboardType: UIKeyboardType
    let maxLength: Int?
    let validationRules: [FormValidationRule]
    let enableRealTimeValidation: Bool

    @FocusState private var isFocused: Bool
    @State private var validationState: FormValidationState = .idle
    @State private var debounceTimer: Timer?

    init(
        title: String,
        text: Binding<String>,
        placeholder: String,
        errorMessage: String? = nil,
        isRequired: Bool = false,
        isMultiline: Bool = false,
        keyboardType: UIKeyboardType = .default,
        maxLength: Int? = nil,
        validationRules: [FormValidationRule] = [],
        enableRealTimeValidation: Bool = true
    ) {
        self.title = title
        self._text = text
        self.placeholder = placeholder
        self.errorMessage = errorMessage
        self.isRequired = isRequired
        self.isMultiline = isMultiline
        self.keyboardType = keyboardType
        self.maxLength = maxLength
        self.validationRules = validationRules
        self.enableRealTimeValidation = enableRealTimeValidation
    }
    
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
                if enableRealTimeValidation && !text.isEmpty {
                    validationIndicator
                }

                if let maxLength = maxLength {
                    Text("\(text.count)/\(maxLength)")
                        .font(.caption)
                        .foregroundColor(text.count > maxLength ? .red : .secondary)
                }
            }
            
            // Input Field
            Group {
                if isMultiline {
                    TextEditor(text: $text)
                        .frame(minHeight: 80)
                        .padding(8)
                        .background(Color.clear)
                        .focused($isFocused)
                } else {
                    TextField(placeholder, text: $text)
                        .keyboardType(keyboardType)
                        .autocapitalization(keyboardType == .emailAddress ? .none : .words)
                        .disableAutocorrection(keyboardType == .emailAddress || keyboardType == .URL)
                        .padding(12)
                        .focused($isFocused)
                }
            }
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.white)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(
                                borderColor,
                                lineWidth: isFocused ? 2 : 1
                            )
                    )
            )
            .onChange(of: text) { _, newValue in
                if enableRealTimeValidation {
                    scheduleValidation(for: newValue)
                }
            }
            .onChange(of: text) { _, newValue in
                if let maxLength = maxLength, newValue.count > maxLength {
                    text = String(newValue.prefix(maxLength))
                }
            }
            
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
            if !isMultiline && keyboardType == .emailAddress && displayMessage == nil {
                Text("We'll use this email for important business notifications")
                    .font(.caption)
                    .foregroundColor(.secondary)
            } else if !isMultiline && keyboardType == .phonePad && displayMessage == nil {
                Text("Include country code (e.g., +1 for US)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            } else if !isMultiline && keyboardType == .URL && displayMessage == nil {
                Text("Optional - your business website or social media")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }

    // MARK: - Computed Properties

    private var borderColor: Color {
        if errorMessage != nil {
            return .red
        }

        if enableRealTimeValidation && !text.isEmpty {
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

    @MainActor
    private func scheduleValidation(for text: String) {
        // Cancel previous timer
        debounceTimer?.invalidate()

        // Set validating state immediately for non-empty text
        if !text.isEmpty {
            validationState = .validating
        } else {
            validationState = .idle
            return
        }

        // Schedule validation with debounce
        debounceTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: false) { _ in
            Task { @MainActor in
                performValidation(for: text)
            }
        }
    }

    @MainActor
    private func performValidation(for text: String) {
        guard !validationRules.isEmpty else {
            validationState = .idle
            return
        }

        // Run all validation rules
        for rule in validationRules {
            let result = rule.validate(text)
            if !result.isValid {
                validationState = result
                return
            }
        }

        // All validations passed
        validationState = .valid
    }
}

// MARK: - Button Styles
struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body)
            .fontWeight(.semibold)
            .foregroundColor(.white)
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .fill(LunaraColors.warmGold)
                    .opacity(configuration.isPressed ? 0.8 : 1.0)
            )
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body)
            .fontWeight(.medium)
            .foregroundColor(LunaraColors.charcoalGray)
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(LunaraColors.coolLightGray, lineWidth: 1)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color.white)
                            .opacity(configuration.isPressed ? 0.8 : 1.0)
                    )
            )
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

struct TertiaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body)
            .fontWeight(.medium)
            .foregroundColor(LunaraColors.warmGold)
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(
                RoundedRectangle(cornerRadius: 6)
                    .fill(LunaraColors.warmGold.opacity(0.1))
                    .opacity(configuration.isPressed ? 0.8 : 1.0)
            )
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

// MARK: - Loading Button Style
struct LoadingButtonStyle: ButtonStyle {
    let isLoading: Bool
    
    func makeBody(configuration: Configuration) -> some View {
        HStack {
            if isLoading {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    .scaleEffect(0.8)
            }
            
            configuration.label
                .opacity(isLoading ? 0.7 : 1.0)
        }
        .font(.body)
        .fontWeight(.semibold)
        .foregroundColor(.white)
        .padding(.horizontal, 24)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(LunaraColors.warmGold)
                .opacity(configuration.isPressed ? 0.8 : 1.0)
        )
        .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
        .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
        .disabled(isLoading)
    }
}

// MARK: - Card Style
struct CardStyle: ViewModifier {
    let padding: CGFloat
    let cornerRadius: CGFloat
    let shadowRadius: CGFloat
    
    init(padding: CGFloat = 16, cornerRadius: CGFloat = 12, shadowRadius: CGFloat = 2) {
        self.padding = padding
        self.cornerRadius = cornerRadius
        self.shadowRadius = shadowRadius
    }
    
    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .fill(Color.white)
                    .shadow(color: .black.opacity(0.05), radius: shadowRadius, x: 0, y: 1)
            )
    }
}

extension View {
    func cardStyle(padding: CGFloat = 16, cornerRadius: CGFloat = 12, shadowRadius: CGFloat = 2) -> some View {
        modifier(CardStyle(padding: padding, cornerRadius: cornerRadius, shadowRadius: shadowRadius))
    }
}

// MARK: - Preview
#Preview {
    VStack(spacing: 20) {
        FormFieldView(
            title: "Business Name",
            text: Binding.constant(""),
            placeholder: "Enter your business name",
            isRequired: true
        )

        FormFieldView(
            title: "Description",
            text: Binding.constant(""),
            placeholder: "Describe your business",
            isMultiline: true,
            maxLength: 500
        )

        FormFieldView(
            title: "Email",
            text: Binding.constant(""),
            placeholder: "business@example.com",
            errorMessage: "Invalid email format",
            isRequired: true,
            keyboardType: .emailAddress
        )
        
        Button("Primary Button") { }
            .buttonStyle(PrimaryButtonStyle())
        
        Button("Secondary Button") { }
            .buttonStyle(SecondaryButtonStyle())
        
        Button("Loading Button") { }
            .buttonStyle(LoadingButtonStyle(isLoading: true))
    }
    .padding()
}
