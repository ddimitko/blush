//
//  UtilityComponents.swift
//  LunaraApp
//
//  Created by Lunara Team on 27/07/2025.
//

import SwiftUI

// MARK: - Stat Card for Business Owners
struct StatCard: View {
    let icon: String
    let value: String
    let label: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 8) {
            // Icon
            ZStack {
                Circle()
                    .fill(color.opacity(0.15))
                    .frame(width: 40, height: 40)
                
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(color)
            }
            
            // Value
            Text(value)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(LunaraColors.primaryText)
            
            // Label
            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(LunaraColors.secondaryText)
                .multilineTextAlignment(.center)
                .lineLimit(2)
        }
        .padding(.vertical, 16)
        .padding(.horizontal, 12)
        .frame(maxWidth: .infinity)
        .background(LunaraColors.cardBackground)
        .cornerRadius(16)
        .shadow(color: LunaraColors.cardShadow, radius: 4, x: 0, y: 2)
    }
}

// MARK: - Business Opportunity Enhanced Banner
struct BusinessOpportunityEnhancedBannerView: View {
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 20) {
                // Header with icon and title
                HStack(spacing: 16) {
                    // Animated icon
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
                            .frame(width: 60, height: 60)
                        
                        Image(systemName: "storefront")
                            .font(.system(size: 28, weight: .semibold))
                            .foregroundColor(.white)
                    }
                    
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Ready to Grow Your Business?")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(LunaraColors.primaryText)
                        
                        Text("Join thousands of beauty professionals")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                    
                    Spacer()
                }
                
                // Benefits list
                VStack(spacing: 12) {
                    BenefitRow(
                        icon: "dollarsign.circle.fill",
                        text: "Earn up to $5,000+ monthly",
                        color: LunaraColors.success
                    )
                    
                    BenefitRow(
                        icon: "calendar.badge.clock",
                        text: "Flexible scheduling & booking",
                        color: LunaraColors.info
                    )
                    
                    BenefitRow(
                        icon: "chart.line.uptrend.xyaxis",
                        text: "Grow your client base",
                        color: LunaraColors.warmGold
                    )
                }
                
                // CTA button
                HStack {
                    Spacer()
                    
                    HStack(spacing: 8) {
                        Text("List Your Business")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                        
                        Image(systemName: "arrow.right")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal, 24)
                    .padding(.vertical, 14)
                    .background(LunaraColors.warmGold)
                    .cornerRadius(25)
                    
                    Spacer()
                }
            }
            .padding(24)
            .background(
                LinearGradient(
                    gradient: Gradient(colors: [
                        LunaraColors.warmGold.opacity(0.05),
                        LunaraColors.warmGold.opacity(0.1)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(LunaraColors.warmGold.opacity(0.3), lineWidth: 1.5)
            )
            .cornerRadius(20)
            .shadow(
                color: LunaraColors.warmGold.opacity(0.2),
                radius: 12,
                x: 0,
                y: 6
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Benefit Row
struct BenefitRow: View {
    let icon: String
    let text: String
    let color: Color
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(color)
                .frame(width: 20)
            
            Text(text)
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(LunaraColors.primaryText)
            
            Spacer()
        }
    }
}

// MARK: - Corner Radius Extension
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

// MARK: - Preview Providers
struct UtilityComponents_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 20) {
            HStack(spacing: 12) {
                StatCard(
                    icon: "calendar.badge.clock",
                    value: "12",
                    label: "Today's Bookings",
                    color: LunaraColors.info
                )
                
                StatCard(
                    icon: "dollarsign.circle.fill",
                    value: "$1,240",
                    label: "This Week",
                    color: LunaraColors.success
                )
                
                StatCard(
                    icon: "star.fill",
                    value: "4.9",
                    label: "Rating",
                    color: LunaraColors.warmGold
                )
            }
            
            BusinessOpportunityEnhancedBannerView {
                print("Enhanced banner tapped")
            }
        }
        .padding()
        .previewLayout(.sizeThatFits)
    }
}
