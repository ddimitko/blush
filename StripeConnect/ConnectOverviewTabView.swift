//
//  ConnectOverviewTabView.swift
//  LunaraApp
//
//  Created by Lunara Team on 29/07/2025.
//

import SwiftUI

/// Overview tab for Stripe Connect management
struct ConnectOverviewTabView: View {
    // MARK: - Properties
    let shop: Shop
    @ObservedObject var stripeService: StripeConnectService
    let onTabSwitch: ((AdvancedStripeConnectManagementView.ConnectTab) -> Void)?
    
    // MARK: - State
    @State private var showingError = false
    @State private var errorMessage: String?
    
    var body: some View {
        VStack(spacing: 24) {
            if let account = stripeService.connectAccount {
                // Account Status Card
                accountStatusCard(account)
                
                // Quick Stats
                if account.chargesEnabled && account.payoutsEnabled {
                    quickStatsCard
                }
                
                // Account Capabilities
                capabilitiesCard(account)
                
                // Quick Actions
                quickActionsCard(account)
                
                // Requirements Alert (if any)
                if stripeService.hasRequirements {
                    requirementsAlert(account)
                }
            } else {
                noAccountView
            }
        }

        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage ?? "An error occurred")
        }
    }
    
    // MARK: - Account Status Card
    private func accountStatusCard(_ account: StripeConnectAccountResponse) -> some View {
        VStack(spacing: 16) {
            HStack {
                Text("Account Status")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
                
                Image(systemName: account.onboardingCompleted ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                    .font(.system(size: 20))
                    .foregroundColor(account.onboardingCompleted ? LunaraColors.success : LunaraColors.warning)
            }
            
            VStack(spacing: 12) {
                statusRow(title: "Charges Enabled", isEnabled: account.chargesEnabled)
                statusRow(title: "Payouts Enabled", isEnabled: account.payoutsEnabled)
                statusRow(title: "Details Submitted", isEnabled: account.detailsSubmitted)
                statusRow(title: "Onboarding Complete", isEnabled: account.onboardingCompleted)
            }
            
            if let businessProfile = account.businessProfile {
                Divider()
                
                VStack(alignment: .leading, spacing: 8) {
                    Text("Business Information")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    if let name = businessProfile.name {
                        infoRow(label: "Business Name", value: name)
                    }
                    
                    if let email = account.email {
                        infoRow(label: "Email", value: email)
                    }
                    
                    infoRow(label: "Country", value: account.country)
                    infoRow(label: "Currency", value: account.defaultCurrency.uppercased())
                }
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Quick Stats Card
    private var quickStatsCard: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Quick Stats")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
                
                Button("View Details") {
                    onTabSwitch?(.balance)
                }
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
            }
            
            if let balance = stripeService.accountBalance {
                HStack(spacing: 20) {
                    statItem(
                        title: "Available",
                        value: formatBalance(balance.available),
                        color: LunaraColors.success
                    )
                    
                    Divider()
                        .frame(height: 40)
                    
                    statItem(
                        title: "Pending",
                        value: formatBalance(balance.pending),
                        color: LunaraColors.warning
                    )
                }
            } else {
                Text("Loading balance...")
                    .font(.system(size: 14))
                    .foregroundColor(LunaraColors.secondaryText)
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Capabilities Card
    private func capabilitiesCard(_ account: StripeConnectAccountResponse) -> some View {
        VStack(spacing: 16) {
            HStack {
                Text("Account Capabilities")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
            }
            
            VStack(spacing: 12) {
                capabilityRow(title: "Card Payments", isEnabled: account.chargesEnabled)
                capabilityRow(title: "Bank Transfers", isEnabled: account.payoutsEnabled)
                capabilityRow(title: "Tax Reporting", isEnabled: account.onboardingCompleted)
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Quick Actions Card
    private func quickActionsCard(_ account: StripeConnectAccountResponse) -> some View {
        VStack(spacing: 16) {
            HStack {
                Text("Quick Actions")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
            }
            
            VStack(spacing: 12) {
                actionButton(
                    title: "View Detailed Analytics",
                    subtitle: "See transactions and payout history",
                    icon: "chart.bar.fill",
                    action: { onTabSwitch?(.transactions) }
                )
                
                if !account.onboardingCompleted {
                    actionButton(
                        title: "Complete Setup",
                        subtitle: "Finish account onboarding",
                        icon: "person.badge.plus.fill",
                        action: { onTabSwitch?(.onboarding) }
                    )
                }
                
                if stripeService.hasRequirements {
                    actionButton(
                        title: "View Requirements",
                        subtitle: "See what information is needed",
                        icon: "exclamationmark.triangle.fill",
                        action: { onTabSwitch?(.requirements) }
                    )
                }
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Requirements Alert
    private func requirementsAlert(_ account: StripeConnectAccountResponse) -> some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundColor(LunaraColors.warning)
                
                Text("Action Required")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
            }
            
            Text("Your account requires additional information to continue processing payments.")
                .font(.system(size: 14))
                .foregroundColor(LunaraColors.secondaryText)
                .multilineTextAlignment(.leading)
            
            Button("View Requirements") {
                onTabSwitch?(.requirements)
            }
            .font(.system(size: 14, weight: .medium))
            .foregroundColor(LunaraColors.warmGold)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(16)
        .background(LunaraColors.warning.opacity(0.1))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(LunaraColors.warning.opacity(0.3), lineWidth: 1)
        )
    }
    
    // MARK: - No Account View
    private var noAccountView: some View {
        VStack(spacing: 16) {
            Image(systemName: "creditcard.circle")
                .font(.system(size: 48))
                .foregroundColor(LunaraColors.secondaryText)
            
            Text("No Stripe Connect Account")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            Text("Set up your Stripe Connect account to start accepting payments.")
                .font(.system(size: 14))
                .foregroundColor(LunaraColors.secondaryText)
                .multilineTextAlignment(.center)
            
            Button("Set Up Account") {
                // Navigate to setup
            }
            .font(.system(size: 16, weight: .medium))
            .foregroundColor(LunaraColors.white)
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .background(LunaraColors.warmGold)
            .cornerRadius(8)
        }
        .padding(32)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Helper Views
    private func statusRow(title: String, isEnabled: Bool) -> some View {
        HStack {
            Image(systemName: isEnabled ? "checkmark.circle.fill" : "xmark.circle.fill")
                .foregroundColor(isEnabled ? LunaraColors.success : LunaraColors.error)
            
            Text(title)
                .font(.system(size: 14))
                .foregroundColor(LunaraColors.primaryText)
            
            Spacer()
        }
    }
    
    private func capabilityRow(title: String, isEnabled: Bool) -> some View {
        HStack {
            Image(systemName: isEnabled ? "checkmark.circle.fill" : "clock.circle.fill")
                .foregroundColor(isEnabled ? LunaraColors.success : LunaraColors.warning)
            
            Text(title)
                .font(.system(size: 14))
                .foregroundColor(LunaraColors.primaryText)
            
            Spacer()
            
            Text(isEnabled ? "Active" : "Pending")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(isEnabled ? LunaraColors.success : LunaraColors.warning)
        }
    }
    
    private func infoRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 12))
                .foregroundColor(LunaraColors.secondaryText)
            
            Spacer()
            
            Text(value)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(LunaraColors.primaryText)
        }
    }
    
    private func statItem(title: String, value: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(color)
            
            Text(title)
                .font(.system(size: 12))
                .foregroundColor(LunaraColors.secondaryText)
        }
    }
    
    private func actionButton(title: String, subtitle: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(LunaraColors.warmGold)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    Text(subtitle)
                        .font(.system(size: 12))
                        .foregroundColor(LunaraColors.secondaryText)
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .foregroundColor(LunaraColors.secondaryText)
            }
            .padding(12)
            .background(LunaraColors.coolLightGray.opacity(0.3))
            .cornerRadius(8)
        }
    }
    
    // MARK: - Helper Methods
    private func formatBalance(_ amounts: [StripeConnectBalanceResponse.BalanceAmount]) -> String {
        guard let firstAmount = amounts.first else { return "€0.00" }
        let value = Double(firstAmount.amount) / 100.0
        return String(format: "€%.2f", value)
    }
    

}

#Preview {
    ConnectOverviewTabView(
        shop: Shop.preview,
        stripeService: StripeConnectService.shared,
        onTabSwitch: nil
    )
}
