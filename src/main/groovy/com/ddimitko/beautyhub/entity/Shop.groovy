package com.ddimitko.beautyhub.entity

import com.ddimitko.beautyhub.enums.BusinessType
import com.fasterxml.jackson.annotation.JsonIgnore
import groovy.transform.EqualsAndHashCode
import groovy.transform.ToString
import jakarta.persistence.*
import jakarta.validation.constraints.*
import org.hibernate.validator.constraints.URL
import lombok.AllArgsConstructor
import lombok.Builder
import lombok.Data
import lombok.NoArgsConstructor
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp

import java.time.LocalDateTime

@Entity
@Table(name = "shops")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(excludes = ["owner", "employees", "services", "appointments", "employeeInvitations"])
@ToString(excludes = ["owner", "employees", "services", "appointments", "employeeInvitations"])
class Shop {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    UUID id

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    @NotNull(message = "Shop owner is required")
    User owner

    @Column(name = "name", nullable = false)
    @NotBlank(message = "Shop name is required")
    String name

    @Column(name = "description", columnDefinition = "TEXT")
    String description

    @ElementCollection(targetClass = BusinessType.class)
    @CollectionTable(name = "shop_business_types", joinColumns = @JoinColumn(name = "shop_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "business_type")
    @NotEmpty(message = "At least one business type is required")
    Set<BusinessType> businessTypes = new HashSet<>()

    @Column(name = "address", nullable = false)
    @NotBlank(message = "Address is required")
    String address

    @Column(name = "city")
    @NotBlank(message = "City is required")
    String city

    @Column(name = "state")
    String state

    @Column(name = "postal_code")
    @NotBlank(message = "Postal code is required")
    String postalCode

    @Column(name = "country")
    @NotBlank(message = "Country is required")
    String country

    @Column(name = "phone")
    @NotBlank(message = "Phone is required")
    String phone

    @Column(name = "email")
    @Email(message = "Email should be valid")
    String email

    @Column(name = "website")
    @URL(message = "Website must be a valid URL")
    String website

    @Column(name = "thumbnail")
    String thumbnail

    @ElementCollection
    @CollectionTable(name = "shop_gallery", joinColumns = @JoinColumn(name = "shop_id"))
    @Column(name = "image_url")
    List<String> gallery = new ArrayList<>()

    @Column(name = "accepts_card_payments", nullable = false)
    Boolean acceptsCardPayments = false

    @Column(name = "latitude")
    @DecimalMin(value = "-90.0", message = "Latitude must be between -90 and 90 degrees")
    @DecimalMax(value = "90.0", message = "Latitude must be between -90 and 90 degrees")
    Double latitude

    @Column(name = "longitude")
    @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180 degrees")
    @DecimalMax(value = "180.0", message = "Longitude must be between -180 and 180 degrees")
    Double longitude

    @Column(name = "rating_average")
    Double ratingAverage = 0.0

    @Column(name = "rating_count")
    Integer ratingCount = 0

    @Column(name = "active", nullable = false)
    Boolean active = false  // Start as inactive until subscription is confirmed

    @Column(name = "featured", nullable = false)
    Boolean featured = false

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt

    // Relationships
    @OneToOne(mappedBy = "shop", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    ShopStripeDetails stripeDetails

    @OneToMany(mappedBy = "shop", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    Set<Employee> employees = new HashSet<>()

    @OneToMany(mappedBy = "shop", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    Set<Service> services = new HashSet<>()

    @OneToMany(mappedBy = "shop", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    Set<Appointment> appointments = new HashSet<>()

    // Ratings are now accessed through appointments
    // @OneToMany(mappedBy = "appointment.shop", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    // @JsonIgnore
    // Set<Rating> ratings = new HashSet<>()

    @OneToMany(mappedBy = "shop", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    Set<EmployeeInvitation> employeeInvitations = new HashSet<>()



    String getFullAddress() {
        List<String> addressParts = [address, city, state, postalCode, country].findAll { it }
        return addressParts.join(", ")
    }

    void updateRating(Double newRating) {
        if (ratingCount == 0) {
            ratingAverage = newRating
            ratingCount = 1
        } else {
            Double totalRating = ratingAverage * ratingCount + newRating
            ratingCount++
            ratingAverage = totalRating / ratingCount
        }
    }

    boolean canAcceptPayments() {
        return acceptsCardPayments && stripeDetails?.canAcceptPayments()
    }

    boolean hasStripeSubscription() {
        return stripeDetails?.hasSubscription()
    }

    boolean isVisibleToCustomers() {
        return active && hasStripeSubscription()
    }

    boolean isSubscriptionValid() {
        return hasStripeSubscription()
    }

    boolean isFeatured() {
        return featured && active
    }

    boolean isActive() {
        return active
    }
}
