//
//  APIModels.swift
//  LunaraApp
//
//  Created by Lunara Team on 14/07/2025.
//

import Foundation
import SwiftUI

// MARK: - Generic API Response Models

/// Generic paginated response wrapper
struct PaginatedResponse<T: Codable & Sendable>: Codable, Sendable {
    let content: [T]
    let totalElements: Int
    let totalPages: Int
    let size: Int
    let number: Int
    let first: Bool
    let last: Bool
    let empty: Bool

    // Computed properties for convenience
    var currentPage: Int {
        return number
    }

    var hasNext: Bool {
        return !last
    }

    var hasPrevious: Bool {
        return !first
    }

    var hasNextPage: Bool {
        return hasNext
    }

    var hasPreviousPage: Bool {
        return hasPrevious
    }

    var itemsPerPage: Int {
        return size
    }
}

/// Generic API response wrapper
struct ApiResponse<T: Codable & Sendable>: Codable, Sendable {
    let data: T?
    let message: String?
    let error: String?
    let success: Bool?

    var isSuccess: Bool {
        return success ?? (error == nil)
    }
}

/// Data wrapper response for arrays
struct DataResponse<T: Codable & Sendable>: Codable, Sendable {
    let data: [T]
}

// MARK: - Shop Creation with Subscription Models (matching web app)

/// Request for creating setup intent for shop creation
struct ShopCreationSetupRequest: Codable, Sendable {
    let stripePriceId: String
    let customerName: String
    let customerEmail: String
    let customerPhone: String?
    let billingAddressLine1: String
    let billingAddressLine2: String?
    let billingCity: String
    let billingState: String
    let billingPostalCode: String
    let billingCountry: String
}

/// Response for setup intent creation
struct SetupIntentResponse: Codable, Sendable {
    let setupIntentId: String
    let clientSecret: String
    let customerId: String?
    let status: String
    let message: String?
}

/// Request for confirming setup and creating shop
struct ConfirmSetupAndCreateShopRequest: Codable, Sendable {
    let setupIntentId: String
    let shopData: ShopCreationRequest
}

// MARK: - Payment Models

/// Payment intent request for Stripe
struct PaymentIntentRequest: Codable {
    let amount: Double
    let currency: String
    let description: String
    let shopId: String
    let serviceId: String
    let customerEmail: String?
    let customerName: String?
    let customerCountry: String?
    let metadata: [String: String]?
}

/// Stripe Connect payment intent request
struct ConnectPaymentIntentRequest: Codable {
    let shopId: String
    let serviceId: String
    let amount: Double
    let currency: String
    let description: String
    let customerEmail: String?
    let customerName: String?
    let customerCountry: String?
    let metadata: [String: String]?
}

/// Payment intent response from Stripe
struct PaymentIntentResponse: Codable {
    let paymentIntentId: String
    let clientSecret: String
    let amount: Double
    let currency: String
    let status: String
    let shopName: String
    let description: String
    let connectedAccountId: String?
    
    // Tax information (if calculated)
    let taxAmount: Double?
    let taxRate: Double?
    let totalAmount: Double?
    let taxCalculated: Bool?
    let taxCode: String?
}

// MARK: - Search and Filter Models

/// Shop search parameters
struct ShopSearchParams: Codable {
    let query: String?
    let businessTypes: [BusinessType]?
    let latitude: Double?
    let longitude: Double?
    let radius: Double? // in kilometers
    let minRating: Double?
    let acceptsCardPayments: Bool?
    let isOpen: Bool?
    let page: Int
    let size: Int
    let sortBy: ShopSortOption?
    let sortDirection: SortDirection?
}

/// Shop sorting options
enum ShopSortOption: String, Codable, CaseIterable {
    case name = "name"
    case rating = "rating"
    case distance = "distance"
    case createdAt = "createdAt"
    
    var displayName: String {
        switch self {
        case .name:
            return "Name"
        case .rating:
            return "Rating"
        case .distance:
            return "Distance"
        case .createdAt:
            return "Newest"
        }
    }
}

/// Sort direction
enum SortDirection: String, Codable, CaseIterable {
    case asc = "asc"
    case desc = "desc"
    
    var displayName: String {
        switch self {
        case .asc:
            return "Ascending"
        case .desc:
            return "Descending"
        }
    }
}

/// Service search parameters
struct ServiceSearchParams: Codable {
    let query: String?
    let category: String?
    let minPrice: Double?
    let maxPrice: Double?
    let minDuration: Int?
    let maxDuration: Int?
    let shopId: String?
    let employeeId: String?
    let active: Bool?
    let page: Int
    let size: Int
    let sortBy: ServiceSortOption?
    let sortDirection: SortDirection?
}

/// Service sorting options
enum ServiceSortOption: String, Codable, CaseIterable {
    case name = "name"
    case price = "price"
    case duration = "duration"
    case category = "category"
    
    var displayName: String {
        switch self {
        case .name:
            return "Name"
        case .price:
            return "Price"
        case .duration:
            return "Duration"
        case .category:
            return "Category"
        }
    }
}

// MARK: - Analytics Models

/// Owner analytics data - matches backend response exactly
struct OwnerAnalytics: Codable {
    let totalRevenue: String
    let totalAppointments: Int
    let totalCustomers: Int
    let averageRating: Double
    let totalShops: Int
    let revenueGrowth: Double?
    let appointmentGrowth: Double?
    let customerGrowth: Double?

    // Custom initializer for default values
    init(totalRevenue: String = "$0",
         totalAppointments: Int = 0,
         totalCustomers: Int = 0,
         averageRating: Double = 0.0,
         totalShops: Int = 0,
         revenueGrowth: Double? = nil,
         appointmentGrowth: Double? = nil,
         customerGrowth: Double? = nil) {
        self.totalRevenue = totalRevenue
        self.totalAppointments = totalAppointments
        self.totalCustomers = totalCustomers
        self.averageRating = averageRating
        self.totalShops = totalShops
        self.revenueGrowth = revenueGrowth
        self.appointmentGrowth = appointmentGrowth
        self.customerGrowth = customerGrowth
    }
}

/// Shop analytics data - matches backend response exactly
struct ShopAnalytics: Codable {
    let shopId: String
    let shopName: String
    let totalRevenue: String
    let totalAppointments: Int
    let totalCustomers: Int
    let averageRating: Double
    let revenueGrowth: Double?
    let appointmentGrowth: Double?
    let customerGrowth: Double?

    // Custom initializer for default values
    init(shopId: String,
         shopName: String = "Unknown Shop",
         totalRevenue: String = "$0",
         totalAppointments: Int = 0,
         totalCustomers: Int = 0,
         averageRating: Double = 0.0,
         revenueGrowth: Double? = nil,
         appointmentGrowth: Double? = nil,
         customerGrowth: Double? = nil) {
        self.shopId = shopId
        self.shopName = shopName
        self.totalRevenue = totalRevenue
        self.totalAppointments = totalAppointments
        self.totalCustomers = totalCustomers
        self.averageRating = averageRating
        self.revenueGrowth = revenueGrowth
        self.appointmentGrowth = appointmentGrowth
        self.customerGrowth = customerGrowth
    }
}

/// Appointment statistics - matches backend response exactly
struct AppointmentStats: Codable {
    let period: String
    let totalAppointments: Int
    let confirmedAppointments: Int
    let completedAppointments: Int
    let cancelledAppointments: Int
    let completionRate: Double

    // Custom initializer for default values
    init(period: String = "all-time",
         totalAppointments: Int = 0,
         confirmedAppointments: Int = 0,
         completedAppointments: Int = 0,
         cancelledAppointments: Int = 0,
         completionRate: Double = 0.0) {
        self.period = period
        self.totalAppointments = totalAppointments
        self.confirmedAppointments = confirmedAppointments
        self.completedAppointments = completedAppointments
        self.cancelledAppointments = cancelledAppointments
        self.completionRate = completionRate
    }
}

/// Revenue statistics - matches backend response exactly
struct RevenueStats: Codable {
    let period: String
    let totalRevenue: String
    let averageBookingValue: String
    let revenueGrowth: Double
    let topServices: [String]

    // Custom initializer for default values
    init(period: String = "all-time",
         totalRevenue: String = "$0",
         averageBookingValue: String = "$0",
         revenueGrowth: Double = 0.0,
         topServices: [String] = []) {
        self.period = period
        self.totalRevenue = totalRevenue
        self.averageBookingValue = averageBookingValue
        self.revenueGrowth = revenueGrowth
        self.topServices = topServices
    }
}

/// Customer statistics - matches backend response exactly
struct CustomerStats: Codable {
    let period: String
    let totalCustomers: Int
    let newCustomers: Int
    let returningCustomers: Int
    let customerRetentionRate: Double
    let averageVisitsPerCustomer: Double

    // Custom initializer for default values
    init(period: String = "all-time",
         totalCustomers: Int = 0,
         newCustomers: Int = 0,
         returningCustomers: Int = 0,
         customerRetentionRate: Double = 0.0,
         averageVisitsPerCustomer: Double = 0.0) {
        self.period = period
        self.totalCustomers = totalCustomers
        self.newCustomers = newCustomers
        self.returningCustomers = returningCustomers
        self.customerRetentionRate = customerRetentionRate
        self.averageVisitsPerCustomer = averageVisitsPerCustomer
    }
}

/// Dashboard summary combining all metrics
struct DashboardSummary: Codable {
    let shopAnalytics: ShopAnalytics
    let appointmentStats: AppointmentStats
    let revenueStats: RevenueStats
    let customerStats: CustomerStats
    let servicesCount: Int
    let employeesCount: Int
    let thisWeekAppointments: Int
}

/// Popular service analytics
struct PopularService: Codable, Identifiable {
    let id: String
    let name: String
    let bookingCount: Int
    let revenue: Double
    let averageRating: Double
}

/// Monthly revenue data
struct MonthlyRevenue: Codable, Identifiable {
    let id: String
    let month: String
    let year: Int
    let revenue: Double
    let appointmentCount: Int
}

/// Appointment status count
struct AppointmentStatusCount: Codable, Identifiable {
    let id: String
    let status: AppointmentStatus
    let count: Int
    let percentage: Double
}

/// Employee performance data
struct EmployeePerformance: Codable, Identifiable {
    let id: String
    let employeeId: String
    let employeeName: String
    let totalAppointments: Int
    let completedAppointments: Int
    let revenue: Double
    let averageRating: Double
    let customerSatisfaction: Double
}

// MARK: - Notification Models

/// In-app notification model
struct AppNotification: Codable, Identifiable {
    let id: String
    let title: String
    let message: String
    let type: NotificationType
    let seen: Bool
    let actionUrl: String?
    let data: String? // JSON data for additional context
    let createdAt: String
    let formattedDate: String?

    // Legacy properties for backward compatibility
    var userId: String? { nil } // Not provided by backend
    var read: Bool { seen } // Map seen to read
    var updatedAt: String { createdAt } // Use createdAt as fallback

    var isRead: Bool {
        return seen
    }

    var createdDate: Date? {
        return ISO8601DateFormatter().date(from: createdAt)
    }

    /// Parse the JSON data field to extract structured information
    var parsedData: [String: Any]? {
        guard let data = data,
              let jsonData = data.data(using: .utf8) else { return nil }

        do {
            return try JSONSerialization.jsonObject(with: jsonData, options: []) as? [String: Any]
        } catch {
            print("Failed to parse notification data: \(error)")
            return nil
        }
    }

    /// Extract appointment ID from parsed data
    var appointmentId: String? {
        return parsedData?["appointmentId"] as? String
    }

    var displayFormattedDate: String {
        // Use backend's formattedDate if available, otherwise format ourselves
        if let backendFormatted = formattedDate {
            return backendFormatted
        }

        guard let date = createdDate else { return createdAt }

        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

/// Notification types
enum NotificationType: String, Codable, CaseIterable {
    case appointmentConfirmed = "APPOINTMENT_CONFIRMED"
    case appointmentCancelled = "APPOINTMENT_CANCELLED"
    case appointmentCancelledByEmployee = "APPOINTMENT_CANCELLED_BY_EMPLOYEE"
    case appointmentReminder = "APPOINTMENT_REMINDER"
    case appointmentRescheduled = "APPOINTMENT_RESCHEDULED"
    case appointmentCreated = "APPOINTMENT_CREATED"
    case appointmentEdited = "APPOINTMENT_EDITED"
    case appointmentCancelledByCustomer = "APPOINTMENT_CANCELLED_BY_CUSTOMER"
    case appointmentEditedByCustomer = "APPOINTMENT_EDITED_BY_CUSTOMER"
    case appointmentEditedByEmployee = "APPOINTMENT_EDITED_BY_EMPLOYEE"
    case appointmentRefunded = "APPOINTMENT_REFUNDED"
    case appointmentNoShow = "APPOINTMENT_NO_SHOW"
    case appointmentStarted = "APPOINTMENT_STARTED"
    case appointmentStatusChanged = "APPOINTMENT_STATUS_CHANGED"
    case paymentReceived = "PAYMENT_RECEIVED"
    case paymentFailed = "PAYMENT_FAILED"
    case newBooking = "NEW_BOOKING"
    case bookingCancelled = "BOOKING_CANCELLED"
    case employeeInvitation = "EMPLOYEE_INVITATION"
    case leaveRequestSubmitted = "LEAVE_REQUEST_SUBMITTED"
    case leaveRequestApproved = "LEAVE_REQUEST_APPROVED"
    case leaveRequestRejected = "LEAVE_REQUEST_REJECTED"
    case leaveCancelled = "LEAVE_CANCELLED"
    case shopApproved = "SHOP_APPROVED"
    case shopRejected = "SHOP_REJECTED"
    case subscriptionExpiring = "SUBSCRIPTION_EXPIRING"
    case subscriptionRenewed = "SUBSCRIPTION_RENEWED"
    case subscriptionCancelled = "SUBSCRIPTION_CANCELLED"
    case reviewRequest = "REVIEW_REQUEST"
    case systemMaintenance = "SYSTEM_MAINTENANCE"
    case promotional = "PROMOTIONAL"
    case general = "GENERAL"
    case shopUpdate = "SHOP_UPDATE"
    case systemUpdate = "SYSTEM_UPDATE"
    
    var displayName: String {
        switch self {
        case .appointmentConfirmed:
            return "Appointment Confirmed"
        case .appointmentCancelled:
            return "Appointment Cancelled"
        case .appointmentCancelledByEmployee:
            return "Appointment Cancelled by Employee"
        case .appointmentCancelledByCustomer:
            return "Appointment Cancelled by Customer"
        case .appointmentReminder:
            return "Appointment Reminder"
        case .appointmentRescheduled:
            return "Appointment Rescheduled"
        case .appointmentCreated:
            return "New Appointment Created"
        case .appointmentEdited:
            return "Appointment Updated"
        case .appointmentEditedByCustomer:
            return "Appointment Updated by Customer"
        case .appointmentEditedByEmployee:
            return "Appointment Updated by Employee"
        case .appointmentRefunded:
            return "Appointment Refunded"
        case .appointmentNoShow:
            return "Appointment No-Show"
        case .appointmentStarted:
            return "Appointment Started"
        case .appointmentStatusChanged:
            return "Appointment Status Changed"
        case .paymentReceived:
            return "Payment Received"
        case .paymentFailed:
            return "Payment Failed"
        case .newBooking:
            return "New Booking"
        case .bookingCancelled:
            return "Booking Cancelled"
        case .employeeInvitation:
            return "Employee Invitation"
        case .leaveRequestSubmitted:
            return "Leave Request Submitted"
        case .leaveRequestApproved:
            return "Leave Request Approved"
        case .leaveRequestRejected:
            return "Leave Request Rejected"
        case .leaveCancelled:
            return "Leave Request Cancelled"
        case .shopApproved:
            return "Shop Approved"
        case .shopRejected:
            return "Shop Rejected"
        case .subscriptionExpiring:
            return "Subscription Expiring"
        case .subscriptionRenewed:
            return "Subscription Renewed"
        case .subscriptionCancelled:
            return "Subscription Cancelled"
        case .reviewRequest:
            return "Review Request"
        case .systemMaintenance:
            return "System Maintenance"
        case .promotional:
            return "Promotional"
        case .general:
            return "General"
        case .shopUpdate:
            return "Shop Update"
        case .systemUpdate:
            return "System Update"
        }
    }
    
    var iconName: String {
        switch self {
        case .appointmentConfirmed, .appointmentCreated:
            return "checkmark.circle"
        case .appointmentCancelled, .appointmentCancelledByEmployee, .appointmentCancelledByCustomer, .bookingCancelled:
            return "xmark.circle"
        case .appointmentReminder:
            return "bell"
        case .appointmentRescheduled, .appointmentEdited, .appointmentEditedByCustomer, .appointmentEditedByEmployee:
            return "pencil.circle"
        case .appointmentRefunded:
            return "arrow.counterclockwise.circle"
        case .appointmentNoShow:
            return "person.slash"
        case .appointmentStarted:
            return "play.circle"
        case .appointmentStatusChanged:
            return "arrow.triangle.2.circlepath"
        case .paymentReceived:
            return "creditcard"
        case .paymentFailed:
            return "creditcard.trianglebadge.exclamationmark"
        case .newBooking:
            return "calendar.badge.plus"
        case .employeeInvitation:
            return "person.badge.plus"
        case .leaveRequestSubmitted, .leaveRequestApproved, .leaveRequestRejected, .leaveCancelled:
            return "calendar.badge.clock"
        case .shopApproved:
            return "building.2.crop.circle"
        case .shopRejected:
            return "building.2.crop.circle.badge.xmark"
        case .subscriptionExpiring:
            return "exclamationmark.triangle"
        case .subscriptionRenewed:
            return "arrow.clockwise.circle"
        case .subscriptionCancelled:
            return "xmark.circle"
        case .reviewRequest:
            return "star.circle"
        case .systemMaintenance:
            return "wrench.and.screwdriver"
        case .promotional:
            return "megaphone"
        case .general:
            return "info.circle"
        case .shopUpdate:
            return "building.2"
        case .systemUpdate:
            return "gear"
        }
    }
    
    var color: String {
        switch self {
        case .appointmentConfirmed, .appointmentCreated, .appointmentStarted, .paymentReceived, .shopApproved, .subscriptionRenewed, .leaveRequestApproved:
            return "green"
        case .appointmentCancelled, .appointmentCancelledByEmployee, .appointmentCancelledByCustomer, .appointmentNoShow, .bookingCancelled, .paymentFailed, .shopRejected, .subscriptionCancelled, .leaveRequestRejected:
            return "red"
        case .appointmentReminder, .newBooking:
            return "blue"
        case .appointmentRescheduled, .appointmentEdited, .appointmentEditedByCustomer, .appointmentEditedByEmployee, .appointmentStatusChanged, .shopUpdate:
            return "orange"
        case .appointmentRefunded, .subscriptionExpiring:
            return "yellow"
        case .employeeInvitation:
            return "purple"
        case .leaveRequestSubmitted, .leaveCancelled:
            return "indigo"
        case .reviewRequest:
            return "mint"
        case .systemMaintenance, .systemUpdate:
            return "gray"
        case .promotional:
            return "pink"
        case .general:
            return "secondary"
        }
    }
}

// MARK: - SwiftUI Extensions

extension NotificationType {
    var swiftUIColor: Color {
        switch self {
        case .appointmentConfirmed, .appointmentCreated, .appointmentStarted:
            return .green
        case .appointmentCancelled, .appointmentCancelledByEmployee, .appointmentCancelledByCustomer, .appointmentNoShow:
            return .red
        case .appointmentReminder:
            return .blue
        case .appointmentRescheduled, .appointmentEdited, .appointmentEditedByCustomer, .appointmentEditedByEmployee, .appointmentStatusChanged:
            return .orange
        case .appointmentRefunded:
            return .yellow
        case .paymentReceived:
            return .green
        case .paymentFailed:
            return .red
        case .newBooking:
            return .blue
        case .bookingCancelled:
            return .red
        case .employeeInvitation:
            return .purple
        case .leaveRequestSubmitted, .leaveRequestApproved, .leaveRequestRejected, .leaveCancelled:
            return .indigo
        case .shopApproved:
            return .green
        case .shopRejected:
            return .red
        case .subscriptionExpiring:
            return .yellow
        case .subscriptionRenewed:
            return .green
        case .subscriptionCancelled:
            return .red
        case .reviewRequest:
            return .mint
        case .systemMaintenance:
            return .gray
        case .promotional:
            return .pink
        case .general:
            return .secondary
        case .shopUpdate:
            return .orange
        case .systemUpdate:
            return .gray
        }
    }
}

// MARK: - Notification Response Models

/// Paginated notification response
struct NotificationPageResponse: Codable {
    let notifications: [AppNotification]
    let totalElements: Int
    let totalPages: Int
    let currentPage: Int
    let hasNext: Bool
    let hasPrevious: Bool

    // Legacy properties for backward compatibility (if needed)
    var content: [AppNotification] { notifications }
    var size: Int { notifications.count }
    var number: Int { currentPage }
    var first: Bool { !hasPrevious }
    var last: Bool { !hasNext }
    var empty: Bool { notifications.isEmpty }
}

/// Unread notifications response
struct UnreadNotificationsResponse: Codable {
    let notifications: [AppNotification]
    let count: Int
}

/// Unread notification count response
struct UnreadCountResponse: Codable {
    let unreadCount: Int
}

/// Device token request
struct DeviceTokenRequest: Codable {
    let token: String
    let platform: String
    let appVersion: String?
    let osVersion: String?
    let deviceInfo: String?

    init(token: String, platform: String = "ios", appVersion: String? = nil, osVersion: String? = nil, deviceInfo: String? = nil) {
        self.token = token
        self.platform = platform
        self.appVersion = appVersion
        self.osVersion = osVersion
        self.deviceInfo = deviceInfo
    }
}

/// Device token response
struct DeviceTokenResponse: Codable {
    let message: String
    let tokenId: String?
    let platform: String?
    let active: Bool?
}

// MARK: - Error Models

/// Detailed API error response
struct DetailedErrorResponse: Codable {
    let error: String
    let message: String
    let details: [String]?
    let timestamp: String
    let path: String?
    let status: Int?
    
    var formattedMessage: String {
        if let details = details, !details.isEmpty {
            return "\(message)\n\(details.joined(separator: "\n"))"
        }
        return message
    }
}

/// Validation error for form fields
struct ValidationError: Codable {
    let field: String
    let message: String
    let rejectedValue: String?
}

// MARK: - Stripe Connect Models

/// Stripe Connect account response
struct StripeConnectAccountResponse: Codable, Sendable {
    let accountId: String?
    let stripeAccountId: String
    let chargesEnabled: Bool
    let payoutsEnabled: Bool
    let detailsSubmitted: Bool
    let onboardingCompleted: Bool
    let requirements: ConnectRequirements?
    let businessProfile: BusinessProfile?
    let country: String
    let defaultCurrency: String
    let capabilities: [String: String]?
    let errors: [VerificationError]?
    let status: String?
    let message: String?
    let requiresAction: Bool?
    let currentlyDue: [String]?
    let eventuallyDue: [String]?
    let pastDue: [String]?
    let createdAt: String?
    let businessType: String?
    let email: String?
    let onboardingUrl: String?
    let dashboardUrl: String?

    struct ConnectRequirements: Codable, Sendable {
        let currentlyDue: [String]
        let eventuallyDue: [String]
        let pastDue: [String]
        let pendingVerification: [String]
        let currentDeadline: Int?
        let disabledReason: String?
    }

    struct BusinessProfile: Codable, Sendable {
        let name: String?
        let url: String?
        let mcc: String?
        let productDescription: String?
    }

    struct VerificationError: Codable, Sendable {
        let code: String
        let reason: String
        let requirement: String
    }
}

/// Stripe Connect account creation request
struct StripeConnectAccountRequest: Codable, Sendable {
    let businessName: String
    let businessEmail: String
    let businessPhone: String
    let businessWebsite: String?
    let businessAddress: String
    let businessCity: String
    let businessState: String?
    let businessPostalCode: String
    let businessCountry: String
    let businessType: String // "individual" or "company"
    let individual: IndividualInfo?
    let company: CompanyInfo?
    let externalAccount: ExternalAccountInfo?
    let tosAcceptance: TosAcceptanceInfo

    struct IndividualInfo: Codable, Sendable {
        let firstName: String
        let lastName: String
        let email: String
        let phone: String
        let dateOfBirth: DateOfBirthInfo
        let address: AddressInfo
        let ssn: String?

        struct DateOfBirthInfo: Codable, Sendable {
            let day: Int
            let month: Int
            let year: Int
        }
    }

    struct CompanyInfo: Codable, Sendable {
        let name: String
        let taxId: String?
        let phone: String?
        let address: AddressInfo
        let structure: String? // "private_corporation", "llc", etc.
    }

    struct AddressInfo: Codable, Sendable {
        let line1: String
        let line2: String?
        let city: String
        let state: String?
        let postalCode: String
        let country: String
    }

    struct ExternalAccountInfo: Codable, Sendable {
        let accountHolderName: String
        let country: String
        let currency: String
        let accountHolderType: String // "individual" or "company"

        // IBAN (for EU countries like Bulgaria)
        let iban: String?

        // US/CA bank account details
        let routingNumber: String?
        let accountNumber: String?

        // UK bank account details
        let sortCode: String?

        // Australian bank account details
        let bsbNumber: String?

        // Canadian bank account details
        let institutionNumber: String?
        let transitNumber: String?
    }

    struct TosAcceptanceInfo: Codable, Sendable {
        let date: Int // Unix timestamp
        let ip: String
        let userAgent: String
    }
}

/// Stripe Connect account update request
struct StripeConnectAccountUpdateRequest: Codable, Sendable {
    let businessProfile: BusinessProfileUpdate?
    let company: CompanyUpdate?
    let individual: IndividualUpdate?
    let externalAccount: StripeConnectAccountRequest.ExternalAccountInfo?
    let tosAcceptance: StripeConnectAccountRequest.TosAcceptanceInfo?

    struct BusinessProfileUpdate: Codable, Sendable {
        let name: String?
        let url: String?
        let productDescription: String?
        let mcc: String?
    }

    struct CompanyUpdate: Codable, Sendable {
        let name: String?
        let taxId: String?
        let phone: String?
        let address: StripeConnectAccountRequest.AddressInfo?
    }

    struct IndividualUpdate: Codable, Sendable {
        let firstName: String?
        let lastName: String?
        let email: String?
        let phone: String?
        let address: StripeConnectAccountRequest.AddressInfo?
    }
}

/// Stripe Connect account balance response
struct StripeConnectBalanceResponse: Codable, Sendable {
    let available: [BalanceAmount]
    let pending: [BalanceAmount]

    struct BalanceAmount: Codable, Sendable {
        let amount: Int
        let currency: String
    }
}

/// Stripe Connect payout response
struct StripeConnectPayoutResponse: Codable, Sendable {
    let data: [Payout]
    let hasMore: Bool

    struct Payout: Codable, Sendable {
        let id: String
        let amount: Int
        let currency: String
        let status: String
        let arrivalDate: Int
        let created: Int
        let description: String?
        let method: String
    }
}

/// Stripe Connect transaction response
struct StripeConnectTransactionResponse: Codable, Sendable {
    let data: [Transaction]
    let hasMore: Bool

    struct Transaction: Codable, Sendable {
        let id: String
        let amount: Int
        let currency: String
        let description: String?
        let created: Int
        let type: String
        let status: String
    }
}



/// Stripe Connect account session response
struct StripeConnectAccountSessionResponse: Codable, Sendable {
    let clientSecret: String
    let expiresAt: Int
}

/// Stripe Connect requirements response
struct StripeConnectRequirementsResponse: Codable, Sendable {
    let currentlyDue: [String]
    let eventuallyDue: [String]
    let pastDue: [String]
    let pendingVerification: [String]
    let disabledReason: String?
    let errors: [RequirementError]?

    enum CodingKeys: String, CodingKey {
        case currentlyDue = "currently_due"
        case eventuallyDue = "eventually_due"
        case pastDue = "past_due"
        case pendingVerification = "pending_verification"
        case disabledReason = "disabled_reason"
        case errors
    }

    struct RequirementError: Codable, Sendable {
        let code: String
        let reason: String
        let requirement: String
    }
}



// MARK: - File Upload Models

/// File upload response
struct FileUploadResponse: Codable {
    let url: String
    let filename: String
    let size: Int
    let contentType: String
    let uploadedAt: String
}

/// Image upload request
struct ImageUploadRequest: Codable {
    let image: Data
    let filename: String
    let contentType: String
}

// MARK: - Extensions for Preview Data

extension PaginatedResponse {
    /// Create a preview paginated response
    static func preview<U: Codable>(with items: [U]) -> PaginatedResponse<U> {
        return PaginatedResponse<U>(
            content: items,
            totalElements: items.count,
            totalPages: 1,
            size: items.count,
            number: 0,
            first: true,
            last: true,
            empty: items.isEmpty
        )
    }
}

extension ApiResponse {
    /// Create a successful preview response
    static func success<U: Codable>(with data: U) -> ApiResponse<U> {
        return ApiResponse<U>(
            data: data,
            message: "Success",
            error: nil,
            success: true
        )
    }

    /// Create an error preview response
    static func error<U: Codable>(message: String) -> ApiResponse<U> {
        return ApiResponse<U>(
            data: nil,
            message: nil,
            error: message,
            success: false
        )
    }
}

// MARK: - Appointment Request Models

/// Request model for updating appointment status
struct AppointmentStatusUpdateRequest: Codable {
    let status: String
}

/// Request model for updating appointment details
// Note: AppointmentUpdateRequest is defined in Appointment.swift

// MARK: - Service Category Models
struct ServiceCategory: Codable, Identifiable, Sendable {
    let value: String
    let label: String

    var id: String { value }
}

struct ServiceCategoriesResponse: Codable, Sendable {
    let categories: [ServiceCategory]
}

// MARK: - ServiceCategory Preview Data
extension ServiceCategory {
    static let preview = ServiceCategory(value: "HAIR", label: "Hair")

    static let previewList: [ServiceCategory] = [
        ServiceCategory(value: "HAIR", label: "Hair"),
        ServiceCategory(value: "NAILS", label: "Nails"),
        ServiceCategory(value: "SKINCARE", label: "Skincare"),
        ServiceCategory(value: "MASSAGE", label: "Massage"),
        ServiceCategory(value: "MAKEUP", label: "Makeup"),
        ServiceCategory(value: "EYEBROWS", label: "Eyebrows"),
        ServiceCategory(value: "LASHES", label: "Lashes"),
        ServiceCategory(value: "WAXING", label: "Waxing"),
        ServiceCategory(value: "TATTOO", label: "Tattoo"),
        ServiceCategory(value: "PIERCING", label: "Piercing"),
        ServiceCategory(value: "WELLNESS", label: "Wellness"),
        ServiceCategory(value: "OTHER", label: "Other")
    ]
}

// MARK: - OAuth2 Authentication Models

/// OAuth2 authentication response from backend
struct OAuth2AuthResponse: Codable, Sendable {
    let token: String
    let refreshToken: String
    let id: Int
    let email: String
    let firstName: String
    let lastName: String
    let phone: String?
    let avatar: String?
    let roles: [String]
    let isNewUser: Bool
    let provider: String
}

/// Facebook authentication request
struct FacebookAuthRequest: Codable, Sendable {
    let accessToken: String
}


