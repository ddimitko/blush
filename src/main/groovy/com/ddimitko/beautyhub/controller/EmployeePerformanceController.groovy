package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.dto.EmployeePerformanceDto
import com.ddimitko.beautyhub.dto.EmployeePerformanceSummaryDto
import com.ddimitko.beautyhub.dto.ShopPerformanceOverviewDto
import com.ddimitko.beautyhub.security.CustomUserPrincipal
import com.ddimitko.beautyhub.service.EmployeePerformanceService
import com.ddimitko.beautyhub.service.EmployeeService
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

import java.time.LocalDate

@RestController
@RequestMapping("/api/performance")
@Slf4j
class EmployeePerformanceController {

    @Autowired
    private EmployeePerformanceService performanceService

    @Autowired
    private EmployeeService employeeService

    /**
     * Get current performance for an employee
     */
    @GetMapping("/employee/{employeeId}/current")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'OWNER')")
    ResponseEntity<?> getCurrentPerformance(
            @PathVariable("employeeId") UUID employeeId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify access - employee can view their own performance, owner can view all employees
            if (!employeeService.canUserAccessEmployee(userPrincipal.getId(), employeeId)) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only view your own performance data"
                ])
            }

            EmployeePerformanceDto performance = performanceService.getCurrentPerformance(employeeId)
            
            return ResponseEntity.ok([
                performance: performance
            ])
        } catch (Exception e) {
            log.error("Failed to get current performance: ${e.getMessage()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to get performance data",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Get performance history for an employee
     */
    @GetMapping("/employee/{employeeId}/history")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'OWNER')")
    ResponseEntity<?> getPerformanceHistory(
            @PathVariable("employeeId") UUID employeeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify access
            if (!employeeService.canUserAccessEmployee(userPrincipal.getId(), employeeId)) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only view your own performance history"
                ])
            }

            Pageable pageable = PageRequest.of(page, size)
            Page<EmployeePerformanceDto> performanceHistory = performanceService.getPerformanceHistory(employeeId, pageable)
            
            return ResponseEntity.ok([
                performanceHistory: performanceHistory.content,
                totalElements: performanceHistory.totalElements,
                totalPages: performanceHistory.totalPages,
                currentPage: page,
                pageSize: size
            ])
        } catch (Exception e) {
            log.error("Failed to get performance history: ${e.getMessage()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to get performance history",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Get performance summary with trends
     */
    @GetMapping("/employee/{employeeId}/summary")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'OWNER')")
    ResponseEntity<?> getPerformanceSummary(
            @PathVariable("employeeId") UUID employeeId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify access
            if (!employeeService.canUserAccessEmployee(userPrincipal.getId(), employeeId)) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only view your own performance summary"
                ])
            }

            EmployeePerformanceSummaryDto summary = performanceService.getPerformanceSummary(employeeId)
            
            return ResponseEntity.ok([
                summary: summary
            ])
        } catch (Exception e) {
            log.error("Failed to get performance summary: ${e.getMessage()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to get performance summary",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Generate performance for a specific period
     */
    @PostMapping("/employee/{employeeId}/generate")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> generatePerformanceForPeriod(
            @PathVariable("employeeId") UUID employeeId,
            @RequestParam(value = "startDate") String startDate,
            @RequestParam(value = "endDate") String endDate,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify that user owns the shop where this employee works
            if (!employeeService.canUserAccessEmployee(userPrincipal.getId(), employeeId)) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only generate performance data for your employees"
                ])
            }

            LocalDate start = LocalDate.parse(startDate)
            LocalDate end = LocalDate.parse(endDate)

            EmployeePerformanceDto performance = performanceService.generatePerformanceForPeriod(employeeId, start, end)
            
            return ResponseEntity.ok([
                message: "Performance data generated successfully",
                performance: performance
            ])
        } catch (Exception e) {
            log.error("Failed to generate performance data: ${e.getMessage()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to generate performance data",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Get shop performance overview (for owners)
     */
    @GetMapping("/shop/{shopId}/overview")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getShopPerformanceOverview(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            ShopPerformanceOverviewDto overview = performanceService.getShopPerformanceOverview(shopId, userPrincipal.getId())
            
            return ResponseEntity.ok([
                overview: overview
            ])
        } catch (Exception e) {
            log.error("Failed to get shop performance overview: ${e.getMessage()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to get shop performance overview",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Get performance metrics for dashboard widgets with optional period filtering
     */
    @GetMapping("/employee/{employeeId}/metrics")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'OWNER')")
    ResponseEntity<?> getPerformanceMetrics(
            @PathVariable("employeeId") UUID employeeId,
            @RequestParam(name = "period", required = false) String period,
            @RequestParam(name = "startDate", required = false) String startDate,
            @RequestParam(name = "endDate", required = false) String endDate,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Verify access
            if (!employeeService.canUserAccessEmployee(userPrincipal.getId(), employeeId)) {
                return ResponseEntity.status(403).body([
                    error: "Access denied",
                    message: "You can only view your own performance metrics"
                ])
            }

            EmployeePerformanceDto currentPerformance

            // Handle period filtering
            if (period || (startDate && endDate)) {
                if (period) {
                    // Use predefined periods
                    currentPerformance = performanceService.getPerformanceForPeriod(employeeId, period)
                } else {
                    // Use custom date range
                    LocalDate start = LocalDate.parse(startDate)
                    LocalDate end = LocalDate.parse(endDate)
                    currentPerformance = performanceService.getPerformanceForDateRange(employeeId, start, end)
                }
            } else {
                // Default to current performance
                currentPerformance = performanceService.getCurrentPerformance(employeeId)
            }

            // Extract key metrics for dashboard
            Map<String, Object> metrics = [
                totalAppointments: currentPerformance.totalAppointments,
                completedAppointments: currentPerformance.completedAppointments,
                completionRate: currentPerformance.completionRate,
                totalRevenue: currentPerformance.totalRevenue,
                averageServiceValue: currentPerformance.averageServiceValue,
                averageRating: currentPerformance.averageRating,
                totalReviews: currentPerformance.totalReviews,
                attendanceRate: currentPerformance.attendanceRate,
                periodStart: currentPerformance.periodStart,
                periodEnd: currentPerformance.periodEnd,
                period: period ?: 'current'
            ]
            
            return ResponseEntity.ok([
                metrics: metrics
            ])
        } catch (Exception e) {
            log.error("Failed to get performance metrics: ${e.getMessage()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to get performance metrics",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Update performance metrics manually (for testing/admin purposes)
     */
    @PostMapping("/update-all")
    @PreAuthorize("hasRole('ADMIN')")
    ResponseEntity<?> updateAllPerformanceMetrics() {
        try {
            performanceService.updatePerformanceMetrics()
            
            return ResponseEntity.ok([
                message: "Performance metrics updated successfully"
            ])
        } catch (Exception e) {
            log.error("Failed to update performance metrics: ${e.getMessage()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to update performance metrics",
                message: "An unexpected error occurred"
            ])
        }
    }
}
