//
//  DashboardManagementWrappers.swift
//  LunaraApp
//
//  Created by Lunara Team on 01/08/2025.
//

import SwiftUI

// MARK: - Service Management Wrapper
struct DashboardServiceManagementWrapper: View {
    let shop: Shop
    
    @State private var services: [Service] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showingError = false
    @State private var showingServiceCreation = false
    @State private var selectedService: Service?
    @State private var showingDeleteConfirmation = false
    @State private var showingDeactivateConfirmation = false
    
    @EnvironmentObject var shopService: ShopService
    
    var body: some View {
        VStack(spacing: 0) {
            if isLoading {
                loadingView
            } else if services.isEmpty {
                emptyServicesView
            } else {
                serviceListView
            }
        }
        .navigationBarHidden(true)
        .background(LunaraColors.background)
        .onAppear {
            loadServices()
        }
        .sheet(isPresented: $showingServiceCreation) {
            ServiceCreationView(shop: shop) {
                loadServices()
            }
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage ?? "An error occurred")
        }
        .alert("Delete Service", isPresented: $showingDeleteConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                deleteService()
            }
        } message: {
            Text("Are you sure you want to delete this service? This action cannot be undone.")
        }
        .alert("Deactivate Service", isPresented: $showingDeactivateConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Deactivate", role: .destructive) {
                deactivateService()
            }
        } message: {
            Text("Are you sure you want to deactivate this service?")
        }
    }
    
    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
                .tint(LunaraColors.warmGold)
            
            Text("Loading services...")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.background)
    }
    
    // MARK: - Empty Services View
    private var emptyServicesView: some View {
        VStack(spacing: 32) {
            Image(systemName: "scissors")
                .font(.system(size: 64))
                .foregroundColor(LunaraColors.coolLightGray)
            
            VStack(spacing: 16) {
                Text("No Services Yet")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text("Add your first service to start accepting bookings from customers.")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
            
            Button("Add Service") {
                showingServiceCreation = true
            }
            .buttonStyle(LunaraButtonStyle())
            .padding(.horizontal, 32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.background)
        .padding(.top, LunaraDesignSystem.Spacing.xl)
    }
    
    // MARK: - Service List View
    private var serviceListView: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(services) { service in
                    ServiceManagementCard(
                        service: service,
                        onEdit: {
                            // TODO: Implement service editing
                        },
                        onToggleStatus: {
                            selectedService = service
                            if service.active {
                                showingDeactivateConfirmation = true
                            } else {
                                activateService()
                            }
                        },
                        onDelete: {
                            selectedService = service
                            showingDeleteConfirmation = true
                        }
                    )
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, LunaraDesignSystem.Spacing.xl)
            .padding(.bottom, 32)
        }
        .refreshable {
            loadServices()
        }
    }
    
    // MARK: - Methods
    private func loadServices() {
        isLoading = true
        
        Task {
            do {
                let loadedServices = try await shopService.getOwnerShopServices(shopId: shop.id)
                await MainActor.run {
                    services = loadedServices
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    showingError = true
                    isLoading = false
                }
            }
        }
    }
    
    private func deleteService() {
        guard let service = selectedService else { return }
        
        Task {
            do {
                try await shopService.deleteService(serviceId: service.id)
                await MainActor.run {
                    services.removeAll { $0.id == service.id }
                    selectedService = nil
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    showingError = true
                }
            }
        }
    }
    
    private func deactivateService() {
        guard let service = selectedService else { return }

        Task {
            do {
                let updatedService = try await shopService.deactivateService(serviceId: service.id)
                await MainActor.run {
                    if let index = services.firstIndex(where: { $0.id == service.id }) {
                        services[index] = updatedService
                    }
                    selectedService = nil
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    showingError = true
                }
            }
        }
    }

    private func activateService() {
        guard let service = selectedService else { return }

        Task {
            do {
                let updatedService = try await shopService.activateService(serviceId: service.id)
                await MainActor.run {
                    if let index = services.firstIndex(where: { $0.id == service.id }) {
                        services[index] = updatedService
                    }
                    selectedService = nil
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    showingError = true
                }
            }
        }
    }
}

// MARK: - Simple Wrapper Views
// These views use the existing management views but without NavigationView

struct DashboardEmployeeManagementWrapper: View {
    let shop: Shop

    // MARK: - State
    @State private var employees: [OwnerEmployee] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showingError = false
    @State private var showingEmployeeInvitation = false
    @State private var showingOwnerAssignment = false
    @State private var selectedEmployee: OwnerEmployee?
    @State private var showingDeleteConfirmation = false
    @State private var showingDeactivateConfirmation = false

    @EnvironmentObject var shopService: ShopService
    @EnvironmentObject var authService: AuthenticationService

    // MARK: - Computed Properties
    private var isOwnerAlreadyEmployee: Bool {
        guard let currentUser = authService.user else { return false }
        return employees.contains { employee in
            employee.email.lowercased() == currentUser.email.lowercased() && employee.isAcceptedEmployee
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            if isLoading {
                loadingView
            } else if employees.isEmpty {
                emptyEmployeesView
            } else {
                employeeListView
            }
        }
        .navigationBarHidden(true)
        .background(LunaraColors.background)
        .onAppear {
            loadEmployees()
        }
        .sheet(isPresented: $showingEmployeeInvitation) {
            EmployeeInvitationView(shop: shop) {
                loadEmployees()
            }
        }
        .sheet(isPresented: $showingOwnerAssignment) {
            OwnerEmployeeAssignView(shop: shop) {
                loadEmployees()
            }
        }
        .sheet(item: $selectedEmployee) { employee in
            EmployeeDetailView(employee: employee, shop: shop) {
                loadEmployees()
            }
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage ?? "An error occurred")
        }
        .alert("Deactivate Employee", isPresented: $showingDeactivateConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Deactivate", role: .destructive) {
                deactivateEmployee()
            }
        } message: {
            Text("Are you sure you want to deactivate this employee?")
        }
        .alert("Delete Employee", isPresented: $showingDeleteConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                deleteEmployee()
            }
        } message: {
            Text("Are you sure you want to delete this employee? This action cannot be undone.")
        }
    }

    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
                .tint(LunaraColors.warmGold)

            Text("Loading employees...")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.background)
        .padding(.top, LunaraDesignSystem.Spacing.xl)
    }

    // MARK: - Empty Employees View
    private var emptyEmployeesView: some View {
        VStack(spacing: 32) {
            Image(systemName: "person.2")
                .font(.system(size: 64))
                .foregroundColor(LunaraColors.coolLightGray)

            VStack(spacing: 16) {
                Text("No Employees Yet")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)

                Text("Invite your first employee to start building your team.")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }

            VStack(spacing: 12) {
                Button("Invite Employee") {
                    showingEmployeeInvitation = true
                }
                .buttonStyle(LunaraButtonStyle())
                .padding(.horizontal, 32)

                if !isOwnerAlreadyEmployee {
                    Button("Become Employee") {
                        showingOwnerAssignment = true
                    }
                    .buttonStyle(LunaraSecondaryButtonStyle())
                    .padding(.horizontal, 32)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.background)
        .padding(.top, LunaraDesignSystem.Spacing.xl)
    }

    // MARK: - Employee List View
    private var employeeListView: some View {
        VStack(spacing: 0) {
            // Action buttons header
            actionButtonsHeader

            // Employee list
            ScrollView {
                LazyVStack(spacing: 12) {
                    ForEach(employees) { employee in
                        EmployeeManagementCard(
                            employee: employee,
                            onTap: {
                                selectedEmployee = employee
                            },
                            onToggleStatus: {
                                selectedEmployee = employee
                                if employee.active {
                                    showingDeactivateConfirmation = true
                                } else {
                                    activateEmployee()
                                }
                            },
                            onEdit: {
                                selectedEmployee = employee
                            }
                        )
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
                .padding(.bottom, 32)
            }
            .refreshable {
                await refreshEmployees()
            }
        }
    }

    // MARK: - Action Buttons Header
    private var actionButtonsHeader: some View {
        HStack {
            Spacer()

            HStack(spacing: 12) {
                // Become Employee button (only show if owner is not already an employee)
                if !isOwnerAlreadyEmployee {
                    Button(action: {
                        showingOwnerAssignment = true
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "person.badge.plus")
                            Text("Become Employee")
                        }
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.warmGold)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(LunaraColors.warmGold.opacity(0.1))
                        .cornerRadius(6)
                    }
                }

                // Invite Employee button
                Button(action: {
                    showingEmployeeInvitation = true
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: "plus")
                        Text("Invite")
                    }
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.warmGold)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(LunaraColors.warmGold.opacity(0.1))
                    .cornerRadius(6)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, LunaraDesignSystem.Spacing.lg)
        .padding(.bottom, LunaraDesignSystem.Spacing.sm)
        .background(LunaraColors.background)
    }

    // MARK: - Methods
    private func loadEmployees() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                let loadedEmployees = try await shopService.getOwnerShopEmployees(shopId: shop.id)
                await MainActor.run {
                    employees = loadedEmployees
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    showingError = true
                    isLoading = false
                }
            }
        }
    }

    private func refreshEmployees() async {
        do {
            let loadedEmployees = try await shopService.getOwnerShopEmployees(shopId: shop.id)
            await MainActor.run {
                employees = loadedEmployees
            }
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                showingError = true
            }
        }
    }

    private func activateEmployee() {
        guard let employee = selectedEmployee else { return }

        Task {
            do {
                _ = try await shopService.activateEmployee(employeeId: employee.id)
                await MainActor.run {
                    if let index = employees.firstIndex(where: { $0.id == employee.id }) {
                        employees[index].active = true
                    }
                    selectedEmployee = nil
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    showingError = true
                }
            }
        }
    }

    private func deactivateEmployee() {
        guard let employee = selectedEmployee else { return }

        Task {
            do {
                _ = try await shopService.deactivateEmployee(employeeId: employee.id)
                await MainActor.run {
                    if let index = employees.firstIndex(where: { $0.id == employee.id }) {
                        employees[index].active = false
                    }
                    selectedEmployee = nil
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    showingError = true
                }
            }
        }
    }

    private func deleteEmployee() {
        guard let employee = selectedEmployee else { return }

        Task {
            do {
                try await shopService.deleteEmployee(shopId: shop.id, employeeId: employee.id)
                await MainActor.run {
                    employees.removeAll { $0.id == employee.id }
                    selectedEmployee = nil
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    showingError = true
                }
            }
        }
    }
}

struct DashboardScheduleManagementWrapper: View {
    let shop: Shop

    // MARK: - State
    @State private var schedules: [EmployeeScheduleData] = []
    @State private var employees: [OwnerEmployee] = []
    @State private var selectedEmployeeId: String? = nil
    @State private var isLoading = false
    @State private var isRefreshing = false
    @State private var errorMessage: String?
    @State private var showingError = false
    @State private var selectedEmployeeForEdit: EmployeeScheduleData?

    @EnvironmentObject var shopService: ShopService

    // MARK: - Computed Properties
    private var filteredSchedules: [EmployeeScheduleData] {
        guard let selectedEmployeeId = selectedEmployeeId else {
            return schedules
        }
        return schedules.filter { $0.employeeId == selectedEmployeeId }
    }

    var body: some View {
        VStack(spacing: 0) {
            if isLoading {
                loadingView
            } else {
                scheduleContentView
            }
        }
        .navigationBarHidden(true)
        .background(LunaraColors.background)
        .onAppear {
            loadInitialData()
        }
        .onChange(of: selectedEmployeeId) {
            // Reload schedules when filter changes to ensure we have fresh data
            Task {
                await loadSchedules()
            }
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage ?? "An error occurred")
        }
        .sheet(item: $selectedEmployeeForEdit) { employee in
            EmployeeScheduleEditView(
                shop: shop,
                employeeSchedule: employee,
                onScheduleUpdated: {
                    Task {
                        await loadSchedules()
                    }
                    selectedEmployeeForEdit = nil
                }
            )
        }
    }

    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
                .tint(LunaraColors.warmGold)

            Text("Loading schedules...")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.background)
        .padding(.top, LunaraDesignSystem.Spacing.xl)
    }

    // MARK: - Schedule Content View
    private var scheduleContentView: some View {
        VStack(spacing: 0) {
            // Employee Filter
            employeeFilterView

            // Schedule List
            if filteredSchedules.isEmpty {
                emptySchedulesView
            } else {
                scheduleListView
            }
        }
    }

    // MARK: - Employee Filter View
    private var employeeFilterView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                // All employees option
                Button(action: {
                    selectedEmployeeId = nil
                }) {
                    Text("All")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(selectedEmployeeId == nil ? LunaraColors.white : LunaraColors.primaryText)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(selectedEmployeeId == nil ? LunaraColors.warmGold : LunaraColors.coolLightGray)
                        .cornerRadius(20)
                }

                // Individual employees (only show accepted employees, not pending invitations)
                ForEach(employees.filter { $0.isAcceptedEmployee }, id: \.id) { employee in
                    Button(action: {
                        selectedEmployeeId = employee.id
                    }) {
                        Text(employee.fullName ?? employee.name)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(selectedEmployeeId == employee.id ? LunaraColors.white : LunaraColors.primaryText)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(selectedEmployeeId == employee.id ? LunaraColors.warmGold : LunaraColors.coolLightGray)
                            .cornerRadius(20)
                    }
                }
            }
            .padding(.horizontal, 16)
        }
        .padding(.vertical, 12)
        .background(LunaraColors.white)
    }

    // MARK: - Schedule List View
    private var scheduleListView: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(filteredSchedules, id: \.id) { employeeSchedule in
                    EmployeeScheduleCard(
                        employeeSchedule: employeeSchedule,
                        onEditTapped: {
                            selectedEmployeeForEdit = employeeSchedule
                        },
                        onSlotToggled: { slotId in
                            Task {
                                await toggleScheduleSlot(slotId: slotId)
                            }
                        }
                    )
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, LunaraDesignSystem.Spacing.xl)
            .padding(.bottom, 32)
        }
        .refreshable {
            await refreshSchedules()
        }
    }

    // MARK: - Empty Schedules View
    private var emptySchedulesView: some View {
        VStack(spacing: 32) {
            Image(systemName: "clock")
                .font(.system(size: 64))
                .foregroundColor(LunaraColors.coolLightGray)

            VStack(spacing: 16) {
                Text("No Schedules")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)

                Text("Employee schedules will appear here once they're created.")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.background)
        .padding(.top, LunaraDesignSystem.Spacing.xl)
    }

    // MARK: - Methods
    private func loadInitialData() {
        Task {
            await loadEmployees()
            await loadSchedules()
        }
    }

    private func loadEmployees() async {
        do {
            let loadedEmployees = try await shopService.getOwnerShopEmployees(shopId: shop.id)
            await MainActor.run {
                employees = loadedEmployees
            }
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                showingError = true
            }
        }
    }

    private func loadSchedules() async {
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }

        do {
            let response = try await APIClient.shared.getShopSchedules(
                shopId: shop.id,
                employeeId: selectedEmployeeId
            )
            await MainActor.run {
                schedules = response.schedules
                isLoading = false
            }
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                showingError = true
                isLoading = false
            }
        }
    }

    private func refreshSchedules() async {
        await MainActor.run {
            isRefreshing = true
        }

        await loadSchedules()

        await MainActor.run {
            isRefreshing = false
        }
    }

    private func toggleScheduleSlot(slotId: String) async {
        // TODO: Implement slot toggle functionality
        print("Toggle slot: \(slotId)")
    }
}



struct DashboardGalleryWrapper: View {
    let shop: Shop

    var body: some View {
        VStack(spacing: 0) {
            Text("Gallery Management")
                .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                .foregroundColor(LunaraColors.primaryText)
                .padding(.top, LunaraDesignSystem.Spacing.xl)
                .padding(.bottom, LunaraDesignSystem.Spacing.lg)

            Text("Gallery management functionality will be implemented here")
                .font(.system(size: LunaraDesignSystem.Typography.body))
                .foregroundColor(LunaraColors.secondaryText)
                .multilineTextAlignment(.center)
                .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .navigationBarHidden(true)
        .background(LunaraColors.background)
    }
}

struct DashboardPaymentSettingsWrapper: View {
    let shop: Shop

    var body: some View {
        VStack(spacing: 0) {
            Text("Payment Settings")
                .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                .foregroundColor(LunaraColors.primaryText)
                .padding(.top, LunaraDesignSystem.Spacing.xl)
                .padding(.bottom, LunaraDesignSystem.Spacing.lg)

            Text("Payment settings functionality will be implemented here")
                .font(.system(size: LunaraDesignSystem.Typography.body))
                .foregroundColor(LunaraColors.secondaryText)
                .multilineTextAlignment(.center)
                .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .navigationBarHidden(true)
        .background(LunaraColors.background)
    }
}

struct DashboardShopSettingsWrapper: View {
    let shop: Shop

    // MARK: - State
    @State private var selectedTab: SettingsTab = .general
    @State private var showingPaymentSettings = false
    @State private var showingBusinessHours = false
    @State private var showingGalleryManager = false

    @EnvironmentObject var shopService: ShopService
    @EnvironmentObject var authService: AuthenticationService

    // MARK: - Settings Tabs
    enum SettingsTab: String, CaseIterable {
        case general = "General"
        case business = "Business"
        case payments = "Payments"
        case preferences = "Preferences"

        var icon: String {
            switch self {
            case .general: return "info.circle"
            case .business: return "building.2"
            case .payments: return "creditcard"
            case .preferences: return "gearshape"
            }
        }

        var description: String {
            switch self {
            case .general: return "Basic shop information"
            case .business: return "Hours, location, services"
            case .payments: return "Stripe Connect & billing"
            case .preferences: return "Notifications & settings"
            }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Tab selector
            tabSelectorView

            // Content based on selected tab
            ScrollView {
                VStack(spacing: 24) {
                    switch selectedTab {
                    case .general:
                        generalSettingsView
                    case .business:
                        businessSettingsView
                    case .payments:
                        paymentSettingsView
                    case .preferences:
                        preferencesView
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
                .padding(.bottom, 32)
            }
        }
        .navigationBarHidden(true)
        .background(LunaraColors.background)
        .sheet(isPresented: $showingPaymentSettings) {
            PaymentSettingsView(shop: shop)
        }
        .sheet(isPresented: $showingBusinessHours) {
            ShopSettingsView(shop: shop)
        }
        .sheet(isPresented: $showingGalleryManager) {
            ShopGalleryManagementView(shop: shop)
        }
    }

    // MARK: - Tab Selector View
    private var tabSelectorView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(SettingsTab.allCases, id: \.self) { tab in
                    SettingsTabButton(
                        tab: tab,
                        isSelected: selectedTab == tab,
                        action: {
                            selectedTab = tab
                        }
                    )
                }
            }
            .padding(.horizontal, 16)
        }
        .padding(.top, LunaraDesignSystem.Spacing.lg)
        .padding(.bottom, LunaraDesignSystem.Spacing.sm)
        .background(LunaraColors.background)
    }

    // MARK: - General Settings View
    private var generalSettingsView: some View {
        VStack(spacing: 20) {
            // Shop Information Card
            SettingsCard(
                title: "Shop Information",
                description: "Update your shop's basic details and contact information"
            ) {
                VStack(spacing: 16) {
                    SettingsRow(
                        icon: "storefront",
                        title: "Shop Details",
                        subtitle: "Name, description, contact info",
                        action: {
                            // Open shop settings form
                        }
                    )

                    SettingsRow(
                        icon: "location",
                        title: "Address & Location",
                        subtitle: shop.fullAddress,
                        action: {
                            // Open location settings
                        }
                    )

                    SettingsRow(
                        icon: "photo.stack",
                        title: "Gallery & Photos",
                        subtitle: "\(shop.gallery?.count ?? 0) photos",
                        action: {
                            showingGalleryManager = true
                        }
                    )
                }
            }

            // Business Types Card
            SettingsCard(
                title: "Business Types",
                description: "Categories that describe your shop's services"
            ) {
                VStack(spacing: 12) {
                    ForEach(shop.businessTypes, id: \.self) { businessType in
                        HStack {
                            Image(systemName: businessType.iconName)
                                .font(.system(size: 16))
                                .foregroundColor(LunaraColors.warmGold)
                                .frame(width: 24)

                            Text(businessType.displayName)
                                .font(.system(size: 14))
                                .foregroundColor(LunaraColors.primaryText)

                            Spacer()
                        }
                        .padding(.vertical, 8)
                    }

                    if shop.businessTypes.isEmpty {
                        Text("No business types selected")
                            .font(.system(size: 14))
                            .foregroundColor(LunaraColors.secondaryText)
                            .padding(.vertical, 16)
                    }
                }
            }
        }
    }

    // MARK: - Business Settings View
    private var businessSettingsView: some View {
        VStack(spacing: 20) {
            // Business Hours Card
            SettingsCard(
                title: "Business Hours",
                description: "Set your operating hours and availability"
            ) {
                VStack(spacing: 16) {
                    SettingsRow(
                        icon: "clock",
                        title: "Operating Hours",
                        subtitle: "Monday - Sunday schedule",
                        action: {
                            showingBusinessHours = true
                        }
                    )

                    SettingsRow(
                        icon: "calendar.badge.exclamationmark",
                        title: "Holiday Schedule",
                        subtitle: "Special hours and closures",
                        action: {
                            // Open holiday settings
                        }
                    )
                }
            }

            // Services Management Card
            SettingsCard(
                title: "Services & Pricing",
                description: "Manage your services, pricing, and availability"
            ) {
                VStack(spacing: 16) {
                    SettingsRow(
                        icon: "scissors",
                        title: "Services",
                        subtitle: "Manage your service offerings",
                        action: {
                            // Navigate to services management
                        }
                    )

                    SettingsRow(
                        icon: "dollarsign.circle",
                        title: "Pricing",
                        subtitle: "Update service prices",
                        action: {
                            // Navigate to pricing management
                        }
                    )
                }
            }
        }
    }

    // MARK: - Payment Settings View
    private var paymentSettingsView: some View {
        VStack(spacing: 20) {
            // Stripe Connect Card
            SettingsCard(
                title: "Payment Processing",
                description: "Manage your Stripe Connect account and payment settings"
            ) {
                VStack(spacing: 16) {
                    SettingsRow(
                        icon: "creditcard",
                        title: "Stripe Connect",
                        subtitle: shop.acceptsCardPayments ? "Connected" : "Not connected",
                        action: {
                            showingPaymentSettings = true
                        }
                    )

                    SettingsRow(
                        icon: "chart.bar",
                        title: "Payment Analytics",
                        subtitle: "View payment reports",
                        action: {
                            // Navigate to payment analytics
                        }
                    )
                }
            }

            // Subscription Card
            SettingsCard(
                title: "Subscription",
                description: "Manage your Lunara subscription and billing"
            ) {
                VStack(spacing: 16) {
                    SettingsRow(
                        icon: "crown",
                        title: "Current Plan",
                        subtitle: "Professional Plan",
                        action: {
                            // Navigate to subscription management
                        }
                    )

                    SettingsRow(
                        icon: "receipt",
                        title: "Billing History",
                        subtitle: "View invoices and payments",
                        action: {
                            // Navigate to billing history
                        }
                    )
                }
            }
        }
    }

    // MARK: - Preferences View
    private var preferencesView: some View {
        VStack(spacing: 20) {
            // Notifications Card
            SettingsCard(
                title: "Notifications",
                description: "Configure how you receive updates and alerts"
            ) {
                VStack(spacing: 16) {
                    SettingsRow(
                        icon: "bell",
                        title: "Push Notifications",
                        subtitle: "New bookings, cancellations",
                        action: {
                            // Open notification settings
                        }
                    )

                    SettingsRow(
                        icon: "envelope",
                        title: "Email Notifications",
                        subtitle: "Daily summaries, reports",
                        action: {
                            // Open email settings
                        }
                    )
                }
            }

            // App Preferences Card
            SettingsCard(
                title: "App Preferences",
                description: "Customize your app experience"
            ) {
                VStack(spacing: 16) {
                    SettingsRow(
                        icon: "moon",
                        title: "Appearance",
                        subtitle: "Light mode",
                        action: {
                            // Open appearance settings
                        }
                    )

                    SettingsRow(
                        icon: "globe",
                        title: "Language & Region",
                        subtitle: "English (US)",
                        action: {
                            // Open language settings
                        }
                    )
                }
            }

            // Account Management Card
            SettingsCard(
                title: "Account",
                description: "Manage your account and security settings"
            ) {
                VStack(spacing: 16) {
                    SettingsRow(
                        icon: "person.circle",
                        title: "Profile Settings",
                        subtitle: "Update your personal information",
                        action: {
                            // Navigate to profile settings
                        }
                    )

                    SettingsRow(
                        icon: "lock",
                        title: "Security",
                        subtitle: "Password, two-factor auth",
                        action: {
                            // Navigate to security settings
                        }
                    )

                    SettingsRow(
                        icon: "questionmark.circle",
                        title: "Help & Support",
                        subtitle: "Get help and contact support",
                        action: {
                            // Navigate to help center
                        }
                    )
                }
            }
        }
    }
}

// MARK: - Supporting Components

// Settings Tab Button
struct SettingsTabButton: View {
    let tab: DashboardShopSettingsWrapper.SettingsTab
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: tab.icon)
                    .font(.system(size: 20, weight: .medium))
                    .foregroundColor(isSelected ? LunaraColors.white : LunaraColors.secondaryText)

                Text(tab.rawValue)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(isSelected ? LunaraColors.white : LunaraColors.secondaryText)

                Text(tab.description)
                    .font(.system(size: 10))
                    .foregroundColor(isSelected ? LunaraColors.white.opacity(0.8) : LunaraColors.secondaryText.opacity(0.7))
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .frame(minWidth: 100)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isSelected ? LunaraColors.warmGold : LunaraColors.coolLightGray.opacity(0.3))
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// Settings Card
struct SettingsCard<Content: View>: View {
    let title: String
    let description: String
    let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)

                Text(description)
                    .font(.system(size: 14))
                    .foregroundColor(LunaraColors.secondaryText)
            }

            content()
        }
        .padding(20)
        .background(LunaraColors.white)
        .cornerRadius(16)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
}

// Settings Row
struct SettingsRow: View {
    let icon: String
    let title: String
    let subtitle: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(LunaraColors.warmGold)
                    .frame(width: 32, height: 32)
                    .background(LunaraColors.warmGold.opacity(0.1))
                    .cornerRadius(8)

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)
                        .multilineTextAlignment(.leading)

                    Text(subtitle)
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.leading)
                        .lineLimit(2)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct DashboardAppointmentManagementWrapper: View {
    let shop: Shop

    // MARK: - State
    @State private var appointments: [Appointment] = []
    @State private var selectedFilter: DashboardAppointmentFilter = .all
    @State private var searchText = ""
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showingError = false
    @State private var selectedAppointment: Appointment?
    @State private var showingAppointmentDetail = false
    @State private var showingCancelConfirmation = false
    @State private var showingStatusUpdateConfirmation = false
    @State private var pendingStatusUpdate: AppointmentStatus?

    @EnvironmentObject var appointmentService: AppointmentService

    // MARK: - Computed Properties
    private var filteredAppointments: [Appointment] {
        var filtered = appointments

        // Apply filter
        switch selectedFilter {
        case .all:
            break
        case .upcoming:
            filtered = filtered.filter { appointment in
                appointment.status == .confirmed || appointment.status == .pending
            }
        case .today:
            let today = Calendar.current.startOfDay(for: Date())
            let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: today)!
            filtered = filtered.filter { appointment in
                guard let appointmentDate = appointment.appointmentDate else { return false }
                return appointmentDate >= today && appointmentDate < tomorrow
            }
        case .completed:
            filtered = filtered.filter { $0.status == .completed }
        case .cancelled:
            filtered = filtered.filter { $0.status == .cancelled }
        }

        // Apply search
        if !searchText.isEmpty {
            filtered = filtered.filter { appointment in
                appointment.customerName.localizedCaseInsensitiveContains(searchText) ||
                appointment.service.name.localizedCaseInsensitiveContains(searchText) ||
                appointment.employee.displayName.localizedCaseInsensitiveContains(searchText)
            }
        }

        return filtered.sorted {
            guard let date1 = $0.appointmentDate, let date2 = $1.appointmentDate else { return false }
            return date1 > date2
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            if isLoading {
                loadingView
            } else if appointments.isEmpty {
                emptyAppointmentsView
            } else {
                appointmentManagementView
            }
        }
        .navigationBarHidden(true)
        .background(LunaraColors.background)
        .onAppear {
            loadAppointments()
        }
        .sheet(item: $selectedAppointment) { appointment in
            AppointmentDetailView(appointment: appointment)
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage ?? "An error occurred")
        }
        .alert("Cancel Appointment", isPresented: $showingCancelConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Confirm", role: .destructive) {
                cancelAppointment()
            }
        } message: {
            Text("Are you sure you want to cancel this appointment?")
        }
        .alert("Update Status", isPresented: $showingStatusUpdateConfirmation) {
            Button("Cancel", role: .cancel) {
                pendingStatusUpdate = nil
            }
            Button("Confirm") {
                updateAppointmentStatus()
            }
        } message: {
            if let status = pendingStatusUpdate {
                Text("Update appointment status to \(status.displayName)?")
            }
        }
    }

    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
                .tint(LunaraColors.warmGold)

            Text("Loading appointments...")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.background)
        .padding(.top, LunaraDesignSystem.Spacing.xl)
    }

    // MARK: - Empty Appointments View
    private var emptyAppointmentsView: some View {
        VStack(spacing: 32) {
            Image(systemName: "calendar")
                .font(.system(size: 64))
                .foregroundColor(LunaraColors.coolLightGray)

            VStack(spacing: 16) {
                Text("No Appointments Yet")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)

                Text("Appointments will appear here once customers start booking your services.")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.background)
        .padding(.top, LunaraDesignSystem.Spacing.xl)
    }

    // MARK: - Appointment Management View
    private var appointmentManagementView: some View {
        VStack(spacing: 0) {
            // Search and filter header
            searchAndFilterHeader

            // Appointments list
            appointmentListView
        }
    }

    // MARK: - Search and Filter Header
    private var searchAndFilterHeader: some View {
        VStack(spacing: 12) {
            // Search bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(LunaraColors.secondaryText)

                TextField("Search appointments...", text: $searchText)
                    .textFieldStyle(PlainTextFieldStyle())

                if !searchText.isEmpty {
                    Button(action: { searchText = "" }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(LunaraColors.white)
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(LunaraColors.coolLightGray, lineWidth: 1)
            )

            // Filter tabs
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(DashboardAppointmentFilter.allCases, id: \.self) { filter in
                        FilterTab(
                            title: filter.displayName,
                            isSelected: selectedFilter == filter,
                            count: getFilterCount(filter)
                        ) {
                            selectedFilter = filter
                        }
                    }
                }
                .padding(.horizontal, 16)
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, LunaraDesignSystem.Spacing.lg)
        .padding(.bottom, LunaraDesignSystem.Spacing.sm)
        .background(LunaraColors.background)
    }

    // MARK: - Appointment List View
    private var appointmentListView: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(filteredAppointments) { appointment in
                    DashboardAppointmentCard(
                        appointment: appointment,
                        onTap: {
                            selectedAppointment = appointment
                        },
                        onStatusUpdate: { newStatus in
                            selectedAppointment = appointment
                            pendingStatusUpdate = newStatus
                            showingStatusUpdateConfirmation = true
                        },
                        onCancel: {
                            selectedAppointment = appointment
                            showingCancelConfirmation = true
                        }
                    )
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)
            .padding(.bottom, 32)
        }
        .refreshable {
            await refreshAppointments()
        }
    }

    // MARK: - Filter Tab Component
    private struct FilterTab: View {
        let title: String
        let isSelected: Bool
        let count: Int
        let action: () -> Void

        var body: some View {
            Button(action: action) {
                HStack(spacing: 4) {
                    Text(title)
                        .font(.system(size: 14, weight: .medium))

                    if count > 0 {
                        Text("\(count)")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(isSelected ? LunaraColors.white : LunaraColors.warmGold)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(
                                isSelected ? LunaraColors.white.opacity(0.3) : LunaraColors.warmGold.opacity(0.1)
                            )
                            .cornerRadius(10)
                    }
                }
                .foregroundColor(isSelected ? LunaraColors.white : LunaraColors.primaryText)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? LunaraColors.warmGold : LunaraColors.coolLightGray)
                .cornerRadius(20)
            }
        }
    }

    // MARK: - Methods
    private func loadAppointments() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                let loadedAppointments = try await APIClient.shared.getShopAppointments(shopId: shop.id)
                await MainActor.run {
                    appointments = loadedAppointments
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    showingError = true
                    isLoading = false
                }
            }
        }
    }

    private func refreshAppointments() async {
        do {
            let loadedAppointments = try await APIClient.shared.getShopAppointments(shopId: shop.id)
            await MainActor.run {
                appointments = loadedAppointments
            }
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                showingError = true
            }
        }
    }

    private func getFilterCount(_ filter: DashboardAppointmentFilter) -> Int {
        switch filter {
        case .all:
            return appointments.count
        case .upcoming:
            return appointments.filter { $0.status == .confirmed || $0.status == .pending }.count
        case .today:
            let today = Calendar.current.startOfDay(for: Date())
            let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: today)!
            return appointments.filter {
                guard let appointmentDate = $0.appointmentDate else { return false }
                return appointmentDate >= today && appointmentDate < tomorrow
            }.count
        case .completed:
            return appointments.filter { $0.status == .completed }.count
        case .cancelled:
            return appointments.filter { $0.status == .cancelled }.count
        }
    }

    private func cancelAppointment() {
        guard let appointment = selectedAppointment else { return }

        Task {
            do {
                let success = await appointmentService.updateAppointmentStatus(
                    appointmentId: appointment.id,
                    status: .cancelled
                )

                if success {
                    await MainActor.run {
                        // Reload appointments to get updated data
                        Task {
                            await refreshAppointments()
                        }
                        selectedAppointment = nil
                    }
                }
            }
        }
    }

    private func updateAppointmentStatus() {
        guard let appointment = selectedAppointment,
              let newStatus = pendingStatusUpdate else { return }

        Task {
            do {
                let success = await appointmentService.updateAppointmentStatus(
                    appointmentId: appointment.id,
                    status: newStatus
                )

                if success {
                    await MainActor.run {
                        // Reload appointments to get updated data
                        Task {
                            await refreshAppointments()
                        }
                        selectedAppointment = nil
                        pendingStatusUpdate = nil
                    }
                }
            }
        }
    }
}

// MARK: - Supporting Types
enum DashboardAppointmentFilter: CaseIterable {
    case all
    case upcoming
    case today
    case completed
    case cancelled

    var displayName: String {
        switch self {
        case .all: return "All"
        case .upcoming: return "Upcoming"
        case .today: return "Today"
        case .completed: return "Completed"
        case .cancelled: return "Cancelled"
        }
    }
}

// MARK: - Dashboard Appointment Card
struct DashboardAppointmentCard: View {
    let appointment: Appointment
    let onTap: () -> Void
    let onStatusUpdate: (AppointmentStatus) -> Void
    let onCancel: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            // Main content area - tappable
            Button(action: onTap) {
                VStack(spacing: 12) {
                    // Header with customer name and status
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(appointment.customerName)
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(LunaraColors.primaryText)
                                .lineLimit(1)

                            Text(appointment.customerEmail)
                                .font(.system(size: 12))
                                .foregroundColor(LunaraColors.secondaryText)
                                .lineLimit(1)
                        }

                        Spacer()

                        // Status badge
                        StatusBadge(status: appointment.status)
                    }

                    // Service and employee info
                    HStack(spacing: 12) {
                        // Service icon
                        Image(systemName: "scissors")
                            .font(.system(size: 20))
                            .foregroundColor(LunaraColors.warmGold)
                            .frame(width: 32, height: 32)
                            .background(LunaraColors.warmGold.opacity(0.1))
                            .cornerRadius(8)

                        VStack(alignment: .leading, spacing: 4) {
                            Text(appointment.service.name)
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(LunaraColors.primaryText)
                                .lineLimit(1)

                            Text("with \(appointment.employee.displayName)")
                                .font(.system(size: 12))
                                .foregroundColor(LunaraColors.secondaryText)
                                .lineLimit(1)
                        }

                        Spacer()

                        Text(appointment.formattedPrice)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(LunaraColors.warmGold)
                    }

                    // Date and time info
                    HStack {
                        Image(systemName: "calendar")
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.secondaryText)

                        Text(appointment.formattedDate)
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.secondaryText)

                        Spacer()

                        Image(systemName: "clock")
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.secondaryText)

                        Text(appointment.formattedTime)
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                }
                .padding(16)
            }
            .buttonStyle(PlainButtonStyle())

            // Action buttons
            if appointment.status != .cancelled && appointment.status != .completed {
                Divider()
                    .background(LunaraColors.coolLightGray)

                HStack(spacing: 0) {
                    // Status update button
                    if let nextStatus = getNextStatus(for: appointment.status) {
                        Button(action: {
                            onStatusUpdate(nextStatus)
                        }) {
                            HStack(spacing: 4) {
                                Image(systemName: getStatusIcon(for: nextStatus))
                                    .font(.system(size: 12))
                                Text(getStatusButtonText(for: nextStatus))
                                    .font(.system(size: 12, weight: .medium))
                            }
                            .foregroundColor(getStatusColor(for: nextStatus))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(PlainButtonStyle())

                        Divider()
                            .background(LunaraColors.coolLightGray)
                            .frame(height: 20)
                    }

                    // Cancel button
                    if appointment.canBeCancelled {
                        Button(action: onCancel) {
                            HStack(spacing: 4) {
                                Image(systemName: "xmark.circle")
                                    .font(.system(size: 12))
                                Text("Cancel")
                                    .font(.system(size: 12, weight: .medium))
                            }
                            .foregroundColor(.red)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                .background(LunaraColors.coolLightGray.opacity(0.3))
            }
        }
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }

    // MARK: - Helper Methods
    private func getNextStatus(for status: AppointmentStatus) -> AppointmentStatus? {
        switch status {
        case .pending:
            return .confirmed
        case .confirmed:
            return .inProgress
        case .inProgress:
            return .completed
        default:
            return nil
        }
    }

    private func getStatusIcon(for status: AppointmentStatus) -> String {
        switch status {
        case .confirmed:
            return "checkmark.circle"
        case .inProgress:
            return "play.circle"
        case .completed:
            return "checkmark.circle.fill"
        default:
            return "circle"
        }
    }

    private func getStatusButtonText(for status: AppointmentStatus) -> String {
        switch status {
        case .confirmed:
            return "Confirm"
        case .inProgress:
            return "Start"
        case .completed:
            return "Complete"
        default:
            return "Update"
        }
    }

    private func getStatusColor(for status: AppointmentStatus) -> Color {
        switch status {
        case .confirmed:
            return .green
        case .inProgress:
            return .blue
        case .completed:
            return .green
        default:
            return LunaraColors.warmGold
        }
    }
}

// MARK: - Shop Analytics Wrapper
struct DashboardShopAnalyticsWrapper: View {
    let shop: Shop

    // MARK: - State
    @State private var selectedTab: AnalyticsTab = .overview
    @State private var selectedPeriod: AnalyticsPeriod = .thisMonth
    @State private var isLoading = true
    @State private var analytics: ShopAnalytics?
    @State private var errorMessage: String?
    @State private var showingError = false

    @EnvironmentObject var analyticsService: AnalyticsService

    // MARK: - Analytics Tabs
    enum AnalyticsTab: String, CaseIterable {
        case overview = "Overview"
        case revenue = "Revenue"
        case appointments = "Appointments"
        case customers = "Customers"
        case performance = "Performance"

        var icon: String {
            switch self {
            case .overview: return "chart.bar.fill"
            case .revenue: return "dollarsign.circle.fill"
            case .appointments: return "calendar.circle.fill"
            case .customers: return "person.2.circle.fill"
            case .performance: return "chart.line.uptrend.xyaxis"
            }
        }

        var description: String {
            switch self {
            case .overview: return "Key metrics summary"
            case .revenue: return "Revenue & earnings"
            case .appointments: return "Booking analytics"
            case .customers: return "Customer insights"
            case .performance: return "Team performance"
            }
        }
    }

    // MARK: - Analytics Periods
    enum AnalyticsPeriod: String, CaseIterable {
        case today = "Today"
        case thisWeek = "This Week"
        case thisMonth = "This Month"
        case thisQuarter = "This Quarter"
        case thisYear = "This Year"
        case allTime = "All Time"

        var apiValue: String {
            switch self {
            case .today: return "today"
            case .thisWeek: return "week"
            case .thisMonth: return "month"
            case .thisQuarter: return "quarter"
            case .thisYear: return "year"
            case .allTime: return "all-time"
            }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Period selector
            periodSelectorView

            // Tab selector
            tabSelectorView

            // Content based on selected tab
            if isLoading {
                loadingView
            } else if let analytics = analytics {
                ScrollView {
                    VStack(spacing: 24) {
                        switch selectedTab {
                        case .overview:
                            overviewView(analytics: analytics)
                        case .revenue:
                            revenueView(analytics: analytics)
                        case .appointments:
                            appointmentsView(analytics: analytics)
                        case .customers:
                            customersView(analytics: analytics)
                        case .performance:
                            performanceView(analytics: analytics)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 16)
                    .padding(.bottom, 32)
                }
            } else {
                errorView
            }
        }
        .navigationBarHidden(true)
        .background(LunaraColors.background)
        .onAppear {
            loadAnalytics()
        }
        .onChange(of: selectedPeriod) {
            loadAnalytics()
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage ?? "An error occurred")
        }
    }

    // MARK: - Period Selector View
    private var periodSelectorView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(AnalyticsPeriod.allCases, id: \.self) { period in
                    PeriodButton(
                        period: period,
                        isSelected: selectedPeriod == period,
                        action: {
                            selectedPeriod = period
                        }
                    )
                }
            }
            .padding(.horizontal, 16)
        }
        .padding(.top, LunaraDesignSystem.Spacing.lg)
        .padding(.bottom, LunaraDesignSystem.Spacing.sm)
        .background(LunaraColors.background)
    }

    // MARK: - Tab Selector View
    private var tabSelectorView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(AnalyticsTab.allCases, id: \.self) { tab in
                    AnalyticsTabButton(
                        tab: tab,
                        isSelected: selectedTab == tab,
                        action: {
                            selectedTab = tab
                        }
                    )
                }
            }
            .padding(.horizontal, 16)
        }
        .padding(.bottom, LunaraDesignSystem.Spacing.sm)
        .background(LunaraColors.background)
    }

    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 20) {
            ProgressView()
                .scaleEffect(1.2)
                .tint(LunaraColors.warmGold)

            Text("Loading analytics...")
                .font(.system(size: 16))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.background)
    }

    // MARK: - Error View
    private var errorView: some View {
        VStack(spacing: 20) {
            Image(systemName: "chart.bar.xaxis")
                .font(.system(size: 48))
                .foregroundColor(LunaraColors.secondaryText)

            Text("Unable to Load Analytics")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)

            Text("There was an error loading your shop analytics. Please try again.")
                .font(.system(size: 14))
                .foregroundColor(LunaraColors.secondaryText)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            Button("Retry") {
                loadAnalytics()
            }
            .foregroundColor(LunaraColors.warmGold)
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .background(LunaraColors.warmGold.opacity(0.1))
            .cornerRadius(8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.background)
    }

    // MARK: - Analytics Views
    private func overviewView(analytics: ShopAnalytics) -> some View {
        VStack(spacing: 20) {
            // Key Metrics Cards
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                DashboardMetricCard(
                    title: "Total Revenue",
                    value: analytics.totalRevenue,
                    change: analytics.revenueGrowth,
                    icon: "dollarsign.circle.fill",
                    color: LunaraColors.success
                )

                DashboardMetricCard(
                    title: "Appointments",
                    value: "\(analytics.totalAppointments)",
                    change: analytics.appointmentGrowth,
                    icon: "calendar.circle.fill",
                    color: LunaraColors.warmGold
                )

                DashboardMetricCard(
                    title: "Total Customers",
                    value: "\(analytics.totalCustomers)",
                    change: analytics.customerGrowth,
                    icon: "person.2.circle.fill",
                    color: LunaraColors.info
                )

                DashboardMetricCard(
                    title: "Avg. Rating",
                    value: String(format: "%.1f", analytics.averageRating),
                    change: nil,
                    icon: "star.circle.fill",
                    color: LunaraColors.warning
                )
            }

            // Revenue Chart Placeholder
            AnalyticsCard(
                title: "Revenue Trend",
                description: "Revenue analytics for the selected period"
            ) {
                VStack(spacing: 16) {
                    HStack {
                        Text("Total Revenue")
                            .font(.system(size: 14))
                            .foregroundColor(LunaraColors.secondaryText)
                        Spacer()
                        Text(analytics.totalRevenue)
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(LunaraColors.primaryText)
                    }

                    if let growth = analytics.revenueGrowth {
                        HStack {
                            Text("Growth")
                                .font(.system(size: 14))
                                .foregroundColor(LunaraColors.secondaryText)
                            Spacer()
                            ChangeIndicator(change: growth)
                        }
                    }

                    // Placeholder for chart
                    RoundedRectangle(cornerRadius: 8)
                        .fill(LunaraColors.coolLightGray.opacity(0.3))
                        .frame(height: 120)
                        .overlay(
                            VStack {
                                Image(systemName: "chart.line.uptrend.xyaxis")
                                    .font(.system(size: 24))
                                    .foregroundColor(LunaraColors.secondaryText)
                                Text("Chart Coming Soon")
                                    .font(.system(size: 12))
                                    .foregroundColor(LunaraColors.secondaryText)
                            }
                        )
                }
            }
        }
    }

    private func revenueView(analytics: ShopAnalytics) -> some View {
        VStack(spacing: 20) {
            // Revenue Summary
            AnalyticsCard(
                title: "Revenue Summary",
                description: "Financial performance overview"
            ) {
                VStack(spacing: 16) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Total Revenue")
                                .font(.system(size: 14))
                                .foregroundColor(LunaraColors.secondaryText)
                            Text(analytics.totalRevenue)
                                .font(.system(size: 24, weight: .bold))
                                .foregroundColor(LunaraColors.primaryText)
                        }
                        Spacer()
                        if let growth = analytics.revenueGrowth {
                            ChangeIndicator(change: growth)
                        }
                    }

                    Divider()

                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Total Appointments")
                                .font(.system(size: 14))
                                .foregroundColor(LunaraColors.secondaryText)
                            Text("\(analytics.totalAppointments)")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundColor(LunaraColors.primaryText)
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 4) {
                            Text("Total Customers")
                                .font(.system(size: 14))
                                .foregroundColor(LunaraColors.secondaryText)
                            Text("\(analytics.totalCustomers)")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundColor(LunaraColors.primaryText)
                        }
                    }
                }
            }

            // Revenue Chart Placeholder
            AnalyticsCard(
                title: "Revenue Breakdown",
                description: "Detailed revenue analysis"
            ) {
                VStack(spacing: 12) {
                    // Placeholder for detailed revenue chart
                    RoundedRectangle(cornerRadius: 8)
                        .fill(LunaraColors.coolLightGray.opacity(0.3))
                        .frame(height: 200)
                        .overlay(
                            VStack {
                                Image(systemName: "chart.bar.fill")
                                    .font(.system(size: 32))
                                    .foregroundColor(LunaraColors.secondaryText)
                                Text("Detailed Revenue Charts")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(LunaraColors.secondaryText)
                                Text("Coming Soon")
                                    .font(.system(size: 12))
                                    .foregroundColor(LunaraColors.secondaryText)
                            }
                        )
                }
            }
        }
    }

    private func appointmentsView(analytics: ShopAnalytics) -> some View {
        VStack(spacing: 20) {
            // Appointment Summary
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                DashboardMetricCard(
                    title: "Total Bookings",
                    value: "\(analytics.totalAppointments)",
                    change: analytics.appointmentGrowth,
                    icon: "calendar.circle.fill",
                    color: LunaraColors.warmGold
                )

                DashboardMetricCard(
                    title: "Average Rating",
                    value: String(format: "%.1f", analytics.averageRating),
                    change: nil,
                    icon: "star.circle.fill",
                    color: LunaraColors.warning
                )
            }

            // Appointment Analytics
            AnalyticsCard(
                title: "Appointment Analytics",
                description: "Booking performance and trends"
            ) {
                VStack(spacing: 16) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Total Appointments")
                                .font(.system(size: 14))
                                .foregroundColor(LunaraColors.secondaryText)
                            Text("\(analytics.totalAppointments)")
                                .font(.system(size: 20, weight: .bold))
                                .foregroundColor(LunaraColors.primaryText)
                        }
                        Spacer()
                        if let growth = analytics.appointmentGrowth {
                            ChangeIndicator(change: growth)
                        }
                    }

                    // Placeholder for appointment charts
                    RoundedRectangle(cornerRadius: 8)
                        .fill(LunaraColors.coolLightGray.opacity(0.3))
                        .frame(height: 150)
                        .overlay(
                            VStack {
                                Image(systemName: "calendar.badge.clock")
                                    .font(.system(size: 28))
                                    .foregroundColor(LunaraColors.secondaryText)
                                Text("Appointment Trends")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(LunaraColors.secondaryText)
                                Text("Coming Soon")
                                    .font(.system(size: 12))
                                    .foregroundColor(LunaraColors.secondaryText)
                            }
                        )
                }
            }
        }
    }

    private func customersView(analytics: ShopAnalytics) -> some View {
        VStack(spacing: 20) {
            // Customer Metrics
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                DashboardMetricCard(
                    title: "Total Customers",
                    value: "\(analytics.totalCustomers)",
                    change: analytics.customerGrowth,
                    icon: "person.2.circle.fill",
                    color: LunaraColors.info
                )

                DashboardMetricCard(
                    title: "Average Rating",
                    value: String(format: "%.1f", analytics.averageRating),
                    change: nil,
                    icon: "star.circle.fill",
                    color: LunaraColors.warning
                )
            }

            // Customer Analytics
            AnalyticsCard(
                title: "Customer Analytics",
                description: "Customer insights and behavior"
            ) {
                VStack(spacing: 16) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Total Customers")
                                .font(.system(size: 14))
                                .foregroundColor(LunaraColors.secondaryText)
                            Text("\(analytics.totalCustomers)")
                                .font(.system(size: 20, weight: .bold))
                                .foregroundColor(LunaraColors.primaryText)
                        }
                        Spacer()
                        if let growth = analytics.customerGrowth {
                            ChangeIndicator(change: growth)
                        }
                    }

                    // Placeholder for customer charts
                    RoundedRectangle(cornerRadius: 8)
                        .fill(LunaraColors.coolLightGray.opacity(0.3))
                        .frame(height: 150)
                        .overlay(
                            VStack {
                                Image(systemName: "person.2.badge.plus")
                                    .font(.system(size: 28))
                                    .foregroundColor(LunaraColors.secondaryText)
                                Text("Customer Insights")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(LunaraColors.secondaryText)
                                Text("Coming Soon")
                                    .font(.system(size: 12))
                                    .foregroundColor(LunaraColors.secondaryText)
                            }
                        )
                }
            }
        }
    }

    private func performanceView(analytics: ShopAnalytics) -> some View {
        VStack(spacing: 20) {
            // Performance Metrics
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                DashboardMetricCard(
                    title: "Avg. Rating",
                    value: String(format: "%.1f", analytics.averageRating),
                    change: nil,
                    icon: "star.circle.fill",
                    color: LunaraColors.warning
                )

                DashboardMetricCard(
                    title: "Total Revenue",
                    value: analytics.totalRevenue,
                    change: analytics.revenueGrowth,
                    icon: "dollarsign.circle.fill",
                    color: LunaraColors.success
                )
            }

            // Performance Overview
            AnalyticsCard(
                title: "Performance Overview",
                description: "Shop performance metrics and insights"
            ) {
                VStack(spacing: 16) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Shop Rating")
                                .font(.system(size: 14))
                                .foregroundColor(LunaraColors.secondaryText)
                            HStack(spacing: 4) {
                                Image(systemName: "star.fill")
                                    .font(.system(size: 16))
                                    .foregroundColor(LunaraColors.warning)
                                Text(String(format: "%.1f", analytics.averageRating))
                                    .font(.system(size: 18, weight: .bold))
                                    .foregroundColor(LunaraColors.primaryText)
                            }
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 4) {
                            Text("Total Revenue")
                                .font(.system(size: 14))
                                .foregroundColor(LunaraColors.secondaryText)
                            Text(analytics.totalRevenue)
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(LunaraColors.primaryText)
                        }
                    }

                    // Placeholder for performance charts
                    RoundedRectangle(cornerRadius: 8)
                        .fill(LunaraColors.coolLightGray.opacity(0.3))
                        .frame(height: 150)
                        .overlay(
                            VStack {
                                Image(systemName: "chart.line.uptrend.xyaxis")
                                    .font(.system(size: 28))
                                    .foregroundColor(LunaraColors.secondaryText)
                                Text("Performance Analytics")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(LunaraColors.secondaryText)
                                Text("Coming Soon")
                                    .font(.system(size: 12))
                                    .foregroundColor(LunaraColors.secondaryText)
                            }
                        )
                }
            }
        }
    }

    // MARK: - Data Loading
    private func loadAnalytics() {
        isLoading = true
        errorMessage = nil

        Task {
            // Load analytics from the service
            await analyticsService.loadShopAnalytics(shopId: shop.id)

            await MainActor.run {
                // Use the loaded analytics from the service, or create fallback if nil
                if let loadedAnalytics = analyticsService.shopAnalytics {
                    analytics = loadedAnalytics
                } else {
                    // Create fallback analytics data
                    analytics = ShopAnalytics(
                        shopId: shop.id,
                        shopName: shop.name,
                        totalRevenue: "BGN 0",
                        totalAppointments: 0,
                        totalCustomers: 0,
                        averageRating: shop.ratingAverage,
                        revenueGrowth: 0.0,
                        appointmentGrowth: 0.0,
                        customerGrowth: 0.0
                    )
                    errorMessage = "Unable to load analytics data"
                }
                isLoading = false
            }
        }
    }
}

// MARK: - Analytics Supporting Components

// Period Button
struct PeriodButton: View {
    let period: DashboardShopAnalyticsWrapper.AnalyticsPeriod
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(period.rawValue)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(isSelected ? LunaraColors.white : LunaraColors.primaryText)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(isSelected ? LunaraColors.warmGold : LunaraColors.coolLightGray.opacity(0.3))
                )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// Analytics Tab Button
struct AnalyticsTabButton: View {
    let tab: DashboardShopAnalyticsWrapper.AnalyticsTab
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Image(systemName: tab.icon)
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(isSelected ? LunaraColors.white : LunaraColors.secondaryText)

                Text(tab.rawValue)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(isSelected ? LunaraColors.white : LunaraColors.secondaryText)

                Text(tab.description)
                    .font(.system(size: 9))
                    .foregroundColor(isSelected ? LunaraColors.white.opacity(0.8) : LunaraColors.secondaryText.opacity(0.7))
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .frame(minWidth: 80)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isSelected ? LunaraColors.warmGold : LunaraColors.coolLightGray.opacity(0.3))
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// Dashboard Metric Card
struct DashboardMetricCard: View {
    let title: String
    let value: String
    let change: Double?
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(color)

                Spacer()

                if let change = change {
                    ChangeIndicator(change: change)
                }
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 12))
                    .foregroundColor(LunaraColors.secondaryText)

                Text(value)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
}

// Analytics Card
struct AnalyticsCard<Content: View>: View {
    let title: String
    let description: String
    let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)

                Text(description)
                    .font(.system(size: 12))
                    .foregroundColor(LunaraColors.secondaryText)
            }

            content()
        }
        .padding(20)
        .background(LunaraColors.white)
        .cornerRadius(16)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
}

// Change Indicator
struct ChangeIndicator: View {
    let change: Double

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: change >= 0 ? "arrow.up" : "arrow.down")
                .font(.system(size: 10, weight: .bold))

            Text("\(abs(change), specifier: "%.1f")%")
                .font(.system(size: 11, weight: .semibold))
        }
        .foregroundColor(change >= 0 ? LunaraColors.success : LunaraColors.error)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill((change >= 0 ? LunaraColors.success : LunaraColors.error).opacity(0.1))
        )
    }
}


