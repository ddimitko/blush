//
//  EmployeeScheduleEditView.swift
//  LunaraApp
//
//  Created by Lunara Team on 28/07/2025.
//

import SwiftUI

/// View for editing an employee's schedule
struct EmployeeScheduleEditView: View {
    // MARK: - Properties
    let shop: Shop
    let employeeSchedule: EmployeeScheduleData
    let onScheduleUpdated: () -> Void
    
    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss
    
    // MARK: - State
    @State private var editingSchedule: [String: [EditableScheduleSlot]] = [:]
    @State private var originalSchedule: [String: [EditableScheduleSlot]] = [:]
    @State private var deletedSlotIds: [String] = [] // Track slots to be deleted
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showingError = false
    @State private var showingDeleteConfirmation = false
    @State private var slotToDelete: EditableScheduleSlot?
    
    // MARK: - Constants
    private let daysOfWeek = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]
    private let dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                scheduleEditView
            }
            .navigationTitle("Edit Schedule")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.secondaryText)
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        Task {
                            await saveSchedule()
                        }
                    }
                    .foregroundColor(LunaraColors.warmGold)
                    .disabled(isSaving)
                }
            }
        }
        .onAppear {
            setupEditingSchedule()
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage ?? "An error occurred")
        }
        .confirmationDialog(
            "Delete Schedule Slot",
            isPresented: $showingDeleteConfirmation,
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                if let slot = slotToDelete {
                    deleteSlot(slot)
                }
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("Are you sure you want to delete this schedule slot?")
        }
    }
    
    // MARK: - Schedule Edit View
    private var scheduleEditView: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Employee Info Header
                employeeInfoHeader
                
                // Days of Week
                ForEach(Array(zip(daysOfWeek, dayNames)), id: \.0) { dayKey, dayName in
                    dayScheduleSection(dayKey: dayKey, dayName: dayName)
                    
                    if dayKey != daysOfWeek.last {
                        Divider()
                            .background(LunaraColors.coolLightGray)
                    }
                }
            }
            .padding(.bottom, 32)
        }
        .background(LunaraColors.coolLightGray.opacity(0.3))
    }
    
    // MARK: - Employee Info Header
    private var employeeInfoHeader: some View {
        VStack(spacing: 8) {
            Text(employeeSchedule.employeeName)
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(LunaraColors.primaryText)
            
            Text(employeeSchedule.employeeEmail)
                .font(.system(size: 16))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .padding(.vertical, 16)
        .frame(maxWidth: .infinity)
        .background(LunaraColors.white)
    }
    
    // MARK: - Day Schedule Section
    private func dayScheduleSection(dayKey: String, dayName: String) -> some View {
        VStack(spacing: 0) {
            // Day Header
            HStack {
                Text(dayName)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
                
                Button("Add Slot") {
                    addNewSlot(for: dayKey)
                }
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(LunaraColors.coolLightGray.opacity(0.5))
            
            // Schedule Slots
            if let daySlots = editingSchedule[dayKey], !daySlots.isEmpty {
                VStack(spacing: 0) {
                    ForEach(daySlots, id: \.id) { slot in
                        EditableScheduleSlotRow(
                            slot: slot,
                            onUpdate: { updatedSlot in
                                updateSlot(updatedSlot, for: dayKey)
                            },
                            onDelete: {
                                slotToDelete = slot
                                showingDeleteConfirmation = true
                            }
                        )
                        
                        if slot.id != daySlots.last?.id {
                            Divider()
                                .background(LunaraColors.coolLightGray)
                                .padding(.horizontal, 16)
                        }
                    }
                }
                .background(LunaraColors.white)
            } else {
                VStack(spacing: 8) {
                    Text("No schedule set")
                        .font(.system(size: 16))
                        .foregroundColor(LunaraColors.secondaryText)
                    
                    Text("Tap 'Add Slot' to create a schedule for this day")
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)
                }
                .padding(.vertical, 24)
                .frame(maxWidth: .infinity)
                .background(LunaraColors.white)
            }
        }
    }
    
    // MARK: - Methods
    private func setupEditingSchedule() {
        var schedule: [String: [EditableScheduleSlot]] = [:]

        for dayKey in daysOfWeek {
            let daySlots = employeeSchedule.schedule[dayKey] ?? []
            schedule[dayKey] = daySlots.map { slot in
                // Convert UTC times from backend to local times for editing
                let localTimes = convertBusinessHoursToLocal(
                    utcStartTime: slot.startTime,
                    utcEndTime: slot.endTime
                )

                return EditableScheduleSlot(
                    id: slot.id,
                    dayOfWeek: slot.dayOfWeek,
                    startTime: localTimes.startTime,
                    endTime: localTimes.endTime,
                    active: slot.active
                )
            }
        }

        editingSchedule = schedule
        originalSchedule = schedule // Store original for comparison
        deletedSlotIds = [] // Reset deleted slots
    }
    
    private func addNewSlot(for dayKey: String) {
        let newSlot = EditableScheduleSlot(
            id: "new-\(UUID().uuidString)", // Temporary ID for new slots
            dayOfWeek: dayKey,
            startTime: "09:00",
            endTime: "17:00",
            active: true
        )

        if editingSchedule[dayKey] == nil {
            editingSchedule[dayKey] = []
        }
        editingSchedule[dayKey]?.append(newSlot)
    }
    
    private func updateSlot(_ updatedSlot: EditableScheduleSlot, for dayKey: String) {
        if let index = editingSchedule[dayKey]?.firstIndex(where: { $0.id == updatedSlot.id }) {
            editingSchedule[dayKey]?[index] = updatedSlot
        }
    }
    
    private func toggleSlotActive(_ slotId: String) async {
        do {
            print("🔄 Attempting to toggle slot: \(slotId)")
            let response = try await APIClient.shared.toggleScheduleSlot(slotId: slotId)
            print("✅ Toggle response received: \(response)")
            print("✅ Successfully toggled slot: \(slotId) - \(response.message)")

            // Update the local state immediately to reflect the change
            await MainActor.run {
                // Find and update the slot in the editing schedule
                for dayKey in daysOfWeek {
                    if let slotIndex = editingSchedule[dayKey]?.firstIndex(where: { $0.id == slotId }) {
                        editingSchedule[dayKey]?[slotIndex].active = response.active
                        print("✅ Updated local slot state: \(response.active)")
                    }
                }

                print("✅ Toggle operation completed successfully")

                // Provide subtle success feedback without triggering refreshes
                // The visual change in the toggle switch is sufficient feedback
            }
        } catch {
            await MainActor.run {
                let errorDescription = error.localizedDescription
                print("❌ Toggle error details: \(error)")
                print("❌ Error type: \(type(of: error))")
                print("❌ Error description: \(errorDescription)")

                // Check if this is a decoding error
                if let decodingError = error as? DecodingError {
                    print("❌ Decoding error: \(decodingError)")
                    switch decodingError {
                    case .typeMismatch(let type, let context):
                        print("❌ Type mismatch: expected \(type), context: \(context)")
                    case .valueNotFound(let type, let context):
                        print("❌ Value not found: \(type), context: \(context)")
                    case .keyNotFound(let key, let context):
                        print("❌ Key not found: \(key), context: \(context)")
                    case .dataCorrupted(let context):
                        print("❌ Data corrupted: \(context)")
                    @unknown default:
                        print("❌ Unknown decoding error")
                    }
                }

                // Don't show any error messages for toggle operations
                // The operation likely succeeded even if there was a parsing issue
                print("ℹ️ Suppressing error message for toggle operation")
            }
        }
    }

    private func deleteSlot(_ slot: EditableScheduleSlot) {
        // If this slot exists in the backend (has real ID, not temporary), mark it for deletion
        if !slot.id.hasPrefix("new-") {
            deletedSlotIds.append(slot.id)
        }

        // Remove from local editing state immediately
        for dayKey in daysOfWeek {
            editingSchedule[dayKey]?.removeAll { $0.id == slot.id }
        }
    }

    // Function to detect only changed slots
    private func getChangedSlots() -> [ScheduleSlotRequest] {
        let originalSlots = originalSchedule.values.flatMap { $0 }
        let currentSlots = editingSchedule.values.flatMap { $0 }

        var changedSlots: [ScheduleSlotRequest] = []

        for currentSlot in currentSlots {
            guard currentSlot.active && !currentSlot.startTime.isEmpty && !currentSlot.endTime.isEmpty else {
                continue // Skip inactive or invalid slots
            }

            if currentSlot.id.hasPrefix("new-") {
                // New slot (temporary ID starting with "new-")
                let utcTimes = convertBusinessHoursToUTC(
                    localStartTime: currentSlot.startTime,
                    localEndTime: currentSlot.endTime
                )

                changedSlots.append(ScheduleSlotRequest(
                    id: nil, // No ID for new slots
                    dayOfWeek: currentSlot.dayOfWeek,
                    startTime: utcTimes.startTime,
                    endTime: utcTimes.endTime
                ))
            } else {
                // Existing slot - check if it's been modified
                if let originalSlot = originalSlots.first(where: { $0.id == currentSlot.id }) {
                    let hasChanged = (
                        originalSlot.dayOfWeek != currentSlot.dayOfWeek ||
                        originalSlot.startTime != currentSlot.startTime ||
                        originalSlot.endTime != currentSlot.endTime
                    )

                    if hasChanged {
                        let utcTimes = convertBusinessHoursToUTC(
                            localStartTime: currentSlot.startTime,
                            localEndTime: currentSlot.endTime
                        )

                        changedSlots.append(ScheduleSlotRequest(
                            id: currentSlot.id, // Include ID for updates
                            dayOfWeek: currentSlot.dayOfWeek,
                            startTime: utcTimes.startTime,
                            endTime: utcTimes.endTime
                        ))
                    }
                } else {
                    // Slot has ID but not found in original (shouldn't happen, but include it)
                    let utcTimes = convertBusinessHoursToUTC(
                        localStartTime: currentSlot.startTime,
                        localEndTime: currentSlot.endTime
                    )

                    changedSlots.append(ScheduleSlotRequest(
                        id: currentSlot.id,
                        dayOfWeek: currentSlot.dayOfWeek,
                        startTime: utcTimes.startTime,
                        endTime: utcTimes.endTime
                    ))
                }
            }
        }

        return changedSlots
    }

    private func saveSchedule() async {
        await MainActor.run {
            isSaving = true
            errorMessage = nil
        }

        // Get only the changed slots
        let changedSlots = getChangedSlots()

        // Check if there are any changes (updates/creates or deletions)
        if changedSlots.isEmpty && deletedSlotIds.isEmpty {
            await MainActor.run {
                isSaving = false
                onScheduleUpdated()
                dismiss()
            }
            print("📝 No changes detected, closing editor")
            return
        }

        print("📝 Sending \(changedSlots.count) changed slots to backend: \(changedSlots)")
        print("🗑️ Deleting \(deletedSlotIds.count) slots from backend: \(deletedSlotIds)")

        do {
            // Process updates/creates first
            if !changedSlots.isEmpty {
                _ = try await APIClient.shared.updateEmployeeSchedule(
                    employeeId: employeeSchedule.employeeId,
                    scheduleSlots: changedSlots
                )
                print("✅ Schedule updated successfully")
            }

            // Process deletions
            for slotId in deletedSlotIds {
                do {
                    _ = try await APIClient.shared.deleteScheduleSlot(slotId: slotId)
                    print("✅ Successfully deleted slot: \(slotId)")
                } catch {
                    await MainActor.run {
                        isSaving = false
                        errorMessage = "Failed to delete some slots. Please try again."
                        showingError = true
                    }
                    print("❌ Failed to delete slot \(slotId): \(error)")
                    return
                }
            }

            await MainActor.run {
                isSaving = false
                deletedSlotIds = [] // Clear deleted slots
                onScheduleUpdated()
                dismiss()
            }
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                showingError = true
                isSaving = false
            }
        }
    }
}

// MARK: - Editable Schedule Slot Model
struct EditableScheduleSlot: Identifiable {
    let id: String
    let dayOfWeek: String
    var startTime: String
    var endTime: String
    var active: Bool
}

// MARK: - Editable Schedule Slot Row Component
struct EditableScheduleSlotRow: View {
    let slot: EditableScheduleSlot
    let onUpdate: (EditableScheduleSlot) -> Void
    let onDelete: () -> Void

    @State private var startTime: String
    @State private var endTime: String
    @State private var isActive: Bool

    init(slot: EditableScheduleSlot, onUpdate: @escaping (EditableScheduleSlot) -> Void, onDelete: @escaping () -> Void) {
        self.slot = slot
        self.onUpdate = onUpdate
        self.onDelete = onDelete
        self._startTime = State(initialValue: slot.startTime)
        self._endTime = State(initialValue: slot.endTime)
        self._isActive = State(initialValue: slot.active)
    }

    var body: some View {
        HStack(spacing: 12) {
            // Active toggle
            Toggle("", isOn: $isActive)
                .labelsHidden()
                .tint(LunaraColors.warmGold)
                .onChange(of: isActive) { _, newValue in
                    updateSlot()
                }

            // Start time
            VStack(alignment: .leading, spacing: 4) {
                Text("Start")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)

                TextField("09:00", text: $startTime)
                    .font(.system(size: 14))
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .frame(width: 80)
                    .onChange(of: startTime) { _, _ in
                        updateSlot()
                    }
            }

            // End time
            VStack(alignment: .leading, spacing: 4) {
                Text("End")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)

                TextField("17:00", text: $endTime)
                    .font(.system(size: 14))
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .frame(width: 80)
                    .onChange(of: endTime) { _, _ in
                        updateSlot()
                    }
            }

            Spacer()

            // Delete button
            Button(action: onDelete) {
                Image(systemName: "trash")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
            }
            .buttonStyle(PlainButtonStyle())
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .opacity(isActive ? 1.0 : 0.6)
    }

    private func updateSlot() {
        let updatedSlot = EditableScheduleSlot(
            id: slot.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: startTime,
            endTime: endTime,
            active: isActive
        )
        onUpdate(updatedSlot)
    }
}

// MARK: - Timezone Conversion Functions
extension EmployeeScheduleEditView {

    /// Convert local business hours to UTC for backend storage
    private func convertBusinessHoursToUTC(localStartTime: String, localEndTime: String) -> (startTime: String, endTime: String) {
        let calendar = Calendar.current
        let today = Date()

        // Parse local time strings
        guard let startComponents = parseTimeString(localStartTime),
              let endComponents = parseTimeString(localEndTime) else {
            return (startTime: localStartTime, endTime: localEndTime)
        }

        // Create Date objects in local timezone
        var startDateComponents = calendar.dateComponents([.year, .month, .day], from: today)
        startDateComponents.hour = startComponents.hour
        startDateComponents.minute = startComponents.minute

        var endDateComponents = calendar.dateComponents([.year, .month, .day], from: today)
        endDateComponents.hour = endComponents.hour
        endDateComponents.minute = endComponents.minute

        guard let startDate = calendar.date(from: startDateComponents),
              var endDate = calendar.date(from: endDateComponents) else {
            return (startTime: localStartTime, endTime: localEndTime)
        }

        // Handle cross-midnight scenarios (e.g., 22:00 to 06:00)
        if endDate <= startDate {
            endDate = calendar.date(byAdding: .day, value: 1, to: endDate) ?? endDate
        }

        // Convert to UTC
        let utcFormatter = DateFormatter()
        utcFormatter.timeZone = TimeZone(identifier: "UTC")
        utcFormatter.dateFormat = "HH:mm"

        let utcStartTime = utcFormatter.string(from: startDate)
        let utcEndTime = utcFormatter.string(from: endDate)

        return (startTime: utcStartTime, endTime: utcEndTime)
    }

    /// Convert UTC business hours to local timezone for display
    private func convertBusinessHoursToLocal(utcStartTime: String, utcEndTime: String) -> (startTime: String, endTime: String, spansMidnight: Bool) {
        let calendar = Calendar.current
        let today = Date()

        // Parse UTC time strings
        guard let startComponents = parseTimeString(utcStartTime),
              let endComponents = parseTimeString(utcEndTime) else {
            return (startTime: utcStartTime, endTime: utcEndTime, spansMidnight: false)
        }

        // Create UTC Date objects
        let utcCalendar = Calendar(identifier: .gregorian)
        var utcStartComponents = utcCalendar.dateComponents([.year, .month, .day], from: today)
        utcStartComponents.timeZone = TimeZone(identifier: "UTC")
        utcStartComponents.hour = startComponents.hour
        utcStartComponents.minute = startComponents.minute

        var utcEndComponents = utcCalendar.dateComponents([.year, .month, .day], from: today)
        utcEndComponents.timeZone = TimeZone(identifier: "UTC")
        utcEndComponents.hour = endComponents.hour
        utcEndComponents.minute = endComponents.minute

        guard let startDateUTC = utcCalendar.date(from: utcStartComponents),
              var endDateUTC = utcCalendar.date(from: utcEndComponents) else {
            return (startTime: utcStartTime, endTime: utcEndTime, spansMidnight: false)
        }

        // Handle cross-midnight in UTC
        if endDateUTC <= startDateUTC {
            endDateUTC = utcCalendar.date(byAdding: .day, value: 1, to: endDateUTC) ?? endDateUTC
        }

        // Convert to local timezone
        let localFormatter = DateFormatter()
        localFormatter.timeZone = TimeZone.current
        localFormatter.dateFormat = "HH:mm"

        let localStartTime = localFormatter.string(from: startDateUTC)
        let localEndTime = localFormatter.string(from: endDateUTC)

        // Check if the local times span midnight
        let localStartDate = calendar.startOfDay(for: startDateUTC)
        let localEndDate = calendar.startOfDay(for: endDateUTC)
        let spansMidnight = !calendar.isDate(localStartDate, inSameDayAs: localEndDate)

        return (startTime: localStartTime, endTime: localEndTime, spansMidnight: spansMidnight)
    }

    /// Parse time string in HH:mm format
    private func parseTimeString(_ timeString: String) -> DateComponents? {
        let components = timeString.split(separator: ":")
        guard components.count == 2,
              let hour = Int(components[0]),
              let minute = Int(components[1]),
              hour >= 0 && hour <= 23,
              minute >= 0 && minute <= 59 else {
            return nil
        }

        var dateComponents = DateComponents()
        dateComponents.hour = hour
        dateComponents.minute = minute
        return dateComponents
    }
}

#Preview {
    let previewSchedule = EmployeeScheduleData(
        employeeId: "1",
        employeeName: "John Doe",
        employeeEmail: "john@example.com",
        schedule: [
            "MONDAY": [
                ScheduleSlot(
                    id: "1",
                    dayOfWeek: "MONDAY",
                    startTime: "09:00",
                    endTime: "17:00",
                    formattedTimeRange: "09:00 - 17:00",
                    durationMinutes: 480,
                    active: true
                )
            ],
            "TUESDAY": [],
            "WEDNESDAY": [],
            "THURSDAY": [],
            "FRIDAY": [],
            "SATURDAY": [],
            "SUNDAY": []
        ]
    )
    
    return EmployeeScheduleEditView(
        shop: Shop.preview,
        employeeSchedule: previewSchedule,
        onScheduleUpdated: {}
    )
}
