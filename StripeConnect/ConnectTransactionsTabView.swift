//
//  ConnectTransactionsTabView.swift
//  LunaraApp
//
//  Created by Lunara Team on 29/07/2025.
//

import SwiftUI

/// Transactions tab for Stripe Connect management
struct ConnectTransactionsTabView: View {
    // MARK: - Properties
    let shop: Shop
    @ObservedObject var stripeService: StripeConnectService
    
    // MARK: - State
    @State private var isLoading = false
    @State private var transactions: [StripeConnectTransactionResponse.Transaction] = []
    @State private var hasMore = false
    @State private var isLoadingMore = false
    @State private var selectedFilter: TransactionFilter = .all
    
    // MARK: - Filter Enum
    enum TransactionFilter: String, CaseIterable {
        case all = "All"
        case charges = "Charges"
        case refunds = "Refunds"
        case fees = "Fees"
        case payouts = "Payouts"
        
        var icon: String {
            switch self {
            case .all: return "list.bullet"
            case .charges: return "plus.circle"
            case .refunds: return "minus.circle"
            case .fees: return "percent"
            case .payouts: return "arrow.up.circle"
            }
        }
    }
    
    var body: some View {
        VStack(spacing: 24) {
            // Filter Section
            filterSection
            
            if isLoading && transactions.isEmpty {
                loadingView
            } else if !filteredTransactions.isEmpty {
                // Transactions Summary
                transactionsSummaryCard
                
                // Transactions List
                transactionsListCard
            } else {
                noTransactionsView
            }
        }
        .onAppear {
            loadTransactions()
        }
    }
    
    // MARK: - Filter Section
    private var filterSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(TransactionFilter.allCases, id: \.self) { filter in
                    filterButton(for: filter)
                }
            }
            .padding(.horizontal, 16)
        }
    }
    
    // MARK: - Transactions Summary Card
    private var transactionsSummaryCard: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Transactions Summary")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
                
                Button("Refresh") {
                    loadTransactions()
                }
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
                .disabled(isLoading)
            }
            
            HStack(spacing: 20) {
                summaryItem(
                    title: "Total",
                    value: "\(filteredTransactions.count)",
                    color: LunaraColors.primaryText
                )
                
                Divider()
                    .frame(height: 40)
                
                summaryItem(
                    title: "This Month",
                    value: "\(transactionsThisMonth)",
                    color: LunaraColors.success
                )
                
                Divider()
                    .frame(height: 40)
                
                summaryItem(
                    title: "Volume",
                    value: totalVolume,
                    color: LunaraColors.warmGold
                )
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Transactions List Card
    private var transactionsListCard: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Recent Transactions")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
                
                if hasMore {
                    Button("Load More") {
                        loadMoreTransactions()
                    }
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.warmGold)
                    .disabled(isLoadingMore)
                }
            }
            
            LazyVStack(spacing: 12) {
                ForEach(filteredTransactions, id: \.id) { transaction in
                    transactionRow(transaction)
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
    
    // MARK: - No Transactions View
    private var noTransactionsView: some View {
        VStack(spacing: 16) {
            Image(systemName: "list.bullet.circle")
                .font(.system(size: 48))
                .foregroundColor(LunaraColors.secondaryText)
            
            Text("No Transactions")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            Text(selectedFilter == .all ? 
                 "Transactions will appear here once you start processing payments." :
                 "No transactions found for the selected filter.")
                .font(.system(size: 14))
                .foregroundColor(LunaraColors.secondaryText)
                .multilineTextAlignment(.center)
            
            Button("Refresh") {
                loadTransactions()
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
            
            Text("Loading transactions...")
                .font(.system(size: 16))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.top, 100)
    }
    
    // MARK: - Helper Views
    private func filterButton(for filter: TransactionFilter) -> some View {
        Button(action: {
            selectedFilter = filter
        }) {
            HStack(spacing: 6) {
                Image(systemName: filter.icon)
                    .font(.system(size: 12))
                
                Text(filter.rawValue)
                    .font(.system(size: 14, weight: .medium))
            }
            .foregroundColor(selectedFilter == filter ? LunaraColors.white : LunaraColors.primaryText)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(selectedFilter == filter ? LunaraColors.warmGold : LunaraColors.coolLightGray.opacity(0.3))
            .cornerRadius(16)
        }
    }
    
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
    
    private func transactionRow(_ transaction: StripeConnectTransactionResponse.Transaction) -> some View {
        VStack(spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(formatAmount(transaction.amount, currency: transaction.currency))
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(transaction.amount >= 0 ? LunaraColors.success : LunaraColors.error)
                        
                        typeBadge(type: transaction.type)
                        statusBadge(status: transaction.status)
                    }
                    
                    if let description = transaction.description {
                        Text(description)
                            .font(.system(size: 12))
                            .foregroundColor(LunaraColors.secondaryText)
                            .lineLimit(2)
                    }
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text(formatDate(transaction.created))
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    Text("ID: \(String(transaction.id.prefix(8)))...")
                        .font(.system(size: 11))
                        .foregroundColor(LunaraColors.secondaryText)
                }
            }
        }
        .padding(12)
        .background(LunaraColors.coolLightGray.opacity(0.3))
        .cornerRadius(8)
    }
    
    private func typeBadge(type: String) -> some View {
        Text(type.capitalized)
            .font(.system(size: 10, weight: .medium))
            .foregroundColor(typeColor(type))
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(typeColor(type).opacity(0.1))
            .cornerRadius(4)
    }
    
    private func statusBadge(status: String) -> some View {
        Text(status.capitalized)
            .font(.system(size: 10, weight: .medium))
            .foregroundColor(statusColor(status))
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(statusColor(status).opacity(0.1))
            .cornerRadius(4)
    }
    
    // MARK: - Computed Properties
    private var filteredTransactions: [StripeConnectTransactionResponse.Transaction] {
        switch selectedFilter {
        case .all:
            return transactions
        case .charges:
            return transactions.filter { $0.type.contains("charge") || $0.type.contains("payment") }
        case .refunds:
            return transactions.filter { $0.type.contains("refund") }
        case .fees:
            return transactions.filter { $0.type.contains("fee") }
        case .payouts:
            return transactions.filter { $0.type.contains("payout") }
        }
    }
    
    private var transactionsThisMonth: Int {
        let currentMonth = Calendar.current.component(.month, from: Date())
        let currentYear = Calendar.current.component(.year, from: Date())
        
        return filteredTransactions.filter { transaction in
            let transactionDate = Date(timeIntervalSince1970: TimeInterval(transaction.created))
            let transactionMonth = Calendar.current.component(.month, from: transactionDate)
            let transactionYear = Calendar.current.component(.year, from: transactionDate)
            return transactionMonth == currentMonth && transactionYear == currentYear
        }.count
    }
    
    private var totalVolume: String {
        let total = filteredTransactions.reduce(0) { $0 + abs($1.amount) }
        guard let firstTransaction = filteredTransactions.first else { return "€0.00" }
        return formatAmount(total, currency: firstTransaction.currency)
    }
    
    // MARK: - Helper Methods
    private func loadTransactions() {
        guard let account = stripeService.connectAccount,
              account.chargesEnabled && account.payoutsEnabled else { return }
        
        isLoading = true
        
        Task {
            do {
                let response = try await APIClient.shared.getStripeConnectTransactions(shopId: shop.id, limit: 20)
                await MainActor.run {
                    transactions = response.data
                    hasMore = response.hasMore
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                }
                print("❌ Failed to load transactions: \(error)")
            }
        }
    }
    
    private func loadMoreTransactions() {
        guard hasMore, !isLoadingMore, let lastTransaction = transactions.last else { return }
        
        isLoadingMore = true
        
        Task {
            do {
                let response = try await APIClient.shared.getStripeConnectTransactions(
                    shopId: shop.id,
                    limit: 20,
                    startingAfter: lastTransaction.id
                )
                await MainActor.run {
                    transactions.append(contentsOf: response.data)
                    hasMore = response.hasMore
                    isLoadingMore = false
                }
            } catch {
                await MainActor.run {
                    isLoadingMore = false
                }
                print("❌ Failed to load more transactions: \(error)")
            }
        }
    }
    
    private func formatAmount(_ amount: Int, currency: String) -> String {
        let value = Double(amount) / 100.0
        let symbol = getCurrencySymbol(currency)
        let prefix = amount >= 0 ? "+" : ""
        return String(format: "%@%@%.2f", prefix, symbol, value)
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
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
    
    private func typeColor(_ type: String) -> Color {
        switch type.lowercased() {
        case let t where t.contains("charge") || t.contains("payment"):
            return LunaraColors.success
        case let t where t.contains("refund"):
            return LunaraColors.error
        case let t where t.contains("fee"):
            return LunaraColors.warning
        case let t where t.contains("payout"):
            return LunaraColors.primaryText
        default:
            return LunaraColors.secondaryText
        }
    }
    
    private func statusColor(_ status: String) -> Color {
        switch status.lowercased() {
        case "succeeded", "paid": return LunaraColors.success
        case "pending", "processing": return LunaraColors.warning
        case "failed", "canceled": return LunaraColors.error
        default: return LunaraColors.secondaryText
        }
    }
}

#Preview {
    ConnectTransactionsTabView(shop: Shop.preview, stripeService: StripeConnectService.shared)
}
