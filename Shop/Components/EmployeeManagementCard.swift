//
//  EmployeeManagementCard.swift
//  LunaraApp
//
//  Created by Lunara Team on 24/07/2025.
//

import SwiftUI

/// Card component for displaying employee information in management view
struct EmployeeManagementCard: View {
    // MARK: - Properties
    let employee: Employee
    let onTap: () -> Void
    let onToggleStatus: () -> Void
    let onEdit: () -> Void

    // MARK: - Initializers
    init(employee: Employee, onTap: @escaping () -> Void, onToggleStatus: @escaping () -> Void, onEdit: @escaping () -> Void) {
        self.employee = employee
        self.onTap = onTap
        self.onToggleStatus = onToggleStatus
        self.onEdit = onEdit
    }

    // Convenience initializer for OwnerEmployee
    init(employee: OwnerEmployee, onTap: @escaping () -> Void, onToggleStatus: @escaping () -> Void, onEdit: @escaping () -> Void) {
        // Convert OwnerEmployee to Employee for display purposes
        self.employee = Employee(
            id: employee.id, // Use computed id property
            fullName: employee.name,
            name: employee.name,
            email: employee.email,
            phone: employee.phone,
            bio: employee.bio,
            specialties: employee.specialtiesArray,
            yearsExperience: employee.yearsExperience,
            hourlyRate: employee.hourlyRate,
            commissionRate: employee.commissionRate,
            hireDate: employee.hireDate ?? "", // Handle optional hireDate
            active: employee.active,
            avatar: employee.avatar,
            invitationStatus: employee.invitationStatus,
            invitationId: employee.invitationId,
            shop: Shop.preview, // Placeholder shop since we don't need it for display
            user: nil,
            services: [],
            firstName: employee.name.components(separatedBy: " ").first,
            lastName: employee.name.components(separatedBy: " ").dropFirst().joined(separator: " ")
        )
        self.onTap = onTap
        self.onToggleStatus = onToggleStatus
        self.onEdit = onEdit
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Main content
            Button(action: onTap) {
                VStack(spacing: 12) {
                    // Header with avatar and basic info
                    HStack(spacing: 12) {
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
                                        .font(.system(size: 16, weight: .medium))
                                        .foregroundColor(LunaraColors.warmGold)
                                )
                        }
                        .frame(width: 50, height: 50)
                        .clipShape(Circle())
                        
                        // Employee info
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(employee.fullName ?? employee.displayName)
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(LunaraColors.primaryText)
                                
                                Spacer()
                                
                                // Status indicator
                                statusIndicator
                            }
                            
                            if let specialties = employee.specialties, !specialties.isEmpty {
                                Text(specialties.joined(separator: ", "))
                                    .font(.system(size: 14))
                                    .foregroundColor(LunaraColors.secondaryText)
                                    .lineLimit(1)
                            }
                            
                            HStack {
                                Text(employee.email)
                                    .font(.system(size: 12))
                                    .foregroundColor(LunaraColors.secondaryText)
                                
                                Spacer()
                                
                                if let hourlyRate = employee.hourlyRate {
                                    Text("$\(hourlyRate, specifier: "%.0f")/hr")
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundColor(LunaraColors.warmGold)
                                }
                            }
                        }
                        
                        // Chevron
                        Image(systemName: "chevron.right")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                    
                    // Additional info if available
                    if employee.yearsExperience > 0 || employee.invitationStatus != nil {
                        HStack {
                            if employee.yearsExperience > 0 {
                                Label("\(employee.yearsExperience) years experience", systemImage: "star.fill")
                                    .font(.system(size: 12))
                                    .foregroundColor(LunaraColors.secondaryText)
                            }
                            
                            Spacer()
                            
                            if let invitationStatus = employee.invitationStatus {
                                invitationStatusBadge(status: invitationStatus)
                            }
                        }
                    }
                }
                .padding(16)
            }
            .buttonStyle(PlainButtonStyle())
            
            // Action buttons
            HStack(spacing: 0) {
                // Edit button
                Button(action: onEdit) {
                    HStack(spacing: 6) {
                        Image(systemName: "pencil")
                        Text("Edit")
                    }
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.info)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                }
                
                Divider()
                    .frame(height: 20)
                
                // Status toggle button
                Button(action: onToggleStatus) {
                    HStack(spacing: 6) {
                        Image(systemName: employee.active ? "pause.circle" : "play.circle")
                        Text(employee.active ? "Deactivate" : "Activate")
                    }
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(employee.active ? LunaraColors.error : LunaraColors.success)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                }
            }
            .background(LunaraColors.coolLightGray.opacity(0.3))
        }
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Status Indicator
    private var statusIndicator: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(employee.active ? LunaraColors.success : LunaraColors.error)
                .frame(width: 6, height: 6)
            
            Text(employee.active ? "Active" : "Inactive")
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(employee.active ? LunaraColors.success : LunaraColors.error)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            (employee.active ? LunaraColors.success : LunaraColors.error)
                .opacity(0.1)
        )
        .cornerRadius(12)
    }
    
    // MARK: - Invitation Status Badge
    private func invitationStatusBadge(status: String) -> some View {
        Text(status.capitalized)
            .font(.system(size: 11, weight: .medium))
            .foregroundColor(invitationStatusColor(status))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                invitationStatusColor(status).opacity(0.1)
            )
            .cornerRadius(12)
    }
    
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
}



#Preview {
    VStack(spacing: 16) {
        EmployeeManagementCard(
            employee: Employee.preview,
            onTap: { },
            onToggleStatus: { },
            onEdit: { }
        )
        
        EmployeeManagementCard(
            employee: Employee(
                id: "2",
                fullName: "Jane Smith",
                name: "Jane Smith",
                email: "jane@example.com",
                phone: "+1234567890",
                bio: "Experienced stylist",
                specialties: ["Hair Styling", "Color"],
                yearsExperience: 5,
                hourlyRate: 75,
                commissionRate: 0.3,
                hireDate: "2023-01-15",
                active: false,
                avatar: nil,
                invitationStatus: "pending",
                invitationId: nil,
                shop: Shop.preview,
                user: nil,
                services: [],
                firstName: "Jane",
                lastName: "Smith"
            ),
            onTap: { },
            onToggleStatus: { },
            onEdit: { }
        )
    }
    .padding()
    .background(LunaraColors.coolLightGray)
}
