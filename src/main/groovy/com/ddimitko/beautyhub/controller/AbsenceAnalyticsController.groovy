package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.dto.AbsenceAnalyticsDto
import com.ddimitko.beautyhub.dto.EmployeeAbsenceDto
import com.ddimitko.beautyhub.security.CustomUserPrincipal
import com.ddimitko.beautyhub.service.AbsenceAnalyticsService
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

import java.time.LocalDate

@RestController
@RequestMapping("/api/absence-analytics")
@Slf4j
class AbsenceAnalyticsController {

    @Autowired
    private AbsenceAnalyticsService absenceAnalyticsService

    /**
     * Get absence analytics for a shop in a specific period
     */
    @GetMapping("/shop/{shopId}")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getShopAbsenceAnalytics(
            @PathVariable("shopId") UUID shopId,
            @RequestParam(value = "startDate") String startDate,
            @RequestParam(value = "endDate") String endDate,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            LocalDate start = LocalDate.parse(startDate)
            LocalDate end = LocalDate.parse(endDate)

            AbsenceAnalyticsDto analytics = absenceAnalyticsService.calculateShopAbsenceRate(
                    shopId, userPrincipal.getId(), start, end)

            return ResponseEntity.ok([
                analytics: analytics
            ])
        } catch (Exception e) {
            log.error("Failed to get absence analytics: ${e.getMessage()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to get absence analytics",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Get current month absence analytics
     */
    @GetMapping("/shop/{shopId}/current-month")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getCurrentMonthAbsenceAnalytics(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            AbsenceAnalyticsDto analytics = absenceAnalyticsService.getCurrentMonthAbsenceRate(
                    shopId, userPrincipal.getId())

            return ResponseEntity.ok([
                analytics: analytics
            ])
        } catch (Exception e) {
            log.error("Failed to get current month absence analytics: ${e.getMessage()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to get absence analytics",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Get current quarter absence analytics
     */
    @GetMapping("/shop/{shopId}/current-quarter")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getCurrentQuarterAbsenceAnalytics(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            AbsenceAnalyticsDto analytics = absenceAnalyticsService.getCurrentQuarterAbsenceRate(
                    shopId, userPrincipal.getId())

            return ResponseEntity.ok([
                analytics: analytics
            ])
        } catch (Exception e) {
            log.error("Failed to get current quarter absence analytics: ${e.getMessage()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to get absence analytics",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Get current year absence analytics
     */
    @GetMapping("/shop/{shopId}/current-year")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getCurrentYearAbsenceAnalytics(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            AbsenceAnalyticsDto analytics = absenceAnalyticsService.getCurrentYearAbsenceRate(
                    shopId, userPrincipal.getId())

            return ResponseEntity.ok([
                analytics: analytics
            ])
        } catch (Exception e) {
            log.error("Failed to get current year absence analytics: ${e.getMessage()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to get absence analytics",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Get top absent employees
     */
    @GetMapping("/shop/{shopId}/top-absent")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getTopAbsentEmployees(
            @PathVariable("shopId") UUID shopId,
            @RequestParam(value = "startDate") String startDate,
            @RequestParam(value = "endDate") String endDate,
            @RequestParam(value = "limit", defaultValue = "5") int limit,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            LocalDate start = LocalDate.parse(startDate)
            LocalDate end = LocalDate.parse(endDate)

            List<EmployeeAbsenceDto> topAbsentEmployees = absenceAnalyticsService.getTopAbsentEmployees(
                    shopId, userPrincipal.getId(), start, end, limit)

            return ResponseEntity.ok([
                topAbsentEmployees: topAbsentEmployees,
                count: topAbsentEmployees.size()
            ])
        } catch (Exception e) {
            log.error("Failed to get top absent employees: ${e.getMessage()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to get top absent employees",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Check if employee's absence rate is above threshold
     */
    @GetMapping("/employee/{employeeId}/threshold-check")
    @PreAuthorize("hasAnyRole('OWNER', 'EMPLOYEE')")
    ResponseEntity<?> checkAbsenceThreshold(
            @PathVariable("employeeId") UUID employeeId,
            @RequestParam(value = "startDate") String startDate,
            @RequestParam(value = "endDate") String endDate,
            @RequestParam(value = "threshold", defaultValue = "15.0") BigDecimal threshold,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            LocalDate start = LocalDate.parse(startDate)
            LocalDate end = LocalDate.parse(endDate)

            boolean isAboveThreshold = absenceAnalyticsService.isAbsenceRateAboveThreshold(
                    employeeId, start, end, threshold)

            return ResponseEntity.ok([
                employeeId: employeeId,
                isAboveThreshold: isAboveThreshold,
                threshold: threshold,
                period: "${startDate} to ${endDate}"
            ])
        } catch (Exception e) {
            log.error("Failed to check absence threshold: ${e.getMessage()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to check absence threshold",
                message: "An unexpected error occurred"
            ])
        }
    }

    /**
     * Get absence analytics dashboard data
     */
    @GetMapping("/shop/{shopId}/dashboard")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getAbsenceDashboard(
            @PathVariable("shopId") UUID shopId,
            @AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            // Get analytics for different periods
            AbsenceAnalyticsDto currentMonth = absenceAnalyticsService.getCurrentMonthAbsenceRate(
                    shopId, userPrincipal.getId())
            AbsenceAnalyticsDto currentQuarter = absenceAnalyticsService.getCurrentQuarterAbsenceRate(
                    shopId, userPrincipal.getId())
            AbsenceAnalyticsDto currentYear = absenceAnalyticsService.getCurrentYearAbsenceRate(
                    shopId, userPrincipal.getId())

            // Get top absent employees for current quarter
            List<EmployeeAbsenceDto> topAbsentEmployees = absenceAnalyticsService.getTopAbsentEmployees(
                    shopId, userPrincipal.getId(), 
                    currentQuarter.periodStart, currentQuarter.periodEnd, 5)

            return ResponseEntity.ok([
                currentMonth: currentMonth,
                currentQuarter: currentQuarter,
                currentYear: currentYear,
                topAbsentEmployees: topAbsentEmployees,
                summary: [
                    totalEmployees: currentMonth.totalEmployees,
                    monthlyAbsenceRate: currentMonth.overallAbsenceRate,
                    quarterlyAbsenceRate: currentQuarter.overallAbsenceRate,
                    yearlyAbsenceRate: currentYear.overallAbsenceRate,
                    employeesWithAbsence: currentMonth.employeesWithAbsence
                ]
            ])
        } catch (Exception e) {
            log.error("Failed to get absence dashboard: ${e.getMessage()}", e)
            return ResponseEntity.badRequest().body([
                error: "Failed to get absence dashboard",
                message: "An unexpected error occurred"
            ])
        }
    }
}
