//
//  ScheduleManagementView.swift
//  LunaraApp
//
//  Created by Lunara Team on 28/07/2025.
//

import SwiftUI

/// Schedule management view for shop owners
struct ScheduleManagementView: View {
    // MARK: - Properties
    let shop: Shop
    
    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var appState: AppState
    
    // MARK: - State
    @State private var schedules: [EmployeeScheduleData] = []
    @State private var employees: [OwnerEmployee] = []
    @State private var selectedEmployeeId: String? = nil
    @State private var isLoading = true
    @State private var isRefreshing = false
    @State private var errorMessage: String?
    @State private var showingError = false
    @State private var showingEmployeeScheduleEdit = false
    @State private var selectedEmployeeForEdit: EmployeeScheduleData?
    
    // MARK: - Computed Properties
    private var filteredSchedules: [EmployeeScheduleData] {
        if let selectedEmployeeId = selectedEmployeeId {
            return schedules.filter { $0.employeeId == selectedEmployeeId }
        }
        return schedules
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                if isLoading {
                    loadingView
                } else {
                    scheduleContentView
                }
            }
            .navigationTitle("Schedule Management")
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
                        Task {
                            await refreshSchedules()
                        }
                    }
                    .foregroundColor(LunaraColors.warmGold)
                    .disabled(isRefreshing)
                }
            }
        }
        .onAppear {
            loadInitialData()
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage ?? "An error occurred")
        }
        .sheet(isPresented: $showingEmployeeScheduleEdit) {
            if let employee = selectedEmployeeForEdit {
                EmployeeScheduleEditView(
                    shop: shop,
                    employeeSchedule: employee,
                    onScheduleUpdated: {
                        Task {
                            await refreshSchedules()
                        }
                    }
                )
            }
        }
    }
    
    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
                .tint(LunaraColors.warmGold)
            
            Text("Loading schedules...")
                .font(.system(size: 16))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.white)
    }
    
    // MARK: - Schedule Content View
    private var scheduleContentView: some View {
        VStack(spacing: 0) {
            // Employee Filter
            employeeFilterView
            
            // Schedules List
            if filteredSchedules.isEmpty {
                emptyStateView
            } else {
                scheduleListView
            }
        }
        .background(LunaraColors.coolLightGray.opacity(0.3))
    }
    
    // MARK: - Employee Filter View
    private var employeeFilterView: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Filter by Employee")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
            }
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    // All Employees option
                    FilterChip(
                        title: "All Employees",
                        isSelected: selectedEmployeeId == nil,
                        action: {
                            selectedEmployeeId = nil
                        }
                    )
                    
                    // Individual employees
                    ForEach(employees, id: \.id) { employee in
                        FilterChip(
                            title: employee.displayName,
                            isSelected: selectedEmployeeId == employee.id,
                            action: {
                                selectedEmployeeId = employee.id
                            }
                        )
                    }
                }
                .padding(.horizontal, 16)
            }
            .padding(.horizontal, -16)
        }
        .padding(.horizontal, 16)
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
                            showingEmployeeScheduleEdit = true
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
            .padding(.bottom, 32)
        }
        .refreshable {
            await refreshSchedules()
        }
    }
    
    // MARK: - Empty State View
    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "clock.badge.questionmark")
                .font(.system(size: 48))
                .foregroundColor(LunaraColors.secondaryText)
            
            Text("No Schedules Found")
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            Text(selectedEmployeeId != nil ? 
                 "This employee doesn't have any schedules set up yet." :
                 "No employees have schedules set up yet.")
                .font(.system(size: 16))
                .foregroundColor(LunaraColors.secondaryText)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.white)
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
            let employeeList = try await APIClient.shared.getOwnerShopEmployees(shopId: shop.id)
            await MainActor.run {
                employees = employeeList.filter { $0.isAcceptedEmployee }
            }
        } catch {
            await MainActor.run {
                errorMessage = "Failed to load employees: \(error.localizedDescription)"
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
        do {
            let response = try await APIClient.shared.toggleScheduleSlot(slotId: slotId)

            await MainActor.run {
                // Show success message briefly
                errorMessage = response.message
                showingError = true

                // Refresh schedules to show updated state
                Task {
                    await refreshSchedules()
                }
            }
        } catch {
            await MainActor.run {
                errorMessage = "Failed to toggle schedule slot: \(error.localizedDescription)"
                showingError = true
            }
        }
    }
}

// MARK: - Filter Chip Component
struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(isSelected ? LunaraColors.white : LunaraColors.primaryText)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    isSelected ? LunaraColors.warmGold : LunaraColors.coolLightGray
                )
                .cornerRadius(20)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    ScheduleManagementView(shop: Shop.preview)
        .environmentObject(AppState.shared)
}
