//
//  SimplifiedAppointmentDetailView.swift
//  LunaraApp
//
//  Created by Lunara Team on 30/07/2025.
//

import SwiftUI
import EventKit

/// Simplified appointment detail view with clean design
struct SimplifiedAppointmentDetailView: View {
    // MARK: - Properties
    let appointment: Appointment
    
    // MARK: - Environment Objects
    @EnvironmentObject var appointmentService: AppointmentService
    @EnvironmentObject var authService: AuthenticationService
    
    // MARK: - State
    @State private var showingCancelConfirmation = false
    @State private var showingRescheduleSheet = false
    @State private var showingShareSheet = false
    
    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 0) {
                    // Status and Date Section
                    statusDateSection

                    // Service Details Section
                    serviceDetailsSection

                    // Shop Information Section
                    shopInformationSection

                    // Payment Information Section
                    paymentInformationSection

                    // Customer Information Section (if applicable)
                    if shouldShowCustomerInfo {
                        customerInformationSection
                    }

                    // Quick Actions Section
                    quickActionsSection

                    // Management Actions Section (if applicable)
                    if appointment.upcoming && appointment.status != .cancelled {
                        managementActionsSection
                    }
                }
                .padding(.bottom, LunaraDesignSystem.Spacing.xxxl)
            }
            .navigationTitle("Appointment Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.primaryText)
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingShareSheet = true }) {
                        Image(systemName: "square.and.arrow.up")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundColor(LunaraColors.primaryText)
                    }
                }
            }
            .background(LunaraColors.background)
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .onAppear {
            print("📋 SimplifiedAppointmentDetailView appeared for appointment: \(appointment.id)")
            print("📋 Appointment data: \(appointment.serviceName) at \(appointment.shopName)")
        }
        .confirmationDialog("Cancel Appointment", isPresented: $showingCancelConfirmation) {
            Button("Cancel Appointment", role: .destructive) {
                Task {
                    await cancelAppointment()
                }
            }
            Button("Keep Appointment", role: .cancel) { }
        } message: {
            Text("Are you sure you want to cancel this appointment? This action cannot be undone.")
        }
        .sheet(isPresented: $showingRescheduleSheet) {
            // TODO: Implement reschedule sheet
            Text("Reschedule functionality coming soon")
                .padding()
        }
        .sheet(isPresented: $showingShareSheet) {
            ShareSheet(activityItems: [createShareText()])
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.lg) {
            // Appointment title
            Text("Appointment Details")
                .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                .foregroundColor(LunaraColors.primaryText)
            
            // Large status badge
            SimplifiedStatusBadge(status: appointment.status)
                .scaleEffect(1.2)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        .padding(.top, LunaraDesignSystem.Spacing.xl)
        .padding(.bottom, LunaraDesignSystem.Layout.sectionSpacing)
    }
    
    // MARK: - Status and Date Section
    private var statusDateSection: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.lg) {
            // Status badge
            SimplifiedStatusBadge(status: appointment.status)
                .scaleEffect(1.2)

            // Date and time
            HStack(spacing: LunaraDesignSystem.Spacing.lg) {
                VStack(spacing: LunaraDesignSystem.Spacing.sm) {
                    Image(systemName: "calendar")
                        .font(.system(size: 24, weight: .medium))
                        .foregroundColor(LunaraColors.warmGold)
                    
                    VStack(spacing: LunaraDesignSystem.Spacing.xs) {
                        Text(appointment.formattedDate)
                            .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .semibold))
                            .foregroundColor(LunaraColors.primaryText)
                        
                        Text(appointment.formattedTime)
                            .font(.system(size: LunaraDesignSystem.Typography.body))
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                }
                
                if let duration = appointment.duration {
                    VStack(spacing: LunaraDesignSystem.Spacing.sm) {
                        Image(systemName: "clock")
                            .font(.system(size: 24, weight: .medium))
                            .foregroundColor(LunaraColors.warmGold)
                        
                        VStack(spacing: LunaraDesignSystem.Spacing.xs) {
                            Text("Duration")
                                .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .semibold))
                                .foregroundColor(LunaraColors.primaryText)
                            
                            Text(formatDuration(duration))
                                .font(.system(size: LunaraDesignSystem.Typography.body))
                                .foregroundColor(LunaraColors.secondaryText)
                        }
                    }
                }
                
                VStack(spacing: LunaraDesignSystem.Spacing.sm) {
                    Image(systemName: "creditcard")
                        .font(.system(size: 24, weight: .medium))
                        .foregroundColor(LunaraColors.warmGold)
                    
                    VStack(spacing: LunaraDesignSystem.Spacing.xs) {
                        Text("Total")
                            .font(.system(size: LunaraDesignSystem.Typography.subheadline, weight: .semibold))
                            .foregroundColor(LunaraColors.primaryText)
                        
                        Text(appointment.formattedPrice)
                            .font(.system(size: LunaraDesignSystem.Typography.body, weight: .bold))
                            .foregroundColor(LunaraColors.warmGold)
                    }
                }
            }
            .frame(maxWidth: .infinity)
        }
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        .padding(.vertical, LunaraDesignSystem.Layout.sectionSpacing)
        .background(LunaraColors.cardBackground)
        .cornerRadius(LunaraDesignSystem.CornerRadius.card)
        .shadow(
            color: LunaraColors.cardShadow,
            radius: LunaraDesignSystem.Card.shadowRadius,
            x: LunaraDesignSystem.Card.shadowOffset.width,
            y: LunaraDesignSystem.Card.shadowOffset.height
        )
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
    }
    
    // MARK: - Service Details Section
    private var serviceDetailsSection: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.lg) {
            Text("Service Details")
                .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                .foregroundColor(LunaraColors.primaryText)
            
            VStack(spacing: LunaraDesignSystem.Spacing.md) {
                // Service name
                SimplifiedDetailRow(
                    icon: "scissors",
                    title: "Service",
                    value: appointment.serviceName
                )

                // Employee
                SimplifiedDetailRow(
                    icon: "person.circle",
                    title: "Specialist",
                    value: appointment.employeeName
                )

                // Notes (if any)
                if let notes = appointment.notes, !notes.isEmpty {
                    SimplifiedDetailRow(
                        icon: "note.text",
                        title: "Notes",
                        value: notes
                    )
                }
            }
        }
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        .padding(.top, LunaraDesignSystem.Layout.sectionSpacing)
    }
    
    // MARK: - Shop Information Section
    private var shopInformationSection: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.lg) {
            Text("Shop Information")
                .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                .foregroundColor(LunaraColors.primaryText)
            
            VStack(spacing: LunaraDesignSystem.Spacing.md) {
                // Shop name
                SimplifiedDetailRow(
                    icon: "storefront",
                    title: "Shop",
                    value: appointment.shopName
                )

                // Address
                SimplifiedDetailRow(
                    icon: "location",
                    title: "Address",
                    value: appointment.shopAddress
                )

                // Phone
                SimplifiedDetailRow(
                    icon: "phone",
                    title: "Phone",
                    value: appointment.shopPhone
                )
            }
        }
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        .padding(.top, LunaraDesignSystem.Layout.sectionSpacing)
    }

    // MARK: - Payment Information Section
    private var paymentInformationSection: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.lg) {
            Text("Payment Information")
                .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                .foregroundColor(LunaraColors.primaryText)

            VStack(spacing: LunaraDesignSystem.Spacing.md) {
                // Payment method
                SimplifiedDetailRow(
                    icon: appointment.paymentType.iconName,
                    title: "Payment Method",
                    value: appointment.paymentType.displayName
                )

                // Payment status (if available)
                if let paymentStatus = appointment.paymentStatus {
                    HStack(spacing: LunaraDesignSystem.Spacing.md) {
                        Image(systemName: "checkmark.circle")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(getPaymentStatusColor(paymentStatus))
                            .frame(width: 24)

                        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                            Text("Payment Status")
                                .font(.system(size: LunaraDesignSystem.Typography.caption, weight: .medium))
                                .foregroundColor(LunaraColors.secondaryText)

                            HStack(spacing: LunaraDesignSystem.Spacing.sm) {
                                Text(paymentStatus.displayName)
                                    .font(.system(size: LunaraDesignSystem.Typography.body, weight: .medium))
                                    .foregroundColor(getPaymentStatusColor(paymentStatus))

                                // Status badge
                                Text(paymentStatus.displayName.uppercased())
                                    .font(.system(size: LunaraDesignSystem.Typography.caption, weight: .bold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, LunaraDesignSystem.Spacing.sm)
                                    .padding(.vertical, 2)
                                    .background(getPaymentStatusColor(paymentStatus))
                                    .cornerRadius(LunaraDesignSystem.CornerRadius.chip)
                            }
                        }

                        Spacer()
                    }
                    .padding(.vertical, LunaraDesignSystem.Spacing.sm)
                }

                // Total amount
                SimplifiedDetailRow(
                    icon: "dollarsign.circle",
                    title: "Total Amount",
                    value: appointment.formattedPrice
                )

                // Deposit amount (if applicable)
                if appointment.depositAmount > 0 {
                    SimplifiedDetailRow(
                        icon: "creditcard.circle",
                        title: "Deposit Paid",
                        value: String(format: "%.2f BGN", appointment.depositAmount)
                    )
                }

                // Payment details for card payments
                if appointment.paymentType == .card {
                    cardPaymentDetailsView
                }

                // Refund information (if applicable)
                if let refundStatus = appointment.refundStatus, !refundStatus.isEmpty {
                    refundInformationView
                }
            }
        }
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        .padding(.top, LunaraDesignSystem.Layout.sectionSpacing)
    }

    // MARK: - Card Payment Details
    private var cardPaymentDetailsView: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.sm) {
            // Payment Intent ID (if available)
            if let paymentIntentId = appointment.paymentIntentId, !paymentIntentId.isEmpty {
                SimplifiedDetailRow(
                    icon: "doc.text",
                    title: "Transaction ID",
                    value: String(paymentIntentId.prefix(20)) + (paymentIntentId.count > 20 ? "..." : "")
                )
            }

            // Payment method info
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                Image(systemName: "info.circle")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(LunaraColors.info)
                    .frame(width: 24)

                VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                    Text("Secure Payment")
                        .font(.system(size: LunaraDesignSystem.Typography.caption, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)

                    Text("Payment processed securely through Stripe")
                        .font(.system(size: LunaraDesignSystem.Typography.body))
                        .foregroundColor(LunaraColors.primaryText)
                }

                Spacer()
            }
            .padding(.vertical, LunaraDesignSystem.Spacing.sm)
        }
    }

    // MARK: - Refund Information
    private var refundInformationView: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.md) {
            Divider()
                .background(LunaraColors.coolLightGray)

            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                Image(systemName: "arrow.counterclockwise.circle")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(LunaraColors.info)
                    .frame(width: 24)

                VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                    Text("Refund Information")
                        .font(.system(size: LunaraDesignSystem.Typography.caption, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)

                    VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                        if let refundAmount = appointment.refundAmount {
                            Text("Refunded: \(String(format: "%.2f BGN", refundAmount))")
                                .font(.system(size: LunaraDesignSystem.Typography.body, weight: .medium))
                                .foregroundColor(LunaraColors.info)
                        }

                        if let refundDate = appointment.refundDate {
                            Text("Date: \(refundDate)")
                                .font(.system(size: LunaraDesignSystem.Typography.body))
                                .foregroundColor(LunaraColors.primaryText)
                        }
                    }
                }

                Spacer()
            }
            .padding(.vertical, LunaraDesignSystem.Spacing.sm)
        }
    }

    // MARK: - Customer Information Section
    private var customerInformationSection: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.lg) {
            Text("Customer Information")
                .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                .foregroundColor(LunaraColors.primaryText)

            VStack(spacing: LunaraDesignSystem.Spacing.md) {
                // Customer name
                SimplifiedDetailRow(
                    icon: "person",
                    title: "Name",
                    value: appointment.customerName
                )

                // Email
                SimplifiedDetailRow(
                    icon: "envelope",
                    title: "Email",
                    value: appointment.customerEmail
                )

                // Phone (if available)
                if let phone = appointment.customerPhone, !phone.isEmpty {
                    SimplifiedDetailRow(
                        icon: "phone",
                        title: "Phone",
                        value: phone
                    )
                }
            }
        }
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        .padding(.top, LunaraDesignSystem.Layout.sectionSpacing)
    }

    // MARK: - Quick Actions Section
    private var quickActionsSection: some View {
        VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.lg) {
            Text("Quick Actions")
                .font(.system(size: LunaraDesignSystem.Typography.title, weight: .bold))
                .foregroundColor(LunaraColors.primaryText)

            VStack(spacing: LunaraDesignSystem.Spacing.md) {
                // Add to Calendar
                QuickActionButton(
                    icon: "calendar.badge.plus",
                    title: "Add to Calendar",
                    subtitle: "Save to your device calendar",
                    color: LunaraColors.info
                ) {
                    addToCalendar()
                }

                // Get Directions
                QuickActionButton(
                    icon: "location.fill",
                    title: "Get Directions",
                    subtitle: "Open in Maps app",
                    color: LunaraColors.success
                ) {
                    openMaps()
                }

                // Call Shop
                QuickActionButton(
                    icon: "phone.fill",
                    title: "Call Shop",
                    subtitle: appointment.shopPhone,
                    color: LunaraColors.warmGold
                ) {
                    callShop()
                }
            }
        }
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        .padding(.top, LunaraDesignSystem.Layout.sectionSpacing)
    }

    // MARK: - Management Actions Section
    private var managementActionsSection: some View {
        VStack(spacing: LunaraDesignSystem.Spacing.lg) {
            HStack(spacing: LunaraDesignSystem.Spacing.md) {
                // Reschedule Button
                Button(action: { showingRescheduleSheet = true }) {
                    HStack(spacing: LunaraDesignSystem.Spacing.sm) {
                        Image(systemName: "calendar.badge.clock")
                            .font(.system(size: 16, weight: .semibold))

                        Text("Reschedule")
                            .font(.system(size: LunaraDesignSystem.Typography.body, weight: .semibold))
                    }
                    .foregroundColor(LunaraColors.warmGold)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, LunaraDesignSystem.Spacing.lg)
                    .background(LunaraColors.warmGold.opacity(0.1))
                    .cornerRadius(LunaraDesignSystem.CornerRadius.button)
                    .overlay(
                        RoundedRectangle(cornerRadius: LunaraDesignSystem.CornerRadius.button)
                            .stroke(LunaraColors.warmGold, lineWidth: 1)
                    )
                }

                // Cancel Button
                Button(action: { showingCancelConfirmation = true }) {
                    HStack(spacing: LunaraDesignSystem.Spacing.sm) {
                        Image(systemName: "xmark.circle")
                            .font(.system(size: 16, weight: .semibold))

                        Text("Cancel")
                            .font(.system(size: LunaraDesignSystem.Typography.body, weight: .semibold))
                    }
                    .foregroundColor(LunaraColors.error)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, LunaraDesignSystem.Spacing.lg)
                    .background(LunaraColors.error.opacity(0.1))
                    .cornerRadius(LunaraDesignSystem.CornerRadius.button)
                    .overlay(
                        RoundedRectangle(cornerRadius: LunaraDesignSystem.CornerRadius.button)
                            .stroke(LunaraColors.error, lineWidth: 1)
                    )
                }
            }
        }
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        .padding(.top, LunaraDesignSystem.Layout.sectionSpacing)
    }

    // MARK: - Computed Properties

    /// Whether to show customer information (for shop owners/employees)
    private var shouldShowCustomerInfo: Bool {
        // TODO: Check if current user is shop owner/employee
        return false
    }

    // MARK: - Helper Methods

    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration / 60)
        let hours = minutes / 60
        let remainingMinutes = minutes % 60

        if hours > 0 {
            return remainingMinutes > 0 ? "\(hours)h \(remainingMinutes)m" : "\(hours)h"
        } else {
            return "\(minutes)m"
        }
    }

    private func createShareText() -> String {
        return """
        Appointment Details:

        Shop: \(appointment.shopName)
        Service: \(appointment.serviceName)
        Specialist: \(appointment.employeeName)
        Date: \(appointment.formattedDate)
        Time: \(appointment.formattedTime)
        Address: \(appointment.shopAddress)

        Total: \(appointment.formattedPrice)
        Status: \(appointment.status.displayText)
        """
    }

    // MARK: - Actions

    private func cancelAppointment() async {
        let success = await appointmentService.cancelAppointment(appointment.id, reason: "Cancelled by customer")
        if success {
            dismiss()
        }
    }

    private func addToCalendar() {
        let eventStore = EKEventStore()

        let handleAccess: (Bool, Error?) -> Void = { granted, error in
            if granted && error == nil {
                let event = EKEvent(eventStore: eventStore)
                event.title = "\(self.appointment.serviceName) at \(self.appointment.shopName)"
                event.startDate = self.appointment.appointmentDate
                event.endDate = self.appointment.endDate
                event.location = self.appointment.shopAddress
                event.notes = self.appointment.notes
                event.calendar = eventStore.defaultCalendarForNewEvents

                do {
                    try eventStore.save(event, span: .thisEvent)
                    // TODO: Show success message
                } catch {
                    print("Failed to save event: \(error)")
                }
            }
        }

        if #available(iOS 17.0, *) {
            eventStore.requestFullAccessToEvents(completion: handleAccess)
        } else {
            eventStore.requestAccess(to: .event, completion: handleAccess)
        }
    }

    private func openMaps() {
        let address = appointment.shopAddress.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        if let url = URL(string: "http://maps.apple.com/?q=\(address)") {
            UIApplication.shared.open(url)
        }
    }

    private func callShop() {
        if let phoneURL = URL(string: "tel:\(appointment.shopPhone)") {
            UIApplication.shared.open(phoneURL)
        }
    }

    /// Get color for payment status
    private func getPaymentStatusColor(_ status: PaymentStatus) -> Color {
        switch status {
        case .pending:
            return LunaraColors.warning
        case .paid, .succeeded:
            return LunaraColors.success
        case .failed:
            return LunaraColors.error
        case .refunded:
            return LunaraColors.info
        }
    }
}
