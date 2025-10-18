//
//  AdvancedStripeConnectManagementView.swift
//  LunaraApp
//
//  Created by Lunara Team on 29/07/2025.
//

import SwiftUI

/// Advanced Stripe Connect management view with tabbed interface
struct AdvancedStripeConnectManagementView: View {
    // MARK: - Properties
    let shop: Shop
    
    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss
    
    // MARK: - State
    @StateObject private var stripeService = StripeConnectService.shared
    @State private var selectedTab: ConnectTab = .overview
    @State private var isRefreshing = false
    @State private var showingError = false
    @State private var errorMessage: String?
    
    // MARK: - Tab Enum
    enum ConnectTab: String, CaseIterable {
        case overview = "Overview"
        case balance = "Balance"
        case payouts = "Payouts"
        case transactions = "Transactions"
        case requirements = "Requirements"
        case onboarding = "Onboarding"
        
        var icon: String {
            switch self {
            case .overview: return "chart.bar.fill"
            case .balance: return "dollarsign.circle.fill"
            case .payouts: return "arrow.up.circle.fill"
            case .transactions: return "list.bullet.circle.fill"
            case .requirements: return "exclamationmark.triangle.fill"
            case .onboarding: return "person.badge.plus.fill"
            }
        }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                headerSection
                
                // Tab Bar
                tabBarSection
                
                // Content
                ScrollView {
                    VStack(spacing: 24) {
                        if stripeService.isLoading && stripeService.connectAccount == nil {
                            loadingView
                        } else {
                            tabContentView
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 32)
                }
                .refreshable {
                    await refreshData()
                }
            }
            .navigationTitle("Stripe Connect")
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
                        Task {
                            await refreshData()
                        }
                    }
                    .foregroundColor(LunaraColors.warmGold)
                    .disabled(isRefreshing)
                }
            }
        }
        .onAppear {
            loadAccountData()
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage ?? "An error occurred")
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        VStack(spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Stripe Connect Management")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    Text("Manage your payment processing and account settings")
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                }
                
                Spacer()
                
                if let account = stripeService.connectAccount {
                    statusIndicator(account: account)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(LunaraColors.white)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 2, x: 0, y: 1)
    }
    
    // MARK: - Tab Bar Section
    private var tabBarSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 0) {
                ForEach(ConnectTab.allCases, id: \.self) { tab in
                    tabButton(for: tab)
                }
            }
            .padding(.horizontal, 16)
        }
        .background(LunaraColors.coolLightGray.opacity(0.3))
    }
    
    // MARK: - Tab Button
    private func tabButton(for tab: ConnectTab) -> some View {
        Button(action: {
            selectedTab = tab
        }) {
            VStack(spacing: 4) {
                Image(systemName: tab.icon)
                    .font(.system(size: 16))
                
                Text(tab.rawValue)
                    .font(.system(size: 12, weight: .medium))
            }
            .foregroundColor(selectedTab == tab ? LunaraColors.warmGold : LunaraColors.secondaryText)
            .padding(.vertical, 12)
            .padding(.horizontal, 16)
            .background(
                selectedTab == tab ? 
                LunaraColors.white : Color.clear
            )
            .cornerRadius(8)
        }
    }
    
    // MARK: - Status Indicator
    private func statusIndicator(account: StripeConnectAccountResponse) -> some View {
        HStack(spacing: 8) {
            Image(systemName: account.onboardingCompleted ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                .font(.system(size: 16))
                .foregroundColor(account.onboardingCompleted ? LunaraColors.success : LunaraColors.warning)
            
            Text(account.onboardingCompleted ? "Active" : "Setup Required")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(LunaraColors.primaryText)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(account.onboardingCompleted ? LunaraColors.success.opacity(0.1) : LunaraColors.warning.opacity(0.1))
        .cornerRadius(16)
    }
    
    // MARK: - Tab Content View
    @ViewBuilder
    private var tabContentView: some View {
        switch selectedTab {
        case .overview:
            ConnectOverviewTabView(
                shop: shop,
                stripeService: stripeService,
                onTabSwitch: { tab in selectedTab = tab }
            )
        case .balance:
            ConnectBalanceTabView(shop: shop, stripeService: stripeService)
        case .payouts:
            ConnectPayoutsTabView(shop: shop, stripeService: stripeService)
        case .transactions:
            ConnectTransactionsTabView(shop: shop, stripeService: stripeService)
        case .requirements:
            ConnectRequirementsTabView(
                shop: shop,
                stripeService: stripeService,
                onTabSwitch: { tab in selectedTab = tab }
            )
        case .onboarding:
            ConnectOnboardingTabView(
                shop: shop,
                stripeService: stripeService,
                onTabSwitch: { tab in selectedTab = tab }
            )
        }
    }
    
    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
                .tint(LunaraColors.warmGold)
            
            Text("Loading account data...")
                .font(.system(size: 16))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.top, 100)
    }
    
    // MARK: - Methods
    private func loadAccountData() {
        Task {
            await stripeService.loadConnectAccount(shopId: shop.id)
        }
    }
    
    private func refreshData() async {
        isRefreshing = true
        await stripeService.refreshAccountData(shopId: shop.id)
        isRefreshing = false
    }
}

#Preview {
    AdvancedStripeConnectManagementView(shop: Shop.preview)
}
