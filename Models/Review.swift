//
//  Review.swift
//  LunaraApp
//
//  Created by Lunara Team on 28/07/2025.
//

import Foundation

// MARK: - Review Model
struct Review: Codable, Identifiable {
    let id: String
    let stars: Int
    let comment: String?
    let anonymous: Bool
    let imageUrl: String?
    let createdAt: String
    let userName: String
    let userAvatar: String?
    let serviceName: String?
    let employeeName: String?
    
    // MARK: - Computed Properties
    var userInitials: String {
        if anonymous {
            return "A"
        }
        
        let components = userName.components(separatedBy: " ")
        let firstInitial = components.first?.first?.uppercased() ?? ""
        let lastInitial = components.count > 1 ? components.last?.first?.uppercased() ?? "" : ""
        return firstInitial + lastInitial
    }
    
    var formattedDate: String {
        guard let date = ISO8601DateFormatter().date(from: createdAt) else {
            return createdAt
        }
        
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }
    
    var displayUserName: String {
        return anonymous ? "Anonymous" : userName
    }
}

// MARK: - Review Response Models
struct ReviewResponse: Codable {
    let id: String
    let stars: Int
    let comment: String?
    let anonymous: Bool
    let imageUrl: String?
    let createdAt: String
    let user: ReviewUser?
    let appointment: ReviewAppointment?
}

struct ReviewUser: Codable {
    let id: String
    let firstName: String
    let lastName: String
    let avatar: String?
    
    var fullName: String {
        return "\(firstName) \(lastName)"
    }
}

struct ReviewAppointment: Codable {
    let id: String
    let serviceName: String
    let employeeName: String
}

// MARK: - Review Statistics
struct ReviewStats: Codable {
    let averageRating: Double
    let totalRatings: Int
    let starCounts: [String: Int] // Backend returns string keys
    let shopId: String

    var formattedAverageRating: String {
        return String(format: "%.1f", averageRating)
    }

    var totalReviews: Int {
        return totalRatings
    }

    var ratingDistribution: [Int: Int] {
        var distribution: [Int: Int] = [:]
        for (key, value) in starCounts {
            if let rating = Int(key) {
                distribution[rating] = value
            }
        }
        return distribution
    }

    func getPercentageForRating(_ rating: Int) -> Double {
        guard totalRatings > 0 else { return 0.0 }
        let count = starCounts[String(rating)] ?? 0
        return Double(count) / Double(totalRatings)
    }
}

// MARK: - Paginated Review Response
struct PaginatedReviewResponse: Codable {
    let ratings: [ReviewResponse]
    let totalElements: Int
    let totalPages: Int
    let currentPage: Int
    let size: Int

    var reviews: [Review] {
        return ratings.map { Review.from($0) }
    }
}

// MARK: - Review Creation Request
struct ReviewCreationRequest: Codable {
    let appointmentId: String
    let stars: Int
    let comment: String?
    let anonymous: Bool
}

// MARK: - Review Creation Response
struct ReviewCreationResponse: Codable {
    let message: String
    let rating: ReviewResponse
}

// MARK: - Extensions
extension Review {
    /// Convert ReviewResponse to Review
    static func from(_ response: ReviewResponse) -> Review {
        return Review(
            id: response.id,
            stars: response.stars,
            comment: response.comment,
            anonymous: response.anonymous,
            imageUrl: response.imageUrl,
            createdAt: response.createdAt,
            userName: response.anonymous ? "Anonymous" : (response.user?.fullName ?? "Unknown"),
            userAvatar: response.anonymous ? nil : response.user?.avatar,
            serviceName: response.appointment?.serviceName,
            employeeName: response.appointment?.employeeName
        )
    }
}

// MARK: - Preview Data
extension Review {
    static let preview = Review(
        id: "preview-review-1",
        stars: 5,
        comment: "Amazing service! The staff was very professional and the results exceeded my expectations. I'll definitely be coming back.",
        anonymous: false,
        imageUrl: nil,
        createdAt: "2025-07-20T10:30:00Z",
        userName: "Sarah Johnson",
        userAvatar: "https://example.com/avatar1.jpg",
        serviceName: "Hair Cut & Style",
        employeeName: "Maria Garcia"
    )
    
    static let previewList: [Review] = [
        Review(
            id: "preview-review-1",
            stars: 5,
            comment: "Amazing service! The staff was very professional and the results exceeded my expectations. I'll definitely be coming back.",
            anonymous: false,
            imageUrl: nil,
            createdAt: "2025-07-20T10:30:00Z",
            userName: "Sarah Johnson",
            userAvatar: "https://example.com/avatar1.jpg",
            serviceName: "Hair Cut & Style",
            employeeName: "Maria Garcia"
        ),
        Review(
            id: "preview-review-2",
            stars: 4,
            comment: "Great experience overall. The salon is clean and modern. Only minor issue was the wait time, but the service made up for it.",
            anonymous: false,
            imageUrl: nil,
            createdAt: "2025-07-18T14:15:00Z",
            userName: "Emily Chen",
            userAvatar: "https://example.com/avatar2.jpg",
            serviceName: "Manicure",
            employeeName: "Lisa Rodriguez"
        ),
        Review(
            id: "preview-review-3",
            stars: 5,
            comment: "Absolutely love this place! The atmosphere is so relaxing and the staff really knows what they're doing. Highly recommend!",
            anonymous: false,
            imageUrl: nil,
            createdAt: "2025-07-15T16:45:00Z",
            userName: "Jessica Williams",
            userAvatar: "https://example.com/avatar3.jpg",
            serviceName: "Facial Treatment",
            employeeName: "Anna Thompson"
        ),
        Review(
            id: "preview-review-4",
            stars: 3,
            comment: "Service was okay, nothing special. The price was reasonable though.",
            anonymous: true,
            imageUrl: nil,
            createdAt: "2025-07-12T11:20:00Z",
            userName: "Anonymous",
            userAvatar: nil,
            serviceName: "Eyebrow Shaping",
            employeeName: "Maria Garcia"
        )
    ]
}
