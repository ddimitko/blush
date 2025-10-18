//
//  PersistentBookingSummary.swift
//  LunaraApp
//
//  Created by Lunara Team on 23/07/2025.
//

import SwiftUI

/// Persistent booking summary that follows the user through all steps
struct PersistentBookingSummary: View {
    @ObservedObject var bookingState: BookingFlowState
    @Binding var currentStep: BookingStep
    let onEditStep: (BookingStep) -> Void
    
    @State private var isExpanded: Bool = false
    @State private var showingEditOptions: Bool = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Summary Header (Always Visible)
            summaryHeader
            
            // Expandable Content
            if isExpanded {
                summaryContent
                    .transition(.asymmetric(
                        insertion: .opacity.combined(with: .move(edge: .top)),
                        removal: .opacity.combined(with: .move(edge: .top))
                    ))
            }
        }
        .background(summaryBackground)
        .cornerRadius(16)
        .shadow(color: LunaraColors.cardShadow, radius: 8, x: 0, y: 2)
        .padding(.horizontal, 16)
        .zIndex(5) // Ensure summary stays below navigation header
        .onChange(of: bookingState.selectedService) { _, _ in
            updateExpansionState()
        }
        .onChange(of: bookingState.selectedEmployee) { _, _ in
            updateExpansionState()
        }
        .onChange(of: bookingState.selectedSlot) { _, _ in
            updateExpansionState()
        }
        .onChange(of: currentStep) { _, _ in
            updateExpansionForStep()
        }
    }
    
    // MARK: - Summary Header
    private var summaryHeader: some View {
        Button(action: toggleExpansion) {
            HStack(spacing: 12) {
                // Service Icon or Placeholder
                serviceIcon
                
                // Summary Text
                VStack(alignment: .leading, spacing: 2) {
                    Text(summaryTitle)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)
                        .multilineTextAlignment(.leading)
                    
                    if !summarySubtitle.isEmpty {
                        Text(summarySubtitle)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(LunaraColors.secondaryText)
                            .multilineTextAlignment(.leading)
                    }
                }
                
                Spacer()
                
                // Expand/Collapse Icon
                Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(LunaraColors.warmGold)
                    .rotationEffect(.degrees(isExpanded ? 180 : 0))
                    .animation(.easeInOut(duration: 0.2), value: isExpanded)
            }
            .padding(16)
        }
        .buttonStyle(PlainButtonStyle())
        .accessibilityLabel("Booking summary")
        .accessibilityHint(isExpanded ? "Tap to collapse booking details" : "Tap to expand booking details")
    }
    
    // MARK: - Summary Content
    private var summaryContent: some View {
        VStack(spacing: 16) {
            Divider()
                .background(LunaraColors.divider)
            
            VStack(spacing: 12) {
                // Service Details
                if let service = bookingState.selectedService {
                    summaryRow(
                        icon: "scissors",
                        title: "Service",
                        value: service.name,
                        subtitle: service.formattedPrice,
                        canEdit: true,
                        editAction: { onEditStep(.serviceSelection) }
                    )
                }
                
                // Employee Details
                if let employee = bookingState.selectedEmployee {
                    summaryRow(
                        icon: "person.fill",
                        title: "Staff Member",
                        value: employee.displayName,
                        subtitle: employee.specialties?.joined(separator: ", ") ?? "",
                        canEdit: currentStep.rawValue > BookingStep.employeeSelection.rawValue,
                        editAction: { onEditStep(.employeeSelection) }
                    )
                }
                
                // Date & Time Details
                if let slot = bookingState.selectedSlot {
                    summaryRow(
                        icon: "calendar",
                        title: "Date & Time",
                        value: slot.formattedDate,
                        subtitle: slot.formattedTime,
                        canEdit: currentStep.rawValue > BookingStep.dateTimeSelection.rawValue,
                        editAction: { onEditStep(.dateTimeSelection) }
                    )
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 16)
        }
    }
    
    // MARK: - Summary Row
    private func summaryRow(
        icon: String,
        title: String,
        value: String,
        subtitle: String?,
        canEdit: Bool,
        editAction: @escaping () -> Void
    ) -> some View {
        HStack(spacing: 12) {
            // Icon
            Image(systemName: icon)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
                .frame(width: 20, height: 20)
            
            // Content
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)
                
                Text(value)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                if let subtitle = subtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.system(size: 12, weight: .regular))
                        .foregroundColor(LunaraColors.secondaryText)
                }
            }
            
            Spacer()
            
            // Edit Button
            if canEdit {
                Button(action: editAction) {
                    Text("Edit")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(LunaraColors.warmGold)
                }
                .accessibilityLabel("Edit \(title.lowercased())")
            }
        }
    }
    

    
    // MARK: - Helper Views
    
    private var serviceIcon: some View {
        ZStack {
            Circle()
                .fill(LunaraColors.warmGold.opacity(0.1))
                .frame(width: 40, height: 40)
            
            Image(systemName: hasAnySelection ? "checkmark" : "plus")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(LunaraColors.warmGold)
        }
    }
    
    private var summaryBackground: some View {
        RoundedRectangle(cornerRadius: 16)
            .fill(LunaraColors.cardBackground)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(hasAnySelection ? LunaraColors.warmGold.opacity(0.3) : LunaraColors.border, lineWidth: 1)
            )
    }
    
    // MARK: - Computed Properties
    
    private var summaryTitle: String {
        if let service = bookingState.selectedService {
            return service.name
        } else {
            return "Select a service to begin"
        }
    }
    
    private var summarySubtitle: String {
        var components: [String] = []
        
        if let employee = bookingState.selectedEmployee {
            components.append(employee.displayName)
        }
        
        if let slot = bookingState.selectedSlot {
            components.append(slot.formattedDateTime)
        }
        
        return components.joined(separator: " • ")
    }
    
    private var hasAnySelection: Bool {
        return bookingState.selectedService != nil ||
               bookingState.selectedEmployee != nil ||
               bookingState.selectedSlot != nil
    }
    
    // MARK: - Helper Methods
    
    private func toggleExpansion() {
        withAnimation(.easeInOut(duration: 0.3)) {
            isExpanded.toggle()
            bookingState.isBookingSummaryExpanded = isExpanded
        }
    }
    
    private func updateExpansionState() {
        // Auto-expand when user makes selections
        if hasAnySelection && !isExpanded {
            withAnimation(.easeInOut(duration: 0.3)) {
                isExpanded = true
                bookingState.isBookingSummaryExpanded = true
            }
        }
    }

    private func updateExpansionForStep() {
        // Keep summary compact on date/time selection and customer details steps for better UX
        if currentStep == .dateTimeSelection || currentStep == .customerDetails {
            withAnimation(.easeInOut(duration: 0.3)) {
                isExpanded = false
                bookingState.isBookingSummaryExpanded = false
            }
        }
    }
    
    private func formatTimeRemaining(_ timeInterval: TimeInterval) -> String {
        let minutes = Int(timeInterval) / 60
        let seconds = Int(timeInterval) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
}

// MARK: - Preview
struct PersistentBookingSummary_Previews: PreviewProvider {
    static var previews: some View {
        let bookingState = BookingFlowState()
        
        VStack {
            PersistentBookingSummary(
                bookingState: bookingState,
                currentStep: .constant(.employeeSelection),
                onEditStep: { _ in }
            )
            Spacer()
        }
        .padding()
        .background(Color.gray.opacity(0.1))
    }
}
