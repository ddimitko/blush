package com.ddimitko.beautyhub.entity

import com.ddimitko.beautyhub.enums.InvitationStatus
import jakarta.persistence.*
import lombok.Data
import lombok.EqualsAndHashCode
import lombok.ToString
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp

import java.time.LocalDateTime

@Entity
@Table(name = "employee_invitations")
@Data
@EqualsAndHashCode(callSuper = false)
@ToString(exclude = ["shop"])
class EmployeeInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    UUID id

    @Column(nullable = false)
    String email

    @Column(nullable = false, unique = true)
    String token

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    InvitationStatus status = InvitationStatus.PENDING

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", nullable = false)
    Shop shop

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invited_by_user_id", nullable = false)
    User invitedBy

    // Employee profile data to be applied when invitation is accepted
    String bio
    String specialties
    Integer yearsExperience
    BigDecimal hourlyRate
    BigDecimal commissionRate

    @Column(nullable = false)
    LocalDateTime expiresAt

    LocalDateTime acceptedAt

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "accepted_by_user_id")
    User acceptedBy

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    LocalDateTime createdAt

    @UpdateTimestamp
    @Column(nullable = false)
    LocalDateTime updatedAt

    /**
     * Check if invitation is expired
     */
    boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt)
    }

    /**
     * Check if invitation is still valid (pending and not expired)
     */
    boolean isValid() {
        return status == InvitationStatus.PENDING && !isExpired()
    }
}
