package com.ddimitko.beautyhub.entity

import groovy.transform.EqualsAndHashCode
import groovy.transform.ToString
import jakarta.persistence.*
import lombok.AllArgsConstructor
import lombok.Data
import lombok.NoArgsConstructor
import org.hibernate.annotations.CreationTimestamp

import java.time.LocalDateTime

@Entity
@Table(name = "service_employees", uniqueConstraints = [
    @UniqueConstraint(columnNames = ["service_id", "employee_id"], name = "uk_service_employee")
])
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(excludes = ["service", "employee"])
@ToString(excludes = ["service", "employee"])
class ServiceEmployee {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    UUID id

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    Service service

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    Employee employee

    @Column(name = "active", nullable = false)
    Boolean active = true

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt
}
