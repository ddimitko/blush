//
//  EnhancedPlanComparisonView.swift
//  LunaraApp
//
//  Created by Lunara Team on 24/07/2025.
//

import SwiftUI

// MARK: - Plan Feature Model
struct PlanFeature: Identifiable, Equatable {
    let id = UUID()
    let name: String
    let description: String
    let category: FeatureCategory
    let isCore: Bool // Core features available in all plans
    
    enum FeatureCategory: String, CaseIterable {
        case booking = "Booking Management"
        case payments = "Payments & Billing"
        case analytics = "Analytics & Reports"
        case marketing = "Marketing Tools"
        case support = "Support & Training"
        case advanced = "Advanced Features"
    }
}

// MARK: - Enhanced Plan Comparison View
struct EnhancedPlanComparisonView: View {
    let plans: [SubscriptionPlanResponse]
    @Binding var selectedPlan: SubscriptionPlanResponse?
    let countryCode: String
    
    @State private var showingDetailedComparison = false
    @State private var selectedCategory: PlanFeature.FeatureCategory = .booking
    
    private let countryValidation = CountryValidationService.shared
    
    var body: some View {
        VStack(spacing: 24) {
            // Header
            VStack(spacing: 16) {
                Text("Choose Your Plan")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(LunaraColors.charcoalGray)
                
                Text("Select the plan that best fits your business needs. All plans include a 30-day free trial.")
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                
                // Plan recommendation
                if let recommendedPlan = getRecommendedPlan() {
                    HStack(spacing: 8) {
                        Image(systemName: "star.fill")
                            .foregroundColor(.yellow)
                        Text("Most Popular: \(recommendedPlan.name)")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(LunaraColors.charcoalGray)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.yellow.opacity(0.1))
                    )
                }
            }
            
            // Plan Cards
            VStack(spacing: 16) {
                ForEach(plans, id: \.id) { plan in
                    EnhancedPlanCard(
                        plan: plan,
                        isSelected: selectedPlan?.id == plan.id,
                        isRecommended: plan.id == getRecommendedPlan()?.id,
                        countryCode: countryCode,
                        onSelect: {
                            withAnimation(.easeInOut(duration: 0.3)) {
                                selectedPlan = plan
                            }
                        }
                    )
                }
            }
            
            // Detailed Comparison Button
            Button("Compare All Features") {
                showingDetailedComparison = true
            }
            .buttonStyle(TertiaryButtonStyle())
            
            // Quick Feature Highlights
            QuickFeatureHighlights()
        }
        .sheet(isPresented: $showingDetailedComparison) {
            DetailedPlanComparisonSheet(
                plans: plans,
                selectedPlan: $selectedPlan,
                countryCode: countryCode
            )
        }
    }
    
    // MARK: - Helper Methods
    
    private func getRecommendedPlan() -> SubscriptionPlanResponse? {
        // Simple logic: recommend the middle-tier plan or most popular
        return plans.first { $0.name.lowercased().contains("professional") || $0.name.lowercased().contains("standard") }
            ?? plans.first
    }
}

// MARK: - Enhanced Plan Card
struct EnhancedPlanCard: View {
    let plan: SubscriptionPlanResponse
    let isSelected: Bool
    let isRecommended: Bool
    let countryCode: String
    let onSelect: () -> Void
    
    private let countryValidation = CountryValidationService.shared
    
    var body: some View {
        Button(action: onSelect) {
            VStack(spacing: 0) {
                // Recommendation Badge
                if isRecommended {
                    HStack {
                        Spacer()
                        Text("MOST POPULAR")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 4)
                            .background(
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(Color.orange)
                            )
                        Spacer()
                    }
                    .padding(.top, -8)
                    .zIndex(1)
                }
                
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
                    
                    // Key Features (limit to top 3-4)
                    if !plan.features.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            ForEach(Array(plan.features.prefix(4)), id: \.self) { feature in
                                HStack(spacing: 8) {
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.caption)
                                        .foregroundColor(isSelected ? .white : .green)
                                        .frame(width: 12)
                                    
                                    Text(feature)
                                        .font(.caption)
                                        .foregroundColor(isSelected ? .white.opacity(0.9) : .secondary)
                                    
                                    Spacer()
                                }
                            }
                            
                            if plan.features.count > 4 {
                                Text("+ \(plan.features.count - 4) more features")
                                    .font(.caption2)
                                    .foregroundColor(isSelected ? .white.opacity(0.7) : .secondary)
                                    .padding(.leading, 20)
                            }
                        }
                    }
                    
                    // Value Proposition
                    if let valueProposition = getValueProposition(for: plan) {
                        HStack(spacing: 6) {
                            Image(systemName: "star.fill")
                                .font(.caption2)
                                .foregroundColor(isSelected ? .white : .yellow)
                            
                            Text(valueProposition)
                                .font(.caption2)
                                .fontWeight(.medium)
                                .foregroundColor(isSelected ? .white.opacity(0.9) : LunaraColors.charcoalGray)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(
                            RoundedRectangle(cornerRadius: 6)
                                .fill(isSelected ? .white.opacity(0.2) : Color.yellow.opacity(0.1))
                        )
                    }
                    
                    // Selection Indicator
                    HStack {
                        Spacer()
                        
                        Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                            .font(.title3)
                            .foregroundColor(isSelected ? .white : LunaraColors.coolLightGray)
                    }
                }
                .padding(20)
            }
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(isSelected ? LunaraColors.warmGold : Color.white)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(
                                isSelected ? LunaraColors.warmGold : 
                                isRecommended ? Color.orange : LunaraColors.coolLightGray,
                                lineWidth: isSelected || isRecommended ? 2 : 1
                            )
                    )
                    .shadow(
                        color: isSelected ? LunaraColors.warmGold.opacity(0.3) : 
                               isRecommended ? Color.orange.opacity(0.2) : .black.opacity(0.05),
                        radius: isSelected ? 8 : isRecommended ? 4 : 2,
                        x: 0,
                        y: isSelected ? 4 : isRecommended ? 2 : 1
                    )
            )
        }
        .buttonStyle(PlainButtonStyle())
        .scaleEffect(isSelected ? 1.02 : 1.0)
        .animation(.easeInOut(duration: 0.2), value: isSelected)
    }
    
    private var formattedPrice: String {
        return countryValidation.formatCurrency(Double(plan.priceInCents) / 100.0, for: countryCode)
    }
    
    private func getValueProposition(for plan: SubscriptionPlanResponse) -> String? {
        let planName = plan.name.lowercased()
        
        if planName.contains("basic") || planName.contains("starter") {
            return "Perfect for getting started"
        } else if planName.contains("professional") || planName.contains("standard") {
            return "Best value for growing businesses"
        } else if planName.contains("premium") || planName.contains("enterprise") {
            return "Maximum features and support"
        }
        
        return nil
    }
}

// MARK: - Quick Feature Highlights
struct QuickFeatureHighlights: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("All plans include:")
                .font(.headline)
                .foregroundColor(LunaraColors.charcoalGray)
            
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 8) {
                FeatureHighlight(icon: "calendar", text: "Online Booking")
                FeatureHighlight(icon: "creditcard", text: "Payment Processing")
                FeatureHighlight(icon: "person.2", text: "Customer Management")
                FeatureHighlight(icon: "chart.bar", text: "Basic Analytics")
                FeatureHighlight(icon: "bell", text: "Notifications")
                FeatureHighlight(icon: "shield", text: "Secure & Reliable")
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(LunaraColors.coolLightGray.opacity(0.3))
        )
    }
}

// MARK: - Feature Highlight
struct FeatureHighlight: View {
    let icon: String
    let text: String
    
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundColor(LunaraColors.warmGold)
                .frame(width: 16)
            
            Text(text)
                .font(.caption)
                .foregroundColor(LunaraColors.charcoalGray)
            
            Spacer()
        }
    }
}

// MARK: - Detailed Plan Comparison Sheet
struct DetailedPlanComparisonSheet: View {
    let plans: [SubscriptionPlanResponse]
    @Binding var selectedPlan: SubscriptionPlanResponse?
    let countryCode: String

    @Environment(\.dismiss) private var dismiss
    @State private var selectedCategory: PlanFeature.FeatureCategory = .booking

    private let countryValidation = CountryValidationService.shared

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Category Selector
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(PlanFeature.FeatureCategory.allCases, id: \.self) { category in
                            CategoryChip(
                                category: category,
                                isSelected: selectedCategory == category,
                                onTap: {
                                    selectedCategory = category
                                }
                            )
                        }
                    }
                    .padding(.horizontal, 20)
                }
                .padding(.vertical, 16)

                Divider()

                // Feature Comparison Table
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(getFeaturesForCategory(selectedCategory), id: \.id) { feature in
                            FeatureComparisonRow(
                                feature: feature,
                                plans: plans,
                                countryCode: countryCode
                            )

                            if feature.id != getFeaturesForCategory(selectedCategory).last?.id {
                                Divider()
                                    .padding(.horizontal, 20)
                            }
                        }
                    }
                }

                // Bottom Action
                VStack(spacing: 16) {
                    Divider()

                    if let selectedPlan = selectedPlan {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Selected Plan")
                                    .font(.caption)
                                    .foregroundColor(.secondary)

                                Text(selectedPlan.name)
                                    .font(.headline)
                                    .foregroundColor(LunaraColors.charcoalGray)
                            }

                            Spacer()

                            Text(countryValidation.formatCurrency(Double(selectedPlan.priceInCents) / 100.0, for: countryCode))
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundColor(LunaraColors.warmGold)
                        }
                        .padding(.horizontal, 20)
                    }

                    Button("Continue with Selected Plan") {
                        dismiss()
                    }
                    .buttonStyle(LunaraButtonStyle(isDisabled: selectedPlan == nil))
                    .disabled(selectedPlan == nil)
                    .padding(.horizontal, 20)
                }
                .padding(.bottom, 20)
            }
            .navigationTitle("Compare Plans")
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

    private func getFeaturesForCategory(_ category: PlanFeature.FeatureCategory) -> [PlanFeature] {
        // Mock feature data - in real app, this would come from the backend
        switch category {
        case .booking:
            return [
                PlanFeature(name: "Online Booking System", description: "Accept bookings 24/7", category: .booking, isCore: true),
                PlanFeature(name: "Calendar Management", description: "Manage your schedule", category: .booking, isCore: true),
                PlanFeature(name: "Appointment Reminders", description: "Automatic SMS/Email reminders", category: .booking, isCore: true),
                PlanFeature(name: "Recurring Appointments", description: "Set up repeat bookings", category: .booking, isCore: false),
                PlanFeature(name: "Group Bookings", description: "Handle multiple customers", category: .booking, isCore: false)
            ]
        case .payments:
            return [
                PlanFeature(name: "Payment Processing", description: "Accept card payments", category: .payments, isCore: true),
                PlanFeature(name: "Invoicing", description: "Generate professional invoices", category: .payments, isCore: true),
                PlanFeature(name: "Refund Management", description: "Process refunds easily", category: .payments, isCore: false),
                PlanFeature(name: "Payment Analytics", description: "Track revenue and trends", category: .payments, isCore: false)
            ]
        case .analytics:
            return [
                PlanFeature(name: "Basic Reports", description: "Essential business metrics", category: .analytics, isCore: true),
                PlanFeature(name: "Customer Analytics", description: "Understand your customers", category: .analytics, isCore: false),
                PlanFeature(name: "Revenue Tracking", description: "Monitor income streams", category: .analytics, isCore: false),
                PlanFeature(name: "Performance Insights", description: "Optimize your business", category: .analytics, isCore: false)
            ]
        case .marketing:
            return [
                PlanFeature(name: "Customer Database", description: "Store customer information", category: .marketing, isCore: true),
                PlanFeature(name: "Email Marketing", description: "Send promotional emails", category: .marketing, isCore: false),
                PlanFeature(name: "Loyalty Programs", description: "Reward repeat customers", category: .marketing, isCore: false),
                PlanFeature(name: "Social Media Integration", description: "Connect your social accounts", category: .marketing, isCore: false)
            ]
        case .support:
            return [
                PlanFeature(name: "Email Support", description: "Get help via email", category: .support, isCore: true),
                PlanFeature(name: "Knowledge Base", description: "Self-service help articles", category: .support, isCore: true),
                PlanFeature(name: "Priority Support", description: "Faster response times", category: .support, isCore: false),
                PlanFeature(name: "Phone Support", description: "Direct phone assistance", category: .support, isCore: false)
            ]
        case .advanced:
            return [
                PlanFeature(name: "API Access", description: "Integrate with other tools", category: .advanced, isCore: false),
                PlanFeature(name: "Custom Branding", description: "White-label solution", category: .advanced, isCore: false),
                PlanFeature(name: "Advanced Integrations", description: "Connect to more services", category: .advanced, isCore: false),
                PlanFeature(name: "Multi-location Support", description: "Manage multiple shops", category: .advanced, isCore: false)
            ]
        }
    }
}

// MARK: - Category Chip
struct CategoryChip: View {
    let category: PlanFeature.FeatureCategory
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            Text(category.rawValue)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(isSelected ? .white : LunaraColors.charcoalGray)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(isSelected ? LunaraColors.warmGold : LunaraColors.coolLightGray.opacity(0.3))
                )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Feature Comparison Row
struct FeatureComparisonRow: View {
    let feature: PlanFeature
    let plans: [SubscriptionPlanResponse]
    let countryCode: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(feature.name)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(LunaraColors.charcoalGray)

                    Text(feature.description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                HStack(spacing: 16) {
                    ForEach(plans, id: \.id) { plan in
                        FeatureAvailabilityIndicator(
                            isAvailable: isFeatureAvailable(for: plan),
                            planName: plan.name
                        )
                    }
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
    }

    private func isFeatureAvailable(for plan: SubscriptionPlanResponse) -> Bool {
        // Simple logic: core features available in all plans, others based on plan tier
        if feature.isCore {
            return true
        }

        let planName = plan.name.lowercased()
        if planName.contains("basic") || planName.contains("starter") {
            return false
        } else if planName.contains("professional") || planName.contains("standard") {
            return feature.category != .advanced
        } else {
            return true // Premium/Enterprise gets everything
        }
    }
}

// MARK: - Feature Availability Indicator
struct FeatureAvailabilityIndicator: View {
    let isAvailable: Bool
    let planName: String

    var body: some View {
        VStack(spacing: 2) {
            Image(systemName: isAvailable ? "checkmark.circle.fill" : "xmark.circle.fill")
                .foregroundColor(isAvailable ? .green : .red)
                .font(.caption)

            Text(planName)
                .font(.caption2)
                .foregroundColor(.secondary)
                .lineLimit(1)
        }
        .frame(width: 60)
    }
}

// MARK: - Preview
#Preview {
    EnhancedPlanComparisonView(
        plans: [
            SubscriptionPlanResponse(
                id: "1",
                productId: "prod_basic",
                name: "Basic",
                displayName: "Basic Plan",
                description: "Perfect for small businesses",
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
                features: ["Online booking", "Payment processing", "Customer management"],
                createdAt: "2025-07-24T00:00:00Z",
                hasFreeTrial: true,
                trialDays: 30,
                trialDescription: "30-day free trial"
            ),
            SubscriptionPlanResponse(
                id: "2",
                productId: "prod_professional",
                name: "Professional",
                displayName: "Professional Plan",
                description: "Best for growing businesses",
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
                features: ["Everything in Basic", "Advanced analytics", "Marketing tools", "Priority support"],
                createdAt: "2025-07-24T00:00:00Z",
                hasFreeTrial: true,
                trialDays: 30,
                trialDescription: "30-day free trial"
            )
        ],
        selectedPlan: .constant(nil),
        countryCode: "US"
    )
    .padding()
}
