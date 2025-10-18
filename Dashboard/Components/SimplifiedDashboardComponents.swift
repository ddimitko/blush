//
//  SimplifiedDashboardComponents.swift
//  LunaraApp
//
//  Created by Lunara Team on 01/08/2025.
//

import SwiftUI

// MARK: - Dashboard Shop Card
struct DashboardShopCard: View {
    let shop: Shop
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                // Shop image
                AsyncImage(url: shop.displayImage.flatMap { URL(string: $0) }) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .overlay(
                            Image(systemName: "photo")
                                .foregroundColor(LunaraColors.charcoalGray.opacity(0.3))
                        )
                }
                .frame(width: 60, height: 60)
                .clipShape(RoundedRectangle(cornerRadius: LunaraDesignSystem.CornerRadius.sm))

                // Shop info
                VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                    Text(shop.name)
                        .font(.system(size: LunaraDesignSystem.Typography.headline, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)
                        .lineLimit(1)

                    Text(shop.primaryBusinessType?.displayName ?? "Business")
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

// MARK: - Simplified Shop Overview Card
struct SimplifiedShopOverviewCard: View {
    let shop: Shop
    let isLoadingAnalytics: Bool
    let servicesCount: Int
    let employeesCount: Int
    let thisWeekAppointments: Int

    var body: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.lg) {
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                // Shop image
                AsyncImage(url: shop.displayImage.flatMap { URL(string: $0) }) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .overlay(
                            Image(systemName: "photo")
                                .foregroundColor(LunaraColors.charcoalGray.opacity(0.3))
                        )
                }
                .frame(width: 80, height: 80)
                .clipShape(RoundedRectangle(cornerRadius: LunaraDesignSystem.CornerRadius.md))

                // Shop info
                VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                    Text(shop.name)
                        .font(.system(size: LunaraDesignSystem.Typography.headline, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)
                        .lineLimit(2)

                    Text(shop.primaryBusinessType?.displayName ?? "Business")
                        .font(.system(size: LunaraDesignSystem.Typography.subheadline))
                        .foregroundColor(LunaraColors.secondaryText)

                    Text("\(shop.city), \(shop.state)")
                        .font(.system(size: LunaraDesignSystem.Typography.caption))
                        .foregroundColor(LunaraColors.secondaryText)
                }

                Spacer()
            }

            // Quick Stats
            HStack(spacing: LunaraDesignSystem.Spacing.lg) {
                if isLoadingAnalytics {
                    // Loading state
                    StatItem(title: "Services", value: "...", color: LunaraColors.info)
                    StatItem(title: "Employees", value: "...", color: LunaraColors.success)
                    StatItem(title: "This Week", value: "...", color: LunaraColors.warning)
                } else {
                    StatItem(title: "Services", value: "\(servicesCount)", color: LunaraColors.info)
                    StatItem(title: "Employees", value: "\(employeesCount)", color: LunaraColors.success)
                    StatItem(title: "This Week", value: "\(thisWeekAppointments)", color: LunaraColors.warning)
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
}

// MARK: - Stat Item
struct StatItem: View {
    let title: String
    let value: String
    let color: Color

    var body: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.xs) {
            Text(value)
                .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                .foregroundColor(color)

            Text(title)
                .font(.system(size: LunaraDesignSystem.Typography.caption, weight: .medium))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Dashboard Management Row
struct DashboardManagementRow: View {
    let icon: String
    let title: String
    let subtitle: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                // Icon
                ZStack {
                    Circle()
                        .fill(LunaraColors.warmGold.opacity(0.1))
                        .frame(width: 40, height: 40)

                    Image(systemName: icon)
                        .font(.system(size: LunaraDesignSystem.Typography.body, weight: .medium))
                        .foregroundColor(LunaraColors.warmGold)
                }

                // Content
                VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                    Text(title)
                        .font(.system(size: LunaraDesignSystem.Typography.body, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)
                        .lineLimit(1)

                    Text(subtitle)
                        .font(.system(size: LunaraDesignSystem.Typography.subheadline))
                        .foregroundColor(LunaraColors.secondaryText)
                        .lineLimit(2)
                }

                Spacer()

                // Arrow
                Image(systemName: "chevron.right")
                    .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)
            }
            .padding(LunaraDesignSystem.Spacing.lg)
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

// MARK: - Preview
#Preview {
    VStack(spacing: 20) {
        DashboardManagementRow(
            icon: "chart.bar",
            title: "Analytics",
            subtitle: "View performance metrics"
        ) {}

        DashboardManagementRow(
            icon: "scissors",
            title: "Services",
            subtitle: "Manage services"
        ) {}
    }
    .padding()
    .background(LunaraColors.background)
}
