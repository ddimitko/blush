//
//  TopNavigationBar.swift
//  LunaraApp
//
//  Created by Lunara Team on 27/07/2025.
//

import SwiftUI

/// Custom top navigation bar similar to Reddit iOS app
struct TopNavigationBar: View {
    @EnvironmentObject var authService: AuthenticationService
    @EnvironmentObject var shopService: ShopService
    @EnvironmentObject var notificationService: NotificationService
    @EnvironmentObject var appState: AppState
    
    @State private var showingShopSelector = false
    @State private var showingProfileMenu = false
    
    var body: some View {
        HStack(spacing: 16) {
            // Left side - Logo and Shop selector
            leftSection
            
            Spacer()
            
            // Right side - Notifications and Profile
            rightSection
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(LunaraColors.white)
        .overlay(
            Rectangle()
                .frame(height: 0.5)
                .foregroundColor(LunaraColors.coolLightGray)
                .opacity(0.8),
            alignment: .bottom
        )
        .sheet(isPresented: $showingShopSelector) {
            ShopSelectorSheet(
                shops: shopService.ownerShops,
                selectedShop: shopService.selectedShop,
                onShopSelect: { shop in
                    shopService.selectShop(shop)
                    showingShopSelector = false
                }
            )
        }

        .sheet(isPresented: $showingProfileMenu) {
            if authService.isAuthenticated {
                ProfileMenuSheet()
            } else {
                LoginPromptSheet()
            }
        }

    }
    
    // MARK: - Left Section
    private var leftSection: some View {
        HStack(spacing: 12) {
            // Back button when in notifications or shop details
            if appState.shouldShowBackButton {
                Button(action: {
                    appState.popNavigation()
                }) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)
                }
                .buttonStyle(PlainButtonStyle())
                .transition(.asymmetric(
                    insertion: .move(edge: .leading).combined(with: .opacity),
                    removal: .move(edge: .leading).combined(with: .opacity)
                ))
                .animation(.easeInOut(duration: 0.3), value: appState.shouldShowBackButton)
            }

            // Lunara Logo (visual only, no interaction)
            SplashLogoView(size: .small)

            // Management view title (when in dashboard management views)
            if let managementTitle = appState.currentManagementTitle {
                Text(managementTitle)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                    .transition(.asymmetric(
                        insertion: .move(edge: .trailing).combined(with: .opacity),
                        removal: .move(edge: .trailing).combined(with: .opacity)
                    ))
                    .animation(.easeInOut(duration: 0.3), value: appState.currentManagementTitle)
            }

            // Shop selector (only in dashboard and not when top navigation is open)
            if appState.selectedTab == .dashboard &&
               authService.user?.hasOwnerOrEmployeeRole == true &&
               !appState.shouldShowBackButton {
                shopSelectorButton
            }
        }
    }
    
    // MARK: - Right Section
    private var rightSection: some View {
        HStack(spacing: 16) {
            // Notification Bell (only for authenticated users)
            if authService.isAuthenticated {
                notificationButton
            }

            // Profile Avatar or Login Button
            profileButton
        }
    }
    
    // MARK: - Shop Selector Button
    private var shopSelectorButton: some View {
        Button(action: {
            if shopService.ownerShops.count > 1 {
                showingShopSelector = true
            }
        }) {
            HStack(spacing: 8) {
                Text(shopService.selectedShop?.name ?? "Select Shop")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(LunaraColors.primaryText)
                    .lineLimit(1)

                // Always show the arrow down button
                Image(systemName: "chevron.down")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(shopService.ownerShops.count > 1 ? LunaraColors.secondaryText : LunaraColors.secondaryText.opacity(0.5))
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .fill(LunaraColors.coolLightGray.opacity(0.5))
            )
        }
        .buttonStyle(PlainButtonStyle())
        .disabled(shopService.ownerShops.count <= 1)
    }
    
    // MARK: - Notification Button
    private var notificationButton: some View {
        Button(action: {
            // Toggle notifications view
            if appState.isNotificationsOpen {
                appState.closeTopNavigation()
            } else {
                appState.openNotifications()
            }
        }) {
            ZStack {
                Image(systemName: appState.isNotificationsOpen ? "bell.fill" : "bell")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundColor(appState.isNotificationsOpen ? LunaraColors.warmGold : LunaraColors.primaryText)

                // Unread badge
                if notificationService.unreadCount > 0 && !appState.isNotificationsOpen {
                    Text("\(min(notificationService.unreadCount, 99))")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.red)
                        .clipShape(Capsule())
                        .offset(x: 10, y: -8)
                }
            }
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    // MARK: - Profile Button
    private var profileButton: some View {
        Button(action: {
            showingProfileMenu = true
        }) {
            if authService.isAuthenticated {
                // Authenticated user - show avatar
                AsyncImage(url: URL(string: authService.user?.avatar ?? "")) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle()
                        .fill(LunaraColors.warmGold)
                        .overlay(
                            Text(authService.user?.initials ?? "U")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.white)
                        )
                }
                .frame(width: 32, height: 32)
                .clipShape(Circle())
            } else {
                // Unauthenticated user - show login icon
                Circle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(width: 32, height: 32)
                    .overlay(
                        Image(systemName: "person.crop.circle")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(LunaraColors.charcoalGray.opacity(0.6))
                    )
            }
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Shop Selector Sheet
struct ShopSelectorSheet: View {
    let shops: [Shop]
    let selectedShop: Shop?
    let onShopSelect: (Shop) -> Void
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 8) {
                    Text("Select Shop")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    Text("Choose which shop to manage")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 16)
                .background(LunaraColors.coolLightGray.opacity(0.3))
                
                // Shop List
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(shops) { shop in
                            ShopSelectorRow(
                                shop: shop,
                                isSelected: selectedShop?.id == shop.id,
                                onTap: {
                                    onShopSelect(shop)
                                }
                            )
                        }
                    }
                }
                
                // Create New Shop Button
                VStack(spacing: 0) {
                    Divider()
                    
                    Button(action: {
                        dismiss()
                        // Navigate to shop creation
                    }) {
                        HStack {
                            Image(systemName: "plus.circle.fill")
                                .foregroundColor(LunaraColors.warmGold)
                            
                            Text("Create New Shop")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(LunaraColors.warmGold)
                            
                            Spacer()
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 16)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.secondaryText)
                }
            }
        }
    }
}

// MARK: - Shop Selector Row
struct ShopSelectorRow: View {
    let shop: Shop
    let isSelected: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                // Shop Icon
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(isSelected ? LunaraColors.warmGold.opacity(0.1) : LunaraColors.coolLightGray.opacity(0.5))
                        .frame(width: 40, height: 40)
                    
                    Image(systemName: "building.2")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(isSelected ? LunaraColors.warmGold : LunaraColors.secondaryText)
                }
                
                // Shop Info
                VStack(alignment: .leading, spacing: 4) {
                    Text(shop.name)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(isSelected ? LunaraColors.warmGold : LunaraColors.primaryText)
                        .lineLimit(1)
                    
                    Text("\(shop.city), \(shop.state)")
                        .font(.system(size: 14, weight: .regular))
                        .foregroundColor(LunaraColors.secondaryText)
                        .lineLimit(1)
                }
                
                Spacer()
                
                // Selection Indicator
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundColor(LunaraColors.warmGold)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(
                Rectangle()
                    .fill(isSelected ? LunaraColors.warmGold.opacity(0.05) : Color.clear)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Login Prompt Sheet
struct LoginPromptSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var authService: AuthenticationService

    var body: some View {
        NavigationView {
            VStack(spacing: 32) {
                Spacer()

                // Icon
                Image(systemName: "person.crop.circle.badge.plus")
                    .font(.system(size: 64))
                    .foregroundColor(LunaraColors.warmGold)

                // Content
                VStack(spacing: 16) {
                    Text("Sign In Required")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)

                    Text("Sign in to access your profile, manage appointments, and unlock all features.")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                }

                // Action Buttons
                VStack(spacing: 16) {
                    Button(action: {
                        dismiss()
                        // Trigger authentication flow by logging out current guest session
                        // This will cause the app to show the authentication flow
                        Task {
                            await authService.forceLogout()
                        }
                    }) {
                        Text("Sign In")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(LunaraColors.warmGold)
                            .cornerRadius(12)
                    }
                    .padding(.horizontal, 32)

                    Button(action: {
                        dismiss()
                    }) {
                        Text("Continue as Guest")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                }

                Spacer()
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.secondaryText)
                }
            }
        }
    }
}

// MARK: - Preview
struct TopNavigationBar_Previews: PreviewProvider {
    static var previews: some View {
        TopNavigationBar()
            .environmentObject(AuthenticationService.shared)
            .environmentObject(ShopService.shared)
            .environmentObject(NotificationService.shared)
            .environmentObject(AppState.shared)
    }
}
