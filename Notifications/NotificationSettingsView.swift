//
//  NotificationSettingsView.swift
//  LunaraApp
//
//  Created by Lunara Team on 30/07/2025.
//

import SwiftUI

/// Simple notification settings view
struct NotificationSettingsView: View {
    // MARK: - Environment Objects
    @EnvironmentObject var notificationService: NotificationService
    
    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss
    
    // MARK: - State
    @State private var pushNotificationsEnabled = true
    @State private var appointmentReminders = true
    @State private var paymentNotifications = true
    @State private var systemUpdates = true
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Settings List
                settingsListView
                
                Spacer()
            }
            .navigationTitle("Notification Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.primaryText)
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        saveSettings()
                    }
                    .foregroundColor(LunaraColors.warmGold)
                    .font(.system(size: LunaraDesignSystem.Typography.body, weight: .semibold))
                }
            }
            .background(LunaraColors.background)
        }
        .onAppear {
            loadCurrentSettings()
        }
    }
    
    // MARK: - Settings List View
    private var settingsListView: some View {
        VStack(spacing: 0) {
            // Push Notifications
            SettingsToggleRow(
                icon: "bell.fill",
                title: "Push Notifications",
                subtitle: "Receive notifications on your device",
                isOn: $pushNotificationsEnabled,
                iconColor: LunaraColors.warmGold
            )
            
            Divider()
                .padding(.leading, 60)
            
            // Appointment Reminders
            SettingsToggleRow(
                icon: "calendar.badge.clock",
                title: "Appointment Reminders",
                subtitle: "Get reminded about upcoming appointments",
                isOn: $appointmentReminders,
                iconColor: LunaraColors.success
            )
            .disabled(!pushNotificationsEnabled)
            .opacity(pushNotificationsEnabled ? 1.0 : 0.5)
            
            Divider()
                .padding(.leading, 60)
            
            // Payment Notifications
            SettingsToggleRow(
                icon: "creditcard.fill",
                title: "Payment Notifications",
                subtitle: "Confirmations and payment updates",
                isOn: $paymentNotifications,
                iconColor: LunaraColors.info
            )
            .disabled(!pushNotificationsEnabled)
            .opacity(pushNotificationsEnabled ? 1.0 : 0.5)
            
            Divider()
                .padding(.leading, 60)
            
            // System Updates
            SettingsToggleRow(
                icon: "gear.badge",
                title: "System Updates",
                subtitle: "Important app updates and announcements",
                isOn: $systemUpdates,
                iconColor: LunaraColors.secondaryText
            )
            .disabled(!pushNotificationsEnabled)
            .opacity(pushNotificationsEnabled ? 1.0 : 0.5)
        }
        .padding(.top, LunaraDesignSystem.Spacing.lg)
    }
    
    // MARK: - Helper Methods
    
    private func loadCurrentSettings() {
        // Set defaults if first time
        if UserDefaults.standard.object(forKey: "pushNotificationsEnabled") == nil {
            pushNotificationsEnabled = true
            appointmentReminders = true
            paymentNotifications = true
            systemUpdates = true
        } else {
            // Load current notification settings from UserDefaults
            pushNotificationsEnabled = UserDefaults.standard.bool(forKey: "pushNotificationsEnabled")
            appointmentReminders = UserDefaults.standard.bool(forKey: "appointmentReminders")
            paymentNotifications = UserDefaults.standard.bool(forKey: "paymentNotifications")
            systemUpdates = UserDefaults.standard.bool(forKey: "systemUpdates")
        }
    }
    
    private func saveSettings() {
        // Save notification settings to UserDefaults
        UserDefaults.standard.set(pushNotificationsEnabled, forKey: "pushNotificationsEnabled")
        UserDefaults.standard.set(appointmentReminders, forKey: "appointmentReminders")
        UserDefaults.standard.set(paymentNotifications, forKey: "paymentNotifications")
        UserDefaults.standard.set(systemUpdates, forKey: "systemUpdates")

        // TODO: Update notification service preferences when method is available
        // This would typically call a method on the notification service

        dismiss()
    }
}

// MARK: - Settings Toggle Row
struct SettingsToggleRow: View {
    let icon: String
    let title: String
    let subtitle: String
    @Binding var isOn: Bool
    let iconColor: Color
    
    var body: some View {
        HStack(spacing: LunaraDesignSystem.Spacing.md) {
            // Icon
            ZStack {
                Circle()
                    .fill(iconColor.opacity(0.1))
                    .frame(width: 40, height: 40)
                
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(iconColor)
            }
            
            // Content
            VStack(alignment: .leading, spacing: LunaraDesignSystem.Spacing.xs) {
                Text(title)
                    .font(.system(size: LunaraDesignSystem.Typography.body, weight: .medium))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text(subtitle)
                    .font(.system(size: LunaraDesignSystem.Typography.subheadline))
                    .foregroundColor(LunaraColors.secondaryText)
            }
            
            Spacer()
            
            // Toggle
            Toggle("", isOn: $isOn)
                .toggleStyle(SwitchToggleStyle(tint: LunaraColors.warmGold))
        }
        .padding(.horizontal, LunaraDesignSystem.Layout.horizontalMargin)
        .padding(.vertical, LunaraDesignSystem.Spacing.lg)
    }
}
