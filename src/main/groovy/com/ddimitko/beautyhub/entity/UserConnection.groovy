package com.ddimitko.beautyhub.entity

import groovy.transform.EqualsAndHashCode
import groovy.transform.ToString
import jakarta.persistence.*
import jakarta.validation.constraints.NotBlank
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp

import java.time.LocalDateTime

@Entity
@Table(name = "user_connections", 
       uniqueConstraints = [
           @UniqueConstraint(columnNames = ["user_id", "provider"]),
           @UniqueConstraint(columnNames = ["provider", "provider_id"])
       ])
@EqualsAndHashCode(excludes = ["user"])
@ToString(excludes = ["user"])
class UserConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    UUID id

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    User user

    @Column(name = "provider", nullable = false)
    @NotBlank(message = "Provider is required")
    String provider // e.g., "facebook", "google", "apple"

    @Column(name = "provider_id", nullable = false)
    @NotBlank(message = "Provider ID is required")
    String providerId // The user's ID from the OAuth provider

    @Column(name = "provider_email")
    String providerEmail // Email from the OAuth provider

    @Column(name = "provider_name")
    String providerName // Display name from the OAuth provider

    @Column(name = "provider_avatar")
    String providerAvatar // Avatar URL from the OAuth provider

    @CreationTimestamp
    @Column(name = "connected_at", nullable = false, updatable = false)
    LocalDateTime connectedAt

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt
}
