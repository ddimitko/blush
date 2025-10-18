//
//  AppointmentListView.swift
//  LunaraApp
//
//  Created by Lunara Team on 24/07/2025.
//

import SwiftUI

/// Appointment list view for shop owners to manage appointments
struct ShopAppointmentListView: View {
    // MARK: - Properties
    let shop: Shop
    
    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var appState: AppState
    
    // MARK: - State
    @State private var appointments: [Appointment] = []
    @State private var filteredAppointments: [Appointment] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showingError = false
    @State private var selectedFilter: AppointmentFilter = .all
    @State private var selectedAppointment: Appointment?
    @State private var showingAppointmentDetail = false
    @State private var searchText = ""
    
    enum AppointmentFilter: String, CaseIterable {
        case all = "All"
        case today = "Today"
        case upcoming = "Upcoming"
        case completed = "Completed"
        case cancelled = "Cancelled"
        
        var icon: String {
            switch self {
            case .all: return "list.bullet"
            case .today: return "calendar.badge.clock"
            case .upcoming: return "calendar"
            case .completed: return "checkmark.circle"
            case .cancelled: return "xmark.circle"
            }
        }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Search bar
                searchBarView
                
                // Filter tabs
                filterTabsView
                
                // Appointments list
                if isLoading {
                    loadingView
                } else if filteredAppointments.isEmpty {
                    emptyStateView
                } else {
                    appointmentListView
                }
            }
            .navigationTitle("Appointments")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.secondaryText)
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Refresh") {
                        loadAppointments()
                    }
                    .foregroundColor(LunaraColors.warmGold)
                }
            }
        }
        .onAppear {
            loadAppointments()
        }
        .onChange(of: selectedFilter) { _, _ in
            filterAppointments()
        }
        .onChange(of: searchText) { _, _ in
            filterAppointments()
        }
        .sheet(isPresented: $showingAppointmentDetail) {
            if let appointment = selectedAppointment {
                AppointmentManagementView(appointment: appointment)
            }
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage ?? "An error occurred")
        }
    }
    
    // MARK: - Search Bar View
    private var searchBarView: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(LunaraColors.secondaryText)
            
            TextField("Search appointments...", text: $searchText)
                .textFieldStyle(PlainTextFieldStyle())
            
            if !searchText.isEmpty {
                Button(action: {
                    searchText = ""
                }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(LunaraColors.secondaryText)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(LunaraColors.coolLightGray.opacity(0.3))
        .cornerRadius(10)
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(LunaraColors.white)
    }
    
    // MARK: - Filter Tabs View
    private var filterTabsView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(AppointmentFilter.allCases, id: \.self) { filter in
                    Button(action: {
                        selectedFilter = filter
                    }) {
                        HStack(spacing: 6) {
                            Image(systemName: filter.icon)
                                .font(.system(size: 12))
                            
                            Text(filter.rawValue)
                                .font(.system(size: 14, weight: .medium))
                        }
                        .foregroundColor(selectedFilter == filter ? .white : LunaraColors.primaryText)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(
                            selectedFilter == filter ?
                            LunaraColors.warmGold :
                            LunaraColors.coolLightGray.opacity(0.3)
                        )
                        .cornerRadius(20)
                    }
                }
            }
            .padding(.horizontal, 16)
        }
        .padding(.vertical, 12)
        .background(LunaraColors.white)
        .overlay(
            Rectangle()
                .fill(LunaraColors.coolLightGray.opacity(0.3))
                .frame(height: 1),
            alignment: .bottom
        )
    }
    
    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
                .tint(LunaraColors.warmGold)
            
            Text("Loading appointments...")
                .font(.system(size: 16))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.coolLightGray.opacity(0.3))
    }
    
    // MARK: - Empty State View
    private var emptyStateView: some View {
        VStack(spacing: 24) {
            Spacer()
            
            Image(systemName: selectedFilter == .all ? "calendar" : selectedFilter.icon)
                .font(.system(size: 60))
                .foregroundColor(LunaraColors.warmGold.opacity(0.6))
            
            VStack(spacing: 12) {
                Text(emptyStateTitle)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text(emptyStateMessage)
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
            
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.coolLightGray.opacity(0.3))
    }
    
    // MARK: - Appointment List View
    private var appointmentListView: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(filteredAppointments) { appointment in
                    AppointmentListCard(
                        appointment: appointment,
                        onTap: {
                            selectedAppointment = appointment
                            showingAppointmentDetail = true
                        }
                    )
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)
            .padding(.bottom, 32)
        }
        .background(LunaraColors.coolLightGray.opacity(0.3))
        .refreshable {
            await refreshAppointments()
        }
    }
    
    // MARK: - Computed Properties
    private var emptyStateTitle: String {
        switch selectedFilter {
        case .all:
            return searchText.isEmpty ? "No Appointments" : "No Results Found"
        case .today:
            return "No Appointments Today"
        case .upcoming:
            return "No Upcoming Appointments"
        case .completed:
            return "No Completed Appointments"
        case .cancelled:
            return "No Cancelled Appointments"
        }
    }
    
    private var emptyStateMessage: String {
        switch selectedFilter {
        case .all:
            return searchText.isEmpty ? 
                "Your appointments will appear here once customers start booking." :
                "Try adjusting your search terms."
        case .today:
            return "You have no appointments scheduled for today."
        case .upcoming:
            return "No future appointments are currently scheduled."
        case .completed:
            return "No completed appointments to show."
        case .cancelled:
            return "No cancelled appointments to show."
        }
    }
    
    // MARK: - Methods
    private func loadAppointments() {
        isLoading = true
        errorMessage = nil
        
        Task {
            // TODO: Implement API call to get shop appointments
            // For now, using empty array
            let loadedAppointments: [Appointment] = []

            await MainActor.run {
                appointments = loadedAppointments
                filterAppointments()
                isLoading = false
            }
        }
    }
    
    private func refreshAppointments() async {
        // TODO: Implement API call to get shop appointments
        let loadedAppointments: [Appointment] = []

        await MainActor.run {
            appointments = loadedAppointments
            filterAppointments()
        }
    }
    
    private func filterAppointments() {
        var filtered = appointments
        
        // Apply search filter
        if !searchText.isEmpty {
            filtered = filtered.filter { appointment in
                appointment.service.name.localizedCaseInsensitiveContains(searchText) ||
                appointment.employee.displayName.localizedCaseInsensitiveContains(searchText) ||
                (appointment.customer?.fullName.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }
        
        // Apply status filter
        switch selectedFilter {
        case .all:
            break // No additional filtering
        case .today:
            let today = Calendar.current.startOfDay(for: Date())
            let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: today)!
            filtered = filtered.filter { appointment in
                guard let appointmentDate = self.parseDateTime(appointment.appointmentDateTime) else { return false }
                return appointmentDate >= today && appointmentDate < tomorrow
            }
        case .upcoming:
            let now = Date()
            filtered = filtered.filter { appointment in
                guard let appointmentDate = self.parseDateTime(appointment.appointmentDateTime) else { return false }
                return appointmentDate > now && appointment.status != .cancelled
            }
        case .completed:
            filtered = filtered.filter { $0.status == .completed }
        case .cancelled:
            filtered = filtered.filter { $0.status == .cancelled }
        }
        
        // Sort by appointment date
        filtered.sort { $0.appointmentDateTime < $1.appointmentDateTime }
        
        filteredAppointments = filtered
    }

    // MARK: - Helper Methods
    private func parseDateTime(_ dateTimeString: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        return formatter.date(from: dateTimeString)
    }
}

// MARK: - Appointment List Card Component
struct AppointmentListCard: View {
    let appointment: Appointment
    let onTap: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            // Header with time and status
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(formatTime(parseDateTime(appointment.appointmentDateTime) ?? Date()))
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)

                    Text(formatDate(parseDateTime(appointment.appointmentDateTime) ?? Date()))
                        .font(.system(size: 12))
                        .foregroundColor(LunaraColors.secondaryText)
                }

                Spacer()

                StatusBadge(status: appointment.status)
            }
                
                // Service and employee info
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(appointment.service.name)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(LunaraColors.primaryText)
                        
                        Text("with \(appointment.employee.displayName)")
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                    
                    Spacer()
                    
                    Text(formatCurrency(appointment.service.price))
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.warmGold)
                }
                
                // Customer info
                if let customer = appointment.customer {
                    HStack {
                        Image(systemName: "person.circle")
                            .foregroundColor(LunaraColors.secondaryText)
                        
                        Text(customer.fullName)
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.secondaryText)
                        
                        Spacer()
                        
                        Image(systemName: "chevron.right")
                            .font(.system(size: 10))
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
        .contentShape(Rectangle()) // Ensures entire area is tappable
        .onTapGesture {
            // Add haptic feedback
            let impactFeedback = UIImpactFeedbackGenerator(style: .light)
            impactFeedback.impactOccurred()
            onTap()
        }
    }
    
    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }

    private func parseDateTime(_ dateTimeString: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        return formatter.date(from: dateTimeString)
    }
    
    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }


}

#Preview {
    ShopAppointmentListView(shop: Shop.preview)
        .environmentObject(AppState.shared)
}
