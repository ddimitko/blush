//
//  NotificationSheet.swift
//  LunaraApp
//
//  Created by Lunara Team on 27/07/2025.
//

import SwiftUI

/// Notification sheet for displaying user notifications
struct NotificationSheet: View {
    @EnvironmentObject var notificationService: NotificationService
    @Environment(\.dismiss) private var dismiss
    
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                if notificationService.isLoading {
                    loadingView
                } else if notificationService.notifications.isEmpty {
                    emptyStateView
                } else {
                    notificationsList
                }
            }
            .navigationTitle("Notifications")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.secondaryText)
                }
            }
        }
        .onAppear {
            loadNotifications()
        }
    }
    
    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 16) {
            Spacer()
            
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: LunaraColors.warmGold))
                .scaleEffect(1.2)
            
            Text("Loading notifications...")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.secondaryText)
            
            Spacer()
        }
    }
    
    // MARK: - Empty State View
    private var emptyStateView: some View {
        VStack(spacing: 24) {
            Spacer()
            
            Image(systemName: "bell.slash")
                .font(.system(size: 48))
                .foregroundColor(LunaraColors.charcoalGray.opacity(0.3))
            
            VStack(spacing: 8) {
                Text("No Notifications")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text("You're all caught up! New notifications will appear here.")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
            
            Spacer()
        }
    }
    
    // MARK: - Notifications List
    private var notificationsList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(notificationService.notifications) { notification in
                    AppNotificationRow(
                        notification: notification,
                        onTap: {
                            handleNotificationTap(notification)
                        },
                        onMarkAsRead: {
                            markAsRead(notification)
                        }
                    )

                    if notification.id != notificationService.notifications.last?.id {
                        Divider()
                            .padding(.leading, 16)
                    }
                }
            }
        }
    }
    
    // MARK: - Actions
    private func loadNotifications() {
        Task {
            await notificationService.fetchNotifications()
            await notificationService.autoMarkAsSeen()
            // Automatically mark all notifications as read when opening the list
            await notificationService.markAllAsRead()
        }
    }
    
    private func handleNotificationTap(_ notification: AppNotification) {
        // Dismiss the notification sheet first
        dismiss()

        // Use the enhanced notification handling from NotificationService
        notificationService.handleAppNotificationTap(notification)
    }
    
    private func markAsRead(_ notification: AppNotification) {
        Task {
            await notificationService.markAsRead(notificationId: notification.id)
        }
    }


}

// MARK: - App Notification Row
struct AppNotificationRow: View {
    let notification: AppNotification
    let onTap: () -> Void
    let onMarkAsRead: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                // Notification Icon
                ZStack {
                    Circle()
                        .fill(notification.type.swiftUIColor.opacity(0.1))
                        .frame(width: 40, height: 40)

                    Image(systemName: notification.type.iconName)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(notification.type.swiftUIColor)
                }
                
                // Notification Content
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(notification.title)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(LunaraColors.primaryText)
                            .lineLimit(1)
                        
                        Spacer()
                        
                        Text(notification.displayFormattedDate)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                    
                    Text(notification.message)
                        .font(.system(size: 14, weight: .regular))
                        .foregroundColor(LunaraColors.secondaryText)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                }
                
                // Unread Indicator
                if !notification.read {
                    Circle()
                        .fill(LunaraColors.warmGold)
                        .frame(width: 8, height: 8)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(
                Rectangle()
                    .fill(notification.read ? Color.clear : LunaraColors.warmGold.opacity(0.02))
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}



// MARK: - Preview
struct NotificationSheet_Previews: PreviewProvider {
    static var previews: some View {
        NotificationSheet()
            .environmentObject(NotificationService.shared)
    }
}
