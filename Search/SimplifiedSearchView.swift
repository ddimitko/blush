//
//  SimplifiedSearchView.swift
//  LunaraApp
//
//  Created by Lunara Team on 30/07/2025.
//

import SwiftUI
import Kingfisher

/// Simplified search view with clean design and consistent patterns
struct SimplifiedSearchView: View {
    // MARK: - Environment Objects
    @EnvironmentObject var authService: AuthenticationService
    @EnvironmentObject var appState: AppState
    @StateObject private var locationService = LocationService.shared
    @StateObject private var shopCacheService = ShopCacheService.shared
    @StateObject private var searchNavigationService = SearchNavigationService.shared
    
    // MARK: - State
    @State private var searchText = ""
    @State private var shops: [Shop] = []
    @State private var filteredShops: [Shop] = []
    @State private var isLoading = false
    @State private var selectedCategory: BusinessType? = nil
    @State private var showingFilters = false
    @State private var sortOption: SearchSortOption = .relevance
    @State private var selectedCity: String? = nil
    @State private var selectedPaymentType: PaymentTypeFilter? = nil
    @FocusState private var isSearchFieldFocused: Bool
    

    
    // MARK: - Search Configuration
    private let searchDebounceTime: TimeInterval = 0.8
    
    var body: some View {
        GeometryReader { geometry in
            VStack(spacing: 0) {
                // Header with Search Bar
                headerSection

                // Quick Category Filters
                if searchText.isEmpty {
                    quickCategoriesSection
                }

                // Results Section
                resultsSection

                Spacer()
            }
        }
        .navigationBarHidden(true)
        .background(LunaraColors.background)
        .ignoresSafeArea(.container, edges: .bottom)
        .onAppear {
            // Check for pending navigation from other views
            if let pendingCategory = searchNavigationService.pendingCategory {
                selectedCategory = pendingCategory
            }

            if let pendingSearchText = searchNavigationService.pendingSearchText {
                searchText = pendingSearchText
            }

            // Handle search field focus
            if searchNavigationService.shouldFocusSearchField {
                // Delay focus slightly to ensure view is fully loaded
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    isSearchFieldFocused = true
                }
            }

            // Clear navigation state after processing
            searchNavigationService.clearPendingNavigation()

            loadInitialData()
        }
        .onChange(of: searchText) { _, newValue in
            performSearch(query: newValue)
        }
        .onChange(of: selectedCategory) { _, _ in
            applyFilters()
        }
        .onChange(of: selectedCity) { _, _ in
            applyFilters()
        }
        .onChange(of: selectedPaymentType) { _, _ in
            applyFilters()
        }
        .sheet(isPresented: $showingFilters) {
            SimplifiedSearchFiltersView(
                sortOption: $sortOption,
                selectedCity: $selectedCity,
                selectedPaymentType: $selectedPaymentType,
                onApply: {
                    applyFilters()
                }
            )
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.lg) {
            // Navigation and Title
            HStack {
                Text("Search")
                    .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)

                Spacer()

                Button(action: { showingFilters = true }) {
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)
                }
            }
            
            // Search Bar
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)
                
                TextField("Search shops or services...", text: $searchText)
                    .font(.system(size: LunaraDesignSystem.Typography.body))
                    .textFieldStyle(PlainTextFieldStyle())
                    .focused($isSearchFieldFocused)
                
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
        .padding(.bottom, LunaraDesignSystem.Spacing.lg)
    }
    
    // MARK: - Quick Categories Section
    private var quickCategoriesSection: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.lg) {
            HStack {
                Text("Browse Categories")
                    .font(.system(size: LunaraDesignSystem.Typography.headline, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
            }
            .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: LunaraDesignSystem.Spacing.md) {
                    // All Categories Button
                    CategoryFilterChip(
                        title: "All",
                        icon: "square.grid.2x2",
                        isSelected: selectedCategory == nil
                    ) {
                        selectedCategory = nil
                    }
                    
                    // Category Chips
                    ForEach(getPopularBusinessTypes(), id: \.self) { businessType in
                        CategoryFilterChip(
                            title: businessType.displayName,
                            icon: businessType.iconName,
                            isSelected: selectedCategory == businessType
                        ) {
                            selectedCategory = selectedCategory == businessType ? nil : businessType
                        }
                    }
                }
                .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
            }
            .padding(.horizontal, -LunaraDesignSystem.Layout.horizontalMargin)
        }
        .padding(.bottom, LunaraDesignSystem.Spacing.xl)
    }
    
    // MARK: - Results Section
    private var resultsSection: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.lg) {
            // Results Header
            if !searchText.isEmpty || selectedCategory != nil {
                resultsHeaderView
            }
            
            // Results Content
            if isLoading {
                loadingView
            } else if filteredShops.isEmpty && (!searchText.isEmpty || selectedCategory != nil) {
                emptyResultsView
            } else if !filteredShops.isEmpty {
                shopsGridView
            } else {
                // Show popular shops when no search/filter is active
                popularShopsView
            }
        }
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
    }
    
    private var resultsHeaderView: some View {
        HStack {
            VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                if !searchText.isEmpty {
                    Text("Results for \"\(searchText)\"")
                        .font(.system(size: LunaraDesignSystem.Typography.headline, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)
                } else if let category = selectedCategory {
                    Text(category.displayName)
                        .font(.system(size: LunaraDesignSystem.Typography.headline, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)
                }
                
                Text("\(filteredShops.count) shops found")
                    .font(.system(size: LunaraDesignSystem.Typography.subheadline))
                    .foregroundColor(LunaraColors.secondaryText)
            }
            
            Spacer()
            
            // Sort Button
            Button(action: { showingFilters = true }) {
                HStack(spacing: LunaraDesignSystem.Spacing.xs) {
                    Text(sortOption.displayName)
                        .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .medium))
                    
                    Image(systemName: "chevron.down")
                        .font(.system(size: 12, weight: .medium))
                }
                .foregroundColor(LunaraColors.warmGold)
            }
        }
    }
    
    private var shopsGridView: some View {
        LazyVGrid(
            columns: Array(repeating: GridItem(.flexible(), spacing: LunaraDesignSystem.Layout.gridSpacing), count: 2),
            spacing: LunaraDesignSystem.Layout.gridSpacing
        ) {
            ForEach(filteredShops) { shop in
                SimplifiedSearchShopCard(shop: shop) {
                    appState.navigate(to: .shopDetails(shop.id))
                }
            }
        }
    }
    
    private var popularShopsView: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.lg) {
            Text("Popular Shops")
                .font(.system(size: LunaraDesignSystem.Typography.headline, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            shopsGridView
        }
    }
    
    private var loadingView: some View {
        LazyVGrid(
            columns: Array(repeating: GridItem(.flexible(), spacing: LunaraDesignSystem.Layout.gridSpacing), count: 2),
            spacing: LunaraDesignSystem.Layout.gridSpacing
        ) {
            ForEach(0..<6, id: \.self) { _ in
                SimplifiedSearchShopCardSkeleton()
            }
        }
    }
    
    private var emptyResultsView: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.lg) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 48))
                .foregroundColor(LunaraColors.coolLightGray)
            
            VStack(spacing: LunaraDesignSystem.Spacing.sm) {
                Text("No shops found")
                    .font(.system(size: LunaraDesignSystem.Typography.headline, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text("Try adjusting your search or filters")
                    .font(.system(size: LunaraDesignSystem.Typography.subheadline))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
            }
            
            Button("Clear Filters") {
                searchText = ""
                selectedCategory = nil
                sortOption = .relevance
            }
            .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .medium))
            .foregroundColor(LunaraColors.warmGold)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 60)
    }

    // MARK: - Helper Methods

    /// Get popular business types for category filtering
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
    private func loadInitialData() {
        Task {
            await loadShops()
        }
    }

    /// Load shops from API or cache
    private func loadShops() async {
        print("🔄 SimplifiedSearchView: Starting to load shops...")
        await MainActor.run {
            isLoading = true
        }

        do {
            // Try to load from cache first
            if let cachedData = shopCacheService.getCachedShopList(), cachedData.isRecent {
                print("✅ SimplifiedSearchView: Using cached data with \(cachedData.shops.count) shops")
                await MainActor.run {
                    shops = cachedData.shops
                    applyFilters()
                    isLoading = false
                }
                return
            }

            // Load from API
            print("🔄 SimplifiedSearchView: Loading from API...")
            let response = try await APIClient.shared.getShops(page: 0, size: 50)
            print("✅ SimplifiedSearchView: Successfully loaded \(response.content.count) shops from API")

            await MainActor.run {
                // Cache the data
                shopCacheService.cacheShopList(response.content, totalElements: response.totalElements, page: response.number, size: response.size)

                // Update UI
                shops = response.content
                applyFilters()
                isLoading = false
                print("✅ SimplifiedSearchView: UI updated with \(shops.count) shops")
            }

        } catch {
            print("❌ SimplifiedSearchView: API call failed with error: \(error)")
            print("❌ SimplifiedSearchView: Error type: \(type(of: error))")
            print("❌ SimplifiedSearchView: Error description: \(error.localizedDescription)")
            await MainActor.run {
                // Try to use cached data as fallback
                if let cachedData = shopCacheService.getCachedShopList() {
                    print("⚠️ SimplifiedSearchView: Using stale cached data as fallback")
                    shops = cachedData.shops
                    applyFilters()
                } else {
                    print("⚠️ SimplifiedSearchView: No cached data available, using preview data")
                    // Use preview data as last resort
                    shops = Shop.previewList
                    applyFilters()
                }
                isLoading = false
            }
        }
    }

    /// Perform search with debouncing
    private func performSearch(query: String) {
        Task {
            // Simple debouncing
            try? await Task.sleep(nanoseconds: UInt64(searchDebounceTime * 1_000_000_000))

            // Check if search text is still the same (user hasn't typed more)
            guard query == searchText else { return }

            if query.isEmpty {
                await MainActor.run {
                    applyFilters()
                }
            } else {
                await searchWithQuery(query)
            }
        }
    }

    /// Search with specific query
    private func searchWithQuery(_ query: String) async {
        await MainActor.run {
            isLoading = true
        }

        do {
            let response = try await APIClient.shared.getShops(page: 0, size: 50, search: query)

            await MainActor.run {
                shops = response.content
                applyFilters()
                isLoading = false
            }

        } catch {
            await MainActor.run {
                // Fallback to local search
                applyFilters()
                isLoading = false
            }
        }
    }

    /// Apply filters and sorting
    private func applyFilters() {
        var filtered = shops

        // Apply category filter
        if let category = selectedCategory {
            filtered = filtered.filter { shop in
                shop.businessTypes.contains(category)
            }
        }

        // Apply city filter
        if let city = selectedCity {
            filtered = filtered.filter { shop in
                shop.city.localizedCaseInsensitiveContains(city)
            }
        }

        // Apply payment type filter
        if let paymentType = selectedPaymentType {
            filtered = filtered.filter { shop in
                switch paymentType {
                case .cardOnly:
                    return shop.acceptsCardPayments
                case .cashOnly:
                    return !shop.acceptsCardPayments
                case .both:
                    return true // Show all shops
                }
            }
        }

        // Apply text search filter (local fallback)
        if !searchText.isEmpty {
            filtered = filtered.filter { shop in
                shop.name.localizedCaseInsensitiveContains(searchText) ||
                shop.description.localizedCaseInsensitiveContains(searchText) ||
                shop.city.localizedCaseInsensitiveContains(searchText) ||
                shop.businessTypes.contains { $0.displayName.localizedCaseInsensitiveContains(searchText) }
            }
        }

        // Apply sorting
        filtered = sortShops(filtered, by: sortOption)

        filteredShops = filtered
    }

    /// Sort shops by selected option
    private func sortShops(_ shops: [Shop], by option: SearchSortOption) -> [Shop] {
        switch option {
        case .relevance:
            return shops // Keep original order (API relevance)
        case .rating:
            return shops.sorted { $0.ratingAverage > $1.ratingAverage }
        case .distance:
            // Simplified distance sorting (would need actual location calculation)
            return shops.sorted { $0.name < $1.name } // Fallback to name
        case .name:
            return shops.sorted { $0.name < $1.name }
        case .newest:
            return shops.sorted { $0.createdAt > $1.createdAt }
        }
    }
}

// MARK: - Search Sort Option Enum
enum SearchSortOption: String, CaseIterable {
    case relevance = "relevance"
    case rating = "rating"
    case distance = "distance"
    case name = "name"
    case newest = "newest"

    var displayName: String {
        switch self {
        case .relevance: return "Relevance"
        case .rating: return "Rating"
        case .distance: return "Distance"
        case .name: return "Name"
        case .newest: return "Newest"
        }
    }

    var iconName: String {
        switch self {
        case .relevance: return "star"
        case .rating: return "star.fill"
        case .distance: return "location"
        case .name: return "textformat.abc"
        case .newest: return "clock"
        }
    }
}

// MARK: - Payment Type Filter Enum
enum PaymentTypeFilter: String, CaseIterable {
    case cardOnly = "card_only"
    case cashOnly = "cash_only"
    case both = "both"

    var displayName: String {
        switch self {
        case .cardOnly: return "Card Only"
        case .cashOnly: return "Cash Only"
        case .both: return "Both"
        }
    }

    var iconName: String {
        switch self {
        case .cardOnly: return "creditcard"
        case .cashOnly: return "banknote"
        case .both: return "dollarsign.circle"
        }
    }
}
