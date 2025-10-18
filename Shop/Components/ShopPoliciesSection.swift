//
//  ShopPoliciesSection.swift
//  LunaraApp
//
//  Created by Lunara Team on 28/07/2025.
//

import SwiftUI

struct ShopPoliciesSection: View {
    let shop: Shop
    @State private var showingFullPolicies = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Section Header
            Text("Policies & Information")
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(LunaraColors.primaryText)
            
            VStack(spacing: 12) {
                // Cancellation Policy
                policyRow(
                    icon: "calendar.badge.exclamationmark",
                    title: "Cancellation Policy",
                    description: "Free cancellation up to 24 hours before appointment. Late cancellations may incur a fee.",
                    iconColor: LunaraColors.warmGold
                )
                
                // Payment Methods
                paymentMethodsRow
                
                // Safety Measures
                policyRow(
                    icon: "shield.checkered",
                    title: "Health & Safety",
                    description: "All tools are sanitized between clients. We follow strict hygiene protocols.",
                    iconColor: LunaraColors.success
                )
                
                // Age Requirements
                if shop.hasAgeRestrictions {
                    policyRow(
                        icon: "person.badge.clock",
                        title: "Age Requirements",
                        description: "Some services require clients to be 18+ or accompanied by a guardian.",
                        iconColor: LunaraColors.secondaryText
                    )
                }
                
                // Accessibility
                policyRow(
                    icon: "accessibility",
                    title: "Accessibility",
                    description: "Wheelchair accessible entrance and facilities available.",
                    iconColor: LunaraColors.primaryText
                )
                
                // Parking Information
                if let parkingInfo = shop.parkingInfo {
                    policyRow(
                        icon: "car",
                        title: "Parking",
                        description: parkingInfo,
                        iconColor: LunaraColors.secondaryText
                    )
                }
            }
            
            // View All Policies Button
            Button(action: {
                showingFullPolicies = true
            }) {
                HStack {
                    Text("View All Policies")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.warmGold)
                    
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12))
                        .foregroundColor(LunaraColors.warmGold)
                }
            }
            .padding(.top, 8)
        }
        .sheet(isPresented: $showingFullPolicies) {
            ShopPoliciesDetailView(shop: shop)
        }
    }
    
    // MARK: - Policy Row
    private func policyRow(icon: String, title: String, description: String, iconColor: Color) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(iconColor)
                .frame(width: 20, alignment: .center)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text(description)
                    .font(.system(size: 14))
                    .foregroundColor(LunaraColors.secondaryText)
                    .lineLimit(2)
            }
            
            Spacer()
        }
        .padding(.vertical, 8)
    }
    
    // MARK: - Payment Methods Row
    private var paymentMethodsRow: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "creditcard")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
                .frame(width: 20, alignment: .center)
            
            VStack(alignment: .leading, spacing: 8) {
                Text("Payment Methods")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                HStack(spacing: 8) {
                    if shop.acceptsCardPayments {
                        paymentMethodChip(text: "Cards", icon: "creditcard")
                    }
                    
                    paymentMethodChip(text: "Cash", icon: "banknote")
                    
                    if shop.acceptsDigitalPayments {
                        paymentMethodChip(text: "Digital", icon: "smartphone")
                    }
                }
            }
            
            Spacer()
        }
        .padding(.vertical, 8)
    }
    
    private func paymentMethodChip(text: String, icon: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 10))
            
            Text(text)
                .font(.system(size: 12, weight: .medium))
        }
        .foregroundColor(LunaraColors.warmGold)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(LunaraColors.warmGold.opacity(0.1))
        .cornerRadius(12)
    }
}

// MARK: - Shop Policies Detail View
struct ShopPoliciesDetailView: View {
    let shop: Shop
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // Cancellation Policy
                    policySection(
                        title: "Cancellation & Rescheduling",
                        content: """
                        • Free cancellation up to 24 hours before your appointment
                        • Cancellations within 24 hours may incur a 50% service fee
                        • No-shows will be charged the full service amount
                        • Rescheduling is free when done 24+ hours in advance
                        • Emergency cancellations will be reviewed case-by-case
                        """
                    )
                    
                    // Payment Policy
                    policySection(
                        title: "Payment Policy",
                        content: """
                        • Payment is required at the time of service
                        • We accept all major credit cards, cash, and digital payments
                        • Gratuity is appreciated but not required
                        • Prices are subject to change without notice
                        • Group bookings may require a deposit
                        """
                    )
                    
                    // Health & Safety
                    policySection(
                        title: "Health & Safety Protocols",
                        content: """
                        • All tools and equipment are sanitized between clients
                        • Single-use items are disposed of after each service
                        • Staff undergo regular health and safety training
                        • Please inform us of any allergies or skin sensitivities
                        • If you're feeling unwell, please reschedule your appointment
                        """
                    )
                    
                    // Age Requirements
                    policySection(
                        title: "Age Requirements",
                        content: """
                        • Clients under 16 must be accompanied by a parent/guardian
                        • Some services (chemical treatments) require clients to be 18+
                        • Valid ID may be required for age verification
                        • Parental consent forms required for minors
                        """
                    )
                    
                    // General Policies
                    policySection(
                        title: "General Policies",
                        content: """
                        • Please arrive 10 minutes before your appointment
                        • Late arrivals may result in shortened service time
                        • We reserve the right to refuse service
                        • Personal belongings are kept at your own risk
                        • Photography/recording is not permitted without consent
                        """
                    )
                }
                .padding(20)
            }
            .navigationTitle("Shop Policies")
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
    
    private func policySection(title: String, content: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(LunaraColors.primaryText)
            
            Text(content)
                .font(.system(size: 14))
                .foregroundColor(LunaraColors.primaryText)
                .lineSpacing(4)
        }
        .padding(16)
        .background(LunaraColors.cardBackground)
        .cornerRadius(12)
        .shadow(color: LunaraColors.cardShadow, radius: 2, x: 0, y: 1)
    }
}

// MARK: - Shop Extensions for Policies
extension Shop {
    var hasAgeRestrictions: Bool {
        // This could be determined by the services offered
        return businessTypes.contains(.beautySalon) || businessTypes.contains(.spa)
    }
    
    var acceptsDigitalPayments: Bool {
        // This could be a property from the backend
        return true // Assuming most modern shops accept digital payments
    }
    
    var parkingInfo: String? {
        // This could be a property from the backend
        return "Free street parking available. Paid parking garage 2 blocks away."
    }
}

// MARK: - Preview
struct ShopPoliciesSection_Previews: PreviewProvider {
    static var previews: some View {
        ScrollView {
            ShopPoliciesSection(shop: Shop.preview)
                .padding()
        }
    }
}
