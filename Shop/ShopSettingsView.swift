//
//  ShopSettingsView.swift
//  LunaraApp
//
//  Created by Lunara Team on 24/07/2025.
//

import SwiftUI

/// Shop settings view for managing shop information and preferences
struct ShopSettingsView: View {
    // MARK: - Properties
    let shop: Shop
    
    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var appState: AppState
    
    // MARK: - State
    @StateObject private var shopService = ShopService.shared
    @State private var selectedTab: SettingsTab = .general
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showingError = false
    @State private var showingSuccess = false
    @State private var successMessage = ""
    
    // General settings form state
    @State private var name = ""
    @State private var description = ""
    @State private var address = ""
    @State private var city = ""
    @State private var state = ""
    @State private var postalCode = ""
    @State private var country = ""
    @State private var phone = ""
    @State private var email = ""
    @State private var website = ""
    @State private var businessTypes: [BusinessType] = []
    
    enum SettingsTab: String, CaseIterable {
        case general = "General"
        case hours = "Business Hours"
        case preferences = "Preferences"
        
        var icon: String {
            switch self {
            case .general: return "info.circle"
            case .hours: return "clock"
            case .preferences: return "gearshape"
            }
        }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Tab selector
                tabSelectorView
                
                // Content based on selected tab
                ScrollView {
                    VStack(spacing: 24) {
                        switch selectedTab {
                        case .general:
                            generalSettingsView
                        case .hours:
                            businessHoursView
                        case .preferences:
                            preferencesView
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 32)
                }
            }
            .navigationTitle("Shop Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.secondaryText)
                }
                
                if selectedTab == .general {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("Save") {
                            saveGeneralSettings()
                        }
                        .foregroundColor(LunaraColors.warmGold)
                        .disabled(isLoading || !isFormValid)
                    }
                }
            }
        }
        .onAppear {
            initializeFormData()
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage ?? "An error occurred")
        }
        .alert("Success", isPresented: $showingSuccess) {
            Button("OK") { }
        } message: {
            Text(successMessage)
        }
    }
    
    // MARK: - Tab Selector View
    private var tabSelectorView: some View {
        HStack(spacing: 0) {
            ForEach(SettingsTab.allCases, id: \.self) { tab in
                Button(action: {
                    selectedTab = tab
                }) {
                    VStack(spacing: 6) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 16))
                        
                        Text(tab.rawValue)
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundColor(selectedTab == tab ? LunaraColors.warmGold : LunaraColors.secondaryText)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                }
            }
        }
        .background(LunaraColors.white)
        .overlay(
            Rectangle()
                .fill(LunaraColors.coolLightGray.opacity(0.3))
                .frame(height: 1),
            alignment: .bottom
        )
    }
    
    // MARK: - General Settings View
    private var generalSettingsView: some View {
        VStack(spacing: 20) {
            // Basic Information Section
            settingsSection("Basic Information") {
                VStack(spacing: 16) {
                    FormFieldView(
                        title: "Shop Name",
                        text: $name,
                        placeholder: "Enter shop name",
                        isRequired: true
                    )
                    
                    FormFieldView(
                        title: "Description",
                        text: $description,
                        placeholder: "Describe your shop and services...",
                        isRequired: true,
                        isMultiline: true
                    )
                    
                    HStack(spacing: 12) {
                        FormFieldView(
                            title: "Phone",
                            text: $phone,
                            placeholder: "+1234567890",
                            isRequired: true,
                            keyboardType: .phonePad
                        )
                        
                        FormFieldView(
                            title: "Email",
                            text: $email,
                            placeholder: "shop@example.com",
                            isRequired: true,
                            keyboardType: .emailAddress
                        )
                    }
                    
                    FormFieldView(
                        title: "Website",
                        text: $website,
                        placeholder: "https://yourshop.com",
                        keyboardType: .URL
                    )
                }
            }
            
            // Address Section
            settingsSection("Address") {
                VStack(spacing: 16) {
                    FormFieldView(
                        title: "Street Address",
                        text: $address,
                        placeholder: "123 Main Street",
                        isRequired: true
                    )
                    
                    HStack(spacing: 12) {
                        FormFieldView(
                            title: "City",
                            text: $city,
                            placeholder: "City",
                            isRequired: true
                        )
                        
                        FormFieldView(
                            title: "State/Province",
                            text: $state,
                            placeholder: "State",
                            isRequired: true
                        )
                    }
                    
                    HStack(spacing: 12) {
                        FormFieldView(
                            title: "Postal Code",
                            text: $postalCode,
                            placeholder: "12345",
                            isRequired: true
                        )
                        
                        FormFieldView(
                            title: "Country",
                            text: $country,
                            placeholder: "Country",
                            isRequired: true
                        )
                    }
                }
            }
            
            // Business Types Section
            settingsSection("Business Types") {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Select the types of services your business offers")
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                    
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2), spacing: 12) {
                        ForEach(BusinessType.allCases, id: \.self) { type in
                            Button(action: {
                                toggleBusinessType(type)
                            }) {
                                HStack {
                                    Image(systemName: businessTypes.contains(type) ? "checkmark.square.fill" : "square")
                                        .foregroundColor(businessTypes.contains(type) ? LunaraColors.warmGold : LunaraColors.secondaryText)
                                    
                                    Text(type.displayName)
                                        .font(.system(size: 14))
                                        .foregroundColor(LunaraColors.primaryText)
                                    
                                    Spacer()
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(
                                    businessTypes.contains(type) ?
                                    LunaraColors.warmGold.opacity(0.1) :
                                    LunaraColors.coolLightGray.opacity(0.3)
                                )
                                .cornerRadius(8)
                            }
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Business Hours View
    private var businessHoursView: some View {
        VStack(spacing: 20) {
            settingsSection("Business Hours") {
                VStack(spacing: 16) {
                    Text("Business hours management coming soon!")
                        .font(.system(size: 16))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)
                        .padding(.vertical, 40)
                    
                    Text("You'll be able to set your operating hours, breaks, and special holiday schedules.")
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)
                }
            }
        }
    }
    
    // MARK: - Preferences View
    private var preferencesView: some View {
        VStack(spacing: 20) {
            settingsSection("Preferences") {
                VStack(spacing: 16) {
                    Text("Shop preferences coming soon!")
                        .font(.system(size: 16))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)
                        .padding(.vertical, 40)
                    
                    Text("Configure booking preferences, notification settings, and other shop-specific options.")
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)
                }
            }
        }
    }
    
    // MARK: - Helper Views
    private func settingsSection<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            content()
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Form Validation
    private var isFormValid: Bool {
        !name.isEmpty &&
        !description.isEmpty &&
        !address.isEmpty &&
        !city.isEmpty &&
        !state.isEmpty &&
        !postalCode.isEmpty &&
        !country.isEmpty &&
        !phone.isEmpty &&
        !email.isEmpty
    }
    
    // MARK: - Methods
    private func initializeFormData() {
        name = shop.name
        description = shop.description
        address = shop.address
        city = shop.city
        state = shop.state
        postalCode = shop.postalCode
        country = shop.country
        phone = shop.phone
        email = shop.email
        website = shop.website ?? ""
        businessTypes = shop.businessTypes
    }
    
    private func toggleBusinessType(_ type: BusinessType) {
        if businessTypes.contains(type) {
            businessTypes.removeAll { $0 == type }
        } else {
            businessTypes.append(type)
        }
    }
    
    private func saveGeneralSettings() {
        isLoading = true
        errorMessage = nil
        
        let request = ShopUpdateRequest(
            name: name,
            description: description,
            address: address,
            city: city,
            state: state,
            postalCode: postalCode,
            country: country,
            phone: phone,
            email: email,
            website: website.isEmpty ? nil : website,
            businessTypes: businessTypes
        )
        
        Task {
            do {
                _ = try await shopService.updateShop(shopId: shop.id, request)
                await MainActor.run {
                    isLoading = false
                    successMessage = "Shop settings updated successfully"
                    showingSuccess = true
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = error.localizedDescription
                    showingError = true
                }
            }
        }
    }
}

#Preview {
    ShopSettingsView(shop: Shop.preview)
        .environmentObject(AppState.shared)
}
