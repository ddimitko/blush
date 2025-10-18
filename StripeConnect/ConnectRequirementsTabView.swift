//
//  ConnectRequirementsTabView.swift
//  LunaraApp
//
//  Created by Lunara Team on 29/07/2025.
//

import SwiftUI

/// Requirements tab for Stripe Connect management
struct ConnectRequirementsTabView: View {
    // MARK: - Properties
    let shop: Shop
    @ObservedObject var stripeService: StripeConnectService
    let onTabSwitch: ((AdvancedStripeConnectManagementView.ConnectTab) -> Void)?
    
    // MARK: - State
    @State private var isLoading = false
    @State private var requirements: StripeConnectRequirementsResponse?
    @State private var showingError = false
    @State private var errorMessage: String?
    
    var body: some View {
        VStack(spacing: 24) {
            if isLoading {
                loadingView
            } else if let requirements = requirements {
                // Requirements Overview
                requirementsOverviewCard(requirements)
                
                // Currently Due
                if !requirements.currentlyDue.isEmpty {
                    currentlyDueCard(requirements)
                }
                
                // Eventually Due
                if !requirements.eventuallyDue.isEmpty {
                    eventuallyDueCard(requirements)
                }
                
                // Past Due (Critical)
                if !requirements.pastDue.isEmpty {
                    pastDueCard(requirements)
                }
                
                // Pending Verification
                if !requirements.pendingVerification.isEmpty {
                    pendingVerificationCard(requirements)
                }
                
                // Errors
                if let errors = requirements.errors, !errors.isEmpty {
                    errorsCard(errors)
                }
                
                // Actions
                actionsCard(requirements)
            } else if let account = stripeService.connectAccount, account.onboardingCompleted {
                noRequirementsView
            } else {
                setupRequiredView
            }
        }
        .onAppear {
            loadRequirements()
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage ?? "An error occurred")
        }
    }
    
    // MARK: - Requirements Overview Card
    private func requirementsOverviewCard(_ requirements: StripeConnectRequirementsResponse) -> some View {
        VStack(spacing: 16) {
            HStack {
                Text("Requirements Overview")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
                
                Button("Refresh") {
                    loadRequirements()
                }
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
                .disabled(isLoading)
            }
            
            HStack(spacing: 20) {
                overviewItem(
                    title: "Currently Due",
                    count: requirements.currentlyDue.count,
                    color: requirements.currentlyDue.isEmpty ? LunaraColors.success : LunaraColors.error
                )
                
                Divider()
                    .frame(height: 40)
                
                overviewItem(
                    title: "Eventually Due",
                    count: requirements.eventuallyDue.count,
                    color: requirements.eventuallyDue.isEmpty ? LunaraColors.success : LunaraColors.warning
                )
                
                Divider()
                    .frame(height: 40)
                
                overviewItem(
                    title: "Past Due",
                    count: requirements.pastDue.count,
                    color: requirements.pastDue.isEmpty ? LunaraColors.success : LunaraColors.error
                )
            }
            
            if let disabledReason = requirements.disabledReason {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(LunaraColors.error)
                    
                    Text("Account Disabled: \(disabledReason)")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.error)
                    
                    Spacer()
                }
                .padding(12)
                .background(LunaraColors.error.opacity(0.1))
                .cornerRadius(8)
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Currently Due Card
    private func currentlyDueCard(_ requirements: StripeConnectRequirementsResponse) -> some View {
        VStack(spacing: 16) {
            HStack {
                Image(systemName: "exclamationmark.circle.fill")
                    .foregroundColor(LunaraColors.error)
                
                Text("Action Required")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
            }
            
            Text("These requirements must be completed to continue processing payments.")
                .font(.system(size: 14))
                .foregroundColor(LunaraColors.secondaryText)
                .frame(maxWidth: .infinity, alignment: .leading)
            
            VStack(spacing: 8) {
                ForEach(requirements.currentlyDue, id: \.self) { requirement in
                    requirementRow(requirement: requirement, priority: .high)
                }
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(LunaraColors.error.opacity(0.3), lineWidth: 2)
        )
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Eventually Due Card
    private func eventuallyDueCard(_ requirements: StripeConnectRequirementsResponse) -> some View {
        VStack(spacing: 16) {
            HStack {
                Image(systemName: "clock.circle.fill")
                    .foregroundColor(LunaraColors.warning)
                
                Text("Future Requirements")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
            }
            
            Text("These requirements will be needed in the future to maintain account functionality.")
                .font(.system(size: 14))
                .foregroundColor(LunaraColors.secondaryText)
                .frame(maxWidth: .infinity, alignment: .leading)
            
            VStack(spacing: 8) {
                ForEach(requirements.eventuallyDue, id: \.self) { requirement in
                    requirementRow(requirement: requirement, priority: .medium)
                }
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(LunaraColors.warning.opacity(0.3), lineWidth: 1)
        )
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Past Due Card
    private func pastDueCard(_ requirements: StripeConnectRequirementsResponse) -> some View {
        VStack(spacing: 16) {
            HStack {
                Image(systemName: "xmark.circle.fill")
                    .foregroundColor(LunaraColors.error)
                
                Text("Overdue Requirements")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.error)
                
                Spacer()
            }
            
            Text("These requirements are overdue and may affect your account's functionality.")
                .font(.system(size: 14))
                .foregroundColor(LunaraColors.error)
                .frame(maxWidth: .infinity, alignment: .leading)
            
            VStack(spacing: 8) {
                ForEach(requirements.pastDue, id: \.self) { requirement in
                    requirementRow(requirement: requirement, priority: .critical)
                }
            }
        }
        .padding(16)
        .background(LunaraColors.error.opacity(0.05))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(LunaraColors.error, lineWidth: 2)
        )
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Pending Verification Card
    private func pendingVerificationCard(_ requirements: StripeConnectRequirementsResponse) -> some View {
        VStack(spacing: 16) {
            HStack {
                Image(systemName: "hourglass.circle.fill")
                    .foregroundColor(LunaraColors.warning)
                
                Text("Pending Verification")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
            }
            
            Text("These items are currently being reviewed by Stripe.")
                .font(.system(size: 14))
                .foregroundColor(LunaraColors.secondaryText)
                .frame(maxWidth: .infinity, alignment: .leading)
            
            VStack(spacing: 8) {
                ForEach(requirements.pendingVerification, id: \.self) { requirement in
                    requirementRow(requirement: requirement, priority: .pending)
                }
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Errors Card
    private func errorsCard(_ errors: [StripeConnectRequirementsResponse.RequirementError]) -> some View {
        VStack(spacing: 16) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundColor(LunaraColors.error)
                
                Text("Verification Errors")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.error)
                
                Spacer()
            }
            
            VStack(spacing: 12) {
                ForEach(errors, id: \.requirement) { error in
                    errorRow(error: error)
                }
            }
        }
        .padding(16)
        .background(LunaraColors.error.opacity(0.05))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(LunaraColors.error, lineWidth: 1)
        )
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Actions Card
    private func actionsCard(_ requirements: StripeConnectRequirementsResponse) -> some View {
        VStack(spacing: 16) {
            HStack {
                Text("Actions")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
            }
            
            VStack(spacing: 12) {
                if !requirements.currentlyDue.isEmpty || !requirements.pastDue.isEmpty {
                    actionButton(
                        title: "Complete Requirements",
                        subtitle: "Provide missing information",
                        icon: "checkmark.circle.fill",
                        color: LunaraColors.warmGold,
                        action: completeRequirements
                    )
                }
                
                actionButton(
                    title: "Contact Support",
                    subtitle: "Get help with requirements",
                    icon: "questionmark.circle.fill",
                    color: LunaraColors.secondaryText,
                    action: contactSupport
                )
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - No Requirements View
    private var noRequirementsView: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 48))
                .foregroundColor(LunaraColors.success)
            
            Text("All Requirements Complete")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            Text("Your account is fully set up and ready to process payments.")
                .font(.system(size: 14))
                .foregroundColor(LunaraColors.secondaryText)
                .multilineTextAlignment(.center)
        }
        .padding(32)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Setup Required View
    private var setupRequiredView: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.badge.plus")
                .font(.system(size: 48))
                .foregroundColor(LunaraColors.warning)
            
            Text("Account Setup Required")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            Text("Complete your Stripe Connect account setup to view requirements.")
                .font(.system(size: 14))
                .foregroundColor(LunaraColors.secondaryText)
                .multilineTextAlignment(.center)
            
            Button("Complete Setup") {
                onTabSwitch?(.onboarding)
            }
            .font(.system(size: 16, weight: .medium))
            .foregroundColor(LunaraColors.white)
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .background(LunaraColors.warmGold)
            .cornerRadius(8)
        }
        .padding(32)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
                .tint(LunaraColors.warmGold)
            
            Text("Loading requirements...")
                .font(.system(size: 16))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.top, 100)
    }
    
    // MARK: - Helper Views
    private func overviewItem(title: String, count: Int, color: Color) -> some View {
        VStack(spacing: 4) {
            Text("\(count)")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(color)
            
            Text(title)
                .font(.system(size: 12))
                .foregroundColor(LunaraColors.secondaryText)
                .multilineTextAlignment(.center)
        }
    }
    
    private func requirementRow(requirement: String, priority: RequirementPriority) -> some View {
        HStack {
            Image(systemName: priority.icon)
                .foregroundColor(priority.color)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(getRequirementLabel(requirement))
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text(getRequirementDescription(requirement))
                    .font(.system(size: 12))
                    .foregroundColor(LunaraColors.secondaryText)
            }
            
            Spacer()
            
            Text(priority.rawValue)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(priority.color)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(priority.color.opacity(0.1))
                .cornerRadius(4)
        }
        .padding(8)
        .background(LunaraColors.coolLightGray.opacity(0.3))
        .cornerRadius(6)
    }
    
    private func errorRow(error: StripeConnectRequirementsResponse.RequirementError) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(getRequirementLabel(error.requirement))
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(LunaraColors.error)
            
            Text(error.reason)
                .font(.system(size: 12))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(8)
        .background(LunaraColors.error.opacity(0.1))
        .cornerRadius(6)
    }
    
    private func actionButton(title: String, subtitle: String, icon: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    Text(subtitle)
                        .font(.system(size: 12))
                        .foregroundColor(LunaraColors.secondaryText)
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .foregroundColor(LunaraColors.secondaryText)
            }
            .padding(12)
            .background(LunaraColors.coolLightGray.opacity(0.3))
            .cornerRadius(8)
        }
    }
    
    // MARK: - Helper Types
    enum RequirementPriority: String {
        case critical = "Critical"
        case high = "High"
        case medium = "Medium"
        case pending = "Pending"
        
        var color: Color {
            switch self {
            case .critical, .high: return LunaraColors.error
            case .medium: return LunaraColors.warning
            case .pending: return LunaraColors.secondaryText
            }
        }
        
        var icon: String {
            switch self {
            case .critical: return "exclamationmark.triangle.fill"
            case .high: return "exclamationmark.circle.fill"
            case .medium: return "clock.circle.fill"
            case .pending: return "hourglass.circle.fill"
            }
        }
    }
    
    // MARK: - Helper Methods
    private func loadRequirements() {
        guard stripeService.connectAccount != nil else { return }
        
        isLoading = true
        
        Task {
            do {
                let response = try await stripeService.getAccountRequirements(shopId: shop.id)
                await MainActor.run {
                    requirements = response
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = "Failed to load requirements: \(error.localizedDescription)"
                    showingError = true
                }
            }
        }
    }
    
    private func getRequirementLabel(_ requirement: String) -> String {
        // Convert API requirement names to user-friendly labels
        switch requirement {
        case "individual.first_name": return "First Name"
        case "individual.last_name": return "Last Name"
        case "individual.dob.day": return "Date of Birth (Day)"
        case "individual.dob.month": return "Date of Birth (Month)"
        case "individual.dob.year": return "Date of Birth (Year)"
        case "individual.address.line1": return "Address Line 1"
        case "individual.address.city": return "City"
        case "individual.address.postal_code": return "Postal Code"
        case "individual.id_number": return "ID Number"
        case "individual.verification.document": return "Identity Document"
        case "business_profile.url": return "Business Website"
        case "external_account": return "Bank Account"
        case "tos_acceptance.date": return "Terms of Service"
        default: return requirement.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }
    
    private func getRequirementDescription(_ requirement: String) -> String {
        switch requirement {
        case "individual.verification.document": return "Upload a government-issued ID"
        case "external_account": return "Add a bank account for payouts"
        case "tos_acceptance.date": return "Accept Stripe's terms of service"
        case "business_profile.url": return "Provide your business website URL"
        default: return "Required for account verification"
        }
    }
    
    private func completeRequirements() {
        onTabSwitch?(.onboarding)
    }
    
    private func contactSupport() {
        // Open support contact options
        print("Contact support tapped")
    }
}

#Preview {
    ConnectRequirementsTabView(
        shop: Shop.preview,
        stripeService: StripeConnectService.shared,
        onTabSwitch: nil
    )
}
