//
//  ServiceManagementView.swift
//  LunaraApp
//
//  Created by Lunara Team on 16/07/2025.
//

import SwiftUI

/// Service management view for shop owners
struct ServiceManagementView: View {
    // MARK: - Properties
    let shop: Shop
    
    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var authService: AuthenticationService
    
    // MARK: - State
    @StateObject private var shopService = ShopService.shared
    @State private var services: [Service] = []
    @State private var isLoading = true
    @State private var showingServiceCreation = false
    @State private var selectedService: Service?
    @State private var showingDeleteConfirmation = false
    @State private var showingDeactivateConfirmation = false
    @State private var errorMessage = ""
    @State private var showingError = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                if isLoading {
                    loadingView
                } else if services.isEmpty {
                    emptyServicesView
                } else {
                    serviceListView
                }
            }
            .navigationTitle("Manage Services")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.secondaryText)
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        showingServiceCreation = true
                    }) {
                        Image(systemName: "plus")
                            .foregroundColor(LunaraColors.warmGold)
                    }
                }
            }
        }
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
            Text(errorMessage)
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
            Text("Are you sure you want to deactivate this service? It will no longer be available for booking.")
        }
    }
    
    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 16) {
            Spacer()
            
            ProgressView()
                .scaleEffect(1.2)
            
            Text("Loading services...")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.secondaryText)
            
            Spacer()
        }
    }
    
    // MARK: - Empty Services View
    private var emptyServicesView: some View {
        VStack(spacing: 32) {
            Spacer()
            
            Image(systemName: "scissors")
                .font(.system(size: 80))
                .foregroundColor(LunaraColors.warmGold.opacity(0.6))
            
            VStack(spacing: 16) {
                Text("No Services Yet")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text("Start building your service menu by adding your first service. You can always edit or add more later.")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
            
            Button(action: {
                showingServiceCreation = true
            }) {
                HStack(spacing: 8) {
                    Image(systemName: "plus")
                        .font(.system(size: 16, weight: .semibold))
                    
                    Text("Add Your First Service")
                        .font(.system(size: 16, weight: .semibold))
                }
                .foregroundColor(LunaraColors.buttonPrimaryText)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(LunaraColors.buttonPrimary)
                .cornerRadius(12)
            }
            .padding(.horizontal, 32)
            
            Spacer()
        }
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
            .padding(.top, 16)
            .padding(.bottom, 32)
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

// MARK: - Service Management Card
struct ServiceManagementCard: View {
    let service: Service
    let onEdit: () -> Void
    let onToggleStatus: () -> Void
    let onDelete: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(service.name)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)
                        .lineLimit(1)
                    
                    Text(service.description ?? "No description available")
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                        .lineLimit(2)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("$\(String(format: "%.2f", service.price))")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    Text("\(service.durationMinutes) min")
                        .font(.system(size: 12))
                        .foregroundColor(LunaraColors.secondaryText)
                }
            }
            
            HStack {
                // Status Badge
                HStack(spacing: 4) {
                    Circle()
                        .fill(service.active ? LunaraColors.success : LunaraColors.error)
                        .frame(width: 6, height: 6)
                    
                    Text(service.active ? "Active" : "Inactive")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(service.active ? LunaraColors.success : LunaraColors.error)
                }
                
                Spacer()
                
                // Action Buttons
                HStack(spacing: 8) {
                    Button(action: onEdit) {
                        Image(systemName: "pencil")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(LunaraColors.info)
                    }
                    
                    Button(action: onToggleStatus) {
                        Image(systemName: service.active ? "pause.circle" : "play.circle")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(service.active ? LunaraColors.warning : LunaraColors.success)
                    }
                    
                    Button(action: onDelete) {
                        Image(systemName: "trash")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(LunaraColors.error)
                    }
                }
            }
        }
        .padding(16)
        .background(LunaraColors.cardBackground)
        .cornerRadius(12)
        .shadow(color: LunaraColors.cardShadow, radius: 2, x: 0, y: 1)
    }
}

// MARK: - Service Creation View
struct ServiceCreationView: View {
    let shop: Shop
    let onServiceCreated: () -> Void
    @Environment(\.dismiss) private var dismiss

    // MARK: - State
    @StateObject private var shopService = ShopService.shared
    @State private var name = ""
    @State private var description = ""
    @State private var price = ""
    @State private var durationMinutes = 60
    @State private var selectedCategory = ""
    @State private var selectedEmployeeIds: Set<String> = []
    @State private var bookingBufferMinutes = 15

    // MARK: - Loading States
    @State private var isLoading = false
    @State private var isLoadingCategories = true
    @State private var isLoadingEmployees = true

    // MARK: - Data
    @State private var categories: [ServiceCategory] = []
    @State private var employees: [OwnerEmployee] = []

    // MARK: - Error Handling
    @State private var errorMessage = ""
    @State private var showingError = false

    // MARK: - Validation
    private var isFormValid: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        Double(price) != nil &&
        Double(price) ?? 0 > 0 &&
        durationMinutes >= 5 &&
        !selectedCategory.isEmpty &&
        !selectedEmployeeIds.isEmpty
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    serviceFormContent
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 20)
            }
            .navigationTitle("Create Service")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.secondaryText)
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Create") {
                        createService()
                    }
                    .foregroundColor(isFormValid ? LunaraColors.warmGold : LunaraColors.secondaryText)
                    .disabled(!isFormValid || isLoading)
                }
            }
        }
        .onAppear {
            loadInitialData()
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage)
        }
    }

    // MARK: - Form Content
    private var serviceFormContent: some View {
        VStack(spacing: 20) {
            // Service Name
            FormFieldView(
                title: "Service Name",
                text: $name,
                placeholder: "e.g., Haircut & Styling",
                isRequired: true
            )

            // Service Description
            FormFieldView(
                title: "Description",
                text: $description,
                placeholder: "Describe your service...",
                isRequired: true,
                isMultiline: true
            )

            // Price and Duration Row
            HStack(spacing: 16) {
                // Price
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Price")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(LunaraColors.primaryText)

                        Text("*")
                            .foregroundColor(.red)
                    }

                    TextField("0.00", text: $price)
                        .keyboardType(.decimalPad)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                }

                // Duration
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Duration")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(LunaraColors.primaryText)

                        Text("*")
                            .foregroundColor(.red)
                    }

                    DurationPickerView(selectedMinutes: $durationMinutes)
                }
            }

            // Category Selection
            if isLoadingCategories {
                categoryLoadingView
            } else {
                categorySelectionView
            }

            // Employee Selection
            if isLoadingEmployees {
                employeeLoadingView
            } else {
                employeeSelectionView
            }

            // Booking Buffer
            bookingBufferView

            // Create Button
            Button(action: createService) {
                if isLoading {
                    HStack {
                        ProgressView()
                            .scaleEffect(0.8)
                        Text("Creating...")
                    }
                } else {
                    Text("Create Service")
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(isFormValid ? LunaraColors.buttonPrimary : LunaraColors.coolLightGray)
            .foregroundColor(isFormValid ? LunaraColors.buttonPrimaryText : LunaraColors.secondaryText)
            .cornerRadius(12)
            .disabled(!isFormValid || isLoading)
        }
    }

    // MARK: - Category Views
    private var categoryLoadingView: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Category")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(LunaraColors.primaryText)

                Text("*")
                    .foregroundColor(.red)
            }

            HStack {
                ProgressView()
                    .scaleEffect(0.8)
                Text("Loading categories...")
                    .foregroundColor(LunaraColors.secondaryText)
                Spacer()
            }
            .padding()
            .background(LunaraColors.coolLightGray.opacity(0.3))
            .cornerRadius(8)
        }
    }

    private var categorySelectionView: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Category")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(LunaraColors.primaryText)

                Text("*")
                    .foregroundColor(.red)
            }

            Menu {
                ForEach(categories, id: \.value) { category in
                    Button(category.label) {
                        selectedCategory = category.value
                    }
                }
            } label: {
                HStack {
                    Text(selectedCategory.isEmpty ? "Select a category" :
                         categories.first(where: { $0.value == selectedCategory })?.label ?? selectedCategory)
                        .foregroundColor(selectedCategory.isEmpty ? LunaraColors.secondaryText : LunaraColors.primaryText)

                    Spacer()

                    Image(systemName: "chevron.down")
                        .foregroundColor(LunaraColors.secondaryText)
                }
                .padding()
                .background(LunaraColors.coolLightGray.opacity(0.3))
                .cornerRadius(8)
            }
        }
    }

    // MARK: - Employee Views
    private var employeeLoadingView: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Assign Employees")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(LunaraColors.primaryText)

                Text("*")
                    .foregroundColor(.red)
            }

            HStack {
                ProgressView()
                    .scaleEffect(0.8)
                Text("Loading employees...")
                    .foregroundColor(LunaraColors.secondaryText)
                Spacer()
            }
            .padding()
            .background(LunaraColors.coolLightGray.opacity(0.3))
            .cornerRadius(8)
        }
    }

    private var employeeSelectionView: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Assign Employees")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(LunaraColors.primaryText)

                Text("*")
                    .foregroundColor(.red)
            }

            if employees.isEmpty {
                VStack(spacing: 8) {
                    Text("No employees found")
                        .foregroundColor(LunaraColors.secondaryText)

                    Text("Add employees to your shop first")
                        .font(.caption)
                        .foregroundColor(LunaraColors.secondaryText)
                }
                .padding()
                .background(LunaraColors.coolLightGray.opacity(0.3))
                .cornerRadius(8)
            } else {
                LazyVStack(spacing: 8) {
                    ForEach(employees) { employee in
                        employeeSelectionRow(employee)
                    }
                }
                .padding()
                .background(LunaraColors.coolLightGray.opacity(0.3))
                .cornerRadius(8)
            }
        }
    }

    private func employeeSelectionRow(_ employee: OwnerEmployee) -> some View {
        HStack {
            Button(action: {
                if selectedEmployeeIds.contains(employee.id) {
                    selectedEmployeeIds.remove(employee.id)
                } else {
                    selectedEmployeeIds.insert(employee.id)
                }
            }) {
                HStack {
                    Image(systemName: selectedEmployeeIds.contains(employee.id) ? "checkmark.circle.fill" : "circle")
                        .foregroundColor(selectedEmployeeIds.contains(employee.id) ? LunaraColors.warmGold : LunaraColors.secondaryText)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(employee.displayName)
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(LunaraColors.primaryText)

                        if !employee.specialtiesArray.isEmpty {
                            Text(employee.specialtiesArray.joined(separator: ", "))
                                .font(.caption)
                                .foregroundColor(LunaraColors.secondaryText)
                                .lineLimit(1)
                        }
                    }

                    Spacer()
                }
            }
            .buttonStyle(PlainButtonStyle())
        }
    }

    // MARK: - Booking Buffer View
    private var bookingBufferView: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Booking Buffer (minutes)")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.primaryText)

            HStack {
                Stepper(value: $bookingBufferMinutes, in: 0...60, step: 5) {
                    Text("\(bookingBufferMinutes) minutes")
                        .foregroundColor(LunaraColors.primaryText)
                }
            }
            .padding()
            .background(LunaraColors.coolLightGray.opacity(0.3))
            .cornerRadius(8)

            Text("Buffer time between appointments")
                .font(.caption)
                .foregroundColor(LunaraColors.secondaryText)
        }
    }

    // MARK: - Data Loading Methods
    private func loadInitialData() {
        Task {
            await loadCategories()
            await loadEmployees()
        }
    }

    private func loadCategories() async {
        do {
            let categoriesData = try await APIClient.shared.getServiceCategories()
            await MainActor.run {
                categories = categoriesData
                isLoadingCategories = false
            }
        } catch {
            await MainActor.run {
                errorMessage = "Failed to load categories: \(error.localizedDescription)"
                showingError = true
                isLoadingCategories = false
            }
        }
    }

    private func loadEmployees() async {
        do {
            let employeesData = try await shopService.getOwnerShopEmployees(shopId: shop.id)
            await MainActor.run {
                employees = employeesData
                isLoadingEmployees = false
            }
        } catch {
            await MainActor.run {
                errorMessage = "Failed to load employees: \(error.localizedDescription)"
                showingError = true
                isLoadingEmployees = false
            }
        }
    }

    // MARK: - Service Creation
    private func createService() {
        guard isFormValid else { return }

        isLoading = true

        Task {
            do {
                let request = ServiceCreationRequest(
                    name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                    description: description.trimmingCharacters(in: .whitespacesAndNewlines),
                    price: Double(price) ?? 0,
                    durationMinutes: durationMinutes,
                    category: selectedCategory,
                    employeeIds: Array(selectedEmployeeIds),
                    shopId: shop.id,
                    active: nil, // Let backend determine based on employee assignment
                    bookingBufferMinutes: bookingBufferMinutes
                )

                _ = try await shopService.createService(shopId: shop.id, request)

                await MainActor.run {
                    isLoading = false
                    onServiceCreated()
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = "Failed to create service: \(error.localizedDescription)"
                    showingError = true
                }
            }
        }
    }
}

// MARK: - Preview
struct ServiceCreationView_Previews: PreviewProvider {
    static var previews: some View {
        ServiceCreationView(
            shop: Shop.preview,
            onServiceCreated: {}
        )
    }
}

// MARK: - Preview
struct ServiceManagementView_Previews: PreviewProvider {
    static var previews: some View {
        ServiceManagementView(shop: Shop.preview)
            .environmentObject(AuthenticationService.shared)
    }
}
