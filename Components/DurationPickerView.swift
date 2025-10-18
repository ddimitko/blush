//
//  DurationPickerView.swift
//  LunaraApp
//
//  Created by Lunara Team on 14/07/2025.
//

import SwiftUI

/// Duration picker component for selecting service duration
struct DurationPickerView: View {
    @Binding var selectedMinutes: Int
    
    // Common duration options
    private let durationOptions = [
        15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 180, 210, 240, 300, 360, 420, 480
    ]
    
    var body: some View {
        Menu {
            ForEach(durationOptions, id: \.self) { minutes in
                Button(formatDuration(minutes)) {
                    selectedMinutes = minutes
                }
            }
            
            Divider()
            
            // Custom duration option
            Button("Custom...") {
                // For now, we'll use a simple approach
                // In a full implementation, you might want to show a custom picker
            }
        } label: {
            HStack {
                Text(formatDuration(selectedMinutes))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
                
                Image(systemName: "chevron.down")
                    .foregroundColor(LunaraColors.secondaryText)
            }
            .padding()
            .background(LunaraColors.coolLightGray.opacity(0.3))
            .cornerRadius(8)
        }
    }
    
    // MARK: - Helper Methods
    private func formatDuration(_ minutes: Int) -> String {
        if minutes < 60 {
            return "\(minutes) min"
        } else if minutes % 60 == 0 {
            let hours = minutes / 60
            return hours == 1 ? "1 hour" : "\(hours) hours"
        } else {
            let hours = minutes / 60
            let remainingMinutes = minutes % 60
            return "\(hours)h \(remainingMinutes)m"
        }
    }
}

// MARK: - Preview
struct DurationPickerView_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 20) {
            Text("Duration Picker Examples")
                .font(.headline)

            DurationPickerView(selectedMinutes: .constant(60))
            DurationPickerView(selectedMinutes: .constant(90))
            DurationPickerView(selectedMinutes: .constant(120))
        }
        .padding()
        .background(LunaraColors.coolLightGray.opacity(0.1))
    }
}
