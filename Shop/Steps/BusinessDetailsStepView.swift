//
//  BusinessDetailsStepView.swift
//  LunaraApp
//
//  Created by Lunara Team on 16/07/2025.
//

import SwiftUI
import Foundation

struct BusinessDetailsStepView: View {
    @Binding var formData: ShopCreationFormData

    private let countryValidation = CountryValidationService.shared
    
    var body: some View {
        VStack(spacing: 24) {
            // Header
            VStack(spacing: 16) {
                Image(systemName: "building.2")
                    .font(.system(size: 48))
                    .foregroundColor(LunaraColors.warmGold)
                
                VStack(spacing: 8) {
                    Text("Business Details")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(LunaraColors.charcoalGray)
                    
                    Text("Tell us about your beauty business so customers can find and book with you.")
                        .font(.body)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
            }
            
            // Form Fields
            VStack(spacing: 20) {
                // Business Name
                FormFieldView(
                    title: "Business Name",
                    text: $formData.name,
                    placeholder: "Enter your business name",
                    errorMessage: formData.errors["name"],
                    isRequired: true,
                    validationRules: [FormValidationRule.required, FormValidationRule.minLength(2), FormValidationRule.maxLength(100)]
                )

                // Business Description
                FormFieldView(
                    title: "Business Description",
                    text: $formData.description,
                    placeholder: "Describe your services and what makes your business special",
                    errorMessage: formData.errors["description"],
                    isRequired: true,
                    isMultiline: true,
                    maxLength: 500,
                    validationRules: [FormValidationRule.required, FormValidationRule.minLength(10), FormValidationRule.maxLength(500)]
                )
                
                // Business Types
                BusinessTypesSelectionView(
                    selectedTypes: $formData.businessTypes,
                    errorMessage: formData.errors["businessTypes"]
                )
                
                // Contact Information Section
                VStack(alignment: .leading, spacing: 16) {
                    Text("Contact Information")
                        .font(.headline)
                        .foregroundColor(LunaraColors.charcoalGray)
                    
                    VStack(spacing: 16) {
                        PhoneNumberFieldView(
                            title: "Phone Number",
                            phoneNumber: $formData.phone,
                            selectedCountryCode: $formData.country,
                            placeholder: "Enter phone number",
                            errorMessage: formData.errors["phone"],
                            isRequired: true,
                            enableRealTimeValidation: true
                        )

                        FormFieldView(
                            title: "Email Address",
                            text: $formData.email,
                            placeholder: "business@example.com",
                            errorMessage: formData.errors["email"],
                            isRequired: true,
                            keyboardType: .emailAddress,
                            validationRules: [FormValidationRule.required, FormValidationRule.email]
                        )

                        FormFieldView(
                            title: "Website (Optional)",
                            text: $formData.website,
                            placeholder: "https://www.yourbusiness.com",
                            errorMessage: formData.errors["website"],
                            keyboardType: .URL,
                            validationRules: [FormValidationRule.custom({ url in
                                if url.isEmpty { return FormValidationState.idle }
                                guard let _ = URL(string: url), url.hasPrefix("http") else {
                                    return FormValidationState.invalid("Please enter a valid URL starting with http:// or https://")
                                }
                                return FormValidationState.valid
                            })]
                        )
                    }
                }
                
                // Address Section
                VStack(alignment: .leading, spacing: 16) {
                    Text("Business Address")
                        .font(.headline)
                        .foregroundColor(LunaraColors.charcoalGray)
                    
                    VStack(spacing: 16) {
                        // Enhanced Address Field with Autocomplete
                        AddressAutocompleteView(
                            title: "Street Address",
                            text: $formData.address,
                            placeholder: getAddressPlaceholder(),
                            errorMessage: formData.errors["address"],
                            isRequired: true,
                            onAddressSelected: { suggestion in
                                // Auto-fill city and coordinates if available
                                if let coordinate = suggestion.coordinate {
                                    formData.latitude = coordinate.latitude
                                    formData.longitude = coordinate.longitude
                                }

                                // Try to extract city from subtitle
                                let components = suggestion.subtitle.components(separatedBy: ", ")
                                if let city = components.first, !city.isEmpty {
                                    formData.city = city
                                }
                            }
                        )
                        
                        HStack(spacing: 12) {
                            CityAutocompleteView(
                                title: "City",
                                text: $formData.city,
                                countryCode: formData.country,
                                placeholder: getCityPlaceholder(),
                                errorMessage: formData.errors["city"],
                                isRequired: true,
                                enableRealTimeValidation: true
                            )

                            // Show state/region field only for countries that require it
                            if countryValidation.isStateRequired(for: formData.country) || shouldShowStateField() {
                                FormFieldView(
                                    title: countryValidation.getStateLabel(for: formData.country),
                                    text: $formData.state,
                                    placeholder: getStatePlaceholder(),
                                    errorMessage: formData.errors["state"],
                                    isRequired: countryValidation.isStateRequired(for: formData.country),
                                    validationRules: countryValidation.isStateRequired(for: formData.country) ? [FormValidationRule.required] : []
                                )
                            }
                        }

                        HStack(spacing: 12) {
                            // Show postal code field only for countries that require it
                            if countryValidation.isPostalCodeRequired(for: formData.country) {
                                FormFieldView(
                                    title: countryValidation.getPostalCodeLabel(for: formData.country),
                                    text: $formData.postalCode,
                                    placeholder: getPostalCodePlaceholder(),
                                    errorMessage: formData.errors["postalCode"],
                                    isRequired: true,
                                    validationRules: [FormValidationRule.required, FormValidationRule.postalCode(countryCode: formData.country)]
                                )
                            }

                            CountrySelectionView(
                                selectedCountry: $formData.country
                            )
                        }
                    }
                }
            }
        }
    }

    // MARK: - Helper Methods

    private func getPostalCodePlaceholder() -> String {
        switch formData.country.uppercased() {
        case "US": return "12345"
        case "CA": return "A1A 1A1"
        case "GB": return "SW1A 1AA"
        case "DE", "FR": return "12345"
        case "BG": return "1000"
        case "AU": return "2000"
        default: return "12345"
        }
    }

    private func getCityPlaceholder() -> String {
        switch formData.country.uppercased() {
        case "BG": return "Sofia, Plovdiv, Varna..."
        case "US": return "New York, Los Angeles..."
        case "CA": return "Toronto, Vancouver..."
        case "GB": return "London, Manchester..."
        case "DE": return "Berlin, Munich..."
        case "FR": return "Paris, Lyon..."
        case "AU": return "Sydney, Melbourne..."
        default: return "Enter city name"
        }
    }

    private func getAddressPlaceholder() -> String {
        switch formData.country.uppercased() {
        case "BG": return "123 Vitosha Street, Floor 2, Apt 5"
        case "US": return "123 Main Street, Apt 4B"
        case "CA": return "123 Main Street, Unit 4B"
        case "GB": return "123 High Street, Flat 4B"
        case "DE": return "Hauptstraße 123, Wohnung 4B"
        case "FR": return "123 Rue de la Paix, Apt 4B"
        case "AU": return "123 Main Street, Unit 4B"
        default: return "123 Main Street"
        }
    }

    private func shouldShowStateField() -> Bool {
        // Show state field for countries that commonly use states/regions
        switch formData.country.uppercased() {
        case "US", "CA", "AU", "DE", "BG":
            return true
        default:
            return false
        }
    }

    private func getStatePlaceholder() -> String {
        switch formData.country.uppercased() {
        case "BG": return "Sofia Region, Plovdiv Region..."
        case "US": return "California, New York..."
        case "CA": return "Ontario, British Columbia..."
        case "AU": return "New South Wales, Victoria..."
        case "DE": return "Bavaria, Berlin..."
        default: return "State/Region"
        }
    }
}

// MARK: - Business Types Selection View
struct BusinessTypesSelectionView: View {
    @Binding var selectedTypes: [BusinessType]
    let errorMessage: String?
    
    private let businessTypes: [BusinessType] = [
        .hairdresser, .barber, .beautySalon, .nailStylist, .spa, .massage,
        .skincareclinic, .eyebrowThreading, .lashExtensions, .makeupArtist, .tattooParlor, .wellnessCenter
    ]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Business Types")
                    .font(.headline)
                    .foregroundColor(LunaraColors.charcoalGray)
                
                Text("*")
                    .foregroundColor(.red)
                
                Spacer()
            }
            
            Text("Select all that apply to your business")
                .font(.caption)
                .foregroundColor(.secondary)
            
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                ForEach(businessTypes, id: \.self) { type in
                    BusinessTypeChip(
                        type: type,
                        isSelected: selectedTypes.contains(type)
                    ) {
                        toggleBusinessType(type)
                    }
                }
            }
            
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
        }
    }
    
    private func toggleBusinessType(_ type: BusinessType) {
        withAnimation(.easeInOut(duration: 0.2)) {
            if selectedTypes.contains(type) {
                selectedTypes.removeAll { $0 == type }
            } else {
                selectedTypes.append(type)
            }
        }
    }
}

// MARK: - Business Type Chip
struct BusinessTypeChip: View {
    let type: BusinessType
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.caption)
                    .foregroundColor(isSelected ? .white : LunaraColors.warmGold)
                
                Text(type.displayName)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(isSelected ? .white : LunaraColors.charcoalGray)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(
                RoundedRectangle(cornerRadius: 20)
                    .fill(isSelected ? LunaraColors.warmGold : Color.clear)
                    .overlay(
                        RoundedRectangle(cornerRadius: 20)
                            .stroke(LunaraColors.warmGold, lineWidth: 1)
                    )
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Country Selection View
struct CountrySelectionView: View {
    @Binding var selectedCountry: String
    @State private var showingCountryPicker = false
    
    private let countries = [
        ("BG", "Bulgaria"),
        ("US", "United States"),
        ("CA", "Canada"),
        ("GB", "United Kingdom"),
        ("AU", "Australia"),
        ("DE", "Germany"),
        ("FR", "France"),
        ("IT", "Italy"),
        ("ES", "Spain"),
        ("NL", "Netherlands"),
        ("BE", "Belgium"),
        ("CH", "Switzerland"),
        ("AT", "Austria"),
        ("SE", "Sweden"),
        ("NO", "Norway"),
        ("DK", "Denmark"),
        ("FI", "Finland")
    ]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Country")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(LunaraColors.charcoalGray)
                
                Text("*")
                    .foregroundColor(.red)
                
                Spacer()
            }
            
            Button(action: {
                showingCountryPicker = true
            }) {
                HStack {
                    Text(countryDisplayName)
                        .foregroundColor(LunaraColors.charcoalGray)
                    
                    Spacer()
                    
                    Image(systemName: "chevron.down")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(12)
                .background(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(LunaraColors.coolLightGray, lineWidth: 1)
                )
            }
            .buttonStyle(PlainButtonStyle())
        }
        .sheet(isPresented: $showingCountryPicker) {
            CountryPickerView(
                selectedCountry: $selectedCountry,
                countries: countries
            )
        }
    }
    
    private var countryDisplayName: String {
        countries.first { $0.0 == selectedCountry }?.1 ?? "Select Country"
    }
}

// MARK: - Country Picker View
struct CountryPickerView: View {
    @Binding var selectedCountry: String
    let countries: [(String, String)]
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            List(countries, id: \.0) { country in
                Button(action: {
                    selectedCountry = country.0
                    dismiss()
                }) {
                    HStack {
                        Text(country.1)
                            .foregroundColor(.primary)
                        
                        Spacer()
                        
                        if selectedCountry == country.0 {
                            Image(systemName: "checkmark")
                                .foregroundColor(LunaraColors.warmGold)
                        }
                    }
                }
                .buttonStyle(PlainButtonStyle())
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

// MARK: - Preview
#Preview {
    BusinessDetailsStepView(
        formData: .constant(ShopCreationFormData())
    )
}
