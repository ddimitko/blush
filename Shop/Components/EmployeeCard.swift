//
//  EmployeeCard.swift
//  LunaraApp
//
//  Created by Lunara Team on 14/07/2025.
//

import SwiftUI
import Kingfisher

/// Employee card component for displaying employee information
struct EmployeeCard: View {
    // MARK: - Properties
    let employee: Employee
    
    var body: some View {
        VStack(spacing: 12) {
            // Employee Avatar
            AsyncImage(url: URL(string: employee.avatar ?? "")) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Circle()
                    .fill(LunaraColors.warmGold.opacity(0.2))
                    .overlay(
                        Text(employee.initials)
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundColor(LunaraColors.warmGold)
                    )
            }
            .frame(width: 60, height: 60)
            .clipShape(Circle())
            
            // Employee Info
            VStack(spacing: 4) {
                Text(employee.displayName)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                    .lineLimit(1)
                
                if let specialties = employee.specialties, !specialties.isEmpty {
                    Text(specialties.joined(separator: ", "))
                        .font(.system(size: 12))
                        .foregroundColor(LunaraColors.secondaryText)
                        .lineLimit(2)
                        .multilineTextAlignment(.center)
                }
                
                if employee.yearsExperience > 0 {
                    Text("\(employee.yearsExperience) years exp.")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(LunaraColors.warmGold)
                }
            }
        }
        .frame(width: 120)
        .padding(12)
        .background(LunaraColors.cardBackground)
        .cornerRadius(12)
        .shadow(color: LunaraColors.cardShadow, radius: 2, x: 0, y: 1)
    }
}

/// Skeleton view for employee card loading state
struct EmployeeCardSkeleton: View {
    var body: some View {
        VStack(spacing: 12) {
            Circle()
                .fill(LunaraColors.coolLightGray)
                .frame(width: 60, height: 60)
            
            VStack(spacing: 4) {
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 16)
                    .cornerRadius(4)
                
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 12)
                    .cornerRadius(4)
                
                Rectangle()
                    .fill(LunaraColors.coolLightGray)
                    .frame(height: 11)
                    .cornerRadius(4)
            }
        }
        .frame(width: 120)
        .padding(12)
        .background(LunaraColors.cardBackground)
        .cornerRadius(12)
        .shadow(color: LunaraColors.cardShadow, radius: 2, x: 0, y: 1)
    }
}

/// Empty state view when no employees are available
struct EmptyEmployeesView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.2")
                .font(.system(size: 40))
                .foregroundColor(LunaraColors.charcoalGray.opacity(0.3))
            
            VStack(spacing: 8) {
                Text("No Team Members")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text("This shop doesn't have any team members listed at the moment.")
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
struct EmployeeCard_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            EmployeeCard(employee: Employee.preview)
                .padding()
                .previewDisplayName("Employee Card")
            
            EmployeeCardSkeleton()
                .padding()
                .previewDisplayName("Employee Card Skeleton")
            
            EmptyEmployeesView()
                .padding()
                .previewDisplayName("Empty Employees")
        }
    }
}
