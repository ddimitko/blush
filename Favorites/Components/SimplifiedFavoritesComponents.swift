//
//  SimplifiedFavoritesComponents.swift
//  LunaraApp
//
//  Created by Lunara Team on 30/07/2025.
//

import SwiftUI
import Kingfisher

// MARK: - Favorites Filter Chip
struct FavoritesFilterChip: View {
    let filter: FavoritesFilter
    let isSelected: Bool
    let count: Int
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: LunaraDesignSystem.Spacing.sm) {
                Image(systemName: filter.iconName)
                    .font(.system(size: 14, weight: .medium))
                
                Text(filter.displayName)
                    .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .medium))
                
                if count > 0 && filter != .all {
                    Text("\(count)")
                        .font(.system(size: LunaraDesignSystem.Typography.caption, weight: .semibold))
                        .foregroundColor(isSelected ? LunaraColors.warmGold : LunaraColors.white)
                        .padding(.horizontal, LunaraDesignSystem.Spacing.xs)
                        .padding(.vertical, 2)
                        .background(isSelected ? LunaraColors.white : LunaraColors.warmGold)
                        .cornerRadius(8)
                }
            }
            .foregroundColor(isSelected ? LunaraColors.white : LunaraColors.warmGold)
            .padding(.horizontal, LunaraDesignSystem.Spacing.lg)
            .padding(.vertical, LunaraDesignSystem.Spacing.sm)
            .background(isSelected ? LunaraColors.warmGold : LunaraColors.warmGold.opacity(0.1))
            .cornerRadius(LunaraDesignSystem.CornerRadius.chip)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Simplified Favorite Shop Card
struct SimplifiedFavoriteShopCard: View {
    let shop: Shop
    let onTap: () -> Void
    
    @EnvironmentObject var favoritesService: FavoritesService
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 0) {
                // Shop Image with Favorite Button
                imageSection
                
                // Shop Information
                infoSection
            }
            .background(LunaraColors.cardBackground)
            .cornerRadius(LunaraDesignSystem.CornerRadius.card)
            .shadow(
                color: LunaraColors.cardShadow,
                radius: LunaraDesignSystem.Card.shadowRadius,
                x: LunaraDesignSystem.Card.shadowOffset.width,
                y: LunaraDesignSystem.Card.shadowOffset.height
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    // MARK: - Image Section
    private var imageSection: some View {
        ZStack(alignment: .topTrailing) {
            // Shop Image
            if let imageUrl = shop.displayImage, let url = URL(string: imageUrl) {
                KFImage(url)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(height: 160)
                    .clipped()
            } else {
                Rectangle()
                    .fill(LunaraColors.coolLightGray.opacity(0.3))
                    .frame(height: 160)
                    .overlay(
                        Image(systemName: "photo")
                            .font(.system(size: 32))
                            .foregroundColor(LunaraColors.secondaryText)
                    )
            }
            
            // Favorite Button
            Button(action: {
                Task {
                    await toggleFavorite()
                }
            }) {
                Image(systemName: "heart.fill")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundColor(LunaraColors.error)
                    .padding(LunaraDesignSystem.Spacing.sm)
                    .background(
                        Circle()
                            .fill(LunaraColors.white)
                            .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
                    )
            }
            .padding(LunaraDesignSystem.Spacing.md)
        }
    }
    
    // MARK: - Info Section
    private var infoSection: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.sm) {
            // Shop Name and Rating
            HStack {
                Text(shop.name)
                    .font(.system(size: LunaraDesignSystem.Typography.headline, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                    .lineLimit(1)
                
                Spacer()
                
                // Rating
                HStack(spacing: LunaraDesignSystem.Spacing.xs) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 12))
                        .foregroundColor(LunaraColors.warmGold)
                    
                    Text(String(format: "%.1f", shop.ratingAverage))
                        .font(.system(size: LunaraDesignSystem.Typography.caption, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)
                }
            }
            
            // Business Types
            Text(shop.businessTypes.map { $0.displayName }.joined(separator: " • "))
                .font(.system(size: LunaraDesignSystem.Typography.subheadline))
                .foregroundColor(LunaraColors.warmGold)
                .lineLimit(1)
            
            // Address
            HStack(spacing: LunaraDesignSystem.Spacing.xs) {
                Image(systemName: "location")
                    .font(.system(size: 12))
                    .foregroundColor(LunaraColors.secondaryText)
                
                Text(shop.address)
                    .font(.system(size: LunaraDesignSystem.Typography.caption))
                    .foregroundColor(LunaraColors.secondaryText)
                    .lineLimit(1)
            }
            
            // Rating count and location
            HStack {
                // Rating count
                Text("\(shop.ratingCount) reviews")
                    .font(.system(size: LunaraDesignSystem.Typography.caption, weight: .medium))
                    .foregroundColor(LunaraColors.success)

                Spacer()

                // City and state
                Text(shop.shortAddress)
                    .font(.system(size: LunaraDesignSystem.Typography.caption))
                    .foregroundColor(LunaraColors.secondaryText)
            }
        }
        .padding(LunaraDesignSystem.Card.padding)
    }
    
    // MARK: - Actions
    
    private func toggleFavorite() async {
        _ = await favoritesService.removeFromFavorites(shopId: shop.id)
    }
}

// MARK: - Simplified Favorite Shop Card Skeleton
struct SimplifiedFavoriteShopCardSkeleton: View {
    var body: some View {
        VStack(spacing: 0) {
            // Image skeleton
            Rectangle()
                .fill(LunaraColors.coolLightGray)
                .frame(height: 160)
            
            // Info skeleton
            VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.sm) {
                // Name and rating skeleton
                HStack {
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(height: 16)
                        .cornerRadius(4)
                    
                    Spacer()
                    
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(width: 40, height: 14)
                        .cornerRadius(4)
                }
                
                // Business types skeleton
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(width: 120, height: 14)
                    .cornerRadius(4)
                
                // Address skeleton
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(width: 180, height: 12)
                    .cornerRadius(4)
                
                // Price and distance skeleton
                HStack {
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(width: 60, height: 12)
                        .cornerRadius(4)
                    
                    Spacer()
                    
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(width: 50, height: 12)
                        .cornerRadius(4)
                }
            }
            .padding(LunaraDesignSystem.Card.padding)
        }
        .background(LunaraColors.cardBackground)
        .cornerRadius(LunaraDesignSystem.CornerRadius.card)
        .shadow(
            color: LunaraColors.cardShadow,
            radius: LunaraDesignSystem.Card.shadowRadius,
            x: LunaraDesignSystem.Card.shadowOffset.width,
            y: LunaraDesignSystem.Card.shadowOffset.height
        )
    }
}
