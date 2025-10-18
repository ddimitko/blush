//
//  BookingFlowView.swift
//  LunaraApp
//
//  Created by Lunara Team on 14/07/2025.
//

import SwiftUI

/// Main booking flow coordinator view with multi-step wizard
struct BookingFlowView: View {
    // MARK: - Properties
    let shop: Shop
    let preselectedService: Service?

    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var authService: AuthenticationService

    // MARK: - State
    @StateObject private var bookingState = BookingFlowState()
    @State private var currentStep: BookingStep = .serviceSelection
    @State private var showingExitConfirmation = false

    // MARK: - Computed Properties
    private var totalSteps: Int { BookingStep.allCases.count }
    private var currentStepIndex: Int { BookingStep.allCases.firstIndex(of: currentStep) ?? 0 }
    private var progressPercentage: Double { Double(currentStepIndex + 1) / Double(totalSteps) }

    private var shouldShowBookingSummary: Bool {
        // Hide booking summary only on confirmation and payment steps
        return currentStep != .confirmation &&
               currentStep != .payment &&
               (bookingState.selectedService != nil || bookingState.selectedEmployee != nil || bookingState.selectedSlot != nil)
    }

    private var shouldShowSlotTimer: Bool {
        return currentStep == .customerDetails || currentStep == .payment
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Enhanced Navigation Header
                EnhancedBookingNavigation(
                    currentStep: $currentStep,
                    bookingState: bookingState,
                    onBack: moveToPreviousStep,
                    onCancel: handleCancelBooking
                )
                .zIndex(10) // Ensure navigation stays above all other content

                // Persistent Booking Summary
                if shouldShowBookingSummary {
                    PersistentBookingSummary(
                        bookingState: bookingState,
                        currentStep: $currentStep,
                        onEditStep: navigateToStep
                    )
                    .padding(.top, 8)
                }

                // Slot Lock Timer (when active) - positioned right after booking summary
                if bookingState.isSlotLocked && shouldShowSlotTimer {
                    SlotLockTimer(
                        bookingState: bookingState,
                        onExpired: handleSlotExpired,
                        onExtendRequested: handleSlotExtendRequested
                    )
                    .padding(.horizontal, 16)
                    .padding(.top, shouldShowBookingSummary ? 8 : 16)
                }

                // Step Content
                stepContent
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .navigationBarHidden(true)
            .alert("Cancel Booking?", isPresented: $showingExitConfirmation) {
                Button("Continue Booking", role: .cancel) { }
                Button("Cancel Booking", role: .destructive) {
                    dismiss()
                }
            } message: {
                Text("Are you sure you want to cancel this booking? Your progress will be lost.")
            }
        }
        .environmentObject(bookingState)
        .onAppear {
            setupInitialState()
        }
        .onDisappear {
            cleanupBookingState()
        }
    }

    // MARK: - Step Content
    @ViewBuilder
    private var stepContent: some View {
        switch currentStep {
        case .serviceSelection:
            ServiceSelectionView(
                shop: shop,
                preselectedService: preselectedService,
                onServiceSelected: { service in
                    bookingState.selectedService = service
                    moveToNextStep()
                }
            )

        case .employeeSelection:
            EmployeeSelectionView(
                shop: shop,
                service: bookingState.selectedService!,
                onEmployeeSelected: { employee in
                    bookingState.selectedEmployee = employee
                    moveToNextStep()
                }
            )

        case .dateTimeSelection:
            DateTimeSelectionView(
                shop: shop,
                service: bookingState.selectedService!,
                employee: bookingState.selectedEmployee!,
                onSlotSelected: { slot in
                    bookingState.selectedSlot = slot
                    moveToNextStep()
                }
            )

        case .customerDetails:
            CustomerDetailsView(
                isAuthenticated: authService.isAuthenticated,
                user: authService.user,
                onDetailsCompleted: { details in
                    bookingState.customerDetails = details
                    moveToNextStep()
                }
            )

        case .payment:
            PaymentView(
                shop: shop,
                service: bookingState.selectedService!,
                employee: bookingState.selectedEmployee!,
                slot: bookingState.selectedSlot!,
                customerDetails: bookingState.customerDetails!,
                onPaymentCompleted: { paymentResult in
                    bookingState.paymentResult = paymentResult
                    moveToNextStep()
                }
            )

        case .confirmation:
            BookingConfirmationView(
                appointment: bookingState.createdAppointment,
                onDone: {
                    dismiss()
                }
            )
        }
    }






    // MARK: - Private Methods

    private func setupInitialState() {
        bookingState.shop = shop

        // If a service is preselected, set it and skip to employee selection
        if let preselectedService = preselectedService {
            bookingState.selectedService = preselectedService
            currentStep = .employeeSelection
        }
    }

    private func cleanupBookingState() {
        // Release any locked slots when leaving the booking flow
        if let slot = bookingState.selectedSlot,
           let lockToken = bookingState.slotLockToken {
            Task {
                try? await APIClient.shared.unlockSlot(
                    shopId: shop.id,
                    serviceId: bookingState.selectedService?.id ?? "",
                    employeeId: bookingState.selectedEmployee?.id ?? "",
                    dateTime: slot.dateTime,
                    lockToken: lockToken
                )
            }
        }

        // Reset booking state
        bookingState.reset()

        // Note: WebSocket slot subscriptions are cleaned up automatically when DateTimeSelectionView disappears
        print("🧹 Booking flow cleanup completed")
    }

    private func handleCancelBooking() {
        // Show confirmation if user has made progress
        if currentStep != .serviceSelection {
            showingExitConfirmation = true
        } else {
            dismiss()
        }
    }

    private func moveToNextStep() {
        guard let nextStep = currentStep.nextStep else { return }

        withAnimation(.easeInOut(duration: 0.3)) {
            currentStep = nextStep
        }
    }

    private func moveToPreviousStep() {
        guard let previousStep = currentStep.previousStep else { return }

        // Handle slot unlocking when going back from various steps
        if currentStep == .dateTimeSelection || currentStep == .customerDetails || currentStep == .payment {
            Task {
                await bookingState.unlockSlot()
            }
        }

        withAnimation(.easeInOut(duration: 0.3)) {
            currentStep = previousStep
        }
    }

    private func navigateToStep(_ step: BookingStep) {
        // Allow navigation to previous steps for editing
        if BookingStep.allCases.firstIndex(of: step)! < BookingStep.allCases.firstIndex(of: currentStep)! {
            withAnimation(.easeInOut(duration: 0.3)) {
                currentStep = step
            }
        }
    }

    private func handleSlotExpired() {
        // Reset to date/time selection when slot expires
        withAnimation(.easeInOut(duration: 0.3)) {
            currentStep = .dateTimeSelection
        }

        // Show user feedback
        let notification = UINotificationFeedbackGenerator()
        notification.notificationOccurred(.warning)
    }

    private func handleSlotExtendRequested() {
        // Handle slot extension failure - could show alert or retry
        print("Slot extension failed - implement retry logic or user notification")
    }
}

// MARK: - Booking Step Enum
enum BookingStep: String, CaseIterable {
    case serviceSelection = "service"
    case employeeSelection = "employee"
    case dateTimeSelection = "datetime"
    case customerDetails = "details"
    case payment = "payment"
    case confirmation = "confirmation"

    var title: String {
        switch self {
        case .serviceSelection:
            return "Choose Service"
        case .employeeSelection:
            return "Choose Staff"
        case .dateTimeSelection:
            return "Pick Date & Time"
        case .customerDetails:
            return "Your Details"
        case .payment:
            return "Payment"
        case .confirmation:
            return "Confirmed"
        }
    }

    var nextStep: BookingStep? {
        let allCases = BookingStep.allCases
        guard let currentIndex = allCases.firstIndex(of: self),
              currentIndex < allCases.count - 1 else { return nil }
        return allCases[currentIndex + 1]
    }

    var previousStep: BookingStep? {
        let allCases = BookingStep.allCases
        guard let currentIndex = allCases.firstIndex(of: self),
              currentIndex > 0 else { return nil }
        return allCases[currentIndex - 1]
    }
}

// PrimaryButtonStyle is defined in LunaraButtonStyles.swift

// MARK: - Preview
struct BookingFlowView_Previews: PreviewProvider {
    static var previews: some View {
        BookingFlowView(shop: Shop.preview, preselectedService: nil)
            .environmentObject(AuthenticationService.shared)
    }
}
