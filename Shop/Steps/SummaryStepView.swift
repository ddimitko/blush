//
//  SummaryStepView.swift
//  LunaraApp
//
//  Created by Lunara Team on 16/07/2025.
//

import SwiftUI
import Foundation

struct SummaryStepView: View {
    let formData: ShopCreationFormData
    let selectedPlan: SubscriptionPlanResponse?
    
    private let countryValidation = CountryValidationService.shared
    
    var body: some View {
        VStack(spacing: 24) {
            // Header
            VStack(spacing: 16) {
                Image(systemName: "doc.text.magnifyingglass")
                    .font(.system(size: 48))
                    .foregroundColor(LunaraColors.warmGold)
                
                VStack(spacing: 8) {
                    Text("Review Your Details")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(LunaraColors.charcoalGray)
                    
                    Text("Please review your business information and subscription plan before proceeding to payment.")
                        .font(.body)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
            }
            
            // Summary Content
            ScrollView {
                VStack(spacing: 20) {
                    // Business Information Section
                    SummarySection(title: "Business Information") {
                        VStack(spacing: 12) {
                            SummaryRow(label: "Business Name", value: formData.name)
                            SummaryRow(label: "Description", value: formData.description)
                            SummaryRow(label: "Email", value: formData.email)
                            SummaryRow(label: "Phone", value: formData.phone)
                            
                            if !formData.website.isEmpty {
                                SummaryRow(label: "Website", value: formData.website)
                            }
                        }
                    }
                    
                    // Address Section
                    SummarySection(title: "Business Address") {
                        VStack(spacing: 12) {
                            SummaryRow(label: "Address", value: formData.address)
                            SummaryRow(label: "City", value: formData.city)
                            
                            if countryValidation.isStateRequired(for: formData.country) {
                                SummaryRow(label: countryValidation.getStateLabel(for: formData.country), value: formData.state)
                            }
                            
                            SummaryRow(label: countryValidation.getPostalCodeLabel(for: formData.country), value: formData.postalCode)
                            SummaryRow(label: "Country", value: getCountryName(formData.country))
                        }
                    }
                    
                    // Business Types Section
                    if !formData.businessTypes.isEmpty {
                        SummarySection(title: "Business Types") {
                            LazyVGrid(columns: [
                                GridItem(.flexible()),
                                GridItem(.flexible())
                            ], spacing: 8) {
                                ForEach(formData.businessTypes, id: \.self) { type in
                                    Text(type.displayName)
                                        .font(.caption)
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 6)
                                        .background(LunaraColors.warmGold.opacity(0.1))
                                        .foregroundColor(LunaraColors.warmGold)
                                        .cornerRadius(16)
                                }
                            }
                        }
                    }
                    
                    // Subscription Plan Section
                    if let plan = selectedPlan {
                        SummarySection(title: "Subscription Plan") {
                            VStack(spacing: 12) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(plan.name)
                                            .font(.headline)
                                            .foregroundColor(LunaraColors.charcoalGray)
                                        
                                        Text(plan.description)
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                    
                                    Spacer()
                                    
                                    VStack(alignment: .trailing, spacing: 4) {
                                        Text(formatPlanPrice(plan))
                                            .font(.title3)
                                            .fontWeight(.bold)
                                            .foregroundColor(LunaraColors.warmGold)
                                        
                                        Text("per month")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                }
                                .padding(16)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(LunaraColors.warmGold.opacity(0.1))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12)
                                                .stroke(LunaraColors.warmGold, lineWidth: 1)
                                        )
                                )
                            }
                        }
                    }
                    
                    // Terms Acceptance Confirmation
                    SummarySection(title: "Legal Agreements") {
                        HStack(spacing: 12) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                            
                            Text("Terms & Conditions and Privacy Policy accepted")
                                .font(.body)
                                .foregroundColor(LunaraColors.charcoalGray)
                            
                            Spacer()
                        }
                        .padding(12)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.green.opacity(0.1))
                        )
                    }
                }
                .padding(.horizontal, 4)
            }
        }
    }
    
    // MARK: - Helper Methods
    
    private func formatPlanPrice(_ plan: SubscriptionPlanResponse) -> String {
        return countryValidation.formatCurrency(Double(plan.priceInCents) / 100.0, for: formData.country)
    }
    
    private func getCountryName(_ countryCode: String) -> String {
        return countryValidation.getConfig(for: countryCode)?.name ?? countryCode
    }
}

// MARK: - Summary Section
struct SummarySection<Content: View>: View {
    let title: String
    let content: Content
    
    init(title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)
                .foregroundColor(LunaraColors.charcoalGray)
            
            content
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white)
                .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
        )
    }
}

// MARK: - Summary Row
struct SummaryRow: View {
    let label: String
    let value: String
    
    var body: some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Spacer()
            
            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(LunaraColors.charcoalGray)
                .multilineTextAlignment(.trailing)
        }
    }
}

// MARK: - Preview
struct SummaryStepView_Previews: PreviewProvider {
    static var previews: some View {
        SummaryStepView(
            formData: ShopCreationFormData(),
            selectedPlan: nil
        )
    }
}
