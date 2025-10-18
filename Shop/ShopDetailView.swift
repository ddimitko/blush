//
//  ShopDetailView.swift
//  LunaraApp
//
//  Created by Lunara Team on 14/07/2025.
//

import SwiftUI
import Kingfisher

/// Main shop detail view displaying comprehensive shop information
struct ShopDetailView: View {
    // MARK: - Properties
    let shop: Shop
    
    // MARK: - Environment Objects
    @EnvironmentObject var authService: AuthenticationService
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var favoritesService: FavoritesService
    
    // MARK: - State
    @State private var selectedImageIndex = 0
    @State private var services: [Service] = []
    @State private var employees: [Employee] = []
    @State private var isLoadingServices = true
    @State private var isLoadingEmployees = true
    @State private var showingFullDescription = false
    @State private var showingGallery = false
    @State private var showingAllEmployees = false

    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 0) {
                    // Hero Image Section
                    heroImageSection
                    
                    // Shop Info Section
                    shopInfoSection
                    
                    // Action Buttons
                    actionButtonsSection

                    // Availability Insights
                    availabilitySection

                    // Services Section
                    servicesSection
                    
                    // Employees Section
                    employeesSection

                    // Reviews Section
                    reviewsSection

                    // Policies Section
                    policiesSection

                    // Contact & Hours Section
                    contactHoursSection
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarBackButtonHidden(true)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: {
                        appState.dismissSheet()
                    }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(LunaraColors.primaryText)
                            .frame(width: 32, height: 32)
                            .background(LunaraColors.white.opacity(0.9))
                            .clipShape(Circle())
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        Task {
                            if authService.isAuthenticated {
                                let _ = await favoritesService.toggleFavorite(shopId: shop.id)
                            } else {
                                // Show user profile (which will show login for unauthenticated users)
                                appState.presentSheet(.userProfile)
                            }
                        }
                    }) {
                        Image(systemName: favoritesService.isShopFavorited(shop.id) ? "heart.fill" : "heart")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(favoritesService.isShopFavorited(shop.id) ? LunaraColors.warmGold : LunaraColors.primaryText)
                            .frame(width: 32, height: 32)
                            .background(LunaraColors.white.opacity(0.9))
                            .clipShape(Circle())
                    }
                }
            }
        }
        .onAppear {
            loadShopData()

            // Load favorite status if authenticated
            if authService.isAuthenticated {
                Task {
                    await favoritesService.loadFavoriteStatus(shopId: shop.id)
                }
            }
        }
        .sheet(isPresented: $showingGallery) {
            ShopGalleryView(images: shop.gallery ?? [], selectedIndex: $selectedImageIndex)
        }
        .sheet(isPresented: $showingAllEmployees) {
            AllEmployeesView(shop: shop, employees: employees)
        }
    }
    
    // MARK: - Hero Image Section
    private var heroImageSection: some View {
        ZStack(alignment: .bottomLeading) {
            // Main Image
            KFImage(getShopImageURL(shop))
                .downloader(ImageService.shared.downloader)
                .onFailure { error in
                    // Only log if it's not an expected empty source error
                    if case .imageSettingError(let reason) = error,
                       case .emptySource = reason {
                        // Expected behavior for shops without images - no need to log
                    } else {
                        print("❌ Shop image loading failed: \(error) for shop: \(shop.name)")
                    }
                }
                .placeholder {
                    Rectangle()
                        .fill(LunaraColors.coolLightGray)
                        .overlay(
                            Image(systemName: "photo")
                                .font(.system(size: 40))
                                .foregroundColor(LunaraColors.charcoalGray.opacity(0.3))
                        )
                }
                .resizable()
                .aspectRatio(contentMode: .fill)
            .frame(height: 300)
            .clipped()
            .onTapGesture {
                if shop.gallery?.isEmpty == false {
                    showingGallery = true
                }
            }
            
            // Gradient Overlay
            LinearGradient(
                gradient: Gradient(colors: [
                    Color.clear,
                    Color.black.opacity(0.3)
                ]),
                startPoint: .top,
                endPoint: .bottom
            )
            
            // Gallery Indicator
            if (shop.gallery?.count ?? 0) > 1 {
                HStack {
                    Image(systemName: "photo.stack")
                        .font(.system(size: 14, weight: .medium))
                    Text("\(shop.gallery?.count ?? 0) photos")
                        .font(.system(size: 14, weight: .medium))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.black.opacity(0.5))
                .cornerRadius(16)
                .padding(.leading, 16)
                .padding(.bottom, 16)
            }
        }
    }
    
    // MARK: - Shop Info Section
    private var shopInfoSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Shop Name and Rating
            VStack(alignment: .leading, spacing: 8) {
                Text(shop.name)
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                
                HStack(spacing: 12) {
                    // Rating
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 14))
                            .foregroundColor(LunaraColors.warmGold)
                        
                        Text(shop.formattedRating)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(LunaraColors.primaryText)
                        
                        Text("(\(shop.ratingCount) reviews)")
                            .font(.system(size: 14))
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                    
                    Spacer()
                    
                    // Open/Closed Status
                    HStack(spacing: 6) {
                        Circle()
                            .fill(shop.isOpen ? LunaraColors.success : LunaraColors.error)
                            .frame(width: 8, height: 8)
                        
                        Text(shop.isOpen ? "Open" : "Closed")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(shop.isOpen ? LunaraColors.success : LunaraColors.error)
                    }
                }
            }
            
            // Business Types
            if !shop.businessTypes.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(shop.businessTypes, id: \.self) { businessType in
                            HStack(spacing: 6) {
                                Image(systemName: businessType.iconName)
                                    .font(.system(size: 12, weight: .medium))
                                
                                Text(businessType.displayName)
                                    .font(.system(size: 12, weight: .medium))
                            }
                            .foregroundColor(LunaraColors.warmGold)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(LunaraColors.warmGold.opacity(0.1))
                            .cornerRadius(16)
                        }
                    }
                    .padding(.horizontal, 20)
                }
                .padding(.horizontal, -20)
            }
            
            // Description
            VStack(alignment: .leading, spacing: 8) {
                Text(showingFullDescription ? shop.description : String(shop.description.prefix(150)))
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.primaryText)
                    .lineLimit(showingFullDescription ? nil : 3)
                
                if shop.description.count > 150 {
                    Button(action: {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            showingFullDescription.toggle()
                        }
                    }) {
                        Text(showingFullDescription ? "Show less" : "Show more")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(LunaraColors.warmGold)
                    }
                }
            }
            
            // Address
            HStack(spacing: 12) {
                Image(systemName: "location")
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.warmGold)
                
                Text(shop.fullAddress)
                    .font(.system(size: 16))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 20)
    }
    
    // MARK: - Action Buttons Section
    private var actionButtonsSection: some View {
        HStack(spacing: 12) {
            // Book Appointment Button
            Button(action: {
                appState.presentSheet(.bookingFlow(shop, nil))
            }) {
                HStack(spacing: 8) {
                    Image(systemName: "calendar.badge.plus")
                        .font(.system(size: 16, weight: .medium))

                    Text("Book Appointment")
                        .font(.system(size: 16, weight: .semibold))
                }
                .foregroundColor(LunaraColors.buttonPrimaryText)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(LunaraColors.buttonPrimary)
                .cornerRadius(12)
            }

            // Call Button
            Button(action: {
                if let phoneURL = URL(string: "tel:\(shop.phone)") {
                    UIApplication.shared.open(phoneURL)
                }
            }) {
                Image(systemName: "phone.fill")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(LunaraColors.warmGold)
                    .frame(width: 52, height: 52)
                    .background(LunaraColors.warmGold.opacity(0.1))
                    .cornerRadius(12)
            }

            // Directions Button
            Button(action: {
                openMaps()
            }) {
                Image(systemName: "location.fill")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(LunaraColors.warmGold)
                    .frame(width: 52, height: 52)
                    .background(LunaraColors.warmGold.opacity(0.1))
                    .cornerRadius(12)
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 20)
    }

    // MARK: - Availability Section
    private var availabilitySection: some View {
        AvailabilityInsightsSection(shop: shop)
            .padding(.horizontal, 20)
            .padding(.top, 24)
    }

    // MARK: - Services Section
    private var servicesSection: some View {
        EnhancedServicesSection(shop: shop)
            .padding(.horizontal, 20)
            .padding(.top, 24)
    }

    // MARK: - Employees Section
    private var employeesSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Section Header
            HStack {
                Text("Our Team")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)

                Spacer()

                if !isLoadingEmployees && employees.count > 3 {
                    Button(action: {
                        // Show all employees in a sheet
                        showingAllEmployees = true
                    }) {
                        Text("View All")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(LunaraColors.warmGold)
                    }
                }
            }

            if isLoadingEmployees {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(0..<3, id: \.self) { _ in
                            EmployeeCardSkeleton()
                        }
                    }
                    .padding(.horizontal, 20)
                }
                .padding(.horizontal, -20)
            } else if employees.isEmpty {
                EmptyEmployeesView()
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(employees.prefix(5)) { employee in
                            EmployeeCard(employee: employee)
                        }
                    }
                    .padding(.horizontal, 20)
                }
                .padding(.horizontal, -20)
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 24)
    }

    // MARK: - Reviews Section
    private var reviewsSection: some View {
        ReviewsSection(shop: shop)
            .padding(.horizontal, 20)
            .padding(.top, 24)
    }

    // MARK: - Policies Section
    private var policiesSection: some View {
        ShopPoliciesSection(shop: shop)
            .padding(.horizontal, 20)
            .padding(.top, 24)
    }

    // MARK: - Contact & Hours Section
    private var contactHoursSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Contact Information
            VStack(alignment: .leading, spacing: 16) {
                Text("Contact Information")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)

                VStack(spacing: 12) {
                    ContactInfoRow(icon: "phone", title: "Phone", value: shop.phone)
                    ContactInfoRow(icon: "envelope", title: "Email", value: shop.email)

                    if let website = shop.website {
                        ContactInfoRow(icon: "globe", title: "Website", value: website)
                    }
                }
            }

            // Business Hours
            if let businessHours = shop.businessHours, !businessHours.isEmpty {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Business Hours")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)

                    VStack(spacing: 8) {
                        ForEach(businessHours, id: \.id) { hours in
                            BusinessHoursRow(businessHours: hours)
                        }
                    }
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 24)
        .padding(.bottom, 40)
    }

    // MARK: - Private Methods
    private func loadShopData() {
        Task {
            await loadServices()
            await loadEmployees()
        }
    }

    private func loadServices() async {
        do {
            let loadedServices = try await APIClient.shared.getShopServices(shopId: shop.id)
            await MainActor.run {
                services = loadedServices
                isLoadingServices = false
            }
        } catch {
            print("❌ Failed to load services: \(error)")
            await MainActor.run {
                // Fallback to empty array on error
                services = []
                isLoadingServices = false
            }
        }
    }

    private func loadEmployees() async {
        do {
            let loadedEmployees = try await APIClient.shared.getShopEmployees(shopId: shop.id)
            await MainActor.run {
                employees = loadedEmployees
                isLoadingEmployees = false
            }
        } catch {
            print("❌ Failed to load employees: \(error)")
            await MainActor.run {
                // Fallback to empty array on error
                employees = []
                isLoadingEmployees = false
            }
        }
    }

    private func openMaps() {
        if let latitude = shop.latitude, let longitude = shop.longitude {
            let coordinate = "\(latitude),\(longitude)"
            let mapURL = URL(string: "http://maps.apple.com/?q=\(coordinate)")
            if let url = mapURL {
                UIApplication.shared.open(url)
            }
        } else {
            // Fallback to address search
            let encodedAddress = shop.fullAddress.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
            let mapURL = URL(string: "http://maps.apple.com/?q=\(encodedAddress)")
            if let url = mapURL {
                UIApplication.shared.open(url)
            }
        }
    }

    private func getImageUrl(_ url: String) -> String {
        // Return empty string for nil/empty URLs to prevent invalid requests
        if url.isEmpty {
            return ""
        }
        if url.starts(with: "http") {
            return url
        }
        return "https://109.104.206.19:8443\(url)"
    }

    private func getShopImageURL(_ shop: Shop) -> URL? {
        // Use thumbnail first, then fall back to first gallery image (like React app)
        let imageUrl = shop.thumbnail ?? shop.gallery?.first
        guard let imageUrl = imageUrl, !imageUrl.isEmpty else { return nil }
        return URL(string: getImageUrl(imageUrl))
    }
}

// MARK: - Preview
struct ShopDetailView_Previews: PreviewProvider {
    static var previews: some View {
        ShopDetailView(shop: Shop.preview)
            .environmentObject(AuthenticationService.shared)
            .environmentObject(AppState.shared)
            .environmentObject(FavoritesService.shared)
    }
}
