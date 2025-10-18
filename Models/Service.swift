//
//  Service.swift
//  LunaraApp
//
//  Created by Lunara Team on 14/07/2025.
//

import Foundation

// MARK: - Service Employee Response Model
struct ServiceEmployeeResponse: Codable, Sendable {
    let id: String
    let name: String
}

// MARK: - Service API Response Model
struct ServiceResponse: Codable, Sendable {
    let id: String
    let name: String
    let description: String?
    let price: Double
    let durationMinutes: Int
    let category: String?
    let active: Bool
    let bookingBufferMinutes: Int?
    let depositAmount: Double?
    let employeeId: String?
    let employeeName: String?
    let employees: [ServiceEmployeeResponse]?
    let shopId: String
    let shopName: String
    let formattedPrice: String?
    let formattedDuration: String?
    let createdAt: String?

    // Convert to Service model
    func toService() -> Service {
        // Create a minimal shop object with required fields
        let shop = Shop(
            id: shopId,
            name: shopName,
            description: "",
            address: "",
            city: "",
            state: "",
            postalCode: "",
            country: "",
            phone: "",
            email: "",
            website: nil,
            businessTypes: [],
            gallery: [],
            thumbnail: nil,
            ratingAverage: 0.0,
            ratingCount: 0,
            active: true,
            acceptsCardPayments: true,
            owner: MinimalUser(
                id: "",
                email: "",
                firstName: "",
                lastName: "",
                phone: nil,
                avatar: nil,
                role: .user
            ),
            businessHours: [],
            latitude: nil,
            longitude: nil,
            createdAt: "",
            updatedAt: ""
        )

        // Create employee objects from the employees array
        var serviceEmployees: [Employee] = []
        if let employeesData = employees {
            serviceEmployees = employeesData.map { empData in
                Employee(
                    id: empData.id,
                    fullName: empData.name,
                    name: empData.name,
                    email: "",
                    phone: nil,
                    bio: nil,
                    specialties: [],
                    yearsExperience: 0,
                    hourlyRate: nil,
                    commissionRate: 0.0,
                    hireDate: "",
                    active: true, // Backend only returns active employees
                    avatar: nil,
                    invitationStatus: nil,
                    invitationId: nil,
                    shop: shop,
                    user: nil,
                    services: [],
                    firstName: empData.name.components(separatedBy: " ").first,
                    lastName: empData.name.components(separatedBy: " ").dropFirst().joined(separator: " ")
                )
            }
        } else if let employeeId = employeeId, let employeeName = employeeName {
            // Fallback to legacy single employee format
            let employee = Employee(
                id: employeeId,
                fullName: employeeName,
                name: employeeName,
                email: "",
                phone: nil,
                bio: nil,
                specialties: [],
                yearsExperience: 0,
                hourlyRate: nil,
                commissionRate: 0.0,
                hireDate: "",
                active: true,
                avatar: nil,
                invitationStatus: nil,
                invitationId: nil,
                shop: shop,
                user: nil,
                services: [],
                firstName: employeeName.components(separatedBy: " ").first,
                lastName: employeeName.components(separatedBy: " ").dropFirst().joined(separator: " ")
            )
            serviceEmployees = [employee]
        }

        return Service(
            id: id,
            name: name,
            description: description,
            price: price,
            durationMinutes: durationMinutes,
            category: category,
            active: active,
            bookingBufferMinutes: bookingBufferMinutes,
            depositAmount: depositAmount,
            shop: shop,
            employees: serviceEmployees
        )
    }
}

// MARK: - Service Model
struct Service: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let name: String
    let description: String?
    let price: Double
    let durationMinutes: Int
    let category: String?
    let active: Bool
    let bookingBufferMinutes: Int?
    let depositAmount: Double?
    let shop: Shop
    let employees: [Employee]
    
    // MARK: - Computed Properties
    var formattedPrice: String {
        return String(format: "$%.2f", price)
    }

    var formattedDepositAmount: String {
        guard let depositAmount = depositAmount, depositAmount > 0 else { return "" }
        return String(format: "$%.2f", depositAmount)
    }
    
    var formattedDuration: String {
        if durationMinutes < 60 {
            return "\(durationMinutes) min"
        } else {
            let hours = durationMinutes / 60
            let minutes = durationMinutes % 60
            if minutes == 0 {
                return "\(hours)h"
            } else {
                return "\(hours)h \(minutes)min"
            }
        }
    }
    
    var duration: TimeInterval {
        return TimeInterval(durationMinutes * 60)
    }
    
    var hasAvailableEmployees: Bool {
        return !employees.isEmpty && employees.contains { $0.active }
    }
    
    var availableEmployees: [Employee] {
        return employees.filter { $0.active }
    }
    
    var isBookable: Bool {
        return active && hasAvailableEmployees
    }
    
    var categoryDisplayName: String {
        return category?.capitalized ?? "General"
    }
}

// MARK: - Service Creation Request
struct ServiceCreationRequest: Codable, Sendable {
    let name: String
    let description: String
    let price: Double
    let durationMinutes: Int
    let category: String
    let employeeIds: [String]
    let shopId: String
    let active: Bool?
    let bookingBufferMinutes: Int?
}

// MARK: - Service Update Request
struct ServiceUpdateRequest: Codable {
    let name: String?
    let description: String?
    let price: Double?
    let durationMinutes: Int?
    let category: String?
    let employeeIds: [String]?
    let active: Bool?
    let bookingBufferMinutes: Int?
}

// MARK: - Service Extensions
extension Service {
    /// Returns a preview service for SwiftUI previews
    static var preview: Service {
        return Service(
            id: "preview-service-id",
            name: "Haircut & Style",
            description: "Professional haircut and styling service with consultation",
            price: 75.00,
            durationMinutes: 60,
            category: "Hair",
            active: true,
            bookingBufferMinutes: 15,
            depositAmount: 15.00,
            shop: Shop.preview,
            employees: [Employee.preview]
        )
    }
    
    /// Returns multiple preview services
    static var previewList: [Service] {
        return [
            Service(
                id: "service-1",
                name: "Haircut & Style",
                description: "Professional haircut and styling",
                price: 75.00,
                durationMinutes: 60,
                category: "Hair",
                active: true,
                bookingBufferMinutes: 15,
                depositAmount: 15.00,
                shop: Shop.preview,
                employees: [] // Empty to break circular dependency
            ),
            Service(
                id: "service-2",
                name: "Hair Color",
                description: "Full hair coloring service",
                price: 120.00,
                durationMinutes: 120,
                category: "Hair",
                active: true,
                bookingBufferMinutes: 15,
                depositAmount: 30.00,
                shop: Shop.preview,
                employees: [] // Empty to break circular dependency
            ),
            Service(
                id: "service-3",
                name: "Manicure",
                description: "Classic manicure with polish",
                price: 35.00,
                durationMinutes: 45,
                category: "Nails",
                active: true,
                bookingBufferMinutes: 10,
                depositAmount: nil,
                shop: Shop.preview,
                employees: [] // Empty to break circular dependency
            ),
            Service(
                id: "service-4",
                name: "Facial Treatment",
                description: "Deep cleansing facial treatment",
                price: 90.00,
                durationMinutes: 75,
                category: "Skincare",
                active: true,
                bookingBufferMinutes: 15,
                depositAmount: 20.00,
                shop: Shop.preview,
                employees: [] // Empty to break circular dependency
            )
        ]
    }
    
    /// Calculate end time for an appointment starting at given time
    func endTime(from startTime: Date) -> Date {
        return startTime.addingTimeInterval(duration)
    }
    
    /// Check if service is available at a specific time with a specific employee
    func isAvailable(at time: Date, with employee: Employee) -> Bool {
        return active && 
               employee.active && 
               employees.contains { $0.id == employee.id }
    }
    
    /// Get price range if service has variable pricing
    var priceRange: String {
        // For now, return single price
        // In the future, this could handle variable pricing based on employee, time, etc.
        return formattedPrice
    }
    
    /// Get estimated total time including preparation and cleanup
    var totalDurationMinutes: Int {
        // Add buffer time for preparation and cleanup
        return durationMinutes + 15 // 15 minutes buffer
    }
    
    var formattedTotalDuration: String {
        let total = totalDurationMinutes
        if total < 60 {
            return "\(total) min"
        } else {
            let hours = total / 60
            let minutes = total % 60
            if minutes == 0 {
                return "\(hours)h"
            } else {
                return "\(hours)h \(minutes)min"
            }
        }
    }
}

// MARK: - Service Category Helpers
extension Service {
    /// Common service categories
    enum Category: String, CaseIterable {
        case hair = "Hair"
        case nails = "Nails"
        case skincare = "Skincare"
        case massage = "Massage"
        case makeup = "Makeup"
        case eyebrows = "Eyebrows"
        case lashes = "Lashes"
        case waxing = "Waxing"
        case spa = "Spa"
        case other = "Other"
        
        var iconName: String {
            switch self {
            case .hair:
                return "scissors"
            case .nails:
                return "hand.raised"
            case .skincare:
                return "face.smiling"
            case .massage:
                return "leaf"
            case .makeup:
                return "paintpalette"
            case .eyebrows:
                return "eye"
            case .lashes:
                return "eye.trianglebadge.exclamationmark"
            case .waxing:
                return "sparkles"
            case .spa:
                return "drop"
            case .other:
                return "star"
            }
        }
        
        var color: String {
            switch self {
            case .hair:
                return "brown"
            case .nails:
                return "pink"
            case .skincare:
                return "green"
            case .massage:
                return "blue"
            case .makeup:
                return "purple"
            case .eyebrows:
                return "orange"
            case .lashes:
                return "black"
            case .waxing:
                return "yellow"
            case .spa:
                return "cyan"
            case .other:
                return "gray"
            }
        }
    }
    
    /// Get category enum from string
    var categoryEnum: Category {
        return Category(rawValue: category ?? "") ?? .other
    }
    
    /// Get category icon
    var categoryIcon: String {
        return categoryEnum.iconName
    }
    
    /// Get category color
    var categoryColor: String {
        return categoryEnum.color
    }
}

// MARK: - Service Filtering and Sorting
extension Array where Element == Service {
    /// Filter services by category
    func filtered(by category: Service.Category) -> [Service] {
        return filter { $0.categoryEnum == category }
    }
    
    /// Filter active services only
    var activeOnly: [Service] {
        return filter { $0.active }
    }
    
    /// Filter bookable services only
    var bookableOnly: [Service] {
        return filter { $0.isBookable }
    }
    
    /// Sort by price (ascending)
    var sortedByPrice: [Service] {
        return sorted { $0.price < $1.price }
    }
    
    /// Sort by duration (ascending)
    var sortedByDuration: [Service] {
        return sorted { $0.durationMinutes < $1.durationMinutes }
    }
    
    /// Sort by name (alphabetical)
    var sortedByName: [Service] {
        return sorted { $0.name < $1.name }
    }
    
    /// Group services by category
    var groupedByCategory: [Service.Category: [Service]] {
        return Dictionary(grouping: self) { $0.categoryEnum }
    }
    
    /// Get unique categories
    var uniqueCategories: [Service.Category] {
        var result: [Service.Category] = []
        var seen = Set<Service.Category>()

        for service in self {
            let category = service.categoryEnum
            if !seen.contains(category) {
                seen.insert(category)
                result.append(category)
            }
        }

        return result.sorted { $0.rawValue < $1.rawValue }
    }
    
    /// Filter by price range
    func filtered(minPrice: Double, maxPrice: Double) -> [Service] {
        return filter { $0.price >= minPrice && $0.price <= maxPrice }
    }
    
    /// Filter by duration range
    func filtered(minDuration: Int, maxDuration: Int) -> [Service] {
        return filter { $0.durationMinutes >= minDuration && $0.durationMinutes <= maxDuration }
    }
    
    /// Search services by name or description
    func searched(query: String) -> [Service] {
        guard !query.isEmpty else { return self }
        
        let lowercaseQuery = query.lowercased()
        return filter { service in
            service.name.lowercased().contains(lowercaseQuery) ||
            service.description?.lowercased().contains(lowercaseQuery) == true ||
            service.category?.lowercased().contains(lowercaseQuery) == true
        }
    }
}
