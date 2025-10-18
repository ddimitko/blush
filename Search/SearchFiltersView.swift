//
//  SearchFiltersView.swift
//  LunaraApp
//
//  Created by Lunara Team on 16/07/2025.
//

import SwiftUI
import CoreLocation

/// Filter options view for search functionality
struct SearchFiltersView: View {
    // MARK: - Bindings
    @Binding var selectedBusinessTypes: Set<BusinessType>
    @Binding var selectedSortOption: SortOption
    @Binding var cityFilter: String
    @Binding var useLocation: Bool
    @Binding var distanceRadius: Double
    @Binding var minimumRating: Double
    @Binding var requiresCardPayment: Bool?

    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss
    @StateObject private var locationService = LocationService.shared

    // MARK: - State
    @State private var tempBusinessTypes: Set<BusinessType>
    @State private var tempSortOption: SortOption
    @State private var tempCityFilter: String
    @State private var tempUseLocation: Bool
    @State private var tempDistanceRadius: Double
    @State private var tempMinimumRating: Double
    @State private var tempRequiresCardPayment: Bool?
    @State private var selectedTab = 0

    // MARK: - Animation State
    @State private var tabContentVisible = false
    @State private var sliderValue: Double = 0

    // MARK: - Initialization
    init(
        selectedBusinessTypes: Binding<Set<BusinessType>>,
        selectedSortOption: Binding<SortOption>,
        cityFilter: Binding<String>,
        useLocation: Binding<Bool>,
        distanceRadius: Binding<Double>,
        minimumRating: Binding<Double>,
        requiresCardPayment: Binding<Bool?>
    ) {
        self._selectedBusinessTypes = selectedBusinessTypes
        self._selectedSortOption = selectedSortOption
        self._cityFilter = cityFilter
        self._useLocation = useLocation
        self._distanceRadius = distanceRadius
        self._minimumRating = minimumRating
        self._requiresCardPayment = requiresCardPayment

        self._tempBusinessTypes = State(initialValue: selectedBusinessTypes.wrappedValue)
        self._tempSortOption = State(initialValue: selectedSortOption.wrappedValue)
        self._tempCityFilter = State(initialValue: cityFilter.wrappedValue)
        self._tempUseLocation = State(initialValue: useLocation.wrappedValue)
        self._tempDistanceRadius = State(initialValue: distanceRadius.wrappedValue)
        self._tempMinimumRating = State(initialValue: minimumRating.wrappedValue)
        self._tempRequiresCardPayment = State(initialValue: requiresCardPayment.wrappedValue)
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Tab Picker
                Picker("Filter Categories", selection: $selectedTab) {
                    Text("Categories").tag(0)
                    Text("Location").tag(1)
                    Text("Quality").tag(2)
                    Text("Sort").tag(3)
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding(.horizontal, 16)
                .padding(.top, 16)

                // Tab Content with smooth transitions
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        Group {
                            switch selectedTab {
                            case 0:
                                businessTypesSection
                            case 1:
                                locationSection
                            case 2:
                                qualitySection
                            case 3:
                                sortOptionsSection
                            default:
                                businessTypesSection
                            }
                        }
                        .opacity(tabContentVisible ? 1 : 0)
                        .offset(y: tabContentVisible ? 0 : 20)
                        .animation(.easeInOut(duration: 0.3), value: tabContentVisible)
                        .animation(.easeInOut(duration: 0.3), value: selectedTab)

                        // Clear All Section (always visible)
                        clearAllSection
                            .opacity(tabContentVisible ? 1 : 0)
                            .animation(.easeInOut(duration: 0.3).delay(0.1), value: tabContentVisible)
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 24)
                    .padding(.bottom, 32)
                }
            }
            .navigationTitle("Filters")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.secondaryText)
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Apply") {
                        applyFilters()
                    }
                    .foregroundColor(LunaraColors.warmGold)
                    .fontWeight(.semibold)
                }
            }
        }
        .onAppear {
            // Trigger initial animation
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                withAnimation(.easeInOut(duration: 0.4)) {
                    tabContentVisible = true
                }
            }
        }
        .onChange(of: selectedTab) { _, _ in
            // Animate tab change
            withAnimation(.easeInOut(duration: 0.2)) {
                tabContentVisible = false
            }

            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                withAnimation(.easeInOut(duration: 0.3)) {
                    tabContentVisible = true
                }
            }
        }
    }
    
    // MARK: - Business Types Section
    private var businessTypesSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Business Types")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2), spacing: 12) {
                ForEach(BusinessType.allCases, id: \.self) { businessType in
                    BusinessTypeFilterCard(
                        businessType: businessType,
                        isSelected: tempBusinessTypes.contains(businessType)
                    ) {
                        toggleBusinessType(businessType)
                    }
                }
            }
        }
    }
    
    // MARK: - Location Section
    private var locationSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Location")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)

            // City Filter
            VStack(alignment: .leading, spacing: 8) {
                Text("City or Area")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.primaryText)

                TextField("Enter city name", text: $tempCityFilter)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .font(.system(size: 16))
            }

            // Use Location Toggle
            VStack(alignment: .leading, spacing: 12) {
                Toggle(isOn: $tempUseLocation) {
                    HStack {
                        Image(systemName: "location.fill")
                            .foregroundColor(LunaraColors.warmGold)
                        Text("Use my current location")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(LunaraColors.primaryText)
                    }
                }
                .toggleStyle(SwitchToggleStyle(tint: LunaraColors.warmGold))

                // Distance Radius (only when location is enabled)
                if tempUseLocation {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Search radius")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(LunaraColors.primaryText)

                            Spacer()

                            Text("\(Int(tempDistanceRadius)) km")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(LunaraColors.warmGold)
                        }

                        Slider(value: $tempDistanceRadius, in: 1...100, step: 1)
                            .accentColor(LunaraColors.warmGold)
                            .animation(.easeInOut(duration: 0.2), value: tempDistanceRadius)

                        HStack {
                            Text("1 km")
                                .font(.system(size: 12))
                                .foregroundColor(LunaraColors.secondaryText)

                            Spacer()

                            Text("100 km")
                                .font(.system(size: 12))
                                .foregroundColor(LunaraColors.secondaryText)
                        }
                    }
                    .padding(.top, 8)
                }
            }
        }
    }

    // MARK: - Quality Section
    private var qualitySection: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Quality & Payment")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)

            // Minimum Rating
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Minimum rating")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)

                    Spacer()

                    HStack(spacing: 4) {
                        if tempMinimumRating > 0 {
                            Text(String(format: "%.1f", tempMinimumRating))
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(LunaraColors.warmGold)

                            Image(systemName: "star.fill")
                                .font(.system(size: 12))
                                .foregroundColor(LunaraColors.starFilled)
                        } else {
                            Text("Any rating")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(LunaraColors.secondaryText)
                        }
                    }
                }

                Slider(value: $tempMinimumRating, in: 0...5, step: 0.5)
                    .accentColor(LunaraColors.warmGold)
                    .animation(.easeInOut(duration: 0.2), value: tempMinimumRating)

                HStack {
                    Text("Any")
                        .font(.system(size: 12))
                        .foregroundColor(LunaraColors.secondaryText)

                    Spacer()

                    HStack(spacing: 2) {
                        Text("5")
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.secondaryText)
                        Image(systemName: "star.fill")
                            .font(.system(size: 10))
                            .foregroundColor(LunaraColors.starFilled)
                    }
                }
            }

            // Card Payment Options
            VStack(alignment: .leading, spacing: 12) {
                Text("Payment Options")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.primaryText)

                VStack(spacing: 8) {
                    PaymentOptionRow(
                        title: "Any payment method",
                        icon: "banknote",
                        isSelected: tempRequiresCardPayment == nil
                    ) {
                        tempRequiresCardPayment = nil
                    }

                    PaymentOptionRow(
                        title: "Accepts card payments",
                        icon: "creditcard",
                        isSelected: tempRequiresCardPayment == true
                    ) {
                        tempRequiresCardPayment = true
                    }

                    PaymentOptionRow(
                        title: "Cash only",
                        icon: "banknote",
                        isSelected: tempRequiresCardPayment == false
                    ) {
                        tempRequiresCardPayment = false
                    }
                }
            }
        }
    }

    // MARK: - Sort Options Section
    private var sortOptionsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Sort By")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)

            VStack(spacing: 8) {
                ForEach(SortOption.allCases, id: \.self) { option in
                    SortOptionRow(
                        option: option,
                        isSelected: tempSortOption == option
                    ) {
                        tempSortOption = option
                    }
                }
            }
        }
    }
    
    // MARK: - Clear All Section
    private var clearAllSection: some View {
        VStack(spacing: 16) {
            Divider()

            Button(action: {
                tempBusinessTypes.removeAll()
                tempSortOption = .relevance
                tempCityFilter = ""
                tempUseLocation = false
                tempDistanceRadius = 25.0
                tempMinimumRating = 0.0
                tempRequiresCardPayment = nil
            }) {
                HStack {
                    Image(systemName: "trash")
                        .font(.system(size: 16, weight: .medium))

                    Text("Clear All Filters")
                        .font(.system(size: 16, weight: .medium))
                }
                .foregroundColor(LunaraColors.error)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(LunaraColors.error.opacity(0.1))
                .cornerRadius(8)
            }
        }
    }
    
    // MARK: - Methods
    private func toggleBusinessType(_ businessType: BusinessType) {
        if tempBusinessTypes.contains(businessType) {
            tempBusinessTypes.remove(businessType)
        } else {
            tempBusinessTypes.insert(businessType)
        }
    }
    
    private func applyFilters() {
        selectedBusinessTypes = tempBusinessTypes
        selectedSortOption = tempSortOption
        cityFilter = tempCityFilter
        useLocation = tempUseLocation
        distanceRadius = tempDistanceRadius
        minimumRating = tempMinimumRating
        requiresCardPayment = tempRequiresCardPayment
        dismiss()
    }
}

// MARK: - Business Type Filter Card
struct BusinessTypeFilterCard: View {
    let businessType: BusinessType
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: businessType.iconName)
                    .font(.system(size: 20, weight: .medium))
                    .foregroundColor(isSelected ? LunaraColors.white : LunaraColors.warmGold)
                
                Text(businessType.displayName)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(isSelected ? LunaraColors.white : LunaraColors.primaryText)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(isSelected ? LunaraColors.warmGold : LunaraColors.cardBackground)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(
                        isSelected ? LunaraColors.warmGold : LunaraColors.coolLightGray,
                        lineWidth: isSelected ? 2 : 1
                    )
            )
        }
    }
}

// MARK: - Sort Option Row
struct SortOptionRow: View {
    let option: SortOption
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: option.iconName)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(isSelected ? LunaraColors.warmGold : LunaraColors.secondaryText)
                    .frame(width: 20)

                Text(option.displayName)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(LunaraColors.primaryText)

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(LunaraColors.warmGold)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(isSelected ? LunaraColors.warmGold.opacity(0.1) : Color.clear)
            .cornerRadius(8)
        }
    }
}

// MARK: - Payment Option Row
struct PaymentOptionRow: View {
    let title: String
    let icon: String
    let isSelected: Bool
    let action: () -> Void
    @State private var isPressed = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(isSelected ? LunaraColors.warmGold : LunaraColors.secondaryText)
                    .frame(width: 20)
                    .scaleEffect(isPressed ? 0.9 : 1.0)
                    .animation(.easeInOut(duration: 0.1), value: isPressed)

                Text(title)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(LunaraColors.primaryText)

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(LunaraColors.warmGold)
                        .scaleEffect(isSelected ? 1.1 : 1.0)
                        .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isSelected)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(isSelected ? LunaraColors.warmGold.opacity(0.1) : Color.clear)
            .cornerRadius(8)
            .scaleEffect(isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: isPressed)
            .animation(.easeInOut(duration: 0.2), value: isSelected)
        }
        .onLongPressGesture(minimumDuration: 0, maximumDistance: .infinity, pressing: { pressing in
            withAnimation(.easeInOut(duration: 0.1)) {
                isPressed = pressing
            }
        }, perform: {})
    }
}

// MARK: - Preview
struct SearchFiltersView_Previews: PreviewProvider {
    static var previews: some View {
        SearchFiltersView(
            selectedBusinessTypes: .constant([.beautySalon, .spa]),
            selectedSortOption: .constant(.rating),
            cityFilter: .constant(""),
            useLocation: .constant(false),
            distanceRadius: .constant(25.0),
            minimumRating: .constant(0.0),
            requiresCardPayment: .constant(nil)
        )
    }
}
