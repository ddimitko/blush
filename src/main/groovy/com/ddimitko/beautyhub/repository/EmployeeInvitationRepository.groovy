package com.ddimitko.beautyhub.repository

import com.ddimitko.beautyhub.entity.EmployeeInvitation
import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.enums.InvitationStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

import java.time.LocalDateTime

@Repository
interface EmployeeInvitationRepository extends JpaRepository<EmployeeInvitation, UUID> {

    /**
     * Find invitation by token
     */
    Optional<EmployeeInvitation> findByToken(String token)

    /**
     * Find pending invitations by email and shop
     */
    @Query("SELECT ei FROM EmployeeInvitation ei WHERE ei.email = :email AND ei.shop = :shop AND ei.status = :status")
    List<EmployeeInvitation> findByEmailAndShopAndStatus(
            @Param("email") String email,
            @Param("shop") Shop shop,
            @Param("status") InvitationStatus status
    )

    /**
     * Find all invitations for a shop
     */
    List<EmployeeInvitation> findByShopOrderByCreatedAtDesc(Shop shop)

    /**
     * Find pending invitations for a shop
     */
    @Query("SELECT ei FROM EmployeeInvitation ei WHERE ei.shop = :shop AND ei.status = 'PENDING' ORDER BY ei.createdAt DESC")
    List<EmployeeInvitation> findPendingInvitationsByShop(@Param("shop") Shop shop)

    /**
     * Find expired invitations that need cleanup
     */
    @Query("SELECT ei FROM EmployeeInvitation ei WHERE ei.status = 'PENDING' AND ei.expiresAt < :now")
    List<EmployeeInvitation> findExpiredInvitations(@Param("now") LocalDateTime now)

    /**
     * Check if there's a pending invitation for email and shop
     */
    @Query("SELECT COUNT(ei) > 0 FROM EmployeeInvitation ei WHERE ei.email = :email AND ei.shop = :shop AND ei.status = 'PENDING' AND ei.expiresAt > :now")
    boolean existsPendingInvitation(
            @Param("email") String email,
            @Param("shop") Shop shop,
            @Param("now") LocalDateTime now
    )
}
