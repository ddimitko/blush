//
//  AppointmentDetailView.swift
//  LunaraApp
//
//  Created by Lunara Team on 16/07/2025.
//

import SwiftUI
import MapKit
import EventKit
import CoreLocation

/// Detailed view for individual appointments
struct AppointmentDetailView: View {
    let appointment: Appointment
    
    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss
    
    // MARK: - State
    @StateObject private var appointmentService = AppointmentService.shared
    @State private var showingManagementSheet = false
    @State private var showingCancelConfirmation = false
    @State private var showingMapSheet = false
    @State private var region = MKCoordinateRegion()
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Header with shop info
                    ShopHeaderView(appointment: appointment)
                    
                    // Status and date info
                    StatusDateView(appointment: appointment)
                    
                    // Service and employee details
                    ServiceEmployeeView(appointment: appointment)
                    
                    // Appointment details
                    AppointmentDetailsView(appointment: appointment)

                    // Customer information (only show for shop owners/employees)
                    CustomerInfoView(appointment: appointment)

                    // Location section
                    LocationSectionView(
                        appointment: appointment,
                        onMapTap: {
                            setupMapRegion()
                            showingMapSheet = true
                        }
                    )
                    
                    // Action buttons
                    if appointment.isUpcoming {
                        ActionButtonsView(
                            appointment: appointment,
                            onManage: { showingManagementSheet = true },
                            onCancel: { showingCancelConfirmation = true },
                            onAddToCalendar: addToCalendar
                        )
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 32)
            }
            .background(LunaraColors.coolLightGray)
            .navigationTitle("Appointment Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.warmGold)
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        // Share appointment details
                        shareAppointment()
                    }) {
                        Image(systemName: "square.and.arrow.up")
                            .foregroundColor(LunaraColors.warmGold)
                    }
                }
            }
        }
        .sheet(isPresented: $showingManagementSheet) {
            AppointmentManagementView(appointment: appointment)
        }
        .sheet(isPresented: $showingMapSheet) {
            MapView(region: $region, appointment: appointment)
        }
        .alert("Cancel Appointment", isPresented: $showingCancelConfirmation) {
            Button("Cancel", role: .destructive) {
                Task {
                    await cancelAppointment()
                }
            }
            Button("Keep Appointment", role: .cancel) { }
        } message: {
            Text("Are you sure you want to cancel this appointment? This action cannot be undone.")
        }
    }
    
    // MARK: - Private Methods
    
    private func setupMapRegion() {
        // TODO: Add latitude/longitude to flattened appointment structure
        // For now, use a default region
        region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194), // San Francisco default
            span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
        )
    }
    
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
                    DispatchQueue.main.async {
                        // Show success message
                    }
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
    
    @MainActor
    private func shareAppointment() {
        let text = """
        Appointment Details:

        Shop: \(appointment.shopName)
        Service: \(appointment.serviceName)
        Employee: \(appointment.employeeName)
        Date: \(appointment.formattedDate)
        Time: \(appointment.formattedTime)
        Address: \(appointment.shopAddress)

        Total: \(appointment.formattedPrice)
        Status: \(appointment.statusDisplayText)
        """

        let activityVC = UIActivityViewController(activityItems: [text], applicationActivities: nil)

        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first {
            window.rootViewController?.present(activityVC, animated: true)
        }
    }
}

// MARK: - Supporting Views

struct ShopHeaderView: View {
    let appointment: Appointment

    var body: some View {
        VStack(spacing: 12) {
            // Shop image placeholder - we'll need to add shop image URL to appointment model
            Rectangle()
                .fill(LunaraColors.coolLightGray)
                .overlay(
                    VStack(spacing: 8) {
                        Image(systemName: "building.2")
                            .font(.system(size: 32))
                            .foregroundColor(LunaraColors.secondaryText)

                        Text(appointment.shopName)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(LunaraColors.secondaryText)
                            .multilineTextAlignment(.center)
                    }
                )
                .frame(height: 120)
                .clipShape(RoundedRectangle(cornerRadius: 12))

            VStack(spacing: 4) {
                Text(appointment.shopName)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)

                Text(appointment.shopAddress)
                    .font(.system(size: 14))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
    }
}

struct StatusDateView: View {
    let appointment: Appointment
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Status")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)
                
                StatusBadge(status: appointment.status)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text("Date & Time")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text(appointment.shortFormattedDate)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)

                    Text(appointment.formattedTimeRange)
                        .font(.system(size: 12))
                        .foregroundColor(LunaraColors.secondaryText)

                    Text(appointment.dayOfWeek)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(LunaraColors.warmGold)
                        .textCase(.uppercase)
                }
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
    }
}

struct ServiceEmployeeView: View {
    let appointment: Appointment

    var body: some View {
        VStack(spacing: 16) {
            // Service info
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Service")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)

                    Text(appointment.serviceName)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)

                    if !appointment.serviceDescription.isEmpty {
                        Text(appointment.serviceDescription)
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.secondaryText)
                            .lineLimit(2)
                    }
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Text("Duration")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)

                    Text(appointment.formattedDuration)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)
                }
            }

            Divider()
                .background(LunaraColors.coolLightGray)

            // Employee info
            HStack(spacing: 12) {
                // Employee avatar placeholder - we'll need to add employee avatar URL to appointment model
                Image(systemName: "person.circle.fill")
                    .font(.system(size: 48))
                    .foregroundColor(LunaraColors.coolLightGray)
                    .frame(width: 48, height: 48)

                VStack(alignment: .leading, spacing: 4) {
                    Text("Your Specialist")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)

                    Text(appointment.employeeName)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)

                    if let specialties = appointment.employeeSpecialties, !specialties.isEmpty {
                        Text(specialties)
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.secondaryText)
                            .lineLimit(1)
                    }
                }

                Spacer()
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
    }
}

struct AppointmentDetailsView: View {
    let appointment: Appointment

    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Appointment Details")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)

                Spacer()
            }

            VStack(spacing: 12) {
                DetailRow(label: "Total Amount", value: appointment.formattedPrice)
                DetailRow(label: "Payment Method", value: appointment.paymentType.displayName)
                DetailRow(label: "Payment Status", value: appointment.paymentStatus?.displayName ?? (appointment.paymentType == .cash ? "Pay on arrival" : "Unknown"))

                if let notes = appointment.notes, !notes.isEmpty {
                    DetailRow(label: "Notes", value: notes, isMultiline: true)
                }

                DetailRow(label: "Booking ID", value: appointment.id)
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
    }
}

struct DetailRow: View {
    let label: String
    let value: String
    let isMultiline: Bool

    init(label: String, value: String, isMultiline: Bool = false) {
        self.label = label
        self.value = value
        self.isMultiline = isMultiline
    }

    var body: some View {
        if isMultiline {
            VStack(alignment: .leading, spacing: 4) {
                Text(label)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)

                Text(value)
                    .font(.system(size: 14))
                    .foregroundColor(LunaraColors.primaryText)
            }
        } else {
            HStack {
                Text(label)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)

                Spacer()

                Text(value)
                    .font(.system(size: 14))
                    .foregroundColor(LunaraColors.primaryText)
            }
        }
    }
}

struct CustomerInfoView: View {
    let appointment: Appointment

    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Customer Information")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)

                Spacer()
            }

            VStack(spacing: 12) {
                DetailRow(label: "Name", value: appointment.customerName)
                DetailRow(label: "Email", value: appointment.customerEmail)

                if let phone = appointment.customerPhone, !phone.isEmpty {
                    HStack {
                        Text("Phone")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(LunaraColors.secondaryText)

                        Spacer()

                        Button(action: {
                            if let url = URL(string: "tel:\(phone)") {
                                UIApplication.shared.open(url)
                            }
                        }) {
                            Text(phone)
                                .font(.system(size: 14))
                                .foregroundColor(LunaraColors.warmGold)
                        }
                    }
                }

                if appointment.guestAppointment {
                    HStack {
                        Text("Account Type")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(LunaraColors.secondaryText)

                        Spacer()

                        Text("Guest")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(LunaraColors.secondaryText)
                            .cornerRadius(8)
                    }
                }
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
    }
}

struct LocationSectionView: View {
    let appointment: Appointment
    let onMapTap: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Location")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)

                Spacer()
            }

            Button(action: onMapTap) {
                HStack(spacing: 12) {
                    Image(systemName: "location.fill")
                        .font(.system(size: 16))
                        .foregroundColor(LunaraColors.warmGold)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(appointment.shopAddress)
                            .font(.system(size: 14))
                            .foregroundColor(LunaraColors.primaryText)
                            .multilineTextAlignment(.leading)

                        Text("Tap to view on map")
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.secondaryText)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.system(size: 12))
                        .foregroundColor(LunaraColors.secondaryText)
                }
            }
            .buttonStyle(PlainButtonStyle())
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
    }
}

struct ActionButtonsView: View {
    let appointment: Appointment
    let onManage: () -> Void
    let onCancel: () -> Void
    let onAddToCalendar: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            // Add to Calendar button
            Button(action: onAddToCalendar) {
                HStack(spacing: 8) {
                    Image(systemName: "calendar.badge.plus")
                        .font(.system(size: 16))

                    Text("Add to Calendar")
                        .font(.system(size: 16, weight: .medium))
                }
                .foregroundColor(LunaraColors.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(LunaraColors.warmGold)
                .cornerRadius(12)
            }

            HStack(spacing: 12) {
                // Manage button (edit/reschedule)
                if appointment.canBeModified {
                    Button(action: onManage) {
                        HStack(spacing: 8) {
                            Image(systemName: "pencil")
                                .font(.system(size: 14))

                            Text("Manage")
                                .font(.system(size: 14, weight: .medium))
                        }
                        .foregroundColor(LunaraColors.charcoalGray)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(LunaraColors.coolLightGray)
                        .cornerRadius(10)
                    }
                }

                // Cancel button
                if appointment.canBeCancelled {
                    Button(action: onCancel) {
                        HStack(spacing: 8) {
                            Image(systemName: "xmark.circle")
                                .font(.system(size: 14))

                            Text("Cancel")
                                .font(.system(size: 14, weight: .medium))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(.red)
                        .cornerRadius(10)
                    }
                }
            }
        }
    }
}

struct MapView: View {
    @Binding var region: MKCoordinateRegion
    let appointment: Appointment
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            VStack(spacing: 16) {
                // Since we don't have coordinates in the appointment model yet,
                // show address information instead
                VStack(spacing: 12) {
                    Image(systemName: "location.circle.fill")
                        .font(.system(size: 48))
                        .foregroundColor(LunaraColors.warmGold)

                    Text(appointment.shopName)
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)
                        .multilineTextAlignment(.center)

                    Text(appointment.shopAddress)
                        .font(.system(size: 16))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 20)

                    if !appointment.shopPhone.isEmpty {
                        Button(action: {
                            if let url = URL(string: "tel:\(appointment.shopPhone)") {
                                UIApplication.shared.open(url)
                            }
                        }) {
                            HStack(spacing: 8) {
                                Image(systemName: "phone.fill")
                                Text(appointment.shopPhone)
                            }
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(LunaraColors.warmGold)
                        }
                    }

                    Button(action: openInMaps) {
                        HStack(spacing: 8) {
                            Image(systemName: "map.fill")
                            Text("Open in Maps")
                        }
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.white)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 12)
                        .background(LunaraColors.warmGold)
                        .cornerRadius(8)
                    }
                }
                .padding(20)

                Spacer()
            }
            .navigationTitle("Location")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                }
            }
        }
    }

    private func openInMaps() {
        // Use address-based search since we don't have coordinates
        let addressQuery = appointment.shopAddress.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let mapURL = URL(string: "http://maps.apple.com/?q=\(addressQuery)")
        if let url = mapURL {
            UIApplication.shared.open(url)
        }
    }
}



// MARK: - Extensions
// Extensions are defined in Appointment.swift

// MARK: - Preview
struct AppointmentDetailView_Previews: PreviewProvider {
    static var previews: some View {
        AppointmentDetailView(appointment: Appointment.preview)
    }
}
