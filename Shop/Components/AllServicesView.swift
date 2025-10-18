//
//  AllServicesView.swift
//  LunaraApp
//
//  Created by Lunara Team on 28/07/2025.
//

import SwiftUI

struct AllServicesView: View {
    let shop: Shop
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var appState: AppState
    
    @State private var services: [Service] = []
    @State private var isLoading = true
    @State private var selectedCategory: String? = nil
    @State private var searchText = ""
    @State private var sortOption: AllServicesSortOption = .name
    
    private var serviceCategories: [String] {
        let categories = services.compactMap { $0.category }.unique().sorted()
        return categories
    }
    
    private var filteredAndSortedServices: [Service] {
        var filtered = services
        
        // Apply category filter
        if let category = selectedCategory {
            filtered = filtered.filter { $0.category == category }
        }
        
        // Apply search filter
        if !searchText.isEmpty {
            filtered = filtered.filter { service in
                service.name.localizedCaseInsensitiveContains(searchText) ||
                service.description?.localizedCaseInsensitiveContains(searchText) == true ||
                service.category?.localizedCaseInsensitiveContains(searchText) == true
            }
        }
        
        // Apply sorting
        switch sortOption {
        case .name:
            return filtered.sorted { $0.name < $1.name }
        case .price:
            return filtered.sorted { $0.price < $1.price }
        case .duration:
            return filtered.sorted { $0.durationMinutes < $1.durationMinutes }
        case .popularity:
            return filtered.sorted { $0.isPopular && !$1.isPopular }
        }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Search and Filter Section
                searchAndFilterSection
                
                // Services List
                if isLoading {
                    loadingView
                } else if filteredAndSortedServices.isEmpty {
                    emptyStateView
                } else {
                    servicesListView
                }
            }
            .navigationTitle("All Services")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.warmGold)
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Picker("Sort by", selection: $sortOption) {
                            ForEach(AllServicesSortOption.allCases, id: \.self) { option in
                                Label(option.displayName, systemImage: option.iconName)
                                    .tag(option)
                            }
                        }
                    } label: {
                        Image(systemName: "arrow.up.arrow.down")
                            .foregroundColor(LunaraColors.warmGold)
                    }
                }
            }
        }
        .onAppear {
            loadServices()
        }
    }
    
    // MARK: - Search and Filter Section
    private var searchAndFilterSection: some View {
        VStack(spacing: 16) {
            // Search Bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(LunaraColors.secondaryText)
                
                TextField("Search services...", text: $searchText)
                    .textFieldStyle(PlainTextFieldStyle())
                
                if !searchText.isEmpty {
                    Button(action: {
                        searchText = ""
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(LunaraColors.coolLightGray.opacity(0.3))
            .cornerRadius(12)
            
            // Category Filter
            if !serviceCategories.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        categoryButton(title: "All", isSelected: selectedCategory == nil) {
                            selectedCategory = nil
                        }
                        
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
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
        .background(LunaraColors.white)
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
    
    // MARK: - Services List View
    private var servicesListView: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(filteredAndSortedServices) { service in
                    EnhancedServiceCard(service: service) {
                        appState.presentSheet(.bookingFlow(shop, service))
                        dismiss()
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
    }
    
    // MARK: - Loading View
    private var loadingView: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(0..<6, id: \.self) { _ in
                    ServiceCardSkeleton()
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
    }
    
    // MARK: - Empty State View
    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "scissors")
                .font(.system(size: 48))
                .foregroundColor(LunaraColors.warmGold.opacity(0.6))
            
            Text("No services found")
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            if !searchText.isEmpty || selectedCategory != nil {
                Text("Try adjusting your search or filter criteria")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
                
                Button("Clear Filters") {
                    searchText = ""
                    selectedCategory = nil
                }
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
                .padding(.top, 8)
            } else {
                Text("This shop hasn't added any services yet")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.secondaryText)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(.horizontal, 40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    // MARK: - Private Methods
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
                print("❌ Failed to load all services: \(error)")
                await MainActor.run {
                    // Fallback to empty array on error
                    services = []
                    isLoading = false
                }
            }
        }
    }
}

// MARK: - Service Sort Options
enum AllServicesSortOption: String, CaseIterable {
    case name = "name"
    case price = "price"
    case duration = "duration"
    case popularity = "popularity"
    
    var displayName: String {
        switch self {
        case .name: return "Name"
        case .price: return "Price"
        case .duration: return "Duration"
        case .popularity: return "Popularity"
        }
    }
    
    var iconName: String {
        switch self {
        case .name: return "textformat.abc"
        case .price: return "dollarsign.circle"
        case .duration: return "clock"
        case .popularity: return "star"
        }
    }
}

// MARK: - Array Extension
extension Array where Element: Hashable {
    func unique() -> [Element] {
        return Array(Set(self))
    }
}

// MARK: - Preview
struct AllServicesView_Previews: PreviewProvider {
    static var previews: some View {
        AllServicesView(shop: Shop.preview)
            .environmentObject(AppState.shared)
    }
}
