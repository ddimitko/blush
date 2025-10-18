//
//  AvailabilityInsightsSection.swift
//  LunaraApp
//
//  Created by Lunara Team on 28/07/2025.
//

import SwiftUI

struct AvailabilityInsightsSection: View {
    let shop: Shop
    @State private var availabilityData: AvailabilityInsights?
    @State private var isLoading = true
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Section Header
            HStack {
                Text("Availability")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
                
                // Live indicator
                HStack(spacing: 4) {
                    Circle()
                        .fill(LunaraColors.success)
                        .frame(width: 6, height: 6)
                    
                    Text("Live")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(LunaraColors.success)
                }
            }
            
            if isLoading {
                availabilitySkeletonView
            } else if let data = availabilityData {
                VStack(spacing: 16) {
                    // Quick booking options
                    quickBookingSection(data: data)
                    
                    // Availability timeline
                    availabilityTimelineSection(data: data)
                    
                    // Busy times insight
                    busyTimesSection(data: data)
                }
            } else {
                unavailableView
            }
        }
        .onAppear {
            loadAvailabilityData()
        }
    }
    
    // MARK: - Quick Booking Section
    private func quickBookingSection(data: AvailabilityInsights) -> some View {
        VStack(spacing: 12) {
            if let nextSlot = data.nextAvailableSlot {
                quickBookingCard(
                    title: "Next Available",
                    time: nextSlot.formattedTime,
                    date: nextSlot.formattedDate,
                    type: .next,
                    action: {
                        // TODO: Quick book next available slot
                    }
                )
            }
            
            if let todaySlot = data.nextTodaySlot {
                quickBookingCard(
                    title: "Today",
                    time: todaySlot.formattedTime,
                    date: "Today",
                    type: .today,
                    action: {
                        // TODO: Quick book today slot
                    }
                )
            }
            
            if let tomorrowSlot = data.nextTomorrowSlot {
                quickBookingCard(
                    title: "Tomorrow",
                    time: tomorrowSlot.formattedTime,
                    date: "Tomorrow",
                    type: .tomorrow,
                    action: {
                        // TODO: Quick book tomorrow slot
                    }
                )
            }
        }
    }
    
    private func quickBookingCard(title: String, time: String, date: String, type: QuickBookingType, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)
                    
                    Text(time)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    Text(date)
                        .font(.system(size: 12))
                        .foregroundColor(LunaraColors.secondaryText)
                }
                
                Spacer()
                
                Image(systemName: "arrow.right.circle.fill")
                    .font(.system(size: 24))
                    .foregroundColor(type.color)
            }
            .padding(16)
            .background(type.backgroundColor)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(type.borderColor, lineWidth: 1)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    // MARK: - Availability Timeline Section
    private func availabilityTimelineSection(data: AvailabilityInsights) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Next 7 Days")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(data.weeklyAvailability, id: \.date) { dayData in
                        availabilityDayCard(dayData: dayData)
                    }
                }
                .padding(.horizontal, 20)
            }
            .padding(.horizontal, -20)
        }
    }
    
    private func availabilityDayCard(dayData: DayAvailability) -> some View {
        VStack(spacing: 8) {
            Text(dayData.dayName)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(LunaraColors.secondaryText)
            
            Text(dayData.dateString)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            VStack(spacing: 4) {
                availabilityIndicator(level: dayData.availabilityLevel)
                
                Text("\(dayData.availableSlots) slots")
                    .font(.system(size: 10))
                    .foregroundColor(LunaraColors.secondaryText)
            }
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 16)
        .background(LunaraColors.cardBackground)
        .cornerRadius(12)
        .shadow(color: LunaraColors.cardShadow, radius: 2, x: 0, y: 1)
    }
    
    private func availabilityIndicator(level: AvailabilityLevel) -> some View {
        HStack(spacing: 2) {
            ForEach(0..<3, id: \.self) { index in
                Rectangle()
                    .fill(index < level.rawValue ? level.color : LunaraColors.coolLightGray)
                    .frame(width: 4, height: 12)
                    .cornerRadius(2)
            }
        }
    }
    
    // MARK: - Busy Times Section
    private func busyTimesSection(data: AvailabilityInsights) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Best Times to Book")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            VStack(spacing: 8) {
                busyTimeRow(
                    icon: "sun.max",
                    title: "Morning (9-12 PM)",
                    description: "Usually available",
                    level: .low,
                    iconColor: LunaraColors.warmGold
                )
                
                busyTimeRow(
                    icon: "sun.haze",
                    title: "Afternoon (12-5 PM)",
                    description: "Moderately busy",
                    level: .medium,
                    iconColor: .orange
                )
                
                busyTimeRow(
                    icon: "moon",
                    title: "Evening (5-8 PM)",
                    description: "Very busy",
                    level: .high,
                    iconColor: .purple
                )
            }
        }
    }
    
    private func busyTimeRow(icon: String, title: String, description: String, level: AvailabilityLevel, iconColor: Color) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(iconColor)
                .frame(width: 20)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text(description)
                    .font(.system(size: 12))
                    .foregroundColor(level.textColor)
            }
            
            Spacer()
            
            availabilityIndicator(level: level)
        }
        .padding(.vertical, 4)
    }
    
    // MARK: - Skeleton and Empty Views
    private var availabilitySkeletonView: some View {
        VStack(spacing: 16) {
            // Quick booking skeleton
            VStack(spacing: 8) {
                ForEach(0..<2, id: \.self) { _ in
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(height: 60)
                        .cornerRadius(12)
                }
            }
            
            // Timeline skeleton
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(0..<7, id: \.self) { _ in
                        Rectangle()
                            .fill(LunaraColors.coolLightGray)
                            .frame(width: 80, height: 100)
                            .cornerRadius(12)
                    }
                }
                .padding(.horizontal, 20)
            }
            .padding(.horizontal, -20)
        }
        .redacted(reason: .placeholder)
    }
    
    private var unavailableView: some View {
        VStack(spacing: 12) {
            Image(systemName: "calendar.badge.exclamationmark")
                .font(.system(size: 40))
                .foregroundColor(LunaraColors.secondaryText)
            
            Text("Availability information unavailable")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.primaryText)
            
            Text("Please contact the shop directly for booking")
                .font(.system(size: 14))
                .foregroundColor(LunaraColors.secondaryText)
                .multilineTextAlignment(.center)
        }
        .padding(.vertical, 40)
    }
    
    // MARK: - Private Methods
    private func loadAvailabilityData() {
        Task {
            // TODO: Implement API call to get real-time availability
            try? await Task.sleep(nanoseconds: 1_000_000_000) // Simulate network delay
            
            await MainActor.run {
                availabilityData = AvailabilityInsights.preview
                isLoading = false
            }
        }
    }
}

// MARK: - Supporting Models
struct AvailabilityInsights {
    let nextAvailableSlot: AvailableSlot?
    let nextTodaySlot: AvailableSlot?
    let nextTomorrowSlot: AvailableSlot?
    let weeklyAvailability: [DayAvailability]
    let busyTimes: [BusyTimeInfo]
    
    static let preview = AvailabilityInsights(
        nextAvailableSlot: AvailableSlot(
            id: "next-1",
            dateTime: "2025-07-28T14:30:00",
            available: true,
            locked: false,
            lockedBy: nil,
            price: 75.0
        ),
        nextTodaySlot: AvailableSlot(
            id: "today-1",
            dateTime: "2025-07-28T16:00:00",
            available: true,
            locked: false,
            lockedBy: nil,
            price: 75.0
        ),
        nextTomorrowSlot: AvailableSlot(
            id: "tomorrow-1",
            dateTime: "2025-07-29T10:00:00",
            available: true,
            locked: false,
            lockedBy: nil,
            price: 75.0
        ),
        weeklyAvailability: DayAvailability.previewWeek,
        busyTimes: []
    )
}

struct DayAvailability {
    let date: String
    let dayName: String
    let dateString: String
    let availableSlots: Int
    let availabilityLevel: AvailabilityLevel
    
    static let previewWeek: [DayAvailability] = [
        DayAvailability(date: "2025-07-28", dayName: "Mon", dateString: "28", availableSlots: 12, availabilityLevel: .high),
        DayAvailability(date: "2025-07-29", dayName: "Tue", dateString: "29", availableSlots: 8, availabilityLevel: .medium),
        DayAvailability(date: "2025-07-30", dayName: "Wed", dateString: "30", availableSlots: 15, availabilityLevel: .high),
        DayAvailability(date: "2025-07-31", dayName: "Thu", dateString: "31", availableSlots: 5, availabilityLevel: .low),
        DayAvailability(date: "2025-08-01", dayName: "Fri", dateString: "1", availableSlots: 3, availabilityLevel: .low),
        DayAvailability(date: "2025-08-02", dayName: "Sat", dateString: "2", availableSlots: 0, availabilityLevel: .none),
        DayAvailability(date: "2025-08-03", dayName: "Sun", dateString: "3", availableSlots: 10, availabilityLevel: .medium)
    ]
}

struct BusyTimeInfo {
    let timeRange: String
    let description: String
    let level: AvailabilityLevel
}

enum AvailabilityLevel: Int, CaseIterable {
    case none = 0
    case low = 1
    case medium = 2
    case high = 3
    
    var color: Color {
        switch self {
        case .none: return LunaraColors.coolLightGray
        case .low: return LunaraColors.error
        case .medium: return .orange
        case .high: return LunaraColors.success
        }
    }
    
    var textColor: Color {
        switch self {
        case .none: return LunaraColors.secondaryText
        case .low: return LunaraColors.error
        case .medium: return .orange
        case .high: return LunaraColors.success
        }
    }
}

enum QuickBookingType {
    case next, today, tomorrow
    
    var color: Color {
        switch self {
        case .next: return LunaraColors.warmGold
        case .today: return LunaraColors.success
        case .tomorrow: return LunaraColors.primaryText
        }
    }
    
    var backgroundColor: Color {
        switch self {
        case .next: return LunaraColors.warmGold.opacity(0.1)
        case .today: return LunaraColors.success.opacity(0.1)
        case .tomorrow: return LunaraColors.coolLightGray.opacity(0.3)
        }
    }
    
    var borderColor: Color {
        switch self {
        case .next: return LunaraColors.warmGold.opacity(0.3)
        case .today: return LunaraColors.success.opacity(0.3)
        case .tomorrow: return LunaraColors.coolLightGray
        }
    }
}

// MARK: - Preview
struct AvailabilityInsightsSection_Previews: PreviewProvider {
    static var previews: some View {
        ScrollView {
            AvailabilityInsightsSection(shop: Shop.preview)
                .padding()
        }
    }
}
