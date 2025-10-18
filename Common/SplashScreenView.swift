//
//  SplashScreenView.swift
//  LunaraApp
//
//  Created by Lunara Team on 14/07/2025.
//

import SwiftUI

/// Custom splash screen with Lunara branding and smooth animations
struct SplashScreenView: View {
    // MARK: - State
    @State private var logoScale: CGFloat = 0.5
    @State private var logoOpacity: Double = 0.0
    @State private var textOpacity: Double = 0.0
    @State private var backgroundOpacity: Double = 0.0
    @State private var showLoadingIndicator = false
    
    var body: some View {
        ZStack {
            // Background
            LunaraColors.white
                .ignoresSafeArea()
                .opacity(backgroundOpacity)
            
            VStack(spacing: 32) {
                Spacer()
                
                // Logo Section
                VStack(spacing: 24) {
                    // Main Logo
                    SplashLogoView(size: .extraLarge)
                        .scaleEffect(logoScale)
                        .opacity(logoOpacity)
                    
                    // App Name and Tagline
                    VStack(spacing: 8) {
                        Text("Lunara")
                            .font(.system(size: 36, weight: .bold, design: .rounded))
                            .foregroundColor(LunaraColors.charcoalGray)
                            .opacity(textOpacity)
                        
                        Text("Beauty at your fingertips")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(LunaraColors.charcoalGray.opacity(0.7))
                            .opacity(textOpacity)
                    }
                }
                
                Spacer()
                
                // Loading Indicator
                VStack(spacing: 16) {
                    if showLoadingIndicator {
                        LunaraLoadingIndicator()
                            .transition(.opacity)
                    }
                    
                    Text("Loading your beauty experience...")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.charcoalGray.opacity(0.6))
                        .opacity(showLoadingIndicator ? 1.0 : 0.0)
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
        // Background fade in
        withAnimation(.easeInOut(duration: 0.3)) {
            backgroundOpacity = 1.0
        }
        
        // Logo scale and fade in
        withAnimation(.spring(response: 0.8, dampingFraction: 0.6, blendDuration: 0.3).delay(0.2)) {
            logoScale = 1.0
            logoOpacity = 1.0
        }
        
        // Text fade in
        withAnimation(.easeInOut(duration: 0.6).delay(0.6)) {
            textOpacity = 1.0
        }
        
        // Loading indicator
        withAnimation(.easeInOut(duration: 0.4).delay(1.2)) {
            showLoadingIndicator = true
        }
    }
}

// MARK: - Splash Logo View
struct SplashLogoView: View {
    enum Size {
        case small, medium, large, extraLarge

        var dimension: CGFloat {
            switch self {
            case .small: return 40
            case .medium: return 60
            case .large: return 80
            case .extraLarge: return 120
            }
        }
    }

    let size: Size

    init(size: Size = .medium) {
        self.size = size
    }

    var body: some View {
        ZStack {
            // Background circle
            Circle()
                .fill(
                    LinearGradient(
                        gradient: Gradient(colors: [
                            LunaraColors.warmGold,
                            LunaraColors.warmGold.opacity(0.8)
                        ]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: size.dimension, height: size.dimension)

            // Logo content
            VStack(spacing: 2) {
                // Stylized "L" or beauty icon
                Image(systemName: "sparkles")
                    .font(.system(size: size.dimension * 0.4, weight: .medium))
                    .foregroundColor(LunaraColors.white)
            }
        }
        .shadow(
            color: LunaraColors.warmGold.opacity(0.3),
            radius: size.dimension * 0.1,
            x: 0,
            y: size.dimension * 0.05
        )
    }
}

// MARK: - Lunara Loading Indicator
struct LunaraLoadingIndicator: View {
    @State private var isAnimating = false
    
    var body: some View {
        HStack(spacing: 8) {
            ForEach(0..<3) { index in
                Circle()
                    .fill(LunaraColors.warmGold)
                    .frame(width: 8, height: 8)
                    .scaleEffect(isAnimating ? 1.0 : 0.5)
                    .opacity(isAnimating ? 1.0 : 0.3)
                    .animation(
                        .easeInOut(duration: 0.6)
                        .repeatForever()
                        .delay(Double(index) * 0.2),
                        value: isAnimating
                    )
            }
        }
        .onAppear {
            isAnimating = true
        }
    }
}

// MARK: - Network Status View
struct NetworkStatusView: View {
    var body: some View {
        VStack {
            HStack {
                Image(systemName: "wifi.slash")
                    .foregroundColor(.white)
                
                Text("No Internet Connection")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.white)
                
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(LunaraColors.error)
            
            Spacer()
        }
        .ignoresSafeArea(edges: .top)
    }
}

// MARK: - Preview
struct SplashScreenView_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            SplashScreenView()
                .previewDisplayName("Splash Screen")
            
            SplashLogoView(size: .large)
                .padding()
                .previewDisplayName("Logo Large")
            
            LunaraLoadingIndicator()
                .padding()
                .previewDisplayName("Loading Indicator")
            
            NetworkStatusView()
                .previewDisplayName("Network Status")
        }
    }
}
