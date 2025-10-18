//
//  EmployeeScheduleView.swift
//  LunaraApp
//
//  Created by Lunara Team on 24/07/2025.
//

import SwiftUI

/// View for displaying and managing employee schedules
struct EmployeeScheduleView: View {
    // MARK: - Properties
    let employee: Employee
    
    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss
    
    // MARK: - State
    @State private var schedule: [String: [ScheduleSlot]] = [:]
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showingError = false
    
    private let daysOfWeek = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]
    private let dayDisplayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                if isLoading {
                    loadingView
                } else {
                    scheduleContentView
                }
            }
            .navigationTitle("\(employee.displayName)'s Schedule")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.secondaryText)
                }
            }
        }
        .onAppear {
            loadSchedule()
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage ?? "An error occurred")
        }
    }
    
    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
                .tint(LunaraColors.warmGold)
            
            Text("Loading schedule...")
                .font(.system(size: 16))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.white)
    }
    
    // MARK: - Schedule Content View
    private var scheduleContentView: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Employee info header
                employeeHeaderView
                
                // Weekly schedule
                weeklyScheduleView
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 32)
        }
        .background(LunaraColors.coolLightGray.opacity(0.3))
    }
    
    // MARK: - Employee Header View
    private var employeeHeaderView: some View {
        VStack(spacing: 12) {
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
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(LunaraColors.warmGold)
                    )
            }
            .frame(width: 60, height: 60)
            .clipShape(Circle())
            
            VStack(spacing: 4) {
                Text(employee.displayName)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                if let specialties = employee.specialties, !specialties.isEmpty {
                    Text(specialties.joined(separator: ", "))
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)
                }
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Weekly Schedule View
    private var weeklyScheduleView: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Weekly Schedule")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            VStack(spacing: 12) {
                ForEach(Array(zip(daysOfWeek, dayDisplayNames)), id: \.0) { dayKey, dayName in
                    dayScheduleRow(dayKey: dayKey, dayName: dayName)
                }
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Day Schedule Row
    private func dayScheduleRow(dayKey: String, dayName: String) -> some View {
        HStack {
            // Day name
            Text(dayName)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.primaryText)
                .frame(width: 80, alignment: .leading)
            
            Spacer()
            
            // Schedule slots for this day
            if let daySlots = schedule[dayKey], !daySlots.isEmpty {
                VStack(alignment: .trailing, spacing: 4) {
                    ForEach(daySlots, id: \.id) { slot in
                        Text(slot.formattedTimeRange)
                            .font(.system(size: 14))
                            .foregroundColor(slot.active ? LunaraColors.primaryText : LunaraColors.secondaryText)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(
                                slot.active ? 
                                LunaraColors.warmGold.opacity(0.1) : 
                                LunaraColors.charcoalGray.opacity(0.1)
                            )
                            .cornerRadius(6)
                    }
                }
            } else {
                Text("Not available")
                    .font(.system(size: 14))
                    .foregroundColor(LunaraColors.secondaryText)
                    .italic()
            }
        }
        .padding(.vertical, 8)
    }
    
    // MARK: - Methods
    private func loadSchedule() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let response = try await APIClient.shared.getEmployeeSchedule(employeeId: employee.id)
                await MainActor.run {
                    schedule = response.schedule
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
}

// MARK: - Schedule Models
struct ScheduleSlot: Codable, Identifiable {
    let id: String
    let dayOfWeek: String
    let startTime: String
    let endTime: String
    let formattedTimeRange: String
    let durationMinutes: Int
    let active: Bool
}

struct EmployeeScheduleResponse: Codable {
    let employeeId: String
    let employeeName: String
    let schedule: [String: [ScheduleSlot]]
}

struct EmployeeScheduleData: Codable, Identifiable {
    let employeeId: String
    let employeeName: String
    let employeeEmail: String
    let schedule: [String: [ScheduleSlot]]

    var id: String { employeeId }
}

struct ShopSchedulesResponse: Codable {
    let shopId: String
    let shopName: String
    let schedules: [EmployeeScheduleData]
}

struct ScheduleSlotRequest: Codable {
    let id: String? // Optional ID for updating existing slots
    let dayOfWeek: String
    let startTime: String
    let endTime: String
}

struct ScheduleUpdateResponse: Codable {
    let message: String
    let employeeId: String
    let employeeName: String
    let slotsCreated: Int
    let slotsUpdated: Int
    let totalActiveSlots: Int
}

struct ScheduleDeleteResponse: Codable {
    let message: String
    let slotId: String?
    let active: Bool?
    let updatedAt: String?
}

struct ScheduleToggleResponse: Codable {
    let message: String
    let slotId: String
    let active: Bool
    let updatedAt: String
    let employeeName: String
    let dayOfWeek: String
    let timeRange: String
}

#Preview {
    EmployeeScheduleView(employee: Employee.preview)
}
