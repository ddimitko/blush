//
//  ConnectBalanceTabView.swift
//  LunaraApp
//
//  Created by Lunara Team on 29/07/2025.
//

import SwiftUI

/// Balance tab for Stripe Connect management
struct ConnectBalanceTabView: View {
    // MARK: - Properties
    let shop: Shop
    @ObservedObject var stripeService: StripeConnectService
    
    // MARK: - State
    @State private var isLoading = false
    
    var body: some View {
        VStack(spacing: 24) {
            if isLoading {
                loadingView
            } else if let balance = stripeService.accountBalance {
                // Available Balance Card
                availableBalanceCard(balance)
                
                // Pending Balance Card
                pendingBalanceCard(balance)
                
                // Balance Breakdown
                balanceBreakdownCard(balance)
                
                // Recent Activity Preview
                recentActivityCard
            } else {
                noBalanceView
            }
        }
        .onAppear {
            loadBalance()
        }
    }
    
    // MARK: - Available Balance Card
    private func availableBalanceCard(_ balance: StripeConnectBalanceResponse) -> some View {
        VStack(spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Available Balance")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    Text("Ready for payout")
                        .font(.system(size: 12))
                        .foregroundColor(LunaraColors.secondaryText)
                }
                
                Spacer()
                
                Image(systemName: "dollarsign.circle.fill")
                    .font(.system(size: 24))
                    .foregroundColor(LunaraColors.success)
            }
            
            VStack(spacing: 12) {
                ForEach(balance.available, id: \.currency) { amount in
                    balanceRow(amount: amount, isAvailable: true)
                }
                
                if balance.available.isEmpty {
                    Text("No available balance")
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Pending Balance Card
    private func pendingBalanceCard(_ balance: StripeConnectBalanceResponse) -> some View {
        VStack(spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Pending Balance")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)
                    
                    Text("Processing for payout")
                        .font(.system(size: 12))
                        .foregroundColor(LunaraColors.secondaryText)
                }
                
                Spacer()
                
                Image(systemName: "clock.circle.fill")
                    .font(.system(size: 24))
                    .foregroundColor(LunaraColors.warning)
            }
            
            VStack(spacing: 12) {
                ForEach(balance.pending, id: \.currency) { amount in
                    balanceRow(amount: amount, isAvailable: false)
                }
                
                if balance.pending.isEmpty {
                    Text("No pending balance")
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Balance Breakdown Card
    private func balanceBreakdownCard(_ balance: StripeConnectBalanceResponse) -> some View {
        VStack(spacing: 16) {
            HStack {
                Text("Balance Breakdown")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
                
                Button("Refresh") {
                    loadBalance()
                }
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
                .disabled(isLoading)
            }
            
            VStack(spacing: 12) {
                // Total Available
                breakdownRow(
                    title: "Total Available",
                    amount: calculateTotal(balance.available),
                    color: LunaraColors.success
                )
                
                // Total Pending
                breakdownRow(
                    title: "Total Pending",
                    amount: calculateTotal(balance.pending),
                    color: LunaraColors.warning
                )
                
                Divider()
                
                // Grand Total
                breakdownRow(
                    title: "Grand Total",
                    amount: calculateTotal(balance.available + balance.pending),
                    color: LunaraColors.primaryText,
                    isBold: true
                )
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Recent Activity Card
    private var recentActivityCard: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Recent Activity")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(LunaraColors.primaryText)
                
                Spacer()
                
                Button("View All") {
                    // Switch to transactions tab
                }
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
            }
            
            if !stripeService.recentTransactions.isEmpty {
                VStack(spacing: 12) {
                    ForEach(stripeService.recentTransactions.prefix(3), id: \.id) { transaction in
                        transactionRow(transaction)
                    }
                }
            } else {
                Text("No recent transactions")
                    .font(.system(size: 14))
                    .foregroundColor(LunaraColors.secondaryText)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - No Balance View
    private var noBalanceView: some View {
        VStack(spacing: 16) {
            Image(systemName: "dollarsign.circle")
                .font(.system(size: 48))
                .foregroundColor(LunaraColors.secondaryText)
            
            Text("No Balance Data")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
            
            Text("Unable to load balance information. Please try again.")
                .font(.system(size: 14))
                .foregroundColor(LunaraColors.secondaryText)
                .multilineTextAlignment(.center)
            
            Button("Retry") {
                loadBalance()
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
            
            Text("Loading balance...")
                .font(.system(size: 16))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.top, 100)
    }
    
    // MARK: - Helper Views
    private func balanceRow(amount: StripeConnectBalanceResponse.BalanceAmount, isAvailable: Bool) -> some View {
        HStack {
            Text(amount.currency.uppercased())
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(LunaraColors.primaryText)
            
            Spacer()
            
            Text(formatAmount(amount.amount, currency: amount.currency))
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(isAvailable ? LunaraColors.success : LunaraColors.warning)
        }
        .padding(.vertical, 4)
    }
    
    private func breakdownRow(title: String, amount: String, color: Color, isBold: Bool = false) -> some View {
        HStack {
            Text(title)
                .font(.system(size: 14, weight: isBold ? .semibold : .regular))
                .foregroundColor(LunaraColors.primaryText)
            
            Spacer()
            
            Text(amount)
                .font(.system(size: 14, weight: isBold ? .bold : .semibold))
                .foregroundColor(color)
        }
        .padding(.vertical, 2)
    }
    
    private func transactionRow(_ transaction: StripeConnectTransactionResponse.Transaction) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(transaction.description ?? "Transaction")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.primaryText)
                    .lineLimit(1)
                
                Text(formatDate(transaction.created))
                    .font(.system(size: 12))
                    .foregroundColor(LunaraColors.secondaryText)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 2) {
                Text(formatAmount(transaction.amount, currency: transaction.currency))
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(transaction.amount >= 0 ? LunaraColors.success : LunaraColors.error)
                
                Text(transaction.status.capitalized)
                    .font(.system(size: 12))
                    .foregroundColor(LunaraColors.secondaryText)
            }
        }
        .padding(.vertical, 4)
    }
    
    // MARK: - Helper Methods
    private func loadBalance() {
        guard let account = stripeService.connectAccount,
              account.chargesEnabled && account.payoutsEnabled else { return }
        
        isLoading = true
        
        Task {
            await stripeService.loadAccountData(shopId: shop.id)
            await MainActor.run {
                isLoading = false
            }
        }
    }
    
    private func formatAmount(_ amount: Int, currency: String) -> String {
        let value = Double(amount) / 100.0
        let symbol = getCurrencySymbol(currency)
        return String(format: "%@%.2f", symbol, abs(value))
    }
    
    private func getCurrencySymbol(_ currency: String) -> String {
        switch currency.lowercased() {
        case "eur": return "€"
        case "usd": return "$"
        case "gbp": return "£"
        default: return currency.uppercased() + " "
        }
    }
    
    private func calculateTotal(_ amounts: [StripeConnectBalanceResponse.BalanceAmount]) -> String {
        // For simplicity, we'll show the first currency's total
        // In a real app, you might want to show all currencies
        guard let firstAmount = amounts.first else { return "€0.00" }
        let total = amounts.filter { $0.currency == firstAmount.currency }
                          .reduce(0) { $0 + $1.amount }
        return formatAmount(total, currency: firstAmount.currency)
    }
    
    private func formatDate(_ timestamp: Int) -> String {
        let date = Date(timeIntervalSince1970: TimeInterval(timestamp))
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }
}

#Preview {
    ConnectBalanceTabView(shop: Shop.preview, stripeService: StripeConnectService.shared)
}
