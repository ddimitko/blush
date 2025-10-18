//
//  Shop.swift
//  LunaraApp
//
//  Created by Lunara Team on 14/07/2025.
//

import Foundation
import CoreLocation

// MARK: - Shop Summary Model (for public API)
struct ShopSummary: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let description: String
    let address: String
    let city: String
    let state: String
    let postalCode: String
    let country: String
    let phone: String
    let email: String
    let website: String?
    let businessTypes: [BusinessType]
    let gallery: [String]?
    let thumbnail: String?
    let ratingAverage: Double
    let ratingCount: Int
    let acceptsCardPayments: Bool

    // MARK: - Computed Properties
    var fullAddress: String {
        return "\(address), \(city), \(state) \(postalCode), \(country)"
    }

    var shortAddress: String {
        return "\(city), \(state)"
    }

    var businessTypeNames: [String] {
        return businessTypes.map { $0.displayName }
    }

    var primaryBusinessType: BusinessType? {
        return businessTypes.first
    }

    var formattedRating: String {
        return String(format: "%.1f", ratingAverage)
    }

    var hasGallery: Bool {
        return gallery?.isEmpty == false
    }

    var displayImage: String? {
        return thumbnail ?? gallery?.first
    }
}

// MARK: - Shop Model (full model with all fields)
struct Shop: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let description: String
    let address: String
    let city: String
    let state: String
    let postalCode: String
    let country: String
    let phone: String
    let email: String
    let website: String?
    let businessTypes: [BusinessType]
    let gallery: [String]?
    let thumbnail: String?
    let ratingAverage: Double
    let ratingCount: Int
    let active: Bool
    let acceptsCardPayments: Bool
    let owner: MinimalUser
    let businessHours: [BusinessHours]?
    let latitude: Double?
    let longitude: Double?
    let createdAt: String
    let updatedAt: String
    
    // MARK: - Computed Properties
    var fullAddress: String {
        return "\(address), \(city), \(state) \(postalCode), \(country)"
    }
    
    var shortAddress: String {
        return "\(city), \(state)"
    }
    
    var coordinate: CLLocationCoordinate2D? {
        guard let latitude = latitude, let longitude = longitude else { return nil }
        return CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
    
    var location: CLLocation? {
        guard let coordinate = coordinate else { return nil }
        return CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
    }
    
    var businessTypeNames: [String] {
        return businessTypes.map { $0.displayName }
    }
    
    var primaryBusinessType: BusinessType? {
        return businessTypes.first
    }
    
    var formattedRating: String {
        return String(format: "%.1f", ratingAverage)
    }
    
    var hasGallery: Bool {
        return gallery?.isEmpty == false
    }

    var displayImage: String? {
        return thumbnail ?? gallery?.first
    }
    
    var isOpen: Bool {
        guard let businessHours = businessHours else { return false }
        return BusinessHours.isCurrentlyOpen(businessHours)
    }
    
    var todayHours: BusinessHours? {
        guard let businessHours = businessHours else { return nil }
        let today = Calendar.current.component(.weekday, from: Date())
        let dayOfWeek = DayOfWeek.fromCalendarWeekday(today)
        return businessHours.first { $0.dayOfWeek == dayOfWeek }
    }
}

// MARK: - Business Type Enum
enum BusinessType: String, Codable, CaseIterable {
    case hairdresser = "HAIRDRESSER"
    case barber = "BARBER"
    case massage = "MASSAGE"
    case nailStylist = "NAIL_STYLIST"
    case spa = "SPA"
    case beautySalon = "BEAUTY_SALON"
    case skincareclinic = "SKINCARE_CLINIC"
    case eyebrowThreading = "EYEBROW_THREADING"
    case tattooParlor = "TATTOO_PARLOR"
    case wellnessCenter = "WELLNESS_CENTER"
    case makeupArtist = "MAKEUP_ARTIST"
    case lashExtensions = "LASH_EXTENSIONS"
    case microblading = "MICROBLADING"
    case permanentMakeup = "PERMANENT_MAKEUP"
    case waxingSalon = "WAXING_SALON"
    
    var displayName: String {
        switch self {
        case .hairdresser:
            return "Hairdresser"
        case .barber:
            return "Barber"
        case .massage:
            return "Massage"
        case .nailStylist:
            return "Nail Stylist"
        case .spa:
            return "Spa"
        case .beautySalon:
            return "Beauty Salon"
        case .skincareclinic:
            return "Skincare Clinic"
        case .eyebrowThreading:
            return "Eyebrow Threading"
        case .tattooParlor:
            return "Tattoo Parlor"
        case .wellnessCenter:
            return "Wellness Center"
        case .makeupArtist:
            return "Makeup Artist"
        case .lashExtensions:
            return "Lash Extensions"
        case .microblading:
            return "Microblading"
        case .permanentMakeup:
            return "Permanent Makeup"
        case .waxingSalon:
            return "Waxing Salon"
        }
    }
    
    var iconName: String {
        switch self {
        case .hairdresser, .beautySalon:
            return "scissors"
        case .barber:
            return "mustache"
        case .massage, .spa, .wellnessCenter:
            return "leaf"
        case .nailStylist:
            return "hand.raised"
        case .skincareclinic:
            return "face.smiling"
        case .eyebrowThreading, .microblading, .permanentMakeup:
            return "eye"
        case .tattooParlor:
            return "paintbrush"
        case .makeupArtist:
            return "paintpalette"
        case .lashExtensions:
            return "eye.trianglebadge.exclamationmark"
        case .waxingSalon:
            return "sparkles"
        }
    }
}

// MARK: - Business Hours Model
struct BusinessHours: Codable, Identifiable, Equatable {
    let id: String?
    let dayOfWeek: DayOfWeek
    let openTime: String
    let closeTime: String
    let isClosed: Bool
    
    var displayTime: String {
        if isClosed {
            return "Closed"
        }
        return "\(openTime) - \(closeTime)"
    }
    
    static func isCurrentlyOpen(_ businessHours: [BusinessHours]) -> Bool {
        let now = Date()
        let calendar = Calendar.current
        let weekday = calendar.component(.weekday, from: now)
        let dayOfWeek = DayOfWeek.fromCalendarWeekday(weekday)
        
        guard let todayHours = businessHours.first(where: { $0.dayOfWeek == dayOfWeek }) else {
            return false
        }
        
        if todayHours.isClosed {
            return false
        }
        
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        
        guard let openTime = formatter.date(from: todayHours.openTime),
              let closeTime = formatter.date(from: todayHours.closeTime) else {
            return false
        }
        
        let currentTime = formatter.date(from: formatter.string(from: now))!
        
        return currentTime >= openTime && currentTime <= closeTime
    }
}

// MARK: - Day of Week Enum
enum DayOfWeek: String, Codable, CaseIterable {
    case monday = "MONDAY"
    case tuesday = "TUESDAY"
    case wednesday = "WEDNESDAY"
    case thursday = "THURSDAY"
    case friday = "FRIDAY"
    case saturday = "SATURDAY"
    case sunday = "SUNDAY"
    
    var displayName: String {
        switch self {
        case .monday:
            return "Monday"
        case .tuesday:
            return "Tuesday"
        case .wednesday:
            return "Wednesday"
        case .thursday:
            return "Thursday"
        case .friday:
            return "Friday"
        case .saturday:
            return "Saturday"
        case .sunday:
            return "Sunday"
        }
    }
    
    var shortName: String {
        switch self {
        case .monday:
            return "Mon"
        case .tuesday:
            return "Tue"
        case .wednesday:
            return "Wed"
        case .thursday:
            return "Thu"
        case .friday:
            return "Fri"
        case .saturday:
            return "Sat"
        case .sunday:
            return "Sun"
        }
    }
    
    static func fromCalendarWeekday(_ weekday: Int) -> DayOfWeek {
        switch weekday {
        case 1: return .sunday
        case 2: return .monday
        case 3: return .tuesday
        case 4: return .wednesday
        case 5: return .thursday
        case 6: return .friday
        case 7: return .saturday
        default: return .monday
        }
    }
}

// MARK: - Shop Creation Form Data (for UI state management)
struct ShopCreationFormData: Codable {
    // Business Details
    var name: String = ""
    var description: String = ""
    var address: String = ""
    var city: String = ""
    var state: String = ""
    var postalCode: String = ""
    var country: String = "US"
    var phone: String = ""
    var email: String = ""
    var website: String = ""
    var businessTypes: [BusinessType] = []

    // Geocoding data
    var latitude: Double?
    var longitude: Double?
    var useGoogleMapsGeolocation: Bool = false

    // Subscription
    var selectedPlan: SubscriptionPlanResponse?
    var customerName: String = ""
    var customerEmail: String = ""
    var customerPhone: String = ""

    // Billing Address
    var billingAddressLine1: String = ""
    var billingAddressLine2: String = ""
    var billingCity: String = ""
    var billingState: String = ""
    var billingPostalCode: String = ""
    var billingCountry: String = "US"

    // Validation state
    var errors: [String: String] = [:]

    // MARK: - Computed Properties
    var isStep1Valid: Bool {
        return true // Step 1 validation is now handled by scroll detection in the view
    }

    var isStep2Valid: Bool {
        // Simple validation without complex computed properties
        guard !name.isEmpty && !description.isEmpty && !address.isEmpty &&
              !city.isEmpty && !country.isEmpty && !phone.isEmpty &&
              !email.isEmpty && !businessTypes.isEmpty else {
            return false
        }

        // Country-specific validation
        let countryValidation = CountryValidationService.shared
        if countryValidation.isStateRequired(for: country) && state.isEmpty {
            return false
        }
        if countryValidation.isPostalCodeRequired(for: country) && postalCode.isEmpty {
            return false
        }

        // Basic format validation
        return email.contains("@") && phone.count >= 10
    }

    var isStep3Valid: Bool {
        return selectedPlan != nil // Step 3 is now subscription plan selection
    }

    // MARK: - Helper Methods
    func isValidEmail(_ email: String) -> Bool {
        let emailRegex = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
        return NSPredicate(format: "SELF MATCHES %@", emailRegex).evaluate(with: email)
    }

    func isValidPhone(_ phone: String) -> Bool {
        let countryValidation = CountryValidationService.shared
        return countryValidation.validatePhoneNumber(phone, for: country)
    }

    func isValidPostalCode(_ postalCode: String) -> Bool {
        let countryValidation = CountryValidationService.shared
        return countryValidation.validatePostalCode(postalCode, for: country)
    }

    // MARK: - Convert to Request
    func toShopCreationRequest() -> ShopCreationRequest {
        let request = ShopCreationRequest(
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            description: description.trimmingCharacters(in: .whitespacesAndNewlines),
            address: address.trimmingCharacters(in: .whitespacesAndNewlines),
            city: city.trimmingCharacters(in: .whitespacesAndNewlines),
            state: state.trimmingCharacters(in: .whitespacesAndNewlines),
            postalCode: postalCode.trimmingCharacters(in: .whitespacesAndNewlines),
            country: country.trimmingCharacters(in: .whitespacesAndNewlines),
            phone: phone.trimmingCharacters(in: .whitespacesAndNewlines),
            email: email.trimmingCharacters(in: .whitespacesAndNewlines),
            website: website.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : website.trimmingCharacters(in: .whitespacesAndNewlines),
            businessTypes: businessTypes,
            latitude: latitude,
            longitude: longitude
        )

        print("📋 Shop creation request data:")
        print("   Name: \(request.name)")
        print("   Description: \(request.description)")
        print("   Address: \(request.address)")
        print("   City: \(request.city)")
        print("   Country: \(request.country)")
        print("   Phone: \(request.phone)")
        print("   Email: \(request.email)")
        print("   Business Types: \(request.businessTypes.map { $0.rawValue })")

        return request
    }
}

// MARK: - Shop Creation Request
struct ShopCreationRequest: Codable {
    let name: String
    let description: String
    let address: String
    let city: String
    let state: String
    let postalCode: String
    let country: String
    let phone: String
    let email: String
    let website: String?
    let businessTypes: [BusinessType]
    let latitude: Double?
    let longitude: Double?
}

// MARK: - Shop Summary Extensions
extension ShopSummary {
    /// Convert ShopSummary to Shop with default values for missing fields
    func toShop() -> Shop {
        return Shop(
            id: self.id,
            name: self.name,
            description: self.description,
            address: self.address,
            city: self.city,
            state: self.state,
            postalCode: self.postalCode,
            country: self.country,
            phone: self.phone,
            email: self.email,
            website: self.website,
            businessTypes: self.businessTypes,
            gallery: self.gallery,
            thumbnail: self.thumbnail,
            ratingAverage: self.ratingAverage,
            ratingCount: self.ratingCount,
            active: true, // Assume active since it's in public API
            acceptsCardPayments: self.acceptsCardPayments,
            owner: MinimalUser(
                id: "preview-owner-id",
                email: "owner@example.com",
                firstName: "Jane",
                lastName: "Smith",
                phone: "+1234567890",
                avatar: nil,
                role: .owner
            ), // Default owner for public data
            businessHours: nil, // Not available in summary
            latitude: nil, // Not available in summary
            longitude: nil, // Not available in summary
            createdAt: Date().ISO8601Format(), // Default to current date
            updatedAt: Date().ISO8601Format() // Default to current date
        )
    }
}

// MARK: - Shop Extensions
extension Shop {
    /// Returns a preview shop for SwiftUI previews
    static var preview: Shop {
        return Shop(
            id: "preview-shop-id",
            name: "Bella Beauty Salon",
            description: "A premium beauty salon offering a wide range of services including hair styling, nail care, and skincare treatments.",
            address: "123 Main Street",
            city: "San Francisco",
            state: "CA",
            postalCode: "94102",
            country: "US",
            phone: "+1 (555) 123-4567",
            email: "info@bellabeauty.com",
            website: "https://bellabeauty.com",
            businessTypes: [.beautySalon, .hairdresser, .nailStylist],
            gallery: [
                "https://example.com/image1.jpg",
                "https://example.com/image2.jpg"
            ],
            thumbnail: "https://example.com/thumbnail.jpg",
            ratingAverage: 4.8,
            ratingCount: 127,
            active: true,
            acceptsCardPayments: true,
            owner: MinimalUser(
                id: "preview-owner-0",
                email: "preview@example.com",
                firstName: "Preview",
                lastName: "Owner",
                phone: "+1234567890",
                avatar: nil,
                role: .owner
            ),
            businessHours: [
                BusinessHours(id: "1", dayOfWeek: .monday, openTime: "09:00", closeTime: "18:00", isClosed: false),
                BusinessHours(id: "2", dayOfWeek: .tuesday, openTime: "09:00", closeTime: "18:00", isClosed: false),
                BusinessHours(id: "3", dayOfWeek: .wednesday, openTime: "09:00", closeTime: "18:00", isClosed: false),
                BusinessHours(id: "4", dayOfWeek: .thursday, openTime: "09:00", closeTime: "18:00", isClosed: false),
                BusinessHours(id: "5", dayOfWeek: .friday, openTime: "09:00", closeTime: "19:00", isClosed: false),
                BusinessHours(id: "6", dayOfWeek: .saturday, openTime: "10:00", closeTime: "17:00", isClosed: false),
                BusinessHours(id: "7", dayOfWeek: .sunday, openTime: "10:00", closeTime: "16:00", isClosed: false)
            ],
            latitude: 37.7749,
            longitude: -122.4194,
            createdAt: Date().ISO8601Format(),
            updatedAt: Date().ISO8601Format()
        )
    }

    /// Returns multiple preview shops with unique IDs
    static var previewList: [Shop] {
        return [
            Shop(
                id: "preview-shop-1",
                name: "Bella Beauty Salon",
                description: "A premium beauty salon offering a wide range of services including hair styling, nail care, and skincare treatments.",
                address: "123 Main Street",
                city: "San Francisco",
                state: "CA",
                postalCode: "94102",
                country: "US",
                phone: "+1 (555) 123-4567",
                email: "info@bellabeauty.com",
                website: "https://bellabeauty.com",
                businessTypes: [.beautySalon, .hairdresser, .nailStylist],
                gallery: ["https://example.com/image1.jpg"],
                thumbnail: "https://example.com/thumbnail1.jpg",
                ratingAverage: 4.8,
                ratingCount: 127,
                active: true,
                acceptsCardPayments: true,
                owner: MinimalUser(
                    id: "preview-owner-1",
                    email: "bella@example.com",
                    firstName: "Bella",
                    lastName: "Rodriguez",
                    phone: "+1234567890",
                    avatar: nil,
                    role: .owner
                ),
                businessHours: [
                    BusinessHours(id: "1", dayOfWeek: .monday, openTime: "09:00", closeTime: "18:00", isClosed: false),
                    BusinessHours(id: "2", dayOfWeek: .tuesday, openTime: "09:00", closeTime: "18:00", isClosed: false),
                    BusinessHours(id: "3", dayOfWeek: .wednesday, openTime: "09:00", closeTime: "18:00", isClosed: false),
                    BusinessHours(id: "4", dayOfWeek: .thursday, openTime: "09:00", closeTime: "18:00", isClosed: false),
                    BusinessHours(id: "5", dayOfWeek: .friday, openTime: "09:00", closeTime: "19:00", isClosed: false),
                    BusinessHours(id: "6", dayOfWeek: .saturday, openTime: "10:00", closeTime: "17:00", isClosed: false),
                    BusinessHours(id: "7", dayOfWeek: .sunday, openTime: "10:00", closeTime: "16:00", isClosed: false)
                ],
                latitude: 37.7749,
                longitude: -122.4194,
                createdAt: Date().ISO8601Format(),
                updatedAt: Date().ISO8601Format()
            ),
            Shop(
                id: "preview-shop-2",
                name: "Elite Spa & Wellness",
                description: "Luxury spa offering massage therapy, skincare treatments, and wellness services.",
                address: "456 Wellness Ave",
                city: "Los Angeles",
                state: "CA",
                postalCode: "90210",
                country: "US",
                phone: "+1 (555) 234-5678",
                email: "info@elitespa.com",
                website: "https://elitespa.com",
                businessTypes: [.spa, .wellnessCenter, .massage],
                gallery: ["https://example.com/spa1.jpg"],
                thumbnail: "https://example.com/spa-thumb.jpg",
                ratingAverage: 4.9,
                ratingCount: 89,
                active: true,
                acceptsCardPayments: true,
                owner: MinimalUser(
                    id: "preview-owner-2",
                    email: "zen@example.com",
                    firstName: "Zen",
                    lastName: "Master",
                    phone: "+1234567891",
                    avatar: nil,
                    role: .owner
                ),
                businessHours: [
                    BusinessHours(id: "8", dayOfWeek: .monday, openTime: "08:00", closeTime: "20:00", isClosed: false),
                    BusinessHours(id: "9", dayOfWeek: .tuesday, openTime: "08:00", closeTime: "20:00", isClosed: false),
                    BusinessHours(id: "10", dayOfWeek: .wednesday, openTime: "08:00", closeTime: "20:00", isClosed: false),
                    BusinessHours(id: "11", dayOfWeek: .thursday, openTime: "08:00", closeTime: "20:00", isClosed: false),
                    BusinessHours(id: "12", dayOfWeek: .friday, openTime: "08:00", closeTime: "21:00", isClosed: false),
                    BusinessHours(id: "13", dayOfWeek: .saturday, openTime: "09:00", closeTime: "19:00", isClosed: false),
                    BusinessHours(id: "14", dayOfWeek: .sunday, openTime: "09:00", closeTime: "18:00", isClosed: false)
                ],
                latitude: 34.0522,
                longitude: -118.2437,
                createdAt: Date().ISO8601Format(),
                updatedAt: Date().ISO8601Format()
            ),
            Shop(
                id: "preview-shop-3",
                name: "Modern Barber Co.",
                description: "Contemporary barbershop specializing in classic and modern men's grooming.",
                address: "789 Style Street",
                city: "New York",
                state: "NY",
                postalCode: "10001",
                country: "US",
                phone: "+1 (555) 345-6789",
                email: "info@modernbarber.com",
                website: "https://modernbarber.com",
                businessTypes: [.barber],
                gallery: ["https://example.com/barber1.jpg"],
                thumbnail: "https://example.com/barber-thumb.jpg",
                ratingAverage: 4.7,
                ratingCount: 156,
                active: true,
                acceptsCardPayments: true,
                owner: MinimalUser(
                    id: "preview-owner-3",
                    email: "modern@example.com",
                    firstName: "Mike",
                    lastName: "Barber",
                    phone: "+1234567892",
                    avatar: nil,
                    role: .owner
                ),
                businessHours: [
                    BusinessHours(id: "15", dayOfWeek: .monday, openTime: "09:00", closeTime: "19:00", isClosed: false),
                    BusinessHours(id: "16", dayOfWeek: .tuesday, openTime: "09:00", closeTime: "19:00", isClosed: false),
                    BusinessHours(id: "17", dayOfWeek: .wednesday, openTime: "09:00", closeTime: "19:00", isClosed: false),
                    BusinessHours(id: "18", dayOfWeek: .thursday, openTime: "09:00", closeTime: "19:00", isClosed: false),
                    BusinessHours(id: "19", dayOfWeek: .friday, openTime: "09:00", closeTime: "20:00", isClosed: false),
                    BusinessHours(id: "20", dayOfWeek: .saturday, openTime: "08:00", closeTime: "18:00", isClosed: false),
                    BusinessHours(id: "21", dayOfWeek: .sunday, openTime: "10:00", closeTime: "17:00", isClosed: false)
                ],
                latitude: 40.7128,
                longitude: -74.0060,
                createdAt: Date().ISO8601Format(),
                updatedAt: Date().ISO8601Format()
            )
        ]
    }
    
    /// Calculate distance from a given location
    func distance(from location: CLLocation) -> CLLocationDistance? {
        guard let shopLocation = self.location else { return nil }
        return location.distance(from: shopLocation)
    }
    
    /// Format distance for display
    func formattedDistance(from location: CLLocation) -> String? {
        guard let distance = distance(from: location) else { return nil }
        
        let formatter = MeasurementFormatter()
        formatter.unitOptions = .naturalScale
        formatter.numberFormatter.maximumFractionDigits = 1
        
        let measurement = Measurement(value: distance, unit: UnitLength.meters)
        return formatter.string(from: measurement)
    }
}
