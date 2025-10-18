//
//  SubscriptionPlan.swift
//  LunaraApp
//
//  Created by Lunara Team on 16/07/2025.
//

import Foundation

// MARK: - Subscription Plan Response Model
struct SubscriptionPlanResponse: Codable, Identifiable, Equatable {
    let id: String                    // Stripe Price ID
    let productId: String             // Stripe Product ID
    let name: String                  // Product name
    let displayName: String           // Display name for UI
    let description: String           // Product description
    let priceInCents: Int             // Price in cents
    let currency: String              // Currency code (USD, EUR, etc.)
    let interval: String              // Billing interval (month, year)
    let intervalCount: Int            // Interval count (1 for monthly, 1 for yearly, etc.)
    let formattedPrice: String        // Formatted price string ($29.99)
    let formattedPriceWithInterval: String // Formatted price with interval ($29.99/month)
    let isYearly: Bool                // True if yearly plan
    let isMonthly: Bool               // True if monthly plan
    let recommended: Bool             // True if this plan is recommended
    let savings: String?              // Savings text for yearly plans
    let features: [String]            // List of plan features
    let createdAt: String             // When this response was created

    // Trial-related fields
    let hasFreeTrial: Bool?           // Whether plan includes free trial
    let trialDays: Int?               // Number of trial days
    let trialDescription: String?     // Trial description for UI
    
    // MARK: - Computed Properties
    var formattedPriceDisplay: String {
        return formattedPriceWithInterval
    }
    
    var savingsAmount: String? {
        return savings
    }
    
    var planType: PlanType {
        if name.lowercased().contains("premium") {
            return .premium
        } else {
            return .basic
        }
    }
    
    var billingCycle: BillingCycle {
        return isYearly ? .yearly : .monthly
    }
    
    var monthlyEquivalent: Double {
        if isYearly {
            return Double(priceInCents) / 100.0 / 12.0
        } else {
            return Double(priceInCents) / 100.0
        }
    }
    
    var formattedMonthlyEquivalent: String {
        return String(format: "$%.2f/month", monthlyEquivalent)
    }
}

// MARK: - Plan Type Enum
enum PlanType: String, CaseIterable {
    case basic = "basic"
    case premium = "premium"
    
    var displayName: String {
        switch self {
        case .basic:
            return "Basic"
        case .premium:
            return "Premium"
        }
    }
    
    var color: String {
        switch self {
        case .basic:
            return "warmGold"
        case .premium:
            return "info"
        }
    }
}

// MARK: - Billing Cycle Enum
enum BillingCycle: String, CaseIterable {
    case monthly = "month"
    case yearly = "year"
    
    var displayName: String {
        switch self {
        case .monthly:
            return "Monthly"
        case .yearly:
            return "Yearly"
        }
    }
    
    var shortName: String {
        switch self {
        case .monthly:
            return "mo"
        case .yearly:
            return "yr"
        }
    }
}

// MARK: - Subscription Plans API Response
struct SubscriptionPlansResponse: Codable {
    let plans: [SubscriptionPlanResponse]
    let message: String
    let count: Int
}

// MARK: - Subscription Plan Request
struct SubscriptionPlanRequest: Codable {
    let shopId: String
    let stripePriceId: String
    let paymentMethodId: String?
}

// MARK: - Subscription Creation Response
struct SubscriptionCreationResponse: Codable {
    let subscriptionId: String
    let paymentIntentId: String?
    let clientSecret: String?
    let status: String
    let customerId: String
    let stripePriceId: String
    let requiresPayment: Bool
    let message: String?
}

// MARK: - Subscription Details Response (for management)
struct SubscriptionDetails: Codable, Identifiable, Sendable {
    let shopId: String
    let subscriptionId: String
    let customerId: String
    let status: String
    let message: String?
    let clientSecret: String?
    let requiresPayment: Bool
    let stripePriceId: String
    let planDisplayName: String
    let amount: Int                   // Amount in cents
    let currency: String
    let interval: String              // "month" or "year"
    let currentPeriodStart: String    // ISO date string
    let currentPeriodEnd: String      // ISO date string
    let nextBillingDate: String       // ISO date string
    let createdAt: String             // ISO date string
    let isActive: Bool
    let cancelAtPeriodEnd: Bool
    let canceledAt: String?           // ISO date string
    let customerPortalUrl: String?

    // Trial-related fields
    let isTrialing: Bool?
    let trialStart: String?           // ISO date string
    let trialEnd: String?             // ISO date string
    let trialDaysRemaining: Int?
    let trialExpired: Bool?

    // MARK: - Computed Properties
    var id: String {
        return subscriptionId
    }

    // MARK: - Computed Properties
    var formattedAmount: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currency.uppercased()
        return formatter.string(from: NSNumber(value: Double(amount) / 100.0)) ?? "$\(amount / 100)"
    }

    var formattedAmountWithInterval: String {
        return "\(formattedAmount)/\(interval)"
    }

    var isActiveSubscription: Bool {
        return isActive && !cancelAtPeriodEnd
    }

    var subscriptionStatusText: String {
        if cancelAtPeriodEnd {
            return "Canceling at period end"
        } else if status.lowercased() == "trialing" || isTrialing == true {
            return "Trial period"
        } else if isActive {
            return "Active"
        } else {
            return status.capitalized
        }
    }

    var nextBillingDateFormatted: String {
        guard let date = ISO8601DateFormatter().date(from: nextBillingDate) else {
            return "Unknown"
        }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }

    var trialDaysRemainingText: String? {
        // First try to use the provided trialDaysRemaining
        if let days = trialDaysRemaining, days > 0 {
            return "\(days) day\(days == 1 ? "" : "s") remaining"
        }

        // If not provided, calculate from trial end date
        if status.lowercased() == "trialing" || isTrialing == true,
           let trialEndString = trialEnd,
           let trialEndDate = ISO8601DateFormatter().date(from: trialEndString) {
            let now = Date()
            let calendar = Calendar.current
            let daysRemaining = calendar.dateComponents([.day], from: now, to: trialEndDate).day ?? 0

            if daysRemaining > 0 {
                return "\(daysRemaining) day\(daysRemaining == 1 ? "" : "s") remaining"
            }
        }

        return nil
    }
}

// MARK: - Payment Method Model
struct StripePaymentMethod: Codable, Identifiable, Sendable {
    let id: String
    let type: String                  // "card"
    let card: PaymentMethodCard?
    let isDefault: Bool
    let created: Int                  // Unix timestamp

    // Custom coding keys to handle snake_case from backend
    enum CodingKeys: String, CodingKey {
        case id
        case type
        case card
        case isDefault = "is_default"
        case created
    }

    struct PaymentMethodCard: Codable, Sendable {
        let brand: String             // "visa", "mastercard", etc.
        let last4: String
        let expMonth: Int
        let expYear: Int
        let funding: String?          // "credit", "debit", etc.

        // Custom coding keys to handle snake_case from backend
        enum CodingKeys: String, CodingKey {
            case brand
            case last4
            case expMonth = "exp_month"
            case expYear = "exp_year"
            case funding
        }
    }

    // MARK: - Computed Properties
    var displayName: String {
        guard let card = card else { return "Unknown Payment Method" }
        return "\(card.brand.capitalized) •••• \(card.last4)"
    }

    var expirationText: String {
        guard let card = card else { return "" }
        return String(format: "%02d/%d", card.expMonth, card.expYear)
    }

    var isExpired: Bool {
        guard let card = card else { return false }
        let now = Date()
        let calendar = Calendar.current
        let currentYear = calendar.component(.year, from: now)
        let currentMonth = calendar.component(.month, from: now)

        return card.expYear < currentYear || (card.expYear == currentYear && card.expMonth < currentMonth)
    }
}

// MARK: - Invoice Model
struct StripeInvoice: Codable, Identifiable, Sendable {
    let id: String
    let amountDue: Int                // Amount in cents
    let amountPaid: Int               // Amount in cents
    let amountRemaining: Int?         // Amount remaining in cents
    let currency: String
    let status: String                // "paid", "open", "void", "draft", etc.
    let created: Int                  // Unix timestamp
    let dueDate: Int?                 // Unix timestamp (can be null for upcoming invoices)
    let periodStart: Int              // Unix timestamp
    let periodEnd: Int                // Unix timestamp
    let subscriptionId: String?       // Subscription ID
    let total: Int?                   // Total amount in cents
    let hostedInvoiceUrl: String?     // URL to hosted invoice (may be null for upcoming)
    let invoicePdf: String?           // PDF download URL (may be null for upcoming)

    // Custom coding keys to handle snake_case from backend
    enum CodingKeys: String, CodingKey {
        case id
        case amountDue = "amount_due"
        case amountPaid = "amount_paid"
        case amountRemaining = "amount_remaining"
        case currency
        case status
        case created
        case dueDate = "due_date"
        case periodStart = "period_start"
        case periodEnd = "period_end"
        case subscriptionId = "subscription_id"
        case total
        case hostedInvoiceUrl = "hosted_invoice_url"
        case invoicePdf = "invoice_pdf"
    }

    // MARK: - Computed Properties
    var formattedAmountDue: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currency.uppercased()
        return formatter.string(from: NSNumber(value: Double(amountDue) / 100.0)) ?? "$\(amountDue / 100)"
    }

    var formattedAmountPaid: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currency.uppercased()
        return formatter.string(from: NSNumber(value: Double(amountPaid) / 100.0)) ?? "$\(amountPaid / 100)"
    }

    var formattedTotal: String {
        let amount = total ?? amountDue
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currency.uppercased()
        return formatter.string(from: NSNumber(value: Double(amount) / 100.0)) ?? "$\(amount / 100)"
    }

    var createdDate: Date {
        return Date(timeIntervalSince1970: TimeInterval(created))
    }

    var dueDateFormatted: String? {
        guard let dueDate = dueDate else { return nil }
        let date = Date(timeIntervalSince1970: TimeInterval(dueDate))
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }

    var periodText: String {
        let startDate = Date(timeIntervalSince1970: TimeInterval(periodStart))
        let endDate = Date(timeIntervalSince1970: TimeInterval(periodEnd))
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        return "\(formatter.string(from: startDate)) - \(formatter.string(from: endDate))"
    }

    var statusColor: String {
        switch status.lowercased() {
        case "paid":
            return "green"
        case "open":
            return "orange"
        case "void":
            return "red"
        default:
            return "gray"
        }
    }
}

// MARK: - Customer Portal Response
struct CustomerPortalResponse: Codable, Sendable {
    let url: String
    let returnUrl: String?
}

// MARK: - Subscription Update Request Models
struct SubscriptionUpdateRequest: Codable, Sendable {
    let newStripePriceId: String
    let prorate: Bool
    let prorationBehavior: String?
}

struct SubscriptionCancelRequest: Codable, Sendable {
    let cancelImmediately: Bool
}

// MARK: - Payment Summary Model
struct PaymentSummary: Codable {
    let planName: String
    let planPrice: String
    let billingInterval: String
    let subtotal: Double
    let tax: Double?
    let total: Double
    let currency: String
    
    var formattedSubtotal: String {
        return String(format: "$%.2f", subtotal)
    }
    
    var formattedTax: String {
        guard let tax = tax else { return "$0.00" }
        return String(format: "$%.2f", tax)
    }
    
    var formattedTotal: String {
        return String(format: "$%.2f", total)
    }
}

// MARK: - Extensions
extension SubscriptionPlanResponse {
    /// Returns a preview subscription plan for development
    static var preview: SubscriptionPlanResponse {
        return SubscriptionPlanResponse(
            id: "price_basic_monthly",
            productId: "prod_basic",
            name: "Basic Monthly Plan",
            displayName: "Basic",
            description: "Essential features for small beauty businesses",
            priceInCents: 2999,
            currency: "USD",
            interval: "month",
            intervalCount: 1,
            formattedPrice: "$29.99",
            formattedPriceWithInterval: "$29.99/month",
            isYearly: false,
            isMonthly: true,
            recommended: true,
            savings: nil,
            features: [
                "Unlimited appointment bookings",
                "Customer management",
                "Basic analytics",
                "Email notifications",
                "Mobile app access"
            ],
            createdAt: Date().ISO8601Format(),
            hasFreeTrial: true,
            trialDays: 30,
            trialDescription: "30-day free trial included"
        )
    }
    
    /// Returns a preview yearly subscription plan
    static var previewYearly: SubscriptionPlanResponse {
        return SubscriptionPlanResponse(
            id: "price_basic_yearly",
            productId: "prod_basic",
            name: "Basic Yearly Plan",
            displayName: "Basic",
            description: "Essential features for small beauty businesses - Save 17%",
            priceInCents: 29999,
            currency: "USD",
            interval: "year",
            intervalCount: 1,
            formattedPrice: "$299.99",
            formattedPriceWithInterval: "$299.99/year",
            isYearly: true,
            isMonthly: false,
            recommended: false,
            savings: "Save $59.89/year",
            features: [
                "Unlimited appointment bookings",
                "Customer management",
                "Basic analytics",
                "Email notifications",
                "Mobile app access",
                "2 months FREE"
            ],
            createdAt: Date().ISO8601Format(),
            hasFreeTrial: false,
            trialDays: nil,
            trialDescription: nil
        )
    }
    
    /// Returns a preview premium plan
    static var previewPremium: SubscriptionPlanResponse {
        return SubscriptionPlanResponse(
            id: "price_premium_monthly",
            productId: "prod_premium",
            name: "Premium Monthly Plan",
            displayName: "Premium",
            description: "Advanced features for growing beauty businesses",
            priceInCents: 4999,
            currency: "USD",
            interval: "month",
            intervalCount: 1,
            formattedPrice: "$49.99",
            formattedPriceWithInterval: "$49.99/month",
            isYearly: false,
            isMonthly: true,
            recommended: false,
            savings: nil,
            features: [
                "Everything in Basic",
                "Advanced analytics & reports",
                "Marketing tools",
                "Priority customer support",
                "Custom branding",
                "Multiple staff accounts"
            ],
            createdAt: Date().ISO8601Format(),
            hasFreeTrial: false,
            trialDays: nil,
            trialDescription: nil
        )
    }
}
