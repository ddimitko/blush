//
//  PaymentView.swift
//  LunaraApp
//
//  Created by Lunara Team on 23/07/2025.
//

import SwiftUI
import StripePaymentSheet

/// View for handling payment during the booking flow
struct PaymentView: View {
    // MARK: - Properties
    let shop: Shop
    let service: Service
    let employee: Employee
    let slot: AvailableSlot
    let customerDetails: CustomerDetails
    let onPaymentCompleted: (PaymentResult) -> Void
    
    // MARK: - Environment
    @EnvironmentObject var bookingState: BookingFlowState
    @EnvironmentObject var authService: AuthenticationService
    
    // MARK: - State
    @State private var isProcessingPayment = false
    @State private var paymentSheet: PaymentSheet?
    @State private var paymentIntentClientSecret: String?
    @State private var paymentIntentId: String?
    @State private var errorMessage: String?
    @State private var showingError = false
    @State private var selectedPaymentMethod: PaymentMethodType = .cash
    
    enum PaymentMethodType: String, CaseIterable {
        case card = "card"
        case applePay = "apple_pay"
        case cash = "cash"

        var displayName: String {
            switch self {
            case .card:
                return "Credit/Debit Card"
            case .applePay:
                return "Apple Pay"
            case .cash:
                return "Cash Payment"
            }
        }

        var icon: String {
            switch self {
            case .card:
                return "creditcard"
            case .applePay:
                return "apple.logo"
            case .cash:
                return "banknote"
            }
        }

        var subtitle: String {
            switch self {
            case .card:
                return "Pay with your card"
            case .applePay:
                return "Pay with Apple Pay"
            case .cash:
                return "Pay when you arrive"
            }
        }
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                headerSection
                
                // Booking Summary
                bookingSummarySection
                
                // Payment Method Selection
                paymentMethodSection



                // Payment Button
                enhancedPaymentButton

                // Terms and Conditions
                termsSection
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 32)
        }
        .onAppear {
            setupInitialPaymentMethod()
            if selectedPaymentMethod != .cash {
                setupPayment()
            }
        }
        .alert("Payment Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage ?? "An unknown error occurred")
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        VStack(spacing: 8) {
            Text("Complete Payment")
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(LunaraColors.primaryText)
            
            Text("Secure payment to confirm your appointment")
                .font(.system(size: 16))
                .foregroundColor(LunaraColors.secondaryText)
                .multilineTextAlignment(.center)
        }
    }
    
    // MARK: - Booking Summary Section
    private var bookingSummarySection: some View {
        VStack(spacing: 16) {
            Text("Booking Summary")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
                .frame(maxWidth: .infinity, alignment: .leading)
            
            VStack(spacing: 12) {
                // Service
                PaymentSummaryRow(
                    title: "Service",
                    value: service.name,
                    subtitle: "\(service.durationMinutes) minutes"
                )

                // Employee
                if employee.id != "any" {
                    PaymentSummaryRow(
                        title: "Stylist",
                        value: employee.displayName,
                        subtitle: employee.specialties?.joined(separator: ", ") ?? ""
                    )
                }

                // Date & Time
                PaymentSummaryRow(
                    title: "Date & Time",
                    value: slot.formattedTime,
                    subtitle: formatSlotDate()
                )

                Divider()
                
                // Total
                HStack {
                    Text("Total")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    Spacer()
                    
                    Text(service.formattedPrice)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(LunaraColors.warmGold)
                }
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(LunaraColors.coolLightGray.opacity(0.3))
            )
        }
    }
    
    // MARK: - Payment Method Section
    private var paymentMethodSection: some View {
        VStack(spacing: 16) {
            Text("Payment Method")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
                .frame(maxWidth: .infinity, alignment: .leading)

            VStack(spacing: 12) {
                ForEach(availablePaymentMethods, id: \.rawValue) { method in
                    PaymentMethodCard(
                        method: method,
                        isSelected: selectedPaymentMethod == method,
                        onTap: {
                            selectedPaymentMethod = method
                        }
                    )
                }
            }
        }
    }

    // MARK: - Available Payment Methods
    private var availablePaymentMethods: [PaymentMethodType] {
        var methods: [PaymentMethodType] = [.cash] // Cash is always available

        if shop.acceptsCardPayments {
            methods.append(.card)
            methods.append(.applePay)
        }

        return methods
    }
    
    // MARK: - Legacy Payment Button (replaced by enhancedPaymentButton)
    private var paymentButton: some View {
        Button(action: handlePayment) {
            HStack {
                if isProcessingPayment {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: LunaraColors.white))
                        .scaleEffect(0.8)

                    Text(selectedPaymentMethod == .cash ? "Booking..." : "Processing...")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(LunaraColors.white)
                } else {
                    if selectedPaymentMethod == .cash {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 14))

                        Text("Confirm Booking")
                            .font(.system(size: 16, weight: .semibold))
                    } else {
                        Image(systemName: "lock.fill")
                            .font(.system(size: 14))

                        Text("Pay \(service.formattedPrice)")
                            .font(.system(size: 16, weight: .semibold))
                    }
                }
            }
            .foregroundColor(LunaraColors.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isProcessingPayment ? LunaraColors.coolLightGray : LunaraColors.warmGold)
            )
        }
        .disabled(isProcessingPayment || (selectedPaymentMethod != .cash && paymentIntentClientSecret == nil))
    }
    


    // MARK: - Enhanced Payment Button
    private var enhancedPaymentButton: some View {
        VStack(spacing: 12) {
            Button(action: handlePayment) {
                HStack(spacing: 12) {
                    if isProcessingPayment {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .scaleEffect(0.8)
                    } else {
                        Image(systemName: paymentButtonIcon)
                            .font(.system(size: 16, weight: .semibold))
                    }

                    Text(paymentButtonText)
                        .font(.system(size: 18, weight: .semibold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(paymentButtonBackground)
                .cornerRadius(12)
                .shadow(color: LunaraColors.warmGold.opacity(0.3), radius: 8, x: 0, y: 4)
            }
            .disabled(isProcessingPayment || !canProcessPayment)
            .scaleEffect(isProcessingPayment ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: isProcessingPayment)

            // Payment Amount Summary
            if let totalAmount = bookingState.selectedService?.price {
                Text("Total: \(String(format: "$%.2f", totalAmount))")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)
            }
        }
    }

    private var paymentButtonIcon: String {
        switch selectedPaymentMethod {
        case .card:
            return "creditcard"
        case .applePay:
            return "apple.logo"
        case .cash:
            return "banknote"
        }
    }

    private var paymentButtonText: String {
        if isProcessingPayment {
            return "Processing..."
        }

        switch selectedPaymentMethod {
        case .card:
            return "Pay Securely"
        case .applePay:
            return "Pay with Apple Pay"
        case .cash:
            return "Confirm Booking"
        }
    }

    private var paymentButtonBackground: Color {
        if isProcessingPayment || !canProcessPayment {
            return LunaraColors.secondaryText
        }

        switch selectedPaymentMethod {
        case .card, .cash:
            return LunaraColors.warmGold
        case .applePay:
            return Color.black
        }
    }

    private var canProcessPayment: Bool {
        switch selectedPaymentMethod {
        case .card:
            return paymentIntentClientSecret != nil
        case .applePay:
            return true // Apple Pay validation handled separately
        case .cash:
            return true
        }
    }

    // MARK: - Terms Section
    private var termsSection: some View {
        VStack(spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: "shield.checkered")
                    .foregroundColor(LunaraColors.warmGold)
                    .font(.system(size: 14))

                Text("Secure payment powered by Stripe")
                    .font(.system(size: 12))
                    .foregroundColor(LunaraColors.secondaryText)
            }

            Text("By completing this payment, you agree to our Terms of Service and Privacy Policy. Cancellations must be made at least 24 hours in advance.")
                .font(.system(size: 11))
                .foregroundColor(LunaraColors.secondaryText)
                .multilineTextAlignment(.center)
                .lineLimit(nil)
        }
    }
    
    // MARK: - Private Methods

    private func setupInitialPaymentMethod() {
        // Set default payment method based on shop capabilities
        if shop.acceptsCardPayments {
            selectedPaymentMethod = .card
        } else {
            selectedPaymentMethod = .cash
        }
    }

    private func setupPayment() {
        Task {
            await createPaymentIntent()
        }
    }
    
    private func createPaymentIntent() async {
        do {
            // Debug: Print service details
            print("🔍 Service Debug Info:")
            print("   - Name: \(service.name)")
            print("   - ID: \(service.id)")
            print("   - Price: \(service.price)")
            print("   - Deposit Amount: \(service.depositAmount ?? 0)")
            print("   - Shop: \(shop.name)")

            // Validate service price
            guard service.price > 0 else {
                await MainActor.run {
                    self.errorMessage = "Service price is invalid (\(service.price)). Please contact the shop."
                    self.showingError = true
                }
                return
            }

            print("🔄 Creating payment intent for service: \(service.name), price: \(service.price)")

            let appointmentRequest = AppointmentCreationRequest(
                shopId: shop.id,
                serviceId: service.id,
                employeeId: employee.id,
                appointmentDateTime: slot.dateTime,
                paymentType: .card,
                notes: customerDetails.notes,
                slotLockToken: bookingState.slotLockToken ?? "",
                guestEmail: authService.isAuthenticated ? nil : customerDetails.email,
                guestFirstName: authService.isAuthenticated ? nil : customerDetails.firstName,
                guestLastName: authService.isAuthenticated ? nil : customerDetails.lastName,
                guestPhone: authService.isAuthenticated ? nil : customerDetails.phone,
                paymentIntentId: nil,
                paymentMethodId: nil,
                depositAmount: service.depositAmount
            )

            print("🔄 Appointment request created for \(authService.isAuthenticated ? "authenticated" : "guest") user")

            let response = try await StripePaymentService.shared.createPaymentIntent(for: appointmentRequest, in: shop, service: service)

            print("✅ Payment intent created successfully: \(response.paymentIntentId)")

            await MainActor.run {
                self.paymentIntentClientSecret = response.clientSecret
                self.paymentIntentId = response.paymentIntentId
                self.setupPaymentSheet(response)
            }

        } catch {
            print("❌ Payment intent creation failed: \(error)")
            await MainActor.run {
                self.errorMessage = "Failed to setup payment: \(error.localizedDescription)"
                self.showingError = true
            }
        }
    }
    
    private func setupPaymentSheet(_ response: PaymentIntentResponse) {
        var configuration = PaymentSheet.Configuration()
        configuration.merchantDisplayName = shop.name
        configuration.allowsDelayedPaymentMethods = true

        // Configure Apple Pay
        configuration.applePay = .init(
            merchantId: "merchant.com.lunara.LunaraApp",
            merchantCountryCode: shop.country
        )
        // Disable Link in PaymentSheet via Dashboard/PM settings; ensure not offered here
        configuration.customer = nil

        paymentSheet = PaymentSheet(
            paymentIntentClientSecret: response.clientSecret,
            configuration: configuration
        )
    }
    
    private func handlePayment() {
        if selectedPaymentMethod == .cash {
            handleCashPayment()
        } else {
            handleCardPayment()
        }
    }

    private func handleCashPayment() {
        isProcessingPayment = true
        Task {
            await createCashAppointment()
        }
    }

    private func handleCardPayment() {
        guard let paymentSheet = paymentSheet else {
            print("❌ PaymentSheet is nil")
            return
        }

        isProcessingPayment = true
        print("🔄 Starting card payment process...")

        // Use a more reliable method to find the presenting view controller
        DispatchQueue.main.async {
            self.presentPaymentSheet(paymentSheet)
        }
    }

    private func presentPaymentSheet(_ paymentSheet: PaymentSheet) {
        guard let presentingViewController = findAvailableViewController() else {
            print("❌ No available view controller found")
            errorMessage = "Unable to present payment sheet"
            showingError = true
            isProcessingPayment = false
            return
        }

        print("✅ Found presenting view controller: \(type(of: presentingViewController))")
        print("🔍 Presented view controller: \(presentingViewController.presentedViewController?.description ?? "none")")

        // If there's already a presented view controller, wait and retry
        if presentingViewController.presentedViewController != nil {
            print("⏳ View controller is busy, retrying in 0.5 seconds...")
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                self.presentPaymentSheet(paymentSheet)
            }
            return
        }

        print("🚀 Presenting PaymentSheet...")
        paymentSheet.present(from: presentingViewController) { [self] result in
            Task { @MainActor in
                print("💳 PaymentSheet result: \(result)")
                self.isProcessingPayment = false

                switch result {
                case .completed:
                    print("✅ Payment completed successfully")
                    await self.handlePaymentSuccess()
                case .canceled:
                    print("⚠️ Payment canceled by user")
                    // User canceled, do nothing
                    break
                case .failed(let error):
                    print("❌ Payment failed: \(error.localizedDescription)")
                    self.errorMessage = "Payment failed: \(error.localizedDescription)"
                    self.showingError = true
                }
            }
        }
    }

    private func findAvailableViewController() -> UIViewController? {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first,
              let rootViewController = window.rootViewController else {
            print("❌ Could not find window or root view controller")
            return nil
        }

        // Start from root and find the topmost view controller that's not presenting anything
        var currentViewController = rootViewController

        // Navigate to the topmost view controller
        while let presentedViewController = currentViewController.presentedViewController {
            currentViewController = presentedViewController
        }

        // If it's a navigation controller, get the top view controller
        if let navigationController = currentViewController as? UINavigationController {
            currentViewController = navigationController.topViewController ?? navigationController
        }

        // If it's a tab bar controller, get the selected view controller
        if let tabBarController = currentViewController as? UITabBarController {
            currentViewController = tabBarController.selectedViewController ?? tabBarController
        }

        print("🔍 Found view controller: \(type(of: currentViewController))")
        return currentViewController
    }
    
    private func handlePaymentSuccess() async {
        // Create the appointment
        await createAppointment()
    }

    private func createCashAppointment() async {
        guard let selectedSlot = bookingState.selectedSlot,
              let lockToken = bookingState.slotLockToken else {
            await MainActor.run {
                self.errorMessage = "Missing slot or lock information"
                self.showingError = true
                self.isProcessingPayment = false
            }
            return
        }

        do {
            let appointmentRequest = AppointmentCreationRequest(
                shopId: shop.id,
                serviceId: service.id,
                employeeId: employee.id,
                appointmentDateTime: selectedSlot.dateTime,
                paymentType: .cash,
                notes: customerDetails.notes,
                slotLockToken: lockToken,
                guestEmail: authService.isAuthenticated ? nil : customerDetails.email,
                guestFirstName: authService.isAuthenticated ? nil : customerDetails.firstName,
                guestLastName: authService.isAuthenticated ? nil : customerDetails.lastName,
                guestPhone: authService.isAuthenticated ? nil : customerDetails.phone,
                paymentIntentId: nil,
                paymentMethodId: nil,
                depositAmount: nil // No deposit for cash payments
            )

            let response = try await APIClient.shared.createAppointment(request: appointmentRequest)

            await MainActor.run {
                bookingState.createdAppointment = response.appointment
                self.isProcessingPayment = false

                let paymentResult = PaymentResult.completed("cash_payment")
                self.onPaymentCompleted(paymentResult)
            }

        } catch {
            await MainActor.run {
                self.errorMessage = "Failed to create appointment: \(error.localizedDescription)"
                self.showingError = true
                self.isProcessingPayment = false
            }
        }
    }
    
    private func createAppointment() async {
        guard let paymentIntentId = paymentIntentId else { return }

        do {
            let request = AppointmentCreationRequest(
                shopId: shop.id,
                serviceId: service.id,
                employeeId: employee.id,
                appointmentDateTime: slot.dateTime,
                paymentType: .card,
                notes: customerDetails.notes,
                slotLockToken: bookingState.slotLockToken ?? "",
                guestEmail: authService.isAuthenticated ? nil : customerDetails.email,
                guestFirstName: authService.isAuthenticated ? nil : customerDetails.firstName,
                guestLastName: authService.isAuthenticated ? nil : customerDetails.lastName,
                guestPhone: authService.isAuthenticated ? nil : customerDetails.phone,
                paymentIntentId: paymentIntentId,
                paymentMethodId: nil,
                depositAmount: service.depositAmount
            )

            let response = try await APIClient.shared.createAppointment(request: request)

            await MainActor.run {
                bookingState.createdAppointment = response.appointment

                let paymentResult = PaymentResult.completed(paymentIntentId)

                self.onPaymentCompleted(paymentResult)
            }

        } catch {
            await MainActor.run {
                self.errorMessage = "Failed to create appointment: \(error.localizedDescription)"
                self.showingError = true
            }
        }
    }
    
    private func formatSlotDate() -> String {
        guard let date = slot.date else { return "" }
        
        let formatter = DateFormatter()
        formatter.dateStyle = .full
        return formatter.string(from: date)
    }
}

// MARK: - Payment Summary Row Component
struct PaymentSummaryRow: View {
    let title: String
    let value: String
    let subtitle: String?

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)

                Text(value)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)

                if let subtitle = subtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.system(size: 12))
                        .foregroundColor(LunaraColors.secondaryText)
                        .lineLimit(1)
                }
            }

            Spacer()
        }
    }
}

// MARK: - Payment Method Card Component
struct PaymentMethodCard: View {
    let method: PaymentView.PaymentMethodType
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 16) {
                // Icon
                Image(systemName: method.icon)
                    .font(.system(size: 20))
                    .foregroundColor(isSelected ? LunaraColors.warmGold : LunaraColors.charcoalGray)
                    .frame(width: 24)

                // Title and Subtitle
                VStack(alignment: .leading, spacing: 2) {
                    Text(method.displayName)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)

                    Text(method.subtitle)
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                }

                Spacer()

                // Selection Indicator
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundColor(LunaraColors.warmGold)
                }
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(LunaraColors.white)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(
                                isSelected ? LunaraColors.warmGold : LunaraColors.coolLightGray,
                                lineWidth: isSelected ? 2 : 1
                            )
                    )
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Payment Models
// Note: PaymentIntentRequest and PaymentIntentResponse are defined in APIModels.swift

// MARK: - Preview
struct PaymentView_Previews: PreviewProvider {
    static var previews: some View {
        PaymentView(
            shop: Shop.preview,
            service: Service.preview,
            employee: Employee.preview,
            slot: AvailableSlot(
                id: "slot-1",
                dateTime: "2025-07-24T14:00:00Z",
                available: true,
                locked: false,
                lockedBy: nil,
                price: 50.0
            ),
            customerDetails: CustomerDetails(
                firstName: "John",
                lastName: "Doe",
                email: "john.doe@example.com",
                phone: "+1234567890",
                notes: nil
            ),
            onPaymentCompleted: { _ in }
        )
        .environmentObject(BookingFlowState())
        .environmentObject(AuthenticationService.shared)
    }
}
