//
//  EmployeeSelectionView.swift
//  LunaraApp
//
//  Created by Lunara Team on 23/07/2025.
//

import SwiftUI

/// Enhanced view for selecting an employee during the booking flow with self-booking prevention
struct EmployeeSelectionView: View {
    // MARK: - Properties
    let shop: Shop
    let service: Service
    let onEmployeeSelected: (Employee) -> Void

    // MARK: - Environment
    @EnvironmentObject var authService: AuthenticationService
    @EnvironmentObject var bookingState: BookingFlowState

    // MARK: - State
    @State private var employees: [Employee] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var selectedEmployee: Employee?
    @State private var showingSelfBookingAlert = false
    @State private var selfBookingAttemptedEmployee: Employee?
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            headerSection
            
            // Content
            if isLoading {
                loadingView
            } else if let errorMessage = errorMessage {
                errorView(errorMessage)
            } else if employees.isEmpty {
                emptyStateView
            } else {
                employeeListView
            }
        }
        .onAppear {
            loadEmployees()
        }
        .alert("Self-Booking Not Allowed", isPresented: $showingSelfBookingAlert) {
            Button("Switch Account") {
                // Handle account switching or logout
                Task {
                    await authService.logout()
                }
            }
            Button("Cancel", role: .cancel) {
                selfBookingAttemptedEmployee = nil
            }
        } message: {
            Text("Employees cannot book appointments for themselves. Please log out or use a different account to continue.")
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        VStack(spacing: 16) {

            
            // Title and Description
            VStack(spacing: 8) {
                Text("Choose Your Stylist")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text("Select who you'd like to perform your \(service.name)")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 16)
    }
    
    // MARK: - Employee List View
    private var employeeListView: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                // "Any Available" option - only show if there are multiple employees
                if employees.count > 1 {
                    AnyAvailableEmployeeCard(
                        isSelected: selectedEmployee?.id == "any",
                        onTap: {
                            let anyEmployee = Employee.anyAvailable
                            selectedEmployee = anyEmployee
                            onEmployeeSelected(anyEmployee)
                        }
                    )
                }

                // Individual employees
                ForEach(employees) { employee in
                    SelectableEmployeeCard(
                        employee: employee,
                        isSelected: selectedEmployee?.id == employee.id,
                        isDisabled: isEmployeeDisabled(employee),
                        disabledReason: getEmployeeDisabledReason(employee),
                        onTap: {
                            handleEmployeeSelection(employee)
                        }
                    )
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 32)
        }
    }
    
    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 16) {
            Spacer()
            
            ProgressView()
                .scaleEffect(1.2)
            
            Text("Loading available staff...")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.secondaryText)
            
            Spacer()
        }
    }
    
    // MARK: - Error View
    private func errorView(_ message: String) -> some View {
        VStack(spacing: 24) {
            Spacer()
            
            Image(systemName: "person.crop.circle.badge.exclamationmark")
                .font(.system(size: 64))
                .foregroundColor(LunaraColors.secondaryText.opacity(0.6))
            
            VStack(spacing: 12) {
                Text("Unable to Load Staff")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text(message)
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
            
            Button("Try Again") {
                loadEmployees()
            }
            .buttonStyle(PrimaryButtonStyle())
            
            Spacer()
        }
    }
    
    // MARK: - Empty State View
    private var emptyStateView: some View {
        VStack(spacing: 24) {
            Spacer()
            
            Image(systemName: "person.crop.circle")
                .font(.system(size: 64))
                .foregroundColor(LunaraColors.secondaryText.opacity(0.6))
            
            VStack(spacing: 12) {
                Text("No Staff Available")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text("No staff members are currently available to perform this service.")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
            
            Spacer()
        }
    }
    
    // MARK: - Private Methods
    
    private func loadEmployees() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                let loadedEmployees = try await APIClient.shared.getShopEmployees(shopId: shop.id)

                await MainActor.run {
                    // Filter employees who can perform this service
                    let availableEmployees = loadedEmployees.filter { employee in
                        employee.active && employee.canProvide(service: service)
                    }

                    self.employees = availableEmployees

                    // Note: Removed auto-selection logic - users must always explicitly select an employee
                    // This ensures users are aware of which employee they're booking with

                    self.isLoading = false
                }

            } catch {
                await MainActor.run {
                    self.errorMessage = "Failed to load staff: \(error.localizedDescription)"
                    self.isLoading = false
                }
            }
        }
    }

    // MARK: - Employee Validation Methods

    private func handleEmployeeSelection(_ employee: Employee) {
        // Validate employee selection
        let validationResult = bookingState.validateEmployeeSelection(employee, currentUser: authService.user)

        if validationResult.isValid {
            selectedEmployee = employee
            onEmployeeSelected(employee)
        } else {
            // Show self-booking prevention alert
            selfBookingAttemptedEmployee = employee
            showingSelfBookingAlert = true
        }
    }

    private func isEmployeeDisabled(_ employee: Employee) -> Bool {
        guard let currentUser = authService.user else { return false }
        return employee.user?.id == currentUser.id
    }

    private func getEmployeeDisabledReason(_ employee: Employee) -> String? {
        if isEmployeeDisabled(employee) {
            return "You cannot book appointments with yourself"
        }
        return nil
    }
}



// MARK: - Any Available Employee Card
struct AnyAvailableEmployeeCard: View {
    let isSelected: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 16) {
                // Icon
                Circle()
                    .fill(LunaraColors.warmGold.opacity(0.1))
                    .frame(width: 60, height: 60)
                    .overlay(
                        Image(systemName: "person.2.fill")
                            .font(.system(size: 24))
                            .foregroundColor(LunaraColors.warmGold)
                    )
                
                // Content
                VStack(alignment: .leading, spacing: 4) {
                    Text("Any Available Staff")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    Text("Let us choose the best available stylist for you")
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.leading)
                }
                
                Spacer()
                
                // Selection Indicator
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 24))
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
            .scaleEffect(isSelected ? 1.02 : 1.0)
            .animation(.easeInOut(duration: 0.2), value: isSelected)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Selectable Employee Card Component
struct SelectableEmployeeCard: View {
    let employee: Employee
    let isSelected: Bool
    let isDisabled: Bool
    let disabledReason: String?
    let onTap: () -> Void
    
    @State private var isPressed = false

    var body: some View {
        Button(action: isDisabled ? {} : {
            // Add haptic feedback
            let impact = UIImpactFeedbackGenerator(style: .light)
            impact.impactOccurred()
            onTap()
        }) {
            HStack(spacing: 16) {
                // Enhanced Employee Avatar with Status
                ZStack(alignment: .bottomTrailing) {
                    AsyncImage(url: URL(string: employee.avatar ?? "")) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Circle()
                            .fill(employeePhotoGradient)
                            .overlay(
                                Text(employee.initials)
                                    .font(.system(size: 20, weight: .semibold))
                                    .foregroundColor(.white)
                            )
                    }
                    .frame(width: 70, height: 70)
                    .clipShape(Circle())
                    .overlay(
                        Circle()
                            .stroke(isSelected ? LunaraColors.warmGold : Color.clear, lineWidth: 3)
                    )

                    // Availability Status Badge
                    if !isDisabled {
                        availabilityStatusBadge
                    }
                }
                
                // Enhanced Employee Details
                VStack(alignment: .leading, spacing: 6) {
                    // Name and Rating
                    HStack {
                        Text(employee.displayName)
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(isDisabled ? LunaraColors.secondaryText : LunaraColors.primaryText)

                        Spacer()

                        if !isDisabled {
                            employeeRatingView
                        }
                    }

                    // Specialties with enhanced styling
                    if let specialties = employee.specialties, !specialties.isEmpty {
                        Text(specialties.joined(separator: ", "))
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(LunaraColors.warmGold)
                            .lineLimit(2)
                    }

                    // Experience with icon
                    if employee.yearsExperience > 0 {
                        HStack(spacing: 4) {
                            Image(systemName: "star.circle")
                                .font(.system(size: 12))
                                .foregroundColor(LunaraColors.secondaryText)

                            Text(employee.formattedExperience)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(LunaraColors.secondaryText)
                        }
                    }

                    // Next available slot (if not disabled)
                    if !isDisabled {
                        nextAvailableSlotView
                    }

                    // Disabled reason
                    if isDisabled, let reason = disabledReason {
                        HStack(spacing: 6) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 12))
                                .foregroundColor(LunaraColors.error)

                            Text(reason)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(LunaraColors.error)
                                .multilineTextAlignment(.leading)
                        }
                        .padding(.top, 4)
                    }
                }
                
                Spacer()
                
                // Selection Indicator
                if isSelected && !isDisabled {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(LunaraColors.warmGold)
                } else if isDisabled {
                    Image(systemName: "exclamationmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(LunaraColors.error)
                }
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isDisabled ? LunaraColors.coolLightGray.opacity(0.5) : LunaraColors.white)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(
                                isDisabled ? LunaraColors.error.opacity(0.5) :
                                isSelected ? LunaraColors.warmGold : LunaraColors.coolLightGray,
                                lineWidth: (isSelected || isDisabled) ? 2 : 1
                            )
                    )
            )
            .scaleEffect(isSelected && !isDisabled ? 1.02 : isPressed ? 0.98 : 1.0)
            .opacity(isDisabled ? 0.6 : 1.0)
            .animation(.easeInOut(duration: 0.2), value: isSelected)
            .animation(.easeInOut(duration: 0.2), value: isDisabled)
            .animation(.easeInOut(duration: 0.1), value: isPressed)
        }
        .buttonStyle(PlainButtonStyle())
        .onLongPressGesture(minimumDuration: 0, maximumDistance: .infinity, pressing: { pressing in
            if !isDisabled {
                withAnimation(.easeInOut(duration: 0.1)) {
                    isPressed = pressing
                }
            }
        }, perform: {})
    }

    // MARK: - Computed Properties

    private var employeePhotoGradient: LinearGradient {
        LinearGradient(
            colors: [LunaraColors.warmGold, LunaraColors.warmGold.opacity(0.7)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    private var availabilityStatusBadge: some View {
        Circle()
            .fill(LunaraColors.success)
            .frame(width: 16, height: 16)
            .overlay(
                Circle()
                    .stroke(Color.white, lineWidth: 2)
            )
    }

    private var employeeRatingView: some View {
        HStack(spacing: 2) {
            ForEach(0..<5) { index in
                Image(systemName: index < 5 ? "star.fill" : "star")
                    .font(.system(size: 10))
                    .foregroundColor(LunaraColors.warmGold)
            }

            Text("5.0")
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(LunaraColors.secondaryText)
        }
    }

    private var nextAvailableSlotView: some View {
        HStack(spacing: 4) {
            Image(systemName: "clock")
                .font(.system(size: 10))
                .foregroundColor(LunaraColors.success)

            Text("Next: Today 2:30 PM")
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(LunaraColors.success)
        }
    }
}

// MARK: - Preview
struct EmployeeSelectionView_Previews: PreviewProvider {
    static var previews: some View {
        EmployeeSelectionView(
            shop: Shop.preview,
            service: Service.preview,
            onEmployeeSelected: { _ in }
        )
    }
}
