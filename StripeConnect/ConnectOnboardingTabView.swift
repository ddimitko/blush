//
//  ConnectOnboardingTabView.swift
//  LunaraApp
//
//  Created by Lunara Team on 29/07/2025.
//

import SwiftUI

/// Onboarding tab for Stripe Connect management
struct ConnectOnboardingTabView: View {
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
                if account.onboardingCompleted {
                    onboardingCompleteView(account)
                } else {
                    onboardingInProgressView(account)
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
    
    // MARK: - Onboarding Complete View
    private func onboardingCompleteView(_ account: StripeConnectAccountResponse) -> some View {
        VStack(spacing: 24) {
            // Success Card
            VStack(spacing: 16) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 48))
                    .foregroundColor(LunaraColors.success)
                
                Text("Onboarding Complete!")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text("Your Stripe Connect account has been successfully set up and is ready to process payments.")
                    .font(.system(size: 14))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
            }
            .padding(24)
            .background(LunaraColors.success.opacity(0.1))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(LunaraColors.success.opacity(0.3), lineWidth: 1)
            )
            
            // Account Summary
            accountSummaryCard(account)
            
            // Next Steps
            nextStepsCard
        }
    }
    
    // MARK: - Onboarding In Progress View
    private func onboardingInProgressView(_ account: StripeConnectAccountResponse) -> some View {
        VStack(spacing: 24) {
            // Progress Card
            onboardingProgressCard(account)
            
            // Current Status
            currentStatusCard(account)
            
            // Actions
            onboardingActionsCard(account)
        }
    }
    
    // MARK: - No Account View
    private var noAccountView: some View {
        VStack(spacing: 24) {
            // Setup Card
            VStack(spacing: 16) {
                Image(systemName: "person.badge.plus")
                    .font(.system(size: 48))
                    .foregroundColor(LunaraColors.warmGold)
                
                Text("Set Up Stripe Connect")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text("Create your Stripe Connect account to start accepting payments from customers.")
                    .font(.system(size: 14))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                
                Button("Contact Support") {
                    contactSupport()
                }
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 12)
                .background(LunaraColors.warmGold)
                .cornerRadius(8)
            }
            .padding(24)
            .background(LunaraColors.white)
            .cornerRadius(12)
            .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
            
            // Benefits Card
            benefitsCard
        }
    }
    
    // MARK: - Account Summary Card
    private func accountSummaryCard(_ account: StripeConnectAccountResponse) -> some View {
        VStack(spacing: 16) {
            HStack {
                Text("Account Summary")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
            }
            
            VStack(spacing: 12) {
                summaryRow(label: "Account ID", value: String(account.stripeAccountId.prefix(12)) + "...")
                summaryRow(label: "Country", value: account.country)
                summaryRow(label: "Currency", value: account.defaultCurrency.uppercased())
                
                if let businessProfile = account.businessProfile,
                   let name = businessProfile.name {
                    summaryRow(label: "Business Name", value: name)
                }
                
                if let email = account.email {
                    summaryRow(label: "Email", value: email)
                }
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Onboarding Progress Card
    private func onboardingProgressCard(_ account: StripeConnectAccountResponse) -> some View {
        VStack(spacing: 16) {
            HStack {
                Text("Onboarding Progress")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
                
                Text("\(onboardingProgress(account))%")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(LunaraColors.warmGold)
            }
            
            // Progress Bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(LunaraColors.coolLightGray.opacity(0.3))
                        .frame(height: 8)
                        .cornerRadius(4)
                    
                    Rectangle()
                        .fill(LunaraColors.warmGold)
                        .frame(width: geometry.size.width * CGFloat(onboardingProgress(account)) / 100.0, height: 8)
                        .cornerRadius(4)
                }
            }
            .frame(height: 8)
            
            // Progress Steps
            VStack(spacing: 8) {
                progressStep(title: "Account Created", isCompleted: true)
                progressStep(title: "Details Submitted", isCompleted: account.detailsSubmitted)
                progressStep(title: "Charges Enabled", isCompleted: account.chargesEnabled)
                progressStep(title: "Payouts Enabled", isCompleted: account.payoutsEnabled)
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Current Status Card
    private func currentStatusCard(_ account: StripeConnectAccountResponse) -> some View {
        VStack(spacing: 16) {
            HStack {
                Text("Current Status")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
            }
            
            VStack(spacing: 12) {
                statusRow(title: "Charges Enabled", isEnabled: account.chargesEnabled)
                statusRow(title: "Payouts Enabled", isEnabled: account.payoutsEnabled)
                statusRow(title: "Details Submitted", isEnabled: account.detailsSubmitted)
                
                if stripeService.hasRequirements {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(LunaraColors.warning)
                        
                        Text("Additional information required")
                            .font(.system(size: 14))
                            .foregroundColor(LunaraColors.primaryText)
                        
                        Spacer()
                        
                        Button("View") {
                            onTabSwitch?(.requirements)
                        }
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(LunaraColors.warmGold)
                    }
                }
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Onboarding Actions Card
    private func onboardingActionsCard(_ account: StripeConnectAccountResponse) -> some View {
        VStack(spacing: 16) {
            HStack {
                Text("Actions")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
            }
            
            VStack(spacing: 12) {
                if !account.onboardingCompleted {
                    actionButton(
                        title: "Contact Support",
                        subtitle: "Get help completing your account setup",
                        icon: "questionmark.circle.fill",
                        color: LunaraColors.warmGold,
                        action: contactSupport
                    )
                }
                
                if stripeService.hasRequirements {
                    actionButton(
                        title: "Complete Requirements",
                        subtitle: "Provide missing information",
                        icon: "checkmark.circle.fill",
                        color: LunaraColors.success,
                        action: completeRequirements
                    )
                }
                
                actionButton(
                    title: "Refresh Status",
                    subtitle: "Check for updates",
                    icon: "arrow.clockwise.circle.fill",
                    color: LunaraColors.secondaryText,
                    action: refreshStatus
                )
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Next Steps Card
    private var nextStepsCard: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Next Steps")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
            }
            
            VStack(spacing: 12) {
                nextStepItem(
                    title: "Test Your Integration",
                    description: "Process a test payment to ensure everything works",
                    icon: "creditcard.circle.fill"
                )
                
                nextStepItem(
                    title: "Set Up Webhooks",
                    description: "Configure webhooks to receive payment notifications",
                    icon: "bell.circle.fill"
                )
                
                nextStepItem(
                    title: "Review Dashboard",
                    description: "Explore your Stripe dashboard for analytics",
                    icon: "chart.bar.circle.fill"
                )
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Benefits Card
    private var benefitsCard: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Why Stripe Connect?")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
            }
            
            VStack(spacing: 12) {
                benefitItem(
                    title: "Accept Payments",
                    description: "Process credit cards and bank transfers",
                    icon: "creditcard.fill"
                )
                
                benefitItem(
                    title: "Global Reach",
                    description: "Accept payments from customers worldwide",
                    icon: "globe"
                )
                
                benefitItem(
                    title: "Secure & Compliant",
                    description: "PCI DSS compliant with advanced fraud protection",
                    icon: "shield.fill"
                )
                
                benefitItem(
                    title: "Real-time Analytics",
                    description: "Track payments and revenue in real-time",
                    icon: "chart.line.uptrend.xyaxis"
                )
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Helper Views
    private func summaryRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 14))
                .foregroundColor(LunaraColors.secondaryText)
            
            Spacer()
            
            Text(value)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(LunaraColors.primaryText)
        }
    }
    
    private func progressStep(title: String, isCompleted: Bool) -> some View {
        HStack {
            Image(systemName: isCompleted ? "checkmark.circle.fill" : "circle")
                .foregroundColor(isCompleted ? LunaraColors.success : LunaraColors.secondaryText)
            
            Text(title)
                .font(.system(size: 14))
                .foregroundColor(LunaraColors.primaryText)
            
            Spacer()
        }
    }
    
    private func statusRow(title: String, isEnabled: Bool) -> some View {
        HStack {
            Image(systemName: isEnabled ? "checkmark.circle.fill" : "xmark.circle.fill")
                .foregroundColor(isEnabled ? LunaraColors.success : LunaraColors.error)
            
            Text(title)
                .font(.system(size: 14))
                .foregroundColor(LunaraColors.primaryText)
            
            Spacer()
            
            Text(isEnabled ? "Enabled" : "Disabled")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(isEnabled ? LunaraColors.success : LunaraColors.error)
        }
    }
    
    private func actionButton(title: String, subtitle: String, icon: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                
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
    
    private func nextStepItem(title: String, description: String, icon: String) -> some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(LunaraColors.warmGold)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text(description)
                    .font(.system(size: 12))
                    .foregroundColor(LunaraColors.secondaryText)
            }
            
            Spacer()
        }
        .padding(8)
        .background(LunaraColors.coolLightGray.opacity(0.3))
        .cornerRadius(6)
    }
    
    private func benefitItem(title: String, description: String, icon: String) -> some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(LunaraColors.warmGold)
                .frame(width: 20)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text(description)
                    .font(.system(size: 12))
                    .foregroundColor(LunaraColors.secondaryText)
            }
            
            Spacer()
        }
    }
    
    // MARK: - Helper Methods
    private func onboardingProgress(_ account: StripeConnectAccountResponse) -> Int {
        var progress = 25 // Account created
        
        if account.detailsSubmitted {
            progress += 25
        }
        
        if account.chargesEnabled {
            progress += 25
        }
        
        if account.payoutsEnabled {
            progress += 25
        }
        
        return progress
    }
    
    private func contactSupport() {
        // In a real app, this would open a support contact form or email
        print("Contact support for onboarding assistance")
    }
    
    private func completeRequirements() {
        onTabSwitch?(.requirements)
    }
    
    private func refreshStatus() {
        Task {
            await stripeService.refreshAccountData(shopId: shop.id)
        }
    }
}

#Preview {
    ConnectOnboardingTabView(
        shop: Shop.preview,
        stripeService: StripeConnectService.shared,
        onTabSwitch: nil
    )
}
