//
//  SimplifiedNotificationsView.swift
//  LunaraApp
//
//  Created by Lunara Team on 30/07/2025.
//

import SwiftUI

/// Simplified notifications view with modern clean design
struct SimplifiedNotificationsView: View {
    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss
    // MARK: - Environment Objects
    @EnvironmentObject var authService: AuthenticationService
    @EnvironmentObject var notificationService: NotificationService
    @EnvironmentObject var appState: AppState
    
    // MARK: - State
    @State private var selectedFilter: NotificationFilter = .all
    @State private var searchText = ""
    @State private var isRefreshing = false
    @State private var showingSettings = false
    
    // MARK: - Search Configuration
    private let searchDebounceTime: TimeInterval = 0.5
    
    var body: some View {
        VStack(spacing: 0) {
            if authService.isAuthenticated {
                // Header Section
                headerSection

                // Filter Tabs
                filterTabsSection

                // Content
                contentSection
            } else {
                // Unauthenticated State
                unauthenticatedSection
            }

            Spacer()
        }
        .navigationBarHidden(true)
        .background(LunaraColors.background)
        .safeAreaInset(edge: .bottom) {
            // Add transparent spacer to ensure content doesn't overlap tab bar
            Color.clear.frame(height: 0)
        }
        .task {
            if authService.isAuthenticated {
                await loadNotifications()
                // Automatically mark all notifications as read when opening the list
                await markAllAsRead()
            }
        }
        .onChange(of: authService.isAuthenticated) { _, isAuthenticated in
            if isAuthenticated {
                Task {
                    await loadNotifications()
                    // Automatically mark all notifications as read when opening the list
                    await markAllAsRead()
                }
            }
        }
        .onChange(of: searchText) { _, newValue in
            // Simple debouncing for search
            Task {
                try? await Task.sleep(nanoseconds: UInt64(searchDebounceTime * 1_000_000_000))
                guard newValue == searchText else { return }
                // Search is handled by computed property filteredNotifications
            }
        }
        .sheet(isPresented: $showingSettings) {
            NotificationSettingsView()
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.lg) {
            // Title and Actions
            HStack {
                VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                    Text("Activity")
                        .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)

                    if notificationService.unreadCount > 0 {
                        Text("\(notificationService.unreadCount) new")
                            .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .medium))
                            .foregroundColor(LunaraColors.warmGold)
                    } else {
                        Text("You're all caught up")
                            .font(.system(size: LunaraDesignSystem.Typography.subheadline))
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                }

                Spacer()

                HStack(spacing: LunaraDesignSystem.Spacing.md) {
                    // Settings button
                    Button(action: { showingSettings = true }) {
                        Image(systemName: "gearshape")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(LunaraColors.primaryText)
                    }
                }
            }

            // Search Bar
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)

                TextField("Search activity...", text: $searchText)
                    .font(.system(size: LunaraDesignSystem.Typography.body))
                    .textFieldStyle(PlainTextFieldStyle())

                if !searchText.isEmpty {
                    Button(action: { searchText = "" }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 16))
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                }
            }
            .padding(LunaraDesignSystem.Spacing.lg)
            .background(LunaraColors.coolLightGray.opacity(0.5))
            .cornerRadius(LunaraDesignSystem.CornerRadius.md)
        }
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        .padding(.top, LunaraDesignSystem.Spacing.sm)
    }

    // MARK: - Sheet Header Section (simplified for sheet presentation)
    private var sheetHeaderSection: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.lg) {
            // Status message
            HStack {
                if notificationService.unreadCount > 0 {
                    Text("\(notificationService.unreadCount) new notifications")
                        .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .medium))
                        .foregroundColor(LunaraColors.warmGold)
                } else {
                    Text("You're all caught up")
                        .font(.system(size: LunaraDesignSystem.Typography.subheadline))
                        .foregroundColor(LunaraColors.secondaryText)
                }

                Spacer()

                // Settings button
                Button(action: { showingSettings = true }) {
                    Image(systemName: "gearshape")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)
                }
            }

            // Search Bar
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)

                TextField("Search activity...", text: $searchText)
                    .font(.system(size: LunaraDesignSystem.Typography.body))
                    .textFieldStyle(PlainTextFieldStyle())

                if !searchText.isEmpty {
                    Button(action: { searchText = "" }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 16))
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                }
            }
            .padding(LunaraDesignSystem.Spacing.lg)
            .background(LunaraColors.coolLightGray.opacity(0.5))
            .cornerRadius(LunaraDesignSystem.CornerRadius.md)
        }
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        .padding(.top, LunaraDesignSystem.Spacing.sm)
    }
    
    // MARK: - Filter Tabs Section (Instagram-style)
    private var filterTabsSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: LunaraDesignSystem.Spacing.sm) {
                ForEach(NotificationFilter.allCases, id: \.self) { filter in
                    ModernFilterChip(
                        filter: filter,
                        isSelected: selectedFilter == filter,
                        count: getNotificationCount(for: filter)
                    ) {
                        selectedFilter = filter
                    }
                }
            }
            .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        }
        .padding(.horizontal, -LunaraDesignSystem.Layout.horizontalMargin)
        .padding(.top, LunaraDesignSystem.Spacing.lg)
    }
    
    // MARK: - Content Section
    private var contentSection: some View {
        Group {
            if notificationService.isLoading && notificationService.notifications.isEmpty {
                loadingView
            } else if filteredNotifications.isEmpty {
                emptyStateView
            } else {
                notificationsListView
            }
        }
    }
    
    private var notificationsListView: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(groupedNotifications, id: \.key) { group in
                    // Date section header (Instagram-style)
                    if group.key != "Today" || !isToday(group.notifications.first?.createdDate) {
                        SectionHeaderView(title: group.key)
                    }
                    
                    // Notifications for this date
                    ForEach(group.notifications) { notification in
                        ModernNotificationCard(notification: notification) {
                            handleNotificationTap(notification)
                        }
                        
                        // Divider between notifications (except last in group)
                        if notification.id != group.notifications.last?.id {
                            Divider()
                                .padding(.leading, 72) // Align with content
                        }
                    }
                    
                    // Spacing between date groups
                    if group.key != groupedNotifications.last?.key {
                        Rectangle()
                            .fill(Color.clear)
                            .frame(height: LunaraDesignSystem.Spacing.lg)
                    }
                }
            }
            .padding(.top, LunaraDesignSystem.Spacing.xl)
            .padding(.bottom, LunaraDesignSystem.Spacing.xl)
        }
        .refreshable {
            await refreshNotifications()
        }
    }
    
    private var loadingView: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.md) {
            ForEach(0..<5, id: \.self) { _ in
                ModernNotificationCardSkeleton()
            }
        }
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        .padding(.top, LunaraDesignSystem.Spacing.xl)
    }
    
    private var emptyStateView: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.xl) {
            Image(systemName: getEmptyStateIcon())
                .font(.system(size: 64))
                .foregroundColor(LunaraColors.coolLightGray)
            
            VStack(spacing: LunaraDesignSystem.Spacing.sm) {
                Text(getEmptyStateTitle())
                    .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text(getEmptyStateMessage())
                    .font(.system(size: LunaraDesignSystem.Typography.body))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, LunaraDesignSystem.Spacing.xl)
            }
            
            if !searchText.isEmpty {
                Button("Clear Search") {
                    searchText = ""
                }
                .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 100)
    }
    
    // MARK: - Unauthenticated Section
    private var unauthenticatedSection: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.xl) {
            Image(systemName: "bell.badge")
                .font(.system(size: 64))
                .foregroundColor(LunaraColors.warmGold)
            
            VStack(spacing: LunaraDesignSystem.Spacing.md) {
                Text("Sign In for Activity")
                    .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                    .multilineTextAlignment(.center)
                
                Text("Stay updated with appointment confirmations, reminders, and important updates.")
                    .font(.system(size: LunaraDesignSystem.Typography.body))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, LunaraDesignSystem.Spacing.xl)
            }
            
            Button("Sign In") {
                authService.isGuestMode = false
            }
            .font(.system(size: LunaraDesignSystem.Typography.body, weight: .semibold))
            .foregroundColor(LunaraColors.buttonPrimaryText)
            .padding(.horizontal, LunaraDesignSystem.Spacing.xxxl)
            .padding(.vertical, LunaraDesignSystem.Spacing.lg)
            .background(LunaraColors.warmGold)
            .cornerRadius(LunaraDesignSystem.CornerRadius.button)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
    }

    // MARK: - Computed Properties

    /// Filtered notifications based on selected filter and search text
    private var filteredNotifications: [AppNotification] {
        var filtered = notificationService.notifications

        // Apply filter
        switch selectedFilter {
        case .all:
            break // Show all notifications
        case .unread:
            filtered = filtered.filter { !$0.seen }
        case .appointments:
            filtered = filtered.filter { $0.type.isAppointmentRelated }
        case .payments:
            filtered = filtered.filter { $0.type.isPaymentRelated }
        case .system:
            filtered = filtered.filter { $0.type.isSystemRelated }
        }

        // Apply search filter
        if !searchText.isEmpty {
            filtered = filtered.filter { notification in
                notification.title.localizedCaseInsensitiveContains(searchText) ||
                notification.message.localizedCaseInsensitiveContains(searchText)
            }
        }

        // Sort by date (most recent first)
        return filtered.sorted { first, second in
            guard let firstDate = first.createdDate,
                  let secondDate = second.createdDate else {
                return false
            }
            return firstDate > secondDate
        }
    }

    /// Grouped notifications by date (Instagram-style)
    private var groupedNotifications: [(key: String, notifications: [AppNotification])] {
        let grouped = Dictionary(grouping: filteredNotifications) { notification in
            guard let date = notification.createdDate else { return "Unknown" }

            let calendar = Calendar.current
            if calendar.isDateInToday(date) {
                return "Today"
            } else if calendar.isDateInYesterday(date) {
                return "Yesterday"
            } else if calendar.isDate(date, equalTo: Date(), toGranularity: .weekOfYear) {
                let formatter = DateFormatter()
                formatter.dateFormat = "EEEE" // Day name
                return formatter.string(from: date)
            } else {
                let formatter = DateFormatter()
                formatter.dateFormat = "MMMM d" // Month Day
                return formatter.string(from: date)
            }
        }

        // Sort groups by recency and map to the correct format
        return grouped.sorted { first, second in
            let order = ["Today", "Yesterday"]
            if let firstIndex = order.firstIndex(of: first.key),
               let secondIndex = order.firstIndex(of: second.key) {
                return firstIndex < secondIndex
            } else if order.contains(first.key) {
                return true
            } else if order.contains(second.key) {
                return false
            } else {
                return first.key < second.key
            }
        }.map { (key: $0.key, notifications: $0.value) }
    }

    // MARK: - Helper Methods

    /// Get notification count for a specific filter
    private func getNotificationCount(for filter: NotificationFilter) -> Int {
        let notifications = notificationService.notifications

        switch filter {
        case .all:
            return notifications.count
        case .unread:
            return notifications.filter { !$0.seen }.count
        case .appointments:
            return notifications.filter { $0.type.isAppointmentRelated }.count
        case .payments:
            return notifications.filter { $0.type.isPaymentRelated }.count
        case .system:
            return notifications.filter { $0.type.isSystemRelated }.count
        }
    }

    /// Check if date is today
    private func isToday(_ date: Date?) -> Bool {
        guard let date = date else { return false }
        return Calendar.current.isDateInToday(date)
    }

    /// Get empty state icon based on current filter and search
    private func getEmptyStateIcon() -> String {
        if !searchText.isEmpty {
            return "magnifyingglass"
        }

        switch selectedFilter {
        case .all:
            return "bell"
        case .unread:
            return "bell.badge"
        case .appointments:
            return "calendar"
        case .payments:
            return "creditcard"
        case .system:
            return "gear"
        }
    }

    /// Get empty state title based on current filter and search
    private func getEmptyStateTitle() -> String {
        if !searchText.isEmpty {
            return "No Results Found"
        }

        switch selectedFilter {
        case .all:
            return "No Activity Yet"
        case .unread:
            return "All Caught Up!"
        case .appointments:
            return "No Appointment Updates"
        case .payments:
            return "No Payment Activity"
        case .system:
            return "No System Updates"
        }
    }

    /// Get empty state message based on current filter and search
    private func getEmptyStateMessage() -> String {
        if !searchText.isEmpty {
            return "Try adjusting your search terms to find what you're looking for."
        }

        switch selectedFilter {
        case .all:
            return "Your activity will appear here. Book an appointment to get started!"
        case .unread:
            return "You've read all your notifications. Great job staying on top of things!"
        case .appointments:
            return "Appointment confirmations, reminders, and updates will appear here."
        case .payments:
            return "Payment confirmations and receipts will appear here."
        case .system:
            return "System updates and important announcements will appear here."
        }
    }

    // MARK: - Actions

    /// Handle notification tap
    private func handleNotificationTap(_ notification: AppNotification) {
        // Mark as read if unread
        if !notification.seen {
            Task {
                await notificationService.markAsRead(notificationId: notification.id)
            }
        }

        // Handle navigation based on notification type
        notificationService.handleAppNotificationTap(notification)
    }

    /// Mark all notifications as read
    private func markAllAsRead() async {
        await notificationService.markAllAsRead()
    }

    /// Load notifications
    private func loadNotifications() async {
        await notificationService.fetchNotifications()
    }

    /// Refresh notifications
    private func refreshNotifications() async {
        guard !isRefreshing else { return }

        await MainActor.run {
            isRefreshing = true
        }

        await notificationService.fetchNotifications()

        await MainActor.run {
            isRefreshing = false
        }
    }
}

// MARK: - Notification Filter Enum
enum NotificationFilter: String, CaseIterable {
    case all = "all"
    case unread = "unread"
    case appointments = "appointments"
    case payments = "payments"
    case system = "system"

    var displayName: String {
        switch self {
        case .all: return "All"
        case .unread: return "Unread"
        case .appointments: return "Appointments"
        case .payments: return "Payments"
        case .system: return "System"
        }
    }

    var iconName: String {
        switch self {
        case .all: return "bell"
        case .unread: return "bell.badge"
        case .appointments: return "calendar"
        case .payments: return "creditcard"
        case .system: return "gear"
        }
    }
}

// MARK: - NotificationType Extensions
extension NotificationType {
    var isAppointmentRelated: Bool {
        switch self {
        case .appointmentConfirmed, .appointmentReminder, .appointmentCancelled, .appointmentRescheduled, .appointmentCreated, .appointmentEdited, .appointmentCancelledByCustomer, .appointmentCancelledByEmployee, .appointmentEditedByCustomer, .appointmentEditedByEmployee, .appointmentRefunded, .appointmentNoShow, .appointmentStarted, .appointmentStatusChanged:
            return true
        default:
            return false
        }
    }

    var isPaymentRelated: Bool {
        switch self {
        case .paymentReceived, .paymentFailed:
            return true
        default:
            return false
        }
    }

    var isSystemRelated: Bool {
        switch self {
        case .systemMaintenance, .promotional, .general:
            return true
        default:
            return false
        }
    }
}
