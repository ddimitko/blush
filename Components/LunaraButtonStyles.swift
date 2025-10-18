//
//  LunaraButtonStyles.swift
//  LunaraApp
//
//  Created by Lunara Team on 16/07/2025.
//

import SwiftUI

// MARK: - Primary Button Style
struct LunaraButtonStyle: ButtonStyle {
    var isDisabled: Bool = false
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .semibold))
            .foregroundColor(LunaraColors.buttonPrimaryText)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(isDisabled ? LunaraColors.buttonDisabled : LunaraColors.buttonPrimary)
            .opacity(configuration.isPressed ? 0.9 : 1.0)
            .cornerRadius(12)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

// MARK: - Secondary Button Style
struct LunaraSecondaryButtonStyle: ButtonStyle {
    var isDisabled: Bool = false
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .semibold))
            .foregroundColor(isDisabled ? LunaraColors.buttonDisabledText : LunaraColors.buttonSecondaryText)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(LunaraColors.buttonSecondary)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(LunaraColors.border, lineWidth: 1)
            )
            .opacity(configuration.isPressed ? 0.9 : 1.0)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

// MARK: - Outline Button Style
struct LunaraOutlineButtonStyle: ButtonStyle {
    var isDisabled: Bool = false
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .semibold))
            .foregroundColor(isDisabled ? LunaraColors.buttonDisabledText : LunaraColors.warmGold)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(Color.white)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isDisabled ? LunaraColors.buttonDisabled : LunaraColors.warmGold, lineWidth: 1)
            )
            .opacity(configuration.isPressed ? 0.9 : 1.0)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

// MARK: - Text Button Style
struct LunaraTextButtonStyle: ButtonStyle {
    var isDisabled: Bool = false
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .medium))
            .foregroundColor(isDisabled ? LunaraColors.buttonDisabledText : LunaraColors.warmGold)
            .opacity(configuration.isPressed ? 0.7 : 1.0)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

// MARK: - Preview
#Preview {
    VStack(spacing: 20) {
        Button("Primary Button") {}
            .buttonStyle(LunaraButtonStyle())
        
        Button("Secondary Button") {}
            .buttonStyle(LunaraSecondaryButtonStyle())
        
        Button("Outline Button") {}
            .buttonStyle(LunaraOutlineButtonStyle())
        
        Button("Text Button") {}
            .buttonStyle(LunaraTextButtonStyle())
        
        Button("Disabled Primary") {}
            .buttonStyle(LunaraButtonStyle(isDisabled: true))
            .disabled(true)
        
        Button("Disabled Secondary") {}
            .buttonStyle(LunaraSecondaryButtonStyle(isDisabled: true))
            .disabled(true)
    }
    .padding()
}

// MARK: - Card Button Style
struct AppointmentCardButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .opacity(configuration.isPressed ? 0.95 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}
