//
//  ShopCreationSuccessView.swift
//  LunaraApp
//
//  Created by Lunara Team on 16/07/2025.
//

import SwiftUI

/// Success screen shown after shop creation
struct ShopCreationSuccessView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var appState: AppState
    
    let shopName: String
    let onContinue: () -> Void
    
    var body: some View {
        NavigationView {
            VStack(spacing: 32) {
                Spacer()
                
                // Success Animation
                successAnimation
                
                // Success Content
                successContent
                
                // Action Buttons
                actionButtons
                
                Spacer()
            }
            .padding(.horizontal, 24)
            .background(LunaraColors.background)
            .navigationBarHidden(true)
        }
    }
    
    // MARK: - Success Animation
    private var successAnimation: some View {
        ZStack {
            // Outer circle with pulse animation
            Circle()
                .fill(LunaraColors.success.opacity(0.1))
                .frame(width: 120, height: 120)
                .scaleEffect(1.0)
                .animation(
                    Animation.easeInOut(duration: 2.0)
                        .repeatForever(autoreverses: true),
                    value: true
                )
            
            // Inner circle
            Circle()
                .fill(LunaraColors.success)
                .frame(width: 80, height: 80)
            
            // Checkmark
            Image(systemName: "checkmark")
                .font(.system(size: 32, weight: .bold))
                .foregroundColor(.white)
        }
    }
    
    // MARK: - Success Content
    private var successContent: some View {
        VStack(spacing: 16) {
            Text("Shop Created Successfully!")
                .font(.system(size: 28, weight: .bold))
                .foregroundColor(LunaraColors.primaryText)
                .multilineTextAlignment(.center)
            
            Text("Welcome to Lunara, \(shopName)!")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.warmGold)
                .multilineTextAlignment(.center)
            
            VStack(spacing: 12) {
                Text("Your business is now live on our platform. You can:")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                
                VStack(alignment: .leading, spacing: 8) {
                    SuccessFeatureRow(
                        icon: "calendar.badge.plus",
                        text: "Manage appointments and bookings"
                    )
                    
                    SuccessFeatureRow(
                        icon: "person.2.badge.plus",
                        text: "Add employees and services"
                    )
                    
                    SuccessFeatureRow(
                        icon: "chart.line.uptrend.xyaxis",
                        text: "Track earnings and analytics"
                    )
                    
                    SuccessFeatureRow(
                        icon: "creditcard",
                        text: "Set up payments and subscriptions"
                    )
                }
                .padding(.top, 8)
            }
        }
    }
    
    // MARK: - Action Buttons
    private var actionButtons: some View {
        VStack(spacing: 16) {
            // Primary Action - Go to Dashboard
            Button(action: {
                onContinue()
                // Switch to dashboard tab
                appState.selectedTab = .dashboard
                dismiss()
            }) {
                HStack {
                    Image(systemName: "rectangle.grid.1x2")
                        .font(.system(size: 16, weight: .semibold))
                    
                    Text("Go to Dashboard")
                        .font(.system(size: 16, weight: .semibold))
                }
                .foregroundColor(LunaraColors.buttonPrimaryText)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(LunaraColors.buttonPrimary)
                .cornerRadius(12)
            }
            
            // Secondary Action - Continue Browsing
            Button(action: {
                dismiss()
            }) {
                Text("Continue Browsing")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(LunaraColors.warmGold)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
            }
        }
    }
}

// MARK: - Success Feature Row
struct SuccessFeatureRow: View {
    let icon: String
    let text: String
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
                .frame(width: 20)
            
            Text(text)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(LunaraColors.primaryText)
            
            Spacer()
        }
    }
}

// MARK: - Preview
struct ShopCreationSuccessView_Previews: PreviewProvider {
    static var previews: some View {
        ShopCreationSuccessView(
            shopName: "Bella Beauty Salon",
            onContinue: {
                print("Continue tapped")
            }
        )
        .environmentObject(AppState.shared)
    }
}
