//
//  SimplifiedNotificationComponents.swift
//  LunaraApp
//
//  Created by Lunara Team on 30/07/2025.
//

import SwiftUI

// MARK: - Modern Filter Chip
struct ModernFilterChip: View {
    let filter: NotificationFilter
    let isSelected: Bool
    let count: Int
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: LunaraDesignSystem.Spacing.xs) {
                Text(filter.displayName)
                    .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .semibold))
                
                if count > 0 && filter != .all {
                    Text("\(count)")
                        .font(.system(size: LunaraDesignSystem.Typography.caption, weight: .bold))
                        .foregroundColor(isSelected ? LunaraColors.warmGold : LunaraColors.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(isSelected ? LunaraColors.white : LunaraColors.warmGold)
                        .cornerRadius(8)
                }
            }
            .foregroundColor(isSelected ? LunaraColors.white : LunaraColors.primaryText)
            .padding(.horizontal, LunaraDesignSystem.Spacing.lg)
            .padding(.vertical, LunaraDesignSystem.Spacing.sm)
            .background(
                RoundedRectangle(cornerRadius: LunaraDesignSystem.CornerRadius.chip)
                    .fill(isSelected ? LunaraColors.primaryText : LunaraColors.coolLightGray.opacity(0.3))
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Modern Notification Card
struct ModernNotificationCard: View {
    let notification: AppNotification
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                // Notification Icon
                notificationIconView
                
                // Content
                VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                    // Title and time
                    HStack {
                        Text(notification.title)
                            .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: notification.seen ? .medium : .semibold))
                            .foregroundColor(LunaraColors.primaryText)
                            .lineLimit(1)
                        
                        Spacer()
                        
                        Text(notification.relativeTimeString)
                            .font(.system(size: LunaraDesignSystem.Typography.caption))
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                    
                    // Message
                    Text(notification.message)
                        .font(.system(size: LunaraDesignSystem.Typography.body))
                        .foregroundColor(notification.seen ? LunaraColors.secondaryText : LunaraColors.primaryText)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                }
                
                // Unread indicator
                if !notification.seen {
                    Circle()
                        .fill(LunaraColors.warmGold)
                        .frame(width: 8, height: 8)
                }
            }
            .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
            .padding(.vertical, LunaraDesignSystem.Spacing.lg)
            .background(
                Rectangle()
                    .fill(notification.seen ? Color.clear : LunaraColors.warmGold.opacity(0.02))
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    // MARK: - Notification Icon View
    private var notificationIconView: some View {
        ZStack {
            // Background circle
            Circle()
                .fill(notification.type.backgroundColor)
                .frame(width: 48, height: 48)
            
            // Icon
            Image(systemName: notification.type.iconName)
                .font(.system(size: 20, weight: .medium))
                .foregroundColor(notification.type.iconColor)
        }
    }
}

// MARK: - Section Header View
struct SectionHeaderView: View {
    let title: String
    
    var body: some View {
        HStack {
            Text(title)
                .font(.system(size: LunaraDesignSystem.Typography.headline, weight: .bold))
                .foregroundColor(LunaraColors.primaryText)
            
            Spacer()
        }
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        .padding(.vertical, LunaraDesignSystem.Spacing.md)
        .background(LunaraColors.background)
    }
}

// MARK: - Modern Notification Card Skeleton
struct ModernNotificationCardSkeleton: View {
    var body: some View {
        HStack(spacing: LunaraDesignSystem.Spacing.md) {
            // Icon skeleton
            Circle()
                .fill(LunaraColors.coolLightGray)
                .frame(width: 48, height: 48)
            
            // Content skeleton
            VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                HStack {
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(height: 16)
                        .cornerRadius(4)
                    
                    Spacer()
                    
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(width: 40, height: 12)
                        .cornerRadius(4)
                }
                
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 14)
                    .cornerRadius(4)
                
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(width: 200, height: 14)
                    .cornerRadius(4)
            }
        }
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        .padding(.vertical, LunaraDesignSystem.Spacing.lg)
    }
}

// MARK: - NotificationType Extensions for Modern Design
extension NotificationType {
    var backgroundColor: Color {
        switch self {
        case .appointmentConfirmed, .appointmentReminder, .appointmentCreated, .appointmentStarted:
            return LunaraColors.success.opacity(0.1)
        case .appointmentCancelled, .appointmentCancelledByCustomer, .appointmentCancelledByEmployee, .appointmentRescheduled, .appointmentEdited, .appointmentEditedByCustomer, .appointmentEditedByEmployee:
            return LunaraColors.warning.opacity(0.1)
        case .appointmentNoShow:
            return LunaraColors.error.opacity(0.1)
        case .paymentReceived:
            return LunaraColors.success.opacity(0.1)
        case .paymentFailed:
            return LunaraColors.error.opacity(0.1)
        case .appointmentRefunded:
            return LunaraColors.info.opacity(0.1)
        case .systemMaintenance, .promotional, .general:
            return LunaraColors.warmGold.opacity(0.1)
        case .newBooking, .bookingCancelled:
            return LunaraColors.info.opacity(0.1)
        case .employeeInvitation:
            return LunaraColors.warmGold.opacity(0.1)
        case .subscriptionExpiring, .subscriptionRenewed, .subscriptionCancelled:
            return LunaraColors.warning.opacity(0.1)
        case .shopApproved:
            return LunaraColors.success.opacity(0.1)
        case .shopRejected:
            return LunaraColors.error.opacity(0.1)
        default:
            return LunaraColors.coolLightGray.opacity(0.3)
        }
    }
    
    var iconColor: Color {
        switch self {
        case .appointmentConfirmed, .appointmentReminder, .appointmentCreated, .appointmentStarted, .paymentReceived, .shopApproved:
            return LunaraColors.success
        case .appointmentCancelled, .appointmentCancelledByCustomer, .appointmentCancelledByEmployee, .appointmentRescheduled, .appointmentEdited, .appointmentEditedByCustomer, .appointmentEditedByEmployee, .subscriptionExpiring, .subscriptionRenewed, .subscriptionCancelled:
            return LunaraColors.warning
        case .appointmentNoShow, .paymentFailed, .shopRejected:
            return LunaraColors.error
        case .appointmentRefunded, .newBooking, .bookingCancelled:
            return LunaraColors.info
        case .systemMaintenance, .promotional, .general, .employeeInvitation:
            return LunaraColors.warmGold
        default:
            return LunaraColors.primaryText
        }
    }
}

// MARK: - AppNotification Extensions
extension AppNotification {
    var relativeTimeString: String {
        guard let date = createdDate else { return "" }
        
        let now = Date()
        let timeInterval = now.timeIntervalSince(date)
        
        if timeInterval < 60 {
            return "now"
        } else if timeInterval < 3600 {
            let minutes = Int(timeInterval / 60)
            return "\(minutes)m"
        } else if timeInterval < 86400 {
            let hours = Int(timeInterval / 3600)
            return "\(hours)h"
        } else if timeInterval < 604800 {
            let days = Int(timeInterval / 86400)
            return "\(days)d"
        } else {
            let weeks = Int(timeInterval / 604800)
            return "\(weeks)w"
        }
    }
}
