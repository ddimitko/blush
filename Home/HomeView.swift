//
//  HomeView.swift
//  LunaraApp
//
//  Created by Lunara Team on 14/07/2025.
//

import SwiftUI
import Kingfisher
import Alamofire

/// Enhanced main home view with elegant, entertaining, and informative design
struct HomeView: View {
    // MARK: - Environment Objects
    @EnvironmentObject var authService: AuthenticationService

    @ObservedObject private var shopCacheService = ShopCacheService.shared
    @ObservedObject private var refreshCoordinator = RefreshCoordinator.shared
    @ObservedObject private var taskManager = SmartTaskManager()

    // MARK: - State
    @State private var featuredShops: [Shop] = []
    @State private var nearbyShops: [Shop] = []
    @State private var trendingServices: [Service] = []
    @State private var isLoading = true
    @State private var isRefreshing = false
    @State private var showingLocationPermission = false
    @State private var cacheInfo: ShopCacheInfo?
    @State private var showingShopCreation = false

    // MARK: - Enhanced UI State
    @State private var currentTimeGreeting = ""
    @State private var personalizedTip = ""
    @State private var showingDiscoveryStories = false
    @State private var heroImageOffset: CGFloat = 0
    @State private var quickActionScale: CGFloat = 1.0

    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVStack(spacing: 0) {
                    // Dynamic Hero Section
                    dynamicHeroSection

                    // Enhanced Content Sections
                    VStack(spacing: 24) {
                        // Smart Quick Actions
                        smartQuickActionsSection

                        // Discovery Stories
                        discoveryStoriesSection

                        // Personalized Recommendations
                        personalizedRecommendationsSection

                        // Featured Shops with enhanced design
                        enhancedFeaturedShopsSection

                        // Trending Services
                        trendingServicesSection

                        // Nearby Shops with social proof
                        enhancedNearbyShopsSection

                        // Business Opportunity (contextual)
                        contextualBusinessOpportunity
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 24)
                }
            }
            .refreshable {
                // Prevent pull-to-refresh if already refreshing
                guard !isRefreshing else { return }
                await refreshData()
            }
            .background(LunaraColors.background)
        }
        .onAppear {
            loadDataOnAppear()
            updateTimeBasedContent()
        }
        .onDisappear {
            // Use smart cancellation - allow important operations to complete
            taskManager.cancelNonCriticalTasks(reason: "View disappeared")
        }
        .sheet(isPresented: $showingShopCreation) {
            ShopCreationView(onShopCreated: {
                // Handle successful shop creation
                print("Shop created successfully")
            })
        }
    }
    
    // MARK: - Dynamic Hero Section
    private var dynamicHeroSection: some View {
        ZStack {
            // Background gradient with subtle animation
            LinearGradient(
                gradient: Gradient(colors: [
                    LunaraColors.warmGold.opacity(0.1),
                    LunaraColors.background,
                    LunaraColors.coolLightGray.opacity(0.3)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .frame(height: 280)
            .offset(y: heroImageOffset * 0.5)

            VStack(spacing: 16) {
                // Time-based greeting with animation
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(currentTimeGreeting)
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(LunaraColors.primaryText)
                                .animation(.easeInOut(duration: 0.6), value: currentTimeGreeting)

                            if authService.isAuthenticated, let user = authService.user {
                                Text("\(user.firstName)!")
                                    .font(.system(size: 28, weight: .bold))
                                    .foregroundColor(LunaraColors.warmGold)
                            } else {
                                Text("Welcome to Lunara")
                                    .font(.system(size: 20, weight: .semibold))
                                    .foregroundColor(LunaraColors.warmGold)
                            }
                        }

                        Spacer()

                        // Weather-aware beauty tip icon
                        ZStack {
                            Circle()
                                .fill(LunaraColors.warmGold.opacity(0.2))
                                .frame(width: 50, height: 50)

                            Image(systemName: getWeatherIcon())
                                .font(.system(size: 24, weight: .medium))
                                .foregroundColor(LunaraColors.warmGold)
                        }
                        .scaleEffect(quickActionScale)
                        .animation(.easeInOut(duration: 2.0).repeatForever(autoreverses: true), value: quickActionScale)
                    }

                    // Personalized tip or discovery message
                    Text(personalizedTip)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)
                        .lineLimit(2)
                        .animation(.easeInOut(duration: 0.8), value: personalizedTip)
                }
                .padding(.horizontal, 20)
                .padding(.top, 20)

                Spacer()

                // Quick stats or achievements (for business owners)
                if authService.user?.hasOwnerOrEmployeeRole == true {
                    businessOwnerStatsSection
                }
            }
        }
        .frame(height: 280)
        .onAppear {
            startHeroAnimations()
        }
    }



    // MARK: - Smart Quick Actions Section
    private var smartQuickActionsSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack {
                Text("Quick Actions")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)

                Spacer()

                // Contextual badge (e.g., "3 new" for notifications)
                if authService.isAuthenticated {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(LunaraColors.success)
                            .frame(width: 8, height: 8)

                        Text("Active")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(LunaraColors.success)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(LunaraColors.success.opacity(0.1))
                    .cornerRadius(12)
                }
            }

            // Enhanced quick action cards with better visual hierarchy
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 2), spacing: 16) {
                // Primary actions based on user state
                if authService.isAuthenticated {
                    EnhancedQuickActionCard(
                        icon: "calendar.badge.clock",
                        title: "My Bookings",
                        subtitle: getUpcomingBookingsText(),
                        color: LunaraColors.info,
                        badgeText: getUpcomingBookingsBadge(),
                        isPrimary: true
                    ) {
                        // Navigate to appointments
                    }

                    EnhancedQuickActionCard(
                        icon: "heart.fill",
                        title: "Favorites",
                        subtitle: getFavoritesText(),
                        color: LunaraColors.error,
                        badgeText: getFavoritesBadge(),
                        isPrimary: false
                    ) {
                        // Navigate to favorites
                    }

                    if authService.user?.role == .user {
                        EnhancedQuickActionCard(
                            icon: "storefront",
                            title: "List Business",
                            subtitle: "Start earning",
                            color: LunaraColors.warmGold,
                            badgeText: "New",
                            isPrimary: true
                        ) {
                            showingShopCreation = true
                        }
                    }

                    EnhancedQuickActionCard(
                        icon: "magnifyingglass",
                        title: "Discover",
                        subtitle: "Find services",
                        color: LunaraColors.warmGold,
                        badgeText: nil,
                        isPrimary: false
                    ) {
                        // Navigate to search
                    }
                } else {
                    EnhancedQuickActionCard(
                        icon: "person.crop.circle.badge.plus",
                        title: "Sign In",
                        subtitle: "Access account",
                        color: LunaraColors.success,
                        badgeText: nil,
                        isPrimary: true
                    ) {
                        authService.isGuestMode = false
                    }

                    EnhancedQuickActionCard(
                        icon: "magnifyingglass",
                        title: "Browse Shops",
                        subtitle: "Explore services",
                        color: LunaraColors.warmGold,
                        badgeText: nil,
                        isPrimary: false
                    ) {
                        // Navigate to search
                    }

                    EnhancedQuickActionCard(
                        icon: "storefront",
                        title: "List Business",
                        subtitle: "Join Lunara",
                        color: LunaraColors.warmGold,
                        badgeText: "Popular",
                        isPrimary: true
                    ) {
                        authService.isGuestMode = false
                    }

                    EnhancedQuickActionCard(
                        icon: "info.circle",
                        title: "How It Works",
                        subtitle: "Learn more",
                        color: LunaraColors.info,
                        badgeText: nil,
                        isPrimary: false
                    ) {
                        // Show how it works
                    }
                }
            }
        }
    }
    


    // MARK: - Empty Shops State
    private var emptyShopsState: some View {
        VStack(spacing: 20) {
            VStack(spacing: 12) {
                Image(systemName: "storefront")
                    .font(.system(size: 48, weight: .light))
                    .foregroundColor(LunaraColors.secondaryText)

                Text("No shops found in your area")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)

                Text("Be the first to list your business and start earning!")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
            }

            // Business opportunity CTA
            ListYourBusinessCompactBannerView {
                // Check authentication before allowing shop creation
                if authService.isAuthenticated {
                    showingShopCreation = true
                } else {
                    // Prompt guest to sign in first
                    authService.isGuestMode = false
                }
            }
        }
        .padding(.vertical, 32)
        .padding(.horizontal, 16)
    }

    // MARK: - Discovery Stories Section
    private var discoveryStoriesSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Trending Now")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)

                Spacer()

                Button("See All") {
                    showingDiscoveryStories = true
                }
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(LunaraColors.warmGold)
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(0..<5, id: \.self) { index in
                        DiscoveryStoryCard(
                            title: getStoryTitle(index),
                            subtitle: getStorySubtitle(index),
                            imageName: "story_\(index)",
                            isNew: index < 2
                        ) {
                            // Handle story tap
                        }
                    }
                }
                .padding(.horizontal, 4)
            }
        }
    }

    // MARK: - Personalized Recommendations Section
    private var personalizedRecommendationsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Just For You")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)

                    Text("Based on your preferences")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)
                }

                Spacer()

                // AI badge
                HStack(spacing: 4) {
                    Image(systemName: "brain.head.profile")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(LunaraColors.warmGold)

                    Text("AI")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(LunaraColors.warmGold)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(LunaraColors.warmGold.opacity(0.1))
                .cornerRadius(12)
            }

            if authService.isAuthenticated {
                // Personalized service recommendations
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 2), spacing: 12) {
                    ForEach(0..<4, id: \.self) { index in
                        PersonalizedRecommendationCard(
                            serviceName: getRecommendedService(index),
                            shopName: getRecommendedShop(index),
                            price: getRecommendedPrice(index),
                            rating: 4.8,
                            distance: "0.5 km",
                            isPopular: index < 2
                        ) {
                            // Handle recommendation tap
                        }
                    }
                }
            } else {
                // Guest recommendations
                VStack(spacing: 12) {
                    Text("Sign in to get personalized recommendations")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)

                    Button("Sign In Now") {
                        authService.isGuestMode = false
                    }
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(LunaraColors.buttonPrimaryText)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(LunaraColors.warmGold)
                    .cornerRadius(20)
                }
                .padding(.vertical, 20)
            }
        }
    }

    // MARK: - Enhanced Featured Shops Section
    private var enhancedFeaturedShopsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Featured Shops")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)

                    Text("Handpicked by our team")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)
                }

                Spacer()

                Button("See All") {
                    // Navigate to all featured shops
                }
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(LunaraColors.warmGold)
            }

            if isLoading && !isRefreshing {
                HStack {
                    ForEach(0..<2, id: \.self) { _ in
                        EnhancedShopCardSkeleton()
                    }
                }
            } else if featuredShops.isEmpty {
                emptyShopsState
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(featuredShops.prefix(5)) { shop in
                            EnhancedShopCard(shop: shop)
                                .frame(width: 280)
                                .onTapGesture {
                                    AppState.shared.navigate(to: .shopDetails(shop.id))
                                }
                        }
                    }
                    .padding(.horizontal, 16)
                }
            }
        }
    }
    
    // MARK: - Methods
    private func loadDataOnAppear() {
        // Use smart task manager for initial load
        Task {
            do {
                try await taskManager.startDataLoadTask(
                    key: "home_initial_load",
                    priority: SmartTaskManager.TaskPriority.normal
                ) {
                    await self.loadData(isRefresh: false)
                }
            } catch {
                // Use improved error handling
                if !RefreshErrorHandler.shouldIgnoreError(error) {
                    await handleLoadError(error)
                }
            }
        }
    }

    private func refreshData() async {
        // Use improved RefreshCoordinator with better cancellation handling
        do {
            try await refreshCoordinator.requestRefresh(
                type: .shopList,
                priority: .userInitiated,
                debounce: false,
                allowBackgroundCompletion: true
            ) {
                await self.performRefresh()
            }
        } catch {
            // Use improved error handling that distinguishes cancellation types
            RefreshErrorHandler.handleAsyncError(error, context: "Home refresh") { message in
                Task { @MainActor in
                    // Show user-friendly error message
                    // You can integrate this with your alert system
                    print("🚨 User error: \(message)")
                }
            }
        }
    }

    private func performRefresh() async {
        await MainActor.run {
            isRefreshing = true
        }

        // Use smart task manager for refresh
        do {
            try await taskManager.startRefreshTask(
                key: "home_refresh",
                priority: SmartTaskManager.TaskPriority.userInitiated
            ) {
                await self.loadFromAPI()
            }
        } catch {
            if !RefreshErrorHandler.shouldIgnoreError(error) {
                await handleLoadError(error)
            }
        }

        await MainActor.run {
            isRefreshing = false
        }
    }

    private func loadData(isRefresh: Bool) async {
        await MainActor.run {
            if isRefresh {
                isRefreshing = true
            } else {
                isLoading = true
            }
        }

        do {
            // Check if task was cancelled before starting
            try Task.checkCancellation()

            // Update cache info for debugging
            await MainActor.run {
                cacheInfo = shopCacheService.getCacheInfo()
            }

            // For refresh, skip cache and force API call
            if isRefresh {
                print("🔄 Refresh requested - bypassing cache")
                await loadFromAPI()
                return
            }

            // Try to load from cache first (only for initial load)
            if let cachedData = shopCacheService.getCachedShopList(), cachedData.isRecent {
                print("📦 Loading shops from cache (\(cachedData.shops.count) shops)")

                await MainActor.run {
                    let shops = cachedData.shops
                    featuredShops = Array(shops.prefix(5))
                    nearbyShops = Array(shops.prefix(3))
                    isLoading = false
                    isRefreshing = false
                }

                print("✅ Loaded \(cachedData.shops.count) shops from cache")
                return
            }

            // No valid cache, load from API
            print("📦 No valid cache found, loading from API...")
            await loadFromAPI()

        } catch {
            await handleLoadError(error)
        }
    }

    /// Load shops from API and cache the results
    private func loadFromAPI() async {
        do {
            try Task.checkCancellation()

            print("🔄 Loading shops from API...")
            print("📍 API Base URL: \(APIClient.shared.baseURLString)")

            // Test basic connectivity first
            do {
                try Task.checkCancellation()
                let healthStatus = try await APIClient.shared.testConnection()
                print("✅ Health check passed: \(healthStatus)")
            } catch {
                print("❌ Health check failed: \(error)")
                throw error
            }

            // Check cancellation again before main request
            try Task.checkCancellation()

            // Load shops from API
            let response = try await APIClient.shared.getShops(page: 0, size: 10)

            await MainActor.run {
                let shops = response.content
                print("✅ API returned \(shops.count) shops")

                // Cache the fresh data
                shopCacheService.cacheShopList(
                    shops,
                    totalElements: response.totalElements,
                    page: response.number,
                    size: response.size
                )

                // Update UI with fresh data
                featuredShops = Array(shops.prefix(5))
                nearbyShops = Array(shops.prefix(3))

                if shops.isEmpty {
                    print("⚠️ No shops returned from API - showing empty state")
                }

                isLoading = false
                isRefreshing = false

                // Update cache info
                cacheInfo = shopCacheService.getCacheInfo()
            }
        } catch {
            await handleLoadError(error)
        }
    }

    /// Handle errors during data loading
    private func handleLoadError(_ error: Error) async {
        // Handle cancellation gracefully
        if error is CancellationError {
            print("🔄 Data loading was cancelled")
            await MainActor.run {
                isLoading = false
                isRefreshing = false
            }
            return
        }

        print("❌ Failed to load shops: \(error)")

        // Print more detailed error information
        if let afError = error as? AFError {
            print("🔍 AFError details: \(afError.localizedDescription)")
            if let underlyingError = afError.underlyingError {
                print("🔍 Underlying error: \(underlyingError)")
            }

            // Don't fall back to mock data on explicit cancellation
            if case .explicitlyCancelled = afError {
                print("🔄 Request was explicitly cancelled - not using fallback data")
                await MainActor.run {
                    isLoading = false
                    isRefreshing = false
                }
                return
            }
        }

        await MainActor.run {
            // Try to use cached data as fallback if available
            if let cachedData = shopCacheService.getCachedShopList() {
                print("📦 Using cached data as fallback (\(cachedData.shops.count) shops)")
                let shops = cachedData.shops
                featuredShops = Array(shops.prefix(5))
                nearbyShops = Array(shops.prefix(3))
            } else if featuredShops.isEmpty && nearbyShops.isEmpty {
                // Only use preview data if no cache and no existing data
                print("🔄 Using preview data as last resort fallback")
                let previewShops = Shop.previewList
                featuredShops = Array(previewShops.prefix(3))
                nearbyShops = Array(previewShops.suffix(3))
            }

            isLoading = false
            isRefreshing = false
        }
    }

    // MARK: - Trending Services Section
    private var trendingServicesSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Trending Services")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)

                    Text("Popular this week")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)
                }

                Spacer()

                // Trending indicator
                HStack(spacing: 4) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(LunaraColors.warning)

                    Text("Hot")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(LunaraColors.warning)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(LunaraColors.warning.opacity(0.1))
                .cornerRadius(12)
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(0..<6, id: \.self) { index in
                        TrendingServiceCard(
                            serviceName: getTrendingServiceName(index),
                            shopName: getTrendingShopName(index),
                            price: getTrendingPrice(index),
                            bookingCount: getTrendingBookingCount(index),
                            isHot: index < 3
                        ) {
                            // Handle trending service tap
                        }
                    }
                }
                .padding(.horizontal, 4)
            }
        }
    }

    // MARK: - Enhanced Nearby Shops Section
    private var enhancedNearbyShopsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Nearby Shops")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)

                    Text("Within 2km of your location")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)
                }

                Spacer()

                Button("See All") {
                    // Navigate to all nearby shops
                }
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(LunaraColors.warmGold)
            }

            if isLoading && !isRefreshing {
                VStack(spacing: 8) {
                    ForEach(0..<3, id: \.self) { _ in
                        EnhancedShopListItemSkeleton()
                    }
                }
            } else if nearbyShops.isEmpty {
                emptyShopsState
            } else {
                VStack(spacing: 8) {
                    ForEach(nearbyShops.prefix(3)) { shop in
                        EnhancedShopListItem(shop: shop)
                            .onTapGesture {
                                AppState.shared.navigate(to: .shopDetails(shop.id))
                            }
                    }
                }
            }
        }
    }

    // MARK: - Contextual Business Opportunity
    private var contextualBusinessOpportunity: some View {
        Group {
            if authService.isAuthenticated && authService.user?.role == .user {
                BusinessOpportunityEnhancedBannerView {
                    showingShopCreation = true
                }
            }
        }
    }

    // MARK: - Business Owner Stats Section
    private var businessOwnerStatsSection: some View {
        HStack(spacing: 16) {
            StatCard(
                icon: "calendar.badge.clock",
                value: getTodaysBookingCount(),
                label: "Today's Bookings",
                color: LunaraColors.info
            )

            StatCard(
                icon: "dollarsign.circle.fill",
                value: getWeeklyRevenue(),
                label: "This Week",
                color: LunaraColors.success
            )

            StatCard(
                icon: "star.fill",
                value: getAverageRating(),
                label: "Rating",
                color: LunaraColors.warmGold
            )
        }
        .padding(.horizontal, 20)
        .padding(.bottom, 20)
    }

    // MARK: - Business Stats Helper Methods

    private func getTodaysBookingCount() -> String {
        let hour = Calendar.current.component(.hour, from: Date())
        let weekday = Calendar.current.component(.weekday, from: Date())

        // Simulate realistic booking patterns
        let baseBookings: Int = {
            switch weekday {
            case 1: return 8  // Sunday - slower
            case 2: return 12 // Monday - moderate
            case 3: return 15 // Tuesday - busy
            case 4: return 18 // Wednesday - peak
            case 5: return 20 // Thursday - peak
            case 6: return 22 // Friday - busiest
            case 7: return 16 // Saturday - busy
            default: return 12
            }
        }()

        // Adjust based on time of day
        let timeProgress = Double(hour) / 24.0
        let currentBookings = Int(Double(baseBookings) * timeProgress)

        return "\(max(currentBookings, 0))"
    }

    private func getWeeklyRevenue() -> String {
        let weekday = Calendar.current.component(.weekday, from: Date())

        // Simulate weekly revenue accumulation
        let dailyAverages = [850, 1200, 1450, 1680, 1920, 2100, 1650] // Sun-Sat
        let weekProgress = weekday - 1

        let weeklyTotal = dailyAverages.prefix(weekProgress + 1).reduce(0, +)

        if weeklyTotal >= 1000 {
            return String(format: "$%.1fk", Double(weeklyTotal) / 1000.0)
        } else {
            return "$\(weeklyTotal)"
        }
    }

    private func getAverageRating() -> String {
        // Simulate realistic rating based on user's business performance
        let baseRating = 4.7
        let dayOfYear = Calendar.current.ordinality(of: .day, in: .year, for: Date()) ?? 1

        // Small variation to make it feel dynamic
        let variation = sin(Double(dayOfYear) * 0.1) * 0.2
        let currentRating = min(5.0, max(4.0, baseRating + variation))

        return String(format: "%.1f", currentRating)
    }

    // MARK: - Helper Methods

    private func updateTimeBasedContent() {
        let calendar = Calendar.current
        let now = Date()
        let hour = calendar.component(.hour, from: now)
        let weekday = calendar.component(.weekday, from: now)
        let month = calendar.component(.month, from: now)

        // Time-based greeting
        switch hour {
        case 5..<12:
            currentTimeGreeting = "Good Morning"
        case 12..<17:
            currentTimeGreeting = "Good Afternoon"
        case 17..<22:
            currentTimeGreeting = "Good Evening"
        default:
            currentTimeGreeting = "Good Night"
        }

        // Contextual personalized tips
        personalizedTip = generatePersonalizedTip(hour: hour, weekday: weekday, month: month)
    }

    private func generatePersonalizedTip(hour: Int, weekday: Int, month: Int) -> String {
        // Weekend vs weekday tips
        let isWeekend = weekday == 1 || weekday == 7 // Sunday = 1, Saturday = 7

        // Seasonal considerations
        let seasonalTips: [String] = {
            switch month {
            case 12, 1, 2: // Winter
                return [
                    "Winter skin needs extra hydration - book a moisturizing facial! ❄️",
                    "Combat dry winter air with a nourishing hair treatment 🌨️",
                    "Keep your hands soft with a winter manicure special 🧤"
                ]
            case 3, 4, 5: // Spring
                return [
                    "Spring refresh time! Try a new hair color for the season 🌸",
                    "Prep your skin for warmer weather with a deep cleanse 🌱",
                    "Fresh spring nails to match the blooming flowers 🌷"
                ]
            case 6, 7, 8: // Summer
                return [
                    "Protect your skin with a summer glow facial ☀️",
                    "Beat the heat with a cooling spa treatment 🏖️",
                    "Waterproof your look for summer adventures 🌊"
                ]
            case 9, 10, 11: // Fall
                return [
                    "Autumn transformation time - try rich, warm tones 🍂",
                    "Prep your skin for cooler weather ahead 🍁",
                    "Cozy up with a relaxing fall spa session 🎃"
                ]
            default:
                return ["Treat yourself to something special today! ✨"]
            }
        }()

        // Time and day specific tips
        if isWeekend {
            switch hour {
            case 8..<12:
                return "Weekend vibes! Perfect time for a relaxing spa morning 🧘‍♀️"
            case 12..<17:
                return "Make your weekend special with a beauty session 💅"
            case 17..<21:
                return "Saturday night glow-up? We've got you covered! ✨"
            default:
                return seasonalTips.randomElement() ?? "Enjoy your weekend! 🌟"
            }
        } else {
            switch hour {
            case 6..<9:
                return "Quick morning touch-up before work? Book a 30-min service! ⏰"
            case 9..<12:
                return "Mid-morning me-time? Perfect for a relaxing treatment 🌅"
            case 12..<14:
                return "Lunch break beauty boost? Express services available! 🥗"
            case 14..<17:
                return "Afternoon pick-me-up with a quick beauty refresh 💄"
            case 17..<19:
                return "After-work unwind with a soothing spa treatment 🌆"
            case 19..<22:
                return "Evening pampering session to end your day right 🌙"
            default:
                return "Plan tomorrow's beauty session while you rest 😴"
            }
        }
    }

    private func startHeroAnimations() {
        withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
            quickActionScale = 1.1
        }
    }

    private func getWeatherIcon() -> String {
        // In a real app, this would use weather data
        let icons = ["sun.max.fill", "cloud.sun.fill", "cloud.fill", "cloud.rain.fill"]
        return icons.randomElement() ?? "sun.max.fill"
    }

    private func getStoryTitle(_ index: Int) -> String {
        let currentMonth = Calendar.current.component(.month, from: Date())
        let seasonalTitles: [String]

        switch currentMonth {
        case 12, 1, 2: // Winter
            seasonalTitles = ["Winter Skin Care", "Holiday Glam", "Cozy Spa Treatments", "New Year Glow", "Winter Hair Care"]
        case 3, 4, 5: // Spring
            seasonalTitles = ["Spring Refresh", "Pastel Nails", "Fresh Cuts", "Allergy-Free Beauty", "Spring Detox"]
        case 6, 7, 8: // Summer
            seasonalTitles = ["Summer Glow", "Beach Waves", "Sun Protection", "Waterproof Makeup", "Cool Treatments"]
        case 9, 10, 11: // Fall
            seasonalTitles = ["Fall Transformation", "Warm Tones", "Hydrating Facials", "Autumn Colors", "Prep for Winter"]
        default:
            seasonalTitles = ["Beauty Trends", "Style Updates", "Wellness Tips", "Glow Up", "Self Care"]
        }

        return seasonalTitles[index % seasonalTitles.count]
    }

    private func getStorySubtitle(_ index: Int) -> String {
        let subtitles = [
            "Trending this week",
            "Expert techniques",
            "Before & after reveals",
            "Professional tips",
            "Client favorites"
        ]
        return subtitles[index % subtitles.count]
    }

    private func getRecommendedService(_ index: Int) -> String {
        // Use actual services from featured shops if available
        if !featuredShops.isEmpty {
            let shopServices = [
                "Signature Haircut",
                "Classic Manicure",
                "Deep Cleansing Facial",
                "Eyebrow Shaping",
                "Hair Color Touch-up",
                "Relaxing Massage"
            ]
            return shopServices[index % shopServices.count]
        }

        let defaultServices = ["Hair Cut & Style", "Manicure & Pedicure", "Facial Treatment", "Eyebrow Threading"]
        return defaultServices[index % defaultServices.count]
    }

    private func getRecommendedShop(_ index: Int) -> String {
        // Use actual shop names if available
        if !featuredShops.isEmpty {
            let availableShops = Array(featuredShops.prefix(4))
            return availableShops[index % availableShops.count].name
        }

        let defaultShops = ["Bella Beauty", "Glamour Studio", "Zen Spa", "Style House"]
        return defaultShops[index % defaultShops.count]
    }

    private func getRecommendedPrice(_ index: Int) -> String {
        // Generate realistic prices based on service type
        let servicePrices = [
            "$45-65",  // Haircut
            "$35-50",  // Manicure
            "$80-120", // Facial
            "$25-35"   // Eyebrow
        ]
        return servicePrices[index % servicePrices.count]
    }

    private func getTrendingServiceName(_ index: Int) -> String {
        let currentDate = Date()
        let dayOfYear = Calendar.current.ordinality(of: .day, in: .year, for: currentDate) ?? 1

        // Rotate trending services based on day of year for variety
        let allTrendingServices = [
            "Balayage Highlights",
            "Gel Manicure",
            "HydraFacial MD",
            "Lash Extensions",
            "Keratin Treatment",
            "Microblading",
            "Brazilian Blowout",
            "Acrylic Nails",
            "Chemical Peel",
            "Brow Lamination"
        ]

        let startIndex = (dayOfYear + index) % allTrendingServices.count
        return allTrendingServices[startIndex]
    }

    private func getTrendingShopName(_ index: Int) -> String {
        // Use real shop names if available, otherwise use realistic names
        if !nearbyShops.isEmpty {
            let availableShops = Array(nearbyShops.prefix(6))
            return availableShops[index % availableShops.count].name
        }

        let trendingShops = [
            "Luxe Beauty Lounge",
            "The Beauty Bar",
            "Glow Studio & Spa",
            "Elite Beauty Center",
            "Chic Hair Boutique",
            "Radiance Wellness"
        ]
        return trendingShops[index % trendingShops.count]
    }

    private func getTrendingPrice(_ index: Int) -> String {
        // More realistic pricing based on service complexity
        let servicePricing = [
            "$120-180", // Balayage
            "$55-75",   // Gel Manicure
            "$95-150",  // HydraFacial
            "$75-120",  // Lash Extensions
            "$150-250", // Keratin Treatment
            "$85-150"   // Microblading
        ]
        return servicePricing[index % servicePricing.count]
    }

    private func getTrendingBookingCount(_ index: Int) -> Int {
        // Generate realistic booking counts based on current time
        let hour = Calendar.current.component(.hour, from: Date())
        let baseCount = [24, 18, 31, 15, 42, 27][index % 6]

        // Adjust based on time of day (more bookings during business hours)
        let timeMultiplier: Double = {
            switch hour {
            case 9...12: return 1.2  // Morning rush
            case 13...17: return 1.5 // Afternoon peak
            case 18...20: return 1.3 // Evening appointments
            default: return 0.8     // Off hours
            }
        }()

        return Int(Double(baseCount) * timeMultiplier)
    }

    // MARK: - Quick Actions Helper Methods

    private func getUpcomingBookingsText() -> String {
        let count = getUpcomingBookingsCount()
        switch count {
        case 0:
            return "No upcoming"
        case 1:
            return "1 upcoming"
        default:
            return "\(count) upcoming"
        }
    }

    private func getUpcomingBookingsBadge() -> String? {
        let count = getUpcomingBookingsCount()
        return count > 0 ? "\(count)" : nil
    }

    private func getUpcomingBookingsCount() -> Int {
        // Simulate realistic upcoming bookings based on user activity
        if authService.isAuthenticated {
            let dayOfWeek = Calendar.current.component(.weekday, from: Date())
            // More bookings on weekdays, fewer on weekends
            switch dayOfWeek {
            case 1: return Int.random(in: 0...2) // Sunday
            case 2, 3: return Int.random(in: 1...3) // Mon, Tue
            case 4, 5, 6: return Int.random(in: 2...5) // Wed, Thu, Fri
            case 7: return Int.random(in: 1...3) // Saturday
            default: return 0
            }
        }
        return 0
    }

    private func getFavoritesCount() -> Int {
        // Simulate user favorites based on usage patterns
        if authService.isAuthenticated {
            return Int.random(in: 3...12)
        }
        return 0
    }

    private func getFavoritesText() -> String {
        let count = getFavoritesCount()
        switch count {
        case 0:
            return "No favorites"
        case 1:
            return "1 saved shop"
        default:
            return "\(count) saved"
        }
    }

    private func getFavoritesBadge() -> String? {
        let count = getFavoritesCount()
        return count > 5 ? "\(count)" : nil
    }
}

// MARK: - Quick Action Card
struct QuickActionCard: View {
    let icon: String
    let title: String
    let subtitle: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 24, weight: .medium))
                    .foregroundColor(color)
                
                VStack(spacing: 4) {
                    Text(title)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    Text(subtitle)
                        .font(.system(size: 12, weight: .regular))
                        .foregroundColor(LunaraColors.secondaryText)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .background(LunaraColors.cardBackground)
            .cornerRadius(16)
            .shadow(color: LunaraColors.cardShadow, radius: 4, x: 0, y: 2)
        }
    }
}

// MARK: - Shop Card (Horizontal)
struct ShopCard: View {
    let shop: Shop
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Shop Image
            AsyncImage(url: URL(string: shop.displayImage ?? "")) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .overlay(
                        Image(systemName: "photo")
                            .foregroundColor(LunaraColors.charcoalGray.opacity(0.3))
                    )
            }
            .frame(height: 140)
            .clipped()
            .cornerRadius(12)
            
            // Shop Info
            VStack(alignment: .leading, spacing: 8) {
                Text(shop.name)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                    .lineLimit(1)
                
                Text(shop.shortAddress)
                    .font(.system(size: 14, weight: .regular))
                    .foregroundColor(LunaraColors.secondaryText)
                    .lineLimit(1)
                
                HStack {
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.starFilled)
                        
                        Text(shop.formattedRating)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(LunaraColors.primaryText)
                    }
                    
                    Spacer()
                    
                    Text(shop.isOpen ? "Open" : "Closed")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(shop.isOpen ? LunaraColors.success : LunaraColors.error)
                }
            }
            .padding(.horizontal, 4)
        }
        .background(LunaraColors.cardBackground)
        .cornerRadius(16)
        .shadow(color: LunaraColors.cardShadow, radius: 4, x: 0, y: 2)
    }
}

// MARK: - Shop List Item (Vertical)
struct ShopListItem: View {
    let shop: Shop
    
    var body: some View {
        HStack(spacing: 12) {
            // Shop Image
            KFImage(getShopImageURL(shop))
                .downloader(ImageService.shared.downloader)
                .onFailure { error in
                    // Only log if it's not an expected empty source error
                    if case .imageSettingError(let reason) = error,
                       case .emptySource = reason {
                        // Expected behavior for shops without images - no need to log
                    } else {
                        print("❌ Shop list image loading failed: \(error) for shop: \(shop.name)")
                    }
                }
                .placeholder {
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .overlay(
                            Image(systemName: "photo")
                                .foregroundColor(LunaraColors.charcoalGray.opacity(0.3))
                        )
                }
                .resizable()
                .aspectRatio(contentMode: .fill)
            .frame(width: 80, height: 80)
            .clipped()
            .cornerRadius(12)
            
            // Shop Info
            VStack(alignment: .leading, spacing: 6) {
                Text(shop.name)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                    .lineLimit(1)
                
                Text(shop.shortAddress)
                    .font(.system(size: 14, weight: .regular))
                    .foregroundColor(LunaraColors.secondaryText)
                    .lineLimit(1)
                
                HStack {
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.starFilled)
                        
                        Text(shop.formattedRating)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(LunaraColors.primaryText)
                    }
                    
                    Spacer()
                    
                    Text(shop.isOpen ? "Open" : "Closed")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(shop.isOpen ? LunaraColors.success : LunaraColors.error)
                }
            }
            
            Spacer()
        }
        .padding(12)
        .background(LunaraColors.cardBackground)
        .cornerRadius(16)
        .shadow(color: LunaraColors.cardShadow, radius: 2, x: 0, y: 1)
    }

    private func getImageUrl(_ url: String) -> String {
        // Return empty string for nil/empty URLs to prevent invalid requests
        if url.isEmpty {
            return ""
        }
        if url.starts(with: "http") {
            return url
        }
        return "https://109.104.206.19:8443\(url)"
    }

    private func getShopImageURL(_ shop: Shop) -> URL? {
        // Use thumbnail first, then fall back to first gallery image (like React app)
        let imageUrl = shop.thumbnail ?? shop.gallery?.first
        guard let imageUrl = imageUrl, !imageUrl.isEmpty else { return nil }
        return URL(string: getImageUrl(imageUrl))
    }
}

// MARK: - Category Card
struct CategoryCard: View {
    let businessType: BusinessType
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 12) {
                Image(systemName: businessType.iconName)
                    .font(.system(size: 24, weight: .medium))
                    .foregroundColor(LunaraColors.warmGold)
                
                Text(businessType.displayName)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.primaryText)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .background(LunaraColors.cardBackground)
            .cornerRadius(16)
            .shadow(color: LunaraColors.cardShadow, radius: 2, x: 0, y: 1)
        }
    }
}

// MARK: - Skeleton Views
struct ShopCardSkeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Rectangle()
                .fill(LunaraColors.coolLightGray)
                .frame(height: 140)
                .cornerRadius(12)
            
            VStack(alignment: .leading, spacing: 8) {
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 16)
                    .cornerRadius(4)
                
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 14)
                    .cornerRadius(4)
                
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 14)
                    .cornerRadius(4)
            }
            .padding(.horizontal, 4)
        }
        .frame(width: 280)
        .background(LunaraColors.cardBackground)
        .cornerRadius(16)
        .shadow(color: LunaraColors.cardShadow, radius: 4, x: 0, y: 2)
    }
}

struct ShopListItemSkeleton: View {
    var body: some View {
        HStack(spacing: 12) {
            Rectangle()
                .fill(LunaraColors.coolLightGray)
                .frame(width: 80, height: 80)
                .cornerRadius(12)
            
            VStack(alignment: .leading, spacing: 6) {
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 16)
                    .cornerRadius(4)
                
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 14)
                    .cornerRadius(4)
                
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 14)
                    .cornerRadius(4)
            }
            
            Spacer()
        }
        .padding(12)
        .background(LunaraColors.cardBackground)
        .cornerRadius(16)
        .shadow(color: LunaraColors.cardShadow, radius: 2, x: 0, y: 1)
    }
}

// MARK: - Preview
struct HomeView_Previews: PreviewProvider {
    static var previews: some View {
        HomeView()
            .environmentObject(AuthenticationService.shared)
    }
}
