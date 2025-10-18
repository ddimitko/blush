//
//  AllEmployeesView.swift
//  LunaraApp
//
//  Created by Lunara Team on 28/07/2025.
//

import SwiftUI

struct AllEmployeesView: View {
    let shop: Shop
    let employees: [Employee]
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 16) {
                    ForEach(employees) { employee in
                        EmployeeCard(employee: employee)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 16)
            }
            .navigationTitle("All Employees")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.warmGold)
                }
            }
        }
    }
}

// MARK: - Preview
struct AllEmployeesView_Previews: PreviewProvider {
    static var previews: some View {
        AllEmployeesView(shop: Shop.preview, employees: Employee.previewList)
    }
}
