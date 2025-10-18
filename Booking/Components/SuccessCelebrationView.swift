//
//  SuccessCelebrationView.swift
//  LunaraApp
//
//  Created by Lunara Team on 23/07/2025.
//

import SwiftUI

/// Delightful success celebration animation for booking completion
struct SuccessCelebrationView: View {
    let appointment: Appointment
    let onContinue: () -> Void
    
    @State private var showingCheckmark = false
    @State private var showingContent = false
    @State private var showingConfetti = false
    @State private var pulseAnimation = false
    @State private var sparkleAnimation = false
    
    var body: some View {
        ZStack {
            // Background with subtle gradient
            celebrationBackground
            
            // Confetti Animation
            if showingConfetti {
                confettiAnimation
            }
            
            // Main Content
            VStack(spacing: 32) {
                Spacer()
                
                // Success Animation
                successAnimationSection
                
                // Appointment Details
                if showingContent {
                    appointmentDetailsSection
                        .transition(.opacity.combined(with: .move(edge: .bottom)))
                }
                
                // Quick Actions
                if showingContent {
                    quickActionsSection
                        .transition(.opacity.combined(with: .move(edge: .bottom)))
                }
                
                Spacer()
                
                // Continue Button
                if showingContent {
                    continueButton
                        .transition(.opacity.combined(with: .move(edge: .bottom)))
                }
            }
            .padding(.horizontal, 24)
        }
        .onAppear {
            startCelebrationSequence()
        }
    }
    
    // MARK: - Background
    private var celebrationBackground: some View {
        LinearGradient(
            colors: [
                LunaraColors.warmGold.opacity(0.1),
                LunaraColors.coolLightGray.opacity(0.05),
                Color.white
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }
    
    // MARK: - Success Animation
    private var successAnimationSection: some View {
        VStack(spacing: 24) {
            // Animated Checkmark
            ZStack {
                // Outer Ring
                Circle()
                    .stroke(LunaraColors.success.opacity(0.2), lineWidth: 4)
                    .frame(width: 120, height: 120)
                    .scaleEffect(pulseAnimation ? 1.2 : 1.0)
                    .opacity(pulseAnimation ? 0.3 : 0.8)
                    .animation(.easeInOut(duration: 2.0).repeatForever(autoreverses: true), value: pulseAnimation)
                
                // Inner Circle
                Circle()
                    .fill(LunaraColors.success)
                    .frame(width: 100, height: 100)
                    .scaleEffect(showingCheckmark ? 1.0 : 0.3)
                    .animation(.spring(response: 0.6, dampingFraction: 0.7), value: showingCheckmark)
                
                // Checkmark
                if showingCheckmark {
                    Image(systemName: "checkmark")
                        .font(.system(size: 40, weight: .bold))
                        .foregroundColor(.white)
                        .scaleEffect(showingCheckmark ? 1.0 : 0.3)
                        .animation(.spring(response: 0.8, dampingFraction: 0.6).delay(0.2), value: showingCheckmark)
                }
                
                // Sparkles
                if sparkleAnimation {
                    sparklesOverlay
                }
            }
            
            // Success Message
            if showingContent {
                VStack(spacing: 8) {
                    Text("Booking Confirmed!")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    Text("Your appointment has been successfully booked")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)
                }
            }
        }
    }
    
    // MARK: - Appointment Details
    private var appointmentDetailsSection: some View {
        VStack(spacing: 16) {
            appointmentSummaryCard
            
            // Booking Reference
            bookingReferenceCard
        }
    }
    
    private var appointmentSummaryCard: some View {
        VStack(spacing: 16) {
            // Header
            HStack {
                Image(systemName: "calendar.badge.checkmark")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(LunaraColors.warmGold)
                
                Text("Appointment Details")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
            }
            
            // Details
            VStack(spacing: 12) {
                appointmentDetailRow(
                    icon: "scissors",
                    title: "Service",
                    value: appointment.serviceName
                )
                
                appointmentDetailRow(
                    icon: "person.fill",
                    title: "Staff",
                    value: appointment.employeeName
                )
                
                appointmentDetailRow(
                    icon: "calendar",
                    title: "Date & Time",
                    value: appointment.formattedDateTime
                )
                
                appointmentDetailRow(
                    icon: "creditcard",
                    title: "Total",
                    value: appointment.formattedPrice
                )
            }
        }
        .padding(20)
        .background(LunaraColors.cardBackground)
        .cornerRadius(16)
        .shadow(color: LunaraColors.cardShadow, radius: 8, x: 0, y: 4)
    }
    
    private var bookingReferenceCard: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "number.circle")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.warmGold)
                
                Text("Booking Reference")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
            }
            
            HStack {
                Text(appointment.id.prefix(8).uppercased())
                    .font(.system(size: 18, weight: .bold, design: .monospaced))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
                
                Button(action: copyBookingReference) {
                    HStack(spacing: 4) {
                        Image(systemName: "doc.on.doc")
                            .font(.system(size: 12))
                        Text("Copy")
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundColor(LunaraColors.warmGold)
                }
            }
        }
        .padding(16)
        .background(LunaraColors.coolLightGray.opacity(0.3))
        .cornerRadius(12)
    }
    
    // MARK: - Quick Actions
    private var quickActionsSection: some View {
        VStack(spacing: 12) {
            Text("Quick Actions")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
                .frame(maxWidth: .infinity, alignment: .leading)
            
            HStack(spacing: 12) {
                quickActionButton(
                    icon: "calendar.badge.plus",
                    title: "Add to Calendar",
                    action: addToCalendar
                )
                
                quickActionButton(
                    icon: "square.and.arrow.up",
                    title: "Share",
                    action: shareAppointment
                )
                
                quickActionButton(
                    icon: "phone",
                    title: "Call Shop",
                    action: callShop
                )
            }
        }
    }
    
    // MARK: - Continue Button
    private var continueButton: some View {
        Button(action: onContinue) {
            HStack(spacing: 8) {
                Text("Continue")
                    .font(.system(size: 18, weight: .semibold))
                
                Image(systemName: "arrow.right")
                    .font(.system(size: 16, weight: .semibold))
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(LunaraColors.warmGold)
            .cornerRadius(12)
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    // MARK: - Helper Views
    
    private func appointmentDetailRow(icon: String, title: String, value: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
                .frame(width: 20)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)
                
                Text(value)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
            }
            
            Spacer()
        }
    }
    
    private func quickActionButton(icon: String, title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 20, weight: .medium))
                    .foregroundColor(LunaraColors.warmGold)
                
                Text(title)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(LunaraColors.primaryText)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(LunaraColors.coolLightGray.opacity(0.3))
            .cornerRadius(12)
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    // MARK: - Animations
    
    private var sparklesOverlay: some View {
        ZStack {
            ForEach(0..<8, id: \.self) { index in
                Image(systemName: "sparkle")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(LunaraColors.warmGold)
                    .offset(sparkleOffset(for: index))
                    .opacity(sparkleAnimation ? 1.0 : 0.0)
                    .scaleEffect(sparkleAnimation ? 1.0 : 0.3)
                    .animation(
                        .easeInOut(duration: 1.5)
                        .delay(Double(index) * 0.1)
                        .repeatForever(autoreverses: true),
                        value: sparkleAnimation
                    )
            }
        }
    }
    
    private var confettiAnimation: some View {
        // Simplified confetti representation
        ZStack {
            ForEach(0..<20, id: \.self) { index in
                Rectangle()
                    .fill(confettiColor(for: index))
                    .frame(width: 8, height: 8)
                    .offset(confettiOffset(for: index))
                    .opacity(showingConfetti ? 1.0 : 0.0)
                    .animation(
                        .easeOut(duration: 2.0)
                        .delay(Double(index) * 0.05),
                        value: showingConfetti
                    )
            }
        }
    }
    
    // MARK: - Helper Methods
    
    private func startCelebrationSequence() {
        // Add haptic feedback
        let notification = UINotificationFeedbackGenerator()
        notification.notificationOccurred(.success)
        
        // Animation sequence
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            withAnimation(.spring(response: 0.6, dampingFraction: 0.7)) {
                showingCheckmark = true
            }
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            pulseAnimation = true
            sparkleAnimation = true
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            withAnimation(.easeInOut(duration: 0.8)) {
                showingContent = true
            }
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) {
            withAnimation(.easeInOut(duration: 1.0)) {
                showingConfetti = true
            }
        }
    }
    
    private func sparkleOffset(for index: Int) -> CGSize {
        let angle = Double(index) * (360.0 / 8.0) * .pi / 180.0
        let radius: CGFloat = 80
        return CGSize(
            width: CGFloat(cos(angle)) * radius,
            height: CGFloat(sin(angle)) * radius
        )
    }
    
    private func confettiOffset(for index: Int) -> CGSize {
        let x = CGFloat.random(in: -200...200)
        let y = CGFloat.random(in: -400...400)
        return CGSize(width: x, height: y)
    }
    
    private func confettiColor(for index: Int) -> Color {
        let colors = [LunaraColors.warmGold, LunaraColors.success, LunaraColors.info]
        return colors[index % colors.count]
    }
    
    // MARK: - Actions
    
    private func copyBookingReference() {
        UIPasteboard.general.string = appointment.id
        
        // Add haptic feedback
        let impact = UIImpactFeedbackGenerator(style: .light)
        impact.impactOccurred()
    }
    
    private func addToCalendar() {
        // Implement calendar integration
        print("Add to calendar tapped")
    }
    
    private func shareAppointment() {
        // Implement sharing functionality
        print("Share appointment tapped")
    }
    
    private func callShop() {
        // Implement phone call functionality
        print("Call shop tapped")
    }
}

// MARK: - Preview
struct SuccessCelebrationView_Previews: PreviewProvider {
    static var previews: some View {
        SuccessCelebrationView(
            appointment: Appointment.preview,
            onContinue: {}
        )
    }
}
