//
//  ContactInfoRow.swift
//  LunaraApp
//
//  Created by Lunara Team on 14/07/2025.
//

import SwiftUI

/// Contact information row component
struct ContactInfoRow: View {
    // MARK: - Properties
    let icon: String
    let title: String
    let value: String
    
    var body: some View {
        HStack(spacing: 12) {
            // Icon
            Image(systemName: icon)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
                .frame(width: 20, alignment: .center)
            
            // Title and Value
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)
                
                Text(value)
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.primaryText)
            }
            
            Spacer()
            
            // Action Button
            Button(action: {
                handleContactAction()
            }) {
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(LunaraColors.secondaryText)
            }
        }
        .padding(.vertical, 8)
    }
    
    // MARK: - Private Methods
    private func handleContactAction() {
        switch icon {
        case "phone":
            if let phoneURL = URL(string: "tel:\(value)") {
                UIApplication.shared.open(phoneURL)
            }
        case "envelope":
            if let emailURL = URL(string: "mailto:\(value)") {
                UIApplication.shared.open(emailURL)
            }
        case "globe":
            if let websiteURL = URL(string: value) {
                UIApplication.shared.open(websiteURL)
            }
        default:
            break
        }
    }
}

/// Business hours row component
struct BusinessHoursRow: View {
    // MARK: - Properties
    let businessHours: BusinessHours
    
    var body: some View {
        HStack {
            // Day of Week
            Text(businessHours.dayOfWeek.dayDisplayName)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.primaryText)
                .frame(width: 80, alignment: .leading)
            
            Spacer()
            
            // Hours
            if businessHours.isClosed {
                Text("Closed")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.error)
            } else {
                Text("\(businessHours.openTime) - \(businessHours.closeTime)")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.primaryText)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Day of Week Extension
extension DayOfWeek {
    var dayDisplayName: String {
        switch self {
        case .monday:
            return "Monday"
        case .tuesday:
            return "Tuesday"
        case .wednesday:
            return "Wednesday"
        case .thursday:
            return "Thursday"
        case .friday:
            return "Friday"
        case .saturday:
            return "Saturday"
        case .sunday:
            return "Sunday"
        }
    }
}

// MARK: - Preview
struct ContactInfoRow_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            VStack(spacing: 12) {
                ContactInfoRow(icon: "phone", title: "Phone", value: "+1 (555) 123-4567")
                ContactInfoRow(icon: "envelope", title: "Email", value: "info@bellabeauty.com")
                ContactInfoRow(icon: "globe", title: "Website", value: "https://bellabeauty.com")
            }
            .padding()
            .previewDisplayName("Contact Info Rows")
            
            VStack(spacing: 8) {
                BusinessHoursRow(businessHours: BusinessHours(
                    id: "1",
                    dayOfWeek: .monday,
                    openTime: "09:00",
                    closeTime: "18:00",
                    isClosed: false
                ))
                
                BusinessHoursRow(businessHours: BusinessHours(
                    id: "2",
                    dayOfWeek: .sunday,
                    openTime: "",
                    closeTime: "",
                    isClosed: true
                ))
            }
            .padding()
            .previewDisplayName("Business Hours Rows")
        }
    }
}
