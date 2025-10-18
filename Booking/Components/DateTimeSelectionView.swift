//
//  DateTimeSelectionView.swift
//  LunaraApp
//
//  Created by Lunara Team on 23/07/2025.
//

import SwiftUI
import Combine

/// Slot state for UI display (matching React frontend behavior)
enum SlotDisplayState: Equatable {
    case available
    case locked(by: String?)
    case booked
    case selected
    case loading

    var isInteractable: Bool {
        switch self {
        case .available, .selected:
            return true
        case .locked, .booked, .loading:
            return false
        }
    }
}

/// Enhanced view for selecting date and time slot with real-time updates
struct DateTimeSelectionView: View {
    // MARK: - Properties
    let shop: Shop
    let service: Service
    let employee: Employee
    let onSlotSelected: (AvailableSlot) -> Void

    // MARK: - Environment
    @EnvironmentObject var bookingState: BookingFlowState
    @EnvironmentObject var authService: AuthenticationService

    // MARK: - State
    @State private var selectedDate = Date()
    @State private var availableSlots: [AvailableSlot] = []
    @State private var isLoadingSlots = false
    @State private var errorMessage: String?
    @State private var selectedSlot: AvailableSlot?
    @State private var showingSlots = false
    @State private var isSubscribedToSlots = false
    @State private var currentSubscriptionTopic: String? // Track current subscription
    @State private var dateAvailability: [String: Bool] = [:] // Date -> hasAvailableSlots mapping
    @State private var isLoadingDateAvailability = true // Start with loading state

    // MARK: - Slot State Management (like React frontend)
    @State private var slotStates: [String: SlotDisplayState] = [:]
    @State private var computedSlotDisplayStates: [String: SlotDisplayState] = [:] // Pre-computed states
    @State private var uiRefreshTrigger: Int = 0 // Force UI refresh when needed

    // MARK: - Services
    private let webSocketService = WebSocketService.shared
    @State private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Computed Properties
    private var dateFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }
    
    private var displayDateFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.dateStyle = .full
        return formatter
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            headerSection

            // Main Content Area - Calendar transforms to Slots
            ZStack {
                // Calendar View
                if !showingSlots {
                    calendarSection
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .scale(scale: 0.95)),
                            removal: .opacity.combined(with: .scale(scale: 1.05))
                        ))
                }

                // Slots View
                if showingSlots {
                    slotsSection
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .scale(scale: 0.95)),
                            removal: .opacity.combined(with: .scale(scale: 1.05))
                        ))
                }
            }
            .animation(.easeInOut(duration: 0.4), value: showingSlots)
        }
        .onAppear {
            setupWebSocketListeners()
            loadDateAvailabilityForMonth(selectedDate, showLoading: true)

            // Check if user has a previously locked slot and restore the view state
            if let existingSlot = bookingState.selectedSlot, bookingState.isSlotLocked {
                selectedSlot = existingSlot

                // Extract date from the existing slot to show the correct date
                if let slotDate = existingSlot.date {
                    selectedDate = slotDate
                    showingSlots = true // Show slots view since user already has a selection

                    // Load slots for this date to show the current state
                    handleDateSelection(slotDate)
                }

                print("🔄 Restored previously locked slot: \(existingSlot.formattedTime)")
            }

            // Don't automatically subscribe to slots or load slots unless restoring state
            // User must explicitly select a date to proceed (like React frontend)
        }
        .onDisappear {
            cleanupSlotSubscriptions()
        }
        .onReceive(webSocketService.slotUpdatePublisher) { update in
            print("📨 DateTimeSelectionView received slot update: \(update)")
            print("📨 Current subscription topic: \(currentSubscriptionTopic ?? "none")")
            print("📨 Update topic would be: slots.\(update.shopId).\(update.serviceId).\(update.employeeId).\(dateFormatter.string(from: selectedDate))")
            handleSlotUpdate(update)
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        VStack(spacing: 16) {

            
            // Title and Description
            VStack(spacing: 8) {
                Text("Pick Date & Time")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text("Choose when you'd like your appointment")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
            }
            

        }
        .padding(.horizontal, 16)
        .padding(.bottom, 16)
    }
    
    // MARK: - Calendar Section
    private var calendarSection: some View {
        VStack(spacing: 16) {
            // Custom Calendar with loading state
            calendarView
            .frame(minHeight: 320)
            .padding(.horizontal, 16)
        }
        .frame(minHeight: 400) // Consistent height for smooth transition
    }

    // MARK: - Calendar View
    @ViewBuilder
    private var calendarView: some View {
        if isLoadingDateAvailability {
            // Show loading placeholder for calendar
            VStack(spacing: 16) {
                // Month header placeholder
                HStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(LunaraColors.coolLightGray.opacity(0.3))
                        .frame(width: 30, height: 30)

                    Spacer()

                    RoundedRectangle(cornerRadius: 8)
                        .fill(LunaraColors.coolLightGray.opacity(0.3))
                        .frame(width: 120, height: 20)

                    Spacer()

                    RoundedRectangle(cornerRadius: 8)
                        .fill(LunaraColors.coolLightGray.opacity(0.3))
                        .frame(width: 30, height: 30)
                }
                .padding(.horizontal, 20)

                // Calendar grid placeholder
                LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: 8) {
                    ForEach(0..<42, id: \.self) { _ in
                        RoundedRectangle(cornerRadius: 8)
                            .fill(LunaraColors.coolLightGray.opacity(0.2))
                            .frame(height: 40)
                    }
                }
                .padding(.horizontal, 20)
            }
            .padding(.vertical, 20)
            .redacted(reason: .placeholder)
        } else {
            CustomCalendarView(
                selectedDate: $selectedDate,
                onDateSelected: { date in
                    handleDateSelection(date)
                },
                unavailableDates: getUnavailableDatesFromAvailability(),
                onMonthChanged: { newMonth in
                    // Don't show loading state when navigating months if we already have data
                    loadDateAvailabilityForMonth(newMonth, showLoading: false)
                }
            )
        }
    }

    // MARK: - Slots Section
    private var slotsSection: some View {
        VStack(spacing: 16) {
            // Available Times Header with Back Button
            VStack(spacing: 12) {
                HStack {
                    Button(action: {
                        withAnimation(.easeInOut(duration: 0.4)) {
                            showingSlots = false
                        }
                    }) {
                        HStack(spacing: 6) {
                            Image(systemName: "chevron.left")
                                .font(.system(size: 14, weight: .semibold))
                            Text("Change Date")
                                .font(.system(size: 14, weight: .medium))
                        }
                        .foregroundColor(LunaraColors.warmGold)
                    }

                    Spacer()
                }

                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Available Times")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(LunaraColors.primaryText)

                        Text(displayDateFormatter.string(from: selectedDate))
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(LunaraColors.secondaryText)
                    }

                    Spacer()

                    Text("\(availableSlots.count) slots")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(LunaraColors.coolLightGray.opacity(0.5))
                        .cornerRadius(12)
                }
            }
            .padding(.horizontal, 16)
            
            // Slots Content
            if isLoadingSlots {
                loadingSlotsView
            } else if let errorMessage = errorMessage {
                errorSlotsView(errorMessage)
            } else if availableSlots.isEmpty {
                noSlotsView
            } else {
                availableSlotsView
            }
        }
        .frame(minHeight: 400) // Match calendar area height for smooth transition
    }
    
    // MARK: - Available Slots View
    private var availableSlotsView: some View {
        ScrollView {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: 12) {
                ForEach(availableSlots) { slot in
                    TimeSlotButton(
                        slot: slot,
                        isSelected: selectedSlot?.id == slot.id,
                        displayState: getSlotDisplayState(for: slot),
                        onTap: {
                            selectedSlot = slot
                            handleSlotSelection(slot)
                        }
                    )
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 32)
        }
        .id(uiRefreshTrigger) // Force refresh when trigger changes
        .onAppear {
            // Pre-compute all slot display states when view appears
            Task { @MainActor in
                updateAllSlotDisplayStates()
            }
        }
        .onChange(of: availableSlots) { _, _ in
            // Update computed states when slots change
            Task { @MainActor in
                updateAllSlotDisplayStates()
            }
        }
        .onChange(of: selectedSlot) { _, _ in
            // Update computed states when selection changes
            Task { @MainActor in
                updateAllSlotDisplayStates()
            }
        }
        .onChange(of: slotStates) { _, _ in
            // Update computed states when slot states change
            Task { @MainActor in
                updateAllSlotDisplayStates()
            }
        }
    }
    
    // MARK: - Loading Slots View
    private var loadingSlotsView: some View {
        VStack(spacing: 16) {
            Spacer()
            
            ProgressView()
                .scaleEffect(1.2)
            
            Text("Loading available times...")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.secondaryText)
            
            Spacer()
        }
    }
    
    // MARK: - Error Slots View
    private func errorSlotsView(_ message: String) -> some View {
        VStack(spacing: 24) {
            Spacer()
            
            Image(systemName: "clock.badge.exclamationmark")
                .font(.system(size: 64))
                .foregroundColor(LunaraColors.secondaryText.opacity(0.6))
            
            VStack(spacing: 12) {
                Text("Unable to Load Times")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text(message)
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
            
            Button("Try Again") {
                loadSlotsForDate(selectedDate)
            }
            .buttonStyle(PrimaryButtonStyle())
            
            Spacer()
        }
    }
    
    // MARK: - No Slots View
    private var noSlotsView: some View {
        VStack(spacing: 24) {
            Spacer()
            
            Image(systemName: "calendar.badge.exclamationmark")
                .font(.system(size: 64))
                .foregroundColor(LunaraColors.secondaryText.opacity(0.6))
            
            VStack(spacing: 12) {
                Text("No Times Available")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text("There are no available appointment times for this date. Please try a different date.")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
            

            
            Spacer()
        }
    }
    
    // MARK: - Private Methods

    /// Get display state for a slot (uses pre-computed states when available)
    private func getSlotDisplayState(for slot: AvailableSlot) -> SlotDisplayState {
        let slotKey = generateSlotKey(for: slot)

        // Return pre-computed state if available (no state modification during view update)
        if let computedState = computedSlotDisplayStates[slotKey] {
            return computedState
        }

        // Fallback to direct computation (should rarely happen after pre-computation)
        return computeSlotDisplayState(for: slot)
    }

    /// Compute display state for a slot (like React frontend)
    private func computeSlotDisplayState(for slot: AvailableSlot) -> SlotDisplayState {
        // Check if this is the user's selected slot first (highest priority)
        if selectedSlot?.id == slot.id {
            return .selected
        }

        // Check if this slot matches the user's locked slot from booking state
        if let userLockedSlot = bookingState.selectedSlot,
           bookingState.isSlotLocked,
           slot.dateTime == userLockedSlot.dateTime {
            return .selected
        }

        // Check if we have a specific state for this slot
        let slotKey = generateSlotKey(for: slot)
        if let state = slotStates[slotKey] {
            return state
        }

        // Check slot's intrinsic properties
        if slot.locked {
            return .locked(by: slot.lockedBy)
        } else if !slot.available {
            return .booked
        } else {
            return .available
        }
    }

    /// Update all pre-computed slot display states (called outside of view updates)
    private func updateAllSlotDisplayStates() {
        print("🔄 Pre-computing slot display states for \(availableSlots.count) slots")

        // Create new computed states dictionary
        var newComputedStates: [String: SlotDisplayState] = [:]

        // Pre-compute states for all available slots
        for slot in availableSlots {
            let slotKey = generateSlotKey(for: slot)
            let state = computeSlotDisplayState(for: slot)
            newComputedStates[slotKey] = state
        }

        // Update the state in one operation
        computedSlotDisplayStates = newComputedStates

        print("🔄 Pre-computed \(computedSlotDisplayStates.count) slot display states")
    }

    /// Generate slot key for state tracking (like React frontend)
    private func generateSlotKey(for slot: AvailableSlot) -> String {
        return "\(shop.id)-\(service.id)-\(employee.id)-\(slot.dateTime)"
    }

    /// Find slot by matching datetime with timezone handling
    private func findSlotByDateTime(_ targetDateTime: String) -> (slot: AvailableSlot, index: Int)? {
        // First try exact match
        if let index = availableSlots.firstIndex(where: { $0.dateTime == targetDateTime }) {
            return (availableSlots[index], index)
        }

        // If no exact match, try parsing both dates and comparing
        let formatter = ISO8601DateFormatter()
        guard let targetDate = formatter.date(from: targetDateTime) else {
            print("⚠️ Could not parse target dateTime: \(targetDateTime)")
            return nil
        }

        for (index, slot) in availableSlots.enumerated() {
            if let slotDate = formatter.date(from: slot.dateTime) {
                // Compare dates with small tolerance (1 second) to account for formatting differences
                if abs(targetDate.timeIntervalSince(slotDate)) < 1.0 {
                    print("🎯 Found slot by date comparison: \(slot.dateTime) matches \(targetDateTime)")
                    return (slot, index)
                }
            }
        }

        print("⚠️ No slot found for dateTime: \(targetDateTime)")
        print("⚠️ Available slot dateTimes: \(availableSlots.map { $0.dateTime })")
        return nil
    }

    private func handleDateSelection(_ date: Date) {
        // Unsubscribe from previous date if we were subscribed
        if isSubscribedToSlots {
            unsubscribeFromSlotUpdates()
        }

        // Clear previous slot states when changing dates
        slotStates.removeAll()

        // Update selected date
        selectedDate = date

        // Subscribe to slot updates for the new date (like React frontend)
        subscribeToSlotUpdates()

        // Load slots for the selected date
        loadSlotsForDate(date)

        // Smooth transition to slots view
        withAnimation(.easeInOut(duration: 0.4)) {
            showingSlots = true
        }

        print("📅 Date selected: \(dateFormatter.string(from: date)) - subscribed to slot updates")
    }

    private func loadSlotsForDate(_ date: Date) {
        isLoadingSlots = true
        errorMessage = nil
        
        let dateString = dateFormatter.string(from: date)
        
        Task {
            do {
                let slots = try await APIClient.shared.getAvailableSlots(
                    shopId: shop.id,
                    serviceId: service.id,
                    employeeId: employee.id,
                    date: dateString
                )
                
                await MainActor.run {
                    // Include all available slots (including locked ones for real-time updates)
                    // Only filter out truly unavailable/booked slots
                    let displayableSlots = slots.filter { $0.available }
                    var uniqueSlots: [AvailableSlot] = []
                    var seenIds = Set<String>()

                    for slot in displayableSlots {
                        if !seenIds.contains(slot.id) {
                            uniqueSlots.append(slot)
                            seenIds.insert(slot.id)
                        }
                    }

                    self.availableSlots = uniqueSlots
                    self.isLoadingSlots = false

                    // Pre-compute display states for new slots
                    self.updateAllSlotDisplayStates()

                    // Debug: Log the first few slot times for timezone verification
                    print("🕐 Loaded \(uniqueSlots.count) slots for date \(dateString)")
                    for slot in uniqueSlots.prefix(3) {
                        let lockStatus = slot.locked ? "LOCKED by \(slot.lockedBy ?? "unknown")" : "available"
                        print("🕐 Slot: \(slot.formattedTime) -> dateTime: \(slot.dateTime) (\(lockStatus))")
                    }
                }
                
            } catch {
                await MainActor.run {
                    self.errorMessage = "Failed to load available times: \(error.localizedDescription)"
                    self.isLoadingSlots = false
                }
            }
        }
    }

    private func loadDateAvailabilityForMonth(_ month: Date, showLoading: Bool = true) {
        if showLoading {
            isLoadingDateAvailability = true
        }

        Task {
            await MainActor.run {
                // Clear previous availability data
                self.dateAvailability.removeAll()
            }

            // Get month info
            let calendar = Calendar.current
            let today = Date()
            let currentMonth = month

            guard let monthInterval = calendar.dateInterval(of: .month, for: currentMonth) else {
                await MainActor.run {
                    self.isLoadingDateAvailability = false
                }
                return
            }

            let startOfMonth = monthInterval.start
            let endOfMonth = monthInterval.end

            // Generate all dates in the current month
            var dateComponents = calendar.dateComponents([.year, .month, .day], from: startOfMonth)
            var dates: [Date] = []

            while let date = calendar.date(from: dateComponents), date < endOfMonth {
                // Only check dates from today onwards
                if calendar.compare(date, to: today, toGranularity: .day) != .orderedAscending {
                    dates.append(date)
                }
                dateComponents.day! += 1
            }

            // Check availability for each date (like React frontend)
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"

            var availability: [String: Bool] = [:]

            for date in dates {
                let dateString = dateFormatter.string(from: date)

                do {
                    let slots = try await APIClient.shared.getAvailableSlots(
                        shopId: shop.id,
                        serviceId: service.id,
                        employeeId: employee.id,
                        date: dateString
                    )

                    // Date is available if there are any available slots
                    availability[dateString] = !slots.isEmpty

                } catch {
                    // If API call fails, mark date as unavailable
                    availability[dateString] = false
                    print("⚠️ Failed to check availability for \(dateString): \(error.localizedDescription)")
                }
            }

            await MainActor.run {
                self.dateAvailability = availability
                self.isLoadingDateAvailability = false

                let availableDates = availability.filter { $0.value }.count
                let totalDates = availability.count
                print("📅 Loaded availability for \(totalDates) dates, \(availableDates) available for employee \(employee.fullName)")
            }
        }
    }

    private func getUnavailableDatesFromAvailability() -> Set<String> {
        return Set(dateAvailability.compactMap { key, hasSlots in
            hasSlots ? nil : key
        })
    }

    private func handleSlotSelection(_ slot: AvailableSlot) {
        // Check if this slot is already locked by the user
        if let userLockedSlot = bookingState.selectedSlot,
           bookingState.isSlotLocked,
           slot.dateTime == userLockedSlot.dateTime {
            // User clicked on their already locked slot - proceed to next step
            print("🔄 User selected their already locked slot - proceeding to next step")
            selectedSlot = slot
            onSlotSelected(slot)
            return
        }

        // Set the slot in booking state first, then lock it
        Task {
            await MainActor.run {
                // Set the slot in booking state so lockSlot() can access it
                bookingState.selectedSlot = slot
            }

            // Now try to lock the slot
            let success = await bookingState.lockSlot()
            if success {
                await MainActor.run {
                    // Keep WebSocket subscription active so user can see real-time updates if they come back
                    // Don't unsubscribe here - let the view handle it when it disappears

                    // Call the callback to proceed to next step
                    self.onSlotSelected(slot)
                }
            } else {
                await MainActor.run {
                    // Clear the slot if locking failed
                    bookingState.selectedSlot = nil
                    selectedSlot = nil
                }
            }
        }
    }

    // MARK: - WebSocket Methods

    private func setupWebSocketListeners() {
        // Only setup connection state listeners, don't auto-subscribe to slots
        // Subscription will happen when user selects a date (like React frontend)

        // Listen for connection state changes to retry subscription if needed
        webSocketService.$isConnected
            .sink { isConnected in
                if isConnected && self.isSubscribedToSlots {
                    // WebSocket just connected, re-subscribe if we were previously subscribed
                    self.subscribeToSlotUpdates()
                }
            }
            .store(in: &cancellables)
    }

    private func cleanupSlotSubscriptions() {
        unsubscribeFromSlotUpdates()
        cancellables.removeAll()
        isSubscribedToSlots = false
    }

    private func subscribeToSlotUpdates() {
        // Only subscribe if WebSocket is connected
        guard webSocketService.isConnected else {
            print("WebSocket not connected - skipping slot subscription")
            return
        }

        let dateString = dateFormatter.string(from: selectedDate)
        let newTopic = "slots.\(shop.id).\(service.id).\(employee.id).\(dateString)"

        // Check if we're already subscribed to this exact topic
        if currentSubscriptionTopic == newTopic && isSubscribedToSlots {
            print("📡 Already subscribed to topic: \(newTopic)")
            return
        }

        // Unsubscribe from previous topic if different
        if let previousTopic = currentSubscriptionTopic, previousTopic != newTopic {
            print("📡 Unsubscribing from previous topic: \(previousTopic)")
            unsubscribeFromSlotUpdates()
        }

        // Use the same topic format as React frontend: slots.{shopId}.{serviceId}.{employeeId}.{date}
        webSocketService.subscribeToSlots(
            shopId: shop.id,
            serviceId: service.id,
            employeeId: employee.id,
            date: dateString
        )

        isSubscribedToSlots = true
        currentSubscriptionTopic = newTopic
        print("📡 Subscribed to slot updates for date: \(dateString) (auth: \(authService.isAuthenticated))")
        print("📡 Topic: \(newTopic)")
    }

    private func unsubscribeFromSlotUpdates() {
        // Only unsubscribe if WebSocket is connected and we were subscribed
        guard webSocketService.isConnected && isSubscribedToSlots else {
            print("WebSocket not connected or not subscribed - skipping slot unsubscription")
            isSubscribedToSlots = false
            currentSubscriptionTopic = nil
            return
        }

        let dateString = dateFormatter.string(from: selectedDate)
        webSocketService.unsubscribeFromSlots(
            shopId: shop.id,
            serviceId: service.id,
            employeeId: employee.id,
            date: dateString
        )

        isSubscribedToSlots = false
        let previousTopic = currentSubscriptionTopic
        currentSubscriptionTopic = nil
        print("📡 Unsubscribed from slot updates for topic: \(previousTopic ?? "unknown")")
    }

    private func handleSlotUpdate(_ update: SlotUpdateMessage) {
        // Check if the update is relevant to current selection
        guard update.shopId == shop.id,
              update.serviceId == service.id,
              update.employeeId == employee.id else {
            print("📨 Ignoring slot update for different shop/service/employee")
            return
        }

        print("📨 Processing slot update: \(update.type.rawValue) for \(update.dateTime)")
        print("📨 Update details: shopId=\(update.shopId), serviceId=\(update.serviceId), employeeId=\(update.employeeId), userId=\(update.userId ?? "nil")")

        // Ensure we're on the main thread for UI updates
        DispatchQueue.main.async {
            // Generate slot key for state tracking
            let slotKey = "\(self.shop.id)-\(self.service.id)-\(self.employee.id)-\(update.dateTime)"
            print("🔑 Generated slot key: \(slotKey)")

            // Find the slot that's being updated using timezone-aware matching
            if let (slot, slotIndex) = self.findSlotByDateTime(update.dateTime) {
                print("✅ Found matching slot at index \(slotIndex): \(slot.formattedTime) for update dateTime: \(update.dateTime)")

                // Update the available slots and slot states based on the update (like React frontend)
                // Use withAnimation to ensure UI updates are visible
                withAnimation(.easeInOut(duration: 0.3)) {

                    switch update.type {
                    case .locked:
                        print("🔒 Slot locked by user: \(update.userId ?? "unknown")")

                        // Update slot state for UI (this should trigger immediate UI update)
                        self.slotStates[slotKey] = .locked(by: update.userId)

                        // Update the slot data but keep it in the list (don't remove it)
                        let updatedSlot = AvailableSlot(
                            id: slot.id,
                            dateTime: slot.dateTime,
                            available: false, // Mark as not available when locked
                            locked: true,
                            lockedBy: update.userId,
                            price: slot.price
                        )
                        self.availableSlots[slotIndex] = updatedSlot

                        print("🔒 Slot state updated to locked, UI should refresh now")

                    case .unlocked:
                        print("🔓 Slot unlocked")

                        // Update slot state for UI
                        self.slotStates[slotKey] = .available

                        // Update the slot data
                        let updatedSlot = AvailableSlot(
                            id: slot.id,
                            dateTime: slot.dateTime,
                            available: true, // Mark as available when unlocked
                            locked: false,
                            lockedBy: nil,
                            price: slot.price
                        )
                        self.availableSlots[slotIndex] = updatedSlot

                        print("🔓 Slot state updated to available, UI should refresh now")

                    case .booked:
                        print("📅 Slot permanently booked")

                        // Remove slot from available list (like React frontend)
                        self.availableSlots.removeAll { $0.dateTime == update.dateTime }

                        // Remove from slot states
                        self.slotStates.removeValue(forKey: slotKey)

                        // If this was our selected slot, clear it
                        if self.selectedSlot?.dateTime == update.dateTime {
                            self.selectedSlot = nil
                            self.bookingState.selectedSlot = nil
                            self.errorMessage = "The selected time slot was just booked by another customer. Please choose a different time."
                        }

                        print("📅 Slot removed from list, UI should refresh now")
                    }
                }

                // Update pre-computed display states and force UI refresh after all updates
                self.updateAllSlotDisplayStates()
                self.uiRefreshTrigger += 1

            } else {
                print("⚠️ Slot not found in availableSlots for dateTime: \(update.dateTime)")
                print("⚠️ Available slots count: \(self.availableSlots.count)")
                print("⚠️ Available slot dateTimes: \(self.availableSlots.map { $0.dateTime })")

                // Try to parse and log the times for debugging
                let formatter = ISO8601DateFormatter()
                if let updateDate = formatter.date(from: update.dateTime) {
                    print("⚠️ Update time parsed as: \(updateDate)")
                    for slot in self.availableSlots.prefix(3) {
                        if let slotDate = formatter.date(from: slot.dateTime) {
                            print("⚠️ Slot \(slot.formattedTime) dateTime: \(slot.dateTime) -> \(slotDate)")
                        }
                    }
                }

                // For locked slots, we still want to track the state even if slot isn't in our list
                if update.type == .locked {
                    print("🔒 Adding locked state for slot not in our list")
                    self.slotStates[slotKey] = .locked(by: update.userId)
                    // Update pre-computed display states and force UI refresh
                    self.updateAllSlotDisplayStates()
                    self.uiRefreshTrigger += 1
                }
            }
        }
    }
}



// MARK: - Time Slot Button Component
struct TimeSlotButton: View {
    let slot: AvailableSlot
    let isSelected: Bool
    let displayState: SlotDisplayState
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 4) {
                // Time display
                Text(slot.formattedTime)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(textColor)

                // Status label (like React frontend)
                Text(statusLabel)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(statusTextColor)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(
                        RoundedRectangle(cornerRadius: 4)
                            .fill(statusBackgroundColor)
                    )

                // Removed price display to clean up the UI
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .fill(backgroundColor)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(borderColor, lineWidth: 1)
                    )
            )
            .scaleEffect(isSelected ? 1.05 : 1.0)
            .animation(.easeInOut(duration: 0.2), value: isSelected)
            .animation(.easeInOut(duration: 0.3), value: displayState) // Animate state changes
        }
        .buttonStyle(PlainButtonStyle())
        .disabled(!displayState.isInteractable)
        .opacity(displayState.isInteractable ? 1.0 : 0.6)
        .onAppear {
            print("🎯 TimeSlotButton for \(slot.formattedTime) appeared with state: \(displayState)")
        }
        .onChange(of: displayState) { _, newState in
            print("🎯 TimeSlotButton for \(slot.formattedTime) state changed to: \(newState)")
        }
    }

    // MARK: - Computed Properties (like React frontend styling)

    private var backgroundColor: Color {
        switch displayState {
        case .selected:
            return LunaraColors.warmGold
        case .locked:
            return LunaraColors.coolLightGray // Use consistent gray background like booked slots
        case .booked:
            return LunaraColors.coolLightGray
        case .loading:
            return Color.blue.opacity(0.1)
        case .available:
            return LunaraColors.white
        }
    }

    private var borderColor: Color {
        switch displayState {
        case .selected:
            return LunaraColors.warmGold
        case .locked:
            return LunaraColors.coolLightGray // Use consistent gray border
        case .booked:
            return LunaraColors.coolLightGray
        case .loading:
            return Color.blue.opacity(0.3)
        case .available:
            return LunaraColors.coolLightGray
        }
    }

    private var textColor: Color {
        switch displayState {
        case .selected:
            return LunaraColors.white
        case .locked:
            return LunaraColors.secondaryText // Use consistent secondary text color
        case .booked:
            return LunaraColors.secondaryText
        case .loading:
            return Color.blue
        case .available:
            return LunaraColors.primaryText
        }
    }

    private var statusLabel: String {
        switch displayState {
        case .selected:
            return "SELECTED"
        case .locked:
            return "LOCKED"
        case .booked:
            return "BOOKED"
        case .loading:
            return "LOADING"
        case .available:
            return "AVAILABLE"
        }
    }

    private var statusTextColor: Color {
        switch displayState {
        case .selected:
            return LunaraColors.white
        case .locked:
            return LunaraColors.secondaryText // Use consistent secondary text color
        case .booked:
            return LunaraColors.secondaryText
        case .loading:
            return Color.blue
        case .available:
            return LunaraColors.secondaryText
        }
    }

    private var statusBackgroundColor: Color {
        switch displayState {
        case .selected:
            return LunaraColors.warmGold.opacity(0.3)
        case .locked:
            return LunaraColors.coolLightGray.opacity(0.5) // Use consistent gray background
        case .booked:
            return LunaraColors.coolLightGray.opacity(0.5)
        case .loading:
            return Color.blue.opacity(0.1)
        case .available:
            return Color.clear
        }
    }


}

// MARK: - Preview
struct DateTimeSelectionView_Previews: PreviewProvider {
    static var previews: some View {
        DateTimeSelectionView(
            shop: Shop.preview,
            service: Service.preview,
            employee: Employee.preview,
            onSlotSelected: { _ in }
        )
        .environmentObject(BookingFlowState())
    }
}
