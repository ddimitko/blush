//
//  SimplifiedDashboardView.swift
//  LunaraApp
//
//  Created by Lunara Team on 01/08/2025.
//

import SwiftUI

/// Simplified dashboard view following app design patterns
struct SimplifiedDashboardView: View {
    // MARK: - Environment Objects
    @EnvironmentObject var authService: AuthenticationService
    @EnvironmentObject var appState: AppState

    // MARK: - State
    @StateObject private var shopService = ShopService.shared
    @StateObject private var analyticsService = AnalyticsService.shared
    @State private var showingShopCreation = false
    @State private var isInitialLoad = true
    @State private var isRefreshing = false

    // Use selectedShop from ShopService
    private var selectedShop: Shop? {
        shopService.selectedShop
    }

    var body: some View {
        VStack(spacing: 0) {
            if authService.user?.hasOwnerOrEmployeeRole == true {
                if shopService.isLoadingOwnerShops && isInitialLoad {
                    loadingView
                } else if shopService.ownerShops.isEmpty {
                    emptyShopsView
                } else if selectedShop == nil && shopService.ownerShops.count > 1 {
                    shopSelectionView
                } else {
                    // Content
                    dashboardContentView
                }
            } else {
                unauthorizedView
            }
            
            Spacer()
        }
        .navigationBarHidden(true)
        .background(LunaraColors.background)
        .onAppear {
            loadDashboardData()
        }
        .onChange(of: authService.user) { _, _ in
            loadDashboardData()
        }
        .sheet(isPresented: $showingShopCreation) {
            ShopCreationView(onShopCreated: {
                print("Shop created successfully from Dashboard")
                loadDashboardData()
            })
        }
    }

    // MARK: - Dashboard Content View
    private var dashboardContentView: some View {
        ScrollView {
            LazyVStack(spacing: LunaraDesignSystem.Layout.sectionSpacing) {
                if let shop = selectedShop ?? shopService.ownerShops.first {
                    // Shop Overview Section
                    shopOverviewSection(shop: shop)

                    // Management Section
                    managementSection(shop: shop)
                }
            }
            .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
            .padding(.top, LunaraDesignSystem.Spacing.xl)
            .padding(.bottom, LunaraDesignSystem.Spacing.xxxl)
        }
        .refreshable {
            await refreshDashboardData()
        }
        .onAppear {
            if let shop = selectedShop ?? shopService.ownerShops.first {
                Task {
                    await analyticsService.refreshIfNeeded(shopId: shop.id)
                }
            }
        }
    }
    
    // MARK: - Shop Overview Section
    private func shopOverviewSection(shop: Shop) -> some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.lg) {
            HStack {
                Text("Shop Overview")
                    .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
                
                Button("Edit") {
                    appState.navigate(to: .shopSettings(shop.id))
                }
                .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
            }
            
            SimplifiedShopOverviewCard(
                shop: shop,
                isLoadingAnalytics: analyticsService.isLoading,
                servicesCount: analyticsService.servicesCount,
                employeesCount: analyticsService.employeesCount,
                thisWeekAppointments: analyticsService.thisWeekAppointments
            )
        }
    }

    // MARK: - Management Section
    private func managementSection(shop: Shop) -> some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.lg) {
            Text("Management")
                .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                .foregroundColor(LunaraColors.primaryText)

            VStack(spacing: LunaraDesignSystem.Spacing.sm) {
                DashboardManagementRow(
                    icon: "scissors",
                    title: "Services",
                    subtitle: "Manage services"
                ) {
                    appState.navigate(to: .serviceManagement(shop.id))
                }

                DashboardManagementRow(
                    icon: "person.2",
                    title: "Employees",
                    subtitle: "Manage staff"
                ) {
                    appState.navigate(to: .employeeManagement(shop.id))
                }

                DashboardManagementRow(
                    icon: "calendar",
                    title: "Appointments",
                    subtitle: "View bookings"
                ) {
                    appState.navigate(to: .appointmentManagement(shop.id))
                }

                DashboardManagementRow(
                    icon: "clock",
                    title: "Schedules",
                    subtitle: "Manage schedules"
                ) {
                    appState.navigate(to: .scheduleManagement(shop.id))
                }

                DashboardManagementRow(
                    icon: "photo.on.rectangle.angled",
                    title: "Gallery",
                    subtitle: "Manage shop photos"
                ) {
                    appState.navigate(to: .photoGalleryManagement(shop.id))
                }

                DashboardManagementRow(
                    icon: "chart.bar",
                    title: "Analytics",
                    subtitle: "View performance metrics"
                ) {
                    appState.navigate(to: .shopAnalytics(shop.id))
                }

                DashboardManagementRow(
                    icon: "creditcard",
                    title: "Payment Settings",
                    subtitle: "Manage billing & payments"
                ) {
                    appState.navigate(to: .paymentSettings(shop.id))
                }

                DashboardManagementRow(
                    icon: "gearshape",
                    title: "Shop Settings",
                    subtitle: "Shop configuration"
                ) {
                    appState.navigate(to: .shopSettings(shop.id))
                }
            }
        }
    }
    
    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.xl) {
            ProgressView()
                .scaleEffect(1.2)
                .tint(LunaraColors.warmGold)

            Text("Loading your shops...")
                .font(.system(size: LunaraDesignSystem.Typography.body, weight: .medium))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.background)
    }

    // MARK: - Empty Shops View
    private var emptyShopsView: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.xxl) {
            Image(systemName: "storefront")
                .font(.system(size: 64))
                .foregroundColor(LunaraColors.coolLightGray)

            VStack(spacing: LunaraDesignSystem.Spacing.sm) {
                Text("Welcome to Lunara")
                    .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)

                Text("Create your first shop to start managing your beauty business")
                    .font(.system(size: LunaraDesignSystem.Typography.body))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin * 2)
            }

            Button("Create Shop") {
                showingShopCreation = true
            }
            .buttonStyle(LunaraButtonStyle())
            .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin * 2)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.background)
    }

    // MARK: - Shop Selection View
    private var shopSelectionView: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.xxl) {
            VStack(spacing: LunaraDesignSystem.Spacing.sm) {
                Text("Select a Shop")
                    .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)

                Text("Choose which shop you'd like to manage")
                    .font(.system(size: LunaraDesignSystem.Typography.body))
                    .foregroundColor(LunaraColors.secondaryText)
            }

            ScrollView {
                LazyVStack(spacing: LunaraDesignSystem.Spacing.md) {
                    ForEach(shopService.ownerShops) { shop in
                        DashboardShopCard(shop: shop) {
                            shopService.selectShop(shop)
                        }
                    }
                }
                .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
            }

            Button("Create New Shop") {
                showingShopCreation = true
            }
            .buttonStyle(LunaraOutlineButtonStyle())
            .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin * 2)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.background)
        .padding(.top, LunaraDesignSystem.Spacing.xl)
    }

    // MARK: - Unauthorized View
    private var unauthorizedView: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.xl) {
            Image(systemName: "lock.shield")
                .font(.system(size: 64))
                .foregroundColor(LunaraColors.coolLightGray)

            VStack(spacing: LunaraDesignSystem.Spacing.sm) {
                Text("Access Denied")
                    .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)

                Text("You need owner or employee permissions to access the dashboard")
                    .font(.system(size: LunaraDesignSystem.Typography.body))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin * 2)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.background)
    }

    // MARK: - Methods
    private func loadDashboardData() {
        guard authService.user?.hasOwnerOrEmployeeRole == true else {
            print("❌ User doesn't have owner/employee role")
            return
        }

        Task {
            print("📊 Loading dashboard data...")
            await shopService.loadOwnerShops()

            await MainActor.run {
                isInitialLoad = false
                print("📊 Loaded \(shopService.ownerShops.count) owner shops")

                // Auto-select first shop if only one exists
                if shopService.ownerShops.count == 1, let firstShop = shopService.ownerShops.first {
                    shopService.selectShop(firstShop)
                    print("📊 Auto-selected shop: \(firstShop.name)")
                }
            }
        }
    }

    private func refreshDashboardData() async {
        isRefreshing = true
        defer { isRefreshing = false }

        await shopService.loadOwnerShops()

        if let shop = selectedShop ?? shopService.ownerShops.first {
            await analyticsService.loadShopAnalytics(shopId: shop.id)
        }
    }
}
