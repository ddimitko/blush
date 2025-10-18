//
//  EmployeeScheduleCard.swift
//  LunaraApp
//
//  Created by Lunara Team on 28/07/2025.
//

import SwiftUI

/// Card component displaying an employee's weekly schedule
struct EmployeeScheduleCard: View {
    // MARK: - Properties
    let employeeSchedule: EmployeeScheduleData
    let onEditTapped: () -> Void
    let onSlotToggled: ((String) -> Void)?
    
    // MARK: - Constants
    private let daysOfWeek = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]
    private let dayAbbreviations = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            headerView
            
            // Schedule Grid
            scheduleGridView
        }
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Header View
    private var headerView: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(employeeSchedule.employeeName)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text(employeeSchedule.employeeEmail)
                    .font(.system(size: 14))
                    .foregroundColor(LunaraColors.secondaryText)
            }
            
            Spacer()
            
            Button("Edit") {
                onEditTapped()
            }
            .font(.system(size: 14, weight: .medium))
            .foregroundColor(LunaraColors.warmGold)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(LunaraColors.coolLightGray.opacity(0.3))
    }
    
    // MARK: - Schedule Grid View
    private var scheduleGridView: some View {
        VStack(spacing: 0) {
            ForEach(Array(zip(daysOfWeek, dayAbbreviations)), id: \.0) { dayKey, dayAbbr in
                scheduleRowView(dayKey: dayKey, dayAbbr: dayAbbr)
                
                if dayKey != daysOfWeek.last {
                    Divider()
                        .background(LunaraColors.coolLightGray)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 16)
    }
    
    // MARK: - Schedule Row View
    private func scheduleRowView(dayKey: String, dayAbbr: String) -> some View {
        HStack {
            // Day label
            Text(dayAbbr)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(LunaraColors.primaryText)
                .frame(width: 40, alignment: .leading)
            
            Spacer()
            
            // Schedule slots for this day
            if let daySlots = employeeSchedule.schedule[dayKey], !daySlots.isEmpty {
                VStack(alignment: .trailing, spacing: 4) {
                    ForEach(daySlots, id: \.id) { slot in
                        ScheduleSlotChip(
                            slot: slot,
                            onToggle: onSlotToggled != nil ? {
                                onSlotToggled?(slot.id)
                            } : nil
                        )
                    }
                }
            } else {
                Text("Not available")
                    .font(.system(size: 14))
                    .foregroundColor(LunaraColors.secondaryText)
                    .italic()
            }
        }
        .padding(.vertical, 12)
    }
}

// MARK: - Schedule Slot Chip Component
struct ScheduleSlotChip: View {
    let slot: ScheduleSlot
    let onToggle: (() -> Void)?

    private var localTimeRange: String {
        // Convert UTC times to local for display
        let localTimes = convertBusinessHoursToLocal(
            utcStartTime: slot.startTime,
            utcEndTime: slot.endTime
        )

        if localTimes.spansMidnight {
            return "\(localTimes.startTime) - \(localTimes.endTime) (+1)"
        } else {
            return "\(localTimes.startTime) - \(localTimes.endTime)"
        }
    }

    var body: some View {
        HStack(spacing: 6) {
            Text(localTimeRange)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(slot.active ? LunaraColors.primaryText : LunaraColors.secondaryText)

            if let onToggle = onToggle {
                Button(action: onToggle) {
                    Image(systemName: slot.active ? "eye" : "eye.slash")
                        .font(.system(size: 10))
                        .foregroundColor(slot.active ? LunaraColors.warmGold : LunaraColors.secondaryText)
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            slot.active ?
            LunaraColors.warmGold.opacity(0.1) :
            LunaraColors.charcoalGray.opacity(0.1)
        )
        .cornerRadius(6)
        .opacity(slot.active ? 1.0 : 0.6)
    }

    /// Convert UTC business hours to local timezone for display
    private func convertBusinessHoursToLocal(utcStartTime: String, utcEndTime: String) -> (startTime: String, endTime: String, spansMidnight: Bool) {
        let calendar = Calendar.current
        let today = Date()

        // Parse UTC time strings
        guard let startComponents = parseTimeString(utcStartTime),
              let endComponents = parseTimeString(utcEndTime) else {
            return (startTime: utcStartTime, endTime: utcEndTime, spansMidnight: false)
        }

        // Create UTC Date objects
        let utcCalendar = Calendar(identifier: .gregorian)
        var utcStartComponents = utcCalendar.dateComponents([.year, .month, .day], from: today)
        utcStartComponents.timeZone = TimeZone(identifier: "UTC")
        utcStartComponents.hour = startComponents.hour
        utcStartComponents.minute = startComponents.minute

        var utcEndComponents = utcCalendar.dateComponents([.year, .month, .day], from: today)
        utcEndComponents.timeZone = TimeZone(identifier: "UTC")
        utcEndComponents.hour = endComponents.hour
        utcEndComponents.minute = endComponents.minute

        guard let startDateUTC = utcCalendar.date(from: utcStartComponents),
              var endDateUTC = utcCalendar.date(from: utcEndComponents) else {
            return (startTime: utcStartTime, endTime: utcEndTime, spansMidnight: false)
        }

        // Handle cross-midnight in UTC
        if endDateUTC <= startDateUTC {
            endDateUTC = utcCalendar.date(byAdding: .day, value: 1, to: endDateUTC) ?? endDateUTC
        }

        // Convert to local timezone
        let localFormatter = DateFormatter()
        localFormatter.timeZone = TimeZone.current
        localFormatter.dateFormat = "HH:mm"

        let localStartTime = localFormatter.string(from: startDateUTC)
        let localEndTime = localFormatter.string(from: endDateUTC)

        // Check if the local times span midnight
        let localStartDate = calendar.startOfDay(for: startDateUTC)
        let localEndDate = calendar.startOfDay(for: endDateUTC)
        let spansMidnight = !calendar.isDate(localStartDate, inSameDayAs: localEndDate)

        return (startTime: localStartTime, endTime: localEndTime, spansMidnight: spansMidnight)
    }

    /// Parse time string in HH:mm format
    private func parseTimeString(_ timeString: String) -> DateComponents? {
        let components = timeString.split(separator: ":")
        guard components.count == 2,
              let hour = Int(components[0]),
              let minute = Int(components[1]),
              hour >= 0 && hour <= 23,
              minute >= 0 && minute <= 59 else {
            return nil
        }

        var dateComponents = DateComponents()
        dateComponents.hour = hour
        dateComponents.minute = minute
        return dateComponents
    }
}

#Preview {
    let previewSchedule = EmployeeScheduleData(
        employeeId: "1",
        employeeName: "John Doe",
        employeeEmail: "john@example.com",
        schedule: [
            "MONDAY": [
                ScheduleSlot(
                    id: "1",
                    dayOfWeek: "MONDAY",
                    startTime: "09:00",
                    endTime: "17:00",
                    formattedTimeRange: "09:00 - 17:00",
                    durationMinutes: 480,
                    active: true
                )
            ],
            "TUESDAY": [
                ScheduleSlot(
                    id: "2",
                    dayOfWeek: "TUESDAY",
                    startTime: "09:00",
                    endTime: "17:00",
                    formattedTimeRange: "09:00 - 17:00",
                    durationMinutes: 480,
                    active: true
                )
            ],
            "WEDNESDAY": [],
            "THURSDAY": [
                ScheduleSlot(
                    id: "3",
                    dayOfWeek: "THURSDAY",
                    startTime: "10:00",
                    endTime: "18:00",
                    formattedTimeRange: "10:00 - 18:00",
                    durationMinutes: 480,
                    active: true
                )
            ],
            "FRIDAY": [
                ScheduleSlot(
                    id: "4",
                    dayOfWeek: "FRIDAY",
                    startTime: "09:00",
                    endTime: "15:00",
                    formattedTimeRange: "09:00 - 15:00",
                    durationMinutes: 360,
                    active: true
                )
            ],
            "SATURDAY": [],
            "SUNDAY": []
        ]
    )
    
    EmployeeScheduleCard(
        employeeSchedule: previewSchedule,
        onEditTapped: {},
        onSlotToggled: { slotId in
            print("Toggle slot: \(slotId)")
        }
    )
    .padding()
    .background(LunaraColors.coolLightGray.opacity(0.3))
}
