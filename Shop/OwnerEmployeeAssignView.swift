//
//  OwnerEmployeeAssignView.swift
//  LunaraApp
//
//  Created by Lunara Team on 24/07/2025.
//

import SwiftUI

/// View for shop owners to assign themselves as employees
struct OwnerEmployeeAssignView: View {
    // MARK: - Properties
    let shop: Shop
    let onEmployeeAssigned: () -> Void
    
    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var appState: AppState
    
    // MARK: - State
    @StateObject private var shopService = ShopService.shared
    @State private var bio = ""
    @State private var specialties: [String] = []
    @State private var newSpecialty = ""
    @State private var yearsExperience = 0
    @State private var hourlyRate = ""
    @State private var commissionRate: Double = 0.0
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showingError = false
    @State private var successMessage: String?
    @State private var showingSuccess = false
    
    // MARK: - Computed Properties
    
    private var isFormValid: Bool {
        // Bio and specialties are now optional
        let experienceValid = yearsExperience >= 0
        let hourlyRateValid = hourlyRate.isEmpty || (Double(hourlyRate) != nil && Double(hourlyRate)! >= 0)
        let commissionValid = commissionRate >= 0 && commissionRate <= 100

        return experienceValid && hourlyRateValid && commissionValid
    }

    private var validatedHourlyRate: Double? {
        guard !hourlyRate.isEmpty else { return nil }
        guard let rate = Double(hourlyRate), rate >= 0, !rate.isNaN, !rate.isInfinite else { return nil }
        return rate
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    headerSection
                    formSection
                    assignButton
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 32)
            }
            .navigationTitle("Become Employee")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.secondaryText)
                }
            }
            .onTapGesture {
                // Dismiss keyboard when tapping outside
                UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
            }
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") {
                errorMessage = nil
            }
        } message: {
            Text(errorMessage ?? "An unknown error occurred")
        }
        .alert("Success", isPresented: $showingSuccess) {
            Button("OK") {
                successMessage = nil
                dismiss()
                onEmployeeAssigned()
            }
        } message: {
            Text(successMessage ?? "Successfully assigned as employee")
        }
    }

    // MARK: - View Components

    private var headerSection: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.badge.plus")
                .font(.system(size: 48))
                .foregroundColor(LunaraColors.warmGold)

            VStack(spacing: 8) {
                Text("Become an Employee")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(LunaraColors.charcoalGray)

                Text("Assign yourself as an employee at your shop to allow customers to book appointments with you directly.")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 16)
            }
        }
        .padding(.top, 16)
    }

    private var formSection: some View {
        VStack(spacing: 20) {
            professionalInfoSection
            pricingInfoSection
        }
    }

    private var professionalInfoSection: some View {
        VStack(spacing: 16) {
            sectionHeader("Professional Information")

            VStack(spacing: 16) {
                bioField
                specialtiesField
                experienceField
            }
        }
    }

    private var bioField: some View {
        VStack(alignment: .leading, spacing: 8) {
            FormFieldView(
                title: "Bio (Optional)",
                text: $bio,
                placeholder: "Tell customers about your experience and expertise...",
                isRequired: false,
                isMultiline: true
            )
        }
    }

    private var specialtiesField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Specialties (Optional)")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.charcoalGray)

            if !specialties.isEmpty {
                specialtyTags
            }

            addSpecialtyField
        }
    }

    private var specialtyTags: some View {
        LazyVGrid(columns: [
            GridItem(.adaptive(minimum: 100), spacing: 8)
        ], spacing: 8) {
            ForEach(specialties, id: \.self) { specialty in
                HStack(spacing: 4) {
                    Text(specialty)
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.charcoalGray)

                    Button(action: {
                        specialties.removeAll { $0 == specialty }
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 16))
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(LunaraColors.coolLightGray)
                .cornerRadius(16)
            }
        }
        .padding(.bottom, 8)
    }

    private var addSpecialtyField: some View {
        HStack {
            TextField("Add a specialty", text: $newSpecialty)
                .textFieldStyle(RoundedBorderTextFieldStyle())

            Button(action: addSpecialty) {
                Text("Add")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(LunaraColors.warmGold)
                    .cornerRadius(6)
            }
            .disabled(newSpecialty.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
    }

    private var experienceField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Years of Experience")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.charcoalGray)

            Stepper(value: $yearsExperience, in: 0...50) {
                Text("\(yearsExperience) years")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.charcoalGray)
            }
        }
    }

    private var pricingInfoSection: some View {
        VStack(spacing: 16) {
            sectionHeader("Pricing Information")

            VStack(spacing: 16) {
                hourlyRateField
                commissionRateField
            }
        }
    }

    private var hourlyRateField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Hourly Rate (Optional)")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.charcoalGray)

            TextField("0.00", text: $hourlyRate)
                .keyboardType(.decimalPad)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .onChange(of: hourlyRate) { oldValue, newValue in
                    // Filter out invalid characters and prevent NaN
                    let filtered = newValue.filter { "0123456789.".contains($0) }

                    // Ensure only one decimal point
                    let components = filtered.components(separatedBy: ".")
                    if components.count > 2 {
                        hourlyRate = oldValue
                        return
                    }

                    // Limit decimal places to 2
                    if components.count == 2 && components[1].count > 2 {
                        hourlyRate = oldValue
                        return
                    }

                    // Validate the number
                    if !filtered.isEmpty {
                        if let _ = Double(filtered), !filtered.hasPrefix(".") {
                            hourlyRate = filtered
                        } else if filtered != "." && !filtered.isEmpty {
                            hourlyRate = oldValue
                        } else {
                            hourlyRate = filtered
                        }
                    } else {
                        hourlyRate = ""
                    }
                }
        }
    }

    private var commissionRateField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Commission Rate (%)")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.charcoalGray)

            HStack {
                Slider(value: $commissionRate, in: 0...100, step: 1)
                    .accentColor(LunaraColors.warmGold)
                    .onChange(of: commissionRate) { oldValue, newValue in
                        // Ensure the value is valid and not NaN
                        if newValue.isNaN || newValue.isInfinite {
                            commissionRate = oldValue
                        } else {
                            commissionRate = max(0, min(100, newValue))
                        }
                    }

                Text("\(Int(max(0, min(100, commissionRate))))%")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(LunaraColors.charcoalGray)
                    .frame(width: 50)
            }
        }
    }

    private var assignButton: some View {
        Button(action: assignOwnerAsEmployee) {
            HStack {
                if isLoading {
                    ProgressView()
                        .scaleEffect(0.8)
                        .tint(.white)
                }

                Text(isLoading ? "Assigning..." : "Assign Myself as Employee")
                    .font(.system(size: 16, weight: .medium))
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                isFormValid ? LunaraColors.warmGold : LunaraColors.charcoalGray.opacity(0.3)
            )
            .cornerRadius(12)
        }
        .disabled(!isFormValid || isLoading)
    }
    
    // MARK: - Helper Views
    
    private func sectionHeader(_ title: String) -> some View {
        HStack {
            Text(title)
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.charcoalGray)
            
            Spacer()
        }
        .padding(.horizontal, 4)
    }
    
    // MARK: - Methods
    
    private func addSpecialty() {
        let trimmedSpecialty = newSpecialty.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedSpecialty.isEmpty && !specialties.contains(trimmedSpecialty) {
            specialties.append(trimmedSpecialty)
            newSpecialty = ""
        }
    }
    
    private func assignOwnerAsEmployee() {
        // Validate form before proceeding
        guard isFormValid else {
            errorMessage = "Please check that all fields are filled in correctly."
            showingError = true
            return
        }

        isLoading = true
        errorMessage = nil

        // Validate and prepare data
        let trimmedBio = bio.trimmingCharacters(in: .whitespacesAndNewlines)
        let bioToSend = trimmedBio.isEmpty ? nil : trimmedBio
        let specialtiesString = specialties.isEmpty ? nil : specialties.joined(separator: ", ")
        let validatedRate = validatedHourlyRate

        // Ensure commission rate is valid
        let validCommissionRate = max(0, min(100, commissionRate))

        // Create the assignment request with the required data structure
        let assignmentData = EmployeeCreationRequest(
            bio: bioToSend,
            specialties: specialtiesString,
            yearsExperience: yearsExperience,
            hourlyRate: validatedRate,
            commissionRate: validCommissionRate
        )

        print("🔄 Assigning owner as employee with data: \(assignmentData)")

        Task {
            do {
                let response = try await shopService.assignOwnerAsEmployee(shopId: shop.id, assignmentData)
                print("✅ Successfully assigned owner as employee: \(response)")

                await MainActor.run {
                    isLoading = false
                    successMessage = response.message
                    showingSuccess = true
                }
            } catch {
                print("❌ Failed to assign owner as employee: \(error)")

                await MainActor.run {
                    isLoading = false

                    // Provide more specific error messages
                    if let apiError = error as? APIError {
                        switch apiError {
                        case .invalidResponse:
                            errorMessage = "Invalid response from server. Please try again."
                        case .decodingError(let decodingError):
                            errorMessage = "Failed to process server response: \(decodingError.localizedDescription)"
                        case .unauthorized:
                            errorMessage = "Authentication failed. Please log in again."
                        case .forbidden:
                            errorMessage = "You don't have permission to perform this action."
                        case .clientError(let message):
                            errorMessage = message
                        case .serverError:
                            errorMessage = "Server error. Please try again later."
                        default:
                            errorMessage = apiError.localizedDescription
                        }
                    } else {
                        errorMessage = error.localizedDescription
                    }

                    showingError = true
                }
            }
        }
    }
}

#Preview {
    OwnerEmployeeAssignView(shop: Shop.preview) {
        print("Owner assigned as employee")
    }
    .environmentObject(AppState.shared)
}
