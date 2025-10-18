//
//  SimplifiedSearchFiltersView.swift
//  LunaraApp
//
//  Created by Lunara Team on 30/07/2025.
//

import SwiftUI

/// Simplified search filters view with clean design
struct SimplifiedSearchFiltersView: View {
    // MARK: - Bindings
    @Binding var sortOption: SearchSortOption
    @Binding var selectedCity: String?
    @Binding var selectedPaymentType: PaymentTypeFilter?
    let onApply: () -> Void

    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss

    // MARK: - State
    @State private var tempSortOption: SearchSortOption
    @State private var tempSelectedCity: String?
    @State private var tempSelectedPaymentType: PaymentTypeFilter?

    // MARK: - Initialization
    init(
        sortOption: Binding<SearchSortOption>,
        selectedCity: Binding<String?>,
        selectedPaymentType: Binding<PaymentTypeFilter?>,
        onApply: @escaping () -> Void
    ) {
        self._sortOption = sortOption
        self._selectedCity = selectedCity
        self._selectedPaymentType = selectedPaymentType
        self.onApply = onApply
        self._tempSortOption = State(initialValue: sortOption.wrappedValue)
        self._tempSelectedCity = State(initialValue: selectedCity.wrappedValue)
        self._tempSelectedPaymentType = State(initialValue: selectedPaymentType.wrappedValue)
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                headerSection
                
                // Content
                ScrollView {
                    VStack(spacing: LunaraDesignSystem.Layout.sectionSpacing) {
                        // City Filter
                        cityFilterSection

                        // Payment Type Filter
                        paymentTypeFilterSection

                        // Sort Options
                        sortOptionsSection
                    }
                    .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
                    .padding(.vertical, LunaraDesignSystem.Spacing.xl)
                }
                
                // Apply Button
                applyButtonSection
            }
            .navigationBarHidden(true)
            .background(LunaraColors.background)
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        VStack(spacing: 0) {
            HStack {
                Button("Cancel") {
                    dismiss()
                }
                .font(.system(size: LunaraDesignSystem.Typography.body))
                .foregroundColor(LunaraColors.secondaryText)
                
                Spacer()
                
                Text("Sort & Filter")
                    .font(.system(size: LunaraDesignSystem.Typography.headline, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
                
                Button("Reset") {
                    tempSortOption = .relevance
                }
                .font(.system(size: LunaraDesignSystem.Typography.body))
                .foregroundColor(LunaraColors.warmGold)
            }
            .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
            .padding(.vertical, LunaraDesignSystem.Spacing.lg)
            
            Divider()
                .background(LunaraColors.coolLightGray)
        }
    }
    
    // MARK: - Sort Options Section
    private var sortOptionsSection: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.lg) {
            Text("Sort By")
                .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                .foregroundColor(LunaraColors.primaryText)
            
            VStack(spacing: LunaraDesignSystem.Spacing.md) {
                ForEach(SearchSortOption.allCases, id: \.self) { option in
                    SimplifiedSortOptionRow(
                        option: option,
                        isSelected: tempSortOption == option
                    ) {
                        tempSortOption = option
                    }
                }
            }
        }
    }
    
    // MARK: - Apply Button Section
    private var applyButtonSection: some View {
        VStack(spacing: 0) {
            Divider()
                .background(LunaraColors.coolLightGray)
            
            Button(action: {
                sortOption = tempSortOption
                selectedCity = tempSelectedCity
                selectedPaymentType = tempSelectedPaymentType
                onApply()
                dismiss()
            }) {
                Text("Apply Filters")
                    .font(.system(size: LunaraDesignSystem.Typography.body, weight: .semibold))
                    .foregroundColor(LunaraColors.buttonPrimaryText)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, LunaraDesignSystem.Spacing.lg)
                    .background(LunaraColors.warmGold)
                    .cornerRadius(LunaraDesignSystem.CornerRadius.button)
            }
            .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
            .padding(.vertical, LunaraDesignSystem.Spacing.lg)
        }
        .background(LunaraColors.background)
    }

    // MARK: - City Filter Section
    private var cityFilterSection: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.lg) {
            Text("Filter by City")
                .font(.system(size: LunaraDesignSystem.Typography.headline, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)

            VStack(spacing: LunaraDesignSystem.Spacing.sm) {
                HStack(spacing: LunaraDesignSystem.Spacing.md) {
                    Image(systemName: "location")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)

                    TextField("Enter city name", text: Binding(
                        get: { tempSelectedCity ?? "" },
                        set: { tempSelectedCity = $0.isEmpty ? nil : $0 }
                    ))
                    .font(.system(size: LunaraDesignSystem.Typography.body))
                    .textFieldStyle(PlainTextFieldStyle())

                    if tempSelectedCity != nil {
                        Button(action: { tempSelectedCity = nil }) {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 16))
                                .foregroundColor(LunaraColors.secondaryText)
                        }
                    }
                }
                .padding(LunaraDesignSystem.Spacing.lg)
                .background(LunaraColors.coolLightGray.opacity(0.3))
                .cornerRadius(LunaraDesignSystem.CornerRadius.md)
            }
        }
    }

    // MARK: - Payment Type Filter Section
    private var paymentTypeFilterSection: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.lg) {
            Text("Payment Methods")
                .font(.system(size: LunaraDesignSystem.Typography.headline, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)

            VStack(spacing: LunaraDesignSystem.Spacing.sm) {
                ForEach(PaymentTypeFilter.allCases, id: \.self) { paymentType in
                    SimplifiedPaymentTypeRow(
                        paymentType: paymentType,
                        isSelected: tempSelectedPaymentType == paymentType
                    ) {
                        tempSelectedPaymentType = tempSelectedPaymentType == paymentType ? nil : paymentType
                    }
                }
            }
        }
    }
}

// MARK: - Simplified Payment Type Row
struct SimplifiedPaymentTypeRow: View {
    let paymentType: PaymentTypeFilter
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                // Icon
                Image(systemName: paymentType.iconName)
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(isSelected ? LunaraColors.warmGold : LunaraColors.secondaryText)
                    .frame(width: 24)

                // Title
                Text(paymentType.displayName)
                    .font(.system(size: LunaraDesignSystem.Typography.body, weight: .medium))
                    .foregroundColor(LunaraColors.primaryText)

                Spacer()

                // Selection indicator
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundColor(LunaraColors.warmGold)
                } else {
                    Image(systemName: "circle")
                        .font(.system(size: 20))
                        .foregroundColor(LunaraColors.coolLightGray)
                }
            }
            .padding(LunaraDesignSystem.Card.padding)
            .background(isSelected ? LunaraColors.warmGold.opacity(0.05) : LunaraColors.cardBackground)
            .cornerRadius(LunaraDesignSystem.CornerRadius.card)
            .overlay(
                RoundedRectangle(cornerRadius: LunaraDesignSystem.CornerRadius.card)
                    .stroke(isSelected ? LunaraColors.warmGold : Color.clear, lineWidth: 1)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Simplified Sort Option Row
struct SimplifiedSortOptionRow: View {
    let option: SearchSortOption
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                // Icon
                Image(systemName: option.iconName)
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(isSelected ? LunaraColors.warmGold : LunaraColors.secondaryText)
                    .frame(width: 24)
                
                // Title and description
                VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                    Text(option.displayName)
                        .font(.system(size: LunaraDesignSystem.Typography.body, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    Text(option.description)
                        .font(.system(size: LunaraDesignSystem.Typography.subheadline))
                        .foregroundColor(LunaraColors.secondaryText)
                }
                
                Spacer()
                
                // Selection indicator
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundColor(LunaraColors.warmGold)
                } else {
                    Image(systemName: "circle")
                        .font(.system(size: 20))
                        .foregroundColor(LunaraColors.coolLightGray)
                }
            }
            .padding(LunaraDesignSystem.Card.padding)
            .background(isSelected ? LunaraColors.warmGold.opacity(0.05) : LunaraColors.cardBackground)
            .cornerRadius(LunaraDesignSystem.CornerRadius.card)
            .overlay(
                RoundedRectangle(cornerRadius: LunaraDesignSystem.CornerRadius.card)
                    .stroke(isSelected ? LunaraColors.warmGold : Color.clear, lineWidth: 1)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Search Sort Option Extension
extension SearchSortOption {
    var description: String {
        switch self {
        case .relevance:
            return "Best match for your search"
        case .rating:
            return "Highest rated shops first"
        case .distance:
            return "Closest shops first"
        case .name:
            return "Alphabetical order"
        case .newest:
            return "Recently added shops"
        }
    }
}
