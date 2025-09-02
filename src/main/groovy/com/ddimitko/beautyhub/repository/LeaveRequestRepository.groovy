package com.ddimitko.beautyhub.repository

import com.ddimitko.beautyhub.entity.Employee
import com.ddimitko.beautyhub.entity.LeaveRequest
import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.enums.LeaveRequestStatus
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

import java.time.LocalDate
import java.util.List
import java.util.Optional
import java.util.UUID

@Repository
interface LeaveRequestRepository extends JpaRepository<LeaveRequest, UUID> {

    /**
     * Find leave requests by employee
     */
    List<LeaveRequest> findByEmployeeOrderByCreatedAtDesc(Employee employee)

    /**
     * Find leave requests by employee with pagination
     */
    Page<LeaveRequest> findByEmployeeOrderByCreatedAtDesc(Employee employee, Pageable pageable)

    /**
     * Find leave requests by shop (for owners)
     */
    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.employee.shop = :shop ORDER BY lr.createdAt DESC")
    List<LeaveRequest> findByShopOrderByCreatedAtDesc(@Param("shop") Shop shop)

    /**
     * Find leave requests by shop with pagination
     */
    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.employee.shop = :shop ORDER BY lr.createdAt DESC")
    Page<LeaveRequest> findByShopOrderByCreatedAtDesc(@Param("shop") Shop shop, Pageable pageable)

    /**
     * Find leave requests by status
     */
    List<LeaveRequest> findByStatusOrderByCreatedAtDesc(LeaveRequestStatus status)

    /**
     * Find pending leave requests for a shop
     */
    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.employee.shop = :shop AND lr.status = 'PENDING' ORDER BY lr.createdAt ASC")
    List<LeaveRequest> findPendingByShop(@Param("shop") Shop shop)

    /**
     * Find approved leave requests that overlap with a date range
     */
    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.employee = :employee AND lr.status = 'APPROVED' " +
           "AND lr.startDate <= :endDate AND lr.endDate >= :startDate")
    List<LeaveRequest> findApprovedOverlappingLeave(
            @Param("employee") Employee employee,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    )

    /**
     * Find active leave requests for an employee on a specific date
     */
    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.employee = :employee AND lr.status = 'APPROVED' " +
           "AND :date BETWEEN lr.startDate AND lr.endDate")
    List<LeaveRequest> findActiveLeaveForDate(
            @Param("employee") Employee employee,
            @Param("date") LocalDate date
    )

    /**
     * Find all active leave requests for a shop on a specific date
     */
    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.employee.shop = :shop AND lr.status = 'APPROVED' " +
           "AND :date BETWEEN lr.startDate AND lr.endDate")
    List<LeaveRequest> findActiveLeaveForShopAndDate(
            @Param("shop") Shop shop,
            @Param("date") LocalDate date
    )

    /**
     * Count pending leave requests for a shop
     */
    @Query("SELECT COUNT(lr) FROM LeaveRequest lr WHERE lr.employee.shop = :shop AND lr.status = 'PENDING'")
    long countPendingByShop(@Param("shop") Shop shop)

    /**
     * Find leave requests by employee and status
     */
    List<LeaveRequest> findByEmployeeAndStatusOrderByCreatedAtDesc(Employee employee, LeaveRequestStatus status)

    /**
     * Find future approved leave requests for an employee
     */
    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.employee = :employee AND lr.status = 'APPROVED' " +
           "AND lr.startDate > :currentDate ORDER BY lr.startDate ASC")
    List<LeaveRequest> findFutureApprovedLeave(
            @Param("employee") Employee employee,
            @Param("currentDate") LocalDate currentDate
    )

    /**
     * Check if employee has overlapping leave requests
     */
    @Query("SELECT COUNT(lr) > 0 FROM LeaveRequest lr WHERE lr.employee = :employee " +
           "AND lr.status IN ('PENDING', 'APPROVED') AND lr.id != :excludeId " +
           "AND lr.startDate <= :endDate AND lr.endDate >= :startDate")
    boolean hasOverlappingLeave(
            @Param("employee") Employee employee,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("excludeId") UUID excludeId
    )

    /**
     * Find leave requests by date range
     */
    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.employee.shop = :shop " +
           "AND lr.startDate <= :endDate AND lr.endDate >= :startDate " +
           "ORDER BY lr.startDate ASC")
    List<LeaveRequest> findByShopAndDateRange(
            @Param("shop") Shop shop,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    )

    /**
     * Find leave requests by employee and date range
     */
    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.employee = :employee " +
           "AND lr.startDate <= :endDate AND lr.endDate >= :startDate " +
           "ORDER BY lr.startDate ASC")
    List<LeaveRequest> findByEmployeeAndDateRange(
            @Param("employee") Employee employee,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    )

    /**
     * Find leave requests by employee, status, and affectsAnnualLeave
     */
    List<LeaveRequest> findByEmployeeAndStatusAndAffectsAnnualLeave(
            Employee employee,
            LeaveRequestStatus status,
            Boolean affectsAnnualLeave
    )

    /**
     * Find approved leave requests for a shop within a date range (for calendar display)
     */
    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.employee.shop = :shop AND lr.status = 'APPROVED' " +
           "AND lr.startDate <= :endDate AND lr.endDate >= :startDate " +
           "ORDER BY lr.startDate ASC")
    List<LeaveRequest> findApprovedLeaveForShopAndDateRange(
            @Param("shop") Shop shop,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    )
}
