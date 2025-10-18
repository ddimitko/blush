//
//  ConnectPayoutsTabView.swift
//  LunaraApp
//
//  Created by Lunara Team on 29/07/2025.
//

import SwiftUI

/// Payouts tab for Stripe Connect management
struct ConnectPayoutsTabView: View {
    // MARK: - Properties
    let shop: Shop
    @ObservedObject var stripeService: StripeConnectService
    
    // MARK: - State
    @State private var isLoading = false
    @State private var payouts: [StripeConnectPayoutResponse.Payout] = []
    @State private var hasMore = false
    @State private var isLoadingMore = false
    
    var body: some View {
        VStack(spacing: 24) {
            if isLoading && payouts.isEmpty {
                loadingView
            } else if !payouts.isEmpty {
                // Payouts Summary
                payoutsSummaryCard
                
                // Payouts List
                payoutsListCard
            } else {
                noPayoutsView
            }
        }
        .onAppear {
            loadPayouts()
        }
    }
    
    // MARK: - Payouts Summary Card
    private var payoutsSummaryCard: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Payouts Summary")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
                
                Button("Refresh") {
                    loadPayouts()
                }
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
                .disabled(isLoading)
            }
            
            HStack(spacing: 20) {
                summaryItem(
                    title: "Total Payouts",
                    value: "\(payouts.count)",
                    color: LunaraColors.primaryText
                )
                
                Divider()
                    .frame(height: 40)
                
                summaryItem(
                    title: "This Month",
                    value: "\(payoutsThisMonth)",
                    color: LunaraColors.success
                )
                
                Divider()
                    .frame(height: 40)
                
                summaryItem(
                    title: "Pending",
                    value: "\(pendingPayouts)",
                    color: LunaraColors.warning
                )
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Payouts List Card
    private var payoutsListCard: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Recent Payouts")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
                
                if hasMore {
                    Button("Load More") {
                        loadMorePayouts()
                    }
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.warmGold)
                    .disabled(isLoadingMore)
                }
            }
            
            LazyVStack(spacing: 12) {
                ForEach(payouts, id: \.id) { payout in
                    payoutRow(payout)
                }
                
                if isLoadingMore {
                    HStack {
                        ProgressView()
                            .scaleEffect(0.8)
                            .tint(LunaraColors.warmGold)
                        
                        Text("Loading more...")
                            .font(.system(size: 14))
                            .foregroundColor(LunaraColors.secondaryText)
                    }
                    .padding(.vertical, 8)
                }
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - No Payouts View
    private var noPayoutsView: some View {
        VStack(spacing: 16) {
            Image(systemName: "arrow.up.circle")
                .font(.system(size: 48))
                .foregroundColor(LunaraColors.secondaryText)
            
            Text("No Payouts Yet")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            Text("Payouts will appear here once you start receiving payments and they're processed.")
                .font(.system(size: 14))
                .foregroundColor(LunaraColors.secondaryText)
                .multilineTextAlignment(.center)
            
            Button("Refresh") {
                loadPayouts()
            }
            .font(.system(size: 16, weight: .medium))
            .foregroundColor(LunaraColors.white)
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .background(LunaraColors.warmGold)
            .cornerRadius(8)
        }
        .padding(32)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
                .tint(LunaraColors.warmGold)
            
            Text("Loading payouts...")
                .font(.system(size: 16))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.top, 100)
    }
    
    // MARK: - Helper Views
    private func summaryItem(title: String, value: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(color)
            
            Text(title)
                .font(.system(size: 12))
                .foregroundColor(LunaraColors.secondaryText)
        }
    }
    
    private func payoutRow(_ payout: StripeConnectPayoutResponse.Payout) -> some View {
        VStack(spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(formatAmount(payout.amount, currency: payout.currency))
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(LunaraColors.primaryText)
                        
                        statusBadge(status: payout.status)
                    }
                    
                    if let description = payout.description {
                        Text(description)
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.secondaryText)
                            .lineLimit(1)
                    }
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text(formatDate(payout.created))
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    Text("Arrives: \(formatDate(payout.arrivalDate))")
                        .font(.system(size: 11))
                        .foregroundColor(LunaraColors.secondaryText)
                }
            }
            
            HStack {
                Text("Method: \(payout.method.capitalized)")
                    .font(.system(size: 11))
                    .foregroundColor(LunaraColors.secondaryText)
                
                Spacer()
                
                Text("ID: \(String(payout.id.prefix(12)))...")
                    .font(.system(size: 11))
                    .foregroundColor(LunaraColors.secondaryText)
            }
        }
        .padding(12)
        .background(LunaraColors.coolLightGray.opacity(0.3))
        .cornerRadius(8)
    }
    
    private func statusBadge(status: String) -> some View {
        Text(status.capitalized)
            .font(.system(size: 10, weight: .medium))
            .foregroundColor(statusColor(status))
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(statusColor(status).opacity(0.1))
            .cornerRadius(4)
    }
    
    // MARK: - Computed Properties
    private var payoutsThisMonth: Int {
        let currentMonth = Calendar.current.component(.month, from: Date())
        let currentYear = Calendar.current.component(.year, from: Date())
        
        return payouts.filter { payout in
            let payoutDate = Date(timeIntervalSince1970: TimeInterval(payout.created))
            let payoutMonth = Calendar.current.component(.month, from: payoutDate)
            let payoutYear = Calendar.current.component(.year, from: payoutDate)
            return payoutMonth == currentMonth && payoutYear == currentYear
        }.count
    }
    
    private var pendingPayouts: Int {
        return payouts.filter { $0.status == "pending" || $0.status == "in_transit" }.count
    }
    
    // MARK: - Helper Methods
    private func loadPayouts() {
        guard let account = stripeService.connectAccount,
              account.chargesEnabled && account.payoutsEnabled else { return }
        
        isLoading = true
        
        Task {
            do {
                let response = try await APIClient.shared.getStripeConnectPayouts(shopId: shop.id, limit: 20)
                await MainActor.run {
                    payouts = response.data
                    hasMore = response.hasMore
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                }
                print("❌ Failed to load payouts: \(error)")
            }
        }
    }
    
    private func loadMorePayouts() {
        guard hasMore, !isLoadingMore, let lastPayout = payouts.last else { return }
        
        isLoadingMore = true
        
        Task {
            do {
                let response = try await APIClient.shared.getStripeConnectPayouts(
                    shopId: shop.id,
                    limit: 20,
                    startingAfter: lastPayout.id
                )
                await MainActor.run {
                    payouts.append(contentsOf: response.data)
                    hasMore = response.hasMore
                    isLoadingMore = false
                }
            } catch {
                await MainActor.run {
                    isLoadingMore = false
                }
                print("❌ Failed to load more payouts: \(error)")
            }
        }
    }
    
    private func formatAmount(_ amount: Int, currency: String) -> String {
        let value = Double(amount) / 100.0
        let symbol = getCurrencySymbol(currency)
        return String(format: "%@%.2f", symbol, value)
    }
    
    private func getCurrencySymbol(_ currency: String) -> String {
        switch currency.lowercased() {
        case "eur": return "€"
        case "usd": return "$"
        case "gbp": return "£"
        default: return currency.uppercased() + " "
        }
    }
    
    private func formatDate(_ timestamp: Int) -> String {
        let date = Date(timeIntervalSince1970: TimeInterval(timestamp))
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }
    
    private func statusColor(_ status: String) -> Color {
        switch status.lowercased() {
        case "paid": return LunaraColors.success
        case "pending", "in_transit": return LunaraColors.warning
        case "failed", "canceled": return LunaraColors.error
        default: return LunaraColors.secondaryText
        }
    }
}

#Preview {
    ConnectPayoutsTabView(shop: Shop.preview, stripeService: StripeConnectService.shared)
}
