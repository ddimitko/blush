//
//  ServiceCard.swift
//  LunaraApp
//
//  Created by Lunara Team on 14/07/2025.
//

import SwiftUI

/// Service card component for displaying service information
struct ServiceCard: View {
    // MARK: - Properties
    let service: Service
    let onBookTap: () -> Void
    
    var body: some View {
        HStack(spacing: 16) {
            // Service Info
            VStack(alignment: .leading, spacing: 8) {
                // Service Name
                Text(service.name)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                    .lineLimit(1)
                
                // Service Description
                if let description = service.description {
                    Text(description)
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                        .lineLimit(2)
                }
                
                // Duration and Category
                HStack(spacing: 12) {
                    HStack(spacing: 4) {
                        Image(systemName: "clock")
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.warmGold)
                        
                        Text(service.formattedDuration)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                    
                    if let category = service.category {
                        HStack(spacing: 4) {
                            Image(systemName: "tag")
                                .font(.system(size: 12))
                                .foregroundColor(LunaraColors.warmGold)
                            
                            Text(category)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(LunaraColors.secondaryText)
                        }
                    }
                }
            }
            
            Spacer()
            
            // Price and Book Button
            VStack(alignment: .trailing, spacing: 12) {
                // Price
                Text(service.formattedPrice)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                
                // Book Button
                Button(action: onBookTap) {
                    Text("Book")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(LunaraColors.buttonPrimaryText)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 8)
                        .background(LunaraColors.buttonPrimary)
                        .cornerRadius(20)
                }
                .disabled(!service.isBookable)
                .opacity(service.isBookable ? 1.0 : 0.6)
            }
        }
        .padding(16)
        .background(LunaraColors.cardBackground)
        .cornerRadius(12)
        .shadow(color: LunaraColors.cardShadow, radius: 4, x: 0, y: 2)
    }
}

/// Skeleton view for service card loading state
struct ServiceCardSkeleton: View {
    var body: some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 20)
                    .cornerRadius(4)
                
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 14)
                    .cornerRadius(4)
                
                HStack(spacing: 12) {
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(width: 60, height: 12)
                        .cornerRadius(4)
                    
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .frame(width: 80, height: 12)
                        .cornerRadius(4)
                }
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 12) {
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(width: 60, height: 20)
                    .cornerRadius(4)
                
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(width: 50, height: 24)
                    .cornerRadius(12)
            }
        }
        .padding(16)
        .background(LunaraColors.cardBackground)
        .cornerRadius(12)
        .shadow(color: LunaraColors.cardShadow, radius: 4, x: 0, y: 2)
    }
}

/// Empty state view when no services are available
struct EmptyServicesView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "scissors")
                .font(.system(size: 40))
                .foregroundColor(LunaraColors.charcoalGray.opacity(0.3))
            
            VStack(spacing: 8) {
                Text("No Services Available")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text("This shop doesn't have any services available for booking at the moment.")
                    .font(.system(size: 14))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(.vertical, 40)
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Preview
struct ServiceCard_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            ServiceCard(service: Service.preview) {
                print("Book tapped")
            }
            .padding()
            .previewDisplayName("Service Card")
            
            ServiceCardSkeleton()
                .padding()
                .previewDisplayName("Service Card Skeleton")
            
            EmptyServicesView()
                .padding()
                .previewDisplayName("Empty Services")
        }
    }
}
