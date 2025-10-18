//
//  EnhancedHomeComponents.swift
//  LunaraApp
//
//  Created by Lunara Team on 27/07/2025.
//

import SwiftUI

// MARK: - Enhanced Quick Action Card
struct EnhancedQuickActionCard: View {
    let icon: String
    let title: String
    let subtitle: String
    let color: Color
    let badgeText: String?
    let isPrimary: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 16) {
                // Icon with badge
                ZStack {
                    // Icon background
                    Circle()
                        .fill(
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    color.opacity(isPrimary ? 0.2 : 0.1),
                                    color.opacity(isPrimary ? 0.3 : 0.15)
                                ]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 56, height: 56)
                    
                    Image(systemName: icon)
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundColor(color)
                    
                    // Badge
                    if let badgeText = badgeText {
                        VStack {
                            HStack {
                                Spacer()
                                Text(badgeText)
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(LunaraColors.error)
                                    .cornerRadius(8)
                                    .offset(x: 8, y: -8)
                            }
                            Spacer()
                        }
                    }
                }
                
                // Content
                VStack(spacing: 6) {
                    Text(title)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)
                        .multilineTextAlignment(.center)
                        .lineLimit(1)
                    
                    Text(subtitle)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                }
                
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 16)
            .frame(maxWidth: .infinity)
            .frame(height: 120)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(LunaraColors.cardBackground)
                    .shadow(
                        color: isPrimary ? color.opacity(0.2) : LunaraColors.cardShadow,
                        radius: isPrimary ? 6 : 3,
                        x: 0,
                        y: isPrimary ? 4 : 1
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(
                        isPrimary ? color.opacity(0.3) : Color.clear,
                        lineWidth: isPrimary ? 1.5 : 0
                    )
            )
        }
        .buttonStyle(PlainButtonStyle())
        .scaleEffect(1.0)
        .animation(.easeInOut(duration: 0.15), value: false)
    }
}

// MARK: - Discovery Story Card
struct DiscoveryStoryCard: View {
    let title: String
    let subtitle: String
    let imageName: String
    let isNew: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 0) {
                // Story image with gradient overlay
                ZStack {
                    Rectangle()
                        .fill(
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    LunaraColors.warmGold.opacity(0.3),
                                    LunaraColors.warmGold.opacity(0.6)
                                ]),
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                        .frame(height: 120)
                    
                    // Placeholder for actual image
                    Image(systemName: "photo.fill")
                        .font(.system(size: 32, weight: .light))
                        .foregroundColor(.white.opacity(0.8))
                    
                    // New badge
                    if isNew {
                        VStack {
                            HStack {
                                Spacer()
                                Text("NEW")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(LunaraColors.error)
                                    .cornerRadius(12)
                                    .offset(x: -8, y: 8)
                            }
                            Spacer()
                        }
                    }
                }
                .cornerRadius(16, corners: [.topLeft, .topRight])
                
                // Story content
                VStack(alignment: .leading, spacing: 8) {
                    Text(title)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)
                        .lineLimit(1)
                    
                    Text(subtitle)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)
                        .lineLimit(2)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .frame(width: 150)
            .background(LunaraColors.cardBackground)
            .cornerRadius(12)
            .shadow(color: LunaraColors.cardShadow, radius: 4, x: 0, y: 2)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Personalized Recommendation Card
struct PersonalizedRecommendationCard: View {
    let serviceName: String
    let shopName: String
    let price: String
    let rating: Double
    let distance: String
    let isPopular: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 12) {
                // Service image placeholder
                ZStack {
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(height: 100)
                        .cornerRadius(12)
                    
                    Image(systemName: "scissors")
                        .font(.system(size: 24, weight: .medium))
                        .foregroundColor(LunaraColors.warmGold)
                    
                    // Popular badge
                    if isPopular {
                        VStack {
                            HStack {
                                Spacer()
                                HStack(spacing: 4) {
                                    Image(systemName: "flame.fill")
                                        .font(.system(size: 10, weight: .medium))
                                        .foregroundColor(.white)
                                    
                                    Text("Popular")
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundColor(.white)
                                }
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(LunaraColors.warning)
                                .cornerRadius(12)
                                .offset(x: -8, y: 8)
                            }
                            Spacer()
                        }
                    }
                }
                
                // Service details
                VStack(alignment: .leading, spacing: 6) {
                    Text(serviceName)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)
                        .lineLimit(1)
                    
                    Text(shopName)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)
                        .lineLimit(1)
                    
                    HStack {
                        // Rating
                        HStack(spacing: 2) {
                            Image(systemName: "star.fill")
                                .font(.system(size: 11))
                                .foregroundColor(LunaraColors.starFilled)
                            
                            Text(String(format: "%.1f", rating))
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(LunaraColors.primaryText)
                        }
                        
                        Spacer()
                        
                        // Distance
                        Text(distance)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                    
                    // Price
                    Text(price)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(LunaraColors.warmGold)
                }
                .padding(.horizontal, 4)
            }
            .padding(10)
            .background(LunaraColors.cardBackground)
            .cornerRadius(12)
            .shadow(color: LunaraColors.cardShadow, radius: 3, x: 0, y: 1)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Trending Service Card
struct TrendingServiceCard: View {
    let serviceName: String
    let shopName: String
    let price: String
    let bookingCount: Int
    let isHot: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 12) {
                // Service header with hot indicator
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(serviceName)
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(LunaraColors.primaryText)
                            .lineLimit(1)
                        
                        Text(shopName)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(LunaraColors.secondaryText)
                            .lineLimit(1)
                    }
                    
                    Spacer()
                    
                    if isHot {
                        Image(systemName: "flame.fill")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(LunaraColors.warning)
                    }
                }
                
                // Booking stats
                HStack {
                    Text("\(bookingCount) bookings")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(LunaraColors.success)
                    
                    Spacer()
                    
                    Text(price)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(LunaraColors.warmGold)
                }
            }
            .padding(12)
            .frame(width: 160)
            .background(LunaraColors.cardBackground)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(
                        isHot ? LunaraColors.warning.opacity(0.3) : Color.clear,
                        lineWidth: isHot ? 1.5 : 0
                    )
            )
            .shadow(
                color: isHot ? LunaraColors.warning.opacity(0.15) : LunaraColors.cardShadow,
                radius: isHot ? 4 : 3,
                x: 0,
                y: isHot ? 3 : 2
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}
