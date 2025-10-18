//
//  CityAutocompleteView.swift
//  LunaraApp
//
//  Created by Lunara Team on 24/07/2025.
//

import SwiftUI

// MARK: - City Autocomplete View
struct CityAutocompleteView: View {
    let title: String
    @Binding var text: String
    let countryCode: String
    let placeholder: String
    let errorMessage: String?
    let isRequired: Bool
    let enableRealTimeValidation: Bool
    
    @State private var suggestions: [String] = []
    @State private var showingSuggestions = false
    @State private var validationState: FormValidationState = .idle
    @State private var debounceTimer: Timer?
    @FocusState private var isFocused: Bool
    
    private let countryValidation = CountryValidationService.shared
    
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
            }
            
            // Input Field with Suggestions
            VStack(spacing: 0) {
                // Text Field
                TextField(placeholder, text: $text)
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: showingSuggestions ? 8 : 8)
                            .fill(Color.white)
                            .overlay(
                                RoundedRectangle(cornerRadius: showingSuggestions ? 8 : 8)
                                    .stroke(borderColor, lineWidth: isFocused ? 2 : 1)
                            )
                    )
                    .focused($isFocused)
                    .onChange(of: text) { _, newValue in
                        handleTextChange(newValue)
                    }
                    .onTapGesture {
                        if !suggestions.isEmpty {
                            showingSuggestions = true
                        }
                    }
                
                // Suggestions List
                if showingSuggestions && !suggestions.isEmpty {
                    VStack(spacing: 0) {
                        ForEach(suggestions, id: \.self) { suggestion in
                            CitySuggestionRow(
                                city: suggestion,
                                onTap: {
                                    selectSuggestion(suggestion)
                                }
                            )
                        }
                    }
                    .background(Color.white)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(LunaraColors.coolLightGray, lineWidth: 1)
                    )
                    .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
                    .transition(.opacity.combined(with: .move(edge: .top)))
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
            if displayMessage == nil {
                Text(getHelperText())
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .onTapGesture {
            // Dismiss suggestions when tapping outside
            if showingSuggestions {
                showingSuggestions = false
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
    
    // MARK: - Private Methods
    
    private func handleTextChange(_ newValue: String) {
        // Cancel previous timer
        debounceTimer?.invalidate()
        
        // Clear suggestions if text is empty
        if newValue.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            suggestions = []
            showingSuggestions = false
            if enableRealTimeValidation {
                validationState = .idle
            }
            return
        }
        
        // Schedule search with debounce
        debounceTimer = Timer.scheduledTimer(withTimeInterval: 0.3, repeats: false) { _ in
            Task { @MainActor in
                performSearch(for: newValue)
                if enableRealTimeValidation {
                    performValidation(for: newValue)
                }
            }
        }
    }
    
    @MainActor
    private func performSearch(for query: String) {
        let trimmedQuery = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedQuery.isEmpty else {
            suggestions = []
            showingSuggestions = false
            return
        }
        
        // Get country-specific city suggestions
        let allCities = getCitiesForCountry(countryCode)
        
        let filteredCities = allCities.filter { city in
            city.localizedCaseInsensitiveContains(trimmedQuery)
        }.prefix(5)
        
        suggestions = Array(filteredCities)
        showingSuggestions = !suggestions.isEmpty && isFocused
    }
    
    @MainActor
    private func performValidation(for text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        
        guard !trimmed.isEmpty else {
            validationState = .idle
            return
        }
        
        // Basic validation
        if trimmed.count < 2 {
            validationState = .invalid("City name must be at least 2 characters")
            return
        }
        
        // Country-specific validation
        if countryCode == "BG" {
            let bulgarianCities = countryValidation.getBulgarianCities()
            let isKnownCity = bulgarianCities.contains { city in
                city.localizedCaseInsensitiveCompare(trimmed) == .orderedSame
            }
            
            if isKnownCity {
                validationState = .valid
            } else if trimmed.count >= 3 {
                validationState = .warning("City not found in our database, but will be accepted")
            } else {
                validationState = .invalid("Please enter a valid city name")
            }
        } else {
            validationState = trimmed.count >= 2 ? .valid : .invalid("City name must be at least 2 characters")
        }
    }
    
    private func selectSuggestion(_ suggestion: String) {
        text = suggestion
        showingSuggestions = false
        isFocused = false
        
        if enableRealTimeValidation {
            validationState = .valid
        }
    }
    
    private func getCitiesForCountry(_ countryCode: String) -> [String] {
        switch countryCode.uppercased() {
        case "BG":
            return countryValidation.getBulgarianCities()
        default:
            return [] // For other countries, we could add more city databases
        }
    }

    private func getHelperText() -> String {
        switch countryCode.uppercased() {
        case "BG":
            return "Start typing to see Bulgarian city suggestions"
        default:
            return "Enter city name"
        }
    }
}

// MARK: - City Suggestion Row
struct CitySuggestionRow: View {
    let city: String
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                Image(systemName: "building.2")
                    .foregroundColor(LunaraColors.warmGold)
                    .frame(width: 20)
                
                Text(city)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(LunaraColors.charcoalGray)
                    .lineLimit(1)
                
                Spacer()
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .contentShape(Rectangle())
        }
        .buttonStyle(PlainButtonStyle())
        .background(
            Rectangle()
                .fill(Color.clear)
                .onTapGesture {
                    onTap()
                }
        )
    }
}

// MARK: - Preview
#Preview {
    VStack(spacing: 20) {
        CityAutocompleteView(
            title: "City",
            text: .constant(""),
            countryCode: "BG",
            placeholder: "Enter city name",
            errorMessage: nil,
            isRequired: true,
            enableRealTimeValidation: true
        )
        
        Spacer()
    }
    .padding()
}
