package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.dto.AbsenceAnalyticsDto
import com.ddimitko.beautyhub.dto.EmployeeAbsenceDto
import com.ddimitko.beautyhub.entity.Employee
import com.ddimitko.beautyhub.entity.LeaveRequest
import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.enums.DayOfWeek
import com.ddimitko.beautyhub.enums.LeaveRequestStatus
import com.ddimitko.beautyhub.repository.EmployeeRepository
import com.ddimitko.beautyhub.repository.LeaveRequestRepository
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

import java.math.BigDecimal
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.temporal.ChronoUnit

@Service
@Slf4j
@Transactional(readOnly = true)
class AbsenceAnalyticsService {

    @Autowired
    private LeaveRequestRepository leaveRequestRepository

    @Autowired
    private EmployeeRepository employeeRepository

    @Autowired
    private EmployeeService employeeService

    /**
     * Calculate absence rate for a shop in a given period
     */
    AbsenceAnalyticsDto calculateShopAbsenceRate(UUID shopId, UUID ownerId, LocalDate startDate, LocalDate endDate) {
        Shop shop = employeeService.getShopWithOwnershipCheck(shopId, ownerId)
        
        List<Employee> activeEmployees = employeeRepository.findActiveEmployeesByShop(shop)
        
        if (activeEmployees.isEmpty()) {
            return new AbsenceAnalyticsDto(
                shopId: shopId,
                shopName: shop.name,
                periodStart: startDate,
                periodEnd: endDate,
                totalEmployees: 0,
                overallAbsenceRate: BigDecimal.ZERO,
                totalAbsentDays: 0,
                totalAvailableWorkdays: 0,
                employeeAbsenceRates: []
            )
        }

        List<EmployeeAbsenceDto> employeeAbsenceRates = []
        Integer totalAbsentDays = 0
        Integer totalAvailableWorkdays = 0

        activeEmployees.each { employee ->
            EmployeeAbsenceDto employeeAbsence = calculateEmployeeAbsenceRate(employee, startDate, endDate)
            employeeAbsenceRates.add(employeeAbsence)
            
            totalAbsentDays += employeeAbsence.absentDays
            totalAvailableWorkdays += employeeAbsence.availableWorkdays
        }

        BigDecimal overallAbsenceRate = totalAvailableWorkdays > 0 ? 
            new BigDecimal(totalAbsentDays)
                .divide(new BigDecimal(totalAvailableWorkdays), 4, BigDecimal.ROUND_HALF_UP)
                .multiply(new BigDecimal(100)) : 
            BigDecimal.ZERO

        return new AbsenceAnalyticsDto(
            shopId: shopId,
            shopName: shop.name,
            periodStart: startDate,
            periodEnd: endDate,
            totalEmployees: activeEmployees.size(),
            overallAbsenceRate: overallAbsenceRate,
            totalAbsentDays: totalAbsentDays,
            totalAvailableWorkdays: totalAvailableWorkdays,
            employeeAbsenceRates: employeeAbsenceRates.sort { -it.absenceRate }
        )
    }

    /**
     * Calculate absence rate for a specific employee
     */
    EmployeeAbsenceDto calculateEmployeeAbsenceRate(Employee employee, LocalDate startDate, LocalDate endDate) {
        // Get approved leave requests for the period
        List<LeaveRequest> approvedLeaveRequests = leaveRequestRepository
            .findByEmployeeAndDateRange(employee, startDate, endDate)
            .findAll { it.status == LeaveRequestStatus.APPROVED }

        // Calculate total absent days
        Integer totalAbsentDays = 0
        approvedLeaveRequests.each { leaveRequest ->
            // Calculate overlap with the analysis period
            LocalDate overlapStart = [leaveRequest.startDate, startDate].max()
            LocalDate overlapEnd = [leaveRequest.endDate, endDate].min()
            
            if (!overlapStart.isAfter(overlapEnd)) {
                totalAbsentDays += calculateWorkdaysInPeriod(employee, overlapStart, overlapEnd)
            }
        }

        // Calculate total available workdays in the period
        Integer totalAvailableWorkdays = calculateWorkdaysInPeriod(employee, startDate, endDate)

        // Calculate absence rate
        BigDecimal absenceRate = totalAvailableWorkdays > 0 ? 
            new BigDecimal(totalAbsentDays)
                .divide(new BigDecimal(totalAvailableWorkdays), 4, BigDecimal.ROUND_HALF_UP)
                .multiply(new BigDecimal(100)) : 
            BigDecimal.ZERO

        return new EmployeeAbsenceDto(
            employeeId: employee.id,
            employeeName: employee.fullName,
            absentDays: totalAbsentDays,
            availableWorkdays: totalAvailableWorkdays,
            absenceRate: absenceRate,
            leaveRequestsCount: approvedLeaveRequests.size(),
            remainingLeaveDays: employee.getRemainingLeaveDays()
        )
    }

    /**
     * Calculate workdays for an employee in a given period
     */
    private Integer calculateWorkdaysInPeriod(Employee employee, LocalDate startDate, LocalDate endDate) {
        Set<DayOfWeek> workdays = employee.getWorkdays()
        
        if (workdays.isEmpty()) {
            // Default to Monday-Friday if no schedule defined
            workdays = [
                DayOfWeek.MONDAY,
                DayOfWeek.TUESDAY,
                DayOfWeek.WEDNESDAY,
                DayOfWeek.THURSDAY,
                DayOfWeek.FRIDAY
            ] as Set
        }

        Integer workdaysCount = 0
        LocalDate current = startDate

        while (!current.isAfter(endDate)) {
            // Convert Java DayOfWeek to our custom DayOfWeek enum
            java.time.DayOfWeek javaDayOfWeek = current.dayOfWeek
            DayOfWeek customDayOfWeek = DayOfWeek.valueOf(javaDayOfWeek.name())
            
            if (workdays.contains(customDayOfWeek)) {
                workdaysCount++
            }
            current = current.plusDays(1)
        }

        return workdaysCount
    }

    /**
     * Get absence analytics for current month
     */
    AbsenceAnalyticsDto getCurrentMonthAbsenceRate(UUID shopId, UUID ownerId) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC)
        LocalDate monthStart = today.withDayOfMonth(1)
        LocalDate monthEnd = today.withDayOfMonth(today.lengthOfMonth())
        
        return calculateShopAbsenceRate(shopId, ownerId, monthStart, monthEnd)
    }

    /**
     * Get absence analytics for current quarter
     */
    AbsenceAnalyticsDto getCurrentQuarterAbsenceRate(UUID shopId, UUID ownerId) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC)
        int quarter = (today.monthValue - 1) / 3 + 1
        LocalDate quarterStart = LocalDate.of(today.year, (quarter - 1) * 3 + 1, 1)
        LocalDate quarterEnd = quarterStart.plusMonths(3).minusDays(1)
        
        return calculateShopAbsenceRate(shopId, ownerId, quarterStart, quarterEnd)
    }

    /**
     * Get absence analytics for current year
     */
    AbsenceAnalyticsDto getCurrentYearAbsenceRate(UUID shopId, UUID ownerId) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC)
        LocalDate yearStart = LocalDate.of(today.year, 1, 1)
        LocalDate yearEnd = LocalDate.of(today.year, 12, 31)
        
        return calculateShopAbsenceRate(shopId, ownerId, yearStart, yearEnd)
    }

    /**
     * Get top employees by absence rate
     */
    List<EmployeeAbsenceDto> getTopAbsentEmployees(UUID shopId, UUID ownerId, LocalDate startDate, LocalDate endDate, int limit) {
        AbsenceAnalyticsDto analytics = calculateShopAbsenceRate(shopId, ownerId, startDate, endDate)
        
        return analytics.employeeAbsenceRates
            .findAll { it.absenceRate > BigDecimal.ZERO }
            .sort { -it.absenceRate }
            .take(limit)
    }

    /**
     * Check if employee's absence rate is above threshold
     */
    boolean isAbsenceRateAboveThreshold(UUID employeeId, LocalDate startDate, LocalDate endDate, BigDecimal threshold) {
        Employee employee = employeeRepository.findById(employeeId)
            .orElseThrow { new RuntimeException("Employee not found") }
        
        EmployeeAbsenceDto absenceData = calculateEmployeeAbsenceRate(employee, startDate, endDate)
        return absenceData.absenceRate > threshold
    }
}
