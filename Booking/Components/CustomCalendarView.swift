//
//  CustomCalendarView.swift
//  LunaraApp
//
//  Created by Lunara on 2025-07-24.
//

import SwiftUI

/// Custom calendar component that allows single-tap interaction for both new and already selected dates
struct CustomCalendarView: View {
    // MARK: - Properties
    @Binding var selectedDate: Date
    let onDateSelected: (Date) -> Void
    let unavailableDates: Set<String> // Employee unavailable dates in "yyyy-MM-dd" format
    let onMonthChanged: ((Date) -> Void)? // Optional callback when month changes

    // MARK: - State
    @State private var currentMonth = Date()

    // MARK: - Calendar
    private let calendar = Calendar.current

    // MARK: - Date Formatters
    private let monthYearFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter
    }()

    private let dayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "d"
        return formatter
    }()

    private let unavailableDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    // MARK: - Initializer
    init(selectedDate: Binding<Date>, onDateSelected: @escaping (Date) -> Void, unavailableDates: Set<String> = [], onMonthChanged: ((Date) -> Void)? = nil) {
        self._selectedDate = selectedDate
        self.onDateSelected = onDateSelected
        self.unavailableDates = unavailableDates
        self.onMonthChanged = onMonthChanged
    }

    var body: some View {
        VStack(spacing: 16) {
            // Month/Year Header with Navigation
            monthHeader
            
            // Days of Week Header
            daysOfWeekHeader
            
            // Calendar Grid
            calendarGrid
        }
        .onAppear {
            // Set current month to the selected date's month
            currentMonth = selectedDate
        }
    }
    
    // MARK: - Month Header
    private var monthHeader: some View {
        HStack {
            Button(action: previousMonth) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.warmGold)
            }
            .disabled(isPreviousMonthDisabled)
            .opacity(isPreviousMonthDisabled ? 0.3 : 1.0)
            
            Spacer()
            
            Text(monthYearFormatter.string(from: currentMonth))
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            Spacer()
            
            Button(action: nextMonth) {
                Image(systemName: "chevron.right")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.warmGold)
            }
        }
        .padding(.horizontal, 16)
    }
    
    // MARK: - Days of Week Header
    private var daysOfWeekHeader: some View {
        HStack(spacing: 0) {
            ForEach(calendar.shortWeekdaySymbols, id: \.self) { day in
                Text(day)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)
                    .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal, 16)
    }
    
    // MARK: - Calendar Grid
    private var calendarGrid: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: 8) {
            ForEach(Array(daysInMonth.enumerated()), id: \.offset) { index, date in
                if let date = date {
                    dayCell(for: date)
                } else {
                    // Empty cell for padding
                    Color.clear
                        .frame(height: 40)
                        .id("empty-\(index)")
                }
            }
        }
        .padding(.horizontal, 16)
    }
    
    // MARK: - Day Cell
    private func dayCell(for date: Date) -> some View {
        Button(action: {
            // Always trigger the callback, even for already selected dates
            onDateSelected(date)
        }) {
            Text(dayFormatter.string(from: date))
                .font(.system(size: 16, weight: isSelected(date) ? .semibold : .medium))
                .foregroundColor(textColor(for: date))
                .frame(width: 40, height: 40)
                .background(backgroundColor(for: date))
                .cornerRadius(8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(borderColor(for: date), lineWidth: isSelected(date) ? 2 : 1)
                )
        }
        .disabled(isPastDate(date) || isUnavailableDate(date))
        .scaleEffect(isSelected(date) ? 1.05 : 1.0)
        .animation(.easeInOut(duration: 0.2), value: isSelected(date))
    }
    
    // MARK: - Helper Methods
    
    private var daysInMonth: [Date?] {
        guard let _ = calendar.dateInterval(of: .month, for: currentMonth),
              let firstOfMonth = calendar.dateInterval(of: .month, for: currentMonth)?.start else {
            return []
        }
        
        let firstWeekday = calendar.component(.weekday, from: firstOfMonth)
        let numberOfDaysInMonth = calendar.range(of: .day, in: .month, for: currentMonth)?.count ?? 0
        
        var days: [Date?] = []
        
        // Add empty cells for days before the first day of the month
        for _ in 1..<firstWeekday {
            days.append(nil)
        }
        
        // Add all days of the month
        for day in 1...numberOfDaysInMonth {
            if let date = calendar.date(byAdding: .day, value: day - 1, to: firstOfMonth) {
                days.append(date)
            }
        }
        
        return days
    }
    
    private func isSelected(_ date: Date) -> Bool {
        calendar.isDate(date, inSameDayAs: selectedDate)
    }
    
    private func isToday(_ date: Date) -> Bool {
        calendar.isDate(date, inSameDayAs: Date())
    }
    
    private func isPastDate(_ date: Date) -> Bool {
        calendar.compare(date, to: Date(), toGranularity: .day) == .orderedAscending
    }

    private func isUnavailableDate(_ date: Date) -> Bool {
        let dateString = unavailableDateFormatter.string(from: date)
        return unavailableDates.contains(dateString)
    }

    private func textColor(for date: Date) -> Color {
        if isPastDate(date) || isUnavailableDate(date) {
            return LunaraColors.secondaryText.opacity(0.4)
        } else if isSelected(date) {
            return LunaraColors.white
        } else if isToday(date) {
            return LunaraColors.warmGold
        } else {
            return LunaraColors.primaryText
        }
    }
    
    private func backgroundColor(for date: Date) -> Color {
        if isPastDate(date) || isUnavailableDate(date) {
            return Color.clear
        } else if isSelected(date) {
            return LunaraColors.warmGold
        } else if isToday(date) {
            return LunaraColors.warmGold.opacity(0.1)
        } else {
            return Color.clear
        }
    }
    
    private func borderColor(for date: Date) -> Color {
        if isPastDate(date) || isUnavailableDate(date) {
            return Color.clear
        } else if isSelected(date) {
            return LunaraColors.warmGold
        } else if isToday(date) {
            return LunaraColors.warmGold.opacity(0.3)
        } else {
            return LunaraColors.coolLightGray.opacity(0.3)
        }
    }
    
    private var isPreviousMonthDisabled: Bool {
        let startOfCurrentMonth = calendar.startOfDay(for: calendar.dateInterval(of: .month, for: currentMonth)?.start ?? currentMonth)
        let startOfThisMonth = calendar.startOfDay(for: calendar.dateInterval(of: .month, for: Date())?.start ?? Date())
        return calendar.compare(startOfCurrentMonth, to: startOfThisMonth, toGranularity: .month) == .orderedSame
    }
    
    private func previousMonth() {
        withAnimation(.easeInOut(duration: 0.3)) {
            currentMonth = calendar.date(byAdding: .month, value: -1, to: currentMonth) ?? currentMonth
            onMonthChanged?(currentMonth)
        }
    }

    private func nextMonth() {
        withAnimation(.easeInOut(duration: 0.3)) {
            currentMonth = calendar.date(byAdding: .month, value: 1, to: currentMonth) ?? currentMonth
            onMonthChanged?(currentMonth)
        }
    }
}

// MARK: - Preview
struct CustomCalendarView_Previews: PreviewProvider {
    static var previews: some View {
        CustomCalendarView(
            selectedDate: .constant(Date()),
            onDateSelected: { _ in }
        )
        .padding()
    }
}
