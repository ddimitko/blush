//
//  ExploreView.swift
//  LunaraApp
//
//  Created by Lunara Team on 30/07/2025.
//

import SwiftUI

/// Simplified explore screen for discovering beauty services and shops
struct ExploreView: View {
    // MARK: - Environment
    @EnvironmentObject var authService: AuthenticationService
    @EnvironmentObject var shopService: ShopService
    @EnvironmentObject var appState: AppState
    @StateObject private var shopCacheService = ShopCacheService.shared
    @StateObject private var locationService = LocationService.shared
    @StateObject private var searchNavigationService = SearchNavigationService.shared
    
    // MARK: - State
    @State private var featuredShops: [Shop] = []
    @State private var nearbyShops: [Shop] = []
    @State private var isLoading = true
    @State private var isRefreshing = false
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: LunaraDesignSystem.Layout.sectionSpacing) {
                // Header Section
                headerSection

                // Search Bar
                searchSection

                // Browse by Category
                categoriesSection

                // Featured Shops
                featuredShopsSection

                // Nearby Shops
                nearbyShopsSection

                // Authentication-specific content
                authSpecificContent
            }
            .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
            .padding(.bottom, LunaraDesignSystem.Spacing.xxxl)
        }
        .refreshable {
            guard !isRefreshing else { return }
            await refreshData()
        }
        .navigationBarHidden(true)
        .background(LunaraColors.background)
        .onAppear {
            Task {
                await loadData()
            }
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.md) {
            HStack {
                VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                    Text("Explore")
                        .font(.system(size: LunaraDesignSystem.Typography.largeTitle, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    if locationService.isLocationEnabled {
                        HStack(spacing: LunaraDesignSystem.Spacing.xs) {
                            Image(systemName: "location.fill")
                                .font(.system(size: LunaraDesignSystem.Typography.caption, weight: .medium))
                                .foregroundColor(LunaraColors.warmGold)

                            Text("Current Location")
                                .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .medium))
                                .foregroundColor(LunaraColors.secondaryText)
                        }
                    }
                }
                
                Spacer()
            }
        }
        .padding(.top, LunaraDesignSystem.Spacing.lg)
    }
    
    // MARK: - Search Section
    private var searchSection: some View {
        Button(action: {
            searchNavigationService.navigateToSearchWithFocus()
            appState.switchToTab(.search)
        }) {
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: LunaraDesignSystem.Typography.body, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)
                
                Text("Search shops or services...")
                    .font(.system(size: LunaraDesignSystem.Typography.body))
                    .foregroundColor(LunaraColors.secondaryText)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(LunaraDesignSystem.Spacing.lg)
            .background(LunaraColors.coolLightGray.opacity(0.5))
            .cornerRadius(LunaraDesignSystem.CornerRadius.md)
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    // MARK: - Categories Section
    private var categoriesSection: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.lg) {
            Text("Browse by Category")
                .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                .foregroundColor(LunaraColors.primaryText)
            
            LazyVGrid(
                columns: Array(repeating: GridItem(.flexible(), spacing: LunaraDesignSystem.Layout.gridSpacing), count: 3),
                spacing: LunaraDesignSystem.Layout.gridSpacing
            ) {
                ForEach(getPopularBusinessTypes(), id: \.self) { businessType in
                    ExploreCategoryCard(businessType: businessType) {
                        // Navigate to search with category filter
                        searchNavigationService.navigateToSearch(with: businessType)
                        appState.switchToTab(.search)
                    }
                }
            }
        }
    }
    
    // MARK: - Featured Shops Section
    private var featuredShopsSection: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.lg) {
            HStack {
                Text("Featured Shops")
                    .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
                
                Button("See All") {
                    appState.switchToTab(.search)
                }
                .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
            }
            
            if isLoading && !isRefreshing {
                featuredShopsSkeletonView
            } else if featuredShops.isEmpty {
                emptyFeaturedShopsView
            } else {
                featuredShopsScrollView
            }
        }
    }
    
    // MARK: - Nearby Shops Section
    private var nearbyShopsSection: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.lg) {
            HStack {
                Text(locationService.isLocationEnabled ? "Nearby Shops" : "Popular Shops")
                    .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)

                Spacer()

                Button("See All") {
                    appState.switchToTab(.search)
                }
                .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
            }
            
            if isLoading && !isRefreshing {
                nearbyShopsSkeletonView
            } else if nearbyShops.isEmpty {
                emptyNearbyShopsView
            } else {
                nearbyShopsListView
            }
        }
    }
    
    // MARK: - Authentication Specific Content
    private var authSpecificContent: some View {
        Group {
            if authService.isAuthenticated {
                authenticatedUserContent
            } else {
                unauthenticatedUserContent
            }
        }
    }

    // MARK: - Authenticated User Content
    private var authenticatedUserContent: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.lg) {
            Text("Continue Your Journey")
                .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                .foregroundColor(LunaraColors.primaryText)

            VStack(spacing: LunaraDesignSystem.Spacing.md) {
                // Quick access to appointments
                ExploreQuickActionCard(
                    icon: "calendar.badge.clock",
                    title: "My Appointments",
                    subtitle: "View upcoming bookings",
                    color: LunaraColors.info
                ) {
                    appState.switchToTab(.appointments)
                }

                // Quick access to favorites
                ExploreQuickActionCard(
                    icon: "heart.fill",
                    title: "Favorites",
                    subtitle: "Your saved shops",
                    color: LunaraColors.error
                ) {
                    // TODO: Navigate to favorites
                }
            }
        }
    }

    // MARK: - Unauthenticated User Content
    private var unauthenticatedUserContent: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.lg) {
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                    Text("Get Personalized Recommendations")
                        .font(.system(size: LunaraDesignSystem.Typography.headline, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)

                    Text("Sign up to save favorites and track appointments")
                        .font(.system(size: LunaraDesignSystem.Typography.subheadline))
                        .foregroundColor(LunaraColors.secondaryText)
                }

                Spacer()

                Button("Sign Up") {
                    authService.isGuestMode = false
                }
                .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .semibold))
                .foregroundColor(LunaraColors.buttonPrimaryText)
                .padding(.horizontal, LunaraDesignSystem.Spacing.lg)
                .padding(.vertical, LunaraDesignSystem.Spacing.sm)
                .background(LunaraColors.warmGold)
                .cornerRadius(LunaraDesignSystem.CornerRadius.button)
            }
            .padding(LunaraDesignSystem.Card.padding)
            .background(LunaraColors.cardBackground)
            .cornerRadius(LunaraDesignSystem.CornerRadius.card)
            .shadow(
                color: LunaraColors.cardShadow,
                radius: LunaraDesignSystem.Card.shadowRadius,
                x: LunaraDesignSystem.Card.shadowOffset.width,
                y: LunaraDesignSystem.Card.shadowOffset.height
            )
        }
    }

    // MARK: - Featured Shops Views
    private var featuredShopsScrollView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: LunaraDesignSystem.Layout.gridSpacing) {
                ForEach(featuredShops.prefix(5)) { shop in
                    FeaturedShopCard(shop: shop) {
                        AppState.shared.navigate(to: .shopDetails(shop.id))
                    }
                    .frame(width: LunaraDesignSystem.Card.featuredShopWidth)
                }
            }
            .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        }
        .padding(.horizontal, -LunaraDesignSystem.Layout.horizontalMargin)
    }

    private var featuredShopsSkeletonView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: LunaraDesignSystem.Layout.gridSpacing) {
                ForEach(0..<3, id: \.self) { _ in
                    FeaturedShopCardSkeleton()
                        .frame(width: LunaraDesignSystem.Card.featuredShopWidth)
                }
            }
            .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        }
        .padding(.horizontal, -LunaraDesignSystem.Layout.horizontalMargin)
    }

    private var emptyFeaturedShopsView: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.md) {
            Image(systemName: "storefront")
                .font(.system(size: 32))
                .foregroundColor(LunaraColors.coolLightGray)

            Text("No featured shops available")
                .font(.system(size: LunaraDesignSystem.Typography.subheadline))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(height: LunaraDesignSystem.Card.featuredShopHeight)
    }

    // MARK: - Nearby Shops Views
    private var nearbyShopsListView: some View {
        VStack(spacing: LunaraDesignSystem.Layout.listItemSpacing) {
            ForEach(nearbyShops.prefix(3)) { shop in
                NearbyShopCard(shop: shop) {
                    AppState.shared.navigate(to: .shopDetails(shop.id))
                }
            }
        }
    }

    private var nearbyShopsSkeletonView: some View {
        VStack(spacing: LunaraDesignSystem.Layout.listItemSpacing) {
            ForEach(0..<3, id: \.self) { _ in
                NearbyShopCardSkeleton()
            }
        }
    }

    private var emptyNearbyShopsView: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.md) {
            Image(systemName: "location.slash")
                .font(.system(size: 32))
                .foregroundColor(LunaraColors.coolLightGray)

            Text("No nearby shops found")
                .font(.system(size: LunaraDesignSystem.Typography.subheadline))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(height: 120)
    }

    // MARK: - Helper Methods

    /// Get popular business types for category browsing
    private func getPopularBusinessTypes() -> [BusinessType] {
        return [
            .beautySalon,
            .hairdresser,
            .nailStylist,
            .spa,
            .massage,
            .makeupArtist
        ]
    }

    // MARK: - Data Loading

    /// Load initial data
    private func loadData() async {
        isLoading = true

        // Try to load from cache first
        if let cachedData = shopCacheService.getCachedShopList(), cachedData.isRecent {
            await MainActor.run {
                let shops = cachedData.shops
                featuredShops = Array(shops.prefix(5))
                nearbyShops = Array(shops.prefix(3))
                isLoading = false
            }
            return
        }

        // Load from API
        await loadFromAPI()
    }

    /// Refresh data
    private func refreshData() async {
        isRefreshing = true
        await loadFromAPI()
        isRefreshing = false
    }

    /// Load data from API
    private func loadFromAPI() async {
        print("🔄 ExploreView: Starting API call to load shops...")
        do {
            let response = try await shopService.getShops(page: 0, size: 20)
            print("✅ ExploreView: Successfully loaded \(response.content.count) shops from API")

            await MainActor.run {
                // Cache the data
                shopCacheService.cacheShopList(response.content, totalElements: response.totalElements, page: response.number, size: response.size)

                // Update UI
                featuredShops = Array(response.content.prefix(5))
                nearbyShops = Array(response.content.prefix(3))
                isLoading = false
                isRefreshing = false
                print("✅ ExploreView: UI updated with \(featuredShops.count) featured shops and \(nearbyShops.count) nearby shops")
            }

        } catch {
            print("❌ ExploreView: API call failed with error: \(error)")
            print("❌ ExploreView: Error type: \(type(of: error))")
            print("❌ ExploreView: Error description: \(error.localizedDescription)")
            await handleLoadError(error)
        }
    }

    /// Handle loading errors
    private func handleLoadError(_ error: Error) async {
        await MainActor.run {
            // Try to use cached data as fallback
            if let cachedData = shopCacheService.getCachedShopList() {
                let shops = cachedData.shops
                featuredShops = Array(shops.prefix(5))
                nearbyShops = Array(shops.prefix(3))
            } else if featuredShops.isEmpty && nearbyShops.isEmpty {
                // Use preview data as last resort
                let previewShops = Shop.previewList
                featuredShops = Array(previewShops.prefix(3))
                nearbyShops = Array(previewShops.suffix(3))
            }

            isLoading = false
            isRefreshing = false
        }
    }
}
