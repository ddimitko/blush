//
//  SubscriptionPlanStepView.swift
//  LunaraApp
//
//  Created by Lunara Team on 16/07/2025.
//

import SwiftUI

struct SubscriptionPlanStepView: View {
    @Binding var selectedPlan: SubscriptionPlanResponse?
    let availablePlans: [SubscriptionPlanResponse]
    let isLoading: Bool
    let countryCode: String
    let onRetry: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            // Content
            if isLoading {
                LoadingPlansView()
            } else if availablePlans.isEmpty {
                EmptyPlansView(onRetry: onRetry)
            } else {
                EnhancedPlanComparisonView(
                    plans: availablePlans,
                    selectedPlan: $selectedPlan,
                    countryCode: countryCode
                )
            }
        }
    }
}

// MARK: - Loading Plans View
struct LoadingPlansView: View {
    var body: some View {
        VStack(spacing: 16) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: LunaraColors.warmGold))
                .scaleEffect(1.2)
            
            Text("Loading subscription plans...")
                .font(.body)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, minHeight: 200)
    }
}

// MARK: - Empty Plans View
struct EmptyPlansView: View {
    let onRetry: () -> Void
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 32))
                .foregroundColor(.orange)
            
            Text("Unable to load plans")
                .font(.headline)
                .foregroundColor(LunaraColors.charcoalGray)
            
            Text("Please check your internet connection and try again.")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            Button("Retry") {
                onRetry()
            }
            .buttonStyle(TertiaryButtonStyle())
        }
        .frame(maxWidth: .infinity, minHeight: 200)
    }
}

// MARK: - Plans List View
struct PlansListView: View {
    let plans: [SubscriptionPlanResponse]
    @Binding var selectedPlan: SubscriptionPlanResponse?
    
    var body: some View {
        VStack(spacing: 16) {
            ForEach(plans, id: \.id) { plan in
                SubscriptionPlanCard(
                    plan: plan,
                    isSelected: selectedPlan?.id == plan.id,
                    onSelect: {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            selectedPlan = plan
                        }
                    }
                )
            }
        }
    }
}

// MARK: - Subscription Plan Card
struct SubscriptionPlanCard: View {
    let plan: SubscriptionPlanResponse
    let isSelected: Bool
    let onSelect: () -> Void
    
    var body: some View {
        Button(action: {
            onSelect()
        }) {
            VStack(alignment: .leading, spacing: 16) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(plan.name)
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundColor(isSelected ? .white : LunaraColors.charcoalGray)
                        
                        Text(plan.description)
                            .font(.subheadline)
                            .foregroundColor(isSelected ? .white.opacity(0.9) : .secondary)
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        Text(formattedPrice)
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(isSelected ? .white : LunaraColors.charcoalGray)
                        
                        Text("per month")
                            .font(.caption)
                            .foregroundColor(isSelected ? .white.opacity(0.8) : .secondary)
                    }
                }
                
                // Features
                if !plan.features.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(plan.features, id: \.self) { feature in
                            HStack(spacing: 8) {
                                Image(systemName: "checkmark")
                                    .font(.caption)
                                    .foregroundColor(isSelected ? .white : LunaraColors.warmGold)
                                    .frame(width: 12)
                                
                                Text(feature)
                                    .font(.subheadline)
                                    .foregroundColor(isSelected ? .white.opacity(0.9) : .secondary)
                                
                                Spacer()
                            }
                        }
                    }
                }
                
                // Selection Indicator
                HStack {
                    Spacer()
                    
                    Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                        .font(.title2)
                        .foregroundColor(isSelected ? .white : LunaraColors.coolLightGray)
                }
            }
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(isSelected ? LunaraColors.warmGold : Color.white)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(
                                isSelected ? LunaraColors.warmGold : LunaraColors.coolLightGray,
                                lineWidth: isSelected ? 2 : 1
                            )
                    )
                    .shadow(
                        color: isSelected ? LunaraColors.warmGold.opacity(0.3) : .black.opacity(0.05),
                        radius: isSelected ? 8 : 2,
                        x: 0,
                        y: isSelected ? 4 : 1
                    )
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    private var formattedPrice: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = plan.currency
        return formatter.string(from: NSNumber(value: Double(plan.priceInCents) / 100.0)) ?? "$\(plan.priceInCents / 100)"
    }
}

// MARK: - Features Comparison View
struct FeaturesComparisonView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("All plans include:")
                .font(.headline)
                .foregroundColor(LunaraColors.charcoalGray)
            
            VStack(alignment: .leading, spacing: 8) {
                FeatureRow(icon: "calendar", text: "Online booking system")
                FeatureRow(icon: "person.2", text: "Customer management")
                FeatureRow(icon: "creditcard", text: "Payment processing")
                FeatureRow(icon: "chart.bar", text: "Basic analytics")
                FeatureRow(icon: "bell", text: "Email notifications")
                FeatureRow(icon: "phone", text: "Customer support")
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(LunaraColors.coolLightGray.opacity(0.3))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(LunaraColors.coolLightGray, lineWidth: 1)
                )
        )
    }
}

// MARK: - Feature Row
struct FeatureRow: View {
    let icon: String
    let text: String
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.subheadline)
                .foregroundColor(LunaraColors.warmGold)
                .frame(width: 20)
            
            Text(text)
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Spacer()
        }
    }
}

// MARK: - Preview
#Preview {
    SubscriptionPlanStepView(
        selectedPlan: .constant(nil),
        availablePlans: [
            SubscriptionPlanResponse(
                id: "price_1",
                productId: "prod_1",
                name: "Starter",
                displayName: "Starter Plan",
                description: "Perfect for small salons",
                priceInCents: 2999,
                currency: "USD",
                interval: "month",
                intervalCount: 1,
                formattedPrice: "$29.99",
                formattedPriceWithInterval: "$29.99/month",
                isYearly: false,
                isMonthly: true,
                recommended: false,
                savings: nil,
                features: [
                    "Up to 100 bookings/month",
                    "Basic analytics",
                    "Email support"
                ],
                createdAt: "2025-07-16T00:00:00Z",
                hasFreeTrial: false,
                trialDays: nil,
                trialDescription: nil
            ),
            SubscriptionPlanResponse(
                id: "price_2",
                productId: "prod_2",
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
                features: [
                    "Unlimited bookings",
                    "Advanced analytics",
                    "Priority support",
                    "Custom branding"
                ],
                createdAt: "2025-07-16T00:00:00Z",
                hasFreeTrial: false,
                trialDays: nil,
                trialDescription: nil
            )
        ],
        isLoading: false,
        countryCode: "US",
        onRetry: {}
    )
    .padding()
}
