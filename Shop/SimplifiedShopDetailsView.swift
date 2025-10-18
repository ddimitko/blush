//
//  SimplifiedShopDetailsView.swift
//  LunaraApp
//
//  Created by Lunara Team on 30/07/2025.
//

import SwiftUI
import Kingfisher

/// Simplified shop details view with clean, elegant design
struct SimplifiedShopDetailsView: View {
    // MARK: - Properties
    let shop: Shop
    
    // MARK: - Environment Objects
    @EnvironmentObject var authService: AuthenticationService
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var favoritesService: FavoritesService
    
    // MARK: - State
    @State private var services: [Service] = []
    @State private var employees: [Employee] = []
    @State private var reviews: [Review] = []
    @State private var isLoadingData = true
    @State private var currentImageIndex = 0
    @State private var imageCarouselTimer: Timer?
    @State private var showingFullDescription = false
    @State private var showingAllServices = false
    @State private var showingAllEmployees = false
    @State private var showingAllReviews = false
    @State private var showingGallery = false
    
    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                // Hero Image Section with Carousel
                heroImageSection

                // Shop Info Section
                shopInfoSection

                // Quick Actions
                quickActionsSection

                // Services Preview
                servicesPreviewSection

                // Employees Preview
                employeesPreviewSection

                // Reviews Preview
                reviewsPreviewSection

                // Essential Info
                essentialInfoSection
            }
        }
        .navigationBarHidden(true)
        .background(LunaraColors.background)
        .onAppear {
            loadShopData()
            startImageCarousel()
            
            // Load favorite status if authenticated
            if authService.isAuthenticated {
                Task {
                    await favoritesService.loadFavoriteStatus(shopId: shop.id)
                }
            }
        }
        .onDisappear {
            stopImageCarousel()
        }
        .sheet(isPresented: $showingGallery) {
            ShopGalleryView(images: shop.gallery ?? [], selectedIndex: $currentImageIndex)
        }
        .sheet(isPresented: $showingAllServices) {
            AllServicesView(shop: shop)
        }
        .sheet(isPresented: $showingAllEmployees) {
            AllEmployeesView(shop: shop, employees: employees)
        }
        .sheet(isPresented: $showingAllReviews) {
            AllReviewsView(shop: shop)
        }
    }
    
    // MARK: - Hero Image Section
    private var heroImageSection: some View {
        ZStack(alignment: .topTrailing) {
            // Image Carousel
            imageCarouselView

            // Favorite Button
            favoriteButton

            // Gallery Indicator
            galleryIndicator
        }
        .frame(height: 300)
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
                                        VStack(spacing: LunaraDesignSystem.Spacing.sm) {
                                            Image(systemName: "photo")
                                                .font(.system(size: 32))
                                                .foregroundColor(LunaraColors.secondaryText)

                                            Text(shop.name)
                                                .font(.system(size: LunaraDesignSystem.Typography.headline, weight: .medium))
                                                .foregroundColor(LunaraColors.secondaryText)
                                                .multilineTextAlignment(.center)
                                        }
                                    )
                            }
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .clipped()
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
                .onTapGesture {
                    // Tap gesture on the entire TabView to open gallery
                    if images.count > 0 {
                        showingGallery = true
                    }
                }

                // Gradient overlay for better text readability
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color.clear,
                        Color.black.opacity(0.3)
                    ]),
                    startPoint: .top,
                    endPoint: .bottom
                )
                .allowsHitTesting(false) // Allow gestures to pass through

                // Page indicators
                if images.count > 1 {
                    VStack {
                        Spacer()
                        HStack(spacing: LunaraDesignSystem.Spacing.xs) {
                            ForEach(0..<images.count, id: \.self) { index in
                                Circle()
                                    .fill(currentImageIndex == index ? LunaraColors.white : LunaraColors.white.opacity(0.5))
                                    .frame(width: 8, height: 8)
                            }
                        }
                        .padding(.bottom, LunaraDesignSystem.Spacing.lg)
                    }
                    .allowsHitTesting(false) // Allow gestures to pass through
                }
            } else {
                // Fallback for shops without images
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .overlay(
                        VStack(spacing: LunaraDesignSystem.Spacing.md) {
                            Image(systemName: "storefront")
                                .font(.system(size: 48))
                                .foregroundColor(LunaraColors.secondaryText)
                            
                            Text(shop.name)
                                .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                                .foregroundColor(LunaraColors.primaryText)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, LunaraDesignSystem.Spacing.lg)
                        }
                    )
            }
        }
        .clipped()
    }
    
    // MARK: - Navigation Buttons
    private var favoriteButton: some View {
        HStack {
            Spacer()
            
            if authService.isAuthenticated {
                Button(action: {
                    Task {
                        await favoritesService.toggleFavorite(shopId: shop.id)
                    }
                }) {
                    Image(systemName: favoritesService.isShopFavorited(shop.id) ? "heart.fill" : "heart")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(favoritesService.isShopFavorited(shop.id) ? LunaraColors.error : LunaraColors.white)
                        .frame(width: 40, height: 40)
                        .background(Color.black.opacity(0.3))
                        .clipShape(Circle())
                }
                .padding(.top, 50)
                .padding(.trailing, LunaraDesignSystem.Layout.horizontalMargin)
            }
        }
    }
    
    private var galleryIndicator: some View {
        VStack {
            Spacer()
            
            if (shop.gallery?.count ?? 0) > 1 {
                HStack {
                    HStack(spacing: LunaraDesignSystem.Spacing.xs) {
                        Image(systemName: "photo.stack")
                            .font(.system(size: 12, weight: .medium))
                        
                        Text("\(shop.gallery?.count ?? 0) photos")
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundColor(LunaraColors.white)
                    .padding(.horizontal, LunaraDesignSystem.Spacing.md)
                    .padding(.vertical, LunaraDesignSystem.Spacing.sm)
                    .background(Color.black.opacity(0.5))
                    .cornerRadius(LunaraDesignSystem.CornerRadius.chip)
                    
                    Spacer()
                }
                .padding(.leading, LunaraDesignSystem.Layout.horizontalMargin)
                .padding(.bottom, LunaraDesignSystem.Spacing.lg)
            }
        }
    }

    // MARK: - Shop Info Section
    private var shopInfoSection: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.lg) {
            // Shop name and status
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.sm) {
                    Text(shop.name)
                        .font(.system(size: LunaraDesignSystem.Typography.largeTitle, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)

                    // Business types
                    if !shop.businessTypes.isEmpty {
                        Text(shop.businessTypes.map { $0.displayName }.joined(separator: " • "))
                            .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .medium))
                            .foregroundColor(LunaraColors.warmGold)
                    }
                }

                Spacer()

                // Open/Closed status
                HStack(spacing: LunaraDesignSystem.Spacing.xs) {
                    Circle()
                        .fill(shop.isOpen ? LunaraColors.success : LunaraColors.error)
                        .frame(width: 8, height: 8)

                    Text(shop.isOpen ? "Open" : "Closed")
                        .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .semibold))
                        .foregroundColor(shop.isOpen ? LunaraColors.success : LunaraColors.error)
                }
            }

            // Rating and reviews
            if shop.ratingCount > 0 {
                HStack(spacing: LunaraDesignSystem.Spacing.sm) {
                    HStack(spacing: LunaraDesignSystem.Spacing.xs) {
                        ForEach(0..<5) { index in
                            Image(systemName: index < Int(shop.ratingAverage) ? "star.fill" : "star")
                                .font(.system(size: 14))
                                .foregroundColor(LunaraColors.starFilled)
                        }
                    }

                    Text(String(format: "%.1f", shop.ratingAverage))
                        .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)

                    Text("(\(shop.ratingCount) reviews)")
                        .font(.system(size: LunaraDesignSystem.Typography.subheadline))
                        .foregroundColor(LunaraColors.secondaryText)
                }
            }

            // Description
            if !shop.description.isEmpty {
                VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.sm) {
                    Text(showingFullDescription ? shop.description : String(shop.description.prefix(120)))
                        .font(.system(size: LunaraDesignSystem.Typography.body))
                        .foregroundColor(LunaraColors.primaryText)
                        .lineLimit(showingFullDescription ? nil : 3)

                    if shop.description.count > 120 {
                        Button(action: {
                            withAnimation(LunaraDesignSystem.Animation.easeInOut) {
                                showingFullDescription.toggle()
                            }
                        }) {
                            Text(showingFullDescription ? "Show less" : "Show more")
                                .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .medium))
                                .foregroundColor(LunaraColors.warmGold)
                        }
                    }
                }
            }

            // Address
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                Image(systemName: "location")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(LunaraColors.warmGold)

                Text(shop.fullAddress)
                    .font(.system(size: LunaraDesignSystem.Typography.body))
                    .foregroundColor(LunaraColors.primaryText)
                    .lineLimit(2)

                Spacer()
            }
        }
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        .padding(.top, LunaraDesignSystem.Spacing.xl)
    }

    // MARK: - Quick Actions Section
    private var quickActionsSection: some View {
        HStack(spacing: LunaraDesignSystem.Spacing.md) {
            // Book Appointment - Primary Action
            Button(action: {
                appState.presentSheet(.bookingFlow(shop, nil))
            }) {
                HStack(spacing: LunaraDesignSystem.Spacing.sm) {
                    Image(systemName: "calendar.badge.plus")
                        .font(.system(size: 16, weight: .semibold))

                    Text("Book Now")
                        .font(.system(size: LunaraDesignSystem.Typography.body, weight: .semibold))
                }
                .foregroundColor(LunaraColors.buttonPrimaryText)
                .frame(maxWidth: .infinity)
                .padding(.vertical, LunaraDesignSystem.Spacing.lg)
                .background(LunaraColors.warmGold)
                .cornerRadius(LunaraDesignSystem.CornerRadius.button)
            }

            // Call Button
            Button(action: {
                if let phoneURL = URL(string: "tel:\(shop.phone)") {
                    UIApplication.shared.open(phoneURL)
                }
            }) {
                Image(systemName: "phone.fill")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(LunaraColors.warmGold)
                    .frame(width: 52, height: 52)
                    .background(LunaraColors.warmGold.opacity(0.1))
                    .cornerRadius(LunaraDesignSystem.CornerRadius.button)
            }

            // Directions Button
            Button(action: {
                openMaps()
            }) {
                Image(systemName: "location.fill")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(LunaraColors.warmGold)
                    .frame(width: 52, height: 52)
                    .background(LunaraColors.warmGold.opacity(0.1))
                    .cornerRadius(LunaraDesignSystem.CornerRadius.button)
            }
        }
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        .padding(.top, LunaraDesignSystem.Spacing.xl)
    }

    // MARK: - Services Preview Section
    private var servicesPreviewSection: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.lg) {
            HStack {
                Text("Services")
                    .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)

                Spacer()

                if services.count > 3 {
                    Button("See All (\(services.count))") {
                        showingAllServices = true
                    }
                    .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .medium))
                    .foregroundColor(LunaraColors.warmGold)
                }
            }

            if isLoadingData {
                servicesSkeletonView
            } else if services.isEmpty {
                emptyServicesView
            } else {
                servicesListView
            }
        }
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        .padding(.top, LunaraDesignSystem.Layout.sectionSpacing)
    }

    private var servicesListView: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.md) {
            ForEach(services.prefix(3)) { service in
                ServicePreviewCard(service: service) {
                    appState.presentSheet(.bookingFlow(shop, service))
                }
            }
        }
    }

    private var servicesSkeletonView: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.md) {
            ForEach(0..<3, id: \.self) { _ in
                ServicePreviewCardSkeleton()
            }
        }
    }

    private var emptyServicesView: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.md) {
            Image(systemName: "scissors")
                .font(.system(size: 32))
                .foregroundColor(LunaraColors.coolLightGray)

            Text("No services available")
                .font(.system(size: LunaraDesignSystem.Typography.subheadline))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(height: 120)
    }

    // MARK: - Employees Preview Section
    private var employeesPreviewSection: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.lg) {
            HStack {
                Text("Team")
                    .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)

                Spacer()

                if employees.count > 3 {
                    Button("See All (\(employees.count))") {
                        showingAllEmployees = true
                    }
                    .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .medium))
                    .foregroundColor(LunaraColors.warmGold)
                }
            }

            if isLoadingData {
                employeesSkeletonView
            } else if employees.isEmpty {
                emptyEmployeesView
            } else {
                employeesScrollView
            }
        }
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        .padding(.top, LunaraDesignSystem.Layout.sectionSpacing)
    }

    private var employeesScrollView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                ForEach(employees.prefix(4)) { employee in
                    EmployeePreviewCard(employee: employee) {
                        // TODO: Navigate to employee details
                    }
                    .frame(width: 120)
                }
            }
            .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        }
        .padding(.horizontal, -LunaraDesignSystem.Layout.horizontalMargin)
    }

    private var employeesSkeletonView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                ForEach(0..<3, id: \.self) { _ in
                    EmployeePreviewCardSkeleton()
                        .frame(width: 120)
                }
            }
            .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        }
        .padding(.horizontal, -LunaraDesignSystem.Layout.horizontalMargin)
    }

    private var emptyEmployeesView: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.md) {
            Image(systemName: "person.2")
                .font(.system(size: 32))
                .foregroundColor(LunaraColors.coolLightGray)

            Text("No team members available")
                .font(.system(size: LunaraDesignSystem.Typography.subheadline))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(height: 120)
    }

    // MARK: - Reviews Preview Section
    private var reviewsPreviewSection: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.lg) {
            HStack {
                Text("Reviews")
                    .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)

                Spacer()

                if shop.ratingCount > 0 {
                    Button("See All (\(shop.ratingCount))") {
                        showingAllReviews = true
                    }
                    .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .medium))
                    .foregroundColor(LunaraColors.warmGold)
                }
            }

            if shop.ratingCount == 0 {
                emptyReviewsView
            } else {
                reviewsSummaryView

                if isLoadingData {
                    reviewsSkeletonView
                } else if reviews.isEmpty {
                    Text("Loading reviews...")
                        .font(.system(size: LunaraDesignSystem.Typography.subheadline))
                        .foregroundColor(LunaraColors.secondaryText)
                } else {
                    reviewsListView
                }
            }
        }
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        .padding(.top, LunaraDesignSystem.Layout.sectionSpacing)
    }

    private var reviewsSummaryView: some View {
        HStack(spacing: LunaraDesignSystem.Spacing.lg) {
            // Overall rating
            VStack(spacing: LunaraDesignSystem.Spacing.xs) {
                Text(String(format: "%.1f", shop.ratingAverage))
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)

                HStack(spacing: LunaraDesignSystem.Spacing.xs) {
                    ForEach(0..<5) { index in
                        Image(systemName: index < Int(shop.ratingAverage.rounded()) ? "star.fill" : "star")
                            .font(.system(size: 14))
                            .foregroundColor(LunaraColors.starFilled)
                    }
                }

                Text("\(shop.ratingCount) reviews")
                    .font(.system(size: LunaraDesignSystem.Typography.caption))
                    .foregroundColor(LunaraColors.secondaryText)
            }

            Spacer()

            // Rating breakdown (simplified)
            VStack(alignment: .trailing, spacing: LunaraDesignSystem.Spacing.xs) {
                ForEach((1...5).reversed(), id: \.self) { rating in
                    HStack(spacing: LunaraDesignSystem.Spacing.sm) {
                        Text("\(rating)")
                            .font(.system(size: LunaraDesignSystem.Typography.caption))
                            .foregroundColor(LunaraColors.secondaryText)

                        // Simplified progress bar
                        Rectangle()
                            .fill(LunaraColors.coolLightGray)
                            .frame(width: 60, height: 4)
                            .overlay(
                                HStack {
                                    Rectangle()
                                        .fill(LunaraColors.warmGold)
                                        .frame(width: CGFloat(getStarPercentage(for: rating)) * 60 / 100, height: 4)
                                    Spacer()
                                }
                            )
                            .cornerRadius(2)

                        Image(systemName: "star.fill")
                            .font(.system(size: 8))
                            .foregroundColor(LunaraColors.starFilled)
                    }
                }
            }
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

    private var reviewsListView: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.md) {
            ForEach(reviews.prefix(2)) { review in
                ReviewPreviewCard(review: review)
            }
        }
    }

    private var reviewsSkeletonView: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.md) {
            ForEach(0..<2, id: \.self) { _ in
                ReviewPreviewCardSkeleton()
            }
        }
    }

    private var emptyReviewsView: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.md) {
            Image(systemName: "star")
                .font(.system(size: 32))
                .foregroundColor(LunaraColors.coolLightGray)

            Text("No reviews yet")
                .font(.system(size: LunaraDesignSystem.Typography.subheadline))
                .foregroundColor(LunaraColors.secondaryText)

            Text("Be the first to leave a review!")
                .font(.system(size: LunaraDesignSystem.Typography.caption))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(height: 120)
    }

    // Helper method for star rating breakdown
    private func getStarPercentage(for rating: Int) -> Double {
        // Simplified calculation - in a real app, you'd get this from the API
        let total = Double(shop.ratingCount)
        guard total > 0 else { return 0 }

        // Simulate distribution based on average rating
        let average = shop.ratingAverage
        if rating == Int(average.rounded()) {
            return 40.0 // Highest percentage for the average rating
        } else if abs(Double(rating) - average) <= 1.0 {
            return 25.0 // Medium percentage for nearby ratings
        } else {
            return 10.0 // Lower percentage for distant ratings
        }
    }

    // MARK: - Essential Info Section
    private var essentialInfoSection: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xl) {
            // Contact Information
            contactInfoView

            // Business Hours (simplified)
            businessHoursView
        }
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        .padding(.top, LunaraDesignSystem.Layout.sectionSpacing)
        .padding(.bottom, LunaraDesignSystem.Spacing.xxxl)
    }

    private var contactInfoView: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.lg) {
            Text("Contact")
                .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                .foregroundColor(LunaraColors.primaryText)

            VStack(spacing: LunaraDesignSystem.Spacing.md) {
                // Phone
                HStack(spacing: LunaraDesignSystem.Spacing.md) {
                    Image(systemName: "phone")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(LunaraColors.warmGold)
                        .frame(width: 24)

                    Text(shop.phone)
                        .font(.system(size: LunaraDesignSystem.Typography.body))
                        .foregroundColor(LunaraColors.primaryText)

                    Spacer()
                }

                // Email
                HStack(spacing: LunaraDesignSystem.Spacing.md) {
                    Image(systemName: "envelope")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(LunaraColors.warmGold)
                        .frame(width: 24)

                    Text(shop.email)
                        .font(.system(size: LunaraDesignSystem.Typography.body))
                        .foregroundColor(LunaraColors.primaryText)

                    Spacer()
                }
            }
        }
    }

    private var businessHoursView: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.lg) {
            Text("Hours")
                .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                .foregroundColor(LunaraColors.primaryText)

            if let businessHours = shop.businessHours, !businessHours.isEmpty {
                VStack(spacing: LunaraDesignSystem.Spacing.sm) {
                    ForEach(businessHours.prefix(3), id: \.id) { hours in
                        HStack {
                            Text(hours.dayOfWeek.displayName)
                                .font(.system(size: LunaraDesignSystem.Typography.body, weight: .medium))
                                .foregroundColor(LunaraColors.primaryText)
                                .frame(width: 80, alignment: .leading)

                            Spacer()

                            if hours.isClosed {
                                Text("Closed")
                                    .font(.system(size: LunaraDesignSystem.Typography.body))
                                    .foregroundColor(LunaraColors.secondaryText)
                            } else {
                                Text("\(hours.openTime) - \(hours.closeTime)")
                                    .font(.system(size: LunaraDesignSystem.Typography.body))
                                    .foregroundColor(LunaraColors.primaryText)
                            }
                        }
                    }

                    if businessHours.count > 3 {
                        Button("Show all hours") {
                            // TODO: Show all business hours
                        }
                        .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .medium))
                        .foregroundColor(LunaraColors.warmGold)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.top, LunaraDesignSystem.Spacing.sm)
                    }
                }
            } else {
                Text("Hours not available")
                    .font(.system(size: LunaraDesignSystem.Typography.body))
                    .foregroundColor(LunaraColors.secondaryText)
            }
        }
    }

    // MARK: - Helper Methods

    private func getImageURL(_ imageUrl: String) -> URL? {
        guard !imageUrl.isEmpty else { return nil }
        let fullUrl = imageUrl.starts(with: "http") ? imageUrl : "https://109.104.206.19:8443\(imageUrl)"
        return URL(string: fullUrl)
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

    private func openMaps() {
        let address = shop.fullAddress.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        if let url = URL(string: "http://maps.apple.com/?q=\(address)") {
            UIApplication.shared.open(url)
        }
    }

    // MARK: - Data Loading

    private func loadShopData() {
        Task {
            await loadServices()
            await loadEmployees()
            await loadReviews()
        }
    }

    private func loadServices() async {
        do {
            let loadedServices = try await APIClient.shared.getShopServices(shopId: shop.id)
            await MainActor.run {
                // Filter for active services with active employees
                services = loadedServices.filter { service in
                    service.active && !service.employees.isEmpty && service.employees.contains { $0.active }
                }
                isLoadingData = false
            }
        } catch {
            print("❌ Failed to load services: \(error)")
            await MainActor.run {
                services = []
                isLoadingData = false
            }
        }
    }

    private func loadEmployees() async {
        do {
            let loadedEmployees = try await APIClient.shared.getShopEmployees(shopId: shop.id)
            await MainActor.run {
                // Filter for active employees only
                employees = loadedEmployees.filter { $0.active }
            }
        } catch {
            print("❌ Failed to load employees: \(error)")
            await MainActor.run {
                employees = []
            }
        }
    }

    private func loadReviews() async {
        do {
            let loadedReviews = try await APIClient.shared.getShopReviews(shopId: shop.id, page: 0, size: 3)
            await MainActor.run {
                reviews = loadedReviews.reviews
            }
        } catch {
            print("❌ Failed to load reviews: \(error)")
            await MainActor.run {
                reviews = []
            }
        }
    }
}
