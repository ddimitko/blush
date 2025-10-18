//
//  ShopCreationView.swift
//  LunaraApp
//
//  Created by Lunara Team on 16/07/2025.
//

import SwiftUI
import Foundation
import Alamofire
@preconcurrency import StripePayments

/// Shop creation wizard for new business owners
struct ShopCreationView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var authService: AuthenticationService
    @EnvironmentObject var appState: AppState
    @StateObject private var shopService = ShopService.shared
    @StateObject private var formPersistence = FormPersistenceService.shared
    private let apiClient = APIClient.shared
    private let performanceMonitor = PerformanceMonitor.shared

    @State private var formData = ShopCreationFormData()
    @State private var isSubmitting = false
    @State private var showingError = false
    @State private var errorMessage = ""
    @State private var currentStep = 1
    @State private var selectedPlan: SubscriptionPlanResponse?
    @State private var isLoadingPlans = false
    @State private var availablePlans: [SubscriptionPlanResponse] = []
    @State private var isProcessingPayment = false
    @State private var paymentIntentClientSecret: String?
    @State private var forceUIUpdate = false
    @State private var hasScrolledToEnd = false
    @State private var showingSuccessAnimation = false
    @State private var isStep2ValidationValid = false
    @State private var showingFormRecovery = false

    private let totalSteps = 5

    // Callback for successful shop creation
    let onShopCreated: (() -> Void)?

    // MARK: - Initializer
    init(onShopCreated: (() -> Void)? = nil) {
        self.onShopCreated = onShopCreated
    }

    var body: some View {
        Group {
            // Check authentication first
            if !authService.isAuthenticated {
                authenticationRequiredView
            } else {
                shopCreationContent
            }
        }
        .onAppear {
            // Only initialize if authenticated
            if authService.isAuthenticated {
                checkForPersistedData()
                initializeFormData()
                loadSubscriptionPlans()
            }
        }
        .sheet(isPresented: $showingFormRecovery) {
            if let persistedData = formPersistence.loadFormData() {
                FormDataRecoveryView(
                    persistedData: persistedData,
                    onRestore: { data in
                        formData = data
                        updateStep2Validation()
                    },
                    onDiscard: {
                        formPersistence.clearPersistedData()
                    }
                )
            }
        }
        .onChange(of: hasScrolledToEnd) { _, _ in
            // Only update for scroll state changes, not form field changes
            forceUIUpdate.toggle()
        }
        .onChange(of: formData.name) { _, _ in
            updateStep2Validation()
            scheduleFormPersistence()
        }
        .onChange(of: formData.description) { _, _ in
            updateStep2Validation()
            scheduleFormPersistence()
        }
        .onChange(of: formData.address) { _, _ in
            updateStep2Validation()
            scheduleFormPersistence()
        }
        .onChange(of: formData.city) { _, _ in
            updateStep2Validation()
            scheduleFormPersistence()
        }
        .onChange(of: formData.country) { _, _ in
            updateStep2Validation()
            scheduleFormPersistence()
        }
        .onChange(of: formData.state) { _, _ in
            updateStep2Validation()
            scheduleFormPersistence()
        }
        .onChange(of: formData.postalCode) { _, _ in
            updateStep2Validation()
            scheduleFormPersistence()
        }
        .onChange(of: formData.phone) { _, _ in
            updateStep2Validation()
            scheduleFormPersistence()
        }
        .onChange(of: formData.email) { _, _ in
            updateStep2Validation()
            scheduleFormPersistence()
        }
        .onChange(of: formData.businessTypes) { _, _ in
            updateStep2Validation()
            scheduleFormPersistence()
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage)
        }
    }

    // MARK: - Authentication Required View
    private var authenticationRequiredView: some View {
        NavigationView {
            VStack(spacing: 32) {
                Spacer()

                // Icon
                Image(systemName: "person.crop.circle.badge.exclamationmark")
                    .font(.system(size: 64))
                    .foregroundColor(LunaraColors.warmGold)

                // Content
                VStack(spacing: 16) {
                    Text("Authentication Required")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(LunaraColors.charcoalGray)

                    Text("You need to be signed in to create a shop. Please log in or create an account to continue.")
                        .font(.body)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                }

                // Action Buttons
                VStack(spacing: 12) {
                    Button("Sign In") {
                        authService.isGuestMode = false
                        dismiss()
                    }
                    .buttonStyle(LunaraButtonStyle())

                    Button("Create Account") {
                        authService.isGuestMode = false
                        dismiss()
                    }
                    .buttonStyle(LunaraSecondaryButtonStyle())
                }
                .padding(.horizontal, 32)

                Spacer()
            }
            .navigationTitle("Create Shop")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.charcoalGray)
                }
            }
        }
    }

    // MARK: - Shop Creation Content
    private var shopCreationContent: some View {
        ZStack {
            NavigationView {
                VStack(spacing: 0) {
                    // Progress Header
                    progressHeader

                    // Step Content
                    ScrollView {
                        VStack(spacing: 24) {
                            stepContent
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 24)
                    }

                    // Navigation Footer
                    navigationFooter
                }
                .navigationTitle("Create Shop")
                .navigationBarTitleDisplayMode(.inline)
                .navigationBarBackButtonHidden(true)
                .toolbar {
                    ToolbarItem(placement: .navigationBarLeading) {
                        Button("Cancel") {
                            dismiss()
                        }
                        .foregroundColor(LunaraColors.charcoalGray)
                    }
                }
            }
            .opacity(showingSuccessAnimation ? 0 : 1)

            // Success Animation Overlay
            if showingSuccessAnimation {
                ShopCreationAnimatedSuccessView(
                    shopName: formData.name,
                    onComplete: {
                        onShopCreated?()
                        appState.switchToTab(.dashboard)
                        dismiss()
                    }
                )
                .transition(.opacity)
                .zIndex(1)
            }
        }
    }
    
    // MARK: - Progress Header
    private var progressHeader: some View {
        VStack(spacing: 12) {
            // Progress Bar
            HStack(spacing: 4) {
                ForEach(1...totalSteps, id: \.self) { step in
                    Rectangle()
                        .fill(step <= currentStep ? LunaraColors.warmGold : LunaraColors.coolLightGray)
                        .frame(height: 4)
                        .animation(.easeInOut(duration: 0.3), value: currentStep)
                }
            }
            .padding(.horizontal, 20)
            
            // Step Info
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Step \(currentStep) of \(totalSteps)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Text(stepTitle)
                        .font(.headline)
                        .foregroundColor(LunaraColors.charcoalGray)
                }
                
                Spacer()
            }
            .padding(.horizontal, 20)
        }
        .padding(.vertical, 16)
        .background(Color.white)
        .shadow(color: .black.opacity(0.05), radius: 1, x: 0, y: 1)
    }
    
    // MARK: - Step Content
    @ViewBuilder
    private var stepContent: some View {
        switch currentStep {
        case 1:
            TermsStepView(
                hasScrolledToEnd: $hasScrolledToEnd,
                errorMessage: formData.errors["terms"]
            )
        case 2:
            BusinessDetailsStepView(
                formData: $formData
            )
        case 3:
            SubscriptionPlanStepView(
                selectedPlan: $formData.selectedPlan,
                availablePlans: availablePlans,
                isLoading: isLoadingPlans,
                countryCode: formData.country,
                onRetry: loadSubscriptionPlans
            )
        case 4:
            SummaryStepView(
                formData: formData,
                selectedPlan: formData.selectedPlan
            )
        case 5:
            SetupIntentPaymentStepView(
                formData: $formData,
                selectedPlan: formData.selectedPlan,
                isProcessing: isProcessingPayment,
                onPaymentSuccess: { confirmedSetupIntentId in
                    // Use the already confirmed setup intent
                    createShopWithConfirmedSetupIntent(confirmedSetupIntentId)
                }
            )
        default:
            EmptyView()
        }
    }
    
    // MARK: - Navigation Footer
    private var navigationFooter: some View {
        VStack(spacing: 0) {
            Divider()
            
            HStack(spacing: 16) {
                // Back Button
                if currentStep > 1 {
                    Button("Back") {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            currentStep -= 1
                        }
                    }
                    .buttonStyle(LunaraSecondaryButtonStyle(isDisabled: isSubmitting || isProcessingPayment))
                    .disabled(isSubmitting || isProcessingPayment)
                }
                
                Spacer()
                
                // Next/Submit Button
                Button(nextButtonTitle) {
                    handleNextStep()
                }
                .buttonStyle(LunaraButtonStyle(isDisabled: !canProceedToNextStep || isSubmitting || isProcessingPayment))
                .disabled(!canProceedToNextStep || isSubmitting || isProcessingPayment)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
        .background(Color.white)
    }
    
    // MARK: - Computed Properties
    private var stepTitle: String {
        switch currentStep {
        case 1: return "Terms & Conditions"
        case 2: return "Business Details"
        case 3: return "Subscription Plan"
        case 4: return "Summary"
        case 5: return "Payment"
        default: return ""
        }
    }
    
    private var nextButtonTitle: String {
        if isSubmitting {
            return "Creating Shop..."
        } else if isProcessingPayment {
            return "Processing Payment..."
        } else if currentStep == 4 {
            return "Proceed to Payment"
        } else if currentStep == totalSteps {
            return "Complete Setup"
        } else {
            return "Continue"
        }
    }

    private var canProceedToNextStep: Bool {
        switch currentStep {
        case 1: return hasScrolledToEnd
        case 2: return isStep2ValidationValid
        case 3: return formData.isStep3Valid // Subscription plan selection
        case 4: return true // Summary step
        case 5: return true // Payment step handles its own validation
        default: return false
        }
    }
    
    // MARK: - Helper Methods
    private func checkForPersistedData() {
        if formPersistence.hasPersistedData && formPersistence.isPersistedDataRecent() {
            showingFormRecovery = true
        }
    }

    private func scheduleFormPersistence() {
        formPersistence.scheduleAutoSave(formData)
    }

    private func initializeFormData() {
        performanceMonitor.startMeasuring("initializeFormData")
        defer { performanceMonitor.endMeasuring("initializeFormData") }

        if let user = authService.user {
            formData.email = user.email
            formData.customerEmail = user.email
            formData.customerName = "\(user.firstName) \(user.lastName)".trimmingCharacters(in: .whitespacesAndNewlines)
            formData.customerPhone = user.phone ?? ""
            formData.phone = user.phone ?? ""
        }

        // Initial validation
        updateStep2Validation()
    }

    private func updateStep2Validation() {
        // Simple validation without complex computed properties
        let nameValid = !formData.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        let descValid = !formData.description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        let addressValid = !formData.address.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        let cityValid = !formData.city.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        let countryValid = !formData.country.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        let phoneValid = !formData.phone.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        let emailValid = !formData.email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        let typesValid = !formData.businessTypes.isEmpty

        // Country-specific validation
        let countryValidation = CountryValidationService.shared
        let stateRequired = countryValidation.isStateRequired(for: formData.country)
        let stateValid = !stateRequired || !formData.state.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty

        let postalRequired = countryValidation.isPostalCodeRequired(for: formData.country)
        let postalValid = !postalRequired || !formData.postalCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty

        // Basic format validation - simplified for now
        let emailFormatValid = formData.email.contains("@")
        let phoneFormatValid = formData.phone.count >= 10

        // Update state
        isStep2ValidationValid = nameValid && descValid && addressValid && cityValid &&
                                countryValid && phoneValid && emailValid && typesValid &&
                                stateValid && postalValid && emailFormatValid && phoneFormatValid


    }
    
    private func loadSubscriptionPlans() {
        isLoadingPlans = true

        Task {
            do {
                let plans = try await performanceMonitor.measureAsync("loadSubscriptionPlans") {
                    try await shopService.getSubscriptionPlans()
                }
                await MainActor.run {
                    self.availablePlans = plans
                    self.isLoadingPlans = false
                }
            } catch {
                await MainActor.run {
                    self.isLoadingPlans = false
                    self.showError("Failed to load subscription plans: \(error.localizedDescription)")
                }
            }
        }
    }
    
    private func handleNextStep() {
        // Validate current step
        if !validateCurrentStep() {
            return
        }

        if currentStep < totalSteps {
            withAnimation(.easeInOut(duration: 0.3)) {
                currentStep += 1
            }
        }
        // Note: Step 4 (Review & Payment) handles shop creation internally
    }
    
    private func validateCurrentStep() -> Bool {
        formData.errors.removeAll()

        switch currentStep {
        case 1:
            if !hasScrolledToEnd {
                formData.errors["terms"] = "Please read the complete terms and conditions and privacy policy"
                return false
            }
        case 2:
            return validateBusinessDetails()
        case 3: // Subscription plan selection
            if formData.selectedPlan == nil {
                showError("Please select a subscription plan")
                return false
            }
        case 4: // Summary step
            return true
        case 5: // Payment step - validation handled in the step itself
            return true
        default:
            break
        }

        return true
    }
    
    private func validateBusinessDetails() -> Bool {
        let countryValidation = CountryValidationService.shared
        var hasErrors = false

        if formData.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            formData.errors["name"] = "Business name is required"
            hasErrors = true
        }

        if formData.description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            formData.errors["description"] = "Business description is required"
            hasErrors = true
        }

        if formData.businessTypes.isEmpty {
            formData.errors["businessTypes"] = "At least one business type is required"
            hasErrors = true
        }

        if formData.address.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            formData.errors["address"] = "Address is required"
            hasErrors = true
        }

        if formData.city.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            formData.errors["city"] = "City is required"
            hasErrors = true
        }
        
        // Country-specific state validation
        if countryValidation.isStateRequired(for: formData.country) &&
           formData.state.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            formData.errors["state"] = "\(countryValidation.getStateLabel(for: formData.country)) is required"
            hasErrors = true
        }

        // Country-specific postal code validation
        if countryValidation.isPostalCodeRequired(for: formData.country) {
            if formData.postalCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                formData.errors["postalCode"] = "\(countryValidation.getPostalCodeLabel(for: formData.country)) is required"
                hasErrors = true
            } else if !formData.isValidPostalCode(formData.postalCode) {
                formData.errors["postalCode"] = "Invalid \(countryValidation.getPostalCodeLabel(for: formData.country).lowercased()) format"
                hasErrors = true
            }
        }

        // Phone validation
        if formData.phone.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            formData.errors["phone"] = "Phone number is required"
            hasErrors = true
        } else if !formData.isValidPhone(formData.phone) {
            formData.errors["phone"] = "Invalid phone number format for \(countryValidation.getConfig(for: formData.country)?.name ?? formData.country)"
            hasErrors = true
        }

        // Email validation
        if formData.email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            formData.errors["email"] = "Email is required"
            hasErrors = true
        } else if !formData.isValidEmail(formData.email) {
            formData.errors["email"] = "Invalid email format"
            hasErrors = true
        }
        
        return !hasErrors
    }
    
    private func validatePaymentDetails() -> Bool {
        var hasErrors = false
        
        if formData.customerName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            formData.errors["customerName"] = "Customer name is required"
            hasErrors = true
        }
        
        if formData.customerEmail.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            formData.errors["customerEmail"] = "Customer email is required"
            hasErrors = true
        } else if !formData.isValidEmail(formData.customerEmail) {
            formData.errors["customerEmail"] = "Invalid email format"
            hasErrors = true
        }
        
        if formData.customerPhone.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            formData.errors["customerPhone"] = "Customer phone is required"
            hasErrors = true
        } else if !formData.isValidPhone(formData.customerPhone) {
            formData.errors["customerPhone"] = "Invalid phone number format"
            hasErrors = true
        }
        
        if formData.billingAddressLine1.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            formData.errors["billingAddressLine1"] = "Billing address is required"
            hasErrors = true
        }
        
        if formData.billingCity.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            formData.errors["billingCity"] = "Billing city is required"
            hasErrors = true
        }
        
        if formData.billingState.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            formData.errors["billingState"] = "Billing state is required"
            hasErrors = true
        }
        
        if formData.billingPostalCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            formData.errors["billingPostalCode"] = "Billing postal code is required"
            hasErrors = true
        }
        
        return !hasErrors
    }
    
    private func handlePaymentSuccess(paymentMethodId: String) {
        print("🎉 Payment successful! Payment Method ID: \(paymentMethodId)")
        print("🏪 Creating shop with subscription using proper Setup Intent flow...")

        // Use the proper Setup Intent flow like the web app
        createShopWithSetupIntentFlow()
    }

    private func createShopWithConfirmedSetupIntent(_ confirmedSetupIntentId: String) {
        isSubmitting = true

        Task {
            do {
                print("🏗️ Creating shop with already confirmed setup intent: \(confirmedSetupIntentId)")

                let shopRequest = formData.toShopCreationRequest()
                let confirmRequest = ConfirmSetupAndCreateShopRequest(
                    setupIntentId: confirmedSetupIntentId,
                    shopData: shopRequest
                )

                let shopResponse = try await apiClient.confirmSetupAndCreateShop(confirmRequest)
                print("✅ Shop and subscription created successfully! Shop ID: \(shopResponse.shopId)")

                await MainActor.run {
                    print("🎊 Shop creation process completed successfully!")
                    print("🧹 Clearing persisted form data...")

                    self.isSubmitting = false
                    self.showingSuccessAnimation = true

                    // Clear persisted form data on successful creation
                    self.formPersistence.clearPersistedData()

                    // Auto-redirect to dashboard after 4 seconds
                    DispatchQueue.main.asyncAfter(deadline: .now() + 4.0) {
                        print("🔄 Refreshing authentication token...")
                        // Refresh token to get updated OWNER role before navigating
                        Task {
                            await self.authService.forceTokenRefresh()
                            await MainActor.run {
                                print("🏠 Navigating to dashboard...")
                                self.onShopCreated?()
                                self.appState.switchToTab(.dashboard)
                                self.dismiss()
                            }
                        }
                    }
                }
            } catch {
                await MainActor.run {
                    print("❌ Shop creation failed with error: \(error)")

                    // Handle different types of errors
                    var errorMessage = "Failed to create shop with subscription"

                    if let afError = error as? AFError {
                        switch afError {
                        case .responseSerializationFailed(let reason):
                            switch reason {
                            case .inputDataNilOrZeroLength:
                                errorMessage = "Server returned empty response. Please try again or contact support."
                            default:
                                errorMessage = "Network error occurred. Please check your connection and try again."
                            }
                        default:
                            errorMessage = "Network error: \(afError.localizedDescription)"
                        }
                    } else if let apiError = error as? APIError {
                        errorMessage = "API error: \(apiError.localizedDescription)"
                    } else {
                        errorMessage = "Unexpected error: \(error.localizedDescription)"
                    }

                    self.isSubmitting = false
                    self.showError(errorMessage)
                }
            }
        }
    }

    // Keep the old method for backward compatibility (if needed elsewhere)
    private func createShopWithSetupIntentFlow() {
        isSubmitting = true

        Task {
            do {
                // Step 1: Create setup intent (matching web app flow)
                print("🔧 Creating setup intent for shop creation...")

                guard let selectedPlan = formData.selectedPlan else {
                    throw APIError.validationError("No subscription plan selected")
                }

                let setupRequest = ShopCreationSetupRequest(
                    stripePriceId: selectedPlan.id,
                    customerName: formData.customerName,
                    customerEmail: formData.customerEmail,
                    customerPhone: formData.customerPhone.isEmpty ? nil : formData.customerPhone,
                    billingAddressLine1: formData.address,
                    billingAddressLine2: nil,
                    billingCity: formData.city,
                    billingState: formData.state,
                    billingPostalCode: formData.postalCode,
                    billingCountry: formData.country
                )

                let setupResponse = try await apiClient.createShopCreationSetupIntent(setupRequest)
                print("✅ Setup intent created: \(setupResponse.setupIntentId)")
                print("💳 Client secret: \(setupResponse.clientSecret)")
                print("👤 Customer ID: \(setupResponse.customerId ?? "none")")

                // Step 2: Present Stripe Setup Intent confirmation (like web app)
                print("🔐 Confirming setup intent with Stripe...")
                let confirmedSetupIntentId = try await confirmSetupIntentWithStripe(
                    clientSecret: setupResponse.clientSecret,
                    setupIntentId: setupResponse.setupIntentId
                )

                // Step 3: Create shop with confirmed setup intent
                createShopWithConfirmedSetupIntent(confirmedSetupIntentId)
            } catch {
                await MainActor.run {
                    print("❌ Setup intent creation failed with error: \(error)")
                    self.isSubmitting = false
                    self.showError("Failed to create setup intent: \(error.localizedDescription)")
                }
            }
        }
    }
    
    private func showError(_ message: String) {
        errorMessage = message
        showingError = true
    }

    // MARK: - Setup Intent Confirmation

    @MainActor
    private func confirmSetupIntentWithStripe(clientSecret: String, setupIntentId: String) async throws -> String {
        print("🔐 Confirming setup intent with Stripe using client secret...")

        // Import Stripe at the top of the file
        return try await withCheckedThrowingContinuation { continuation in
            // Use Stripe's confirmSetupIntent method
            let setupIntentParams = STPSetupIntentConfirmParams(clientSecret: clientSecret)

            STPAPIClient.shared.confirmSetupIntent(
                with: setupIntentParams,
                completion: { setupIntent, error in
                    if let error = error {
                        print("❌ Setup intent confirmation failed: \(error.localizedDescription)")
                        continuation.resume(throwing: error)
                        return
                    }

                    guard let setupIntent = setupIntent else {
                        print("❌ Setup intent confirmation returned nil")
                        continuation.resume(throwing: APIError.clientError("Setup intent confirmation failed"))
                        return
                    }

                    print("✅ Setup intent confirmed successfully")
                    print("   Status: \(setupIntent.status.rawValue)")
                    print("   Setup Intent ID: \(setupIntent.stripeID)")

                    if setupIntent.status == .succeeded {
                        continuation.resume(returning: setupIntent.stripeID)
                    } else {
                        print("❌ Setup intent not succeeded: \(setupIntent.status.rawValue)")
                        continuation.resume(throwing: APIError.clientError("Setup intent was not completed successfully"))
                    }
                }
            )
        }
    }
}

// MARK: - Preview
#Preview {
    ShopCreationView(onShopCreated: {
        print("Shop created in preview")
    })
    .environmentObject(AuthenticationService.shared)
}
