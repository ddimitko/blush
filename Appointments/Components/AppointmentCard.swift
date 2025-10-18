//
//  AppointmentCard.swift
//  LunaraApp
//
//  Created by Lunara Team on 16/07/2025.
//

import SwiftUI

/// Reusable appointment card component
struct AppointmentCard: View {
    let appointment: Appointment
    let onTap: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            // Main content area - tappable
            VStack(spacing: 0) {
                // Header with shop name and status
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(appointment.shopName)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(LunaraColors.primaryText)
                            .lineLimit(1)

                        Text(appointment.shopAddress)
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.secondaryText)
                            .lineLimit(1)
                    }

                    Spacer()

                    // Status badge
                    StatusBadge(status: appointment.status)
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)

                // Service and employee info
                HStack(spacing: 12) {
                    // Employee avatar
                    Image(systemName: "person.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(LunaraColors.coolLightGray)
                        .frame(width: 40, height: 40)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(appointment.serviceName)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(LunaraColors.primaryText)
                            .lineLimit(1)

                        Text("with \(appointment.employeeName)")
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.secondaryText)
                            .lineLimit(1)
                    }

                    Spacer()

                    Text(appointment.formattedPrice)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(LunaraColors.warmGold)
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)

                // Date and time
                HStack {
                    HStack(spacing: 8) {
                        Image(systemName: "calendar")
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.warmGold)

                        Text(appointment.shortFormattedDate)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(LunaraColors.primaryText)
                    }

                    Spacer()

                    HStack(spacing: 8) {
                        Image(systemName: "clock")
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.warmGold)

                        Text(appointment.formattedTimeRange)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(LunaraColors.primaryText)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .padding(.bottom, 16)
            }
            .contentShape(Rectangle()) // Ensures entire area is tappable
            .onTapGesture {
                // Add haptic feedback
                let impactFeedback = UIImpactFeedbackGenerator(style: .light)
                impactFeedback.impactOccurred()
                onTap()
            }

            // Action buttons for upcoming appointments (separate from main tap area)
            if appointment.isUpcoming && (appointment.canBeModified || appointment.canBeCancelled) {
                Divider()
                    .background(LunaraColors.coolLightGray)

                HStack(spacing: 0) {
                    if appointment.canBeModified {
                        Button(action: {
                            // Add haptic feedback for action buttons
                            let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
                            impactFeedback.impactOccurred()
                            // Handle edit action - this should open management sheet
                        }) {
                            HStack(spacing: 4) {
                                Image(systemName: "pencil")
                                    .font(.system(size: 12))
                                Text("Edit")
                                    .font(.system(size: 12, weight: .medium))
                            }
                            .foregroundColor(LunaraColors.warmGold)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(PlainButtonStyle())

                        if appointment.canBeCancelled {
                            Divider()
                                .background(LunaraColors.coolLightGray)
                                .frame(height: 20)
                        }
                    }

                    if appointment.canBeCancelled {
                        Button(action: {
                            // Add haptic feedback for action buttons
                            let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
                            impactFeedback.impactOccurred()
                            // Handle cancel action
                        }) {
                            HStack(spacing: 4) {
                                Image(systemName: "xmark.circle")
                                    .font(.system(size: 12))
                                Text("Cancel")
                                    .font(.system(size: 12, weight: .medium))
                            }
                            .foregroundColor(.red)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
            }
        }
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
}

// MARK: - Status Badge Component
struct StatusBadge: View {
    let status: AppointmentStatus
    
    var body: some View {
        Text(status.displayText)
            .font(.system(size: 10, weight: .semibold))
            .foregroundColor(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(status.color)
            .cornerRadius(8)
    }
}



// MARK: - Preview
struct AppointmentCard_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 16) {
            AppointmentCard(appointment: Appointment.preview) {
                print("Appointment tapped")
            }
            
            AppointmentCard(appointment: Appointment.previewCancelled) {
                print("Cancelled appointment tapped")
            }
        }
        .padding()
        .background(LunaraColors.coolLightGray)
    }
}
