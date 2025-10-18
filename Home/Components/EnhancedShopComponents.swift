//
//  EnhancedShopComponents.swift
//  LunaraApp
//
//  Created by Lunara Team on 27/07/2025.
//

import SwiftUI
import Kingfisher

// MARK: - Enhanced Shop Card
struct EnhancedShopCard: View {
    let shop: Shop
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Shop image with enhanced overlay
            ZStack {
                KFImage(getShopImageURL(shop))
                    .downloader(ImageService.shared.downloader)
                    .onFailure { error in
                        // Only log if it's not an expected empty source error
                        if case .imageSettingError(let reason) = error,
                           case .emptySource = reason {
                            // Expected behavior for shops without images - no need to log
                        } else {
                            print("❌ Enhanced shop image loading failed: \(error) for shop: \(shop.name)")
                        }
                    }
                    .placeholder {
                        Rectangle()
                            .fill(
                                LinearGradient(
                                    gradient: Gradient(colors: [
                                        LunaraColors.coolLightGray,
                                        LunaraColors.coolLightGray.opacity(0.7)
                                    ]),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .overlay(
                                Image(systemName: "storefront")
                                    .font(.system(size: 32, weight: .light))
                                    .foregroundColor(LunaraColors.charcoalGray.opacity(0.4))
                            )
                    }
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                .frame(height: 160)
                .clipped()
                
                // Gradient overlay for better text readability
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color.clear,
                        Color.black.opacity(0.3)
                    ]),
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 160)
                
                // Shop status and rating overlay
                VStack {
                    HStack {
                        // Open/Closed status
                        HStack(spacing: 4) {
                            Circle()
                                .fill(shop.isOpen ? LunaraColors.success : LunaraColors.error)
                                .frame(width: 8, height: 8)
                            
                            Text(shop.isOpen ? "Open" : "Closed")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.white)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.black.opacity(0.6))
                        .cornerRadius(12)
                        
                        Spacer()
                        
                        // Rating
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill")
                                .font(.system(size: 12))
                                .foregroundColor(LunaraColors.starFilled)
                            
                            Text(shop.formattedRating)
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(.white)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.black.opacity(0.6))
                        .cornerRadius(12)
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                    
                    Spacer()
                }
            }
            .cornerRadius(20, corners: [.topLeft, .topRight])
            
            // Shop information
            VStack(alignment: .leading, spacing: 12) {
                // Shop name and business types
                VStack(alignment: .leading, spacing: 6) {
                    Text(shop.name)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)
                        .lineLimit(1)
                    
                    // Business types as tags
                    if !shop.businessTypes.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 6) {
                                ForEach(shop.businessTypes.prefix(3), id: \.self) { businessType in
                                    Text(businessType.displayName)
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundColor(LunaraColors.warmGold)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(LunaraColors.warmGold.opacity(0.15))
                                        .cornerRadius(8)
                                }
                            }
                        }
                    }
                }
                
                // Location and distance
                HStack(spacing: 8) {
                    Image(systemName: "location.fill")
                        .font(.system(size: 12))
                        .foregroundColor(LunaraColors.secondaryText)
                    
                    Text(shop.shortAddress)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)
                        .lineLimit(1)
                    
                    Spacer()
                    
                    Text(getDistanceText(for: shop))
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(LunaraColors.warmGold)
                }
                
                // Social proof and booking info
                HStack {
                    // Recent booking indicator
                    HStack(spacing: 4) {
                        Image(systemName: "clock.fill")
                            .font(.system(size: 11))
                            .foregroundColor(LunaraColors.success)

                        Text(getBookingActivityText(for: shop))
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(LunaraColors.success)
                    }
                    
                    Spacer()
                    
                    // Quick book button
                    Button(action: {
                        // Quick book action
                    }) {
                        Text("Book Now")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(LunaraColors.warmGold)
                            .cornerRadius(16)
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 12)
        }
        .background(LunaraColors.cardBackground)
        .cornerRadius(16)
        .shadow(
            color: LunaraColors.cardShadow.opacity(0.6),
            radius: 8,
            x: 0,
            y: 4
        )
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

// MARK: - Enhanced Shop List Item
struct EnhancedShopListItem: View {
    let shop: Shop
    
    var body: some View {
        HStack(spacing: 16) {
            // Shop image with status indicator
            ZStack {
                KFImage(getShopImageURL(shop))
                    .downloader(ImageService.shared.downloader)
                    .onFailure { error in
                        // Only log if it's not an expected empty source error
                        if case .imageSettingError(let reason) = error,
                           case .emptySource = reason {
                            // Expected behavior for shops without images - no need to log
                        } else {
                            print("❌ Enhanced shop list image loading failed: \(error) for shop: \(shop.name)")
                        }
                    }
                    .placeholder {
                        Rectangle()
                            .fill(LunaraColors.coolLightGray)
                            .overlay(
                                Image(systemName: "storefront")
                                    .foregroundColor(LunaraColors.charcoalGray.opacity(0.3))
                            )
                    }
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                .frame(width: 90, height: 90)
                .clipped()
                .cornerRadius(16)
                
                // Status indicator
                VStack {
                    HStack {
                        Spacer()
                        Circle()
                            .fill(shop.isOpen ? LunaraColors.success : LunaraColors.error)
                            .frame(width: 12, height: 12)
                            .overlay(
                                Circle()
                                    .stroke(Color.white, lineWidth: 2)
                            )
                            .offset(x: 4, y: -4)
                    }
                    Spacer()
                }
            }
            
            // Shop information
            VStack(alignment: .leading, spacing: 8) {
                // Name and rating
                HStack {
                    Text(shop.name)
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)
                        .lineLimit(1)
                    
                    Spacer()
                    
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.starFilled)
                        
                        Text(shop.formattedRating)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(LunaraColors.primaryText)
                    }
                }
                
                // Address
                Text(shop.shortAddress)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)
                    .lineLimit(1)
                
                // Business types and social proof
                HStack {
                    if !shop.businessTypes.isEmpty {
                        Text(shop.businessTypes.first?.displayName ?? "")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(LunaraColors.warmGold)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(LunaraColors.warmGold.opacity(0.15))
                            .cornerRadius(6)
                    }
                    
                    Spacer()
                    
                    // Social proof
                    HStack(spacing: 4) {
                        Image(systemName: "person.2.fill")
                            .font(.system(size: 11))
                            .foregroundColor(LunaraColors.info)

                        Text(getSocialProofText(for: shop))
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(LunaraColors.info)
                    }
                }
                
                // Distance and availability
                HStack {
                    Text(getDistanceText(for: shop))
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)

                    Spacer()

                    Text(getAvailabilityText(for: shop))
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(shop.isOpen ? LunaraColors.success : LunaraColors.warning)
                }
            }
        }
        .padding(12)
        .background(LunaraColors.cardBackground)
        .cornerRadius(16)
        .shadow(color: LunaraColors.cardShadow, radius: 4, x: 0, y: 2)
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

// MARK: - Enhanced Skeleton Views
struct EnhancedShopCardSkeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Rectangle()
                .fill(LunaraColors.coolLightGray)
                .frame(height: 160)
                .cornerRadius(20, corners: [.topLeft, .topRight])
            
            VStack(alignment: .leading, spacing: 12) {
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 18)
                    .cornerRadius(4)
                
                HStack(spacing: 6) {
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(width: 60, height: 16)
                        .cornerRadius(8)
                    
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(width: 50, height: 16)
                        .cornerRadius(8)
                }
                
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 14)
                    .cornerRadius(4)
                
                HStack {
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(width: 80, height: 12)
                        .cornerRadius(4)
                    
                    Spacer()
                    
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(width: 60, height: 24)
                        .cornerRadius(12)
                }
            }
            .padding(16)
        }
        .frame(width: 300)
        .background(LunaraColors.cardBackground)
        .cornerRadius(20)
        .shadow(color: LunaraColors.cardShadow, radius: 6, x: 0, y: 3)
    }
}

struct EnhancedShopListItemSkeleton: View {
    var body: some View {
        HStack(spacing: 16) {
            Rectangle()
                .fill(LunaraColors.coolLightGray)
                .frame(width: 90, height: 90)
                .cornerRadius(16)
            
            VStack(alignment: .leading, spacing: 8) {
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 17)
                    .cornerRadius(4)
                
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 14)
                    .cornerRadius(4)
                
                HStack {
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(width: 60, height: 16)
                        .cornerRadius(6)
                    
                    Spacer()
                    
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(width: 50, height: 12)
                        .cornerRadius(4)
                }
                
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 12)
                    .cornerRadius(4)
            }
        }
        .padding(12)
        .background(LunaraColors.cardBackground)
        .cornerRadius(16)
        .shadow(color: LunaraColors.cardShadow, radius: 4, x: 0, y: 2)
    }
}

// MARK: - Helper Functions
extension EnhancedShopCard {
    private func getDistanceText(for shop: Shop) -> String {
        // In a real app, this would calculate actual distance using location services
        // For now, simulate realistic distances based on shop ID
        let distances = ["0.3 km", "0.5 km", "0.8 km", "1.2 km", "1.5 km", "2.1 km"]
        let index = abs(shop.id.hashValue) % distances.count
        return distances[index]
    }

    private func getBookingActivityText(for shop: Shop) -> String {
        let hour = Calendar.current.component(.hour, from: Date())
        let baseActivity = abs(shop.id.hashValue) % 8 + 1

        // Adjust activity based on time of day
        let adjustedActivity: Int = {
            switch hour {
            case 9...12: return baseActivity + 2  // Morning rush
            case 13...17: return baseActivity + 4 // Afternoon peak
            case 18...20: return baseActivity + 3 // Evening appointments
            default: return max(1, baseActivity - 2) // Off hours
            }
        }()

        switch adjustedActivity {
        case 1:
            return "1 booked today"
        case 2...5:
            return "\(adjustedActivity) booked today"
        case 6...10:
            return "\(adjustedActivity) booked today"
        default:
            return "Very popular today"
        }
    }
}

extension EnhancedShopListItem {
    private func getDistanceText(for shop: Shop) -> String {
        let distances = ["0.2 km", "0.4 km", "0.7 km", "1.0 km", "1.3 km", "1.8 km"]
        let index = abs(shop.id.hashValue) % distances.count
        return distances[index]
    }

    private func getSocialProofText(for shop: Shop) -> String {
        let bookingCount = abs(shop.id.hashValue) % 12 + 1
        return "\(bookingCount) booked"
    }

    private func getAvailabilityText(for shop: Shop) -> String {
        if shop.isOpen {
            let nextSlots = ["Available now", "Next slot 2pm", "Next slot 3:30pm", "Booking fast"]
            let index = abs(shop.id.hashValue) % nextSlots.count
            return nextSlots[index]
        } else {
            return "Opens tomorrow"
        }
    }
}
