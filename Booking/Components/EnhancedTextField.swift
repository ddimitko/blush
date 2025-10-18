//
//  EnhancedTextField.swift
//  LunaraApp
//
//  Created by Lunara Team on 23/07/2025.
//

import SwiftUI

/// Enhanced text field with smart validation, auto-completion, and accessibility
struct EnhancedTextField: View {
    let title: String
    @Binding var text: String
    let validation: BookingValidationRule
    let keyboardType: UIKeyboardType
    let suggestions: [String]
    let placeholder: String
    
    @FocusState private var isFocused: Bool
    @State private var validationState: FieldValidationState = .idle
    @State private var showingSuggestions = false
    @State private var debounceTimer: Timer?
    
    init(
        title: String,
        text: Binding<String>,
        validation: BookingValidationRule = .none,
        keyboardType: UIKeyboardType = .default,
        suggestions: [String] = [],
        placeholder: String = ""
    ) {
        self.title = title
        self._text = text
        self.validation = validation
        self.keyboardType = keyboardType
        self.suggestions = suggestions
        self.placeholder = placeholder.isEmpty ? title : placeholder
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Field Label
            fieldLabel
            
            // Text Field Container
            textFieldContainer
            
            // Validation Feedback
            validationFeedback
            
            // Smart Suggestions
            if showingSuggestions && !filteredSuggestions.isEmpty {
                suggestionsView
            }
        }
        .onChange(of: text) { _, newValue in
            handleTextChange(newValue)
        }
        .onChange(of: isFocused) { _, focused in
            handleFocusChange(focused)
        }
    }
    
    // MARK: - Field Label
    private var fieldLabel: some View {
        HStack {
            Text(title)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(labelColor)
            
            if validation.isRequired {
                Text("*")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.error)
            }
            
            Spacer()
            
            // Validation Status Icon
            validationStatusIcon
        }
    }
    
    // MARK: - Text Field Container
    private var textFieldContainer: some View {
        HStack(spacing: 12) {
            TextField(placeholder, text: $text)
                .font(.system(size: 16, weight: .regular))
                .foregroundColor(LunaraColors.primaryText)
                .keyboardType(keyboardType)
                .textInputAutocapitalization(textCapitalization)
                .autocorrectionDisabled(shouldDisableAutocorrection)
                .focused($isFocused)
                .accessibilityLabel(title)
                .accessibilityHint(accessibilityHint)
            
            // Clear Button
            if !text.isEmpty && isFocused {
                Button(action: clearText) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 16))
                        .foregroundColor(LunaraColors.secondaryText)
                }
                .accessibilityLabel("Clear \(title)")
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(fieldBackground)
        .overlay(fieldBorder)
        .cornerRadius(12)
    }
    
    // MARK: - Validation Feedback
    private var validationFeedback: some View {
        Group {
            if case .invalid(let message) = validationState {
                HStack(spacing: 6) {
                    Image(systemName: "exclamationmark.circle.fill")
                        .font(.system(size: 12))
                        .foregroundColor(LunaraColors.error)
                    
                    Text(message)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(LunaraColors.error)
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            } else if case .valid = validationState {
                HStack(spacing: 6) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 12))
                        .foregroundColor(LunaraColors.success)
                    
                    Text("Looks good!")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(LunaraColors.success)
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .animation(.easeInOut(duration: 0.2), value: validationState)
    }
    
    // MARK: - Suggestions View
    private var suggestionsView: some View {
        VStack(spacing: 0) {
            ForEach(Array(filteredSuggestions.prefix(3).enumerated()), id: \.offset) { index, suggestion in
                Button(action: { selectSuggestion(suggestion) }) {
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.secondaryText)
                        
                        Text(suggestion)
                            .font(.system(size: 14))
                            .foregroundColor(LunaraColors.primaryText)
                        
                        Spacer()
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(Color.clear)
                }
                .buttonStyle(PlainButtonStyle())
                
                if index < min(filteredSuggestions.count, 3) - 1 {
                    Divider()
                        .background(LunaraColors.divider)
                }
            }
        }
        .background(LunaraColors.cardBackground)
        .cornerRadius(8)
        .shadow(color: LunaraColors.cardShadow, radius: 4, x: 0, y: 2)
        .transition(.opacity.combined(with: .move(edge: .top)))
    }
    
    // MARK: - Computed Properties
    
    private var labelColor: Color {
        switch validationState {
        case .invalid:
            return LunaraColors.error
        case .valid:
            return LunaraColors.success
        default:
            return isFocused ? LunaraColors.warmGold : LunaraColors.primaryText
        }
    }
    
    private var fieldBackground: Color {
        switch validationState {
        case .invalid:
            return LunaraColors.error.opacity(0.05)
        case .valid:
            return LunaraColors.success.opacity(0.05)
        default:
            return isFocused ? LunaraColors.warmGold.opacity(0.05) : LunaraColors.coolLightGray.opacity(0.3)
        }
    }
    
    private var fieldBorder: some View {
        RoundedRectangle(cornerRadius: 12)
            .stroke(borderColor, lineWidth: borderWidth)
    }
    
    private var borderColor: Color {
        switch validationState {
        case .invalid:
            return LunaraColors.error
        case .valid:
            return LunaraColors.success
        default:
            return isFocused ? LunaraColors.warmGold : LunaraColors.border
        }
    }
    
    private var borderWidth: CGFloat {
        isFocused || validationState != .idle ? 2 : 1
    }
    
    private var validationStatusIcon: some View {
        Group {
            switch validationState {
            case .validating:
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: LunaraColors.warmGold))
                    .scaleEffect(0.7)
            case .valid:
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.success)
            case .invalid:
                Image(systemName: "exclamationmark.circle.fill")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.error)
            default:
                EmptyView()
            }
        }
    }
    
    private var filteredSuggestions: [String] {
        guard !text.isEmpty else { return [] }
        return suggestions.filter { $0.localizedCaseInsensitiveContains(text) }
    }
    
    private var textCapitalization: TextInputAutocapitalization {
        switch validation {
        case .email:
            return .never
        case .name:
            return .words
        default:
            return .sentences
        }
    }
    
    private var shouldDisableAutocorrection: Bool {
        validation == .email
    }
    
    private var accessibilityHint: String {
        switch validation {
        case .required:
            return "Required field"
        case .email:
            return "Enter a valid email address"
        case .name:
            return "Enter your name"
        case .phone:
            return "Enter your phone number"
        default:
            return ""
        }
    }
    
    // MARK: - Helper Methods
    
    private func handleTextChange(_ newValue: String) {
        // Debounce validation
        debounceTimer?.invalidate()
        debounceTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: false) { _ in
            Task { @MainActor in
                validateText(newValue)
            }
        }

        // Update suggestions
        withAnimation(.easeInOut(duration: 0.2)) {
            showingSuggestions = isFocused && !newValue.isEmpty && !filteredSuggestions.isEmpty
        }
    }
    
    private func handleFocusChange(_ focused: Bool) {
        withAnimation(.easeInOut(duration: 0.2)) {
            showingSuggestions = focused && !text.isEmpty && !filteredSuggestions.isEmpty
        }
        
        if !focused {
            validateText(text)
        }
    }
    
    private func validateText(_ text: String) {
        let result = validation.validate(text)
        
        withAnimation(.easeInOut(duration: 0.2)) {
            switch result {
            case .valid:
                validationState = .valid
            case .invalid(let message):
                validationState = .invalid(message)
            }
        }
    }
    
    private func selectSuggestion(_ suggestion: String) {
        text = suggestion
        showingSuggestions = false
        isFocused = false
        
        // Add haptic feedback
        let impact = UIImpactFeedbackGenerator(style: .light)
        impact.impactOccurred()
    }
    
    private func clearText() {
        text = ""
        validationState = .idle
        
        // Add haptic feedback
        let impact = UIImpactFeedbackGenerator(style: .light)
        impact.impactOccurred()
    }
}

// MARK: - Supporting Types

enum FieldValidationState: Equatable {
    case idle
    case validating
    case valid
    case invalid(String)
}

enum BookingValidationRule {
    case none
    case required
    case email
    case name
    case phone
    
    var isRequired: Bool {
        switch self {
        case .none:
            return false
        default:
            return true
        }
    }
    
    func validate(_ text: String) -> ValidationResult {
        switch self {
        case .none:
            return .valid
        case .required:
            return text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                ? .invalid(message: "This field is required")
                : .valid
        case .email:
            return validateEmail(text)
        case .name:
            return validateName(text)
        case .phone:
            return validatePhone(text)
        }
    }
    
    private func validateEmail(_ email: String) -> ValidationResult {
        let trimmed = email.trimmingCharacters(in: .whitespacesAndNewlines)
        
        if trimmed.isEmpty {
            return .invalid(message: "Email is required")
        }

        let emailRegex = "^[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)

        return emailPredicate.evaluate(with: trimmed)
            ? .valid
            : .invalid(message: "Please enter a valid email address")
    }
    
    private func validateName(_ name: String) -> ValidationResult {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        
        if trimmed.isEmpty {
            return .invalid(message: "Name is required")
        }

        if trimmed.count < 2 {
            return .invalid(message: "Name must be at least 2 characters")
        }
        
        return .valid
    }
    
    private func validatePhone(_ phone: String) -> ValidationResult {
        let trimmed = phone.trimmingCharacters(in: .whitespacesAndNewlines)
        
        if trimmed.isEmpty {
            return .invalid(message: "Phone number is required")
        }

        // Remove all non-digit characters for validation
        let digitsOnly = trimmed.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()

        if digitsOnly.count < 10 {
            return .invalid(message: "Please enter a valid phone number")
        }
        
        return .valid
    }
}

// MARK: - Preview
struct EnhancedTextField_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 20) {
            EnhancedTextField(
                title: "Email",
                text: .constant(""),
                validation: .email,
                keyboardType: .emailAddress,
                suggestions: ["john@example.com", "jane@example.com"]
            )
            
            EnhancedTextField(
                title: "First Name",
                text: .constant(""),
                validation: .name,
                suggestions: ["John", "Jane", "Michael"]
            )
        }
        .padding()
    }
}
