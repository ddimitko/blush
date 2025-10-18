//
//  SimplifiedShopDetailComponents.swift
//  LunaraApp
//
//  Created by Lunara Team on 30/07/2025.
//

import SwiftUI
import Kingfisher

// MARK: - Service Preview Card
struct ServicePreviewCard: View {
    let service: Service
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                // Service info
                VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                    Text(service.name)
                        .font(.system(size: LunaraDesignSystem.Typography.headline, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)
                        .lineLimit(1)
                    
                    if let description = service.description, !description.isEmpty {
                        Text(description)
                            .font(.system(size: LunaraDesignSystem.Typography.subheadline))
                            .foregroundColor(LunaraColors.secondaryText)
                            .lineLimit(2)
                    }
                    
                    HStack {
                        Text(service.formattedDuration)
                            .font(.system(size: LunaraDesignSystem.Typography.caption, weight: .medium))
                            .foregroundColor(LunaraColors.secondaryText)
                        
                        Spacer()
                        
                        Text(service.formattedPrice)
                            .font(.system(size: LunaraDesignSystem.Typography.headline, weight: .bold))
                            .foregroundColor(LunaraColors.warmGold)
                    }
                }
                
                Spacer()
                
                // Book button
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

// MARK: - Service Preview Card Skeleton
struct ServicePreviewCardSkeleton: View {
    var body: some View {
        HStack(spacing: LunaraDesignSystem.Spacing.md) {
            VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 18)
                    .cornerRadius(4)
                
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 14)
                    .cornerRadius(4)
                
                HStack {
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(width: 60, height: 12)
                        .cornerRadius(4)
                    
                    Spacer()
                    
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(width: 50, height: 16)
                        .cornerRadius(4)
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
}

// MARK: - Employee Preview Card
struct EmployeePreviewCard: View {
    let employee: Employee
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: LunaraDesignSystem.Spacing.md) {
                // Employee photo
                ZStack {
                    if let avatar = employee.avatar, !avatar.isEmpty {
                        KFImage(getImageURL(avatar))
                            .downloader(ImageService.shared.downloader)
                            .placeholder {
                                Circle()
                                    .fill(LunaraColors.coolLightGray)
                                    .overlay(
                                        Image(systemName: "person.fill")
                                            .font(.system(size: 24))
                                            .foregroundColor(LunaraColors.secondaryText)
                                    )
                            }
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 60, height: 60)
                            .clipShape(Circle())
                    } else {
                        Circle()
                            .fill(LunaraColors.coolLightGray)
                            .frame(width: 60, height: 60)
                            .overlay(
                                Image(systemName: "person.fill")
                                    .font(.system(size: 24))
                                    .foregroundColor(LunaraColors.secondaryText)
                            )
                    }
                }
                
                // Employee info
                VStack(spacing: LunaraDesignSystem.Spacing.xs) {
                    Text(employee.displayName)
                        .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)
                        .lineLimit(1)
                        .multilineTextAlignment(.center)
                    
                    if let specialties = employee.specialties, !specialties.isEmpty {
                        Text(specialties.joined(separator: ", "))
                            .font(.system(size: LunaraDesignSystem.Typography.caption))
                            .foregroundColor(LunaraColors.secondaryText)
                            .lineLimit(2)
                            .multilineTextAlignment(.center)
                    }
                }
            }
            .padding(LunaraDesignSystem.Spacing.md)
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
    
    private func getImageURL(_ imageUrl: String) -> URL? {
        guard !imageUrl.isEmpty else { return nil }
        let fullUrl = imageUrl.starts(with: "http") ? imageUrl : "https://109.104.206.19:8443\(imageUrl)"
        return URL(string: fullUrl)
    }
}

// MARK: - Employee Preview Card Skeleton
struct EmployeePreviewCardSkeleton: View {
    var body: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.md) {
            // Photo skeleton
            Circle()
                .fill(LunaraColors.coolLightGray)
                .frame(width: 60, height: 60)
            
            // Info skeleton
            VStack(spacing: LunaraDesignSystem.Spacing.xs) {
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 14)
                    .cornerRadius(4)
                
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 12)
                    .cornerRadius(4)
            }
        }
        .padding(LunaraDesignSystem.Spacing.md)
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

// MARK: - Review Preview Card
struct ReviewPreviewCard: View {
    let review: Review

    var body: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.md) {
            // Reviewer info and rating
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                // Reviewer avatar (placeholder)
                Circle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(width: 40, height: 40)
                    .overlay(
                        Text(review.userInitials)
                            .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .semibold))
                            .foregroundColor(LunaraColors.secondaryText)
                    )

                VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                    Text(review.displayUserName)
                        .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)

                    HStack(spacing: LunaraDesignSystem.Spacing.xs) {
                        ForEach(0..<5) { index in
                            Image(systemName: index < review.stars ? "star.fill" : "star")
                                .font(.system(size: 12))
                                .foregroundColor(LunaraColors.starFilled)
                        }

                        Text(review.formattedDate)
                            .font(.system(size: LunaraDesignSystem.Typography.caption))
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                }

                Spacer()
            }

            // Review comment
            if let comment = review.comment, !comment.isEmpty {
                Text(comment)
                    .font(.system(size: LunaraDesignSystem.Typography.body))
                    .foregroundColor(LunaraColors.primaryText)
                    .lineLimit(3)
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
}

// MARK: - Review Preview Card Skeleton
struct ReviewPreviewCardSkeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.md) {
            // Reviewer info skeleton
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                Circle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(width: 40, height: 40)

                VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(width: 100, height: 14)
                        .cornerRadius(4)

                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(width: 80, height: 12)
                        .cornerRadius(4)
                }

                Spacer()
            }

            // Comment skeleton
            VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 16)
                    .cornerRadius(4)

                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 16)
                    .cornerRadius(4)

                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(width: 200, height: 16)
                    .cornerRadius(4)
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
}
