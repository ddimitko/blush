//
//  BookingConfirmationView.swift
//  LunaraApp
//
//  Created by Lunara Team on 23/07/2025.
//

import SwiftUI

/// View for displaying booking confirmation after successful payment
struct BookingConfirmationView: View {
    // MARK: - Properties
    let appointment: Appointment?
    let onDone: () -> Void
    
    // MARK: - State
    @State private var showingAnimation = false
    @State private var showingContent = false
    
    var body: some View {
        VStack(spacing: 0) {
            if let appointment = appointment {
                successContent(appointment)
            } else {
                errorContent
            }
        }
        .onAppear {
            startAnimation()
        }
    }
    
    // MARK: - Success Content
    private func successContent(_ appointment: Appointment) -> some View {
        ScrollView {
            VStack(spacing: 32) {
                // Success Animation
                successAnimationSection
                
                // Appointment Details
                appointmentDetailsSection(appointment)
                
                // Next Steps
                nextStepsSection
                
                // Action Buttons
                actionButtonsSection
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 32)
        }
    }
    
    // MARK: - Success Animation Section
    private var successAnimationSection: some View {
        VStack(spacing: 24) {
            // Animated Checkmark
            ZStack {
                Circle()
                    .fill(LunaraColors.warmGold.opacity(0.1))
                    .frame(width: 120, height: 120)
                    .scaleEffect(showingAnimation ? 1.0 : 0.5)
                    .opacity(showingAnimation ? 1.0 : 0.0)
                
                Circle()
                    .fill(LunaraColors.warmGold)
                    .frame(width: 80, height: 80)
                    .scaleEffect(showingAnimation ? 1.0 : 0.3)
                    .opacity(showingAnimation ? 1.0 : 0.0)
                
                Image(systemName: "checkmark")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(LunaraColors.white)
                    .scaleEffect(showingAnimation ? 1.0 : 0.0)
                    .opacity(showingAnimation ? 1.0 : 0.0)
            }
            .animation(.spring(response: 0.6, dampingFraction: 0.8, blendDuration: 0), value: showingAnimation)
            
            // Success Message
            VStack(spacing: 12) {
                Text("Booking Confirmed!")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                    .opacity(showingContent ? 1.0 : 0.0)
                    .offset(y: showingContent ? 0 : 20)
                
                Text("Your appointment has been successfully booked. You'll receive a confirmation email shortly.")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                    .opacity(showingContent ? 1.0 : 0.0)
                    .offset(y: showingContent ? 0 : 20)
            }
            .animation(.easeOut(duration: 0.6).delay(0.3), value: showingContent)
        }
    }
    
    // MARK: - Appointment Details Section
    private func appointmentDetailsSection(_ appointment: Appointment) -> some View {
        VStack(spacing: 16) {
            Text("Appointment Details")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(LunaraColors.primaryText)
                .frame(maxWidth: .infinity, alignment: .leading)
                .opacity(showingContent ? 1.0 : 0.0)
                .offset(y: showingContent ? 0 : 20)
            
            VStack(spacing: 16) {
                // Shop Info
                AppointmentDetailRow(
                    icon: "storefront",
                    title: "Shop",
                    value: appointment.shopName,
                    subtitle: appointment.shopAddress
                )
                
                // Service Info
                AppointmentDetailRow(
                    icon: "scissors",
                    title: "Service",
                    value: appointment.serviceName,
                    subtitle: "\(appointment.serviceDurationMinutes) minutes • \(appointment.formattedPrice)"
                )
                
                // Employee Info
                AppointmentDetailRow(
                    icon: "person.circle",
                    title: "Stylist",
                    value: appointment.employeeName,
                    subtitle: appointment.employeeSpecialties
                )
                
                // Date & Time Info
                AppointmentDetailRow(
                    icon: "calendar",
                    title: "Date & Time",
                    value: appointment.formattedDateTime,
                    subtitle: appointment.formattedDate
                )
                
                // Confirmation Number
                AppointmentDetailRow(
                    icon: "number",
                    title: "Confirmation #",
                    value: appointment.id.prefix(8).uppercased(),
                    subtitle: "Reference this number for any inquiries"
                )
            }
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(LunaraColors.coolLightGray)
                    .opacity(0.3)
            )
            .opacity(showingContent ? 1.0 : 0.0)
            .offset(y: showingContent ? 0 : 30)
            .animation(.easeOut(duration: 0.6).delay(0.5), value: showingContent)
        }
    }
    
    // MARK: - Next Steps Section
    private var nextStepsSection: some View {
        VStack(spacing: 16) {
            Text("What's Next?")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(LunaraColors.primaryText)
                .frame(maxWidth: .infinity, alignment: .leading)
            
            VStack(spacing: 12) {
                NextStepItem(
                    number: "1",
                    title: "Confirmation Email",
                    description: "Check your email for appointment details and shop information"
                )
                
                NextStepItem(
                    number: "2",
                    title: "Prepare for Your Visit",
                    description: "Arrive 5-10 minutes early and bring any inspiration photos"
                )
                
                NextStepItem(
                    number: "3",
                    title: "Need to Reschedule?",
                    description: "Changes can be made up to 24 hours before your appointment"
                )
            }
        }
        .opacity(showingContent ? 1.0 : 0.0)
        .offset(y: showingContent ? 0 : 30)
        .animation(.easeOut(duration: 0.6).delay(0.7), value: showingContent)
    }
    
    // MARK: - Action Buttons Section
    private var actionButtonsSection: some View {
        VStack(spacing: 16) {
            // Primary Action - Done
            Button(action: onDone) {
                Text("Done")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(LunaraColors.warmGold)
                    )
            }
            
            // Secondary Actions
            HStack(spacing: 16) {
                Button("Add to Calendar") {
                    // TODO: Implement calendar integration
                }
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(LunaraColors.warmGold, lineWidth: 1)
                )
                
                Button("Share") {
                    // TODO: Implement sharing
                }
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(LunaraColors.warmGold, lineWidth: 1)
                )
            }
        }
        .opacity(showingContent ? 1.0 : 0.0)
        .offset(y: showingContent ? 0 : 30)
        .animation(.easeOut(duration: 0.6).delay(0.9), value: showingContent)
    }
    
    // MARK: - Error Content
    private var errorContent: some View {
        VStack(spacing: 32) {
            Spacer()
            
            // Error Icon
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 64))
                .foregroundColor(.red)
            
            // Error Message
            VStack(spacing: 12) {
                Text("Booking Error")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text("There was an issue confirming your booking. Please contact support for assistance.")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
            
            // Done Button
            Button("Done") {
                onDone()
            }
            .buttonStyle(PrimaryButtonStyle())
            .padding(.horizontal, 32)
            
            Spacer()
        }
    }
    
    // MARK: - Private Methods
    
    private func startAnimation() {
        // Start the checkmark animation
        withAnimation(.spring(response: 0.6, dampingFraction: 0.8, blendDuration: 0).delay(0.2)) {
            showingAnimation = true
        }
        
        // Start the content animation
        withAnimation(.easeOut(duration: 0.6).delay(0.5)) {
            showingContent = true
        }
    }
}

// MARK: - Appointment Detail Row Component
struct AppointmentDetailRow: View {
    let icon: String
    let title: String
    let value: String
    let subtitle: String?
    
    var body: some View {
        HStack(spacing: 16) {
            // Icon
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(LunaraColors.warmGold)
                .frame(width: 24)
            
            // Content
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)
                    .textCase(.uppercase)
                
                Text(value)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                if let subtitle = subtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                        .lineLimit(2)
                }
            }
            
            Spacer()
        }
    }
}

// MARK: - Next Step Item Component
struct NextStepItem: View {
    let number: String
    let title: String
    let description: String
    
    var body: some View {
        HStack(spacing: 16) {
            // Number Badge
            Text(number)
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(LunaraColors.white)
                .frame(width: 28, height: 28)
                .background(
                    Circle()
                        .fill(LunaraColors.warmGold)
                )
            
            // Content
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text(description)
                    .font(.system(size: 14))
                    .foregroundColor(LunaraColors.secondaryText)
                    .lineLimit(nil)
            }
            
            Spacer()
        }
    }
}

// MARK: - Preview
struct BookingConfirmationView_Previews: PreviewProvider {
    static var previews: some View {
        BookingConfirmationView(
            appointment: Appointment.preview,
            onDone: { }
        )
    }
}
