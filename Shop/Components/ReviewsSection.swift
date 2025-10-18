//
//  ReviewsSection.swift
//  LunaraApp
//
//  Created by Lunara Team on 28/07/2025.
//

import SwiftUI

struct ReviewsSection: View {
    let shop: Shop
    @State private var reviews: [Review] = []
    @State private var reviewStats: ReviewStats?
    @State private var isLoading = true
    @State private var showingAllReviews = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Section Header
            HStack {
                Text("Reviews")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
                
                if !isLoading && reviews.count > 3 {
                    Button(action: {
                        showingAllReviews = true
                    }) {
                        Text("View All")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(LunaraColors.warmGold)
                    }
                }
            }
            
            // Rating Summary
            if shop.ratingCount > 0 {
                ratingsSummaryView
            }
            
            // Reviews List
            if isLoading {
                VStack(spacing: 12) {
                    ForEach(0..<3, id: \.self) { _ in
                        ReviewCardSkeleton()
                    }
                }
            } else if reviews.isEmpty {
                EmptyReviewsView()
            } else {
                VStack(spacing: 12) {
                    ForEach(reviews.prefix(3)) { review in
                        ReviewCard(review: review)
                    }
                }
            }
        }
        .onAppear {
            loadReviews()
        }
        .sheet(isPresented: $showingAllReviews) {
            AllReviewsView(shop: shop)
        }
    }
    
    // MARK: - Ratings Summary
    private var ratingsSummaryView: some View {
        VStack(spacing: 12) {
            HStack {
                // Overall Rating
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 4) {
                        Text(shop.formattedRating)
                            .font(.system(size: 32, weight: .bold))
                            .foregroundColor(LunaraColors.primaryText)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 2) {
                                ForEach(1...5, id: \.self) { star in
                                    Image(systemName: star <= Int(shop.ratingAverage.rounded()) ? "star.fill" : "star")
                                        .font(.system(size: 12))
                                        .foregroundColor(LunaraColors.warmGold)
                                }
                            }
                            
                            Text("\(shop.ratingCount) reviews")
                                .font(.system(size: 12))
                                .foregroundColor(LunaraColors.secondaryText)
                        }
                    }
                }
                
                Spacer()
                
                // Rating Distribution
                if let stats = reviewStats {
                    VStack(alignment: .trailing, spacing: 2) {
                        ForEach((1...5).reversed(), id: \.self) { star in
                            HStack(spacing: 4) {
                                Text("\(star)")
                                    .font(.system(size: 10))
                                    .foregroundColor(LunaraColors.secondaryText)

                                RatingBar(value: stats.getPercentageForRating(star))
                                    .frame(width: 60, height: 4)

                                Text("\(Int(stats.getPercentageForRating(star) * 100))%")
                                    .font(.system(size: 10))
                                    .foregroundColor(LunaraColors.secondaryText)
                                    .frame(width: 25, alignment: .trailing)
                            }
                        }
                    }
                }
            }
        }
        .padding(16)
        .background(LunaraColors.coolLightGray.opacity(0.3))
        .cornerRadius(12)
    }
    
    // MARK: - Private Methods
    private func loadReviews() {
        Task {
            do {
                // Load reviews and stats concurrently
                async let reviewsResponse = APIClient.shared.getShopReviews(shopId: shop.id, page: 0, size: 3)
                async let statsResponse = APIClient.shared.getShopRatingStats(shopId: shop.id)

                let (reviewsData, statsData) = try await (reviewsResponse, statsResponse)

                await MainActor.run {
                    reviews = reviewsData.reviews
                    reviewStats = statsData
                    isLoading = false
                }
            } catch {
                print("❌ Failed to load reviews: \(error)")
                await MainActor.run {
                    // Fallback to empty data on error
                    reviews = []
                    reviewStats = nil
                    isLoading = false
                }
            }
        }
    }
}

// MARK: - Review Card
struct ReviewCard: View {
    let review: Review
    @State private var showingFullComment = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack(spacing: 12) {
                // User Avatar
                AsyncImage(url: URL(string: review.userAvatar ?? "")) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle()
                        .fill(LunaraColors.warmGold.opacity(0.2))
                        .overlay(
                            Text(review.userInitials)
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(LunaraColors.warmGold)
                        )
                }
                .frame(width: 40, height: 40)
                .clipShape(Circle())
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(review.userName)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    HStack(spacing: 4) {
                        HStack(spacing: 2) {
                            ForEach(1...5, id: \.self) { star in
                                Image(systemName: star <= review.stars ? "star.fill" : "star")
                                    .font(.system(size: 10))
                                    .foregroundColor(LunaraColors.warmGold)
                            }
                        }
                        
                        Text(review.formattedDate)
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                }
                
                Spacer()
            }
            
            // Comment
            if let comment = review.comment, !comment.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text(showingFullComment ? comment : String(comment.prefix(150)))
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.primaryText)
                        .lineLimit(showingFullComment ? nil : 3)
                    
                    if comment.count > 150 {
                        Button(action: {
                            withAnimation(.easeInOut(duration: 0.3)) {
                                showingFullComment.toggle()
                            }
                        }) {
                            Text(showingFullComment ? "Show less" : "Show more")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(LunaraColors.warmGold)
                        }
                    }
                }
            }
            
            // Service Info
            if let serviceName = review.serviceName {
                Text("Service: \(serviceName)")
                    .font(.system(size: 12))
                    .foregroundColor(LunaraColors.secondaryText)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(LunaraColors.coolLightGray.opacity(0.5))
                    .cornerRadius(8)
            }
        }
        .padding(16)
        .background(LunaraColors.cardBackground)
        .cornerRadius(12)
        .shadow(color: LunaraColors.cardShadow, radius: 2, x: 0, y: 1)
    }
}

// MARK: - Rating Bar
struct RatingBar: View {
    let value: Double
    
    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                
                Rectangle()
                    .fill(LunaraColors.warmGold)
                    .frame(width: geometry.size.width * value)
            }
        }
        .cornerRadius(2)
    }
}

// MARK: - Skeleton Views
struct ReviewCardSkeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                Circle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(width: 40, height: 40)
                
                VStack(alignment: .leading, spacing: 4) {
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(width: 100, height: 16)
                        .cornerRadius(4)
                    
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(width: 80, height: 12)
                        .cornerRadius(4)
                }
                
                Spacer()
            }
            
            VStack(spacing: 4) {
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 14)
                    .cornerRadius(4)
                
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 14)
                    .cornerRadius(4)
                
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(width: 120, height: 14)
                    .cornerRadius(4)
            }
        }
        .padding(16)
        .background(LunaraColors.cardBackground)
        .cornerRadius(12)
        .redacted(reason: .placeholder)
    }
}

// MARK: - Empty Reviews View
struct EmptyReviewsView: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "star.circle")
                .font(.system(size: 40))
                .foregroundColor(LunaraColors.warmGold.opacity(0.6))
            
            Text("No reviews yet")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.primaryText)
            
            Text("Be the first to leave a review after your appointment")
                .font(.system(size: 14))
                .foregroundColor(LunaraColors.secondaryText)
                .multilineTextAlignment(.center)
        }
        .padding(.vertical, 40)
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Preview
struct ReviewsSection_Previews: PreviewProvider {
    static var previews: some View {
        ScrollView {
            ReviewsSection(shop: Shop.preview)
                .padding()
        }
    }
}
