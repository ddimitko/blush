//
//  StripeConnectOnboardingView.swift
//  LunaraApp
//
//  Created by Lunara Team on 27/07/2025.
//

import SwiftUI

/// Main Stripe Connect onboarding view that manages the complete flow
struct StripeConnectOnboardingView: View {
    // MARK: - Properties
    let shop: Shop
    let onOnboardingComplete: (() -> Void)?
    
    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss
    
    // MARK: - State
    @StateObject private var stripeService = StripeConnectService.shared
    @State private var onboardingStep: OnboardingStep = .loading
    @State private var showingError = false
    @State private var errorMessage: String?
    
    enum OnboardingStep {
        case loading
        case setup
        case onboarding
        case complete
    }
    
    var body: some View {
        NavigationView {
            Group {
                switch onboardingStep {
                case .loading:
                    loadingView
                case .setup:
                    setupView
                case .onboarding:
                    onboardingView
                case .complete:
                    completeView
                }
            }
            .navigationTitle("Stripe Connect")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.secondaryText)
                }
                
                if onboardingStep == .complete {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("Done") {
                            onOnboardingComplete?()
                            dismiss()
                        }
                        .foregroundColor(LunaraColors.warmGold)
                    }
                }
            }
        }
        .onAppear {
            checkExistingAccount()
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage ?? "An error occurred")
        }
    }
    
    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 20) {
            ProgressView()
                .scaleEffect(1.5)
                .tint(LunaraColors.warmGold)
            
            Text("Checking Stripe Connect status...")
                .font(.system(size: 16))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.coolLightGray.opacity(0.3))
    }
    
    // MARK: - Setup View
    private var setupView: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 16) {
                    Image(systemName: "creditcard.circle.fill")
                        .font(.system(size: 60))
                        .foregroundColor(LunaraColors.warmGold)
                    
                    Text("Set Up Payment Processing")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)
                        .multilineTextAlignment(.center)
                    
                    Text("Connect your Stripe account to accept card payments from customers and increase your booking conversion rate.")
                        .font(.system(size: 16))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 20)
                }
                
                // Benefits
                benefitsSection
                
                // Setup button
                Button(action: {
                    onboardingStep = .onboarding
                }) {
                    HStack {
                        Image(systemName: "arrow.right.circle.fill")
                            .font(.system(size: 20))
                        
                        Text("Start Setup")
                            .font(.system(size: 18, weight: .semibold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(LunaraColors.warmGold)
                    .cornerRadius(12)
                }
                .padding(.horizontal, 20)
                
                // Security note
                VStack(spacing: 8) {
                    HStack {
                        Image(systemName: "shield.checkered")
                            .foregroundColor(LunaraColors.success)
                        
                        Text("Secure & Trusted")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(LunaraColors.primaryText)
                    }
                    
                    Text("Your financial information is securely processed by Stripe, a trusted payment processor used by millions of businesses worldwide.")
                        .font(.system(size: 12))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 20)
                }
            }
            .padding(.vertical, 20)
        }
    }
    
    // MARK: - Benefits Section
    private var benefitsSection: some View {
        VStack(spacing: 16) {
            Text("Benefits of Stripe Connect")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            VStack(spacing: 12) {
                benefitRow(
                    icon: "creditcard",
                    title: "Accept Card Payments",
                    description: "Process Visa, Mastercard, and other major cards"
                )
                
                benefitRow(
                    icon: "chart.line.uptrend.xyaxis",
                    title: "Increase Conversions",
                    description: "Customers are more likely to book when they can pay with cards"
                )
                
                benefitRow(
                    icon: "banknote",
                    title: "Automatic Payouts",
                    description: "Receive payments directly to your bank account"
                )
                
                benefitRow(
                    icon: "shield.checkered",
                    title: "Secure Processing",
                    description: "PCI-compliant payment processing with fraud protection"
                )
            }
        }
        .padding(20)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
        .padding(.horizontal, 20)
    }
    
    private func benefitRow(icon: String, title: String, description: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(LunaraColors.warmGold)
                .frame(width: 24)
            
            VStack(alignment: .leading, spacing: 4) {
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
    
    // MARK: - Onboarding View
    private var onboardingView: some View {
        StripeConnectSetupView(shop: shop) { success in
            if success {
                onboardingStep = .complete
            } else {
                errorMessage = "Failed to complete Stripe Connect setup"
                showingError = true
            }
        }
    }
    
    // MARK: - Complete View
    private var completeView: some View {
        VStack(spacing: 24) {
            // Success icon
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 80))
                .foregroundColor(LunaraColors.success)
            
            // Success message
            VStack(spacing: 12) {
                Text("Setup Complete!")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text("Your Stripe Connect account has been successfully set up. You can now accept card payments from customers.")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)
            }
            
            // Account status
            if let account = stripeService.connectAccount {
                accountStatusCard(account)
            }
            
            Spacer()
        }
        .padding(.vertical, 40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.coolLightGray.opacity(0.3))
    }
    
    private func accountStatusCard(_ account: StripeConnectAccountResponse) -> some View {
        VStack(spacing: 16) {
            Text("Account Status")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            VStack(spacing: 12) {
                statusRow(
                    title: "Charges Enabled",
                    isEnabled: account.chargesEnabled
                )
                
                statusRow(
                    title: "Payouts Enabled",
                    isEnabled: account.payoutsEnabled
                )
                
                statusRow(
                    title: "Details Submitted",
                    isEnabled: account.detailsSubmitted
                )
            }
        }
        .padding(20)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
        .padding(.horizontal, 20)
    }
    
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
    
    // MARK: - Methods
    private func checkExistingAccount() {
        Task {
            await stripeService.loadConnectAccount(shopId: shop.id)
            
            await MainActor.run {
                if let account = stripeService.connectAccount {
                    if account.chargesEnabled && account.payoutsEnabled {
                        onboardingStep = .complete
                    } else {
                        onboardingStep = .onboarding
                    }
                } else {
                    onboardingStep = .setup
                }
            }
        }
    }
}

#Preview {
    StripeConnectOnboardingView(shop: Shop.preview, onOnboardingComplete: nil)
}
