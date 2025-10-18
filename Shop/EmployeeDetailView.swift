//
//  EmployeeDetailView.swift
//  LunaraApp
//
//  Created by Lunara Team on 24/07/2025.
//

import SwiftUI

/// Detailed view for viewing and editing employee information
struct EmployeeDetailView: View {
    // MARK: - Properties
    let employee: Employee
    let shop: Shop
    let onEmployeeUpdated: () -> Void

    // MARK: - Initializers
    init(employee: Employee, shop: Shop, onEmployeeUpdated: @escaping () -> Void) {
        self.employee = employee
        self.shop = shop
        self.onEmployeeUpdated = onEmployeeUpdated
    }

    // Convenience initializer for OwnerEmployee
    init(employee: OwnerEmployee, shop: Shop, onEmployeeUpdated: @escaping () -> Void) {
        self.employee = employee.toEmployee(shop: shop)
        self.shop = shop
        self.onEmployeeUpdated = onEmployeeUpdated
    }
    
    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss
    
    // MARK: - State
    @StateObject private var shopService = ShopService.shared
    @State private var isEditing = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showingError = false
    @State private var showingSchedule = false
    
    // Edit form state
    @State private var editedBio = ""
    @State private var editedSpecialties: [String] = []
    @State private var editedYearsExperience = 0
    @State private var editedHourlyRate = ""
    @State private var editedCommissionRate = 0.0
    @State private var newSpecialty = ""
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Employee Header
                    employeeHeaderView
                    
                    // Employee Details
                    if isEditing {
                        editFormView
                    } else {
                        detailsView
                    }
                    
                    // Action Buttons
                    if !isEditing {
                        actionButtonsView
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 32)
            }
            .navigationTitle(isEditing ? "Edit Employee" : "Employee Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(isEditing ? "Cancel" : "Done") {
                        if isEditing {
                            cancelEditing()
                        } else {
                            dismiss()
                        }
                    }
                    .foregroundColor(LunaraColors.secondaryText)
                }
                
                if isEditing {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("Save") {
                            saveChanges()
                        }
                        .foregroundColor(LunaraColors.warmGold)
                        .disabled(isLoading)
                    }
                } else {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("Edit") {
                            startEditing()
                        }
                        .foregroundColor(LunaraColors.warmGold)
                    }
                }
            }
        }
        .sheet(isPresented: $showingSchedule) {
            EmployeeScheduleView(employee: employee)
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage ?? "An error occurred")
        }
    }
    
    // MARK: - Employee Header View
    private var employeeHeaderView: some View {
        VStack(spacing: 16) {
            // Avatar
            AsyncImage(url: URL(string: employee.avatar ?? "")) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Circle()
                    .fill(LunaraColors.warmGold.opacity(0.2))
                    .overlay(
                        Text(employee.initials)
                            .font(.system(size: 32, weight: .medium))
                            .foregroundColor(LunaraColors.warmGold)
                    )
            }
            .frame(width: 100, height: 100)
            .clipShape(Circle())
            
            // Name and status
            VStack(spacing: 8) {
                Text(employee.fullName ?? employee.displayName)
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                
                HStack(spacing: 12) {
                    // Status badge
                    HStack(spacing: 6) {
                        Circle()
                            .fill(employee.active ? LunaraColors.success : LunaraColors.error)
                            .frame(width: 8, height: 8)
                        
                        Text(employee.active ? "Active" : "Inactive")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(employee.active ? LunaraColors.success : LunaraColors.error)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(
                        (employee.active ? LunaraColors.success : LunaraColors.error)
                            .opacity(0.1)
                    )
                    .cornerRadius(16)
                    
                    // Invitation status if applicable
                    if let invitationStatus = employee.invitationStatus {
                        Text(invitationStatus.capitalized)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(invitationStatusColor(invitationStatus))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(
                                invitationStatusColor(invitationStatus).opacity(0.1)
                            )
                            .cornerRadius(16)
                    }
                }
            }
        }
        .padding(.top, 16)
    }
    
    // MARK: - Details View
    private var detailsView: some View {
        VStack(spacing: 20) {
            // Contact Information
            detailSection("Contact Information") {
                VStack(spacing: 12) {
                    detailRow("Email", employee.email)
                    detailRow("Phone", employee.phone ?? "Not provided")
                }
            }
            
            // Professional Information
            detailSection("Professional Information") {
                VStack(spacing: 12) {
                    if let bio = employee.bio, !bio.isEmpty {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Bio")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(LunaraColors.primaryText)
                            
                            Text(bio)
                                .font(.system(size: 14))
                                .foregroundColor(LunaraColors.secondaryText)
                        }
                    }
                    
                    if let specialties = employee.specialties, !specialties.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Specialties")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(LunaraColors.primaryText)
                            
                            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2), spacing: 8) {
                                ForEach(specialties, id: \.self) { specialty in
                                    Text(specialty)
                                        .font(.system(size: 12))
                                        .foregroundColor(LunaraColors.primaryText)
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 6)
                                        .background(LunaraColors.warmGold.opacity(0.1))
                                        .cornerRadius(8)
                                }
                            }
                        }
                    }
                    
                    if employee.yearsExperience > 0 {
                        detailRow("Experience", "\(employee.yearsExperience) years")
                    }
                    
                    if let hourlyRate = employee.hourlyRate {
                        detailRow("Hourly Rate", String(format: "$%.0f", hourlyRate))
                    }
                    
                    if employee.commissionRate > 0 {
                        detailRow("Commission Rate", "\(Int(employee.commissionRate * 100))%")
                    }
                    
                    detailRow("Hire Date", formatDate(employee.hireDate))
                }
            }
        }
    }
    
    // MARK: - Edit Form View
    private var editFormView: some View {
        VStack(spacing: 20) {
            // Professional Information Section
            detailSection("Professional Information") {
                VStack(spacing: 16) {
                    FormFieldView(
                        title: "Bio",
                        text: $editedBio,
                        placeholder: "Brief description of experience and skills...",
                        isMultiline: true
                    )
                    
                    // Specialties
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Specialties")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(LunaraColors.primaryText)
                        
                        // Add specialty field
                        HStack {
                            TextField("Add specialty", text: $newSpecialty)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                            
                            Button("Add") {
                                addSpecialty()
                            }
                            .disabled(newSpecialty.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                            .foregroundColor(LunaraColors.warmGold)
                        }
                        
                        // Specialties list
                        if !editedSpecialties.isEmpty {
                            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2), spacing: 8) {
                                ForEach(editedSpecialties, id: \.self) { specialty in
                                    HStack {
                                        Text(specialty)
                                            .font(.system(size: 12))
                                            .foregroundColor(LunaraColors.primaryText)
                                        
                                        Spacer()
                                        
                                        Button(action: {
                                            removeSpecialty(specialty)
                                        }) {
                                            Image(systemName: "xmark.circle.fill")
                                                .foregroundColor(LunaraColors.error)
                                                .font(.system(size: 14))
                                        }
                                    }
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(LunaraColors.coolLightGray.opacity(0.5))
                                    .cornerRadius(8)
                                }
                            }
                        }
                    }
                    
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Years of Experience")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(LunaraColors.primaryText)
                            
                            Stepper(value: $editedYearsExperience, in: 0...50) {
                                Text("\(editedYearsExperience) years")
                                    .font(.system(size: 16))
                                    .foregroundColor(LunaraColors.primaryText)
                            }
                        }
                        
                        FormFieldView(
                            title: "Hourly Rate ($)",
                            text: $editedHourlyRate,
                            placeholder: "50",
                            keyboardType: .decimalPad
                        )
                    }
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Commission Rate (\(Int(editedCommissionRate * 100))%)")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(LunaraColors.primaryText)
                        
                        Slider(value: $editedCommissionRate, in: 0...1, step: 0.05)
                            .tint(LunaraColors.warmGold)
                    }
                }
            }
        }
    }
    
    // MARK: - Action Buttons View
    private var actionButtonsView: some View {
        VStack(spacing: 12) {
            Button(action: {
                showingSchedule = true
            }) {
                HStack {
                    Image(systemName: "calendar")
                    Text("View Schedule")
                }
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(LunaraColors.warmGold.opacity(0.1))
                .cornerRadius(12)
            }
        }
    }
    
    // MARK: - Helper Views
    private func detailSection<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            content()
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    private func detailRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(LunaraColors.primaryText)
            
            Spacer()
            
            Text(value)
                .font(.system(size: 14))
                .foregroundColor(LunaraColors.secondaryText)
        }
    }
    
    // MARK: - Helper Methods
    private func invitationStatusColor(_ status: String) -> Color {
        switch status.lowercased() {
        case "pending":
            return LunaraColors.warning
        case "accepted":
            return LunaraColors.success
        case "declined", "expired":
            return LunaraColors.error
        default:
            return LunaraColors.secondaryText
        }
    }
    
    private func formatDate(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        
        if let date = formatter.date(from: dateString) {
            formatter.dateStyle = .medium
            return formatter.string(from: date)
        }
        
        return dateString
    }
    
    private func startEditing() {
        editedBio = employee.bio ?? ""
        editedSpecialties = employee.specialties ?? []
        editedYearsExperience = employee.yearsExperience
        editedHourlyRate = employee.hourlyRate != nil ? String(employee.hourlyRate!) : ""
        editedCommissionRate = employee.commissionRate
        isEditing = true
    }
    
    private func cancelEditing() {
        isEditing = false
        newSpecialty = ""
    }
    
    private func addSpecialty() {
        let trimmedSpecialty = newSpecialty.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedSpecialty.isEmpty && !editedSpecialties.contains(trimmedSpecialty) {
            editedSpecialties.append(trimmedSpecialty)
            newSpecialty = ""
        }
    }
    
    private func removeSpecialty(_ specialty: String) {
        editedSpecialties.removeAll { $0 == specialty }
    }
    
    private func saveChanges() {
        isLoading = true
        errorMessage = nil
        
        let request = EmployeeCreationRequest(
            bio: editedBio.isEmpty ? nil : editedBio,
            specialties: editedSpecialties.isEmpty ? nil : editedSpecialties.joined(separator: ", "),
            yearsExperience: editedYearsExperience,
            hourlyRate: Double(editedHourlyRate),
            commissionRate: editedCommissionRate
        )
        
        Task {
            do {
                _ = try await shopService.updateEmployee(employeeId: employee.id, request)
                await MainActor.run {
                    isLoading = false
                    isEditing = false
                    onEmployeeUpdated()
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = error.localizedDescription
                    showingError = true
                }
            }
        }
    }

}

#Preview {
    EmployeeDetailView(
        employee: Employee.preview,
        shop: Shop.preview
    ) {
        print("Employee updated")
    }
}
