//
//  EnhancedServiceCard.swift
//  LunaraApp
//
//  Created by Lunara Team on 28/07/2025.
//

import SwiftUI

/// Enhanced service card with additional information and better presentation
struct EnhancedServiceCard: View {
    // MARK: - Properties
    let service: Service
    let onBookTap: () -> Void
    
    var body: some View {
        VStack(spacing: 0) {
            // Main Content
            VStack(spacing: 16) {
                // Header with service info
                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 8) {
                        // Service Name with popularity indicator
                        HStack(spacing: 8) {
                            Text(service.name)
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundColor(LunaraColors.primaryText)
                                .lineLimit(1)
                            
                            if service.isPopular {
                                popularBadge
                            }
                        }
                        
                        // Duration and category
                        HStack(spacing: 12) {
                            durationChip(duration: service.durationMinutes)
                            
                            if let category = service.category {
                                categoryChip(category: category)
                            }
                        }
                        
                        // Description
                        if let description = service.description, !description.isEmpty {
                            Text(description)
                                .font(.system(size: 14))
                                .foregroundColor(LunaraColors.secondaryText)
                                .lineLimit(2)
                        }
                    }
                    
                    Spacer()
                    
                    // Price section
                    VStack(alignment: .trailing, spacing: 4) {
                        Text(service.formattedPrice)
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(LunaraColors.primaryText)
                        
                        if let originalPrice = service.originalPrice, originalPrice > service.price {
                            Text(Service.formatPrice(originalPrice))
                                .font(.system(size: 14))
                                .foregroundColor(LunaraColors.secondaryText)
                                .strikethrough()
                        }
                    }
                }
                
                // Additional info row
                additionalInfoRow
            }
            .padding(16)
            
            // Action section
            actionSection
        }
        .background(LunaraColors.cardBackground)
        .cornerRadius(12)
        .shadow(color: LunaraColors.cardShadow, radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Components
    
    private var popularBadge: some View {
        Text("Popular")
            .font(.system(size: 10, weight: .semibold))
            .foregroundColor(.white)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(LunaraColors.warmGold)
            .cornerRadius(8)
    }
    
    private func durationChip(duration: Int) -> some View {
        HStack(spacing: 4) {
            Image(systemName: "clock")
                .font(.system(size: 10))
            
            Text(Service.formatDuration(duration))
                .font(.system(size: 12, weight: .medium))
        }
        .foregroundColor(LunaraColors.secondaryText)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(LunaraColors.coolLightGray.opacity(0.5))
        .cornerRadius(12)
    }
    
    private func categoryChip(category: String) -> some View {
        Text(category)
            .font(.system(size: 12, weight: .medium))
            .foregroundColor(LunaraColors.warmGold)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(LunaraColors.warmGold.opacity(0.1))
            .cornerRadius(12)
    }
    
    private var additionalInfoRow: some View {
        HStack(spacing: 16) {
            // Available employees count
            if service.availableEmployeesCount > 0 {
                HStack(spacing: 4) {
                    Image(systemName: "person.2")
                        .font(.system(size: 12))
                        .foregroundColor(LunaraColors.secondaryText)
                    
                    Text("\(service.availableEmployeesCount) available")
                        .font(.system(size: 12))
                        .foregroundColor(LunaraColors.secondaryText)
                }
            }
            
            Spacer()
            
            // Next available slot
            if let nextAvailable = service.nextAvailableSlot {
                HStack(spacing: 4) {
                    Image(systemName: "calendar")
                        .font(.system(size: 12))
                        .foregroundColor(LunaraColors.success)
                    
                    Text("Next: \(nextAvailable)")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(LunaraColors.success)
                }
            }
        }
    }
    
    private var actionSection: some View {
        HStack(spacing: 12) {
            // Book button
            Button(action: onBookTap) {
                HStack(spacing: 8) {
                    Image(systemName: "calendar.badge.plus")
                        .font(.system(size: 14, weight: .medium))
                    
                    Text("Book Now")
                        .font(.system(size: 16, weight: .semibold))
                }
                .foregroundColor(LunaraColors.buttonPrimaryText)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(service.isBookable ? LunaraColors.buttonPrimary : LunaraColors.coolLightGray)
                .cornerRadius(8)
            }
            .disabled(!service.isBookable)
            
            // Quick info button
            Button(action: {
                // TODO: Show service details modal
            }) {
                Image(systemName: "info.circle")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(LunaraColors.warmGold)
                    .frame(width: 44, height: 44)
                    .background(LunaraColors.warmGold.opacity(0.1))
                    .cornerRadius(8)
            }
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 16)
    }
}

// MARK: - Service Extensions
extension Service {
    var isPopular: Bool {
        // This could be determined by booking frequency, ratings, etc.
        // For now, using a simple heuristic
        return name.lowercased().contains("cut") || name.lowercased().contains("facial")
    }
    
    var availableEmployeesCount: Int {
        // TODO: Get actual count from API
        return Int.random(in: 1...3)
    }
    
    var nextAvailableSlot: String? {
        // TODO: Get actual next available slot from API
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, h:mm a"
        let nextSlot = Date().addingTimeInterval(TimeInterval.random(in: 3600...86400))
        return formatter.string(from: nextSlot)
    }
    
    var originalPrice: Double? {
        // TODO: Get original price if there's a discount
        return nil
    }
    
    static func formatDuration(_ minutes: Int) -> String {
        if minutes < 60 {
            return "\(minutes)m"
        } else {
            let hours = minutes / 60
            let remainingMinutes = minutes % 60
            if remainingMinutes == 0 {
                return "\(hours)h"
            } else {
                return "\(hours)h \(remainingMinutes)m"
            }
        }
    }
    
    static func formatPrice(_ price: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD" // TODO: Use shop's currency
        return formatter.string(from: NSNumber(value: price)) ?? "$\(price)"
    }
}

// MARK: - Enhanced Service Section
struct EnhancedServicesSection: View {
    let shop: Shop
    @State private var services: [Service] = []
    @State private var isLoading = true
    @State private var selectedCategory: String? = nil
    @State private var showingAllServices = false
    
    private var serviceCategories: [String] {
        let categories = services.compactMap { $0.category }.unique()
        return categories.sorted()
    }
    
    private var filteredServices: [Service] {
        if let category = selectedCategory {
            return services.filter { $0.category == category }
        }
        return services
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Section Header
            HStack {
                Text("Services")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
                
                if !isLoading && services.count > 3 {
                    Button(action: {
                        showingAllServices = true
                    }) {
                        Text("View All")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(LunaraColors.warmGold)
                    }
                }
            }
            
            // Category Filter
            if !serviceCategories.isEmpty {
                categoryFilterView
            }
            
            // Services List
            if isLoading {
                VStack(spacing: 12) {
                    ForEach(0..<3, id: \.self) { _ in
                        ServiceCardSkeleton()
                    }
                }
            } else if filteredServices.isEmpty {
                EmptyServicesView()
            } else {
                VStack(spacing: 12) {
                    ForEach(filteredServices.prefix(3)) { service in
                        EnhancedServiceCard(service: service) {
                            // TODO: Navigate to booking flow
                        }
                    }
                }
            }
        }
        .onAppear {
            loadServices()
        }
        .sheet(isPresented: $showingAllServices) {
            AllServicesView(shop: shop)
        }
    }
    
    private var categoryFilterView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                // All categories button
                categoryButton(title: "All", isSelected: selectedCategory == nil) {
                    selectedCategory = nil
                }
                
                // Individual category buttons
                ForEach(serviceCategories, id: \.self) { category in
                    categoryButton(title: category, isSelected: selectedCategory == category) {
                        selectedCategory = category
                    }
                }
            }
            .padding(.horizontal, 20)
        }
        .padding(.horizontal, -20)
    }
    
    private func categoryButton(title: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(isSelected ? .white : LunaraColors.warmGold)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? LunaraColors.warmGold : LunaraColors.warmGold.opacity(0.1))
                .cornerRadius(20)
        }
    }
    
    private func loadServices() {
        Task {
            do {
                let loadedServices = try await APIClient.shared.getShopServices(shopId: shop.id)
                await MainActor.run {
                    // Backend already filters for active services with active employees
                    services = loadedServices
                    isLoading = false
                }
            } catch {
                print("❌ Failed to load services: \(error)")
                await MainActor.run {
                    // Fallback to empty array on error
                    services = []
                    isLoading = false
                }
            }
        }
    }
}

// MARK: - Preview
struct EnhancedServiceCard_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 16) {
            EnhancedServiceCard(service: Service.preview) {
                print("Book tapped")
            }
            
            EnhancedServicesSection(shop: Shop.preview)
        }
        .padding()
    }
}
