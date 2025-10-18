//
//  PaymentSettingsView.swift
//  LunaraApp
//
//  Created by Lunara Team on 24/07/2025.
//

import SwiftUI

/// Payment settings view for managing Stripe Connect and payment processing
struct PaymentSettingsView: View {
    // MARK: - Properties
    let shop: Shop
    
    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss
    
    // MARK: - State
    @StateObject private var stripeService = StripeConnectService.shared
    @StateObject private var apiClient = APIClient.shared
    @State private var selectedTab: PaymentTab = .stripe
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showingError = false
    @State private var showingStripeOnboarding = false
    @State private var showingStripeStatus = false
    @State private var showingSubscriptionManagement = false
    @State private var subscriptionDetails: SubscriptionDetails?
    
    enum PaymentTab: String, CaseIterable {
        case stripe = "Stripe Connect"
        case subscription = "Subscription"
        case billing = "Billing"
        
        var icon: String {
            switch self {
            case .stripe: return "creditcard"
            case .subscription: return "star.circle"
            case .billing: return "doc.text"
            }
        }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Tab selector
                tabSelectorView
                
                // Content based on selected tab
                if isLoading {
                    loadingView
                } else {
                    ScrollView {
                        VStack(spacing: 24) {
                            switch selectedTab {
                            case .stripe:
                                stripeConnectView
                            case .subscription:
                                subscriptionView
                            case .billing:
                                billingView
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.bottom, 32)
                    }
                }
            }
            .navigationTitle("Payment Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.secondaryText)
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Refresh") {
                        loadPaymentSettings()
                    }
                    .foregroundColor(LunaraColors.warmGold)
                }
            }
        }
        .onAppear {
            loadPaymentSettings()
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage ?? "An error occurred")
        }
        .sheet(isPresented: $showingStripeOnboarding) {
            StripeConnectOnboardingView(shop: shop) {
                loadPaymentSettings()
            }
        }
        .sheet(isPresented: $showingStripeStatus) {
            StripeConnectStatusView(shop: shop)
        }
    }
    
    // MARK: - Tab Selector View
    private var tabSelectorView: some View {
        HStack(spacing: 0) {
            ForEach(PaymentTab.allCases, id: \.self) { tab in
                Button(action: {
                    selectedTab = tab
                }) {
                    VStack(spacing: 6) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 16))
                        
                        Text(tab.rawValue)
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundColor(selectedTab == tab ? LunaraColors.warmGold : LunaraColors.secondaryText)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                }
            }
        }
        .background(LunaraColors.white)
        .overlay(
            Rectangle()
                .fill(LunaraColors.coolLightGray.opacity(0.3))
                .frame(height: 1),
            alignment: .bottom
        )
    }
    
    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
                .tint(LunaraColors.warmGold)
            
            Text("Loading payment settings...")
                .font(.system(size: 16))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.coolLightGray.opacity(0.3))
    }
    
    // MARK: - Stripe Connect View
    private var stripeConnectView: some View {
        VStack(spacing: 20) {
            // Stripe account status
            paymentSection("Stripe Connect Status") {
                VStack(spacing: 16) {
                    if stripeService.isLoading {
                        HStack {
                            ProgressView()
                                .scaleEffect(0.8)
                                .tint(LunaraColors.warmGold)

                            Text("Loading account status...")
                                .font(.system(size: 14))
                                .foregroundColor(LunaraColors.secondaryText)
                        }
                        .padding(.vertical, 20)
                    } else if let account = stripeService.connectAccount {
                        stripeAccountCard(account)
                    } else {
                        stripeSetupCard
                    }
                }
            }

            // Account management (if account exists)
            if let account = stripeService.connectAccount {
                paymentSection("Account Management") {
                    VStack(spacing: 12) {
                        // View detailed status
                        Button(action: {
                            showingStripeStatus = true
                        }) {
                            HStack {
                                Image(systemName: "chart.bar.fill")
                                    .foregroundColor(LunaraColors.warmGold)

                                VStack(alignment: .leading, spacing: 2) {
                                    Text("View Account Details")
                                        .font(.system(size: 16, weight: .medium))
                                        .foregroundColor(LunaraColors.primaryText)

                                    Text("Balance, transactions, and account settings")
                                        .font(.system(size: 12))
                                        .foregroundColor(LunaraColors.secondaryText)
                                }

                                Spacer()

                                Image(systemName: "chevron.right")
                                    .foregroundColor(LunaraColors.secondaryText)
                            }
                            .padding(16)
                            .background(LunaraColors.coolLightGray.opacity(0.3))
                            .cornerRadius(8)
                        }

                        // Account balance (if available)
                        if account.chargesEnabled && account.payoutsEnabled {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Available Balance")
                                        .font(.system(size: 14))
                                        .foregroundColor(LunaraColors.secondaryText)

                                    Text(stripeService.formattedBalance)
                                        .font(.system(size: 18, weight: .bold))
                                        .foregroundColor(LunaraColors.primaryText)
                                }

                                Spacer()

                                Image(systemName: "banknote")
                                    .font(.system(size: 20))
                                    .foregroundColor(LunaraColors.warmGold)
                            }
                            .padding(16)
                            .background(LunaraColors.coolLightGray.opacity(0.3))
                            .cornerRadius(8)
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Subscription View
    private var subscriptionView: some View {
        VStack(spacing: 20) {
            // Subscription status
            paymentSection("Subscription Status") {
                VStack(spacing: 16) {
                    if let details = subscriptionDetails {
                        subscriptionDetailsCard(details)
                    } else if isLoading {
                        HStack {
                            ProgressView()
                                .scaleEffect(0.8)
                            Text("Loading subscription...")
                                .font(.system(size: 14))
                                .foregroundColor(LunaraColors.secondaryText)
                        }
                        .padding(.vertical, 20)
                    } else {
                        Text("Unable to load subscription details")
                            .font(.system(size: 16))
                            .foregroundColor(LunaraColors.secondaryText)
                            .multilineTextAlignment(.center)
                            .padding(.vertical, 20)
                    }
                }
            }

            // Subscription management
            paymentSection("Subscription Management") {
                VStack(spacing: 16) {
                    Text("Manage your subscription, billing, and payment methods.")
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)

                    Button(action: {
                        showingSubscriptionManagement = true
                    }) {
                        HStack {
                            Image(systemName: "gear")
                            Text("Open Subscription Management")
                        }
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(LunaraColors.warmGold)
                        .cornerRadius(8)
                    }
                    .disabled(subscriptionDetails == nil)
                }
            }
        }
        .sheet(isPresented: $showingSubscriptionManagement) {
            SubscriptionManagementView(shop: shop)
        }
    }
    
    // MARK: - Billing View
    private var billingView: some View {
        VStack(spacing: 20) {
            paymentSection("Billing Information") {
                VStack(spacing: 16) {
                    Text("Access comprehensive billing management")
                        .font(.system(size: 16))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)
                        .padding(.vertical, 20)

                    Text("View invoices, download receipts, manage payment methods, and access billing history through the subscription management interface.")
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)

                    Button(action: {
                        showingSubscriptionManagement = true
                    }) {
                        HStack {
                            Image(systemName: "doc.text")
                            Text("View Billing & Invoices")
                        }
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(LunaraColors.warmGold)
                        .cornerRadius(8)
                    }
                    .disabled(subscriptionDetails == nil)
                }
            }
        }
    }
    
    // MARK: - Helper Views
    private func paymentSection<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            content()
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Stripe Account Card
    private func stripeAccountCard(_ account: StripeConnectAccountResponse) -> some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: account.onboardingCompleted ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                    .foregroundColor(account.onboardingCompleted ? LunaraColors.success : LunaraColors.warning)

                VStack(alignment: .leading, spacing: 4) {
                    Text(account.onboardingCompleted ? "Account Active" : "Setup Required")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)

                    Text(stripeService.accountStatusDescription)
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                }

                Spacer()
            }

            // Capabilities status
            VStack(spacing: 8) {
                capabilityRow(
                    title: "Accept Payments",
                    isEnabled: account.chargesEnabled
                )

                capabilityRow(
                    title: "Receive Payouts",
                    isEnabled: account.payoutsEnabled
                )
            }

            // Action button
            if stripeService.needsOnboarding {
                Button(action: {
                    showingStripeOnboarding = true
                }) {
                    Text("Complete Setup")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(LunaraColors.warmGold)
                        .cornerRadius(8)
                }
            }
        }
        .padding(16)
        .background(LunaraColors.coolLightGray.opacity(0.3))
        .cornerRadius(8)
    }

    private func capabilityRow(title: String, isEnabled: Bool) -> some View {
        HStack {
            Image(systemName: isEnabled ? "checkmark.circle.fill" : "xmark.circle.fill")
                .foregroundColor(isEnabled ? LunaraColors.success : LunaraColors.error)
                .font(.system(size: 14))

            Text(title)
                .font(.system(size: 14))
                .foregroundColor(LunaraColors.primaryText)

            Spacer()
        }
    }

    // MARK: - Stripe Setup Card
    private var stripeSetupCard: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "creditcard.circle")
                    .foregroundColor(LunaraColors.warmGold)
                    .font(.system(size: 24))

                VStack(alignment: .leading, spacing: 4) {
                    Text("Set Up Payment Processing")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)

                    Text("Connect Stripe to accept card payments from customers")
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                }

                Spacer()
            }

            Button(action: {
                showingStripeOnboarding = true
            }) {
                Text("Set Up Stripe Connect")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(LunaraColors.warmGold)
                    .cornerRadius(8)
            }
        }
        .padding(16)
        .background(LunaraColors.coolLightGray.opacity(0.3))
        .cornerRadius(8)
    }
    
    private func subscriptionDetailsCard(_ details: SubscriptionDetails) -> some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: details.isActiveSubscription ? "star.circle.fill" : "exclamationmark.triangle.fill")
                    .foregroundColor(details.isActiveSubscription ? LunaraColors.success : LunaraColors.warning)

                VStack(alignment: .leading, spacing: 4) {
                    Text(details.subscriptionStatusText)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)

                    Text(details.planDisplayName)
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Text(details.formattedAmountWithInterval)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)

                    if let trialText = details.trialDaysRemainingText {
                        Text(trialText)
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.warmGold)
                    } else {
                        Text("Next: \(details.nextBillingDateFormatted)")
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                }
            }
        }
        .padding(16)
        .background(LunaraColors.coolLightGray.opacity(0.3))
        .cornerRadius(8)
    }
    
    // MARK: - Helper Methods
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }
    
    // MARK: - Methods
    private func loadPaymentSettings() {
        isLoading = true
        errorMessage = nil

        Task {
            // Load Stripe Connect account
            await stripeService.loadConnectAccount(shopId: shop.id)

            // Load subscription details from API
            do {
                let details = try await apiClient.getDetailedSubscriptionInfo(shopId: shop.id)
                await MainActor.run {
                    subscriptionDetails = details
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = "Failed to load subscription details: \(error.localizedDescription)"
                    isLoading = false
                }
                print("Error loading subscription details: \(error)")
            }
        }
    }
}

#Preview {
    PaymentSettingsView(shop: Shop.preview)
}
