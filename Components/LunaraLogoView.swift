//
//  LunaraLogoView.swift
//  LunaraApp
//
//  Created by Lunara Team on 23/07/2025.
//

import SwiftUI

/// Reusable Lunara logo component
struct LunaraLogoView: View {
    enum Size {
        case small, medium, large
        
        var iconSize: CGFloat {
            switch self {
            case .small: return 24
            case .medium: return 40
            case .large: return 60
            }
        }
        
        var textSize: CGFloat {
            switch self {
            case .small: return 16
            case .medium: return 24
            case .large: return 32
            }
        }
    }
    
    let size: Size
    let showText: Bool
    
    init(size: Size = .medium, showText: Bool = true) {
        self.size = size
        self.showText = showText
    }
    
    var body: some View {
        HStack(spacing: size == .small ? 8 : 12) {
            // Logo Icon
            Image(systemName: "sparkles")
                .font(.system(size: size.iconSize, weight: .light))
                .foregroundColor(LunaraColors.warmGold)
            
            // Logo Text
            if showText {
                Text("Lunara")
                    .font(.system(size: size.textSize, weight: .light, design: .serif))
                    .foregroundColor(LunaraColors.charcoalGray)
            }
        }
    }
}

// MARK: - Preview
struct LunaraLogoView_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 32) {
            LunaraLogoView(size: .small)
            LunaraLogoView(size: .medium)
            LunaraLogoView(size: .large)
            LunaraLogoView(size: .medium, showText: false)
        }
        .padding()
    }
}
