//
//  ServiceSelectionView.swift
//  LunaraApp
//
//  Created by Lunara Team on 23/07/2025.
//

import SwiftUI

/// View for selecting a service during the booking flow
struct ServiceSelectionView: View {
    // MARK: - Properties
    let shop: Shop
    let preselectedService: Service?
    let onServiceSelected: (Service) -> Void
    
    // MARK: - State
    @State private var services: [Service] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var selectedService: Service?
    @State private var searchText = ""
    
    // MARK: - Computed Properties
    private var filteredServices: [Service] {
        if searchText.isEmpty {
            return services
        } else {
            return services.filter { service in
                service.name.localizedCaseInsensitiveContains(searchText) ||
                (service.description?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                (service.category?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            headerSection
            
            // Content
            if isLoading {
                loadingView
            } else if let errorMessage = errorMessage {
                errorView(errorMessage)
            } else if services.isEmpty {
                emptyStateView
            } else {
                serviceListView
            }
        }
        .onAppear {
            loadServices()
            
            // Set preselected service if provided
            if let preselectedService = preselectedService {
                selectedService = preselectedService
            }
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        VStack(spacing: 16) {
            // Title and Description
            VStack(spacing: 8) {
                Text("Choose Your Service")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text("Select the service you'd like to book at \(shop.name)")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
            }
            
            // Search Bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(LunaraColors.secondaryText)
                
                TextField("Search services...", text: $searchText)
                    .textFieldStyle(PlainTextFieldStyle())
                
                if !searchText.isEmpty {
                    Button(action: { searchText = "" }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(LunaraColors.coolLightGray)
            .cornerRadius(10)
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 16)
    }
    
    // MARK: - Service List View
    private var serviceListView: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(filteredServices) { service in
                    EnhancedSelectableServiceCard(
                        service: service,
                        isSelected: selectedService?.id == service.id,
                        onTap: {
                            selectedService = service
                            onServiceSelected(service)
                        }
                    )
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 32)
        }
    }
    
    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 16) {
            Spacer()
            
            ProgressView()
                .scaleEffect(1.2)
            
            Text("Loading services...")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.secondaryText)
            
            Spacer()
        }
    }
    
    // MARK: - Error View
    private func errorView(_ message: String) -> some View {
        VStack(spacing: 24) {
            Spacer()
            
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 64))
                .foregroundColor(LunaraColors.secondaryText.opacity(0.6))
            
            VStack(spacing: 12) {
                Text("Unable to Load Services")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text(message)
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
            
            Button("Try Again") {
                loadServices()
            }
            .buttonStyle(PrimaryButtonStyle())
            
            Spacer()
        }
    }
    
    // MARK: - Empty State View
    private var emptyStateView: some View {
        VStack(spacing: 24) {
            Spacer()
            
            Image(systemName: "scissors")
                .font(.system(size: 64))
                .foregroundColor(LunaraColors.secondaryText.opacity(0.6))
            
            VStack(spacing: 12) {
                Text("No Services Available")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text("This shop doesn't have any bookable services at the moment.")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
            
            Spacer()
        }
    }
    
    // MARK: - Private Methods
    
    private func loadServices() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                let loadedServices = try await APIClient.shared.getShopServices(shopId: shop.id)

                await MainActor.run {
                    // Backend already filters for active services with active employees
                    self.services = loadedServices
                    self.isLoading = false
                }

            } catch {
                await MainActor.run {
                    self.errorMessage = "Failed to load services: \(error.localizedDescription)"
                    self.isLoading = false
                }
            }
        }
    }
}

// MARK: - Selectable Service Card Component
struct EnhancedSelectableServiceCard: View {
    let service: Service
    let isSelected: Bool
    let onTap: () -> Void

    @State private var isPressed = false
    
    var body: some View {
        Button(action: {
            // Add haptic feedback
            let impact = UIImpactFeedbackGenerator(style: .light)
            impact.impactOccurred()
            onTap()
        }) {
            VStack(alignment: .leading, spacing: 12) {
                // Enhanced Service Header with Icon
                HStack(spacing: 12) {
                    // Service Icon
                    ZStack {
                        Circle()
                            .fill(serviceIconGradient)
                            .frame(width: 48, height: 48)

                        Image(systemName: serviceIcon)
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(.white)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text(service.name)
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(LunaraColors.primaryText)
                            .multilineTextAlignment(.leading)

                        HStack(spacing: 8) {
                            Text(service.category ?? "General")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.white)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 2)
                                .background(LunaraColors.warmGold)
                                .cornerRadius(8)

                            // Service rating (if available)
                            serviceRatingView
                        }
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 4) {
                        Text(service.formattedPrice)
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(LunaraColors.warmGold)

                        HStack(spacing: 4) {
                            Image(systemName: "clock")
                                .font(.system(size: 12))
                                .foregroundColor(LunaraColors.secondaryText)

                            Text("\(service.durationMinutes) min")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(LunaraColors.secondaryText)
                        }
                    }
                }
                
                // Service Description
                if let description = service.description, !description.isEmpty {
                    Text(description)
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                        .lineLimit(3)
                        .multilineTextAlignment(.leading)
                }
                
                // Deposit Information
                if let depositAmount = service.depositAmount, depositAmount > 0 {
                    HStack {
                        Image(systemName: "info.circle")
                            .foregroundColor(LunaraColors.warmGold)
                        
                        Text("Deposit required: \(service.formattedDepositAmount)")
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                }
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(LunaraColors.white)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(
                                isSelected ? LunaraColors.warmGold : LunaraColors.coolLightGray,
                                lineWidth: isSelected ? 2 : 1
                            )
                    )
            )
            .scaleEffect(isSelected ? 1.02 : 1.0)
            .animation(.easeInOut(duration: 0.2), value: isSelected)
        }
        .buttonStyle(PlainButtonStyle())
        .scaleEffect(isPressed ? 0.98 : 1.0)
        .animation(.easeInOut(duration: 0.1), value: isPressed)
        .onLongPressGesture(minimumDuration: 0, maximumDistance: .infinity, pressing: { pressing in
            withAnimation(.easeInOut(duration: 0.1)) {
                isPressed = pressing
            }
        }, perform: {})
    }

    // MARK: - Computed Properties

    private var serviceIcon: String {
        // Map service categories to icons
        switch service.category?.lowercased() {
        case "haircut", "hair":
            return "scissors"
        case "coloring", "color":
            return "paintbrush"
        case "styling":
            return "wand.and.rays"
        case "treatment":
            return "leaf"
        case "nails", "manicure", "pedicure":
            return "hand.raised"
        case "facial", "skincare":
            return "face.smiling"
        case "massage":
            return "hands.sparkles"
        default:
            return "sparkles"
        }
    }

    private var serviceIconGradient: LinearGradient {
        LinearGradient(
            colors: [LunaraColors.warmGold, LunaraColors.warmGold.opacity(0.8)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    private var serviceRatingView: some View {
        HStack(spacing: 2) {
            ForEach(0..<5) { index in
                Image(systemName: index < 4 ? "star.fill" : "star")
                    .font(.system(size: 10))
                    .foregroundColor(LunaraColors.warmGold)
            }

            Text("4.8")
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(LunaraColors.secondaryText)
        }
    }
}

// MARK: - Preview
struct ServiceSelectionView_Previews: PreviewProvider {
    static var previews: some View {
        ServiceSelectionView(
            shop: Shop.preview,
            preselectedService: nil,
            onServiceSelected: { _ in }
        )
    }
}
