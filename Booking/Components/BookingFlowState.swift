//
//  BookingFlowState.swift
//  LunaraApp
//
//  Created by Lunara Team on 23/07/2025.
//

import Foundation
import SwiftUI
import Combine

/// Enhanced observable state manager for the booking flow with improved UX features
@MainActor
class BookingFlowState: ObservableObject {

    // MARK: - Published Properties
    @Published var shop: Shop?
    @Published var selectedService: Service?
    @Published var selectedEmployee: Employee?
    @Published var selectedSlot: AvailableSlot?
    @Published var customerDetails: CustomerDetails?
    @Published var paymentResult: PaymentResult?
    @Published var createdAppointment: Appointment?

    // MARK: - Slot Locking
    @Published var slotLockToken: String?
    @Published var lockExpirationTime: Date?
    @Published var isSlotLocked = false
    @Published var lockTimeRemaining: TimeInterval = 0

    // MARK: - Enhanced UX State
    @Published var canNavigateBack: Bool = false
    @Published var canNavigateForward: Bool = false
    @Published var isBookingSummaryExpanded: Bool = false
    @Published var stepValidationStates: [BookingStep: BookingValidationState] = [:]
    @Published var currentStepProgress: Double = 0.0
    @Published var isProcessingStep: Bool = false
    
    // MARK: - Loading States
    @Published var isLoadingServices = false
    @Published var isLoadingEmployees = false
    @Published var isLoadingSlots = false
    @Published var isCreatingAppointment = false
    
    // MARK: - Error Handling
    @Published var errorMessage: String?
    @Published var showingError = false
    
    // MARK: - Private Properties
    private var lockTimer: Timer?
    private let apiClient = APIClient.shared
    private let webSocketService = WebSocketService.shared
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    init() {
        setupWebSocketSubscriptions()
    }
    
    deinit {
        // Note: Timer cleanup is handled in reset() method
        // Cannot access @MainActor properties from deinit in Swift 6
    }
    
    // MARK: - Public Methods
    
    /// Reset all booking state
    func reset() {
        shop = nil
        selectedService = nil
        selectedEmployee = nil
        selectedSlot = nil
        customerDetails = nil
        paymentResult = nil
        createdAppointment = nil
        
        clearSlotLock()
        clearError()
    }
    
    /// Clear error state
    func clearError() {
        errorMessage = nil
        showingError = false
    }
    
    /// Set error message and show error
    func setError(_ message: String) {
        errorMessage = message
        showingError = true
    }
    
    // MARK: - Slot Locking Methods
    
    /// Lock the selected slot
    func lockSlot() async -> Bool {
        guard let shop = shop,
              let service = selectedService,
              let employee = selectedEmployee,
              let slot = selectedSlot else {
            setError("Missing required booking information")
            return false
        }
        
        do {
            let lockRequest = SlotLockRequest(
                shopId: shop.id,
                serviceId: service.id,
                employeeId: employee.id,
                dateTime: slot.dateTime
            )
            
            let response = try await apiClient.lockSlot(request: lockRequest)
            
            await MainActor.run {
                self.slotLockToken = response.lockToken
                self.lockExpirationTime = Date().addingTimeInterval(TimeInterval(response.expiresIn * 60))
                self.isSlotLocked = true

                // Start countdown timer
                self.startLockTimer()
            }
            
            return true
            
        } catch {
            await MainActor.run {
                self.setError("Failed to lock slot: \(error.localizedDescription)")
            }
            return false
        }
    }
    
    /// Unlock the current slot
    func unlockSlot() async {
        guard let shop = shop,
              let service = selectedService,
              let employee = selectedEmployee,
              let slot = selectedSlot,
              let lockToken = slotLockToken else {
            print("🔓 No slot to unlock or missing required data")
            return
        }

        print("🔓 Unlocking slot: \(slot.formattedTime)")

        do {
            try await apiClient.unlockSlot(
                shopId: shop.id,
                serviceId: service.id,
                employeeId: employee.id,
                dateTime: slot.dateTime,
                lockToken: lockToken
            )

            await MainActor.run {
                self.clearSlotLock()
                // Clear the selected slot so user can see it as available again
                self.selectedSlot = nil
                print("🔓 Slot unlocked and cleared from booking state")
            }

        } catch {
            print("Failed to unlock slot: \(error.localizedDescription)")
        }
    }
    
    /// Extend the current slot lock
    func extendSlotLock() async -> Bool {
        guard let shop = shop,
              let service = selectedService,
              let employee = selectedEmployee,
              let slot = selectedSlot,
              let lockToken = slotLockToken else { return false }
        
        do {
            try await apiClient.extendSlotLock(
                shopId: shop.id,
                serviceId: service.id,
                employeeId: employee.id,
                dateTime: slot.dateTime,
                lockToken: lockToken
            )
            
            await MainActor.run {
                self.lockExpirationTime = Date().addingTimeInterval(5 * 60) // 5 minutes
                self.startLockTimer()
            }
            
            return true
            
        } catch {
            await MainActor.run {
                self.setError("Failed to extend slot lock")
            }
            return false
        }
    }
    
    // MARK: - Private Methods
    
    private func clearSlotLock() {
        slotLockToken = nil
        lockExpirationTime = nil
        isSlotLocked = false
        lockTimer?.invalidate()
        lockTimer = nil
    }
    
    private func startLockTimer() {
        lockTimer?.invalidate()
        
        lockTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self = self,
                      let expirationTime = self.lockExpirationTime else { return }
                
                if Date() >= expirationTime {
                    self.clearSlotLock()
                    self.setError("Your slot reservation has expired. Please select a new time.")
                }
            }
        }
    }
    
    private func setupWebSocketSubscriptions() {
        // Subscribe to slot updates for real-time availability changes
        webSocketService.slotUpdatePublisher
            .sink { [weak self] slotUpdate in
                Task { @MainActor in
                    self?.handleSlotUpdate(slotUpdate)
                }
            }
            .store(in: &cancellables)

        // Also listen for connection state changes
        webSocketService.$isConnected
            .sink { isConnected in
                if isConnected {
                    print("WebSocket connected - ready for slot update subscriptions")
                } else {
                    print("WebSocket disconnected - slot update subscriptions unavailable")
                }
            }
            .store(in: &cancellables)
    }
    
    private func handleSlotUpdate(_ update: SlotUpdateMessage) {
        // Handle real-time slot updates (locked/unlocked by other users)
        guard let shop = shop,
              let service = selectedService,
              let employee = selectedEmployee,
              let slot = selectedSlot else { return }
        
        // Check if the update affects our selected slot
        if update.shopId == shop.id &&
           update.serviceId == service.id &&
           update.employeeId == employee.id &&
           update.dateTime == slot.dateTime {
            
            switch update.type {
            case .locked:
                if update.userId != slotLockToken {
                    // Another user locked our slot
                    setError("This time slot was just booked by another customer. Please select a different time.")
                    selectedSlot = nil
                    clearSlotLock()
                }
                
            case .unlocked:
                // Slot became available again
                break
                
            case .booked:
                // Slot was permanently booked
                setError("This time slot was just booked. Please select a different time.")
                selectedSlot = nil
                clearSlotLock()
            }
        }
    }

    // MARK: - Enhanced Navigation Methods

    /// Update navigation state based on current selections
    func updateNavigationState(for currentStep: BookingStep) {
        // Don't allow navigation back from confirmation since appointment is already created
        canNavigateBack = currentStep != .serviceSelection && currentStep != .confirmation

        switch currentStep {
        case .serviceSelection:
            canNavigateForward = selectedService != nil
        case .employeeSelection:
            canNavigateForward = selectedEmployee != nil
        case .dateTimeSelection:
            canNavigateForward = selectedSlot != nil && isSlotLocked
        case .customerDetails:
            canNavigateForward = customerDetails != nil
        case .payment:
            canNavigateForward = false // Payment handles its own flow
        case .confirmation:
            canNavigateForward = false
        }

        updateStepValidation(for: currentStep)
    }

    /// Update validation state for a specific step
    private func updateStepValidation(for step: BookingStep) {
        switch step {
        case .serviceSelection:
            stepValidationStates[step] = selectedService != nil ? .valid : .incomplete
        case .employeeSelection:
            stepValidationStates[step] = selectedEmployee != nil ? .valid : .incomplete
        case .dateTimeSelection:
            stepValidationStates[step] = (selectedSlot != nil && isSlotLocked) ? .valid : .incomplete
        case .customerDetails:
            stepValidationStates[step] = customerDetails != nil ? .valid : .incomplete
        case .payment:
            stepValidationStates[step] = paymentResult != nil ? .valid : .incomplete
        case .confirmation:
            stepValidationStates[step] = createdAppointment != nil ? .valid : .incomplete
        }
    }

    /// Calculate overall booking progress
    func calculateProgress() -> Double {
        let completedSteps = stepValidationStates.values.filter { $0 == .valid }.count
        let totalSteps = BookingStep.allCases.count
        return Double(completedSteps) / Double(totalSteps)
    }

    /// Check if employee self-booking prevention is needed
    func validateEmployeeSelection(_ employee: Employee, currentUser: User?) -> ValidationResult {
        guard let currentUser = currentUser else { return .valid }

        // Check if the current user is trying to book with themselves
        if let employeeUser = employee.user, employeeUser.id == currentUser.id {
            return .invalid(message: "Employees cannot book appointments for themselves. Please log out or use a different account.")
        }

        return .valid
    }
}

// MARK: - Supporting Enums

enum BookingValidationState: Equatable {
    case incomplete
    case valid
    case invalid(String)
}

enum ValidationResult {
    case valid
    case invalid(message: String)

    var isValid: Bool {
        switch self {
        case .valid:
            return true
        case .invalid:
            return false
        }
    }

    var errorMessage: String? {
        switch self {
        case .valid:
            return nil
        case .invalid(let message):
            return message
        }
    }
}

// MARK: - Customer Details Model
struct CustomerDetails: Codable {
    let firstName: String
    let lastName: String
    let email: String
    let phone: String
    let notes: String?
    
    var fullName: String {
        return "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces)
    }
}

// PaymentResult is defined in StripePaymentService.swift

// MARK: - Slot Lock Response Model
// Note: SlotLockResponse is defined in Appointment.swift
