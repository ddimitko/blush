//
//  AppointmentsView.swift
//  LunaraApp
//
//  Created by Lunara Team on 14/07/2025.
//

import SwiftUI

/// Enhanced appointments view for managing user bookings
struct AppointmentsView: View {
    // MARK: - State
    @StateObject private var appointmentService = AppointmentService.shared
    @StateObject private var authService = AuthenticationService.shared
    @State private var selectedFilter: AppointmentFilter = .all
    @State private var searchText = ""
    @State private var showingAppointmentDetail = false
    @State private var selectedAppointment: Appointment?
    @State private var isRefreshing = false

    // MARK: - Computed Properties
    private var filteredAppointments: [Appointment] {
        let filtered: [Appointment] = appointmentService.getAppointments(by: selectedFilter)

        if searchText.isEmpty {
            return filtered
        } else {
            let searchResults: [Appointment] = appointmentService.searchAppointments(query: searchText)
            return searchResults.filter { appointment in
                switch selectedFilter {
                case .all:
                    return true
                case .upcoming:
                    return appointment.isUpcoming
                case .past:
                    return appointment.isPast
                case .cancelled:
                    return appointment.status == .cancelled
                }
            }
        }
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                if authService.isAuthenticated {
                    // Search bar
                    SearchBar(text: $searchText)
                        .padding(.horizontal, 16)
                        .padding(.top, 8)

                    // Filter tabs
                    FilterTabsView(selectedFilter: $selectedFilter)
                        .padding(.horizontal, 16)
                        .padding(.top, 8)

                    // Content
                    if appointmentService.isLoading && appointmentService.appointments.isEmpty {
                        LoadingView()
                    } else if filteredAppointments.isEmpty {
                        EmptyStateView(
                            filter: selectedFilter,
                            searchText: searchText,
                            onClearSearch: { searchText = "" }
                        )
                    } else {
                        AppointmentListView(
                            appointments: filteredAppointments,
                            onAppointmentTap: { appointment in
                                selectedAppointment = appointment
                                showingAppointmentDetail = true
                            },
                            onRefresh: refreshAppointments
                        )
                    }
                } else {
                    // Not authenticated state
                    UnauthenticatedView()
                }
            }
            .refreshable {
                await refreshAppointments()
            }
            .sheet(isPresented: $showingAppointmentDetail) {
                if let appointment = selectedAppointment {
                    AppointmentDetailView(appointment: appointment)
                }
            }
            .alert("Error", isPresented: .constant(appointmentService.errorMessage != nil)) {
                Button("OK") {
                    appointmentService.clearError()
                }
            } message: {
                Text(appointmentService.errorMessage ?? "")
            }
        }
        .task {
            await loadAppointments()
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
        .onDisappear {
            // Use smart cancellation - allow important operations to complete gracefully
            appointmentService.cancelOngoingOperations(reason: "View disappeared")
        }
    }

    // MARK: - Private Methods
    private func loadAppointments() async {
        // Only load appointments if user is authenticated
        guard authService.isAuthenticated else {
            print("📅 Skipping appointment load - user not authenticated")
            return
        }
        await appointmentService.loadAppointments()
    }

    private func refreshAppointments() async {
        // Only refresh appointments if user is authenticated
        guard authService.isAuthenticated else {
            print("📅 Skipping appointment refresh - user not authenticated")
            return
        }
        // Use smart cancellation - don't aggressively cancel ongoing operations
        // Let the AppointmentService handle coordination
        await appointmentService.loadAppointments(forceRefresh: true)
    }
}

// MARK: - Supporting Views

/// Search bar component
struct SearchBar: View {
    @Binding var text: String

    var body: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(LunaraColors.secondaryText)

            TextField("Search appointments...", text: $text)
                .textFieldStyle(PlainTextFieldStyle())
                .font(.system(size: 16))

            if !text.isEmpty {
                Button(action: { text = "" }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(LunaraColors.secondaryText)
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(LunaraColors.coolLightGray)
        .cornerRadius(10)
    }
}

/// Filter tabs view
struct FilterTabsView: View {
    @Binding var selectedFilter: AppointmentFilter

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(AppointmentFilter.allCases, id: \.self) { filter in
                    FilterTab(
                        title: filter.displayName,
                        isSelected: selectedFilter == filter,
                        onTap: { selectedFilter = filter }
                    )
                }
            }
            .padding(.horizontal, 16)
        }
    }
}

/// Individual filter tab
struct FilterTab: View {
    let title: String
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            Text(title)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(isSelected ? LunaraColors.white : LunaraColors.charcoalGray)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? LunaraColors.warmGold : LunaraColors.coolLightGray)
                .cornerRadius(20)
        }
    }
}

/// Loading view
struct LoadingView: View {
    var body: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
                .tint(LunaraColors.warmGold)

            Text("Loading appointments...")
                .font(.system(size: 16))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.white)
    }
}

/// Empty state view
struct EmptyStateView: View {
    let filter: AppointmentFilter
    let searchText: String
    let onClearSearch: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: emptyStateIcon)
                .font(.system(size: 48))
                .foregroundColor(LunaraColors.coolLightGray)

            VStack(spacing: 8) {
                Text(emptyStateTitle)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)

                Text(emptyStateMessage)
                    .font(.system(size: 14))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }

            if !searchText.isEmpty {
                Button("Clear Search") {
                    onClearSearch()
                }
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.white)
    }

    private var emptyStateIcon: String {
        if !searchText.isEmpty {
            return "magnifyingglass"
        }

        switch filter {
        case .all:
            return "calendar"
        case .upcoming:
            return "clock"
        case .past:
            return "checkmark.circle"
        case .cancelled:
            return "xmark.circle"
        }
    }

    private var emptyStateTitle: String {
        if !searchText.isEmpty {
            return "No Results Found"
        }

        switch filter {
        case .all:
            return "No Appointments"
        case .upcoming:
            return "No Upcoming Appointments"
        case .past:
            return "No Past Appointments"
        case .cancelled:
            return "No Cancelled Appointments"
        }
    }

    private var emptyStateMessage: String {
        if !searchText.isEmpty {
            return "Try adjusting your search terms or clearing the search to see all appointments."
        }

        switch filter {
        case .all:
            return "You haven't booked any appointments yet. Start by browsing shops and booking your first appointment."
        case .upcoming:
            return "You don't have any upcoming appointments. Book a new appointment to see it here."
        case .past:
            return "You don't have any past appointments yet."
        case .cancelled:
            return "You don't have any cancelled appointments."
        }
    }
}

/// Appointment list view
struct AppointmentListView: View {
    let appointments: [Appointment]
    let onAppointmentTap: (Appointment) -> Void
    let onRefresh: () async -> Void

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(appointments, id: \.id) { appointment in
                    AppointmentCard(appointment: appointment, onTap: {
                        onAppointmentTap(appointment)
                    })
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
        }
        .background(LunaraColors.coolLightGray)
        .refreshable {
            await onRefresh()
        }
    }
}

/// Unauthenticated state view
struct UnauthenticatedView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "person.circle")
                .font(.system(size: 48))
                .foregroundColor(LunaraColors.coolLightGray)

            VStack(spacing: 8) {
                Text("Sign In Required")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)

                Text("Please sign in to view your appointments")
                    .font(.system(size: 14))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.white)
    }
}

// MARK: - Preview
struct AppointmentsView_Previews: PreviewProvider {
    static var previews: some View {
        AppointmentsView()
            .environmentObject(AuthenticationService.shared)
    }
}
