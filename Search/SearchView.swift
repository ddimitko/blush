//
//  SearchView.swift
//  LunaraApp
//
//  Created by Lunara Team on 14/07/2025.
//

import SwiftUI
import Combine
import CoreLocation
import Kingfisher

/// Search view for finding shops and services with comprehensive filtering
struct SearchView: View {
    // MARK: - Environment Objects
    @EnvironmentObject var authService: AuthenticationService
    @EnvironmentObject var appState: AppState
    @StateObject private var locationService = LocationService.shared

    // MARK: - State
    @State private var searchText = ""
    @State private var shops: [Shop] = []
    @State private var filteredShops: [Shop] = []
    @State private var isLoading = false
    @State private var isSearching = false
    @State private var selectedBusinessTypes: Set<BusinessType> = []
    @State private var selectedSortOption: SortOption = .relevance
    @State private var showingFilters = false
    @ObservedObject private var taskManager = SmartTaskManager()

    // MARK: - Enhanced Filter State
    @State private var cityFilter = ""
    @State private var useLocation = false
    @State private var distanceRadius: Double = 25.0 // km
    @State private var minimumRating: Double = 0.0
    @State private var requiresCardPayment: Bool? = nil
    @State private var recentSearches: [String] = []
    @State private var showingLocationPermissionAlert = false

    // MARK: - Animation State
    @State private var searchBarFocused = false
    @State private var resultsAppeared = false
    @State private var filterPillsVisible = false
    @State private var quickFiltersVisible = false
    @State private var cardAnimationOffset: CGFloat = 50
    @State private var cardAnimationOpacity: Double = 0

    // MARK: - Search Configuration
    private let searchDebounceTime: TimeInterval = 0.8
    private let animationDuration: Double = 0.3
    private let springAnimation = Animation.spring(response: 0.6, dampingFraction: 0.8)

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Search Header
                searchHeaderSection
                    .animation(springAnimation, value: searchBarFocused)

                // Filter Pills with smooth transition
                if hasActiveFilters {
                    filterPillsSection
                        .opacity(filterPillsVisible ? 1 : 0)
                        .offset(y: filterPillsVisible ? 0 : -20)
                        .animation(springAnimation.delay(0.1), value: filterPillsVisible)
                }

                // Content with smooth transitions
                ZStack {
                    if isLoading {
                        loadingSection
                            .transition(.asymmetric(
                                insertion: .opacity.combined(with: .scale(scale: 0.9)),
                                removal: .opacity.combined(with: .scale(scale: 1.1))
                            ))
                    } else if searchText.isEmpty && !hasActiveFilters && shops.isEmpty {
                        initialPromptSection
                            .transition(.asymmetric(
                                insertion: .opacity.combined(with: .move(edge: .bottom)),
                                removal: .opacity.combined(with: .move(edge: .top))
                            ))
                    } else if filteredShops.isEmpty && (!searchText.isEmpty || hasActiveFilters) {
                        noResultsSection
                            .transition(.asymmetric(
                                insertion: .opacity.combined(with: .scale(scale: 0.9)),
                                removal: .opacity.combined(with: .scale(scale: 1.1))
                            ))
                    } else if !shops.isEmpty {
                        shopListSection
                            .opacity(resultsAppeared ? 1 : 0)
                            .offset(y: resultsAppeared ? 0 : 30)
                            .transition(.asymmetric(
                                insertion: .opacity.combined(with: .move(edge: .bottom)),
                                removal: .opacity.combined(with: .move(edge: .top))
                            ))
                    }
                }
                .animation(springAnimation, value: isLoading)
                .animation(springAnimation, value: searchText.isEmpty)
                .animation(springAnimation, value: hasActiveFilters)
                .animation(springAnimation, value: shops.isEmpty)
            }
        }
        .onAppear {
            startInitialAnimations()
        }
        .onDisappear {
            // Cancel search tasks as they're not critical
            taskManager.cancelTask(key: "search_query", reason: "View disappeared")
            resetAnimations()
        }
        .sheet(isPresented: $showingFilters) {
            SearchFiltersView(
                selectedBusinessTypes: $selectedBusinessTypes,
                selectedSortOption: $selectedSortOption,
                cityFilter: $cityFilter,
                useLocation: $useLocation,
                distanceRadius: $distanceRadius,
                minimumRating: $minimumRating,
                requiresCardPayment: $requiresCardPayment
            )
        }
        .onChange(of: searchText) { _, newValue in
            performSearch(query: newValue)

            // Update quick filters visibility
            withAnimation(springAnimation) {
                quickFiltersVisible = newValue.isEmpty && !hasActiveFilters
            }

            // Reset search bar focus when clearing
            if newValue.isEmpty {
                withAnimation(springAnimation.delay(0.1)) {
                    searchBarFocused = false
                }
            }
        }
        .onChange(of: selectedBusinessTypes) { _, _ in
            handleFilterChange()
        }
        .onChange(of: selectedSortOption) { _, _ in
            handleFilterChange()
        }
        .onChange(of: cityFilter) { _, _ in
            handleFilterChange()
        }
        .onChange(of: useLocation) { _, newValue in
            if newValue {
                requestLocationPermission()
            }
            handleFilterChange()
        }
        .onChange(of: distanceRadius) { _, _ in
            handleFilterChange()
        }
        .onChange(of: minimumRating) { _, _ in
            handleFilterChange()
        }
        .onChange(of: requiresCardPayment) { _, _ in
            handleFilterChange()
        }
        .onChange(of: hasActiveFilters) { _, newValue in
            withAnimation(springAnimation.delay(0.1)) {
                filterPillsVisible = newValue
            }
        }
        .alert("Location Permission Required", isPresented: $showingLocationPermissionAlert) {
            Button("Settings") {
                if let settingsUrl = URL(string: UIApplication.openSettingsURLString) {
                    UIApplication.shared.open(settingsUrl)
                }
            }
            Button("Cancel", role: .cancel) {
                useLocation = false
            }
        } message: {
            Text("Please enable location access in Settings to use location-based search.")
        }
    }

    // MARK: - Search Header Section
    private var searchHeaderSection: some View {
        VStack(spacing: 16) {
            // Search Bar with Filter Button
            HStack(spacing: 12) {
                // Search Bar with enhanced animations
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(searchBarFocused ? LunaraColors.warmGold : LunaraColors.secondaryText)
                        .scaleEffect(searchBarFocused ? 1.1 : 1.0)
                        .animation(springAnimation, value: searchBarFocused)

                    TextField("Search shops, services, or locations...", text: $searchText)
                        .textFieldStyle(PlainTextFieldStyle())
                        .font(.system(size: 16))
                        .onTapGesture {
                            withAnimation(springAnimation) {
                                searchBarFocused = true
                            }
                        }

                    if !searchText.isEmpty {
                        Button(action: {
                            withAnimation(springAnimation) {
                                searchText = ""
                                searchBarFocused = false
                            }
                        }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(LunaraColors.secondaryText)
                                .scaleEffect(1.0)
                                .animation(.easeInOut(duration: 0.2), value: searchText.isEmpty)
                        }
                        .transition(.scale.combined(with: .opacity))
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, searchBarFocused ? 14 : 12)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(LunaraColors.coolLightGray.opacity(searchBarFocused ? 0.8 : 0.5))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(searchBarFocused ? LunaraColors.warmGold.opacity(0.5) : Color.clear, lineWidth: 2)
                        )
                )
                .scaleEffect(searchBarFocused ? 1.02 : 1.0)
                .animation(springAnimation, value: searchBarFocused)

                // Filter Button with enhanced animations
                Button(action: {
                    withAnimation(.spring(response: 0.4, dampingFraction: 0.6)) {
                        showingFilters = true
                    }
                }) {
                    ZStack {
                        Image(systemName: "slider.horizontal.3")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(hasActiveFilters ? LunaraColors.white : LunaraColors.warmGold)
                            .scaleEffect(hasActiveFilters ? 1.1 : 1.0)
                            .animation(springAnimation, value: hasActiveFilters)

                        // Active filter indicator with pulse animation
                        if hasActiveFilters {
                            Circle()
                                .fill(LunaraColors.error)
                                .frame(width: 8, height: 8)
                                .offset(x: 8, y: -8)
                                .scaleEffect(1.0)
                                .animation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true), value: hasActiveFilters)
                                .transition(.scale.combined(with: .opacity))
                        }
                    }
                    .frame(width: 44, height: 44)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(hasActiveFilters ? LunaraColors.warmGold : LunaraColors.warmGold.opacity(0.1))
                            .scaleEffect(hasActiveFilters ? 1.05 : 1.0)
                    )
                    .animation(springAnimation, value: hasActiveFilters)
                }
                .scaleEffect(1.0)
                .onTapGesture {
                    // Add haptic feedback
                    let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
                    impactFeedback.impactOccurred()
                }
            }
            .padding(.horizontal, 16)

            // Quick Filter Buttons with smooth transition
            if !hasActiveFilters && searchText.isEmpty {
                quickFilterButtons
                    .opacity(quickFiltersVisible ? 1 : 0)
                    .offset(y: quickFiltersVisible ? 0 : 20)
                    .animation(springAnimation.delay(0.3), value: quickFiltersVisible)
                    .transition(.asymmetric(
                        insertion: .opacity.combined(with: .move(edge: .bottom)),
                        removal: .opacity.combined(with: .move(edge: .top))
                    ))
            }

            // Search Status
            if isSearching {
                HStack {
                    ProgressView()
                        .scaleEffect(0.8)
                    Text("Searching...")
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                }
            }
        }
        .padding(.top, 8)
        .padding(.bottom, 16)
    }

    // MARK: - Quick Filter Buttons
    private var quickFilterButtons: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Quick Filters")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)

                Spacer()
            }
            .padding(.horizontal, 16)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    // Popular business types with staggered animation
                    ForEach(Array([BusinessType.hairdresser, .beautySalon, .spa, .massage].enumerated()), id: \.offset) { index, businessType in
                        QuickFilterButton(
                            title: businessType.displayName,
                            icon: businessType.iconName
                        ) {
                            selectedBusinessTypes.insert(businessType)
                            handleFilterChange()
                        }
                        .opacity(quickFiltersVisible ? 1 : 0)
                        .offset(y: quickFiltersVisible ? 0 : 30)
                        .animation(springAnimation.delay(Double(index) * 0.1), value: quickFiltersVisible)
                    }

                    // Location quick filter
                    QuickFilterButton(
                        title: "Near me",
                        icon: "location.fill"
                    ) {
                        useLocation = true
                        requestLocationPermission()
                    }
                    .opacity(quickFiltersVisible ? 1 : 0)
                    .offset(y: quickFiltersVisible ? 0 : 30)
                    .animation(springAnimation.delay(0.4), value: quickFiltersVisible)

                    // High rated quick filter
                    QuickFilterButton(
                        title: "4+ stars",
                        icon: "star.fill"
                    ) {
                        minimumRating = 4.0
                        handleFilterChange()
                    }
                    .opacity(quickFiltersVisible ? 1 : 0)
                    .offset(y: quickFiltersVisible ? 0 : 30)
                    .animation(springAnimation.delay(0.5), value: quickFiltersVisible)
                }
                .padding(.horizontal, 16)
            }
        }
    }

    // MARK: - Filter Pills Section
    private var filterPillsSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                // Business Type Pills
                ForEach(Array(selectedBusinessTypes), id: \.self) { businessType in
                    FilterPill(
                        text: businessType.displayName,
                        icon: businessType.iconName
                    ) {
                        selectedBusinessTypes.remove(businessType)
                    }
                }

                // Location Pills
                if !cityFilter.isEmpty {
                    FilterPill(
                        text: cityFilter,
                        icon: "location"
                    ) {
                        cityFilter = ""
                    }
                }

                if useLocation {
                    FilterPill(
                        text: "Near me (\(Int(distanceRadius))km)",
                        icon: "location.fill"
                    ) {
                        useLocation = false
                    }
                }

                // Rating Filter Pill
                if minimumRating > 0 {
                    FilterPill(
                        text: String(format: "%.1f+ stars", minimumRating),
                        icon: "star.fill"
                    ) {
                        minimumRating = 0.0
                    }
                }

                // Card Payment Pill
                if let cardPayment = requiresCardPayment {
                    FilterPill(
                        text: cardPayment ? "Card payments" : "Cash only",
                        icon: cardPayment ? "creditcard" : "banknote"
                    ) {
                        requiresCardPayment = nil
                    }
                }

                // Sort Option Pill
                if selectedSortOption != .relevance {
                    FilterPill(
                        text: selectedSortOption.displayName,
                        icon: "arrow.up.arrow.down"
                    ) {
                        selectedSortOption = .relevance
                    }
                }
            }
            .padding(.horizontal, 16)
        }
        .padding(.bottom, 16)
    }

    // MARK: - Loading Section with Skeleton Cards
    private var loadingSection: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Loading header
                VStack(spacing: 12) {
                    HStack {
                        ProgressView()
                            .scaleEffect(0.8)

                        Text("Finding the best shops for you...")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(LunaraColors.secondaryText)

                        Spacer()
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 16)
                }

                // Skeleton cards grid
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 16), count: 2), spacing: 16) {
                    ForEach(0..<6, id: \.self) { index in
                        SkeletonShopCard()
                            .opacity(0.6)
                            .animation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true).delay(Double(index) * 0.2), value: isLoading)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 32)
            }
        }
    }

    // MARK: - Initial Prompt Section
    private var initialPromptSection: some View {
        VStack(spacing: 32) {
            Spacer()

            // Main illustration
            VStack(spacing: 16) {
                Image(systemName: "sparkles")
                    .font(.system(size: 72, weight: .light))
                    .foregroundColor(LunaraColors.warmGold)
                    .symbolEffect(.pulse.byLayer, options: .repeating)

                VStack(spacing: 12) {
                    Text("Discover Beauty Near You")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)

                    Text("Start by searching for shops, services, or use filters to find your perfect beauty experience.")
                        .font(.system(size: 16))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                }
            }

            // Action prompts
            VStack(spacing: 20) {
                // Search prompt
                HStack(spacing: 12) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 20))
                        .foregroundColor(LunaraColors.warmGold)

                    Text("Search for shops or services")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)

                    Spacer()
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 16)
                .background(LunaraColors.warmGold.opacity(0.1))
                .cornerRadius(12)
                .onTapGesture {
                    withAnimation(springAnimation) {
                        searchBarFocused = true
                    }
                }

                // Filter prompt
                HStack(spacing: 12) {
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 20))
                        .foregroundColor(LunaraColors.warmGold)

                    Text("Use filters to browse by category")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)

                    Spacer()
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 16)
                .background(LunaraColors.warmGold.opacity(0.1))
                .cornerRadius(12)
                .onTapGesture {
                    withAnimation(springAnimation) {
                        showingFilters = true
                    }
                }
            }
            .padding(.horizontal, 24)

            Spacer()
        }
    }

    // MARK: - No Results Section
    private var noResultsSection: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "exclamationmark.magnifyingglass")
                .font(.system(size: 64))
                .foregroundColor(LunaraColors.secondaryText.opacity(0.6))

            VStack(spacing: 12) {
                Text("No Results Found")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)

                Text("We couldn't find any shops matching '\(searchText)'. Try adjusting your search or filters.")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }

            Button(action: {
                searchText = ""
                selectedBusinessTypes.removeAll()
                selectedSortOption = .relevance
            }) {
                Text("Clear Search")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.warmGold)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(LunaraColors.warmGold.opacity(0.1))
                    .cornerRadius(8)
            }

            Spacer()
        }
    }

    // MARK: - Shop List Section
    private var shopListSection: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                // Results header
                HStack {
                    Text("\(filteredShops.count) shop\(filteredShops.count == 1 ? "" : "s") found")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)

                    Spacer()

                    if hasActiveFilters {
                        Button("Clear filters") {
                            clearAllFilters()
                            applyFilters()
                        }
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.warmGold)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 16)

                // Shop grid with staggered animations
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 16), count: 2), spacing: 16) {
                    ForEach(Array(filteredShops.enumerated()), id: \.offset) { index, shop in
                        SearchShopCard(shop: shop)
                            .opacity(cardAnimationOpacity)
                            .offset(y: cardAnimationOffset)
                            .animation(springAnimation.delay(Double(index) * 0.1), value: cardAnimationOpacity)
                            .animation(springAnimation.delay(Double(index) * 0.1), value: cardAnimationOffset)
                            .onTapGesture {
                                withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                                    appState.navigate(to: .shopDetails(shop.id))
                                }
                                // Add haptic feedback
                                let impactFeedback = UIImpactFeedbackGenerator(style: .light)
                                impactFeedback.impactOccurred()
                            }
                            .scaleEffect(1.0)
                            .onAppear {
                                // Trigger card animation when it appears
                                if cardAnimationOpacity == 0 {
                                    DispatchQueue.main.asyncAfter(deadline: .now() + Double(index) * 0.05) {
                                        withAnimation(springAnimation.delay(Double(index) * 0.05)) {
                                            cardAnimationOpacity = 1.0
                                            cardAnimationOffset = 0
                                        }
                                    }
                                }
                            }
                    }
                }
                .padding(.horizontal, 16)

                // Load more indicator
                if filteredShops.count >= 20 {
                    Button(action: {
                        // TODO: Implement pagination
                    }) {
                        HStack {
                            Text("Load More")
                                .font(.system(size: 16, weight: .medium))
                            Image(systemName: "arrow.down")
                        }
                        .foregroundColor(LunaraColors.warmGold)
                        .padding(.vertical, 24)
                    }
                }
            }
            .padding(.bottom, 32)
        }
    }

    // MARK: - Methods


    private func performSearch(query: String) {
        // If query is empty, just apply filters to existing shops
        if query.isEmpty {
            withAnimation(springAnimation) {
                applyFiltersWithAnimation()
            }
            return
        }

        // Load shops if we don't have any yet, or search with the query
        if shops.isEmpty {
            loadShopsWithSearch(query: query)
        } else {
            searchExistingShops(query: query)
        }
    }

    private func loadShopsWithSearch(query: String) {
        // Use smart task manager for search with automatic debouncing
        Task {
            do {
                // Wait for debounce period
                try await Task.sleep(nanoseconds: UInt64(searchDebounceTime * 1_000_000_000))

                try await taskManager.startSearchTask(key: "search_query") {
                    await MainActor.run {
                        withAnimation(springAnimation) {
                            self.isSearching = true
                        }
                    }

                    do {
                        let response = try await APIClient.shared.getShops(page: 0, size: 50, search: query)

                        await MainActor.run {
                            self.shops = response.content
                            withAnimation(springAnimation) {
                                self.applyFiltersWithAnimation()
                                self.isSearching = false
                            }
                        }
                    } catch {
                        await MainActor.run {
                            // Try to load all shops as fallback
                            self.loadAllShops()
                        }
                        throw error
                    }
                }
            } catch {
                if !RefreshErrorHandler.shouldIgnoreError(error) {
                    await MainActor.run {
                        withAnimation(springAnimation) {
                            self.isSearching = false
                        }
                    }
                    print("🔍 Search error: \(error.localizedDescription)")
                }
            }
        }
    }

    private func searchExistingShops(query: String) {
        // Search within existing shops locally for better performance
        withAnimation(springAnimation) {
            applyFiltersWithAnimation()
        }
    }

    private func applyFilters() {
        var filtered = shops

        // Apply business type filter
        if !selectedBusinessTypes.isEmpty {
            filtered = filtered.filter { shop in
                !Set(shop.businessTypes).isDisjoint(with: selectedBusinessTypes)
            }
        }

        // Apply city filter
        if !cityFilter.isEmpty {
            filtered = filtered.filter { shop in
                shop.city.localizedCaseInsensitiveContains(cityFilter) ||
                shop.state.localizedCaseInsensitiveContains(cityFilter) ||
                shop.fullAddress.localizedCaseInsensitiveContains(cityFilter)
            }
        }

        // Apply location-based filter
        if useLocation, let userLocation = locationService.currentLocation {
            filtered = filtered.filter { shop in
                guard let shopLat = shop.latitude, let shopLng = shop.longitude else { return false }
                let shopLocation = CLLocation(latitude: shopLat, longitude: shopLng)
                let distance = userLocation.distance(from: shopLocation) / 1000 // Convert to km
                return distance <= distanceRadius
            }
        }

        // Apply minimum rating filter
        if minimumRating > 0 {
            filtered = filtered.filter { shop in
                shop.ratingAverage >= minimumRating
            }
        }

        // Apply card payment filter
        if let cardPayment = requiresCardPayment {
            filtered = filtered.filter { shop in
                shop.acceptsCardPayments == cardPayment
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
        filtered = sortShops(filtered, by: selectedSortOption)

        filteredShops = filtered
    }

    private func sortShops(_ shops: [Shop], by option: SortOption) -> [Shop] {
        switch option {
        case .relevance:
            return shops // Keep original order (API relevance)
        case .rating:
            return shops.sorted { $0.ratingAverage > $1.ratingAverage }
        case .distance:
            guard let userLocation = locationService.currentLocation else { return shops }
            return shops.sorted { shop1, shop2 in
                let distance1 = distanceToShop(shop1, from: userLocation)
                let distance2 = distanceToShop(shop2, from: userLocation)
                return distance1 < distance2
            }
        case .name:
            return shops.sorted { $0.name < $1.name }
        case .newest:
            return shops.sorted { $0.createdAt > $1.createdAt }
        }
    }

    private func distanceToShop(_ shop: Shop, from userLocation: CLLocation) -> Double {
        guard let shopLat = shop.latitude, let shopLng = shop.longitude else { return Double.infinity }
        let shopLocation = CLLocation(latitude: shopLat, longitude: shopLng)
        return userLocation.distance(from: shopLocation)
    }

    // MARK: - Helper Methods

    private var hasActiveFilters: Bool {
        return !selectedBusinessTypes.isEmpty ||
               selectedSortOption != .relevance ||
               !cityFilter.isEmpty ||
               useLocation ||
               minimumRating > 0 ||
               requiresCardPayment != nil
    }

    private func requestLocationPermission() {
        switch locationService.authorizationStatus {
        case .notDetermined:
            locationService.requestLocationPermission()
        case .denied, .restricted:
            showingLocationPermissionAlert = true
        case .authorizedWhenInUse, .authorizedAlways:
            locationService.startLocationUpdates()
        @unknown default:
            break
        }
    }

    private func clearAllFilters() {
        selectedBusinessTypes.removeAll()
        selectedSortOption = .relevance
        cityFilter = ""
        useLocation = false
        distanceRadius = 25.0
        minimumRating = 0.0
        requiresCardPayment = nil
    }

    // MARK: - Helper Methods

    private func handleFilterChange() {
        // Debounce filter changes to prevent excessive re-rendering
        Task {
            try? await Task.sleep(nanoseconds: 100_000_000) // 0.1 second debounce

            await MainActor.run {
                // Load shops if we don't have any and filters are applied
                if shops.isEmpty && hasActiveFilters {
                    loadAllShops()
                } else {
                    withAnimation(springAnimation) {
                        applyFiltersWithAnimation()
                    }
                }
            }
        }
    }

    private func loadAllShops() {
        guard !isLoading else { return }

        isLoading = true

        Task {
            do {
                let response = try await APIClient.shared.getShops(page: 0, size: 50)
                await MainActor.run {
                    shops = response.content
                    withAnimation(springAnimation) {
                        applyFiltersWithAnimation()
                        isLoading = false
                    }
                }
            } catch {
                await MainActor.run {
                    // Use cached data as fallback
                    if let cachedData = ShopCacheService.shared.getCachedShopList() {
                        shops = cachedData.shops
                        withAnimation(springAnimation) {
                            applyFiltersWithAnimation()
                        }
                    }
                    isLoading = false
                }
            }
        }
    }

    // MARK: - Animation Methods

    private func startInitialAnimations() {
        // Quick filters animation
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            withAnimation(springAnimation.delay(0.2)) {
                quickFiltersVisible = true
            }
        }

        // Filter pills animation
        if hasActiveFilters {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                withAnimation(springAnimation) {
                    filterPillsVisible = true
                }
            }
        }
    }

    private func resetAnimations() {
        quickFiltersVisible = false
        filterPillsVisible = false
        resultsAppeared = false
        cardAnimationOpacity = 0
        cardAnimationOffset = 50
        searchBarFocused = false
    }

    private func applyFiltersWithAnimation() {
        // Prevent infinite loops by checking if we're already animating
        guard !isSearching else { return }

        // Reset card animations for new results
        cardAnimationOpacity = 0
        cardAnimationOffset = 50
        resultsAppeared = false

        // Apply filters
        applyFilters()

        // Trigger results animation only if we have results
        if !filteredShops.isEmpty {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                withAnimation(springAnimation.delay(0.1)) {
                    resultsAppeared = true
                }

                // Trigger card animations
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                    withAnimation(springAnimation) {
                        cardAnimationOpacity = 1.0
                        cardAnimationOffset = 0
                    }
                }
            }
        }
    }

    // Removed cancelSearchTask - now handled by SmartTaskManager
}

// MARK: - Sort Option Enum
enum SortOption: String, CaseIterable {
    case relevance = "relevance"
    case rating = "rating"
    case distance = "distance"
    case name = "name"
    case newest = "newest"

    var displayName: String {
        switch self {
        case .relevance:
            return "Relevance"
        case .rating:
            return "Rating"
        case .distance:
            return "Distance"
        case .name:
            return "Name"
        case .newest:
            return "Newest"
        }
    }

    var iconName: String {
        switch self {
        case .relevance:
            return "star"
        case .rating:
            return "star.fill"
        case .distance:
            return "location"
        case .name:
            return "textformat.abc"
        case .newest:
            return "clock"
        }
    }
}

// MARK: - Filter Pill Component
struct FilterPill: View {
    let text: String
    let icon: String
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 12, weight: .medium))

            Text(text)
                .font(.system(size: 12, weight: .medium))

            Button(action: onRemove) {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .medium))
            }
        }
        .foregroundColor(LunaraColors.warmGold)
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(LunaraColors.warmGold.opacity(0.1))
        .cornerRadius(16)
    }
}

// MARK: - Quick Category Button
struct QuickCategoryButton: View {
    let businessType: BusinessType
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: businessType.iconName)
                    .font(.system(size: 16, weight: .medium))

                Text(businessType.displayName)
                    .font(.system(size: 14, weight: .medium))
                    .lineLimit(1)
            }
            .foregroundColor(LunaraColors.warmGold)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(LunaraColors.warmGold.opacity(0.1))
            .cornerRadius(8)
        }
    }
}

// MARK: - Search Shop Card
struct SearchShopCard: View {
    let shop: Shop
    @StateObject private var locationService = LocationService.shared
    @State private var isPressed = false

    var body: some View {
        VStack(spacing: 0) {
            // Shop Image with badges
            ZStack(alignment: .topTrailing) {
                KFImage(getShopImageURL(shop))
                    .downloader(ImageService.shared.downloader)
                    .onFailure { error in
                        // Only log if it's not an expected empty source error
                        if case .imageSettingError(let reason) = error,
                           case .emptySource = reason {
                            // Expected behavior for shops without images - no need to log
                        } else {
                            print("❌ Search shop image loading failed: \(error) for shop: \(shop.name)")
                        }
                    }
                    .placeholder {
                        Rectangle()
                            .fill(LunaraColors.coolLightGray)
                            .overlay(
                                Image(systemName: "photo")
                                    .font(.system(size: 24))
                                    .foregroundColor(LunaraColors.charcoalGray.opacity(0.3))
                            )
                    }
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                .frame(height: 140)
                .clipped()

                // Badges overlay
                VStack(alignment: .trailing, spacing: 8) {
                    // Rating badge
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 10))
                            .foregroundColor(LunaraColors.starFilled)

                        Text(shop.formattedRating)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(LunaraColors.primaryText)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(LunaraColors.white.opacity(0.95))
                    .cornerRadius(12)
                    .shadow(color: LunaraColors.cardShadow, radius: 2, x: 0, y: 1)

                    // Card payment badge
                    if shop.acceptsCardPayments {
                        HStack(spacing: 4) {
                            Image(systemName: "creditcard")
                                .font(.system(size: 10))
                                .foregroundColor(LunaraColors.success)

                            Text("Card")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(LunaraColors.success)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(LunaraColors.success.opacity(0.1))
                        .cornerRadius(12)
                    }
                }
                .padding(12)
            }

            // Shop Info
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(shop.name)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)
                        .lineLimit(1)

                    Spacer()

                    // Open/Closed status
                    HStack(spacing: 4) {
                        Circle()
                            .fill(shop.isOpen ? LunaraColors.success : LunaraColors.error)
                            .frame(width: 6, height: 6)

                        Text(shop.isOpen ? "Open" : "Closed")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(shop.isOpen ? LunaraColors.success : LunaraColors.error)
                    }
                }

                // Address and distance
                HStack {
                    Text(shop.shortAddress)
                        .font(.system(size: 13))
                        .foregroundColor(LunaraColors.secondaryText)
                        .lineLimit(1)

                    Spacer()

                    // Distance (if location available)
                    if let distance = distanceText {
                        Text(distance)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(LunaraColors.warmGold)
                    }
                }

                // Business Types
                if !shop.businessTypes.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(shop.businessTypes.prefix(3), id: \.self) { businessType in
                                Text(businessType.displayName)
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundColor(LunaraColors.warmGold)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(LunaraColors.warmGold.opacity(0.1))
                                    .cornerRadius(8)
                            }
                        }
                        .padding(.horizontal, 1) // Prevent clipping
                    }
                }
            }
            .padding(16)
        }
        .background(LunaraColors.cardBackground)
        .cornerRadius(16)
        .shadow(color: LunaraColors.cardShadow, radius: isPressed ? 8 : 4, x: 0, y: isPressed ? 4 : 2)
        .scaleEffect(isPressed ? 0.98 : 1.0)
        .animation(.easeInOut(duration: 0.1), value: isPressed)
        .onLongPressGesture(minimumDuration: 0, maximumDistance: .infinity, pressing: { pressing in
            withAnimation(.easeInOut(duration: 0.1)) {
                isPressed = pressing
            }
        }, perform: {})
    }

    private var distanceText: String? {
        guard let userLocation = locationService.currentLocation,
              let shopLat = shop.latitude,
              let shopLng = shop.longitude else { return nil }

        let shopLocation = CLLocation(latitude: shopLat, longitude: shopLng)
        let distance = userLocation.distance(from: shopLocation) / 1000 // Convert to km

        if distance < 1 {
            return String(format: "%.0fm", distance * 1000)
        } else {
            return String(format: "%.1fkm", distance)
        }
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

// MARK: - Quick Filter Button
struct QuickFilterButton: View {
    let title: String
    let icon: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.warmGold)

                Text(title)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.primaryText)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(LunaraColors.warmGold.opacity(0.1))
            .cornerRadius(20)
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(LunaraColors.warmGold.opacity(0.3), lineWidth: 1)
            )
        }
        .scaleEffect(1.0)
        .animation(.easeInOut(duration: 0.1), value: false)
    }
}

// MARK: - Skeleton Shop Card
struct SkeletonShopCard: View {
    @State private var isAnimating = false

    var body: some View {
        VStack(spacing: 0) {
            // Skeleton image
            Rectangle()
                .fill(LunaraColors.coolLightGray.opacity(0.3))
                .frame(height: 140)
                .overlay(
                    Rectangle()
                        .fill(
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    Color.clear,
                                    LunaraColors.white.opacity(0.4),
                                    Color.clear
                                ]),
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .offset(x: isAnimating ? 200 : -200)
                        .animation(.linear(duration: 1.5).repeatForever(autoreverses: false), value: isAnimating)
                )
                .clipped()

            // Skeleton content
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Rectangle()
                        .fill(LunaraColors.coolLightGray.opacity(0.3))
                        .frame(height: 16)
                        .frame(maxWidth: .infinity)

                    Rectangle()
                        .fill(LunaraColors.coolLightGray.opacity(0.3))
                        .frame(width: 40, height: 12)
                }

                Rectangle()
                    .fill(LunaraColors.coolLightGray.opacity(0.3))
                    .frame(height: 12)
                    .frame(maxWidth: .infinity)

                HStack(spacing: 6) {
                    Rectangle()
                        .fill(LunaraColors.coolLightGray.opacity(0.3))
                        .frame(width: 60, height: 20)
                        .cornerRadius(8)

                    Rectangle()
                        .fill(LunaraColors.coolLightGray.opacity(0.3))
                        .frame(width: 40, height: 20)
                        .cornerRadius(8)

                    Spacer()
                }
            }
            .padding(16)
        }
        .background(LunaraColors.cardBackground)
        .cornerRadius(16)
        .shadow(color: LunaraColors.cardShadow, radius: 4, x: 0, y: 2)
        .onAppear {
            isAnimating = true
        }
    }
}

// MARK: - Preview
struct SearchView_Previews: PreviewProvider {
    static var previews: some View {
        SearchView()
            .environmentObject(AuthenticationService.shared)
            .environmentObject(AppState.shared)
    }
}
