package com.ddimitko.beautyhub.repository

import com.ddimitko.beautyhub.entity.Employee
import com.ddimitko.beautyhub.entity.EmployeePerformance
import com.ddimitko.beautyhub.entity.Shop
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
interface EmployeePerformanceRepository extends JpaRepository<EmployeePerformance, UUID> {

    /**
     * Find performance records by employee
     */
    List<EmployeePerformance> findByEmployeeOrderByPeriodStartDesc(Employee employee)

    /**
     * Find performance records by employee with pagination
     */
    Page<EmployeePerformance> findByEmployeeOrderByPeriodStartDesc(Employee employee, Pageable pageable)

    /**
     * Find performance records by shop
     */
    @Query("SELECT ep FROM EmployeePerformance ep WHERE ep.employee.shop = :shop ORDER BY ep.periodStart DESC")
    List<EmployeePerformance> findByShopOrderByPeriodStartDesc(@Param("shop") Shop shop)

    /**
     * Find performance records by shop with pagination
     */
    @Query("SELECT ep FROM EmployeePerformance ep WHERE ep.employee.shop = :shop ORDER BY ep.periodStart DESC")
    Page<EmployeePerformance> findByShopOrderByPeriodStartDesc(@Param("shop") Shop shop, Pageable pageable)

    /**
     * Find current performance record for an employee
     */
    @Query("SELECT ep FROM EmployeePerformance ep WHERE ep.employee = :employee " +
           "AND :currentDate BETWEEN ep.periodStart AND ep.periodEnd")
    Optional<EmployeePerformance> findCurrentPerformance(
            @Param("employee") Employee employee,
            @Param("currentDate") LocalDate currentDate
    )

    /**
     * Find performance record for a specific period
     */
    @Query("SELECT ep FROM EmployeePerformance ep WHERE ep.employee = :employee " +
           "AND ep.periodStart = :periodStart AND ep.periodEnd = :periodEnd")
    Optional<EmployeePerformance> findByEmployeeAndPeriod(
            @Param("employee") Employee employee,
            @Param("periodStart") LocalDate periodStart,
            @Param("periodEnd") LocalDate periodEnd
    )

    /**
     * Find latest performance record for an employee
     */
    Optional<EmployeePerformance> findFirstByEmployeeOrderByPeriodEndDesc(Employee employee)

    /**
     * Find performance records within date range
     */
    @Query("SELECT ep FROM EmployeePerformance ep WHERE ep.employee = :employee " +
           "AND ep.periodStart <= :endDate AND ep.periodEnd >= :startDate " +
           "ORDER BY ep.periodStart DESC")
    List<EmployeePerformance> findByEmployeeAndDateRange(
            @Param("employee") Employee employee,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    )

    /**
     * Find top performers by completion rate for a shop
     */
    @Query("SELECT ep FROM EmployeePerformance ep WHERE ep.employee.shop = :shop " +
           "AND :currentDate BETWEEN ep.periodStart AND ep.periodEnd " +
           "ORDER BY ep.completedAppointments DESC, ep.totalRevenue DESC")
    List<EmployeePerformance> findTopPerformersByShop(
            @Param("shop") Shop shop,
            @Param("currentDate") LocalDate currentDate,
            Pageable pageable
    )

    /**
     * Find performance records for employees in a shop within a period
     */
    @Query("SELECT ep FROM EmployeePerformance ep WHERE ep.employee.shop = :shop " +
           "AND ep.periodStart <= :endDate AND ep.periodEnd >= :startDate " +
           "ORDER BY ep.employee.user.firstName ASC, ep.periodStart DESC")
    List<EmployeePerformance> findByShopAndPeriod(
            @Param("shop") Shop shop,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    )

    /**
     * Calculate average performance metrics for a shop
     */
    @Query("SELECT AVG(ep.averageRating) FROM EmployeePerformance ep WHERE ep.employee.shop = :shop " +
           "AND :currentDate BETWEEN ep.periodStart AND ep.periodEnd")
    Optional<Double> findAverageRatingByShop(
            @Param("shop") Shop shop,
            @Param("currentDate") LocalDate currentDate
    )

    /**
     * Find employees with performance records in current period
     */
    @Query("SELECT DISTINCT ep.employee FROM EmployeePerformance ep WHERE ep.employee.shop = :shop " +
           "AND :currentDate BETWEEN ep.periodStart AND ep.periodEnd")
    List<Employee> findEmployeesWithCurrentPerformance(
            @Param("shop") Shop shop,
            @Param("currentDate") LocalDate currentDate
    )

    /**
     * Check if performance record exists for employee and period
     */
    @Query("SELECT COUNT(ep) > 0 FROM EmployeePerformance ep WHERE ep.employee = :employee " +
           "AND ep.periodStart = :periodStart AND ep.periodEnd = :periodEnd")
    boolean existsByEmployeeAndPeriod(
            @Param("employee") Employee employee,
            @Param("periodStart") LocalDate periodStart,
            @Param("periodEnd") LocalDate periodEnd
    )

    /**
     * Find performance trends for an employee (last N periods)
     */
    @Query("SELECT ep FROM EmployeePerformance ep WHERE ep.employee = :employee " +
           "ORDER BY ep.periodStart DESC")
    List<EmployeePerformance> findPerformanceTrends(
            @Param("employee") Employee employee,
            Pageable pageable
    )
}
