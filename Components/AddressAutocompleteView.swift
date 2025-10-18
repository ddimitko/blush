//
//  AddressAutocompleteView.swift
//  LunaraApp
//
//  Created by Lunara Team on 24/07/2025.
//

import SwiftUI
import MapKit
import Combine

// MARK: - Address Suggestion Model
struct AddressSuggestion: Identifiable, Equatable {
    let id = UUID()
    let title: String
    let subtitle: String
    let coordinate: CLLocationCoordinate2D?
    let placemark: MKPlacemark?

    var fullAddress: String {
        if subtitle.isEmpty {
            return title
        }
        return "\(title), \(subtitle)"
    }

    static func == (lhs: AddressSuggestion, rhs: AddressSuggestion) -> Bool {
        return lhs.id == rhs.id &&
               lhs.title == rhs.title &&
               lhs.subtitle == rhs.subtitle
    }
}

// MARK: - Address Autocomplete View
struct AddressAutocompleteView: View {
    let title: String
    @Binding var text: String
    let placeholder: String
    let errorMessage: String?
    let isRequired: Bool
    let onAddressSelected: ((AddressSuggestion) -> Void)?
    
    @State private var suggestions: [AddressSuggestion] = []
    @State private var isSearching = false
    @State private var showingSuggestions = false
    @State private var searchCompleter = MKLocalSearchCompleter()
    @State private var debounceTimer: Timer?
    @State private var searchDelegate: SearchCompleterDelegate?
    @FocusState private var isFocused: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Title
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
                
                if isSearching {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: LunaraColors.warmGold))
                        .scaleEffect(0.7)
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
                                    .stroke(
                                        errorMessage != nil ? .red :
                                        isFocused ? LunaraColors.warmGold :
                                        LunaraColors.coolLightGray,
                                        lineWidth: isFocused ? 2 : 1
                                    )
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
                        ForEach(suggestions) { suggestion in
                            AddressSuggestionRow(
                                suggestion: suggestion,
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
            
            // Error Message
            if let errorMessage = errorMessage {
                HStack {
                    Image(systemName: "exclamationmark.circle.fill")
                        .foregroundColor(.red)
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.red)
                    Spacer()
                }
            }
            
            // Helper Text
            if errorMessage == nil {
                Text("Start typing to see address suggestions")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .onAppear {
            setupSearchCompleter()
        }
        .onTapGesture {
            // Dismiss suggestions when tapping outside
            if showingSuggestions {
                showingSuggestions = false
            }
        }
    }
    
    // MARK: - Private Methods
    
    private func setupSearchCompleter() {
        let delegate = SearchCompleterDelegate { results in
            Task { @MainActor in
                handleSearchResults(results)
            }
        }
        searchDelegate = delegate
        searchCompleter.delegate = delegate
        searchCompleter.resultTypes = [.address, .pointOfInterest]
    }
    
    private func handleTextChange(_ newValue: String) {
        // Cancel previous timer
        debounceTimer?.invalidate()
        
        // Clear suggestions if text is empty
        if newValue.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            suggestions = []
            showingSuggestions = false
            isSearching = false
            return
        }
        
        // Start searching indicator
        isSearching = true
        
        // Schedule search with debounce
        debounceTimer = Timer.scheduledTimer(withTimeInterval: 0.3, repeats: false) { _ in
            Task { @MainActor in
                performSearch(for: newValue)
            }
        }
    }
    
    @MainActor
    private func performSearch(for query: String) {
        guard !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            isSearching = false
            return
        }
        
        searchCompleter.queryFragment = query
    }
    
    @MainActor
    private func handleSearchResults(_ results: [MKLocalSearchCompletion]) {
        isSearching = false
        
        let newSuggestions = results.prefix(5).map { completion in
            AddressSuggestion(
                title: completion.title,
                subtitle: completion.subtitle,
                coordinate: nil,
                placemark: nil
            )
        }
        
        suggestions = Array(newSuggestions)
        showingSuggestions = !suggestions.isEmpty && isFocused
    }
    
    private func selectSuggestion(_ suggestion: AddressSuggestion) {
        text = suggestion.fullAddress
        showingSuggestions = false
        isFocused = false
        
        // Geocode the selected address to get coordinates
        geocodeSelectedAddress(suggestion)
        
        onAddressSelected?(suggestion)
    }
    
    private func geocodeSelectedAddress(_ suggestion: AddressSuggestion) {
        let geocoder = CLGeocoder()
        geocoder.geocodeAddressString(suggestion.fullAddress) { placemarks, error in
            if let placemark = placemarks?.first,
               let location = placemark.location {
                
                let updatedSuggestion = AddressSuggestion(
                    title: suggestion.title,
                    subtitle: suggestion.subtitle,
                    coordinate: location.coordinate,
                    placemark: MKPlacemark(placemark: placemark)
                )
                
                DispatchQueue.main.async {
                    onAddressSelected?(updatedSuggestion)
                }
            }
        }
    }
}

// MARK: - Address Suggestion Row
struct AddressSuggestionRow: View {
    let suggestion: AddressSuggestion
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                Image(systemName: "location")
                    .foregroundColor(LunaraColors.warmGold)
                    .frame(width: 20)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(suggestion.title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(LunaraColors.charcoalGray)
                        .lineLimit(1)
                    
                    if !suggestion.subtitle.isEmpty {
                        Text(suggestion.subtitle)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                }
                
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

// MARK: - Search Completer Delegate
class SearchCompleterDelegate: NSObject, MKLocalSearchCompleterDelegate {
    private let onResults: ([MKLocalSearchCompletion]) -> Void
    
    init(onResults: @escaping ([MKLocalSearchCompletion]) -> Void) {
        self.onResults = onResults
    }
    
    func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
        onResults(completer.results)
    }
    
    func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
        print("Address search failed: \(error.localizedDescription)")
        onResults([])
    }
}

// MARK: - Preview
#Preview {
    VStack(spacing: 20) {
        AddressAutocompleteView(
            title: "Street Address",
            text: .constant(""),
            placeholder: "Enter your address",
            errorMessage: nil,
            isRequired: true,
            onAddressSelected: { suggestion in
                print("Selected: \(suggestion.fullAddress)")
            }
        )
        
        Spacer()
    }
    .padding()
}
