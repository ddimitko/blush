//
//  AuthenticationLoadingView.swift
//  LunaraApp
//
//  Created by Lunara Team on 15/07/2025.
//

import SwiftUI

/// Loading view shown during authentication process
struct AuthenticationLoadingView: View {
    @State private var isAnimating = false
    
    var body: some View {
        ZStack {
            // Background
            LunaraColors.white
                .ignoresSafeArea()
            
            VStack(spacing: 32) {
                // Logo
                VStack(spacing: 16) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 60, weight: .light))
                        .foregroundColor(LunaraColors.warmGold)
                        .scaleEffect(isAnimating ? 1.1 : 1.0)
                        .animation(
                            Animation.easeInOut(duration: 1.5)
                                .repeatForever(autoreverses: true),
                            value: isAnimating
                        )
                    
                    Text("Lunara")
                        .font(.system(size: 32, weight: .light, design: .serif))
                        .foregroundColor(LunaraColors.charcoalGray)
                }
                
                // Loading content
                VStack(spacing: 16) {
                    // Loading indicator
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: LunaraColors.warmGold))
                        .scaleEffect(1.2)
                    
                    // Loading text
                    Text("Signing you in...")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(LunaraColors.charcoalGray.opacity(0.7))
                }
            }
        }
        .onAppear {
            isAnimating = true
        }
    }
}

// MARK: - Preview
struct AuthenticationLoadingView_Previews: PreviewProvider {
    static var previews: some View {
        AuthenticationLoadingView()
    }
}
