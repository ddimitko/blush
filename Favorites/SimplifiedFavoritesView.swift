//
//  SimplifiedFavoritesView.swift
//  LunaraApp
//
//  Created by Lunara Team on 30/07/2025.
//

import SwiftUI

/// Simplified favorites view with clean design and consistent patterns
struct SimplifiedFavoritesView: View {
    // MARK: - Environment Objects
    @EnvironmentObject var authService: AuthenticationService
    @EnvironmentObject var favoritesService: FavoritesService
    @EnvironmentObject var appState: AppState
    
    // MARK: - State
    @State private var selectedFilter: FavoritesFilter = .all
    @State private var searchText = ""
    @State private var isRefreshing = false
    
    // MARK: - Search Configuration
    private let searchDebounceTime: TimeInterval = 0.5
    
    var body: some View {
        GeometryReader { geometry in
            VStack(spacing: 0) {
                if authService.isAuthenticated {
                    // Header Section
                    headerSection
                    
                    // Filter Tabs
                    filterTabsSection
                    
                    // Content
                    contentSection
                } else {
                    // Unauthenticated State
                    unauthenticatedSection
                }
                
                Spacer()
            }
        }
        .navigationBarHidden(true)
        .background(LunaraColors.background)
        .ignoresSafeArea(.container, edges: .bottom)
        .task {
            if authService.isAuthenticated {
                await loadFavorites()
            }
        }
        .onChange(of: authService.isAuthenticated) { _, isAuthenticated in
            if isAuthenticated {
                Task {
                    await loadFavorites()
                }
            } else {
                favoritesService.clearFavorites()
            }
        }
        .onChange(of: searchText) { _, newValue in
            // Simple debouncing for search
            Task {
                try? await Task.sleep(nanoseconds: UInt64(searchDebounceTime * 1_000_000_000))
                guard newValue == searchText else { return }
                // Search is handled by computed property filteredFavorites
            }
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.lg) {
            // Title and Actions
            HStack {
                VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                    Text("Favorites")
                        .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    if !filteredFavorites.isEmpty {
                        Text("\(filteredFavorites.count) saved")
                            .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .medium))
                            .foregroundColor(LunaraColors.warmGold)
                    } else {
                        Text("Save your favorite shops")
                            .font(.system(size: LunaraDesignSystem.Typography.subheadline))
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                }
                
                Spacer()
                
                // Clear all button (when there are favorites)
                if !filteredFavorites.isEmpty && selectedFilter == .all {
                    Button(action: {
                        Task {
                            await clearAllFavorites()
                        }
                    }) {
                        Image(systemName: "trash")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundColor(LunaraColors.error)
                    }
                }
            }
            
            // Search Bar
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)
                
                TextField("Search favorites...", text: $searchText)
                    .font(.system(size: LunaraDesignSystem.Typography.body))
                    .textFieldStyle(PlainTextFieldStyle())
                
                if !searchText.isEmpty {
                    Button(action: { searchText = "" }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 16))
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                }
            }
            .padding(LunaraDesignSystem.Spacing.lg)
            .background(LunaraColors.coolLightGray.opacity(0.5))
            .cornerRadius(LunaraDesignSystem.CornerRadius.md)
        }
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        .padding(.top, LunaraDesignSystem.Spacing.lg)
    }
    
    // MARK: - Filter Tabs Section
    private var filterTabsSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                ForEach(FavoritesFilter.allCases, id: \.self) { filter in
                    FavoritesFilterChip(
                        filter: filter,
                        isSelected: selectedFilter == filter,
                        count: getFavoritesCount(for: filter)
                    ) {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            selectedFilter = filter
                        }
                    }
                }
            }
            .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        }
        .padding(.horizontal, -LunaraDesignSystem.Layout.horizontalMargin)
        .padding(.top, LunaraDesignSystem.Spacing.lg)
    }
    
    // MARK: - Content Section
    private var contentSection: some View {
        Group {
            if favoritesService.isLoading && favoritesService.favoriteShops.isEmpty {
                loadingView
            } else if filteredFavorites.isEmpty {
                emptyStateView
            } else {
                favoritesListView
            }
        }
    }
    
    private var favoritesListView: some View {
        ScrollView {
            LazyVStack(spacing: LunaraDesignSystem.Spacing.md) {
                ForEach(filteredFavorites) { shop in
                    SimplifiedFavoriteShopCard(shop: shop) {
                        appState.navigate(to: .shopDetails(shop.id))
                    }
                }
            }
            .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
            .padding(.top, LunaraDesignSystem.Spacing.xl)
            .padding(.bottom, LunaraDesignSystem.Spacing.xxxl)
        }
        .refreshable {
            await refreshFavorites()
        }
    }
    
    private var loadingView: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.md) {
            ForEach(0..<3, id: \.self) { _ in
                SimplifiedFavoriteShopCardSkeleton()
            }
        }
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        .padding(.top, LunaraDesignSystem.Spacing.xl)
    }
    
    private var emptyStateView: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.xl) {
            Image(systemName: getEmptyStateIcon())
                .font(.system(size: 64))
                .foregroundColor(LunaraColors.coolLightGray)
            
            VStack(spacing: LunaraDesignSystem.Spacing.sm) {
                Text(getEmptyStateTitle())
                    .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text(getEmptyStateMessage())
                    .font(.system(size: LunaraDesignSystem.Typography.body))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, LunaraDesignSystem.Spacing.xl)
            }
            
            if !searchText.isEmpty {
                Button("Clear Search") {
                    searchText = ""
                }
                .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
            } else if selectedFilter == .all {
                Button("Discover Shops") {
                    appState.switchToTab(.search)
                }
                .font(.system(size: LunaraDesignSystem.Typography.body, weight: .semibold))
                .foregroundColor(LunaraColors.buttonPrimaryText)
                .padding(.horizontal, LunaraDesignSystem.Spacing.xl)
                .padding(.vertical, LunaraDesignSystem.Spacing.lg)
                .background(LunaraColors.warmGold)
                .cornerRadius(LunaraDesignSystem.CornerRadius.button)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 100)
    }
    
    // MARK: - Unauthenticated Section
    private var unauthenticatedSection: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.xl) {
            Image(systemName: "heart.circle")
                .font(.system(size: 64))
                .foregroundColor(LunaraColors.warmGold)
            
            VStack(spacing: LunaraDesignSystem.Spacing.md) {
                Text("Sign In to Save Favorites")
                    .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                    .multilineTextAlignment(.center)
                
                Text("Save your favorite shops and services for quick access and never lose track of the places you love.")
                    .font(.system(size: LunaraDesignSystem.Typography.body))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, LunaraDesignSystem.Spacing.xl)
            }
            
            Button("Sign In") {
                authService.isGuestMode = false
            }
            .font(.system(size: LunaraDesignSystem.Typography.body, weight: .semibold))
            .foregroundColor(LunaraColors.buttonPrimaryText)
            .padding(.horizontal, LunaraDesignSystem.Spacing.xxxl)
            .padding(.vertical, LunaraDesignSystem.Spacing.lg)
            .background(LunaraColors.warmGold)
            .cornerRadius(LunaraDesignSystem.CornerRadius.button)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
    }

    // MARK: - Computed Properties

    /// Filtered favorites based on selected filter and search text
    private var filteredFavorites: [Shop] {
        var filtered = favoritesService.favoriteShops

        // Apply filter
        switch selectedFilter {
        case .all:
            break // Show all favorites
        case .recent:
            // Sort by most recently added to favorites
            filtered = filtered.sorted { first, second in
                // This would need a favoriteDate property on Shop or in FavoritesService
                // For now, just return the current order
                return false
            }
        case .nearby:
            // Filter by nearby shops (would need location logic)
            // For now, just return all
            break
        }

        // Apply search filter
        if !searchText.isEmpty {
            filtered = filtered.filter { shop in
                shop.name.localizedCaseInsensitiveContains(searchText) ||
                shop.address.localizedCaseInsensitiveContains(searchText) ||
                shop.businessTypes.contains { businessType in
                    businessType.displayName.localizedCaseInsensitiveContains(searchText)
                }
            }
        }

        return filtered
    }

    // MARK: - Helper Methods

    /// Get favorites count for a specific filter
    private func getFavoritesCount(for filter: FavoritesFilter) -> Int {
        let favorites = favoritesService.favoriteShops

        switch filter {
        case .all:
            return favorites.count
        case .recent:
            // For now, return all count. Could be filtered by recent additions
            return favorites.count
        case .nearby:
            // For now, return all count. Could be filtered by location
            return favorites.count
        }
    }

    /// Get empty state icon based on current filter and search
    private func getEmptyStateIcon() -> String {
        if !searchText.isEmpty {
            return "magnifyingglass"
        }

        switch selectedFilter {
        case .all:
            return "heart"
        case .recent:
            return "clock"
        case .nearby:
            return "location"
        }
    }

    /// Get empty state title based on current filter and search
    private func getEmptyStateTitle() -> String {
        if !searchText.isEmpty {
            return "No Results Found"
        }

        switch selectedFilter {
        case .all:
            return "No Favorites Yet"
        case .recent:
            return "No Recent Favorites"
        case .nearby:
            return "No Nearby Favorites"
        }
    }

    /// Get empty state message based on current filter and search
    private func getEmptyStateMessage() -> String {
        if !searchText.isEmpty {
            return "Try adjusting your search terms to find your favorite shops."
        }

        switch selectedFilter {
        case .all:
            return "Start exploring and save shops you love for quick access later."
        case .recent:
            return "Recently added favorites will appear here."
        case .nearby:
            return "Favorite shops near your location will appear here."
        }
    }

    // MARK: - Actions

    /// Clear all favorites
    private func clearAllFavorites() async {
        // Clear all favorites by removing each one individually
        for shop in favoritesService.favoriteShops {
            _ = await favoritesService.removeFromFavorites(shopId: shop.id)
        }
    }

    /// Load favorites
    private func loadFavorites() async {
        await favoritesService.loadFavoriteShops()
    }

    /// Refresh favorites
    private func refreshFavorites() async {
        guard !isRefreshing else { return }

        await MainActor.run {
            isRefreshing = true
        }

        await favoritesService.loadFavoriteShops()

        await MainActor.run {
            isRefreshing = false
        }
    }
}

// MARK: - Favorites Filter Enum
enum FavoritesFilter: String, CaseIterable {
    case all = "all"
    case recent = "recent"
    case nearby = "nearby"

    var displayName: String {
        switch self {
        case .all: return "All"
        case .recent: return "Recent"
        case .nearby: return "Nearby"
        }
    }

    var iconName: String {
        switch self {
        case .all: return "heart"
        case .recent: return "clock"
        case .nearby: return "location"
        }
    }
}
