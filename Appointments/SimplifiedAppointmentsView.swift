//
//  SimplifiedAppointmentsView.swift
//  LunaraApp
//
//  Created by Lunara Team on 30/07/2025.
//

import SwiftUI

/// Simplified appointments view with clean design and consistent patterns
struct SimplifiedAppointmentsView: View {
    // MARK: - Environment Objects
    @EnvironmentObject var authService: AuthenticationService
    @EnvironmentObject var appointmentService: AppointmentService
    @EnvironmentObject var appState: AppState
    
    // MARK: - State
    @State private var selectedFilter: SimplifiedAppointmentFilter = .all
    @State private var searchText = ""
    @State private var selectedAppointmentId: String?
    @State private var isRefreshing = false
    
    // MARK: - Search Configuration
    private let searchDebounceTime: TimeInterval = 0.5
    
    var body: some View {
        GeometryReader { geometry in
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
        }
        .navigationBarHidden(true)
        .background(LunaraColors.background)
        .ignoresSafeArea(.container, edges: .bottom)
        .sheet(item: Binding<AppointmentSheetItem?>(
            get: {
                guard let appointmentId = selectedAppointmentId,
                      let appointment = appointmentService.appointments.first(where: { $0.id == appointmentId }) else {
                    return nil
                }
                return AppointmentSheetItem(appointment: appointment)
            },
            set: { _ in
                selectedAppointmentId = nil
            }
        )) { sheetItem in
            SimplifiedAppointmentDetailView(appointment: sheetItem.appointment)
        }
        .task {
            if authService.isAuthenticated {
                await loadAppointments()
            }
        }
        .onChange(of: authService.isAuthenticated) { _, isAuthenticated in
            if isAuthenticated {
                Task {
                    await loadAppointments()
                }
            } else {
                appointmentService.cancelOngoingOperations()
                appointmentService.appointments = []
            }
        }
        .onChange(of: searchText) { _, newValue in
            // Simple debouncing for search
            Task {
                try? await Task.sleep(nanoseconds: UInt64(searchDebounceTime * 1_000_000_000))
                guard newValue == searchText else { return }
                // Search is handled by computed property filteredAppointments
            }
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.lg) {
            // Title
            HStack {
                Text("My Appointments")
                    .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
                
                // Appointment count badge
                if !filteredAppointments.isEmpty {
                    Text("\(filteredAppointments.count)")
                        .font(.system(size: LunaraDesignSystem.Typography.caption, weight: .semibold))
                        .foregroundColor(LunaraColors.white)
                        .padding(.horizontal, LunaraDesignSystem.Spacing.sm)
                        .padding(.vertical, LunaraDesignSystem.Spacing.xs)
                        .background(LunaraColors.warmGold)
                        .cornerRadius(LunaraDesignSystem.CornerRadius.chip)
                }
            }
            
            // Search Bar
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)
                
                TextField("Search appointments...", text: $searchText)
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
        .padding(.top, LunaraDesignSystem.Spacing.lg)
    }
    
    // MARK: - Filter Tabs Section
    private var filterTabsSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                ForEach(SimplifiedAppointmentFilter.allCases, id: \.self) { filter in
                    FilterTabChip(
                        filter: filter,
                        isSelected: selectedFilter == filter,
                        count: getAppointmentCount(for: filter)
                    ) {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            selectedFilter = filter
                        }
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
            if appointmentService.isLoading && appointmentService.appointments.isEmpty {
                loadingView
            } else if filteredAppointments.isEmpty {
                emptyStateView
            } else {
                appointmentsListView
            }
        }
    }
    
    private var appointmentsListView: some View {
        ScrollView {
            LazyVStack(spacing: LunaraDesignSystem.Spacing.md) {
                ForEach(filteredAppointments) { appointment in
                    SimplifiedAppointmentCard(appointment: appointment) {
                        print("📋 Tapping appointment: \(appointment.id)")
                        selectedAppointmentId = appointment.id
                    }
                }
            }
            .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
            .padding(.top, LunaraDesignSystem.Spacing.xl)
            .padding(.bottom, LunaraDesignSystem.Spacing.xxxl)
        }
        .refreshable {
            await refreshAppointments()
        }
    }
    
    private var loadingView: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.md) {
            ForEach(0..<3, id: \.self) { _ in
                SimplifiedAppointmentCardSkeleton()
            }
        }
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        .padding(.top, LunaraDesignSystem.Spacing.xl)
    }
    
    private var emptyStateView: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.lg) {
            Image(systemName: getEmptyStateIcon())
                .font(.system(size: 48))
                .foregroundColor(LunaraColors.coolLightGray)
            
            VStack(spacing: LunaraDesignSystem.Spacing.sm) {
                Text(getEmptyStateTitle())
                    .font(.system(size: LunaraDesignSystem.Typography.headline, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text(getEmptyStateMessage())
                    .font(.system(size: LunaraDesignSystem.Typography.subheadline))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
            }
            
            if !searchText.isEmpty {
                Button("Clear Search") {
                    searchText = ""
                }
                .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
            } else if selectedFilter == .upcoming {
                Button("Find Services") {
                    appState.switchToTab(.search)
                }
                .font(.system(size: LunaraDesignSystem.Typography.body, weight: .semibold))
                .foregroundColor(LunaraColors.buttonPrimaryText)
                .padding(.horizontal, LunaraDesignSystem.Spacing.xl)
                .padding(.vertical, LunaraDesignSystem.Spacing.lg)
                .background(LunaraColors.warmGold)
                .cornerRadius(LunaraDesignSystem.CornerRadius.button)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 80)
    }
    
    // MARK: - Unauthenticated Section
    private var unauthenticatedSection: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.xl) {
            Image(systemName: "calendar.badge.clock")
                .font(.system(size: 64))
                .foregroundColor(LunaraColors.warmGold)
            
            VStack(spacing: LunaraDesignSystem.Spacing.md) {
                Text("Sign In to View Appointments")
                    .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                    .multilineTextAlignment(.center)
                
                Text("Track your bookings, manage appointments, and never miss your beauty sessions.")
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

    /// Filtered appointments based on selected filter and search text
    private var filteredAppointments: [Appointment] {
        var filtered = appointmentService.appointments

        // Apply filter
        switch selectedFilter {
        case .upcoming:
            filtered = filtered.filter { $0.upcoming && $0.status != .cancelled }
        case .past:
            filtered = filtered.filter { !$0.upcoming }
        case .cancelled:
            filtered = filtered.filter { $0.status == .cancelled }
        case .all:
            break // Show all appointments
        }

        // Apply search filter
        if !searchText.isEmpty {
            filtered = filtered.filter { appointment in
                appointment.shopName.localizedCaseInsensitiveContains(searchText) ||
                appointment.serviceName.localizedCaseInsensitiveContains(searchText) ||
                appointment.employeeName.localizedCaseInsensitiveContains(searchText) ||
                appointment.customerName.localizedCaseInsensitiveContains(searchText)
            }
        }

        // Sort by date (upcoming first, then by date)
        return filtered.sorted { first, second in
            guard let firstDate = first.appointmentDate,
                  let secondDate = second.appointmentDate else {
                return false
            }

            if selectedFilter == .upcoming {
                return firstDate < secondDate // Nearest first
            } else {
                return firstDate > secondDate // Most recent first
            }
        }
    }

    // MARK: - Helper Methods

    /// Get appointment count for a specific filter
    private func getAppointmentCount(for filter: SimplifiedAppointmentFilter) -> Int {
        let appointments = appointmentService.appointments

        switch filter {
        case .upcoming:
            return appointments.filter { $0.upcoming && $0.status != .cancelled }.count
        case .past:
            return appointments.filter { !$0.upcoming }.count
        case .cancelled:
            return appointments.filter { $0.status == .cancelled }.count
        case .all:
            return appointments.count
        }
    }

    /// Get empty state icon based on current filter and search
    private func getEmptyStateIcon() -> String {
        if !searchText.isEmpty {
            return "magnifyingglass"
        }

        switch selectedFilter {
        case .upcoming:
            return "calendar.badge.plus"
        case .past:
            return "clock.arrow.circlepath"
        case .cancelled:
            return "calendar.badge.minus"
        case .all:
            return "calendar"
        }
    }

    /// Get empty state title based on current filter and search
    private func getEmptyStateTitle() -> String {
        if !searchText.isEmpty {
            return "No Results Found"
        }

        switch selectedFilter {
        case .upcoming:
            return "No Upcoming Appointments"
        case .past:
            return "No Past Appointments"
        case .cancelled:
            return "No Cancelled Appointments"
        case .all:
            return "No Appointments"
        }
    }

    /// Get empty state message based on current filter and search
    private func getEmptyStateMessage() -> String {
        if !searchText.isEmpty {
            return "Try adjusting your search terms or clear the search to see all appointments."
        }

        switch selectedFilter {
        case .upcoming:
            return "Book your first appointment to get started with your beauty journey."
        case .past:
            return "Your completed appointments will appear here."
        case .cancelled:
            return "Cancelled appointments will appear here."
        case .all:
            return "Your appointments will appear here once you book your first service."
        }
    }

    // MARK: - Data Loading

    /// Load appointments from service
    private func loadAppointments() async {
        await appointmentService.loadAppointments()
    }

    /// Refresh appointments
    private func refreshAppointments() async {
        guard !isRefreshing else { return }

        await MainActor.run {
            isRefreshing = true
        }

        await appointmentService.loadAppointments(forceRefresh: true)

        await MainActor.run {
            isRefreshing = false
        }
    }
}

// MARK: - Simplified Appointment Filter Enum
enum SimplifiedAppointmentFilter: String, CaseIterable {
    case all = "all"
    case upcoming = "upcoming"
    case past = "past"
    case cancelled = "cancelled"

    var displayName: String {
        switch self {
        case .upcoming: return "Upcoming"
        case .past: return "Past"
        case .cancelled: return "Cancelled"
        case .all: return "All"
        }
    }

    var iconName: String {
        switch self {
        case .upcoming: return "calendar.badge.clock"
        case .past: return "clock.arrow.circlepath"
        case .cancelled: return "calendar.badge.minus"
        case .all: return "calendar"
        }
    }
}

// MARK: - AppointmentSheetItem
struct AppointmentSheetItem: Identifiable {
    let id = UUID()
    let appointment: Appointment
}
