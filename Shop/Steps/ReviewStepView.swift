//
//  ReviewStepView.swift
//  LunaraApp
//
//  Created by Lunara Team on 16/07/2025.
//

import SwiftUI

struct ReviewStepView: View {
    let formData: ShopCreationFormData
    let selectedPlan: SubscriptionPlanResponse?
    
    var body: some View {
        VStack(spacing: 24) {
            // Header
            VStack(spacing: 16) {
                Image(systemName: "checkmark.circle")
                    .font(.system(size: 48))
                    .foregroundColor(LunaraColors.warmGold)
                
                VStack(spacing: 8) {
                    Text("Review & Submit")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(LunaraColors.charcoalGray)
                    
                    Text("Please review your information before creating your shop.")
                        .font(.body)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
            }
            
            // Review Sections
            VStack(spacing: 20) {
                // Business Information
                ReviewSectionView(
                    title: "Business Information",
                    icon: "building.2"
                ) {
                    VStack(spacing: 8) {
                        ReviewRowView(label: "Name", value: formData.name)
                        ReviewRowView(label: "Description", value: formData.description)
                        ReviewRowView(label: "Business Types", value: businessTypesText)
                        ReviewRowView(label: "Phone", value: formData.phone)
                        ReviewRowView(label: "Email", value: formData.email)
                        if !formData.website.isEmpty {
                            ReviewRowView(label: "Website", value: formData.website)
                        }
                    }
                }
                
                // Address Information
                ReviewSectionView(
                    title: "Business Address",
                    icon: "location"
                ) {
                    VStack(spacing: 8) {
                        ReviewRowView(label: "Address", value: formData.address)
                        ReviewRowView(label: "City", value: formData.city)
                        ReviewRowView(label: "State", value: formData.state)
                        ReviewRowView(label: "Postal Code", value: formData.postalCode)
                        ReviewRowView(label: "Country", value: countryDisplayName)
                    }
                }
                
                // Subscription Plan
                if let plan = selectedPlan {
                    ReviewSectionView(
                        title: "Subscription Plan",
                        icon: "creditcard"
                    ) {
                        VStack(spacing: 8) {
                            ReviewRowView(label: "Plan", value: plan.name)
                            ReviewRowView(label: "Description", value: plan.description)
                            ReviewRowView(label: "Price", value: formattedPrice(plan))
                        }
                    }
                }
                
                // Billing Information
                ReviewSectionView(
                    title: "Billing Information",
                    icon: "person.crop.circle"
                ) {
                    VStack(spacing: 8) {
                        ReviewRowView(label: "Name", value: formData.customerName)
                        ReviewRowView(label: "Email", value: formData.customerEmail)
                        ReviewRowView(label: "Phone", value: formData.customerPhone)
                        ReviewRowView(label: "Address", value: billingAddressText)
                    }
                }
            }
            
            // Terms Confirmation
            TermsConfirmationView()
            
            // Final Notice
            FinalNoticeView()
        }
    }
    
    // MARK: - Computed Properties
    private var businessTypesText: String {
        formData.businessTypes.map { $0.displayName }.joined(separator: ", ")
    }
    
    private var countryDisplayName: String {
        let countries = [
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
        return countries.first { $0.0 == formData.country }?.1 ?? formData.country
    }
    
    private var billingAddressText: String {
        var components = [formData.billingAddressLine1]
        if !formData.billingAddressLine2.isEmpty {
            components.append(formData.billingAddressLine2)
        }
        components.append("\(formData.billingCity), \(formData.billingState) \(formData.billingPostalCode)")
        return components.joined(separator: ", ")
    }
    
    private func formattedPrice(_ plan: SubscriptionPlanResponse) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = plan.currency
        let price = formatter.string(from: NSNumber(value: Double(plan.priceInCents) / 100.0)) ?? "$\(plan.priceInCents / 100)"
        return "\(price) per month"
    }
}

// MARK: - Review Section View
struct ReviewSectionView<Content: View>: View {
    let title: String
    let icon: String
    @ViewBuilder let content: Content
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(LunaraColors.warmGold)
                
                Text(title)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(LunaraColors.charcoalGray)
                
                Spacer()
            }
            
            content
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(LunaraColors.coolLightGray, lineWidth: 1)
                )
        )
    }
}

// MARK: - Review Row View
struct ReviewRowView: View {
    let label: String
    let value: String
    
    var body: some View {
        HStack(alignment: .top) {
            Text(label)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.secondary)
                .frame(width: 80, alignment: .leading)
            
            Text(value)
                .font(.subheadline)
                .foregroundColor(LunaraColors.charcoalGray)
                .fixedSize(horizontal: false, vertical: true)
            
            Spacer()
        }
    }
}

// MARK: - Terms Confirmation View
struct TermsConfirmationView: View {
    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
                
                Text("Terms Accepted")
                    .font(.headline)
                    .foregroundColor(LunaraColors.charcoalGray)
                
                Spacer()
            }
            
            Text("You have read and accepted our Terms and Conditions.")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.green.opacity(0.05))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.green.opacity(0.2), lineWidth: 1)
                )
        )
    }
}

// MARK: - Final Notice View
struct FinalNoticeView: View {
    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "info.circle.fill")
                    .foregroundColor(LunaraColors.warmGold)
                
                Text("Ready to Create Your Shop")
                    .font(.headline)
                    .foregroundColor(LunaraColors.charcoalGray)
                
                Spacer()
            }
            
            VStack(alignment: .leading, spacing: 8) {
                Text("By clicking 'Create Shop', you agree to:")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                VStack(alignment: .leading, spacing: 4) {
                    BulletPointView(text: "Start your subscription immediately")
                    BulletPointView(text: "Begin your monthly billing cycle")
                    BulletPointView(text: "Activate your shop on the Lunara platform")
                    BulletPointView(text: "Receive a confirmation email with next steps")
                }
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(LunaraColors.warmGold.opacity(0.05))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(LunaraColors.warmGold.opacity(0.2), lineWidth: 1)
                )
        )
    }
}

// MARK: - Bullet Point View
struct BulletPointView: View {
    let text: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Text("•")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Text(text)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .fixedSize(horizontal: false, vertical: true)
            
            Spacer()
        }
    }
}

// MARK: - Preview
#Preview {
    ReviewStepView(
        formData: {
            var data = ShopCreationFormData()
            data.name = "Bella Beauty Salon"
            data.description = "Full-service beauty salon offering hair, nails, and skincare services"
            data.businessTypes = [.beautySalon, .hairdresser, .nailStylist]
            data.phone = "+1234567890"
            data.email = "info@bellasalon.com"
            data.website = "https://www.bellasalon.com"
            data.address = "123 Main Street"
            data.city = "New York"
            data.state = "NY"
            data.postalCode = "10001"
            data.country = "US"

            data.customerName = "John Doe"
            data.customerEmail = "john@example.com"
            data.customerPhone = "+1234567890"
            data.billingAddressLine1 = "123 Main Street"
            data.billingCity = "New York"
            data.billingState = "NY"
            data.billingPostalCode = "10001"
            data.billingCountry = "US"

            return data
        }(),
        selectedPlan: SubscriptionPlanResponse(
            id: "price_1",
            productId: "prod_1",
            name: "Professional",
            displayName: "Professional Plan",
            description: "For growing businesses",
            priceInCents: 4999,
            currency: "USD",
            interval: "month",
            intervalCount: 1,
            formattedPrice: "$49.99",
            formattedPriceWithInterval: "$49.99/month",
            isYearly: false,
            isMonthly: true,
            recommended: true,
            savings: nil,
            features: [],
            createdAt: "2025-07-16T00:00:00Z",
            hasFreeTrial: false,
            trialDays: nil,
            trialDescription: nil
        )
    )
    .padding()
}
