//
//  BookingModels.swift
//  LunaraApp
//
//  Created by Lunara Team on 23/07/2025.
//

import Foundation

// MARK: - Slot Lock Models
// Note: SlotLockRequest and SlotLockResponse are defined in Appointment.swift

// MARK: - Slot Update Message (WebSocket)
struct SlotUpdateMessage: Codable {
    let type: SlotUpdateType
    let shopId: String
    let serviceId: String
    let employeeId: String
    let dateTime: String
    let userId: String?
    
    enum SlotUpdateType: String, Codable {
        case locked = "LOCKED"
        case unlocked = "UNLOCKED"
        case booked = "BOOKED"
    }
}

// MARK: - Appointment Response Model
// Note: AppointmentResponse is defined in Appointment.swift

// Extensions are defined in their respective model files

// Preview extensions are defined in their respective model files
