//
//  ShopCreationAnimatedSuccessView.swift
//  LunaraApp
//
//  Created by Lunara Team on 16/07/2025.
//

import SwiftUI

/// Animated success screen shown after shop creation with automatic redirect
@MainActor
struct ShopCreationAnimatedSuccessView: View {
    let shopName: String
    let onComplete: () -> Void
    
    @State private var logoScale: CGFloat = 0.5
    @State private var logoOpacity: Double = 0.0
    @State private var checkmarkScale: CGFloat = 0.0
    @State private var checkmarkOpacity: Double = 0.0
    @State private var textOpacity: Double = 0.0
    @State private var progressValue: Double = 0.0
    @State private var showProgress = false
    @State private var countdown = 4
    @State private var timer: Timer?
    
    private let animationDuration: Double = 4.0
    
    var body: some View {
        ZStack {
            // Background
            LunaraColors.white
                .ignoresSafeArea()
            
            VStack(spacing: 40) {
                Spacer()
                
                // Logo and Success Animation
                VStack(spacing: 32) {
                    // Lunara Logo
                    LunaraLogoView(size: .large)
                        .scaleEffect(logoScale)
                        .opacity(logoOpacity)
                    
                    // Success Checkmark
                    ZStack {
                        Circle()
                            .fill(LunaraColors.warmGold.opacity(0.1))
                            .frame(width: 120, height: 120)
                        
                        Circle()
                            .fill(LunaraColors.warmGold)
                            .frame(width: 80, height: 80)
                        
                        Image(systemName: "checkmark")
                            .font(.system(size: 32, weight: .bold))
                            .foregroundColor(.white)
                    }
                    .scaleEffect(checkmarkScale)
                    .opacity(checkmarkOpacity)
                }
                
                // Success Content
                VStack(spacing: 24) {
                    VStack(spacing: 12) {
                        Text("Shop Created Successfully!")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundColor(LunaraColors.charcoalGray)
                            .multilineTextAlignment(.center)
                        
                        Text("Welcome to Lunara, \(shopName)!")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(LunaraColors.warmGold)
                            .multilineTextAlignment(.center)
                        
                        Text("Your business is now live and ready to accept bookings.")
                            .font(.system(size: 16))
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .opacity(textOpacity)
                    
                    // Features Preview
                    VStack(spacing: 16) {
                        Text("You can now:")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(LunaraColors.charcoalGray)
                        
                        VStack(spacing: 12) {
                            AnimatedSuccessFeatureRow(
                                icon: "calendar.badge.plus",
                                text: "Manage appointments and bookings",
                                delay: 0.5
                            )

                            AnimatedSuccessFeatureRow(
                                icon: "person.2.badge.plus",
                                text: "Add employees and services",
                                delay: 0.7
                            )

                            AnimatedSuccessFeatureRow(
                                icon: "chart.line.uptrend.xyaxis",
                                text: "Track earnings and analytics",
                                delay: 0.9
                            )

                            AnimatedSuccessFeatureRow(
                                icon: "creditcard",
                                text: "Accept payments from customers",
                                delay: 1.1
                            )
                        }
                    }
                    .opacity(textOpacity)
                }
                
                Spacer()
                
                // Progress and Countdown
                VStack(spacing: 16) {
                    if showProgress {
                        VStack(spacing: 12) {
                            Text("Redirecting to dashboard in \(countdown)...")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.secondary)
                            
                            // Progress Bar
                            ProgressView(value: progressValue, total: 1.0)
                                .progressViewStyle(LinearProgressViewStyle(tint: LunaraColors.warmGold))
                                .frame(height: 4)
                                .scaleEffect(x: 1, y: 2, anchor: .center)
                        }
                        .transition(.opacity)
                    }
                    
                    // Skip Button
                    Button(action: onComplete) {
                        Text("Go to Dashboard Now")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(LunaraColors.warmGold)
                    }
                    .opacity(showProgress ? 1.0 : 0.0)
                }
                .padding(.bottom, 60)
            }
            .padding(.horizontal, 32)
        }
        .onAppear {
            startAnimations()
        }
    }
    
    // MARK: - Animation Methods
    
    private func startAnimations() {
        // Logo animation
        withAnimation(.spring(response: 0.8, dampingFraction: 0.6).delay(0.2)) {
            logoScale = 1.0
            logoOpacity = 1.0
        }
        
        // Checkmark animation
        withAnimation(.spring(response: 0.6, dampingFraction: 0.7).delay(0.8)) {
            checkmarkScale = 1.0
            checkmarkOpacity = 1.0
        }
        
        // Text fade in
        withAnimation(.easeInOut(duration: 0.6).delay(1.2)) {
            textOpacity = 1.0
        }
        
        // Progress and countdown
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            withAnimation(.easeInOut(duration: 0.4)) {
                showProgress = true
            }
            startCountdown()
        }
    }
    
    private func startCountdown() {
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            Task { @MainActor in
                countdown -= 1
                progressValue = Double(4 - countdown) / 4.0

                if countdown <= 0 {
                    timer?.invalidate()
                    onComplete()
                }
            }
        }
    }
}

// MARK: - Success Feature Row with Animation
struct AnimatedSuccessFeatureRow: View {
    let icon: String
    let text: String
    let delay: Double
    
    @State private var opacity: Double = 0.0
    @State private var offset: CGFloat = 20.0
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
                .frame(width: 20)
            
            Text(text)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(LunaraColors.charcoalGray)
            
            Spacer()
        }
        .opacity(opacity)
        .offset(x: offset)
        .onAppear {
            withAnimation(.easeOut(duration: 0.5).delay(delay)) {
                opacity = 1.0
                offset = 0.0
            }
        }
    }
}

// MARK: - Preview
struct ShopCreationAnimatedSuccessView_Previews: PreviewProvider {
    static var previews: some View {
        ShopCreationAnimatedSuccessView(
            shopName: "Bella Beauty Salon",
            onComplete: {
                print("Animation complete")
            }
        )
    }
}
