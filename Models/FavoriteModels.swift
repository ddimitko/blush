//
//  FavoriteModels.swift
//  LunaraApp
//
//  Created by Lunara Team on 28/07/2025.
//

import Foundation

// MARK: - Favorite Response Models

struct FavoriteResponse: Codable {
    let message: String
    let favorited: Bool
}

struct FavoriteStatusResponse: Codable {
    let favorited: Bool
    let shopId: String
}

struct FavoriteCountResponse: Codable {
    let count: Int
}

// MARK: - Favorite Shop Summary (for lists)
struct FavoriteShopSummary: Codable, Identifiable {
    let id: String
    let name: String
    let description: String
    let address: String
    let city: String
    let state: String
    let ratingAverage: Double
    let ratingCount: Int
    let thumbnail: String?
    let businessTypes: [BusinessType]
    
    var formattedRating: String {
        return String(format: "%.1f", ratingAverage)
    }
    
    var shortAddress: String {
        return "\(city), \(state)"
    }
}
