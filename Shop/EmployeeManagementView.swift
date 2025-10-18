//
//  EmployeeManagementView.swift
//  LunaraApp
//
//  Created by Lunara Team on 24/07/2025.
//

import SwiftUI

/// Employee management view for shop owners
struct EmployeeManagementView: View {
    // MARK: - Properties
    let shop: Shop
    
    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var appState: AppState
    
    // MARK: - State
    @StateObject private var shopService = ShopService.shared
    @State private var employees: [OwnerEmployee] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showingError = false
    @State private var showingEmployeeInvitation = false
    @State private var showingOwnerAssignment = false
    @State private var showingEmployeeDetails = false
    @State private var selectedEmployee: OwnerEmployee?
    @State private var showingDeleteConfirmation = false
    @State private var showingDeactivateConfirmation = false

    // MARK: - Computed Properties

    /// Check if the current user (owner) is already an employee at this shop
    private var isOwnerAlreadyEmployee: Bool {
        guard let currentUser = appState.currentUser else { return false }
        return employees.contains { employee in
            employee.email == currentUser.email
        }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                if isLoading {
                    loadingView
                } else if employees.isEmpty {
                    emptyEmployeesView
                } else {
                    employeeListView
                }
            }
            .navigationTitle("Manage Employees")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.secondaryText)
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack(spacing: 8) {
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

                        // Create Employee button
                        Button(action: {
                            showingEmployeeInvitation = true
                        }) {
                            Image(systemName: "plus")
                                .foregroundColor(LunaraColors.warmGold)
                        }
                    }
                }
            }
        }
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
        .sheet(isPresented: $showingEmployeeDetails) {
            if let employee = selectedEmployee {
                EmployeeDetailView(employee: employee, shop: shop) {
                    loadEmployees()
                }
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
            Text("Are you sure you want to deactivate this employee? They will no longer be able to accept appointments.")
        }
    }
    
    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
                .tint(LunaraColors.warmGold)
            
            Text("Loading employees...")
                .font(.system(size: 16))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.white)
    }
    
    // MARK: - Empty Employees View
    private var emptyEmployeesView: some View {
        VStack(spacing: 24) {
            Spacer()
            
            Image(systemName: "person.2")
                .font(.system(size: 60))
                .foregroundColor(LunaraColors.warmGold.opacity(0.6))
            
            VStack(spacing: 12) {
                Text("No Employees Yet")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text("Invite team members to help manage your shop and provide services to customers.")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
            
            VStack(spacing: 12) {
                // Become Employee button (only show if owner is not already an employee)
                if !isOwnerAlreadyEmployee {
                    Button(action: {
                        showingOwnerAssignment = true
                    }) {
                        HStack(spacing: 8) {
                            Image(systemName: "person.badge.plus")
                            Text("Become Employee")
                        }
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(LunaraColors.warmGold)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 12)
                        .background(LunaraColors.warmGold.opacity(0.1))
                        .cornerRadius(8)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(LunaraColors.warmGold, lineWidth: 1)
                        )
                    }
                }

                // Create Employee button
                Button(action: {
                    showingEmployeeInvitation = true
                }) {
                    HStack(spacing: 8) {
                        Image(systemName: "plus")
                        Text("Create an Employee")
                    }
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(LunaraColors.warmGold)
                    .cornerRadius(8)
                }
            }
            
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.white)
    }
    
    // MARK: - Employee List View
    private var employeeListView: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(employees) { employee in
                    EmployeeManagementCard(
                        employee: employee,
                        onTap: {
                            selectedEmployee = employee
                            showingEmployeeDetails = true
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
                            showingEmployeeDetails = true
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
                let updatedEmployee = try await shopService.activateEmployee(employeeId: employee.id)
                await MainActor.run {
                    if let index = employees.firstIndex(where: { $0.id == employee.id }) {
                        // Update with the actual response from the API
                        employees[index].active = updatedEmployee.active
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
                let updatedEmployee = try await shopService.deactivateEmployee(employeeId: employee.id)
                await MainActor.run {
                    if let index = employees.firstIndex(where: { $0.id == employee.id }) {
                        // Update with the actual response from the API
                        employees[index].active = updatedEmployee.active
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
}

#Preview {
    EmployeeManagementView(shop: Shop.preview)
        .environmentObject(AppState.shared)
}
