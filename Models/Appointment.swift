//
//  Appointment.swift
//  LunaraApp
//
//  Created by Lunara Team on 14/07/2025.
//

import Foundation
import SwiftUI

// MARK: - Appointment Model
struct Appointment: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let customerName: String
    let customerEmail: String
    let customerPhone: String?
    let appointmentDateTime: String
    let endDateTime: String
    let status: AppointmentStatus
    let totalAmount: Double
    let paymentType: PaymentMethod
    let paymentStatus: PaymentStatus?
    let notes: String?
    let createdAt: String?
    let updatedAt: String?

    // Shop information (flattened)
    let shopId: String
    let shopName: String
    let shopAddress: String
    let shopPhone: String
    let shopCountry: String

    // Employee information (flattened)
    let employeeId: String
    let employeeName: String
    let employeeSpecialties: String?

    // Service information (flattened)
    let serviceId: String
    let serviceName: String
    let serviceDescription: String
    let serviceDurationMinutes: Int
    let servicePrice: Double

    // User information (flattened)
    let userId: String?
    let userName: String?
    let userEmail: String?

    // Guest information
    let guestEmail: String?
    let guestFirstName: String?
    let guestLastName: String?
    let guestPhone: String?

    // Payment information
    let paymentIntentId: String?
    let paymentMethodId: String?
    let depositAmount: Double

    // Refund information
    let refundId: String?
    let refundStatus: String?
    let refundAmount: Double?
    let refundDate: String?

    // Cancellation information
    let cancellationReason: String?
    let cancelledAt: String?
    let cancelledBy: String?

    // Additional fields
    let reminderSent: Bool
    let confirmationSent: Bool
    let upcoming: Bool
    let utcDateTime: String
    let formattedDateTime: String
    let guestAppointment: Bool
    
    // MARK: - Computed Properties
    var appointmentDate: Date? {
        return ISO8601DateFormatter().date(from: appointmentDateTime)
    }

    var endDate: Date? {
        return ISO8601DateFormatter().date(from: endDateTime)
    }

    var duration: TimeInterval? {
        guard let start = appointmentDate, let end = endDate else { return nil }
        return end.timeIntervalSince(start)
    }


    


    var formattedDate: String {
        guard let date = appointmentDate else { return appointmentDateTime }

        let formatter = DateFormatter()
        formatter.dateStyle = .full
        return formatter.string(from: date)
    }

    var formattedTime: String {
        guard let date = appointmentDate else { return appointmentDateTime }

        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }

    var formattedPrice: String {
        return String(format: "$%.2f", totalAmount)
    }

    var isUpcoming: Bool {
        guard let date = appointmentDate else { return false }
        return date > Date() && (status == .confirmed || status == .pending)
    }

    var isPast: Bool {
        guard let date = appointmentDate else { return false }
        return date < Date()
    }

    var canBeEdited: Bool {
        guard let date = appointmentDate else { return false }
        let twentyFourHoursFromNow = Date().addingTimeInterval(24 * 60 * 60)
        return date > twentyFourHoursFromNow && (status == .confirmed || status == .pending)
    }

    var canBeCancelled: Bool {
        guard let date = appointmentDate else { return false }
        let twentyFourHoursFromNow = Date().addingTimeInterval(24 * 60 * 60)
        return date > twentyFourHoursFromNow && (status == .confirmed || status == .pending)
    }

    var statusColor: Color {
        switch status {
        case .pending:
            return .orange
        case .confirmed:
            return .green
        case .inProgress:
            return .purple
        case .cancelled:
            return .red
        case .completed:
            return .blue
        case .noShow:
            return .gray
        }
    }

    var statusDisplayText: String {
        switch status {
        case .pending:
            return "Pending"
        case .confirmed:
            return "Confirmed"
        case .inProgress:
            return "In Progress"
        case .cancelled:
            return "Cancelled"
        case .completed:
            return "Completed"
        case .noShow:
            return "No Show"
        }
    }

    var formattedAmount: String {
        return String(format: "$%.2f", totalAmount)
    }

    var canBeModified: Bool {
        return canBeCancelled
    }

    var isToday: Bool {
        guard let appointmentDate = appointmentDate else { return false }
        return Calendar.current.isDateInToday(appointmentDate)
    }

    // MARK: - Additional Computed Properties

    var formattedDuration: String {
        guard let duration = duration else { return "\(serviceDurationMinutes) min" }
        let minutes = Int(duration / 60)

        if minutes >= 60 {
            let hours = minutes / 60
            let remainingMinutes = minutes % 60
            if remainingMinutes == 0 {
                return "\(hours)h"
            } else {
                return "\(hours)h \(remainingMinutes)m"
            }
        } else {
            return "\(minutes) min"
        }
    }

    var formattedTimeRange: String {
        guard let startDate = appointmentDate, let endDate = endDate else {
            return formattedTime
        }

        let formatter = DateFormatter()
        formatter.timeStyle = .short

        let startTime = formatter.string(from: startDate)
        let endTime = formatter.string(from: endDate)

        return "\(startTime) - \(endTime)"
    }

    var shortFormattedDate: String {
        guard let date = appointmentDate else { return appointmentDateTime }

        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }

    var dayOfWeek: String {
        guard let date = appointmentDate else { return "" }

        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE"
        return formatter.string(from: date)
    }

    // Customer information as a computed property for convenience
    var customer: CustomerInfo? {
        return CustomerInfo(
            fullName: customerName,
            email: customerEmail,
            phone: customerPhone
        )
    }

    // Employee information as a computed property for convenience
    var employee: EmployeeInfo {
        return EmployeeInfo(
            id: employeeId,
            displayName: employeeName,
            specialties: employeeSpecialties?.components(separatedBy: ", ") ?? []
        )
    }

    // Service information as a computed property for convenience
    var service: ServiceInfo {
        return ServiceInfo(
            id: serviceId,
            name: serviceName,
            description: serviceDescription,
            durationMinutes: serviceDurationMinutes,
            price: servicePrice
        )
    }
    
    var paymentStatusColor: String {
        guard let paymentStatus = paymentStatus else {
            // For cash payments or when payment status is not set
            return paymentType == .cash ? "gray" : "orange"
        }

        switch paymentStatus {
        case .pending:
            return "orange"
        case .paid, .succeeded:
            return "green"
        case .failed:
            return "red"
        case .refunded:
            return "blue"
        }
    }
}

// MARK: - Customer Info Helper
struct CustomerInfo {
    let fullName: String
    let email: String
    let phone: String?
}

// MARK: - Employee Info Helper
struct EmployeeInfo {
    let id: String
    let displayName: String
    let specialties: [String]
}

// MARK: - Service Info Helper
struct ServiceInfo {
    let id: String
    let name: String
    let description: String
    let durationMinutes: Int
    let price: Double
}

// MARK: - Appointment Status Enum
enum AppointmentStatus: String, Codable, CaseIterable {
    case pending = "PENDING"
    case confirmed = "CONFIRMED"
    case inProgress = "IN_PROGRESS"
    case completed = "COMPLETED"
    case cancelled = "CANCELLED"
    case noShow = "NO_SHOW"
    
    var displayName: String {
        switch self {
        case .pending:
            return "Pending"
        case .confirmed:
            return "Confirmed"
        case .inProgress:
            return "In Progress"
        case .completed:
            return "Completed"
        case .cancelled:
            return "Cancelled"
        case .noShow:
            return "No Show"
        }
    }
    
    var description: String {
        switch self {
        case .pending:
            return "Appointment is pending confirmation"
        case .confirmed:
            return "Appointment is confirmed"
        case .inProgress:
            return "Appointment is currently in progress"
        case .completed:
            return "Appointment has been completed"
        case .cancelled:
            return "Appointment has been cancelled"
        case .noShow:
            return "Customer did not show up for appointment"
        }
    }

    var displayText: String {
        return displayName
    }

    var color: Color {
        switch self {
        case .pending:
            return .orange
        case .confirmed:
            return .green
        case .inProgress:
            return .purple
        case .completed:
            return .blue
        case .cancelled:
            return .red
        case .noShow:
            return .gray
        }
    }
}

// MARK: - Payment Method Enum
enum PaymentMethod: String, Codable, CaseIterable {
    case card = "CARD"
    case cash = "CASH"
    
    var displayName: String {
        switch self {
        case .card:
            return "Card"
        case .cash:
            return "Cash"
        }
    }
    
    var iconName: String {
        switch self {
        case .card:
            return "creditcard"
        case .cash:
            return "banknote"
        }
    }
}

// MARK: - Payment Status Enum
enum PaymentStatus: String, Codable, CaseIterable {
    case pending = "PENDING"
    case paid = "PAID"
    case succeeded = "succeeded"  // Stripe payment status
    case failed = "FAILED"
    case refunded = "REFUNDED"

    var displayName: String {
        switch self {
        case .pending:
            return "Pending"
        case .paid, .succeeded:
            return "Paid"
        case .failed:
            return "Failed"
        case .refunded:
            return "Refunded"
        }
    }

    var description: String {
        switch self {
        case .pending:
            return "Payment is pending"
        case .paid, .succeeded:
            return "Payment has been completed"
        case .failed:
            return "Payment has failed"
        case .refunded:
            return "Payment has been refunded"
        }
    }
}

// MARK: - Appointment Creation Request
struct AppointmentCreationRequest: Codable {
    let shopId: String
    let serviceId: String
    let employeeId: String
    let appointmentDateTime: String
    let paymentType: PaymentMethod
    let notes: String?
    let slotLockToken: String

    // Guest user information (for unauthenticated users)
    let guestEmail: String?
    let guestFirstName: String?
    let guestLastName: String?
    let guestPhone: String?

    // Stripe payment information (if payment type is CARD)
    var paymentIntentId: String?
    var paymentMethodId: String?

    // Deposit amount (optional)
    let depositAmount: Double?
}

// MARK: - Appointment Response
struct AppointmentResponse: Codable, Sendable {
    let appointment: Appointment
    let message: String?
}

// MARK: - Appointment Update Request
struct AppointmentUpdateRequest: Codable {
    let appointmentDateTime: String?
    let notes: String?
    let lockToken: String?

    init(appointmentDateTime: String? = nil, notes: String? = nil, lockToken: String? = nil) {
        self.appointmentDateTime = appointmentDateTime
        self.notes = notes
        self.lockToken = lockToken
    }
}

// MARK: - Appointment Cancellation Request
struct AppointmentCancellationRequest: Codable {
    let reason: String?
}

// MARK: - Appointment Reschedule Request
struct AppointmentRescheduleRequest: Codable {
    let newAppointmentDateTime: String
    let newEmployeeId: String?
    let slotLockToken: String
    let reason: String?
}

// MARK: - Appointment Page Response (for paginated results)
struct AppointmentPageResponse: Codable {
    let content: [Appointment]
    let pageable: PageableInfo
    let totalElements: Int
    let totalPages: Int
    let last: Bool
    let first: Bool
    let numberOfElements: Int
    let size: Int
    let number: Int
    let empty: Bool
}

struct PageableInfo: Codable {
    let sort: SortInfo
    let pageNumber: Int
    let pageSize: Int
    let offset: Int
    let paged: Bool
    let unpaged: Bool
}

struct SortInfo: Codable {
    let sorted: Bool
    let unsorted: Bool
    let empty: Bool
}

// MARK: - Available Slot API Response Model
struct AvailableSlotResponse: Codable, Sendable {
    let dateTime: String
    let startTime: String
    let endTime: String
    let available: Bool
    let locked: Bool
    let lockedBy: String?
    let employeeId: String
    let employeeName: String
    let serviceId: String
    let serviceName: String
    let durationMinutes: Int
    let price: Double

    // Convert to AvailableSlot model
    func toAvailableSlot() -> AvailableSlot {
        // Generate a unique ID from multiple factors to prevent collisions
        let id = "\(serviceId)-\(employeeId)-\(dateTime)"

        return AvailableSlot(
            id: id,
            dateTime: dateTime,
            available: available,
            locked: locked,
            lockedBy: lockedBy,
            price: price
        )
    }
}

// MARK: - Available Slot Model
struct AvailableSlot: Codable, Identifiable, Equatable {
    let id: String
    let dateTime: String
    let available: Bool
    let locked: Bool
    let lockedBy: String?
    let price: Double
    
    var date: Date? {
        return ISO8601DateFormatter().date(from: dateTime)
    }
    
    var formattedTime: String {
        guard let date = date else { return dateTime }
        
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
    
    var isBookable: Bool {
        return available && !locked
    }
    
    var formattedPrice: String {
        return String(format: "$%.2f", price)
    }

    var formattedDate: String {
        guard let date = date else { return dateTime }

        let formatter = DateFormatter()
        formatter.dateStyle = .full
        return formatter.string(from: date)
    }

    var formattedDateTime: String {
        guard let date = date else { return dateTime }

        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }

    var formattedDuration: String {
        // This would need to be passed from the service duration
        // For now, return a placeholder
        return "60 min"
    }
}

// MARK: - Slot Lock Request/Response
struct SlotLockRequest: Codable {
    let shopId: String
    let serviceId: String
    let employeeId: String
    let dateTime: String
}

struct SlotLockResponse: Codable {
    let lockToken: String
    let expiresIn: Int // minutes
    let message: String
}

// MARK: - Appointment Extensions
extension Appointment {
    /// Returns a preview appointment for SwiftUI previews
    static var preview: Appointment {
        return Appointment(
            id: "preview-appointment-id",
            customerName: "John Doe",
            customerEmail: "john.doe@example.com",
            customerPhone: "+1234567890",
            appointmentDateTime: Date().addingTimeInterval(24 * 60 * 60).ISO8601Format(), // Tomorrow
            endDateTime: Date().addingTimeInterval(24 * 60 * 60 + 60 * 60).ISO8601Format(), // Tomorrow + 1 hour
            status: .confirmed,
            totalAmount: 75.00,
            paymentType: .card,
            paymentStatus: .paid,
            notes: "First time customer",
            createdAt: Date().ISO8601Format(),
            updatedAt: Date().ISO8601Format(),
            shopId: "preview-shop-id",
            shopName: "Beauty Salon",
            shopAddress: "123 Main St, City, 12345",
            shopPhone: "+1234567890",
            shopCountry: "US",
            employeeId: "preview-employee-id",
            employeeName: "Jane Smith",
            employeeSpecialties: "Hair, Nails",
            serviceId: "preview-service-id",
            serviceName: "Haircut",
            serviceDescription: "Professional haircut",
            serviceDurationMinutes: 60,
            servicePrice: 75.00,
            userId: "preview-user-id",
            userName: "John Doe",
            userEmail: "john.doe@example.com",
            guestEmail: nil,
            guestFirstName: nil,
            guestLastName: nil,
            guestPhone: nil,
            paymentIntentId: "pi_preview123",
            paymentMethodId: "pm_preview123",
            depositAmount: 0.0,
            refundId: nil,
            refundStatus: nil,
            refundAmount: nil,
            refundDate: nil,
            cancellationReason: nil,
            cancelledAt: nil,
            cancelledBy: nil,
            reminderSent: false,
            confirmationSent: true,
            upcoming: true,
            utcDateTime: Date().addingTimeInterval(24 * 60 * 60).ISO8601Format(),
            formattedDateTime: Date().addingTimeInterval(24 * 60 * 60).ISO8601Format(),
            guestAppointment: false
        )
    }
    
    /// Returns a past appointment for previews
    static var previewPast: Appointment {
        return Appointment(
            id: "preview-past-appointment-id",
            customerName: "Jane Smith",
            customerEmail: "jane.smith@example.com",
            customerPhone: "+1234567890",
            appointmentDateTime: Date().addingTimeInterval(-24 * 60 * 60).ISO8601Format(), // Yesterday
            endDateTime: Date().addingTimeInterval(-24 * 60 * 60 + 60 * 60).ISO8601Format(), // Yesterday + 1 hour
            status: .completed,
            totalAmount: 120.00,
            paymentType: .card,
            paymentStatus: .paid,
            notes: nil,
            createdAt: Date().addingTimeInterval(-25 * 60 * 60).ISO8601Format(),
            updatedAt: Date().addingTimeInterval(-24 * 60 * 60).ISO8601Format(),
            shopId: "preview-shop-id",
            shopName: "Beauty Salon",
            shopAddress: "123 Main St, City, 12345",
            shopPhone: "+1234567890",
            shopCountry: "US",
            employeeId: "preview-employee-id",
            employeeName: "Jane Smith",
            employeeSpecialties: "Hair, Nails",
            serviceId: "preview-service-id",
            serviceName: "Hair Color",
            serviceDescription: "Professional hair coloring",
            serviceDurationMinutes: 120,
            servicePrice: 120.00,
            userId: "preview-user-id-2",
            userName: "Jane Smith",
            userEmail: "jane.smith@example.com",
            guestEmail: nil,
            guestFirstName: nil,
            guestLastName: nil,
            guestPhone: nil,
            paymentIntentId: "pi_preview456",
            paymentMethodId: "pm_preview456",
            depositAmount: 0.0,
            refundId: nil,
            refundStatus: nil,
            refundAmount: nil,
            refundDate: nil,
            cancellationReason: nil,
            cancelledAt: nil,
            cancelledBy: nil,
            reminderSent: true,
            confirmationSent: true,
            upcoming: false,
            utcDateTime: Date().addingTimeInterval(-24 * 60 * 60).ISO8601Format(),
            formattedDateTime: Date().addingTimeInterval(-24 * 60 * 60).ISO8601Format(),
            guestAppointment: false
        )
    }
    
    /// Check if appointment conflicts with another appointment
    func conflictsWith(_ other: Appointment) -> Bool {
        guard let thisStart = appointmentDate,
              let thisEnd = endDate,
              let otherStart = other.appointmentDate,
              let otherEnd = other.endDate else {
            return false
        }
        
        // Check if appointments overlap
        return thisStart < otherEnd && otherStart < thisEnd
    }
    
    /// Get time until appointment
    func timeUntilAppointment() -> TimeInterval? {
        guard let appointmentDate = appointmentDate else { return nil }
        return appointmentDate.timeIntervalSinceNow
    }
    
    /// Get formatted time until appointment
    func formattedTimeUntilAppointment() -> String? {
        guard let timeInterval = timeUntilAppointment(), timeInterval > 0 else { return nil }
        
        let formatter = DateComponentsFormatter()
        formatter.allowedUnits = [.day, .hour, .minute]
        formatter.unitsStyle = .abbreviated
        formatter.maximumUnitCount = 2
        
        return formatter.string(from: timeInterval)
    }

    /// Returns a cancelled appointment for previews
    static var previewCancelled: Appointment {
        return Appointment(
            id: "preview-cancelled-appointment-id",
            customerName: "Mike Wilson",
            customerEmail: "mike.wilson@example.com",
            customerPhone: "+1234567892",
            appointmentDateTime: Date().addingTimeInterval(48 * 60 * 60).ISO8601Format(), // Day after tomorrow
            endDateTime: Date().addingTimeInterval(48 * 60 * 60 + 60 * 60).ISO8601Format(),
            status: .cancelled,
            totalAmount: 85.00,
            paymentType: .card,
            paymentStatus: .refunded,
            notes: "Customer requested cancellation",
            createdAt: Date().addingTimeInterval(-48 * 60 * 60).ISO8601Format(),
            updatedAt: Date().addingTimeInterval(-12 * 60 * 60).ISO8601Format(),
            shopId: "preview-shop-id",
            shopName: "Beauty Salon",
            shopAddress: "123 Main St, City, 12345",
            shopPhone: "+1234567890",
            shopCountry: "US",
            employeeId: "preview-employee-id",
            employeeName: "Jane Smith",
            employeeSpecialties: "Hair, Nails",
            serviceId: "preview-service-id",
            serviceName: "Hair Treatment",
            serviceDescription: "Professional hair treatment",
            serviceDurationMinutes: 90,
            servicePrice: 85.00,
            userId: "preview-user-id-3",
            userName: "Mike Wilson",
            userEmail: "mike.wilson@example.com",
            guestEmail: nil,
            guestFirstName: nil,
            guestLastName: nil,
            guestPhone: nil,
            paymentIntentId: "pi_cancelled_preview",
            paymentMethodId: "pm_cancelled_preview",
            depositAmount: 0.0,
            refundId: "re_cancelled_preview",
            refundStatus: "succeeded",
            refundAmount: 85.00,
            refundDate: Date().addingTimeInterval(-12 * 60 * 60).ISO8601Format(),
            cancellationReason: "Customer requested cancellation",
            cancelledAt: Date().addingTimeInterval(-12 * 60 * 60).ISO8601Format(),
            cancelledBy: "customer",
            reminderSent: true,
            confirmationSent: true,
            upcoming: false,
            utcDateTime: Date().addingTimeInterval(48 * 60 * 60).ISO8601Format(),
            formattedDateTime: Date().addingTimeInterval(48 * 60 * 60).ISO8601Format(),
            guestAppointment: false
        )
    }

    /// Returns a list of preview appointments
    static var previewList: [Appointment] {
        return [
            preview,
            previewPast,
            previewCancelled
        ]
    }
}
