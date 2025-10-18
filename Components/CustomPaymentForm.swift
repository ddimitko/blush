//
//  CustomPaymentForm.swift
//  LunaraApp
//
//  Created by Lunara Team on 16/07/2025.
//

import SwiftUI
@preconcurrency import StripePaymentSheet
@preconcurrency import StripePayments
import Foundation

struct CustomPaymentForm: View {
    @Binding var cardNumber: String
    @Binding var expiryDate: String
    @Binding var cvc: String
    @Binding var cardholderName: String
    @Binding var isValid: Bool

    let selectedPlan: SubscriptionPlanResponse?
    let customerInfo: SubscriptionCustomerInfo
    let countryCode: String?
    let onPaymentMethodCreated: (String) -> Void
    let onError: (String) -> Void

    @State private var isProcessing = false
    @State private var cardNumberError: String?
    @State private var expiryError: String?
    @State private var cvcError: String?
    @State private var cardholderNameError: String?

    private let countryValidation = CountryValidationService.shared
    
    var body: some View {
        VStack(spacing: 20) {
            // Header
            VStack(spacing: 8) {
                HStack {
                    Image(systemName: "creditcard.fill")
                        .foregroundColor(LunaraColors.warmGold)
                    
                    Text("Payment Information")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(LunaraColors.charcoalGray)
                    
                    Spacer()
                }
                
                VStack(spacing: 4) {
                    Text("Enter your payment details to complete your subscription")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    if let countryCode = countryCode {
                        Text("Currency: \(countryValidation.getCurrencyCode(for: countryCode)) (\(countryValidation.getCurrencySymbol(for: countryCode)))")
                            .font(.caption)
                            .foregroundColor(LunaraColors.warmGold)
                    }
                }
            }
            
            // Payment Form Fields
            VStack(spacing: 16) {
                // Cardholder Name
                PaymentFieldView(
                    title: "Cardholder Name",
                    text: $cardholderName,
                    placeholder: "John Doe",
                    errorMessage: cardholderNameError,
                    keyboardType: .default,
                    isRequired: true,
                    onValidate: { value in
                        validateCardholderName(value)
                    }
                )
                
                // Card Number
                PaymentFieldView(
                    title: "Card Number",
                    text: $cardNumber,
                    placeholder: "1234 5678 9012 3456",
                    errorMessage: cardNumberError,
                    keyboardType: .numberPad,
                    isRequired: true,
                    formatter: cardNumberFormatter,
                    onValidate: { value in
                        validateCardNumber(value)
                    }
                )
                
                // Expiry and CVC
                HStack(spacing: 12) {
                    PaymentFieldView(
                        title: "Expiry Date",
                        text: $expiryDate,
                        placeholder: "MM/YY",
                        errorMessage: expiryError,
                        keyboardType: .numberPad,
                        isRequired: true,
                        formatter: expiryDateFormatter,
                        onValidate: { value in
                            validateExpiryDate(value)
                        }
                    )
                    
                    PaymentFieldView(
                        title: "CVC",
                        text: $cvc,
                        placeholder: "123",
                        errorMessage: cvcError,
                        keyboardType: .numberPad,
                        isRequired: true,
                        formatter: cvcFormatter,
                        onValidate: { value in
                            validateCVC(value)
                        }
                    )
                }
            }
            
            // Security Notice
            SecurityNoticeView()
            
            // Process Payment Button
            Button(action: {
                processPayment()
            }) {
                HStack {
                    if isProcessing {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .scaleEffect(0.8)
                    } else {
                        Image(systemName: "lock.fill")
                    }
                    
                    Text(isProcessing ? "Processing..." : "Secure Payment")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(isFormValid ? LunaraColors.warmGold : Color.gray)
                .foregroundColor(.white)
                .cornerRadius(8)
            }
            .disabled(!isFormValid || isProcessing)
        }
        .onChange(of: cardNumber) { _, _ in updateFormValidity() }
        .onChange(of: expiryDate) { _, _ in updateFormValidity() }
        .onChange(of: cvc) { _, _ in updateFormValidity() }
        .onChange(of: cardholderName) { _, _ in updateFormValidity() }
    }
    
    // MARK: - Computed Properties
    private var isFormValid: Bool {
        return !cardholderName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
               cardNumber.replacingOccurrences(of: " ", with: "").count >= 13 &&
               expiryDate.count == 5 &&
               cvc.count >= 3 &&
               cardNumberError == nil &&
               expiryError == nil &&
               cvcError == nil &&
               cardholderNameError == nil
    }
    
    // MARK: - Validation Methods
    private func validateCardholderName(_ name: String) {
        if name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            cardholderNameError = "Cardholder name is required"
        } else if name.count < 2 {
            cardholderNameError = "Please enter a valid name"
        } else {
            cardholderNameError = nil
        }
    }
    
    private func validateCardNumber(_ number: String) {
        let cleanNumber = number.replacingOccurrences(of: " ", with: "")
        
        if cleanNumber.isEmpty {
            cardNumberError = "Card number is required"
        } else if cleanNumber.count < 13 {
            cardNumberError = "Card number is too short"
        } else if cleanNumber.count > 19 {
            cardNumberError = "Card number is too long"
        } else if !isValidLuhnNumber(cleanNumber) {
            cardNumberError = "Invalid card number"
        } else {
            cardNumberError = nil
        }
    }
    
    private func validateExpiryDate(_ expiry: String) {
        if expiry.isEmpty {
            expiryError = "Expiry date is required"
        } else if expiry.count != 5 {
            expiryError = "Invalid format (MM/YY)"
        } else {
            let components = expiry.split(separator: "/")
            if components.count == 2,
               let month = Int(components[0]),
               let year = Int(components[1]) {
                
                if month < 1 || month > 12 {
                    expiryError = "Invalid month"
                } else {
                    let currentYear = Calendar.current.component(.year, from: Date()) % 100
                    let currentMonth = Calendar.current.component(.month, from: Date())
                    
                    if year < currentYear || (year == currentYear && month < currentMonth) {
                        expiryError = "Card has expired"
                    } else {
                        expiryError = nil
                    }
                }
            } else {
                expiryError = "Invalid format (MM/YY)"
            }
        }
    }
    
    private func validateCVC(_ cvc: String) {
        if cvc.isEmpty {
            cvcError = "CVC is required"
        } else if cvc.count < 3 {
            cvcError = "CVC is too short"
        } else if cvc.count > 4 {
            cvcError = "CVC is too long"
        } else {
            cvcError = nil
        }
    }
    
    // MARK: - Formatters
    private func cardNumberFormatter(_ input: String) -> String {
        let cleanNumber = input.replacingOccurrences(of: " ", with: "")
        let maxLength = 19
        let truncated = String(cleanNumber.prefix(maxLength))
        
        var formatted = ""
        for (index, character) in truncated.enumerated() {
            if index > 0 && index % 4 == 0 {
                formatted += " "
            }
            formatted += String(character)
        }
        
        return formatted
    }
    
    private func expiryDateFormatter(_ input: String) -> String {
        let cleanInput = input.replacingOccurrences(of: "/", with: "")
        let maxLength = 4
        let truncated = String(cleanInput.prefix(maxLength))
        
        if truncated.count >= 2 {
            let month = String(truncated.prefix(2))
            let year = String(truncated.dropFirst(2))
            return "\(month)/\(year)"
        } else {
            return truncated
        }
    }
    
    private func cvcFormatter(_ input: String) -> String {
        return String(input.prefix(4))
    }
    
    // MARK: - Helper Methods
    private func isValidLuhnNumber(_ number: String) -> Bool {
        let digits = number.compactMap { Int(String($0)) }
        guard digits.count == number.count else { return false }
        
        let sum = digits.reversed().enumerated().reduce(0) { sum, pair in
            let (index, digit) = pair
            let doubled = index % 2 == 1 ? digit * 2 : digit
            return sum + (doubled > 9 ? doubled - 9 : doubled)
        }
        
        return sum % 10 == 0
    }
    
    private func updateFormValidity() {
        isValid = isFormValid
    }
    
    private func processPayment() {
        guard isFormValid else { return }
        
        isProcessing = true
        
        // Create Stripe payment method
        Task {
            do {
                let paymentMethodId = try await createStripePaymentMethod()
                await MainActor.run {
                    self.isProcessing = false
                    self.onPaymentMethodCreated(paymentMethodId)
                }
            } catch {
                await MainActor.run {
                    self.isProcessing = false
                    self.onError("Failed to process payment: \(error.localizedDescription)")
                }
            }
        }
    }
    
    private func createStripePaymentMethod() async throws -> String {
        // Ensure Stripe is configured globally via DependencyConfiguration.configureAll()
        // No hardcoded keys here. If needed, trigger a refresh from backend:
        await MainActor.run {
            if StripeAPI.defaultPublishableKey == nil || StripeAPI.defaultPublishableKey?.isEmpty == true {
                print("⚠️ Stripe publishable key not set. Attempting to fetch from backend…")
            }
        }

        // Validate input data
        let cleanCardNumber = cardNumber.replacingOccurrences(of: " ", with: "")
        guard !cleanCardNumber.isEmpty, cleanCardNumber.count >= 13 else {
            throw NSError(domain: "ValidationError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid card number"])
        }

        guard !expiryDate.isEmpty, expiryDate.count == 5 else {
            throw NSError(domain: "ValidationError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid expiry date"])
        }

        guard !cvc.isEmpty, cvc.count >= 3 else {
            throw NSError(domain: "ValidationError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid CVC"])
        }

        guard !cardholderName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw NSError(domain: "ValidationError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Cardholder name is required"])
        }

        print("🔄 Creating Stripe payment method...")
        print("   Card number length: \(cleanCardNumber.count)")
        print("   Expiry: \(expiryDate)")
        print("   CVC length: \(cvc.count)")
        print("   Cardholder: \(cardholderName)")
        // Print debug info on main actor to ensure thread safety
        await MainActor.run {
            print("   Stripe API Key set: \(StripeAPI.defaultPublishableKey?.prefix(20) ?? "nil")")
            print("   STPAPIClient Key set: \(STPAPIClient.shared.publishableKey?.prefix(20) ?? "nil")")
        }

        // Create card parameters
        let cardParams = STPPaymentMethodCardParams()
        cardParams.number = cleanCardNumber

        let expiryComponents = expiryDate.split(separator: "/")
        if expiryComponents.count == 2 {
            let month = Int(expiryComponents[0]) ?? 0
            let year = Int("20\(expiryComponents[1])") ?? 0
            cardParams.expMonth = NSNumber(value: month)
            cardParams.expYear = NSNumber(value: year)
            print("   Parsed expiry: \(month)/\(year)")
        } else {
            throw NSError(domain: "ValidationError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid expiry date format"])
        }
        cardParams.cvc = cvc

        // Create billing details
        let billingDetails = STPPaymentMethodBillingDetails()
        billingDetails.name = cardholderName.trimmingCharacters(in: .whitespacesAndNewlines)

        // Create payment method parameters
        let paymentMethodParams = STPPaymentMethodParams(
            card: cardParams,
            billingDetails: billingDetails,
            metadata: nil
        )

        // Create payment method with Stripe
        return try await withCheckedThrowingContinuation { continuation in
            STPAPIClient.shared.createPaymentMethod(with: paymentMethodParams) { paymentMethod, error in
                if let error = error {
                    print("❌ Stripe payment method creation failed: \(error.localizedDescription)")
                    let nsError = error as NSError
                    print("   Error domain: \(nsError.domain)")
                    print("   Error code: \(nsError.code)")
                    print("   Error userInfo: \(nsError.userInfo)")
                    continuation.resume(throwing: error)
                } else if let paymentMethod = paymentMethod {
                    print("✅ Stripe payment method created: \(paymentMethod.stripeId)")
                    continuation.resume(returning: paymentMethod.stripeId)
                } else {
                    let unknownError = NSError(domain: "StripeError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Unknown error creating payment method"])
                    print("❌ Unknown error creating payment method")
                    continuation.resume(throwing: unknownError)
                }
            }
        }
    }
}

// MARK: - Payment Field View
struct PaymentFieldView: View {
    let title: String
    @Binding var text: String
    let placeholder: String
    let errorMessage: String?
    let keyboardType: UIKeyboardType
    let isRequired: Bool
    let formatter: ((String) -> String)?
    let onValidate: ((String) -> Void)?
    
    @FocusState private var isFocused: Bool
    
    init(
        title: String,
        text: Binding<String>,
        placeholder: String,
        errorMessage: String? = nil,
        keyboardType: UIKeyboardType = .default,
        isRequired: Bool = false,
        formatter: ((String) -> String)? = nil,
        onValidate: ((String) -> Void)? = nil
    ) {
        self.title = title
        self._text = text
        self.placeholder = placeholder
        self.errorMessage = errorMessage
        self.keyboardType = keyboardType
        self.isRequired = isRequired
        self.formatter = formatter
        self.onValidate = onValidate
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Title
            HStack {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(LunaraColors.charcoalGray)
                
                if isRequired {
                    Text("*")
                        .foregroundColor(.red)
                }
                
                Spacer()
            }
            
            // Input Field
            TextField(placeholder, text: $text)
                .keyboardType(keyboardType)
                .autocapitalization(.none)
                .disableAutocorrection(true)
                .padding(12)
                .background(
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.white)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(
                                    errorMessage != nil ? .red :
                                    isFocused ? LunaraColors.warmGold :
                                    LunaraColors.coolLightGray,
                                    lineWidth: isFocused ? 2 : 1
                                )
                        )
                )
                .focused($isFocused)
                .onChange(of: text) { _, newValue in
                    if let formatter = formatter {
                        let formatted = formatter(newValue)
                        if formatted != newValue {
                            text = formatted
                        }
                    }
                    onValidate?(text)
                }
            
            // Error Message
            if let errorMessage = errorMessage {
                HStack {
                    Image(systemName: "exclamationmark.circle.fill")
                        .foregroundColor(.red)
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.red)
                    Spacer()
                }
            }
        }
    }
}

// MARK: - Supporting Models
struct SubscriptionCustomerInfo {
    let name: String
    let email: String
    let phone: String
    let billingAddress: PaymentBillingAddress
}

struct PaymentBillingAddress: Codable {
    let line1: String
    let line2: String?
    let city: String
    let state: String
    let postalCode: String
    let country: String
}

struct SubscriptionPaymentIntentRequest: Codable {
    let stripePriceId: String
    let customerName: String
    let customerEmail: String
    let customerPhone: String
    let billingAddress: PaymentBillingAddress
}

// MARK: - Preview
#Preview {
    CustomPaymentForm(
        cardNumber: .constant(""),
        expiryDate: .constant(""),
        cvc: .constant(""),
        cardholderName: .constant(""),
        isValid: .constant(false),
        selectedPlan: SubscriptionPlanResponse(
            id: "price_1",
            productId: "prod_1",
            name: "Professional",
            displayName: "Professional Plan",
            description: "For growing businesses",
            priceInCents: 4999,
            currency: "USD",
            interval: "month",
            intervalCount: 1,
            formattedPrice: "$49.99",
            formattedPriceWithInterval: "$49.99/month",
            isYearly: false,
            isMonthly: true,
            recommended: true,
            savings: nil,
            features: [],
            createdAt: "2025-07-16T00:00:00Z",
            hasFreeTrial: false,
            trialDays: nil,
            trialDescription: nil
        ),
        customerInfo: SubscriptionCustomerInfo(
            name: "John Doe",
            email: "john@example.com",
            phone: "+1234567890",
            billingAddress: PaymentBillingAddress(
                line1: "123 Main St",
                line2: nil,
                city: "New York",
                state: "NY",
                postalCode: "10001",
                country: "US"
            )
        ),
        countryCode: "US",
        onPaymentMethodCreated: { _ in },
        onError: { _ in }
    )
    .padding()
}
