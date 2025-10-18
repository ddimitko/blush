//
//  SlotLockTimer.swift
//  LunaraApp
//
//  Created by Lunara Team on 23/07/2025.
//

import SwiftUI
import Combine

/// Visual countdown timer for slot lock expiration
struct SlotLockTimer: View {
    @ObservedObject var bookingState: BookingFlowState
    let onExpired: () -> Void
    let onExtendRequested: () -> Void
    
    @State private var timeRemaining: TimeInterval = 0
    
    var body: some View {
        if bookingState.isSlotLocked {
            HStack(spacing: 8) {
                // Lock Icon
                Image(systemName: "lock.fill")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(LunaraColors.warmGold)

                // Timer Text
                Text("Slot reserved • Expires in \(formattedTimeRemaining)")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.primaryText)

                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(LunaraColors.coolLightGray)
            .cornerRadius(8)
            .onAppear {
                startTimer()
            }
            .onDisappear {
                stopTimer()
            }
            .onChange(of: bookingState.lockExpirationTime) { _, newExpiration in
                updateTimeRemaining(newExpiration)
            }
            .onReceive(Timer.publish(every: 1, on: .main, in: .common).autoconnect()) { _ in
                if bookingState.isSlotLocked {
                    updateTimeRemaining(bookingState.lockExpirationTime)
                }
            }
        }
    }
    


    
    // MARK: - Computed Properties
    
    private var formattedTimeRemaining: String {
        if timeRemaining <= 0 && bookingState.lockExpirationTime == nil {
            return "Loading..."
        }
        let minutes = Int(timeRemaining) / 60
        let seconds = Int(timeRemaining) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
    

    
    // MARK: - Timer Methods

    private func startTimer() {
        updateTimeRemaining(bookingState.lockExpirationTime)
    }

    private func stopTimer() {
        // Timer stopped
    }

    private func updateTimeRemaining(_ expirationTime: Date?) {
        guard let expirationTime = expirationTime else {
            timeRemaining = 0
            return
        }

        let remaining = expirationTime.timeIntervalSinceNow
        timeRemaining = max(remaining, 0)
        bookingState.lockTimeRemaining = timeRemaining

        // Check if expired
        if timeRemaining <= 0 {
            stopTimer()
            onExpired()
        }
    }
}

// MARK: - Preview
struct SlotLockTimer_Previews: PreviewProvider {
    static var previews: some View {
        let bookingState = BookingFlowState()
        bookingState.isSlotLocked = true
        bookingState.lockExpirationTime = Date().addingTimeInterval(90) // 1.5 minutes
        
        return VStack {
            SlotLockTimer(
                bookingState: bookingState,
                onExpired: {},
                onExtendRequested: {}
            )
            Spacer()
        }
        .padding()
        .background(Color.gray.opacity(0.1))
    }
}
