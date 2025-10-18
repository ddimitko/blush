//
//  ProfileMenuSheet.swift
//  LunaraApp
//
//  Created by Lunara Team on 27/07/2025.
//

import SwiftUI

/// Profile menu sheet for quick access to profile actions
struct ProfileMenuSheet: View {
    @EnvironmentObject var authService: AuthenticationService
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) private var dismiss
    
    @State private var showingSignOutAlert = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Profile Header
                profileHeader
                
                // Menu Options
                menuOptions
                
                Spacer()
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
        .alert("Sign Out", isPresented: $showingSignOutAlert) {
            Button("Cancel", role: .cancel) { }
            Button("Sign Out", role: .destructive) {
                signOut()
            }
        } message: {
            Text("Are you sure you want to sign out?")
        }
    }
    
    // MARK: - Profile Header
    private var profileHeader: some View {
        VStack(spacing: 16) {
            // Avatar
            AsyncImage(url: URL(string: authService.user?.avatar ?? "")) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Circle()
                    .fill(LunaraColors.warmGold)
                    .overlay(
                        Text(authService.user?.initials ?? "U")
                            .font(.system(size: 24, weight: .semibold))
                            .foregroundColor(.white)
                    )
            }
            .frame(width: 60, height: 60)
            .clipShape(Circle())
            
            // User Info
            VStack(spacing: 4) {
                Text(authService.user?.fullName ?? "User")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text(authService.user?.email ?? "")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)
                
                // Role Badge
                HStack {
                    Image(systemName: roleIcon)
                        .font(.system(size: 10, weight: .semibold))
                    
                    Text(authService.user?.role.displayName ?? "User")
                        .font(.system(size: 10, weight: .semibold))
                }
                .foregroundColor(LunaraColors.warmGold)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(LunaraColors.warmGold.opacity(0.1))
                .cornerRadius(12)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 20)
        .background(LunaraColors.coolLightGray.opacity(0.3))
    }
    
    // MARK: - Menu Options
    private var menuOptions: some View {
        VStack(spacing: 0) {
            // View Full Profile
            ProfileMenuRow(
                icon: "person.circle",
                title: "View Profile",
                subtitle: "Manage your account details"
            ) {
                dismiss()
                appState.presentSheet(.userProfile)
            }

            // Business Opportunity (for USER role only)
            if authService.user?.role == .user {
                Divider().padding(.leading, 56)

                ProfileMenuRow(
                    icon: "storefront",
                    title: "List Your Business",
                    subtitle: "Start earning with Lunara"
                ) {
                    dismiss()
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                        appState.presentSheet(.shopCreation)
                    }
                }
            }

            Divider().padding(.leading, 56)

            // Sign Out
            ProfileMenuRow(
                icon: "rectangle.portrait.and.arrow.right",
                title: "Sign Out",
                subtitle: "Sign out of your account",
                isDestructive: true
            ) {
                showingSignOutAlert = true
            }
        }
        .padding(.top, 8)
    }
    
    // MARK: - Computed Properties
    private var roleIcon: String {
        switch authService.user?.role {
        case .owner:
            return "crown"
        case .employee:
            return "person.badge.key"
        case .admin:
            return "shield"
        default:
            return "person"
        }
    }
    
    // MARK: - Actions
    private func signOut() {
        Task {
            await authService.logout()
            dismiss()
        }
    }
}

// MARK: - Profile Menu Row
struct ProfileMenuRow: View {
    let icon: String
    let title: String
    let subtitle: String
    var isDestructive: Bool = false
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                // Icon
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(isDestructive ? Color.red.opacity(0.1) : LunaraColors.warmGold.opacity(0.1))
                        .frame(width: 40, height: 40)
                    
                    Image(systemName: icon)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(isDestructive ? .red : LunaraColors.warmGold)
                }
                
                // Content
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(isDestructive ? .red : LunaraColors.primaryText)
                    
                    Text(subtitle)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)
                }
                
                Spacer()
                
                // Chevron
                if !isDestructive {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(LunaraColors.secondaryText)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Preview
struct ProfileMenuSheet_Previews: PreviewProvider {
    static var previews: some View {
        ProfileMenuSheet()
            .environmentObject(AuthenticationService.shared)
            .environmentObject(AppState.shared)
    }
}
