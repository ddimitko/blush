//
//  ListYourBusinessBannerView.swift
//  LunaraApp
//
//  Created by Lunara Team on 16/07/2025.
//

import SwiftUI

/// Prominent banner encouraging users to list their business
struct ListYourBusinessBannerView: View {
    @EnvironmentObject var authService: AuthenticationService
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 16) {
                // Icon
                ZStack {
                    Circle()
                        .fill(LunaraColors.warmGold.opacity(0.2))
                        .frame(width: 56, height: 56)
                    
                    Image(systemName: "storefront")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundColor(LunaraColors.warmGold)
                }
                
                // Content
                VStack(alignment: .leading, spacing: 4) {
                    Text("List Your Business")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    Text("Join thousands of beauty professionals")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)
                    
                    Text("Start earning today →")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(LunaraColors.warmGold)
                }
                
                Spacer()
                
                // Arrow
                Image(systemName: "chevron.right")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.warmGold)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
            .background(
                LinearGradient(
                    gradient: Gradient(colors: [
                        LunaraColors.warmGold.opacity(0.05),
                        LunaraColors.warmGold.opacity(0.1)
                    ]),
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(LunaraColors.warmGold.opacity(0.3), lineWidth: 1)
            )
            .cornerRadius(16)
        }
        .buttonStyle(PlainButtonStyle())
        .scaleEffect(1.0)
        .animation(.easeInOut(duration: 0.1), value: false)
    }
}

/// Compact version for smaller spaces
struct ListYourBusinessCompactBannerView: View {
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                Image(systemName: "storefront")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.warmGold)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("List Your Business")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    Text("Start earning today")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(LunaraColors.warmGold)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(LunaraColors.warmGold.opacity(0.08))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(LunaraColors.warmGold.opacity(0.3), lineWidth: 1)
            )
            .cornerRadius(12)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Preview
struct ListYourBusinessBannerView_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 20) {
            ListYourBusinessBannerView {
                print("Banner tapped")
            }
            
            ListYourBusinessCompactBannerView {
                print("Compact banner tapped")
            }
        }
        .padding()
        .environmentObject(AuthenticationService.shared)
        .previewLayout(.sizeThatFits)
    }
}
