//
//  SetupIntentPaymentStepView.swift
//  LunaraApp
//
//  Created by Lunara Team on 24/07/2025.
//

import SwiftUI
@preconcurrency import StripePaymentSheet
@preconcurrency import StripePayments

struct SetupIntentPaymentStepView: View {
    @Binding var formData: ShopCreationFormData
    let selectedPlan: SubscriptionPlanResponse?
    let isProcessing: Bool
    let onPaymentSuccess: (String) -> Void // Pass the confirmed setup intent ID

    // State for setup intent and payment processing
    @State private var setupIntent: SetupIntentResponse?
    @State private var isCreatingSetupIntent = false
    @State private var isConfirmingPayment = false
    @State private var setupIntentError: String?
    @State private var hasInitialized = false

    private let apiClient = APIClient.shared

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 16) {
                    Image(systemName: "creditcard.fill")
                        .font(.system(size: 48))
                        .foregroundColor(LunaraColors.warmGold)

                    VStack(spacing: 8) {
                        Text("Summary & Payment")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(LunaraColors.charcoalGray)

                        Text("Review your information and complete payment to create your shop.")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                }

                // Order Summary Section (matching web app)
                VStack(spacing: 16) {
                    HStack {
                        Text("Order Summary")
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(LunaraColors.charcoalGray)
                        Spacer()
                    }

                    VStack(spacing: 16) {
                        // Shop Information
                        ShopInfoSummaryView(formData: formData)

                        // Subscription Plan
                        if let plan = selectedPlan {
                            SubscriptionPlanSummaryView(plan: plan)
                        }

                        // Billing Information
                        BillingInfoSummaryView(formData: formData)
                    }
                    .padding(16)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(LunaraColors.coolLightGray.opacity(0.3))
                    )
                }

                // Payment Information Section (matching web app)
                VStack(spacing: 16) {
                    HStack {
                        Text("Payment Information")
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(LunaraColors.charcoalGray)
                        Spacer()
                    }

                    if setupIntent == nil && !isCreatingSetupIntent && !hasInitialized {
                        // Initialize payment automatically
                        Text("Initializing payment...")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .onAppear {
                                if !hasInitialized {
                                    hasInitialized = true
                                    createSetupIntentAndShowPayment()
                                }
                            }
                    } else if isCreatingSetupIntent {
                        // Loading state
                        HStack {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: LunaraColors.warmGold))
                                .scaleEffect(0.8)
                            Text("Setting up payment...")
                                .font(.body)
                                .foregroundColor(.secondary)
                        }
                    } else if let setupIntent = setupIntent {
                        // Integrated payment form
                        IntegratedStripePaymentView(
                            setupIntent: setupIntent,
                            formData: formData,
                            selectedPlan: selectedPlan,
                            isProcessing: $isConfirmingPayment,
                            onPaymentComplete: { setupIntentId in
                                onPaymentSuccess(setupIntentId)
                            },
                            onError: handlePaymentError
                        )
                    }
                }

                // Error Display
                if let error = setupIntentError {
                    VStack(spacing: 12) {
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.red)
                            Text("Payment Setup Error")
                                .font(.headline)
                                .foregroundColor(.red)
                            Spacer()
                        }

                        Text(error)
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.leading)

                        Button("Retry") {
                            setupIntentError = nil
                            createSetupIntentAndShowPayment()
                        }
                        .foregroundColor(LunaraColors.warmGold)
                    }
                    .padding(16)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.red.opacity(0.1))
                    )
                }

                // Security Notice
                HStack(spacing: 8) {
                    Image(systemName: "shield.checkered")
                        .foregroundColor(.green)
                        .font(.caption)

                    Text("Your payment is secured by Stripe")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.horizontal, 24)
        }
    }

    // MARK: - Helper Methods

    private func createSetupIntentAndShowPayment() {
        guard let selectedPlan = selectedPlan else { return }

        isCreatingSetupIntent = true
        setupIntentError = nil

        Task {
            do {
                let setupRequest = ShopCreationSetupRequest(
                    stripePriceId: selectedPlan.id,
                    customerName: formData.customerName,
                    customerEmail: formData.customerEmail,
                    customerPhone: formData.customerPhone.isEmpty ? nil : formData.customerPhone,
                    billingAddressLine1: formData.billingAddressLine1,
                    billingAddressLine2: formData.billingAddressLine2.isEmpty ? nil : formData.billingAddressLine2,
                    billingCity: formData.billingCity,
                    billingState: formData.billingState,
                    billingPostalCode: formData.billingPostalCode,
                    billingCountry: formData.billingCountry
                )

                let response = try await apiClient.createShopCreationSetupIntent(setupRequest)

                await MainActor.run {
                    self.setupIntent = response
                    self.isCreatingSetupIntent = false
                }
            } catch {
                await MainActor.run {
                    self.isCreatingSetupIntent = false
                    self.setupIntentError = error.localizedDescription
                }
            }
        }
    }

    private func handlePaymentComplete() {
        // Pass the confirmed setup intent ID to the parent
        if let setupIntent = setupIntent {
            onPaymentSuccess(setupIntent.setupIntentId)
        } else {
            onPaymentSuccess("unknown_setup_intent_id")
        }
    }

    private func handlePaymentError(_ error: String) {
        setupIntentError = error
        setupIntent = nil
        hasInitialized = false
    }

    private func formatPrice(_ priceInCents: Int, currency: String) -> String {
        let price = Double(priceInCents) / 100.0
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currency.uppercased()
        return formatter.string(from: NSNumber(value: price)) ?? "$\(price)"
    }
}

// MARK: - Summary View Components

struct ShopInfoSummaryView: View {
    let formData: ShopCreationFormData

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Shop Information")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(LunaraColors.charcoalGray)
                Spacer()
            }

            VStack(spacing: 8) {
                SummaryRowView(label: "Business Name", value: formData.name)
                SummaryRowView(label: "Email", value: formData.email)
                SummaryRowView(label: "Phone", value: formData.phone)
                SummaryRowView(label: "Business Types", value: businessTypesText)
                SummaryRowView(label: "Address", value: fullAddress)
            }
        }
    }

    private var businessTypesText: String {
        formData.businessTypes.map { $0.rawValue.capitalized }.joined(separator: ", ")
    }

    private var fullAddress: String {
        var components = [formData.address, formData.city]
        if !formData.state.isEmpty {
            components.append(formData.state)
        }
        components.append(formData.postalCode)
        components.append(formData.country)
        return components.joined(separator: ", ")
    }
}

struct SubscriptionPlanSummaryView: View {
    let plan: SubscriptionPlanResponse

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Subscription Plan")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(LunaraColors.charcoalGray)
                Spacer()
            }

            VStack(spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(plan.name)
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(LunaraColors.charcoalGray)

                        Text(plan.description)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(2)
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 2) {
                        Text(formatPrice(plan.priceInCents, currency: plan.currency))
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundColor(LunaraColors.charcoalGray)

                        Text("per month")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                if !plan.features.isEmpty {
                    Divider()

                    VStack(alignment: .leading, spacing: 6) {
                        ForEach(plan.features.prefix(3), id: \.self) { feature in
                            HStack(spacing: 8) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                                    .font(.caption)

                                Text(feature)
                                    .font(.caption)
                                    .foregroundColor(.secondary)

                                Spacer()
                            }
                        }

                        if plan.features.count > 3 {
                            HStack(spacing: 8) {
                                Image(systemName: "plus.circle.fill")
                                    .foregroundColor(LunaraColors.warmGold)
                                    .font(.caption)

                                Text("\(plan.features.count - 3) more features")
                                    .font(.caption)
                                    .foregroundColor(.secondary)

                                Spacer()
                            }
                        }
                    }
                }
            }
            .padding(12)
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.white)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color.gray.opacity(0.2), lineWidth: 1)
                    )
            )
        }
    }

    private func formatPrice(_ priceInCents: Int, currency: String) -> String {
        let price = Double(priceInCents) / 100.0
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currency.uppercased()
        return formatter.string(from: NSNumber(value: price)) ?? "$\(price)"
    }
}

struct BillingInfoSummaryView: View {
    let formData: ShopCreationFormData

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Billing Information")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(LunaraColors.charcoalGray)
                Spacer()
            }

            VStack(spacing: 8) {
                SummaryRowView(label: "Name", value: formData.customerName)
                SummaryRowView(label: "Email", value: formData.customerEmail)
                if !formData.customerPhone.isEmpty {
                    SummaryRowView(label: "Phone", value: formData.customerPhone)
                }
                SummaryRowView(label: "Billing Address", value: billingAddress)
            }
        }
    }

    private var billingAddress: String {
        var components = [formData.billingAddressLine1]
        if !formData.billingAddressLine2.isEmpty {
            components.append(formData.billingAddressLine2)
        }
        components.append(formData.billingCity)
        if !formData.billingState.isEmpty {
            components.append(formData.billingState)
        }
        components.append(formData.billingPostalCode)
        components.append(formData.billingCountry)
        return components.joined(separator: ", ")
    }
}

struct SummaryRowView: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text("\(label):")
                .font(.caption)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(LunaraColors.charcoalGray)
                .multilineTextAlignment(.trailing)
        }
    }
}

// MARK: - Integrated Stripe Payment View

struct IntegratedStripePaymentView: View {
    let setupIntent: SetupIntentResponse
    let formData: ShopCreationFormData
    let selectedPlan: SubscriptionPlanResponse?
    @Binding var isProcessing: Bool
    let onPaymentComplete: (String) -> Void // Pass setup intent ID
    let onError: (String) -> Void

    @State private var cardNumber = ""
    @State private var expiryDate = ""
    @State private var cvc = ""
    @State private var cardholderName = ""
    @State private var isFormValid = false

    var body: some View {
        VStack(spacing: 16) {
            // Payment Method Form
            VStack(spacing: 16) {
                // Cardholder Name
                VStack(alignment: .leading, spacing: 8) {
                    Text("Cardholder Name")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(LunaraColors.charcoalGray)

                    TextField("Full name on card", text: $cardholderName)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .autocapitalization(.words)
                        .disableAutocorrection(true)
                }

                // Card Number
                VStack(alignment: .leading, spacing: 8) {
                    Text("Card Number")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(LunaraColors.charcoalGray)

                    TextField("1234 5678 9012 3456", text: $cardNumber)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .keyboardType(.numberPad)
                        .onChange(of: cardNumber) { _, newValue in
                            cardNumber = formatCardNumber(newValue)
                            updateFormValidation()
                        }
                }

                // Expiry and CVC
                HStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Expiry Date")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(LunaraColors.charcoalGray)

                        TextField("MM/YY", text: $expiryDate)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .keyboardType(.numberPad)
                            .onChange(of: expiryDate) { _, newValue in
                                expiryDate = formatExpiryDate(newValue)
                                updateFormValidation()
                            }
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("CVC")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(LunaraColors.charcoalGray)

                        TextField("123", text: $cvc)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .keyboardType(.numberPad)
                            .onChange(of: cvc) { _, newValue in
                                cvc = String(newValue.prefix(4))
                                updateFormValidation()
                            }
                    }
                }
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.white)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color(UIColor.systemGray4), lineWidth: 1)
                    )
            )

            // Complete Setup Button
            Button(action: {
                confirmSetupIntent()
            }) {
                HStack {
                    if isProcessing {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .scaleEffect(0.8)
                    } else {
                        Image(systemName: "lock.fill")
                    }

                    Text(isProcessing ? "Creating Shop..." : "Complete Setup")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill((isProcessing || !isFormValid) ? Color.gray : LunaraColors.warmGold)
                )
                .foregroundColor(.white)
            }
            .disabled(isProcessing || !isFormValid)
        }
        .onAppear {
            // Pre-fill cardholder name
            if cardholderName.isEmpty {
                cardholderName = formData.customerName
            }
            updateFormValidation()
        }
    }

    private func formatCardNumber(_ input: String) -> String {
        let digits = input.replacingOccurrences(of: " ", with: "")
        let limitedDigits = String(digits.prefix(16))

        var formatted = ""
        for (index, character) in limitedDigits.enumerated() {
            if index > 0 && index % 4 == 0 {
                formatted += " "
            }
            formatted += String(character)
        }
        return formatted
    }

    private func formatExpiryDate(_ input: String) -> String {
        let digits = input.replacingOccurrences(of: "/", with: "")
        let limitedDigits = String(digits.prefix(4))

        if limitedDigits.count >= 2 {
            let month = String(limitedDigits.prefix(2))
            let year = String(limitedDigits.dropFirst(2))
            return year.isEmpty ? month : "\(month)/\(year)"
        }
        return limitedDigits
    }

    private func updateFormValidation() {
        let cardNumberValid = cardNumber.replacingOccurrences(of: " ", with: "").count >= 13
        let expiryValid = expiryDate.count == 5 && expiryDate.contains("/")
        let cvcValid = cvc.count >= 3
        let nameValid = !cardholderName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty

        isFormValid = cardNumberValid && expiryValid && cvcValid && nameValid
    }

    private func confirmSetupIntent() {
        guard validateForm() else {
            onError("Please fill in all required fields correctly")
            return
        }

        isProcessing = true

        Task {
            do {
                // Create payment method parameters from form data
                let cardParams = STPPaymentMethodCardParams()
                cardParams.number = cardNumber.replacingOccurrences(of: " ", with: "")

                // Parse expiry date
                let expiryComponents = expiryDate.split(separator: "/")
                if expiryComponents.count == 2 {
                    cardParams.expMonth = NSNumber(value: Int(expiryComponents[0]) ?? 0)
                    cardParams.expYear = NSNumber(value: Int("20\(expiryComponents[1])") ?? 0)
                }
                cardParams.cvc = cvc

                // Create billing details
                let billingDetails = STPPaymentMethodBillingDetails()
                billingDetails.name = cardholderName
                billingDetails.email = formData.customerEmail
                billingDetails.phone = formData.customerPhone.isEmpty ? nil : formData.customerPhone

                // Create address
                let address = STPPaymentMethodAddress()
                address.line1 = formData.billingAddressLine1
                address.line2 = formData.billingAddressLine2.isEmpty ? nil : formData.billingAddressLine2
                address.city = formData.billingCity
                address.state = formData.billingState
                address.postalCode = formData.billingPostalCode
                address.country = formData.billingCountry
                billingDetails.address = address

                // Create payment method parameters
                let paymentMethodParams = STPPaymentMethodParams(
                    card: cardParams,
                    billingDetails: billingDetails,
                    metadata: nil
                )

                // Confirm setup intent with payment method
                let result = try await StripePaymentService.shared.confirmSetupIntent(
                    setupIntent: setupIntent,
                    paymentMethodParams: paymentMethodParams
                )

                await MainActor.run {
                    self.isProcessing = false
                    handlePaymentResult(result)
                }
            } catch {
                await MainActor.run {
                    self.isProcessing = false
                    onError(error.localizedDescription)
                }
            }
        }
    }

    private func validateForm() -> Bool {
        let cardNumberValid = cardNumber.replacingOccurrences(of: " ", with: "").count >= 13
        let expiryValid = expiryDate.count == 5 && expiryDate.contains("/")
        let cvcValid = cvc.count >= 3
        let nameValid = !cardholderName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty

        return cardNumberValid && expiryValid && cvcValid && nameValid
    }

    private func handlePaymentResult(_ result: PaymentResult) {
        switch result {
        case .completed(let setupIntentId):
            // Pass the confirmed setup intent ID
            onPaymentComplete(setupIntentId)
        case .failed(let error):
            onError(error)
        case .cancelled:
            // User canceled, do nothing
            break
        }
    }
}



// MARK: - Preview
#Preview {
    SetupIntentPaymentStepView(
        formData: .constant(ShopCreationFormData()),
        selectedPlan: nil,
        isProcessing: false,
        onPaymentSuccess: { _ in }
    )
}
