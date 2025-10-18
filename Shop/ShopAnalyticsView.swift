//
//  ShopAnalyticsView.swift
//  LunaraApp
//
//  Created by Lunara Team on 24/07/2025.
//

import SwiftUI

/// Analytics view for shop owners to view performance metrics
struct ShopAnalyticsView: View {
    // MARK: - Properties
    let shop: Shop
    
    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss
    
    // MARK: - State
    @StateObject private var analyticsService = AnalyticsService.shared
    @State private var selectedTab: AnalyticsTab = .overview
    @State private var selectedPeriod: AnalyticsPeriod = .thisWeek
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showingError = false
    
    enum AnalyticsTab: String, CaseIterable {
        case overview = "Overview"
        case revenue = "Revenue"
        case appointments = "Appointments"
        case customers = "Customers"
        
        var icon: String {
            switch self {
            case .overview: return "chart.bar"
            case .revenue: return "dollarsign.circle"
            case .appointments: return "calendar"
            case .customers: return "person.2"
            }
        }
    }
    
    enum AnalyticsPeriod: String, CaseIterable {
        case thisWeek = "This Week"
        case thisMonth = "This Month"
        case last30Days = "Last 30 Days"
        case thisYear = "This Year"
        
        var apiValue: String {
            switch self {
            case .thisWeek: return "week"
            case .thisMonth: return "month"
            case .last30Days: return "30days"
            case .thisYear: return "year"
            }
        }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Tab selector
                tabSelectorView
                
                // Period selector
                periodSelectorView
                
                // Content based on selected tab
                if isLoading {
                    loadingView
                } else {
                    ScrollView {
                        VStack(spacing: 24) {
                            switch selectedTab {
                            case .overview:
                                overviewView
                            case .revenue:
                                revenueView
                            case .appointments:
                                appointmentsView
                            case .customers:
                                customersView
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.bottom, 32)
                    }
                }
            }
            .navigationTitle("Analytics")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.secondaryText)
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Refresh") {
                        refreshAnalytics()
                    }
                    .foregroundColor(LunaraColors.warmGold)
                }
            }
        }
        .onAppear {
            loadAnalytics()
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage ?? "An error occurred")
        }
    }
    
    // MARK: - Tab Selector View
    private var tabSelectorView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 0) {
                ForEach(AnalyticsTab.allCases, id: \.self) { tab in
                    Button(action: {
                        selectedTab = tab
                    }) {
                        VStack(spacing: 6) {
                            Image(systemName: tab.icon)
                                .font(.system(size: 16))
                            
                            Text(tab.rawValue)
                                .font(.system(size: 12, weight: .medium))
                        }
                        .foregroundColor(selectedTab == tab ? LunaraColors.warmGold : LunaraColors.secondaryText)
                        .frame(width: 80)
                        .padding(.vertical, 12)
                    }
                }
            }
            .padding(.horizontal, 16)
        }
        .background(LunaraColors.white)
        .overlay(
            Rectangle()
                .fill(LunaraColors.coolLightGray.opacity(0.3))
                .frame(height: 1),
            alignment: .bottom
        )
    }
    
    // MARK: - Period Selector View
    private var periodSelectorView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(AnalyticsPeriod.allCases, id: \.self) { period in
                    Button(action: {
                        selectedPeriod = period
                        refreshAnalytics()
                    }) {
                        Text(period.rawValue)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(selectedPeriod == period ? .white : LunaraColors.primaryText)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(
                                selectedPeriod == period ?
                                LunaraColors.warmGold :
                                LunaraColors.coolLightGray.opacity(0.3)
                            )
                            .cornerRadius(20)
                    }
                }
            }
            .padding(.horizontal, 16)
        }
        .padding(.vertical, 12)
        .background(LunaraColors.white)
        .overlay(
            Rectangle()
                .fill(LunaraColors.coolLightGray.opacity(0.3))
                .frame(height: 1),
            alignment: .bottom
        )
    }
    
    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
                .tint(LunaraColors.warmGold)
            
            Text("Loading analytics...")
                .font(.system(size: 16))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.coolLightGray.opacity(0.3))
    }
    
    // MARK: - Overview View
    private var overviewView: some View {
        VStack(spacing: 20) {
            // Key metrics cards
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2), spacing: 16) {
                MetricCard(
                    title: "Total Revenue",
                    value: formatCurrency(analyticsService.totalRevenue),
                    icon: "dollarsign.circle.fill",
                    color: LunaraColors.success
                )
                
                MetricCard(
                    title: "Appointments",
                    value: "\(analyticsService.thisWeekAppointments)",
                    icon: "calendar.circle.fill",
                    color: LunaraColors.info
                )
                
                MetricCard(
                    title: "Services",
                    value: "\(analyticsService.servicesCount)",
                    icon: "scissors.circle.fill",
                    color: LunaraColors.warning
                )
                
                MetricCard(
                    title: "Team Members",
                    value: "\(analyticsService.employeesCount)",
                    icon: "person.2.circle.fill",
                    color: LunaraColors.warmGold
                )
            }
            
            // Recent activity summary
            analyticsSection("Recent Activity") {
                VStack(spacing: 12) {
                    Text("Detailed activity tracking coming soon!")
                        .font(.system(size: 16))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)
                        .padding(.vertical, 20)
                }
            }
        }
    }
    
    // MARK: - Revenue View
    private var revenueView: some View {
        VStack(spacing: 20) {
            analyticsSection("Revenue Analytics") {
                VStack(spacing: 16) {
                    Text("Revenue tracking and charts coming soon!")
                        .font(.system(size: 16))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)
                        .padding(.vertical, 40)
                    
                    Text("You'll be able to view revenue trends, payment breakdowns, and financial insights.")
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)
                }
            }
        }
    }
    
    // MARK: - Appointments View
    private var appointmentsView: some View {
        VStack(spacing: 20) {
            analyticsSection("Appointment Analytics") {
                VStack(spacing: 16) {
                    Text("Appointment analytics coming soon!")
                        .font(.system(size: 16))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)
                        .padding(.vertical, 40)
                    
                    Text("Track booking patterns, popular services, and appointment completion rates.")
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)
                }
            }
        }
    }
    
    // MARK: - Customers View
    private var customersView: some View {
        VStack(spacing: 20) {
            analyticsSection("Customer Analytics") {
                VStack(spacing: 16) {
                    Text("Customer insights coming soon!")
                        .font(.system(size: 16))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)
                        .padding(.vertical, 40)
                    
                    Text("Analyze customer behavior, retention rates, and satisfaction metrics.")
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                        .multilineTextAlignment(.center)
                }
            }
        }
    }
    
    // MARK: - Helper Views
    private func analyticsSection<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            content()
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD" // TODO: Use shop's currency
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }
    
    // MARK: - Methods
    private func loadAnalytics() {
        isLoading = true
        errorMessage = nil
        
        Task {
            await analyticsService.loadShopAnalytics(shopId: shop.id)
            await MainActor.run {
                isLoading = false
                if let error = analyticsService.error {
                    errorMessage = error
                    showingError = true
                }
            }
        }
    }
    
    private func refreshAnalytics() {
        Task {
            await analyticsService.refreshIfNeeded(shopId: shop.id)
        }
    }
}

// MARK: - Metric Card Component
struct MetricCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 24))
                    .foregroundColor(color)
                
                Spacer()
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(value)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Text(title)
                    .font(.system(size: 12))
                    .foregroundColor(LunaraColors.secondaryText)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
}

#Preview {
    ShopAnalyticsView(shop: Shop.preview)
}
