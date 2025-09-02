package com.ddimitko.beautyhub.entity

import com.ddimitko.beautyhub.enums.UserRole
import com.fasterxml.jackson.annotation.JsonIgnore
import groovy.transform.EqualsAndHashCode
import groovy.transform.ToString
import jakarta.persistence.*
import jakarta.validation.constraints.*

import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp

import java.time.LocalDateTime

@Entity
@Table(name = "users")
@EqualsAndHashCode(excludes = ["shops", "employeeProfile", "appointments", "ratings", "notifications"])
@ToString(excludes = ["password", "shops", "employeeProfile", "appointments", "ratings", "notifications"])
class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    UUID id

    @Column(name = "email", unique = true, nullable = false)
    @Email(message = "Email should be valid")
    @NotBlank(message = "Email is required")
    String email

    @Column(name = "password", nullable = false)
    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @JsonIgnore
    String password

    @Column(name = "first_name")
    @NotBlank(message = "First name is required")
    String firstName

    @Column(name = "last_name")
    @NotBlank(message = "Last name is required")
    String lastName

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    UserRole role = UserRole.USER

    @Column(name = "avatar")
    String avatar

    @Column(name = "phone")
    @Pattern(regexp = '^\\+[1-9]\\d{1,14}$', message = "Phone number must be in international format (e.g., +359888123456)")
    String phone

    @Column(name = "email_verified", nullable = false)
    Boolean emailVerified = false

    @Column(name = "enabled", nullable = false)
    Boolean enabled = true

    @Column(name = "onboarding_completed", nullable = false)
    Boolean onboardingCompleted = false

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt

    // OAuth2 fields
    @Column(name = "provider")
    String provider

    @Column(name = "provider_id")
    String providerId

    // Stripe customer ID for payment methods management
    @Column(name = "stripe_customer_id")
    String stripeCustomerId

    // Relationships
    @OneToMany(mappedBy = "owner", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    Set<Shop> shops = new HashSet<>()

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    Employee employeeProfile

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    Set<Appointment> appointments = new HashSet<>()

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    Set<Rating> ratings = new HashSet<>()

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    Set<Notification> notifications = new HashSet<>()

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_favorite_shops",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "shop_id")
    )
    @JsonIgnore
    Set<Shop> favoriteShops = new HashSet<>()

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    Set<UserConnection> connections = new HashSet<>()

    String getFullName() {
        return "${firstName} ${lastName}".trim()
    }

    boolean isOwner() {
        return role == UserRole.OWNER
    }

    boolean isEmployee() {
        return role == UserRole.EMPLOYEE
    }

    boolean isUser() {
        return role == UserRole.USER
    }
}
