//
//  Employee.swift
//  LunaraApp
//
//  Created by Lunara Team on 14/07/2025.
//

import Foundation

// MARK: - Employee API Response Model
struct EmployeeResponse: Codable, Sendable {
    let id: String
    let name: String
    let bio: String?
    let specialties: String?
    let yearsExperience: Int?
    let avatar: String?
    let services: [ServiceSummary]?

    struct ServiceSummary: Codable, Sendable {
        let id: String
        let name: String
        let price: Double
        let durationMinutes: Int
    }

    // Convert to Employee model
    func toEmployee() -> Employee {
        // Create a minimal shop object (will be populated from context)
        let shop = Shop(
            id: "",
            name: "",
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

        // Convert services if available
        let employeeServices = services?.map { serviceSummary in
            Service(
                id: serviceSummary.id,
                name: serviceSummary.name,
                description: nil,
                price: serviceSummary.price,
                durationMinutes: serviceSummary.durationMinutes,
                category: nil,
                active: true,
                bookingBufferMinutes: nil,
                depositAmount: nil,
                shop: shop,
                employees: []
            )
        } ?? []

        return Employee(
            id: id,
            fullName: name,
            name: name,
            email: "",
            phone: nil,
            bio: bio ?? "",
            specialties: specialties?.components(separatedBy: ", ") ?? [],
            yearsExperience: yearsExperience ?? 0,
            hourlyRate: nil,
            commissionRate: 0.0,
            hireDate: "",
            active: true,
            avatar: avatar,
            invitationStatus: nil,
            invitationId: nil,
            shop: shop,
            user: nil,
            services: employeeServices,
            firstName: name.components(separatedBy: " ").first,
            lastName: name.components(separatedBy: " ").dropFirst().joined(separator: " ")
        )
    }
}

// MARK: - Owner Employee Model (for owner-specific endpoints)
struct OwnerEmployee: Codable, Identifiable, Equatable, Sendable {
    private let _id: String? // Optional for pending invitations
    let name: String
    let email: String
    let phone: String?
    let bio: String?
    let specialties: String?
    let yearsExperience: Int
    let hourlyRate: Double?
    let commissionRate: Double
    let hireDate: String?  // Optional for pending invitations
    var active: Bool
    let avatar: String?
    let invitationStatus: String?
    let invitationId: String?

    // MARK: - Coding Keys
    enum CodingKeys: String, CodingKey {
        case _id = "id"
        case name, email, phone, bio, specialties, yearsExperience
        case hourlyRate, commissionRate, hireDate, active, avatar
        case invitationStatus, invitationId
    }

    // MARK: - Computed Properties

    // Identifiable conformance - use id if available, otherwise invitationId
    var id: String {
        return _id ?? invitationId ?? UUID().uuidString
    }

    // Access to the original optional id for backend operations
    var originalId: String? {
        return _id
    }

    var displayName: String {
        return name
    }

    var fullName: String? {
        return name
    }

    var specialtiesArray: [String] {
        return specialties?.components(separatedBy: ", ").filter { !$0.isEmpty } ?? []
    }

    var isPendingInvitation: Bool {
        return _id == nil && invitationStatus == "PENDING"
    }

    var isAcceptedEmployee: Bool {
        return _id != nil && invitationStatus == "ACCEPTED"
    }

    // Helper properties for compatibility with Employee
    var initials: String {
        let components = name.components(separatedBy: " ")
        let firstInitial = components.first?.first?.uppercased() ?? ""
        let lastInitial = components.count > 1 ? components.last?.first?.uppercased() ?? "" : ""
        return firstInitial + lastInitial
    }

    // Convert to full Employee model when shop context is available
    func toEmployee(shop: Shop) -> Employee {
        return Employee(
            id: id, // Use computed id property
            fullName: name,
            name: name,
            email: email,
            phone: phone,
            bio: bio,
            specialties: specialtiesArray,
            yearsExperience: yearsExperience,
            hourlyRate: hourlyRate,
            commissionRate: commissionRate,
            hireDate: hireDate ?? "", // Empty string for pending invitations
            active: active,
            avatar: avatar,
            invitationStatus: invitationStatus,
            invitationId: invitationId,
            shop: shop,
            user: nil,
            services: [],
            firstName: name.components(separatedBy: " ").first,
            lastName: name.components(separatedBy: " ").dropFirst().joined(separator: " ")
        )
    }
}

// MARK: - Employee Model
struct Employee: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let fullName: String?
    let name: String?
    let email: String
    let phone: String?
    let bio: String?
    let specialties: [String]?
    let yearsExperience: Int
    let hourlyRate: Double?
    let commissionRate: Double
    let hireDate: String
    var active: Bool
    let avatar: String?
    let invitationStatus: String?
    let invitationId: String?
    let shop: Shop
    let user: User?
    let services: [Service]

    // Helper properties for easier access
    let firstName: String?
    let lastName: String?
    
    // MARK: - Computed Properties
    var displayName: String {
        return fullName ?? name ?? "\(firstName ?? "") \(lastName ?? "")".trimmingCharacters(in: .whitespaces)
    }
    
    var initials: String {
        let components = displayName.components(separatedBy: " ")
        let firstInitial = components.first?.first?.uppercased() ?? ""
        let lastInitial = components.count > 1 ? components.last?.first?.uppercased() ?? "" : ""
        return "\(firstInitial)\(lastInitial)"
    }
    
    var specialtiesList: [String] {
        return specialties ?? []
    }
    
    var formattedExperience: String {
        return yearsExperience == 1 ? "1 year experience" : "\(yearsExperience) years experience"
    }
    
    var formattedHourlyRate: String? {
        guard let rate = hourlyRate else { return nil }
        return String(format: "$%.2f/hour", rate)
    }
    
    var formattedCommissionRate: String {
        return String(format: "%.1f%% commission", commissionRate * 100)
    }
    
    var hireDateFormatted: String {
        guard let date = ISO8601DateFormatter().date(from: hireDate) else { return hireDate }
        
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }
    
    var isInvitationPending: Bool {
        return invitationStatus == "PENDING"
    }
    
    var isInvitationAccepted: Bool {
        return invitationStatus == "ACCEPTED"
    }
    
    var isInvitationRejected: Bool {
        return invitationStatus == "REJECTED"
    }
    
    var hasServices: Bool {
        return !services.isEmpty
    }
    
    var activeServices: [Service] {
        return services.filter { $0.active }
    }
    
    var serviceCategories: [String] {
        let categories = services.compactMap { $0.category }
        return Array(Set(categories)).sorted()
    }
    
    var isBookable: Bool {
        return active && hasServices
    }

    /// Special "any available" employee option for booking
    static var anyAvailable: Employee {
        return Employee(
            id: "any",
            fullName: "Any Available Staff",
            name: "Any Available Staff",
            email: "any@available.com",
            phone: nil,
            bio: "Let us choose the best available stylist for you",
            specialties: nil,
            yearsExperience: 0,
            hourlyRate: nil,
            commissionRate: 0.0,
            hireDate: Date().ISO8601Format(),
            active: true,
            avatar: nil,
            invitationStatus: "ACCEPTED",
            invitationId: nil,
            shop: Shop.preview,
            user: nil,
            services: [],
            firstName: "Any",
            lastName: "Available"
        )
    }
}

// MARK: - Employee Creation Request
struct EmployeeCreationRequest: Codable {
    let bio: String?
    let specialties: String?
    let yearsExperience: Int
    let hourlyRate: Double?
    let commissionRate: Double
}

// MARK: - Employee Invitation Request
struct EmployeeInvitationRequest: Codable {
    let email: String
    let bio: String?
    let specialties: String?
    let yearsExperience: Int
    let hourlyRate: Double?
    let commissionRate: Double
}

// MARK: - Owner Assignment Response
struct OwnerAssignmentResponse: Codable {
    let message: String
    let employeeId: String
    let employeeName: String
    let shopName: String
}

// MARK: - User Exists Response
struct UserExistsResponse: Codable {
    let exists: Bool
    let firstName: String?
    let lastName: String?
}

// MARK: - Employee Update Request
struct EmployeeUpdateRequest: Codable {
    let firstName: String?
    let lastName: String?
    let phone: String?
    let bio: String?
    let specialties: String?
    let yearsExperience: Int?
    let hourlyRate: Double?
    let commissionRate: Double?
    let active: Bool?
    let serviceIds: [String]?
}

// MARK: - Employee Extensions
extension Employee {
    /// Returns a preview employee for SwiftUI previews
    static var preview: Employee {
        return Employee(
            id: "preview-employee-id",
            fullName: "Sarah Johnson",
            name: "Sarah Johnson",
            email: "sarah.johnson@example.com",
            phone: "+1234567890",
            bio: "Experienced hair stylist with over 8 years in the industry. Specializes in modern cuts and color techniques.",
            specialties: ["Hair Cutting", "Hair Coloring", "Styling"],
            yearsExperience: 8,
            hourlyRate: 45.00,
            commissionRate: 0.60,
            hireDate: Date().addingTimeInterval(-365 * 24 * 60 * 60).ISO8601Format(), // 1 year ago
            active: true,
            avatar: nil,
            invitationStatus: "ACCEPTED",
            invitationId: nil,
            shop: Shop.preview,
            user: User.previewEmployee,
            services: [], // Empty to break circular dependency
            firstName: "Sarah",
            lastName: "Johnson"
        )
    }
    
    /// Returns multiple preview employees
    static var previewList: [Employee] {
        return [
            Employee(
                id: "employee-1",
                fullName: "Sarah Johnson",
                name: "Sarah Johnson",
                email: "sarah.johnson@example.com",
                phone: "+1234567890",
                bio: "Experienced hair stylist specializing in modern cuts and color.",
                specialties: ["Hair Cutting", "Hair Coloring", "Styling"],
                yearsExperience: 8,
                hourlyRate: 45.00,
                commissionRate: 0.60,
                hireDate: Date().addingTimeInterval(-365 * 24 * 60 * 60).ISO8601Format(),
                active: true,
                avatar: nil,
                invitationStatus: "ACCEPTED",
                invitationId: nil,
                shop: Shop.preview,
                user: User.previewEmployee,
                services: [],
                firstName: "Sarah",
                lastName: "Johnson"
            ),
            Employee(
                id: "employee-2",
                fullName: "Michael Chen",
                name: "Michael Chen",
                email: "michael.chen@example.com",
                phone: "+1234567891",
                bio: "Professional nail technician with expertise in nail art and gel manicures.",
                specialties: ["Nail Art", "Gel Manicures", "Pedicures"],
                yearsExperience: 5,
                hourlyRate: 35.00,
                commissionRate: 0.55,
                hireDate: Date().addingTimeInterval(-180 * 24 * 60 * 60).ISO8601Format(),
                active: true,
                avatar: nil,
                invitationStatus: "ACCEPTED",
                invitationId: nil,
                shop: Shop.preview,
                user: User.previewEmployee,
                services: [],
                firstName: "Michael",
                lastName: "Chen"
            ),
            Employee(
                id: "employee-3",
                fullName: "Emma Rodriguez",
                name: "Emma Rodriguez",
                email: "emma.rodriguez@example.com",
                phone: "+1234567892",
                bio: "Licensed esthetician specializing in facial treatments and skincare.",
                specialties: ["Facial Treatments", "Chemical Peels", "Skincare Consultation"],
                yearsExperience: 6,
                hourlyRate: 50.00,
                commissionRate: 0.65,
                hireDate: Date().addingTimeInterval(-270 * 24 * 60 * 60).ISO8601Format(),
                active: true,
                avatar: nil,
                invitationStatus: "ACCEPTED",
                invitationId: nil,
                shop: Shop.preview,
                user: User.previewEmployee,
                services: [],
                firstName: "Emma",
                lastName: "Rodriguez"
            )
        ]
    }
    
    /// Check if employee can provide a specific service
    func canProvide(service: Service) -> Bool {
        return active && services.contains { $0.id == service.id }
    }
    
    /// Get employee's availability for a specific date
    func isAvailable(on date: Date) -> Bool {
        // This would typically check against the employee's schedule
        // For now, return true if employee is active
        return active
    }
    
    /// Calculate total earnings for a period
    func calculateEarnings(appointments: [Appointment]) -> Double {
        let relevantAppointments = appointments.filter { appointment in
            appointment.employeeId == self.id &&
            appointment.status == .completed &&
            appointment.paymentStatus == .paid
        }
        
        return relevantAppointments.reduce(0) { total, appointment in
            return total + (appointment.totalAmount * commissionRate)
        }
    }
    
    /// Get employee's rating based on completed appointments
    func averageRating(from appointments: [Appointment]) -> Double {
        // This would typically come from a ratings system
        // For now, return a mock rating
        return 4.8
    }
    
    /// Get total number of completed appointments
    func completedAppointments(from appointments: [Appointment]) -> Int {
        return appointments.filter { appointment in
            appointment.employeeId == self.id && appointment.status == .completed
        }.count
    }
}

// MARK: - Employee Filtering and Sorting
extension Array where Element == Employee {
    /// Filter active employees only
    var activeOnly: [Employee] {
        return filter { $0.active }
    }
    
    /// Filter bookable employees only
    var bookableOnly: [Employee] {
        return filter { $0.isBookable }
    }
    
    /// Filter employees who can provide a specific service
    func canProvide(service: Service) -> [Employee] {
        return filter { $0.canProvide(service: service) }
    }
    
    /// Sort by experience (descending)
    var sortedByExperience: [Employee] {
        return sorted { $0.yearsExperience > $1.yearsExperience }
    }
    
    /// Sort by name (alphabetical)
    var sortedByName: [Employee] {
        return sorted { $0.displayName < $1.displayName }
    }
    
    /// Sort by hire date (newest first)
    var sortedByHireDate: [Employee] {
        return sorted { $0.hireDate > $1.hireDate }
    }
    
    /// Filter by specialty
    func filtered(by specialty: String) -> [Employee] {
        return filter { employee in
            employee.specialtiesList.contains { $0.lowercased().contains(specialty.lowercased()) }
        }
    }
    
    /// Search employees by name, email, or specialties
    func searched(query: String) -> [Employee] {
        guard !query.isEmpty else { return self }
        
        let lowercaseQuery = query.lowercased()
        return filter { employee in
            employee.displayName.lowercased().contains(lowercaseQuery) ||
            employee.email.lowercased().contains(lowercaseQuery) ||
            (employee.specialties ?? []).joined(separator: " ").lowercased().contains(lowercaseQuery)
        }
    }
    
    /// Group employees by their primary specialty
    var groupedBySpecialty: [String: [Employee]] {
        return Dictionary(grouping: self) { employee in
            employee.specialtiesList.first ?? "Other"
        }
    }
    
    /// Get unique specialties across all employees
    var uniqueSpecialties: [String] {
        var result: [String] = []
        var seen = Set<String>()

        for employee in self {
            for specialty in employee.specialties ?? [] {
                if !seen.contains(specialty) {
                    seen.insert(specialty)
                    result.append(specialty)
                }
            }
        }

        return result.sorted()
    }

    // anyAvailable is now defined in the main Employee struct
}
