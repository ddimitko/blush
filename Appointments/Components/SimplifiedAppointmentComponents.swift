//
//  SimplifiedAppointmentComponents.swift
//  LunaraApp
//
//  Created by Lunara Team on 30/07/2025.
//

import SwiftUI
import Kingfisher

// MARK: - Filter Tab Chip
struct FilterTabChip: View {
    let filter: SimplifiedAppointmentFilter
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
                
                if count > 0 {
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

// MARK: - Simplified Appointment Card
struct SimplifiedAppointmentCard: View {
    let appointment: Appointment
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 0) {
                // Header with shop info and status
                headerSection
                
                // Service and employee info
                serviceEmployeeSection
                
                // Date, time and price
                dateTimePriceSection
                
                // Action buttons (if applicable)
                if appointment.upcoming && appointment.status != .cancelled {
                    actionButtonsSection
                }
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
    
    // MARK: - Header Section
    private var headerSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                Text(appointment.shopName)
                    .font(.system(size: LunaraDesignSystem.Typography.headline, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                    .lineLimit(1)
                
                Text(appointment.shopAddress)
                    .font(.system(size: LunaraDesignSystem.Typography.caption))
                    .foregroundColor(LunaraColors.secondaryText)
                    .lineLimit(1)
            }
            
            Spacer()
            
            // Status badge
            SimplifiedStatusBadge(status: appointment.status)
        }
        .padding(.horizontal, LunaraDesignSystem.Card.padding)
        .padding(.top, LunaraDesignSystem.Card.padding)
    }
    
    // MARK: - Service and Employee Section
    private var serviceEmployeeSection: some View {
        HStack(spacing: LunaraDesignSystem.Spacing.md) {
            // Employee avatar placeholder
            Circle()
                .fill(LunaraColors.coolLightGray)
                .frame(width: 40, height: 40)
                .overlay(
                    Text(String(appointment.employeeName.prefix(1)).uppercased())
                        .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .semibold))
                        .foregroundColor(LunaraColors.secondaryText)
                )
            
            VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                Text(appointment.serviceName)
                    .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .medium))
                    .foregroundColor(LunaraColors.primaryText)
                    .lineLimit(1)
                
                Text("with \(appointment.employeeName)")
                    .font(.system(size: LunaraDesignSystem.Typography.caption))
                    .foregroundColor(LunaraColors.secondaryText)
                    .lineLimit(1)
            }
            
            Spacer()
            
            Text(appointment.formattedPrice)
                .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .bold))
                .foregroundColor(LunaraColors.warmGold)
        }
        .padding(.horizontal, LunaraDesignSystem.Card.padding)
        .padding(.top, LunaraDesignSystem.Spacing.sm)
    }
    
    // MARK: - Date, Time and Price Section
    private var dateTimePriceSection: some View {
        HStack {
            // Date and time
            HStack(spacing: LunaraDesignSystem.Spacing.sm) {
                Image(systemName: "calendar")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.warmGold)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(appointment.formattedDate)
                        .font(.system(size: LunaraDesignSystem.Typography.caption, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    Text(appointment.formattedTime)
                        .font(.system(size: LunaraDesignSystem.Typography.caption))
                        .foregroundColor(LunaraColors.secondaryText)
                }
            }
            
            Spacer()
            
            // Duration
            if let duration = appointment.duration {
                HStack(spacing: LunaraDesignSystem.Spacing.xs) {
                    Image(systemName: "clock")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)
                    
                    Text(formatDuration(duration))
                        .font(.system(size: LunaraDesignSystem.Typography.caption))
                        .foregroundColor(LunaraColors.secondaryText)
                }
            }
        }
        .padding(.horizontal, LunaraDesignSystem.Card.padding)
        .padding(.top, LunaraDesignSystem.Spacing.sm)
        .padding(.bottom, LunaraDesignSystem.Card.padding)
    }
    
    // MARK: - Action Buttons Section
    private var actionButtonsSection: some View {
        VStack(spacing: 0) {
            Divider()
                .background(LunaraColors.coolLightGray)
            
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                // Reschedule button
                Button(action: {
                    // TODO: Handle reschedule
                }) {
                    HStack(spacing: LunaraDesignSystem.Spacing.xs) {
                        Image(systemName: "calendar.badge.clock")
                            .font(.system(size: 14, weight: .medium))
                        
                        Text("Reschedule")
                            .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .medium))
                    }
                    .foregroundColor(LunaraColors.warmGold)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, LunaraDesignSystem.Spacing.sm)
                }
                
                Divider()
                    .frame(height: 20)
                    .background(LunaraColors.coolLightGray)
                
                // Cancel button
                Button(action: {
                    // TODO: Handle cancel
                }) {
                    HStack(spacing: LunaraDesignSystem.Spacing.xs) {
                        Image(systemName: "xmark.circle")
                            .font(.system(size: 14, weight: .medium))
                        
                        Text("Cancel")
                            .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .medium))
                    }
                    .foregroundColor(LunaraColors.error)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, LunaraDesignSystem.Spacing.sm)
                }
            }
            .padding(.horizontal, LunaraDesignSystem.Card.padding)
            .padding(.vertical, LunaraDesignSystem.Spacing.sm)
        }
    }
    
    // MARK: - Helper Methods
    
    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration / 60)
        let hours = minutes / 60
        let remainingMinutes = minutes % 60
        
        if hours > 0 {
            return remainingMinutes > 0 ? "\(hours)h \(remainingMinutes)m" : "\(hours)h"
        } else {
            return "\(minutes)m"
        }
    }
}

// MARK: - Simplified Status Badge
struct SimplifiedStatusBadge: View {
    let status: AppointmentStatus
    
    var body: some View {
        Text(status.displayText)
            .font(.system(size: LunaraDesignSystem.Typography.caption, weight: .semibold))
            .foregroundColor(.white)
            .padding(.horizontal, LunaraDesignSystem.Spacing.sm)
            .padding(.vertical, LunaraDesignSystem.Spacing.xs)
            .background(status.color)
            .cornerRadius(LunaraDesignSystem.CornerRadius.chip)
    }
}

// MARK: - Simplified Appointment Card Skeleton
struct SimplifiedAppointmentCardSkeleton: View {
    var body: some View {
        VStack(spacing: 0) {
            // Header skeleton
            HStack {
                VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(height: 16)
                        .cornerRadius(4)
                    
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(width: 120, height: 12)
                        .cornerRadius(4)
                }
                
                Spacer()
                
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(width: 60, height: 20)
                    .cornerRadius(10)
            }
            .padding(.horizontal, LunaraDesignSystem.Card.padding)
            .padding(.top, LunaraDesignSystem.Card.padding)
            
            // Service skeleton
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                Circle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(width: 40, height: 40)
                
                VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(height: 14)
                        .cornerRadius(4)
                    
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(width: 80, height: 12)
                        .cornerRadius(4)
                }
                
                Spacer()
                
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(width: 50, height: 14)
                    .cornerRadius(4)
            }
            .padding(.horizontal, LunaraDesignSystem.Card.padding)
            .padding(.top, LunaraDesignSystem.Spacing.sm)
            
            // Date skeleton
            HStack {
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(width: 100, height: 12)
                    .cornerRadius(4)
                
                Spacer()
                
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(width: 40, height: 12)
                    .cornerRadius(4)
            }
            .padding(.horizontal, LunaraDesignSystem.Card.padding)
            .padding(.top, LunaraDesignSystem.Spacing.sm)
            .padding(.bottom, LunaraDesignSystem.Card.padding)
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

// MARK: - Simplified Detail Row Component
struct SimplifiedDetailRow: View {
    let icon: String
    let title: String
    let value: String

    var body: some View {
        HStack(spacing: LunaraDesignSystem.Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                Text(title)
                    .font(.system(size: LunaraDesignSystem.Typography.caption, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)

                Text(value)
                    .font(.system(size: LunaraDesignSystem.Typography.body))
                    .foregroundColor(LunaraColors.primaryText)
            }

            Spacer()
        }
        .padding(.vertical, LunaraDesignSystem.Spacing.sm)
    }
}

// MARK: - Quick Action Button
struct QuickActionButton: View {
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
                        .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)

                    Text(subtitle)
                        .font(.system(size: LunaraDesignSystem.Typography.caption))
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

// MARK: - Share Sheet
struct ShareSheet: UIViewControllerRepresentable {
    let activityItems: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        let controller = UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
        return controller
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {
        // No updates needed
    }
}
