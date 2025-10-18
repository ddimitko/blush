//
//  ContentView.swift
//  LunaraApp
//
//  Created by Lunara Team on 14/07/2025.
//

import SwiftUI

struct ContentView: View {
    // MARK: - Environment Objects
    @EnvironmentObject var authenticationService: AuthenticationService
    @EnvironmentObject var networkMonitor: NetworkMonitor
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var shopService: ShopService

    // MARK: - State
    @State private var showingSplashScreen = true

    var body: some View {
        ZStack {
            // Main app content
            if showingSplashScreen {
                SplashScreenView()
                    .transition(.opacity)
            } else {
                mainContent
                    .transition(.opacity)
            }

            // Network status overlay
            if !networkMonitor.isConnected {
                NetworkStatusView()
                    .transition(.move(edge: .top))
            }
        }
        .onAppear {
            // Hide splash screen after authentication check completes or minimum time
            let minimumSplashTime: TimeInterval = 2.0
            let startTime = Date()

            Task {
                // Wait for authentication check to complete
                while authenticationService.isLoading {
                    try? await Task.sleep(nanoseconds: 100_000_000) // 0.1 seconds
                }

                // Ensure minimum splash screen time
                let elapsedTime = Date().timeIntervalSince(startTime)
                let remainingTime = max(0, minimumSplashTime - elapsedTime)

                if remainingTime > 0 {
                    try? await Task.sleep(nanoseconds: UInt64(remainingTime * 1_000_000_000))
                }

                // Hide splash screen
                await MainActor.run {
                    withAnimation(.easeInOut(duration: 0.5)) {
                        showingSplashScreen = false
                        appState.hideSplashScreen()
                    }
                }
            }
        }
    }

    // MARK: - Main Content
    @ViewBuilder
    private var mainContent: some View {
        if authenticationService.isLoading {
            // Show loading view during authentication check
            authenticationLoadingView
        } else if authenticationService.hasAppAccess {
            MainTabView()
        } else {
            AuthenticationFlowView()
        }
    }

    // MARK: - Authentication Loading View
    @ViewBuilder
    private var authenticationLoadingView: some View {
        ZStack {
            // Background
            LunaraColors.white
                .ignoresSafeArea()

            VStack(spacing: 32) {
                // Logo
                VStack(spacing: 16) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 60, weight: .light))
                        .foregroundColor(LunaraColors.warmGold)

                    Text("Lunara")
                        .font(.system(size: 32, weight: .light, design: .serif))
                        .foregroundColor(LunaraColors.charcoalGray)
                }

                // Loading content
                VStack(spacing: 16) {
                    // Loading indicator
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: LunaraColors.warmGold))
                        .scaleEffect(1.2)

                    // Loading text
                    Text("Signing you in...")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(LunaraColors.charcoalGray.opacity(0.7))
                }
            }
        }
    }
}

// MARK: - Main Tab View
struct MainTabView: View {
    @EnvironmentObject var authenticationService: AuthenticationService
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var shopService: ShopService

    var body: some View {
        ZStack {
            VStack(spacing: 0) {
                // Top Navigation Bar (always visible)
                TopNavigationBar()

                // Tab Content with NavigationStack for each tab
                TabView(selection: $appState.selectedTab) {
                    NavigationStack(path: $appState.homeNavigationPath) {
                        ExploreView()
                            .navigationDestination(for: NavigationDestination.self) { destination in
                                navigationDestinationView(for: destination)
                            }
                    }
                    .opacity(appState.isNotificationsOpen ? 0.3 : 1.0)
                    .animation(.spring(response: 0.25, dampingFraction: 0.9), value: appState.isNotificationsOpen)
                    .tabItem {
                        Image(systemName: "house")
                        Text("Explore")
                    }
                    .tag(MainTab.home)

                    NavigationStack(path: $appState.searchNavigationPath) {
                        SimplifiedSearchView()
                            .navigationDestination(for: NavigationDestination.self) { destination in
                                navigationDestinationView(for: destination)
                            }
                    }
                    .opacity(appState.isNotificationsOpen ? 0.3 : 1.0)
                    .animation(.spring(response: 0.25, dampingFraction: 0.9), value: appState.isNotificationsOpen)
                    .tabItem {
                        Image(systemName: "magnifyingglass")
                        Text("Search")
                    }
                    .tag(MainTab.search)

                    NavigationStack(path: $appState.favoritesNavigationPath) {
                        if authenticationService.isAuthenticated {
                            SimplifiedFavoritesView()
                                .navigationDestination(for: NavigationDestination.self) { destination in
                                    navigationDestinationView(for: destination)
                                }
                        } else {
                            GuestPromptView(feature: "Favorites")
                                .navigationDestination(for: NavigationDestination.self) { destination in
                                    navigationDestinationView(for: destination)
                                }
                        }
                    }
                    .opacity(appState.isNotificationsOpen ? 0.3 : 1.0)
                    .animation(.spring(response: 0.25, dampingFraction: 0.9), value: appState.isNotificationsOpen)
                    .tabItem {
                        Image(systemName: "heart")
                        Text("Favorites")
                    }
                    .tag(MainTab.favorites)

                    NavigationStack(path: $appState.appointmentsNavigationPath) {
                        if authenticationService.isAuthenticated {
                            SimplifiedAppointmentsView()
                                .navigationDestination(for: NavigationDestination.self) { destination in
                                    navigationDestinationView(for: destination)
                                }
                        } else {
                            GuestPromptView(feature: "Appointments")
                                .navigationDestination(for: NavigationDestination.self) { destination in
                                    navigationDestinationView(for: destination)
                                }
                        }
                    }
                    .opacity(appState.isNotificationsOpen ? 0.3 : 1.0)
                    .animation(.spring(response: 0.25, dampingFraction: 0.9), value: appState.isNotificationsOpen)
                    .tabItem {
                        Image(systemName: "calendar")
                        Text("Appointments")
                    }
                    .tag(MainTab.appointments)

                    if authenticationService.user?.hasOwnerOrEmployeeRole == true {
                        NavigationStack(path: $appState.dashboardNavigationPath) {
                            DashboardView()
                                .navigationDestination(for: NavigationDestination.self) { destination in
                                    navigationDestinationView(for: destination)
                                }
                        }
                        .opacity(appState.isNotificationsOpen ? 0.3 : 1.0)
                        .animation(.spring(response: 0.25, dampingFraction: 0.9), value: appState.isNotificationsOpen)
                        .tabItem {
                            Image(systemName: "chart.bar")
                            Text("Dashboard")
                        }
                        .tag(MainTab.dashboard)
                    }
                }
                .accentColor(LunaraColors.warmGold)
                .onChange(of: appState.selectedTab) { oldTab, newTab in
                    // Ensure notifications are closed when switching tabs
                    if appState.isNotificationsOpen {
                        // First, let the tab change happen immediately (new content renders)
                        // Then animate the notifications closing over the new content
                        DispatchQueue.main.async {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.8, blendDuration: 0)) {
                                appState.isNotificationsOpen = false
                                appState.isInShopDetails = false
                            }
                        }
                    }
                }
            }

            // Notifications overlay (Instagram-style) - positioned between TopNavigationBar and MainTab
            if appState.isNotificationsOpen {
                VStack(spacing: 0) {
                    // Top spacer to account for TopNavigationBar (matches TabView positioning)
                    Color.clear
                        .frame(height: 60)

                    // Notifications content - fills the exact same space as TabView content
                    SimplifiedNotificationsView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(LunaraColors.background)
                        .clipped()

                    // Bottom spacer to account for MainTab (matches TabView positioning)
                    Color.clear
                        .frame(height: 49)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.clear)
                .allowsHitTesting(true)
                .transition(.asymmetric(
                    insertion: .move(edge: .trailing).combined(with: .opacity),
                    removal: .move(edge: .trailing).combined(with: .opacity) // Same slide-out animation for tab switching
                ))
                .animation(.spring(response: 0.3, dampingFraction: 0.8, blendDuration: 0), value: appState.isNotificationsOpen)
            }
        }
        .sheet(item: $appState.presentedSheet) { sheet in
            switch sheet {
            case .serviceDetails(let service):
                Text("Service Details: \(service.name)")
            case .appointmentDetails(let appointment):
                AppointmentDetailView(appointment: appointment)
            case .bookingFlow(let shop, let service):
                BookingFlowView(shop: shop, preselectedService: service)
            case .userProfile:
                ProfileView()
            case .settings:
                Text("Settings")
            case .paymentMethods:
                Text("Payment Methods")
            case .employeeInvitation:
                Text("Employee Invitation")
            case .shopCreation:
                ShopCreationView(onShopCreated: {
                    // Handle successful shop creation
                    print("Shop created successfully from ContentView")
                    // Optionally dismiss the sheet or navigate to dashboard
                })
            case .serviceCreation:
                Text("Service Creation")
            case .serviceManagement(let shop):
                ServiceManagementView(shop: shop)
            case .employeeManagement(let shop):
                EmployeeManagementView(shop: shop)
            case .appointmentManagement(let shop):
                ShopAppointmentListView(shop: shop)
            case .scheduleManagement(let shop):
                ScheduleManagementView(shop: shop)
            case .photoGalleryManagement(let shop):
                ShopGalleryManagementView(shop: shop)
            case .shopSettings(let shop):
                ShopSettingsView(shop: shop)
            case .shopAnalytics(let shop):
                ShopAnalyticsView(shop: shop)
            case .paymentSettings(let shop):
                PaymentSettingsView(shop: shop)
            case .reviewSubmission(let appointment):
                ReviewSubmissionSheet(appointment: appointment)
            }
        }
        .onAppear {
            // Configure tab bar appearance
            let appearance = UITabBarAppearance()
            appearance.configureWithOpaqueBackground()
            appearance.backgroundColor = UIColor(LunaraColors.white)

            // Configure normal state
            appearance.stackedLayoutAppearance.normal.iconColor = UIColor(LunaraColors.charcoalGray.opacity(0.6))
            appearance.stackedLayoutAppearance.normal.titleTextAttributes = [
                .foregroundColor: UIColor(LunaraColors.charcoalGray.opacity(0.6))
            ]

            // Configure selected state
            appearance.stackedLayoutAppearance.selected.iconColor = UIColor(LunaraColors.warmGold)
            appearance.stackedLayoutAppearance.selected.titleTextAttributes = [
                .foregroundColor: UIColor(LunaraColors.warmGold)
            ]

            UITabBar.appearance().standardAppearance = appearance
            UITabBar.appearance().scrollEdgeAppearance = appearance
        }
    }

    // MARK: - Navigation Destination View
    @ViewBuilder
    private func navigationDestinationView(for destination: NavigationDestination) -> some View {
        switch destination {
        case .shopDetails(let shopId):
            // Load shop and show details
            ShopDetailsNavigationView(shopId: shopId)
        case .serviceDetails(let serviceId):
            Text("Service Details: \(serviceId)")
        case .appointmentDetails(let appointmentId):
            Text("Appointment Details: \(appointmentId)")
        case .employeeDetails(let employeeId):
            Text("Employee Details: \(employeeId)")
        case .bookingConfirmation(let appointmentId):
            Text("Booking Confirmation: \(appointmentId)")
        case .shopManagement(let shopId):
            Text("Shop Management: \(shopId)")
        case .analytics(let shopId):
            Text("Analytics: \(shopId)")
        case .serviceManagement(let shopId):
            if let shop = getShopById(shopId) {
                DashboardServiceManagementWrapper(shop: shop)
            } else {
                Text("Shop not found")
            }
        case .employeeManagement(let shopId):
            if let shop = getShopById(shopId) {
                DashboardEmployeeManagementWrapper(shop: shop)
            } else {
                Text("Shop not found")
            }
        case .appointmentManagement(let shopId):
            if let shop = getShopById(shopId) {
                DashboardAppointmentManagementWrapper(shop: shop)
            } else {
                Text("Shop not found")
            }
        case .scheduleManagement(let shopId):
            if let shop = getShopById(shopId) {
                DashboardScheduleManagementWrapper(shop: shop)
            } else {
                Text("Shop not found")
            }
        case .photoGalleryManagement(let shopId):
            if let shop = getShopById(shopId) {
                DashboardGalleryWrapper(shop: shop)
            } else {
                Text("Shop not found")
            }
        case .shopSettings(let shopId):
            if let shop = getShopById(shopId) {
                DashboardShopSettingsWrapper(shop: shop)
            } else {
                Text("Shop not found")
            }
        case .shopAnalytics(let shopId):
            if let shop = getShopById(shopId) {
                DashboardShopAnalyticsWrapper(shop: shop)
            } else {
                Text("Shop not found")
            }
        case .paymentSettings(let shopId):
            if let shop = getShopById(shopId) {
                DashboardPaymentSettingsWrapper(shop: shop)
            } else {
                Text("Shop not found")
            }
        case .settings:
            Text("Settings")
        case .notifications:
            // This case is now handled by the top navigation overlay
            EmptyView()
        case .paymentMethods:
            Text("Payment Methods")
        }
    }

    // MARK: - Helper Methods
    private func getShopById(_ shopId: String) -> Shop? {
        return shopService.ownerShops.first { $0.id == shopId }
    }
}

// MARK: - Authentication Flow View
struct AuthenticationFlowView: View {
    @State private var showingLogin = true

    var body: some View {
        NavigationView {
            ZStack {
                LunaraColors.white
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Logo and welcome section
                    VStack(spacing: 24) {
                        Spacer()

                        // Logo
                        LunaraLogoView(size: .large)

                        // Welcome text
                        VStack(spacing: 8) {
                            Text("Welcome to Lunara")
                                .font(.title)
                                .fontWeight(.bold)
                                .foregroundColor(LunaraColors.charcoalGray)

                            Text("Book beauty appointments with ease")
                                .font(.body)
                                .foregroundColor(LunaraColors.charcoalGray.opacity(0.7))
                                .multilineTextAlignment(.center)
                        }

                        Spacer()
                    }

                    // Authentication forms
                    VStack(spacing: 16) {
                        if showingLogin {
                            LoginView()
                        } else {
                            RegisterView()
                        }

                        // Toggle between login and register
                        Button(action: {
                            withAnimation(.easeInOut(duration: 0.3)) {
                                showingLogin.toggle()
                            }
                        }) {
                            HStack(spacing: 4) {
                                Text(showingLogin ? "Don't have an account?" : "Already have an account?")
                                    .foregroundColor(LunaraColors.charcoalGray.opacity(0.7))

                                Text(showingLogin ? "Sign Up" : "Sign In")
                                    .foregroundColor(LunaraColors.warmGold)
                                    .fontWeight(.medium)
                            }
                            .font(.body)
                        }
                        .padding(.top, 8)
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 32)
                }
            }
        }
        .navigationViewStyle(StackNavigationViewStyle())
    }
}

// MARK: - Guest Prompt View
struct GuestPromptView: View {
    @EnvironmentObject var authenticationService: AuthenticationService
    let feature: String

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            // Icon
            Image(systemName: "person.crop.circle.badge.plus")
                .font(.system(size: 64))
                .foregroundColor(LunaraColors.warmGold)

            // Title and message
            VStack(spacing: 12) {
                Text("Sign In Required")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(LunaraColors.charcoalGray)

                Text("To access \(feature.lowercased()), please sign in to your account or create a new one.")
                    .font(.body)
                    .foregroundColor(LunaraColors.charcoalGray.opacity(0.7))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }

            // Sign In Button
            Button(action: {
                // Exit guest mode to show authentication flow
                authenticationService.isGuestMode = false
            }) {
                Text("Sign In")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.buttonPrimaryText)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(LunaraColors.buttonPrimary)
                    .cornerRadius(12)
            }
            .padding(.horizontal, 32)

            Spacer()
        }
        .background(LunaraColors.white)
    }
}

// MARK: - Placeholder Views
struct ShopDetailPlaceholderView: View {
    let shop: Shop

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Shop Details")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text(shop.name)
                    .font(.title2)

                Text(shop.description)
                    .font(.body)
                    .multilineTextAlignment(.center)
                    .padding()

                Text("Full shop details coming soon!")
                    .font(.body)
                    .foregroundColor(.secondary)

                Spacer()
            }
            .padding()
            .navigationTitle("Shop Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        AppState.shared.dismissSheet()
                    }
                }
            }
        }
    }
}

struct BookingFlowPlaceholderView: View {
    let shop: Shop
    let selectedService: Service?

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Booking Flow")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("Shop: \(shop.name)")
                    .font(.title2)

                if let service = selectedService {
                    Text("Service: \(service.name)")
                        .font(.title3)
                }

                Text("Complete booking flow coming soon!")
                    .font(.body)
                    .foregroundColor(.secondary)

                Spacer()
            }
            .padding()
            .navigationTitle("Book Appointment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        AppState.shared.dismissSheet()
                    }
                }
            }
        }
    }
}

// MARK: - Shop Management Placeholder Views

struct ShopCreationPlaceholderView: View {
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Create Shop")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("Shop creation form coming soon!")
                    .font(.body)
                    .foregroundColor(.secondary)

                Spacer()
            }
            .padding()
            .navigationTitle("Create Shop")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        AppState.shared.dismissSheet()
                    }
                }
            }
        }
    }
}

struct ServiceManagementPlaceholderView: View {
    let shop: Shop

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Service Management")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("Shop: \(shop.name)")
                    .font(.title2)

                Text("Service management coming soon!")
                    .font(.body)
                    .foregroundColor(.secondary)

                Spacer()
            }
            .padding()
            .navigationTitle("Manage Services")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        AppState.shared.dismissSheet()
                    }
                }
            }
        }
    }
}

struct EmployeeManagementPlaceholderView: View {
    let shop: Shop

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Employee Management")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("Shop: \(shop.name)")
                    .font(.title2)

                Text("Employee management coming soon!")
                    .font(.body)
                    .foregroundColor(.secondary)

                Spacer()
            }
            .padding()
            .navigationTitle("Manage Employees")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        AppState.shared.dismissSheet()
                    }
                }
            }
        }
    }
}

struct AppointmentManagementPlaceholderView: View {
    let shop: Shop

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Appointment Management")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("Shop: \(shop.name)")
                    .font(.title2)

                Text("Appointment management coming soon!")
                    .font(.body)
                    .foregroundColor(.secondary)

                Spacer()
            }
            .padding()
            .navigationTitle("Manage Appointments")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        AppState.shared.dismissSheet()
                    }
                }
            }
        }
    }
}

struct PhotoGalleryManagementPlaceholderView: View {
    let shop: Shop

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Photo Gallery Management")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("Shop: \(shop.name)")
                    .font(.title2)

                Text("Photo gallery management coming soon!")
                    .font(.body)
                    .foregroundColor(.secondary)

                Spacer()
            }
            .padding()
            .navigationTitle("Manage Photos")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        AppState.shared.dismissSheet()
                    }
                }
            }
        }
    }
}

struct ShopSettingsPlaceholderView: View {
    let shop: Shop

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Shop Settings")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("Shop: \(shop.name)")
                    .font(.title2)

                Text("Shop settings coming soon!")
                    .font(.body)
                    .foregroundColor(.secondary)

                Spacer()
            }
            .padding()
            .navigationTitle("Shop Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        AppState.shared.dismissSheet()
                    }
                }
            }
        }
    }
}

// MARK: - Shop Details Navigation View
struct ShopDetailsNavigationView: View {
    let shopId: String

    @State private var shop: Shop?
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        Group {
            if isLoading {
                VStack(spacing: 16) {
                    ProgressView()
                        .scaleEffect(1.2)
                    Text("Loading shop details...")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(LunaraColors.background)
            } else if let shop = shop {
                SimplifiedShopDetailsView(shop: shop)
                    .navigationBarHidden(true)
            } else {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 48))
                        .foregroundColor(.orange)

                    Text("Shop Not Found")
                        .font(.title2)
                        .fontWeight(.semibold)

                    if let errorMessage = errorMessage {
                        Text(errorMessage)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(LunaraColors.background)
            }
        }
        .task {
            await loadShop()
        }
    }

    private func loadShop() async {
        do {
            let loadedShop = try await APIClient.shared.getShop(id: shopId)
            await MainActor.run {
                self.shop = loadedShop
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.isLoading = false
            }
        }
    }
}

struct ShopAnalyticsPlaceholderView: View {
    let shop: Shop

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Shop Analytics")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("Shop: \(shop.name)")
                    .font(.title2)

                Text("Analytics and insights coming soon!")
                    .font(.body)
                    .foregroundColor(.secondary)

                Spacer()
            }
            .padding()
            .navigationTitle("Analytics")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        AppState.shared.dismissSheet()
                    }
                }
            }
        }
    }
}

struct PaymentSettingsPlaceholderView: View {
    let shop: Shop

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Payment Settings")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("Shop: \(shop.name)")
                    .font(.title2)

                Text("Payment settings coming soon!")
                    .font(.body)
                    .foregroundColor(.secondary)

                Spacer()
            }
            .padding()
            .navigationTitle("Payment Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        AppState.shared.dismissSheet()
                    }
                }
            }
        }
    }
}

// MARK: - Preview
struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environmentObject(AuthenticationService.shared)
            .environmentObject(NetworkMonitor.shared)
            .environmentObject(AppState.shared)
    }
}
