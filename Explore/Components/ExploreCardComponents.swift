//
//  ExploreCardComponents.swift
//  LunaraApp
//
//  Created by Lunara Team on 30/07/2025.
//

import SwiftUI
import Kingfisher

// MARK: - Featured Shop Card
struct FeaturedShopCard: View {
    let shop: Shop
    let onTap: () -> Void
    
    @State private var currentImageIndex = 0
    @State private var imageCarouselTimer: Timer?
    
    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 0) {
                // Image carousel
                imageCarouselView
                
                // Shop info
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
        ZStack {
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
                                            .font(.system(size: 24))
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
                
                // Page indicators
                if images.count > 1 {
                    VStack {
                        Spacer()
                        HStack(spacing: LunaraDesignSystem.Spacing.xs) {
                            ForEach(0..<images.count, id: \.self) { index in
                                Circle()
                                    .fill(currentImageIndex == index ? LunaraColors.white : LunaraColors.white.opacity(0.5))
                                    .frame(width: 6, height: 6)
                            }
                        }
                        .padding(.bottom, LunaraDesignSystem.Spacing.sm)
                    }
                    .allowsHitTesting(false) // Allow gestures to pass through
                }
            } else {
                // Fallback image
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .overlay(
                        VStack(spacing: LunaraDesignSystem.Spacing.xs) {
                            Image(systemName: "storefront")
                                .font(.system(size: 24))
                                .foregroundColor(LunaraColors.secondaryText)
                            
                            Text(shop.name)
                                .font(.system(size: LunaraDesignSystem.Typography.caption, weight: .medium))
                                .foregroundColor(LunaraColors.secondaryText)
                                .lineLimit(1)
                        }
                    )
            }
        }
        .frame(height: LunaraDesignSystem.Card.featuredShopHeight)
        .clipped()
        .cornerRadius(LunaraDesignSystem.CornerRadius.card, corners: [.topLeft, .topRight])
    }
    
    // MARK: - Shop Info
    private var shopInfoView: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.sm) {
            // Shop name and rating
            HStack {
                Text(shop.name)
                    .font(.system(size: LunaraDesignSystem.Typography.headline, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                    .lineLimit(1)
                
                Spacer()
                
                if shop.ratingCount > 0 {
                    HStack(spacing: LunaraDesignSystem.Spacing.xs) {
                        Image(systemName: "star.fill")
                            .font(.system(size: LunaraDesignSystem.Typography.caption))
                            .foregroundColor(LunaraColors.starFilled)
                        
                        Text(String(format: "%.1f", shop.ratingAverage))
                            .font(.system(size: LunaraDesignSystem.Typography.caption, weight: .medium))
                            .foregroundColor(LunaraColors.primaryText)
                    }
                }
            }
            
            // Business types
            if !shop.businessTypes.isEmpty {
                Text(shop.businessTypes.map { $0.displayName }.joined(separator: " • "))
                    .font(.system(size: LunaraDesignSystem.Typography.subheadline))
                    .foregroundColor(LunaraColors.secondaryText)
                    .lineLimit(1)
            }
            
            // Distance and status
            HStack {
                Text(getDistanceText())
                    .font(.system(size: LunaraDesignSystem.Typography.caption, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)
                
                Spacer()
                
                Text(shop.isOpen ? "Open" : "Closed")
                    .font(.system(size: LunaraDesignSystem.Typography.caption, weight: .semibold))
                    .foregroundColor(shop.isOpen ? LunaraColors.success : LunaraColors.warning)
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

// MARK: - Featured Shop Card Skeleton
struct FeaturedShopCardSkeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Image skeleton
            Rectangle()
                .fill(LunaraColors.coolLightGray)
                .frame(height: LunaraDesignSystem.Card.featuredShopHeight)
                .cornerRadius(LunaraDesignSystem.CornerRadius.card, corners: [.topLeft, .topRight])
            
            // Info skeleton
            VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.sm) {
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 16)
                    .cornerRadius(4)
                
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 14)
                    .cornerRadius(4)
                
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 12)
                    .cornerRadius(4)
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



// MARK: - Nearby Shop Card
struct NearbyShopCard: View {
    let shop: Shop
    let onTap: () -> Void

    @State private var currentImageIndex = 0
    @State private var imageCarouselTimer: Timer?

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                // Shop image with carousel
                shopImageView

                // Shop info
                VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                    // Name and rating
                    HStack {
                        Text(shop.name)
                            .font(.system(size: LunaraDesignSystem.Typography.headline, weight: .semibold))
                            .foregroundColor(LunaraColors.primaryText)
                            .lineLimit(1)

                        Spacer()

                        if shop.ratingCount > 0 {
                            HStack(spacing: LunaraDesignSystem.Spacing.xs) {
                                Image(systemName: "star.fill")
                                    .font(.system(size: LunaraDesignSystem.Typography.caption))
                                    .foregroundColor(LunaraColors.starFilled)

                                Text(String(format: "%.1f", shop.ratingAverage))
                                    .font(.system(size: LunaraDesignSystem.Typography.caption, weight: .medium))
                                    .foregroundColor(LunaraColors.primaryText)
                            }
                        }
                    }

                    // Business types
                    if !shop.businessTypes.isEmpty {
                        Text(shop.businessTypes.map { $0.displayName }.joined(separator: " • "))
                            .font(.system(size: LunaraDesignSystem.Typography.subheadline))
                            .foregroundColor(LunaraColors.secondaryText)
                            .lineLimit(1)
                    }

                    // Distance and status
                    HStack {
                        Text(getDistanceText())
                            .font(.system(size: LunaraDesignSystem.Typography.caption, weight: .medium))
                            .foregroundColor(LunaraColors.secondaryText)

                        Spacer()

                        Text(shop.isOpen ? "Open" : "Closed")
                            .font(.system(size: LunaraDesignSystem.Typography.caption, weight: .semibold))
                            .foregroundColor(shop.isOpen ? LunaraColors.success : LunaraColors.warning)
                    }
                }

                Spacer()
            }
            .padding(LunaraDesignSystem.Card.padding)
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

    // MARK: - Shop Image View
    private var shopImageView: some View {
        ZStack {
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
                                            .font(.system(size: 16))
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
                        Image(systemName: "storefront")
                            .font(.system(size: 20))
                            .foregroundColor(LunaraColors.secondaryText)
                    )
            }
        }
        .frame(width: LunaraDesignSystem.Card.shopListItemHeight, height: LunaraDesignSystem.Card.shopListItemHeight)
        .cornerRadius(LunaraDesignSystem.CornerRadius.md)
        .clipped()
    }

    // MARK: - Helper Methods

    private func getImageURL(_ imageUrl: String) -> URL? {
        guard !imageUrl.isEmpty else { return nil }
        let fullUrl = imageUrl.starts(with: "http") ? imageUrl : "https://109.104.206.19:8443\(imageUrl)"
        return URL(string: fullUrl)
    }

    private func getDistanceText() -> String {
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

// MARK: - Nearby Shop Card Skeleton
struct NearbyShopCardSkeleton: View {
    var body: some View {
        HStack(spacing: LunaraDesignSystem.Spacing.md) {
            // Image skeleton
            Rectangle()
                .fill(LunaraColors.coolLightGray)
                .frame(width: LunaraDesignSystem.Card.shopListItemHeight, height: LunaraDesignSystem.Card.shopListItemHeight)
                .cornerRadius(LunaraDesignSystem.CornerRadius.md)

            // Info skeleton
            VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 16)
                    .cornerRadius(4)

                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 14)
                    .cornerRadius(4)

                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 12)
                    .cornerRadius(4)
            }

            Spacer()
        }
        .padding(LunaraDesignSystem.Card.padding)
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

// MARK: - Explore Category Card
struct ExploreCategoryCard: View {
    let businessType: BusinessType
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: LunaraDesignSystem.Spacing.md) {
                // Icon
                Image(systemName: businessType.iconName)
                    .font(.system(size: 24, weight: .medium))
                    .foregroundColor(LunaraColors.warmGold)

                // Title
                Text(businessType.displayName)
                    .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .medium))
                    .foregroundColor(LunaraColors.primaryText)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
            .frame(maxWidth: .infinity)
            .frame(height: LunaraDesignSystem.Card.categorySize)
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
}

// MARK: - Explore Quick Action Card
struct ExploreQuickActionCard: View {
    let icon: String
    let title: String
    let subtitle: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                // Icon
                ZStack {
                    Circle()
                        .fill(color.opacity(0.1))
                        .frame(width: 48, height: 48)

                    Image(systemName: icon)
                        .font(.system(size: 20, weight: .medium))
                        .foregroundColor(color)
                }

                // Content
                VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                    Text(title)
                        .font(.system(size: LunaraDesignSystem.Typography.headline, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)

                    Text(subtitle)
                        .font(.system(size: LunaraDesignSystem.Typography.subheadline))
                        .foregroundColor(LunaraColors.secondaryText)
                }

                Spacer()

                // Arrow
                Image(systemName: "chevron.right")
                    .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)
            }
            .padding(LunaraDesignSystem.Card.padding)
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
}
