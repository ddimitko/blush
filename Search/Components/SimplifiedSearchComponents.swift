//
//  SimplifiedSearchComponents.swift
//  LunaraApp
//
//  Created by Lunara Team on 30/07/2025.
//

import SwiftUI
import Kingfisher

// MARK: - Category Filter Chip
struct CategoryFilterChip: View {
    let title: String
    let icon: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: LunaraDesignSystem.Spacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .medium))
                
                Text(title)
                    .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .medium))
                    .lineLimit(1)
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

// MARK: - Simplified Search Shop Card
struct SimplifiedSearchShopCard: View {
    let shop: Shop
    let onTap: () -> Void
    
    @State private var currentImageIndex = 0
    @State private var imageCarouselTimer: Timer?
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 0) {
                // Shop Image with Carousel
                imageCarouselView
                
                // Shop Info
                shopInfoView
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
        .onAppear {
            startImageCarousel()
        }
        .onDisappear {
            stopImageCarousel()
        }
    }
    
    // MARK: - Image Carousel
    private var imageCarouselView: some View {
        ZStack(alignment: .topTrailing) {
            if let images = shop.gallery, !images.isEmpty {
                TabView(selection: $currentImageIndex) {
                    ForEach(Array(images.enumerated()), id: \.offset) { index, imageUrl in
                        KFImage(getImageURL(imageUrl))
                            .downloader(ImageService.shared.downloader)
                            .placeholder {
                                Rectangle()
                                    .fill(LunaraColors.coolLightGray)
                                    .overlay(
                                        Image(systemName: "photo")
                                            .font(.system(size: 20))
                                            .foregroundColor(LunaraColors.secondaryText)
                                    )
                            }
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .tag(index)
                    }
                }
                .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
                .animation(LunaraDesignSystem.Animation.easeInOut, value: currentImageIndex)
                .onChange(of: currentImageIndex) { oldValue, newValue in
                    // Clear timer when user manually swipes
                    if oldValue != newValue {
                        stopImageCarousel()
                        // Restart timer after a delay to allow for continuous manual swiping
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                            startImageCarousel()
                        }
                    }
                }
            } else {
                // Fallback image
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .overlay(
                        VStack(spacing: LunaraDesignSystem.Spacing.xs) {
                            Image(systemName: "storefront")
                                .font(.system(size: 20))
                                .foregroundColor(LunaraColors.secondaryText)
                            
                            Text(shop.name)
                                .font(.system(size: LunaraDesignSystem.Typography.caption, weight: .medium))
                                .foregroundColor(LunaraColors.secondaryText)
                                .lineLimit(1)
                                .padding(.horizontal, LunaraDesignSystem.Spacing.xs)
                        }
                    )
            }
            
            // Rating Badge
            if shop.ratingCount > 0 {
                HStack(spacing: LunaraDesignSystem.Spacing.xs) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 10))
                        .foregroundColor(LunaraColors.starFilled)
                    
                    Text(String(format: "%.1f", shop.ratingAverage))
                        .font(.system(size: LunaraDesignSystem.Typography.caption, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)
                }
                .padding(.horizontal, LunaraDesignSystem.Spacing.sm)
                .padding(.vertical, LunaraDesignSystem.Spacing.xs)
                .background(LunaraColors.white.opacity(0.95))
                .cornerRadius(LunaraDesignSystem.CornerRadius.chip)
                .shadow(color: LunaraColors.cardShadow, radius: 2, x: 0, y: 1)
                .padding(LunaraDesignSystem.Spacing.sm)
            }
        }
        .frame(height: 140)
        .clipped()
        .cornerRadius(LunaraDesignSystem.CornerRadius.card, corners: [.topLeft, .topRight])
    }
    
    // MARK: - Shop Info
    private var shopInfoView: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.sm) {
            // Shop name and status
            HStack {
                Text(shop.name)
                    .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                    .lineLimit(1)
                
                Spacer()
                
                // Open/Closed status
                HStack(spacing: LunaraDesignSystem.Spacing.xs) {
                    Circle()
                        .fill(shop.isOpen ? LunaraColors.success : LunaraColors.error)
                        .frame(width: 6, height: 6)
                    
                    Text(shop.isOpen ? "Open" : "Closed")
                        .font(.system(size: LunaraDesignSystem.Typography.caption, weight: .medium))
                        .foregroundColor(shop.isOpen ? LunaraColors.success : LunaraColors.error)
                }
            }
            
            // Business types
            if !shop.businessTypes.isEmpty {
                Text(shop.businessTypes.map { $0.displayName }.joined(separator: " • "))
                    .font(.system(size: LunaraDesignSystem.Typography.caption))
                    .foregroundColor(LunaraColors.secondaryText)
                    .lineLimit(1)
            }
            
            // Address and distance
            HStack {
                Text(shop.shortAddress)
                    .font(.system(size: LunaraDesignSystem.Typography.caption))
                    .foregroundColor(LunaraColors.secondaryText)
                    .lineLimit(1)
                
                Spacer()
                
                // Simulated distance
                Text(getDistanceText())
                    .font(.system(size: LunaraDesignSystem.Typography.caption, weight: .medium))
                    .foregroundColor(LunaraColors.warmGold)
            }
        }
        .padding(LunaraDesignSystem.Card.padding)
    }
    
    // MARK: - Helper Methods
    
    private func getImageURL(_ imageUrl: String) -> URL? {
        guard !imageUrl.isEmpty else { return nil }
        let fullUrl = imageUrl.starts(with: "http") ? imageUrl : "https://109.104.206.19:8443\(imageUrl)"
        return URL(string: fullUrl)
    }
    
    private func getDistanceText() -> String {
        // Simulate realistic distances
        let distances = ["0.3 km", "0.5 km", "0.8 km", "1.2 km", "1.5 km", "2.1 km"]
        let index = abs(shop.id.hashValue) % distances.count
        return distances[index]
    }
    
    private func startImageCarousel() {
        guard let images = shop.gallery, images.count > 1 else { return }
        
        imageCarouselTimer = Timer.scheduledTimer(withTimeInterval: LunaraDesignSystem.Carousel.autoScrollInterval, repeats: true) { _ in
            Task { @MainActor in
                withAnimation(.easeInOut(duration: LunaraDesignSystem.Carousel.transitionDuration)) {
                    currentImageIndex = (currentImageIndex + 1) % images.count
                }
            }
        }
    }
    
    private func stopImageCarousel() {
        imageCarouselTimer?.invalidate()
        imageCarouselTimer = nil
    }
}

// MARK: - Simplified Search Shop Card Skeleton
struct SimplifiedSearchShopCardSkeleton: View {
    var body: some View {
        VStack(spacing: 0) {
            // Image skeleton
            Rectangle()
                .fill(LunaraColors.coolLightGray)
                .frame(height: 140)
                .cornerRadius(LunaraDesignSystem.CornerRadius.card, corners: [.topLeft, .topRight])
            
            // Info skeleton
            VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.sm) {
                HStack {
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(height: 14)
                        .cornerRadius(4)
                    
                    Spacer()
                    
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(width: 40, height: 12)
                        .cornerRadius(4)
                }
                
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 12)
                    .cornerRadius(4)
                
                HStack {
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(height: 12)
                        .cornerRadius(4)
                    
                    Spacer()
                    
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(width: 30, height: 12)
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
