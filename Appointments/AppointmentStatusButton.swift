//
//  AppointmentStatusButton.swift
//  LunaraApp
//
//  Created by Lunara Team on 21/07/2025.
//

import SwiftUI

/// Quick action button for updating appointment status
struct AppointmentStatusButton: View {
    let appointment: Appointment
    let onStatusChange: (() -> Void)?
    
    // MARK: - State
    @StateObject private var appointmentService = AppointmentService.shared
    @State private var isUpdating = false
    
    var body: some View {
        if let nextStatus = getNextStatus(for: appointment.status),
           let config = getButtonConfig(for: nextStatus) {
            Button(action: {
                Task { await updateStatus(to: nextStatus) }
            }) {
                HStack(spacing: 6) {
                    Image(systemName: config.icon)
                        .font(.system(size: 14, weight: .medium))
                    
                    Text(isUpdating ? "Updating..." : config.label)
                        .font(.system(size: 14, weight: .medium))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(config.color)
                .cornerRadius(8)
            }
            .disabled(isUpdating)
            .opacity(isUpdating ? 0.7 : 1.0)
        }
    }
    
    // MARK: - Private Methods
    
    private func getNextStatus(for status: AppointmentStatus) -> AppointmentStatus? {
        switch status {
        case .confirmed:
            return .inProgress
        case .inProgress:
            return .completed
        default:
            return nil
        }
    }
    
    private func getButtonConfig(for status: AppointmentStatus) -> ButtonConfig? {
        switch status {
        case .inProgress:
            return ButtonConfig(
                label: "Start",
                icon: "play.fill",
                color: Color.blue
            )
        case .completed:
            return ButtonConfig(
                label: "Complete",
                icon: "checkmark.circle.fill",
                color: Color.green
            )
        default:
            return nil
        }
    }
    
    private func updateStatus(to newStatus: AppointmentStatus) async {
        await MainActor.run {
            isUpdating = true
        }
        
        let success = await appointmentService.updateAppointmentStatus(
            appointmentId: appointment.id,
            status: newStatus
        )
        
        await MainActor.run {
            isUpdating = false
            if success {
                onStatusChange?()
            }
        }
    }
}

// MARK: - Supporting Types

private struct ButtonConfig {
    let label: String
    let icon: String
    let color: Color
}

// MARK: - Preview

struct AppointmentStatusButton_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 16) {
            AppointmentStatusButton(
                appointment: Appointment.preview,
                onStatusChange: nil
            )
            
            AppointmentStatusButton(
                appointment: Appointment.preview,
                onStatusChange: nil
            )
        }
        .padding()
        .previewLayout(.sizeThatFits)
    }
}
