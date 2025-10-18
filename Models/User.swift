//
//  User.swift
//  LunaraApp
//
//  Created by Lunara Team on 14/07/2025.
//

import Foundation

// MARK: - User Model
struct User: Codable, Identifiable, Equatable {
    let id: String
    let email: String
    let firstName: String
    let lastName: String
    let phone: String?
    let avatar: String?
    let role: UserRole
    let emailVerified: Bool
    let onboardingCompleted: Bool
    let createdAt: String
    let updatedAt: String
    
    // MARK: - Computed Properties
    var fullName: String {
        return "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces)
    }
    
    var initials: String {
        let firstInitial = firstName.first?.uppercased() ?? ""
        let lastInitial = lastName.first?.uppercased() ?? ""
        return "\(firstInitial)\(lastInitial)"
    }
    
    var hasOwnerOrEmployeeRole: Bool {
        return role == .owner || role == .employee
    }
    
    var isOwner: Bool {
        return role == .owner
    }
    
    var isEmployee: Bool {
        return role == .employee
    }
}

// MARK: - User Role Enum
enum UserRole: String, Codable, CaseIterable {
    case user = "USER"
    case owner = "OWNER"
    case employee = "EMPLOYEE"
    case admin = "ADMIN"
    
    var displayName: String {
        switch self {
        case .user:
            return "User"
        case .owner:
            return "Owner"
        case .employee:
            return "Employee"
        case .admin:
            return "Admin"
        }
    }
    
    var description: String {
        switch self {
        case .user:
            return "Regular user who can book appointments"
        case .owner:
            return "Shop owner who can manage shops and employees"
        case .employee:
            return "Employee who can manage appointments and provide services"
        case .admin:
            return "System administrator"
        }
    }
}

// MARK: - Authentication Request/Response Models
struct LoginRequest: Codable {
    let email: String
    let password: String
}

struct RegisterRequest: Codable {
    let email: String
    let password: String
    let firstName: String
    let lastName: String
    let phone: String
}

struct LoginResponse: Codable {
    let token: String
    let refreshToken: String?
    let type: String
    let id: String
    let email: String
    let firstName: String
    let lastName: String
    let phone: String?
    let avatar: String?
    let roles: [String]
}

// MARK: - User Update Models
struct UserUpdateRequest: Codable {
    let firstName: String?
    let lastName: String?
    let phone: String?
    let avatar: String?
}

struct PasswordChangeRequest: Codable {
    let currentPassword: String
    let newPassword: String
}

// MARK: - User Connection Model (for OAuth)
struct UserConnection: Codable, Identifiable {
    let id: String
    let provider: String
    let providerId: String
    let email: String?
    let displayName: String?
    let profileImageUrl: String?
    let createdAt: String
}

// MARK: - Minimal User Model (for owner references in shops)
struct MinimalUser: Codable, Identifiable, Equatable {
    let id: String
    let email: String?
    let firstName: String?
    let lastName: String?
    let phone: String?
    let avatar: String?
    let role: UserRole?

    // MARK: - Computed Properties
    var fullName: String {
        let first = firstName ?? ""
        let last = lastName ?? ""
        return "\(first) \(last)".trimmingCharacters(in: .whitespaces)
    }

    var initials: String {
        let firstInitial = firstName?.first?.uppercased() ?? ""
        let lastInitial = lastName?.first?.uppercased() ?? ""
        return "\(firstInitial)\(lastInitial)"
    }

    // Convert to full User model with default values
    func toUser() -> User {
        return User(
            id: self.id,
            email: self.email ?? "",
            firstName: self.firstName ?? "",
            lastName: self.lastName ?? "",
            phone: self.phone,
            avatar: self.avatar,
            role: self.role ?? .user,
            emailVerified: false,
            onboardingCompleted: false,
            createdAt: Date().ISO8601Format(),
            updatedAt: Date().ISO8601Format()
        )
    }
}



// MARK: - User Extensions
extension User {
    /// Returns a placeholder user for preview purposes
    static var preview: User {
        return User(
            id: "preview-user-id",
            email: "john.doe@example.com",
            firstName: "John",
            lastName: "Doe",
            phone: "+1234567890",
            avatar: nil,
            role: .user,
            emailVerified: true,
            onboardingCompleted: true,
            createdAt: Date().ISO8601Format(),
            updatedAt: Date().ISO8601Format()
        )
    }
    
    /// Returns a placeholder owner user for preview purposes
    static var previewOwner: User {
        return User(
            id: "preview-owner-id",
            email: "jane.smith@example.com",
            firstName: "Jane",
            lastName: "Smith",
            phone: "+1234567890",
            avatar: nil,
            role: .owner,
            emailVerified: true,
            onboardingCompleted: true,
            createdAt: Date().ISO8601Format(),
            updatedAt: Date().ISO8601Format()
        )
    }
    
    /// Returns a placeholder employee user for preview purposes
    static var previewEmployee: User {
        return User(
            id: "preview-employee-id",
            email: "mike.johnson@example.com",
            firstName: "Mike",
            lastName: "Johnson",
            phone: "+1234567890",
            avatar: nil,
            role: .employee,
            emailVerified: true,
            onboardingCompleted: true,
            createdAt: Date().ISO8601Format(),
            updatedAt: Date().ISO8601Format()
        )
    }
}

// MARK: - Validation Extensions
extension User {
    /// Validates if the user's email is in a valid format
    var isEmailValid: Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }
    
    /// Validates if the user's phone number is in a valid format
    var isPhoneValid: Bool {
        guard let phone = phone else { return false }
        let phoneRegex = "^[+]?[0-9]{10,15}$"
        let phonePredicate = NSPredicate(format: "SELF MATCHES %@", phoneRegex)
        return phonePredicate.evaluate(with: phone)
    }
    
    /// Checks if the user profile is complete
    var isProfileComplete: Bool {
        return !firstName.isEmpty &&
               !lastName.isEmpty &&
               isEmailValid &&
               (phone?.isEmpty == false && isPhoneValid)
    }
}
