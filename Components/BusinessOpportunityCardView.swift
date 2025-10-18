//
//  BusinessOpportunityCardView.swift
//  LunaraApp
//
//  Created by Lunara Team on 16/07/2025.
//

import SwiftUI

/// Card component for business opportunity CTA that matches QuickActionCard style
struct BusinessOpportunityCardView: View {
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 12) {
                // Icon with gradient background
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    LunaraColors.warmGold,
                                    LunaraColors.warmGold.opacity(0.8)
                                ]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 48, height: 48)
                    
                    Image(systemName: "storefront")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundColor(.white)
                }
                
                // Content
                VStack(spacing: 4) {
                    Text("List Business")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)
                        .multilineTextAlignment(.center)
                    
                    Text("Start earning")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)
                }
                
                Spacer()
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 16)
            .frame(maxWidth: .infinity)
            .frame(height: 120)
            .background(LunaraColors.cardBackground)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(LunaraColors.warmGold.opacity(0.3), lineWidth: 1.5)
            )
            .cornerRadius(16)
            .shadow(
                color: LunaraColors.warmGold.opacity(0.15),
                radius: 8,
                x: 0,
                y: 4
            )
        }
        .buttonStyle(PlainButtonStyle())
        .scaleEffect(1.0)
        .animation(.easeInOut(duration: 0.1), value: false)
    }
}

/// Alternative horizontal layout for different contexts
struct BusinessOpportunityHorizontalCardView: View {
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 16) {
                // Icon
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    LunaraColors.warmGold,
                                    LunaraColors.warmGold.opacity(0.8)
                                ]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 56, height: 56)
                    
                    Image(systemName: "storefront")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundColor(.white)
                }
                
                // Content
                VStack(alignment: .leading, spacing: 6) {
                    Text("List Your Business")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    Text("Join our platform and start earning")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)
                        .lineLimit(2)
                    
                    HStack(spacing: 4) {
                        Text("Get started")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(LunaraColors.warmGold)
                        
                        Image(systemName: "arrow.right")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(LunaraColors.warmGold)
                    }
                }
                
                Spacer()
                
                // Chevron
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(LunaraColors.warmGold)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
            .background(LunaraColors.cardBackground)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(LunaraColors.warmGold.opacity(0.2), lineWidth: 1)
            )
            .cornerRadius(16)
            .shadow(
                color: LunaraColors.cardShadow,
                radius: 4,
                x: 0,
                y: 2
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Preview
struct BusinessOpportunityCardView_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 20) {
            HStack(spacing: 12) {
                BusinessOpportunityCardView {
                    print("Business card tapped")
                }
                
                BusinessOpportunityCardView {
                    print("Business card tapped")
                }
            }
            
            BusinessOpportunityHorizontalCardView {
                print("Horizontal business card tapped")
            }
        }
        .padding()
        .previewLayout(.sizeThatFits)
    }
}
