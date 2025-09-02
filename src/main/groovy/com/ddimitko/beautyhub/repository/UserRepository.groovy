package com.ddimitko.beautyhub.repository

import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.enums.UserRole
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

@Repository
interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email)

    Optional<User> findByEmailAndEnabledTrue(String email)

    boolean existsByEmail(String email)

    Optional<User> findByProviderAndProviderId(String provider, String providerId)

    List<User> findByRole(UserRole role)

    List<User> findByEnabledTrue()

    @Query("SELECT u FROM User u WHERE u.role = :role AND u.enabled = true")
    List<User> findActiveUsersByRole(@Param("role") UserRole role)

    @Query("SELECT u FROM User u WHERE LOWER(u.firstName) LIKE LOWER(CONCAT('%', :name, '%')) OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<User> findByNameContainingIgnoreCase(@Param("name") String name)

    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role")
    long countByRole(@Param("role") UserRole role)

    @Query("SELECT u FROM User u WHERE u.emailVerified = false AND u.createdAt < :cutoffDate")
    List<User> findUnverifiedUsersOlderThan(@Param("cutoffDate") java.time.LocalDateTime cutoffDate)
}
