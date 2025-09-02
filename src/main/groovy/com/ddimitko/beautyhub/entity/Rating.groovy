package com.ddimitko.beautyhub.entity

import groovy.transform.EqualsAndHashCode
import groovy.transform.ToString
import jakarta.persistence.*
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotNull
import lombok.AllArgsConstructor
import lombok.Builder
import lombok.Data
import lombok.NoArgsConstructor
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@Entity
@Table(name = "ratings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(excludes = ["user", "appointment"])
@ToString(excludes = ["user", "appointment"])
class Rating {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    UUID id

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @NotNull(message = "User is required")
    User user

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id", nullable = false, columnDefinition = "uuid")
    @NotNull(message = "Appointment is required")
    Appointment appointment

    @Column(name = "stars", nullable = false)
    @Min(value = 1, message = "Rating must be at least 1 star")
    @Max(value = 5, message = "Rating cannot exceed 5 stars")
    Integer stars

    @Column(name = "comment", columnDefinition = "TEXT")
    String comment

    @Column(name = "anonymous", nullable = false)
    Boolean anonymous = false

    @Column(name = "image_url")
    String imageUrl

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt

    String getUserName() {
        return anonymous ? "Anonymous" : user?.getFullName()
    }

    String getShopName() {
        return appointment?.shop?.name
    }

    String getEmployeeName() {
        return appointment?.employee?.getFullName()
    }

    String getServiceName() {
        return appointment?.service?.name
    }

    String getFormattedDate() {
        return createdAt?.format(DateTimeFormatter.ofPattern("MMM dd, yyyy"))
    }
}
