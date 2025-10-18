//
//  EnhancedBookingNavigation.swift
//  LunaraApp
//
//  Created by Lunara Team on 23/07/2025.
//

import SwiftUI

/// Enhanced navigation component for the booking flow with back button support and progress tracking
struct EnhancedBookingNavigation: View {
    @Binding var currentStep: BookingStep
    @ObservedObject var bookingState: BookingFlowState
    let onBack: () -> Void
    let onCancel: () -> Void
    
    // MARK: - Computed Properties
    private var totalSteps: Int { BookingStep.allCases.count }
    private var currentStepIndex: Int { BookingStep.allCases.firstIndex(of: currentStep) ?? 0 }
    private var progressPercentage: Double { Double(currentStepIndex + 1) / Double(totalSteps) }
    
    var body: some View {
        VStack(spacing: 0) {
            // Navigation Header
            navigationHeader
            
            // Enhanced Progress Bar
            enhancedProgressBar
        }
        .background(LunaraColors.navigationBackground)
        .onAppear {
            bookingState.updateNavigationState(for: currentStep)
        }
        .onChange(of: currentStep) { _, newStep in
            bookingState.updateNavigationState(for: newStep)
        }
    }
    
    // MARK: - Navigation Header
    private var navigationHeader: some View {
        HStack(spacing: 16) {
            // Back Button
            if bookingState.canNavigateBack {
                Button(action: onBack) {
                    HStack(spacing: 6) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .semibold))
                        Text("Back")
                            .font(.system(size: 16, weight: .medium))
                    }
                    .foregroundColor(LunaraColors.warmGold)
                }
                .accessibilityLabel("Go back to previous step")
                .accessibilityHint("Returns to the previous booking step")
            } else {
                // Placeholder to maintain layout
                Rectangle()
                    .fill(Color.clear)
                    .frame(width: 60, height: 20)
            }
            
            Spacer()
            
            // Title
            Text("Book Appointment")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.navigationTitle)
            
            Spacer()

            // Cancel Button (hidden on confirmation step)
            if currentStep != .confirmation {
                Button("Cancel", action: onCancel)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)
                    .accessibilityLabel("Cancel booking")
                    .accessibilityHint("Cancels the entire booking process")
            } else {
                // Placeholder to maintain layout
                Rectangle()
                    .fill(Color.clear)
                    .frame(width: 60, height: 20)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
    
    // MARK: - Enhanced Progress Bar
    private var enhancedProgressBar: some View {
        VStack(spacing: 8) {
            // Progress Info
            HStack {
                Text("Step \(currentStepIndex + 1) of \(totalSteps)")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)
                
                Spacer()
                
                Text(currentStep.title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
            }
            .padding(.horizontal, 16)
            
            // Progress Bar with Animation
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Background
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(height: 4)
                        .cornerRadius(2)
                    
                    // Progress Fill
                    Rectangle()
                        .fill(LunaraColors.warmGold)
                        .frame(width: geometry.size.width * progressPercentage, height: 4)
                        .cornerRadius(2)
                        .animation(.easeInOut(duration: 0.3), value: progressPercentage)
                }
            }
            .frame(height: 4)
            .padding(.horizontal, 16)
        }
    }
    

}

// MARK: - BookingStep Extension
extension BookingStep {
    var shortTitle: String {
        switch self {
        case .serviceSelection:
            return "Service"
        case .employeeSelection:
            return "Staff"
        case .dateTimeSelection:
            return "Time"
        case .customerDetails:
            return "Details"
        case .payment:
            return "Payment"
        case .confirmation:
            return "Done"
        }
    }
}

// MARK: - Preview
struct EnhancedBookingNavigation_Previews: PreviewProvider {
    static var previews: some View {
        VStack {
            EnhancedBookingNavigation(
                currentStep: .constant(.employeeSelection),
                bookingState: BookingFlowState(),
                onBack: {},
                onCancel: {}
            )
            Spacer()
        }
        .background(Color.gray.opacity(0.1))
    }
}
