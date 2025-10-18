//
//  AllReviewsView.swift
//  LunaraApp
//
//  Created by Lunara Team on 28/07/2025.
//

import SwiftUI

struct AllReviewsView: View {
    let shop: Shop
    @Environment(\.dismiss) private var dismiss
    
    @State private var reviews: [Review] = []
    @State private var isLoading = true
    @State private var selectedRatingFilter: Int? = nil
    @State private var sortOption: ReviewSortOption = .newest
    @State private var showingFilterSheet = false
    
    private var filteredAndSortedReviews: [Review] {
        var filtered = reviews
        
        // Apply rating filter
        if let rating = selectedRatingFilter {
            filtered = filtered.filter { $0.stars == rating }
        }
        
        // Apply sorting
        switch sortOption {
        case .newest:
            return filtered.sorted { $0.createdAt > $1.createdAt }
        case .oldest:
            return filtered.sorted { $0.createdAt < $1.createdAt }
        case .highestRated:
            return filtered.sorted { $0.stars > $1.stars }
        case .lowestRated:
            return filtered.sorted { $0.stars < $1.stars }
        }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header with rating summary
                if !isLoading {
                    ratingsSummaryHeader
                }
                
                // Filter and sort controls
                filterControlsSection
                
                // Reviews list
                if isLoading {
                    loadingView
                } else if filteredAndSortedReviews.isEmpty {
                    emptyStateView
                } else {
                    reviewsListView
                }
            }
            .navigationTitle("Reviews")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.warmGold)
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Filter") {
                        showingFilterSheet = true
                    }
                    .foregroundColor(LunaraColors.warmGold)
                }
            }
        }
        .onAppear {
            loadReviews()
        }
        .sheet(isPresented: $showingFilterSheet) {
            ReviewFilterSheet(
                selectedRating: $selectedRatingFilter,
                sortOption: $sortOption
            )
        }
    }
    
    // MARK: - Ratings Summary Header
    private var ratingsSummaryHeader: some View {
        VStack(spacing: 16) {
            HStack {
                // Overall rating
                VStack(alignment: .leading, spacing: 4) {
                    Text(shop.formattedRating)
                        .font(.system(size: 36, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    HStack(spacing: 2) {
                        ForEach(1...5, id: \.self) { star in
                            Image(systemName: star <= Int(shop.ratingAverage.rounded()) ? "star.fill" : "star")
                                .font(.system(size: 14))
                                .foregroundColor(LunaraColors.warmGold)
                        }
                    }
                    
                    Text("\(shop.ratingCount) reviews")
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                }
                
                Spacer()
                
                // Rating distribution
                VStack(alignment: .trailing, spacing: 4) {
                    ForEach((1...5).reversed(), id: \.self) { star in
                        HStack(spacing: 8) {
                            Text("\(star)")
                                .font(.system(size: 12))
                                .foregroundColor(LunaraColors.secondaryText)
                                .frame(width: 12)
                            
                            RatingBar(value: getRatingPercentage(for: star))
                                .frame(width: 80, height: 6)
                            
                            Text("\(getRatingCount(for: star))")
                                .font(.system(size: 12))
                                .foregroundColor(LunaraColors.secondaryText)
                                .frame(width: 20, alignment: .trailing)
                        }
                    }
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
        .background(LunaraColors.coolLightGray.opacity(0.3))
    }
    
    // MARK: - Filter Controls Section
    private var filterControlsSection: some View {
        HStack(spacing: 12) {
            // Rating filter chips
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    filterChip(title: "All", isSelected: selectedRatingFilter == nil) {
                        selectedRatingFilter = nil
                    }
                    
                    ForEach((1...5).reversed(), id: \.self) { rating in
                        filterChip(
                            title: "\(rating) ⭐",
                            isSelected: selectedRatingFilter == rating
                        ) {
                            selectedRatingFilter = rating
                        }
                    }
                }
                .padding(.horizontal, 20)
            }
            .padding(.horizontal, -20)
            
            // Sort button
            Menu {
                Picker("Sort by", selection: $sortOption) {
                    ForEach(ReviewSortOption.allCases, id: \.self) { option in
                        Label(option.displayName, systemImage: option.iconName)
                            .tag(option)
                    }
                }
            } label: {
                Image(systemName: "arrow.up.arrow.down")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.warmGold)
                    .frame(width: 32, height: 32)
                    .background(LunaraColors.warmGold.opacity(0.1))
                    .cornerRadius(8)
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .background(LunaraColors.white)
    }
    
    private func filterChip(title: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(isSelected ? .white : LunaraColors.warmGold)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? LunaraColors.warmGold : LunaraColors.warmGold.opacity(0.1))
                .cornerRadius(16)
        }
    }
    
    // MARK: - Reviews List View
    private var reviewsListView: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(filteredAndSortedReviews) { review in
                    ReviewCard(review: review)
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
    }
    
    // MARK: - Loading View
    private var loadingView: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(0..<8, id: \.self) { _ in
                    ReviewCardSkeleton()
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
    }
    
    // MARK: - Empty State View
    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "star.circle")
                .font(.system(size: 48))
                .foregroundColor(LunaraColors.warmGold.opacity(0.6))
            
            Text("No reviews found")
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            if selectedRatingFilter != nil {
                Text("Try adjusting your filter criteria")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                
                Button("Clear Filter") {
                    selectedRatingFilter = nil
                }
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
                .padding(.top, 8)
            } else {
                Text("Be the first to leave a review!")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(.horizontal, 40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    // MARK: - Private Methods
    private func loadReviews() {
        Task {
            do {
                let reviewsResponse = try await APIClient.shared.getShopReviews(shopId: shop.id, page: 0, size: 50)

                await MainActor.run {
                    reviews = reviewsResponse.reviews
                    isLoading = false
                }
            } catch {
                print("❌ Failed to load all reviews: \(error)")
                await MainActor.run {
                    // Fallback to empty data on error
                    reviews = []
                    isLoading = false
                }
            }
        }
    }
    
    private func getRatingPercentage(for rating: Int) -> Double {
        let count = reviews.filter { $0.stars == rating }.count
        guard reviews.count > 0 else { return 0.0 }
        return Double(count) / Double(reviews.count)
    }
    
    private func getRatingCount(for rating: Int) -> Int {
        return reviews.filter { $0.stars == rating }.count
    }
}

// MARK: - Review Sort Options
enum ReviewSortOption: String, CaseIterable {
    case newest = "newest"
    case oldest = "oldest"
    case highestRated = "highest"
    case lowestRated = "lowest"
    
    var displayName: String {
        switch self {
        case .newest: return "Newest First"
        case .oldest: return "Oldest First"
        case .highestRated: return "Highest Rated"
        case .lowestRated: return "Lowest Rated"
        }
    }
    
    var iconName: String {
        switch self {
        case .newest: return "calendar.badge.clock"
        case .oldest: return "calendar"
        case .highestRated: return "star.fill"
        case .lowestRated: return "star"
        }
    }
}

// MARK: - Review Filter Sheet
struct ReviewFilterSheet: View {
    @Binding var selectedRating: Int?
    @Binding var sortOption: ReviewSortOption
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            VStack(alignment: .leading, spacing: 24) {
                // Rating filter section
                VStack(alignment: .leading, spacing: 16) {
                    Text("Filter by Rating")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    VStack(spacing: 8) {
                        filterOption(title: "All Ratings", isSelected: selectedRating == nil) {
                            selectedRating = nil
                        }
                        
                        ForEach((1...5).reversed(), id: \.self) { rating in
                            filterOption(
                                title: "\(rating) Star\(rating == 1 ? "" : "s")",
                                isSelected: selectedRating == rating
                            ) {
                                selectedRating = rating
                            }
                        }
                    }
                }
                
                // Sort options section
                VStack(alignment: .leading, spacing: 16) {
                    Text("Sort by")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    VStack(spacing: 8) {
                        ForEach(ReviewSortOption.allCases, id: \.self) { option in
                            filterOption(
                                title: option.displayName,
                                isSelected: sortOption == option
                            ) {
                                sortOption = option
                            }
                        }
                    }
                }
                
                Spacer()
            }
            .padding(20)
            .navigationTitle("Filter & Sort")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.warmGold)
                }
            }
        }
    }
    
    private func filterOption(title: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Text(title)
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
                
                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(LunaraColors.warmGold)
                }
            }
            .padding(.vertical, 12)
            .padding(.horizontal, 16)
            .background(isSelected ? LunaraColors.warmGold.opacity(0.1) : Color.clear)
            .cornerRadius(8)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Preview
struct AllReviewsView_Previews: PreviewProvider {
    static var previews: some View {
        AllReviewsView(shop: Shop.preview)
    }
}
