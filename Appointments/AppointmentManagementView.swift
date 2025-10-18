//
//  AppointmentManagementView.swift
//  LunaraApp
//
//  Created by Lunara Team on 16/07/2025.
//

import SwiftUI

/// View for managing appointments (edit, reschedule, cancel)
struct AppointmentManagementView: View {
    let appointment: Appointment
    
    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss
    
    // MARK: - State
    @StateObject private var appointmentService = AppointmentService.shared
    @State private var selectedAction: ManagementAction = .edit
    @State private var notes: String = ""
    @State private var selectedDate: Date = Date()
    @State private var selectedSlot: AvailableSlot?
    @State private var availableSlots: [AvailableSlot] = []
    @State private var isLoadingSlots = false
    @State private var showingCancelConfirmation = false
    @State private var cancellationReason = ""
    @State private var isProcessing = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Action selector
                ActionSelectorView(selectedAction: $selectedAction)
                    .padding(.horizontal, 16)
                    .padding(.top, 16)
                
                ScrollView {
                    VStack(spacing: 20) {
                        // Current appointment info
                        CurrentAppointmentView(appointment: appointment)
                        
                        // Action-specific content
                        switch selectedAction {
                        case .edit:
                            EditNotesView(notes: $notes)
                        case .reschedule:
                            RescheduleView(
                                appointment: appointment,
                                selectedDate: $selectedDate,
                                selectedSlot: $selectedSlot,
                                availableSlots: availableSlots,
                                isLoadingSlots: isLoadingSlots,
                                onDateChanged: loadAvailableSlots
                            )
                        case .cancel:
                            CancelView(reason: $cancellationReason)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 100) // Space for action button
                }
                
                // Action button
                ActionButtonView(
                    action: selectedAction,
                    isEnabled: canPerformAction,
                    isProcessing: isProcessing,
                    onTap: performAction
                )
                .padding(.horizontal, 16)
                .padding(.bottom, 32)
            }
            .background(LunaraColors.coolLightGray)
            .navigationTitle("Manage Appointment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.warmGold)
                }
            }
        }
        .onAppear {
            setupInitialState()
        }
        .alert("Cancel Appointment", isPresented: $showingCancelConfirmation) {
            Button("Cancel Appointment", role: .destructive) {
                Task {
                    await cancelAppointment()
                }
            }
            Button("Keep Appointment", role: .cancel) { }
        } message: {
            Text("Are you sure you want to cancel this appointment? This action cannot be undone.")
        }
    }
    
    // MARK: - Computed Properties
    
    private var canPerformAction: Bool {
        switch selectedAction {
        case .edit:
            return notes != appointment.notes
        case .reschedule:
            return selectedSlot != nil
        case .cancel:
            return !cancellationReason.isEmpty
        }
    }
    
    // MARK: - Private Methods
    
    private func setupInitialState() {
        notes = appointment.notes ?? ""
        selectedDate = appointment.appointmentDate ?? Date()
        
        if selectedAction == .reschedule {
            Task {
                await loadAvailableSlots()
            }
        }
    }
    
    private func loadAvailableSlots() async {
        isLoadingSlots = true
        
        do {
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            let dateString = dateFormatter.string(from: selectedDate)
            
            let slots = try await APIClient.shared.getAvailableSlots(
                shopId: appointment.shopId,
                serviceId: appointment.serviceId,
                employeeId: appointment.employeeId,
                date: dateString
            )
            
            await MainActor.run {
                self.availableSlots = slots
                self.selectedSlot = nil
                self.isLoadingSlots = false
            }
        } catch {
            await MainActor.run {
                self.availableSlots = []
                self.isLoadingSlots = false
            }
        }
    }
    
    private func performAction() {
        switch selectedAction {
        case .edit:
            Task { await updateNotes() }
        case .reschedule:
            Task { await rescheduleAppointment() }
        case .cancel:
            showingCancelConfirmation = true
        }
    }
    
    private func updateNotes() async {
        isProcessing = true
        
        let request = AppointmentUpdateRequest(
            appointmentDateTime: nil,
            notes: notes,
            lockToken: nil
        )
        
        let success = await appointmentService.updateAppointment(appointment.id, request: request)
        
        await MainActor.run {
            self.isProcessing = false
            if success {
                self.dismiss()
            }
        }
    }
    
    private func rescheduleAppointment() async {
        guard let slot = selectedSlot else { return }
        
        isProcessing = true
        
        // TODO: Implement slot locking for reschedule
        let request = AppointmentRescheduleRequest(
            newAppointmentDateTime: slot.dateTime,
            newEmployeeId: appointment.employeeId,
            slotLockToken: "temp_token", // This should be obtained from slot locking
            reason: "Customer requested reschedule"
        )
        
        let success = await appointmentService.rescheduleAppointment(appointment.id, request: request)
        
        await MainActor.run {
            self.isProcessing = false
            if success {
                self.dismiss()
            }
        }
    }
    
    private func cancelAppointment() async {
        isProcessing = true
        
        let success = await appointmentService.cancelAppointment(appointment.id, reason: cancellationReason)
        
        await MainActor.run {
            self.isProcessing = false
            if success {
                self.dismiss()
            }
        }
    }
}

// MARK: - Management Action Enum
enum ManagementAction: String, CaseIterable {
    case edit = "Edit"
    case reschedule = "Reschedule"
    case cancel = "Cancel"
    
    var displayName: String {
        return rawValue
    }
    
    var icon: String {
        switch self {
        case .edit:
            return "pencil"
        case .reschedule:
            return "calendar"
        case .cancel:
            return "xmark.circle"
        }
    }
    
    var color: Color {
        switch self {
        case .edit:
            return LunaraColors.warmGold
        case .reschedule:
            return .blue
        case .cancel:
            return .red
        }
    }
}

// MARK: - Supporting Views

struct ActionSelectorView: View {
    @Binding var selectedAction: ManagementAction
    
    var body: some View {
        HStack(spacing: 0) {
            ForEach(ManagementAction.allCases, id: \.self) { action in
                Button(action: {
                    selectedAction = action
                }) {
                    VStack(spacing: 8) {
                        Image(systemName: action.icon)
                            .font(.system(size: 16))
                        
                        Text(action.displayName)
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundColor(selectedAction == action ? action.color : LunaraColors.secondaryText)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                }
                .background(
                    selectedAction == action ? action.color.opacity(0.1) : Color.clear
                )
            }
        }
        .background(LunaraColors.white)
        .cornerRadius(12)
    }
}

struct CurrentAppointmentView: View {
    let appointment: Appointment
    
    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Current Appointment")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
            }
            
            VStack(spacing: 8) {
                HStack {
                    Text("Service:")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)
                    
                    Spacer()
                    
                    Text(appointment.serviceName)
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.primaryText)
                }
                
                HStack {
                    Text("Employee:")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)
                    
                    Spacer()
                    
                    Text(appointment.employeeName)
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.primaryText)
                }
                
                HStack {
                    Text("Date & Time:")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)
                    
                    Spacer()
                    
                    Text(appointment.formattedDateTime)
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.primaryText)
                }
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
    }
}

struct EditNotesView: View {
    @Binding var notes: String

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Edit Notes")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)

                Spacer()
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Special instructions or requests:")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)

                TextEditor(text: $notes)
                    .font(.system(size: 14))
                    .padding(12)
                    .background(LunaraColors.coolLightGray)
                    .cornerRadius(8)
                    .frame(minHeight: 100)
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
    }
}

struct RescheduleView: View {
    let appointment: Appointment
    @Binding var selectedDate: Date
    @Binding var selectedSlot: AvailableSlot?
    let availableSlots: [AvailableSlot]
    let isLoadingSlots: Bool
    let onDateChanged: () async -> Void

    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Reschedule Appointment")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)

                Spacer()
            }

            VStack(spacing: 12) {
                // Date picker
                VStack(alignment: .leading, spacing: 8) {
                    Text("Select New Date:")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)

                    DatePicker(
                        "Date",
                        selection: $selectedDate,
                        in: Date()...,
                        displayedComponents: .date
                    )
                    .datePickerStyle(GraphicalDatePickerStyle())
                    .onChange(of: selectedDate) { _, _ in
                        Task {
                            await onDateChanged()
                        }
                    }
                }

                // Available slots
                VStack(alignment: .leading, spacing: 8) {
                    Text("Available Times:")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)

                    if isLoadingSlots {
                        HStack {
                            ProgressView()
                                .scaleEffect(0.8)
                            Text("Loading available times...")
                                .font(.system(size: 12))
                                .foregroundColor(LunaraColors.secondaryText)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 20)
                    } else if availableSlots.isEmpty {
                        Text("No available times for this date")
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.secondaryText)
                            .padding(.vertical, 20)
                    } else {
                        LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: 8) {
                            ForEach(availableSlots) { slot in
                                SlotButton(
                                    slot: slot,
                                    isSelected: selectedSlot?.id == slot.id,
                                    onTap: { selectedSlot = slot }
                                )
                            }
                        }
                    }
                }
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
    }
}

struct SlotButton: View {
    let slot: AvailableSlot
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            Text(slot.formattedTime)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(isSelected ? LunaraColors.white : LunaraColors.primaryText)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(isSelected ? LunaraColors.warmGold : LunaraColors.coolLightGray)
                .cornerRadius(8)
        }
        .disabled(!slot.isBookable)
    }
}

struct CancelView: View {
    @Binding var reason: String

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Cancel Appointment")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)

                Spacer()
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Reason for cancellation:")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)

                TextEditor(text: $reason)
                    .font(.system(size: 14))
                    .padding(12)
                    .background(LunaraColors.coolLightGray)
                    .cornerRadius(8)
                    .frame(minHeight: 80)

                Text("Please provide a reason for cancelling your appointment.")
                    .font(.system(size: 10))
                    .foregroundColor(LunaraColors.secondaryText)
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
    }
}

struct ActionButtonView: View {
    let action: ManagementAction
    let isEnabled: Bool
    let isProcessing: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 8) {
                if isProcessing {
                    ProgressView()
                        .scaleEffect(0.8)
                        .tint(LunaraColors.white)
                } else {
                    Image(systemName: action.icon)
                        .font(.system(size: 16))
                }

                Text(buttonText)
                    .font(.system(size: 16, weight: .medium))
            }
            .foregroundColor(LunaraColors.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(isEnabled ? action.color : LunaraColors.coolLightGray)
            .cornerRadius(12)
        }
        .disabled(!isEnabled || isProcessing)
    }

    private var buttonText: String {
        if isProcessing {
            switch action {
            case .edit:
                return "Updating..."
            case .reschedule:
                return "Rescheduling..."
            case .cancel:
                return "Cancelling..."
            }
        } else {
            switch action {
            case .edit:
                return "Update Notes"
            case .reschedule:
                return "Reschedule Appointment"
            case .cancel:
                return "Cancel Appointment"
            }
        }
    }
}

// MARK: - Preview
struct AppointmentManagementView_Previews: PreviewProvider {
    static var previews: some View {
        AppointmentManagementView(appointment: Appointment.preview)
    }
}
