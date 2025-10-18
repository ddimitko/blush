//
//  LunaraAppApp.swift
//  LunaraApp
//
//  Created by Lunara Team on 14/07/2025.
//

import SwiftUI

@main
struct LunaraAppApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    // MARK: - Properties
    @StateObject private var authenticationService = AuthenticationService.shared
    @StateObject private var networkMonitor = NetworkMonitor.shared
    @StateObject private var appState = AppState.shared
    @StateObject private var notificationService = NotificationService.shared
    @StateObject private var shopService = ShopService.shared
    @StateObject private var favoritesService = FavoritesService.shared
    @StateObject private var appointmentService = AppointmentService.shared
    
    // MARK: - App Lifecycle
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authenticationService)
                .environmentObject(networkMonitor)
                .environmentObject(appState)
                .environmentObject(notificationService)
                .environmentObject(shopService)
                .environmentObject(favoritesService)
                .environmentObject(appointmentService)
                .environmentObject(AnalyticsService.shared)
                .onAppear {
                    setupApp()
                }
                .onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
                    handleAppDidBecomeActive()
                }
                .onReceive(NotificationCenter.default.publisher(for: UIApplication.willResignActiveNotification)) { _ in
                    handleAppWillResignActive()
                }
        }
    }
    
    // MARK: - Private Methods
    private func setupApp() {
        // Configure dependencies first
        DependencyConfiguration.shared.configureAll()

        // Configure app appearance
        configureAppearance()

        // Initialize services
        initializeServices()

        // Initialize cache management services
        initializeCacheServices()

        // Check authentication status asynchronously
        Task {
            // Restore user state and check authentication in a single flow
            await authenticationService.restoreUserStateFromStorage()

            // Only check authentication status if we don't have valid tokens
            // This prevents redundant authentication checks
            if authenticationService.currentAccessToken == nil {
                await authenticationService.checkAuthenticationStatus()
            } else {
                // If we have tokens, validate them silently and set up authenticated state
                let isValid = await authenticationService.silentAuthenticationCheck()
                if !isValid {
                    await authenticationService.checkAuthenticationStatus()
                } else {
                    // Token is valid, set up WebSocket for authenticated user
                    if let token = authenticationService.currentAccessToken,
                       let user = authenticationService.user {
                        WebSocketService.shared.setupAuthenticatedUserSubscriptions(with: token, userId: user.id)
                        print("🔐 WebSocket authenticated subscriptions setup for validated user")
                    }
                }
            }

            // Initialize offline-first data management after authentication
            await initializeOfflineFirstData()
        }

        // Setup push notifications if user is authenticated
        if authenticationService.isAuthenticated {
            setupPushNotifications()
        }
    }
    
    private func configureAppearance() {
        // Configure navigation bar appearance
        let appearance = UINavigationBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor.white
        appearance.titleTextAttributes = [
            .foregroundColor: UIColor.black,
            .font: UIFont.systemFont(ofSize: 18, weight: .semibold)
        ]
        appearance.largeTitleTextAttributes = [
            .foregroundColor: UIColor.black,
            .font: UIFont.systemFont(ofSize: 32, weight: .bold)
        ]
        
        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
        UINavigationBar.appearance().compactAppearance = appearance
        
        // Configure tab bar appearance
        let tabBarAppearance = UITabBarAppearance()
        tabBarAppearance.configureWithOpaqueBackground()
        tabBarAppearance.backgroundColor = UIColor.white
        
        UITabBar.appearance().standardAppearance = tabBarAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabBarAppearance
        
        // Configure tint colors
        UIView.appearance().tintColor = UIColor.systemBlue
    }
    
    private func initializeServices() {
        // Initialize API client first (required by other services)
        APIClient.shared.configure()

        // Initialize WebSocket service but don't connect immediately
        // Connection will be handled by authentication service when needed
        WebSocketService.shared.configure()
        print("🔧 WebSocket service is ready for connections")

        // Initialize location service asynchronously to avoid blocking startup
        Task {
            LocationService.shared.requestLocationPermission()
        }

        print("✅ Services initialized")
    }
    
    private func initializeCacheServices() {
        // Initialize cache invalidation coordinator
        _ = CacheInvalidationCoordinator.shared

        // Initialize simplified memory-aware cache manager
        _ = MemoryAwareCacheManager.shared

        print("✅ Cache services initialized")
    }

    private func initializeOfflineFirstData() async {
        // Initialize offline-first data manager
        _ = OfflineFirstDataManager.shared

        // Perform initial background sync if network is available
        await OfflineFirstDataManager.shared.performBackgroundSync()

        print("✅ Offline-first data management initialized")
    }

    private func setupPushNotifications() {
        Task {
            await NotificationService.shared.requestPermission()

            // Add a delay to ensure authentication is complete before fetching notification count
            try? await Task.sleep(nanoseconds: 1_000_000_000) // 1 second delay

            // Initialize notification count for app startup
            await NotificationService.shared.initializeForAppStartup()
        }
    }
    
    private func handleAppDidBecomeActive() {
        // Debounce app becoming active to prevent multiple rapid calls
        Task {
            // Only perform authentication check if user was previously authenticated
            // and sufficient time has passed since last check
            if authenticationService.isAuthenticated {
                let isStillAuthenticated = await authenticationService.silentAuthenticationCheck()

                // Only perform full authentication check if silent check failed
                if !isStillAuthenticated {
                    await authenticationService.checkAuthenticationStatus()
                }
            }

            // Trigger cache invalidation for app becoming active (debounced internally)
            await MainActor.run {
                CacheInvalidationCoordinator.shared.handleInvalidation(.appBecameActive)
            }

            // Perform background sync if network is available
            await OfflineFirstDataManager.shared.performBackgroundSync()
        }

        // Only reconnect WebSocket if needed (avoid duplicate setup)
        if authenticationService.isAuthenticated, let user = authenticationService.user {
            let userId = user.id
            if let token = authenticationService.currentAccessToken {
                // Only setup if not already connected and authenticated
                if !WebSocketService.shared.isConnected || !WebSocketService.shared.isAuthenticated {
                    WebSocketService.shared.setupAuthenticatedUserSubscriptions(with: token, userId: userId)
                }
            }
        } else {
            // For unauthenticated users, ensure basic WebSocket connection for slot updates
            if !WebSocketService.shared.isConnected {
                WebSocketService.shared.connectForUnauthenticatedUser()
            }
        }

        // Update app state
        appState.isAppActive = true
    }
    
    private func handleAppWillResignActive() {
        // Update app state
        appState.isAppActive = false
        
        // Save any pending data
        // DataPersistenceService.shared.saveContext()
    }
}

// AppState and MainTab are now defined in Core/State/AppState.swift
