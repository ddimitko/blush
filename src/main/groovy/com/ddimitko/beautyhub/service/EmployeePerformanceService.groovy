package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.dto.EmployeePerformanceDto
import com.ddimitko.beautyhub.dto.EmployeePerformanceSummaryDto
import com.ddimitko.beautyhub.dto.PerformanceMetricsDto
import com.ddimitko.beautyhub.dto.ShopPerformanceOverviewDto
import com.ddimitko.beautyhub.entity.Appointment
import com.ddimitko.beautyhub.entity.Employee
import com.ddimitko.beautyhub.entity.EmployeePerformance
import com.ddimitko.beautyhub.entity.Rating
import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.enums.AppointmentStatus
import com.ddimitko.beautyhub.repository.AppointmentRepository
import com.ddimitko.beautyhub.repository.EmployeePerformanceRepository
import com.ddimitko.beautyhub.repository.EmployeeRepository
import com.ddimitko.beautyhub.repository.RatingRepository
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneOffset
import java.time.temporal.ChronoUnit
import java.time.temporal.TemporalAdjusters

@Service
@Slf4j
@Transactional
class EmployeePerformanceService {

    @Autowired
    private EmployeePerformanceRepository performanceRepository

    @Autowired
    private EmployeeRepository employeeRepository

    @Autowired
    private AppointmentRepository appointmentRepository

    @Autowired
    private RatingRepository ratingRepository

    @Autowired
    private EmployeeService employeeService

    /**
     * Get current performance for an employee
     */
    EmployeePerformanceDto getCurrentPerformance(UUID employeeId) {
        try {
            log.debug("Getting current performance for employee: ${employeeId}")

            Employee employee = employeeRepository.findById(employeeId)
                    .orElseThrow { new RuntimeException("Employee not found with ID: ${employeeId}") }

            log.debug("Found employee: ${employee.fullName}")

            LocalDate today = LocalDate.now()
            Optional<EmployeePerformance> performance = performanceRepository
                    .findCurrentPerformance(employee, today)

            if (performance.isPresent()) {
                log.debug("Found existing performance record for employee: ${employeeId}")
                return convertToDto(performance.get())
            } else {
                log.debug("No existing performance record found, generating current month performance for employee: ${employeeId}")
                // Generate current month performance if not exists
                return generateCurrentMonthPerformance(employee)
            }
        } catch (Exception e) {
            log.error("Error getting current performance for employee ${employeeId}: ${e.message}", e)
            throw new RuntimeException("Failed to get current performance: ${e.message}", e)
        }
    }

    /**
     * Get performance history for an employee
     */
    Page<EmployeePerformanceDto> getPerformanceHistory(UUID employeeId, Pageable pageable) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow { new RuntimeException("Employee not found") }

        Page<EmployeePerformance> performances = performanceRepository
                .findByEmployeeOrderByPeriodStartDesc(employee, pageable)

        List<EmployeePerformanceDto> dtos = performances.content.collect { convertToDto(it) }
        return new PageImpl<>(dtos, pageable, performances.totalElements)
    }

    /**
     * Get performance summary with trends
     */
    EmployeePerformanceSummaryDto getPerformanceSummary(UUID employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow { new RuntimeException("Employee not found") }

        // Get current and previous period performance
        LocalDate today = LocalDate.now()
        LocalDate currentMonthStart = today.with(TemporalAdjusters.firstDayOfMonth())
        LocalDate currentMonthEnd = today.with(TemporalAdjusters.lastDayOfMonth())
        LocalDate previousMonthStart = currentMonthStart.minusMonths(1)
        LocalDate previousMonthEnd = currentMonthStart.minusDays(1)

        EmployeePerformance currentPerformance = getOrCreatePerformance(employee, currentMonthStart, currentMonthEnd)
        Optional<EmployeePerformance> previousPerformanceOpt = performanceRepository
                .findByEmployeeAndPeriod(employee, previousMonthStart, previousMonthEnd)

        EmployeePerformanceSummaryDto summary = new EmployeePerformanceSummaryDto()
        summary.employeeId = employeeId
        summary.employeeName = employee.fullName
        summary.currentPeriod = convertToDto(currentPerformance)

        if (previousPerformanceOpt.isPresent()) {
            EmployeePerformance previousPerformance = previousPerformanceOpt.get()
            summary.previousPeriod = convertToDto(previousPerformance)

            // Calculate trends
            summary.appointmentsTrend = calculateTrend(
                    currentPerformance.totalAppointments, 
                    previousPerformance.totalAppointments
            )
            summary.revenueTrend = calculateTrend(
                    currentPerformance.totalRevenue, 
                    previousPerformance.totalRevenue
            )
            summary.ratingTrend = calculateTrend(
                    currentPerformance.averageRating, 
                    previousPerformance.averageRating
            )
            summary.completionRateTrend = calculateTrend(
                    currentPerformance.completionRate, 
                    previousPerformance.completionRate
            )
        }

        return summary
    }

    /**
     * Get shop performance overview
     */
    ShopPerformanceOverviewDto getShopPerformanceOverview(UUID shopId, UUID ownerId) {
        Shop shop = employeeService.getShopWithOwnershipCheck(shopId, ownerId)
        LocalDate today = LocalDate.now()

        List<EmployeePerformance> currentPerformances = performanceRepository
                .findByShopAndPeriod(shop, today, today)

        ShopPerformanceOverviewDto overview = new ShopPerformanceOverviewDto()
        overview.shopId = shopId
        overview.shopName = shop.name
        overview.periodStart = today.with(TemporalAdjusters.firstDayOfMonth())
        overview.periodEnd = today.with(TemporalAdjusters.lastDayOfMonth())

        if (!currentPerformances.isEmpty()) {
            overview.totalEmployees = currentPerformances.size()
            overview.activeEmployees = currentPerformances.count { it.totalAppointments > 0 }
            overview.totalRevenue = currentPerformances.sum { it.totalRevenue } ?: BigDecimal.ZERO
            overview.totalAppointments = currentPerformances.sum { it.totalAppointments } ?: 0
            overview.averageRating = calculateAverageRating(currentPerformances)
            overview.averageCompletionRate = calculateAverageCompletionRate(currentPerformances)

            // Get top performers
            List<EmployeePerformance> topPerformers = performanceRepository
                    .findTopPerformersByShop(shop, today, PageRequest.of(0, 5))
            overview.topPerformers = topPerformers.collect { convertToDto(it) }
        }

        return overview
    }

    /**
     * Generate performance metrics for a specific period
     */
    EmployeePerformanceDto generatePerformanceForPeriod(UUID employeeId, LocalDate startDate, LocalDate endDate) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow { new RuntimeException("Employee not found") }

        EmployeePerformance performance = getOrCreatePerformance(employee, startDate, endDate)
        return convertToDto(performance)
    }

    /**
     * Update performance metrics (called by scheduled job)
     */
    @Transactional
    void updatePerformanceMetrics() {
        log.info("Starting performance metrics update")

        LocalDate today = LocalDate.now()
        LocalDate monthStart = today.with(TemporalAdjusters.firstDayOfMonth())
        LocalDate monthEnd = today.with(TemporalAdjusters.lastDayOfMonth())

        List<Employee> activeEmployees = employeeRepository.findAllActiveEmployees()

        activeEmployees.each { employee ->
            try {
                updateEmployeePerformance(employee, monthStart, monthEnd)
            } catch (Exception e) {
                log.error("Failed to update performance for employee ${employee.id}: ${e.message}", e)
            }
        }

        log.info("Performance metrics update completed for ${activeEmployees.size()} employees")
    }

    /**
     * Get or create performance record for employee and period
     */
    private EmployeePerformance getOrCreatePerformance(Employee employee, LocalDate startDate, LocalDate endDate) {
        Optional<EmployeePerformance> existing = performanceRepository
                .findByEmployeeAndPeriod(employee, startDate, endDate)

        if (existing.isPresent()) {
            updateEmployeePerformance(employee, startDate, endDate)
            return performanceRepository.findByEmployeeAndPeriod(employee, startDate, endDate).get()
        } else {
            return createEmployeePerformance(employee, startDate, endDate)
        }
    }

    /**
     * Create new performance record
     */
    private EmployeePerformance createEmployeePerformance(Employee employee, LocalDate startDate, LocalDate endDate) {
        try {
            log.debug("Creating performance record for employee ${employee.id} from ${startDate} to ${endDate}")

            EmployeePerformance performance = new EmployeePerformance()
            performance.employee = employee
            performance.periodStart = startDate
            performance.periodEnd = endDate

            log.debug("Built performance object, calculating metrics...")
            calculatePerformanceMetrics(performance)

            log.debug("Saving performance record...")
            EmployeePerformance saved = performanceRepository.save(performance)
            log.debug("Performance record saved with ID: ${saved.id}")

            return saved
        } catch (Exception e) {
            log.error("Error creating performance record for employee ${employee.id}: ${e.message}", e)
            throw new RuntimeException("Failed to create performance record: ${e.message}", e)
        }
    }

    /**
     * Update existing performance record
     */
    private void updateEmployeePerformance(Employee employee, LocalDate startDate, LocalDate endDate) {
        Optional<EmployeePerformance> performanceOpt = performanceRepository
                .findByEmployeeAndPeriod(employee, startDate, endDate)

        if (performanceOpt.isPresent()) {
            EmployeePerformance performance = performanceOpt.get()
            calculatePerformanceMetrics(performance)
            performanceRepository.save(performance)
        }
    }

    /**
     * Calculate all performance metrics
     */
    private void calculatePerformanceMetrics(EmployeePerformance performance) {
        try {
            LocalDateTime periodStart = performance.periodStart.atStartOfDay()
            LocalDateTime periodEnd = performance.periodEnd.atTime(23, 59, 59)

            // Get appointments for the period
            List<Appointment> appointments = appointmentRepository
                    .findByEmployeeAndAppointmentDateTimeBetween(
                            performance.employee, periodStart, periodEnd
                    )

            // Calculate appointment metrics
            performance.totalAppointments = appointments.size()
            performance.completedAppointments = appointments.count { it.status.name() == 'COMPLETED' }
            performance.cancelledAppointments = appointments.count { it.status.name() == 'CANCELLED' }
            performance.noShowAppointments = appointments.count { it.status.name() == 'NO_SHOW' }

            // Calculate completion rates
            if (performance.totalAppointments > 0) {
                performance.completionRate = new BigDecimal(performance.completedAppointments)
                        .divide(new BigDecimal(performance.totalAppointments), 4, BigDecimal.ROUND_HALF_UP)
                        .multiply(new BigDecimal(100))
                performance.cancellationRate = new BigDecimal(performance.cancelledAppointments)
                        .divide(new BigDecimal(performance.totalAppointments), 4, BigDecimal.ROUND_HALF_UP)
                        .multiply(new BigDecimal(100))
                performance.noShowRate = new BigDecimal(performance.noShowAppointments)
                        .divide(new BigDecimal(performance.totalAppointments), 4, BigDecimal.ROUND_HALF_UP)
                        .multiply(new BigDecimal(100))
            } else {
                performance.completionRate = BigDecimal.ZERO
                performance.cancellationRate = BigDecimal.ZERO
                performance.noShowRate = BigDecimal.ZERO
            }

            // Calculate revenue metrics
            List<Appointment> completedAppointments = appointments.findAll { it.status.name() == 'COMPLETED' }
            log.debug("Found ${completedAppointments.size()} completed appointments for revenue calculation")

            // Debug: Log appointment amounts
            completedAppointments.each { appointment ->
                log.debug("Appointment ${appointment.id}: totalAmount=${appointment.totalAmount}, status=${appointment.status}")
            }

            performance.totalRevenue = completedAppointments.sum { it.totalAmount } ?: BigDecimal.ZERO
            log.debug("Calculated total revenue: ${performance.totalRevenue}")

            performance.averageServiceValue = completedAppointments.isEmpty() ?
                    BigDecimal.ZERO :
                    performance.totalRevenue.divide(new BigDecimal(completedAppointments.size()), 2, BigDecimal.ROUND_HALF_UP)

            // Calculate ratings (placeholder - implement when rating system is available)
            performance.averageRating = BigDecimal.valueOf(4.5) // Placeholder
            performance.totalReviews = completedAppointments.size()

            // Calculate other metrics (placeholders)
            performance.totalWorkingHours = BigDecimal.valueOf(160) // Placeholder
            performance.utilizationRate = BigDecimal.valueOf(75) // Placeholder
            performance.onTimePercentage = BigDecimal.valueOf(90) // Placeholder
            performance.repeatCustomerRate = BigDecimal.valueOf(60) // Placeholder

            // Calculate attendance (placeholder)
            performance.daysWorked = 20 // Placeholder
            performance.daysOff = 2 // Placeholder
            performance.sickDaysTaken = 0 // Placeholder

            // Calculate attendance rate and absence rate
            int totalWorkingDays = performance.daysWorked + performance.daysOff
            if (totalWorkingDays > 0) {
                performance.attendanceRate = new BigDecimal(performance.daysWorked)
                        .divide(new BigDecimal(totalWorkingDays), 4, BigDecimal.ROUND_HALF_UP)
                        .multiply(new BigDecimal(100))
                // Add absence rate calculation
                performance.absenceRate = new BigDecimal(performance.daysOff)
                        .divide(new BigDecimal(totalWorkingDays), 4, BigDecimal.ROUND_HALF_UP)
                        .multiply(new BigDecimal(100))
            } else {
                performance.attendanceRate = BigDecimal.ZERO
                performance.absenceRate = BigDecimal.ZERO
            }

            // Add placeholder values for absence analytics
            performance.totalAbsenceDays = performance.daysOff
            performance.remainingLeaveDays = 25 - performance.daysOff

            log.debug("Calculated performance metrics for employee ${performance.employee.id}: " +
                     "total=${performance.totalAppointments}, completed=${performance.completedAppointments}, " +
                     "revenue=${performance.totalRevenue}")
        } catch (Exception e) {
            log.error("Error calculating performance metrics for employee ${performance.employee.id}: ${e.message}", e)
            // Set default values to prevent null pointer exceptions
            performance.totalAppointments = 0
            performance.completedAppointments = 0
            performance.cancelledAppointments = 0
            performance.noShowAppointments = 0
            performance.totalRevenue = BigDecimal.ZERO
            performance.averageServiceValue = BigDecimal.ZERO
            performance.averageRating = BigDecimal.ZERO
            performance.totalReviews = 0
            performance.totalWorkingHours = BigDecimal.ZERO
            performance.utilizationRate = BigDecimal.ZERO
            performance.onTimePercentage = BigDecimal.ZERO
            performance.repeatCustomerRate = BigDecimal.ZERO
            performance.daysWorked = 0
            performance.daysOff = 0
            performance.sickDaysTaken = 0
        }
    }

    /**
     * Generate current month performance
     */
    private EmployeePerformanceDto generateCurrentMonthPerformance(Employee employee) {
        try {
            log.debug("Generating current month performance for employee: ${employee.id}")

            LocalDate today = LocalDate.now()
            LocalDate monthStart = today.with(TemporalAdjusters.firstDayOfMonth())
            LocalDate monthEnd = today.with(TemporalAdjusters.lastDayOfMonth())

            log.debug("Performance period: ${monthStart} to ${monthEnd}")

            EmployeePerformance performance = createEmployeePerformance(employee, monthStart, monthEnd)
            log.debug("Created performance record with ID: ${performance.id}")

            return convertToDto(performance)
        } catch (Exception e) {
            log.error("Error generating current month performance for employee ${employee.id}: ${e.message}", e)
            throw new RuntimeException("Failed to generate current month performance: ${e.message}", e)
        }
    }

    /**
     * Calculate trend percentage
     */
    private BigDecimal calculateTrend(Number current, Number previous) {
        if (previous == null || previous == 0) return BigDecimal.ZERO
        
        BigDecimal currentVal = new BigDecimal(current.toString())
        BigDecimal previousVal = new BigDecimal(previous.toString())
        
        return currentVal.subtract(previousVal)
                .divide(previousVal, 4, BigDecimal.ROUND_HALF_UP)
                .multiply(new BigDecimal(100))
    }

    /**
     * Calculate average rating for multiple performances
     */
    private BigDecimal calculateAverageRating(List<EmployeePerformance> performances) {
        if (performances.isEmpty()) return BigDecimal.ZERO
        
        BigDecimal sum = performances.sum { it.averageRating } ?: BigDecimal.ZERO
        return sum.divide(new BigDecimal(performances.size()), 2, BigDecimal.ROUND_HALF_UP)
    }

    /**
     * Calculate average completion rate
     */
    private BigDecimal calculateAverageCompletionRate(List<EmployeePerformance> performances) {
        if (performances.isEmpty()) return BigDecimal.ZERO
        
        BigDecimal sum = performances.sum { it.completionRate } ?: BigDecimal.ZERO
        return sum.divide(new BigDecimal(performances.size()), 2, BigDecimal.ROUND_HALF_UP)
    }

    /**
     * Convert entity to DTO
     */
    private EmployeePerformanceDto convertToDto(EmployeePerformance performance) {
        return new EmployeePerformanceDto(
                id: performance.id,
                employeeId: performance.employee.id,
                employeeName: performance.employee.fullName,
                periodStart: performance.periodStart,
                periodEnd: performance.periodEnd,
                periodDescription: performance.periodDescription,
                totalAppointments: performance.totalAppointments,
                completedAppointments: performance.completedAppointments,
                cancelledAppointments: performance.cancelledAppointments,
                noShowAppointments: performance.noShowAppointments,
                completionRate: performance.completionRate,
                cancellationRate: performance.cancellationRate,
                noShowRate: performance.noShowRate,
                totalRevenue: performance.totalRevenue,
                averageServiceValue: performance.averageServiceValue,
                totalWorkingHours: performance.totalWorkingHours,
                utilizationRate: performance.utilizationRate,
                averageRating: performance.averageRating,
                totalReviews: performance.totalReviews,
                onTimePercentage: performance.onTimePercentage,
                repeatCustomerRate: performance.repeatCustomerRate,
                daysWorked: performance.daysWorked,
                daysOff: performance.daysOff,
                sickDaysTaken: performance.sickDaysTaken,
                attendanceRate: performance.attendanceRate,
                absenceRate: performance.absenceRate,
                totalAbsenceDays: performance.totalAbsenceDays,
                remainingLeaveDays: performance.remainingLeaveDays,
                createdAt: performance.createdAt,
                updatedAt: performance.updatedAt,
                isCurrentPeriod: performance.isCurrentPeriod()
        )
    }

    /**
     * Get performance metrics for a specific period (month, quarter, year)
     */
    EmployeePerformanceDto getPerformanceForPeriod(UUID employeeId, String period) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow { new RuntimeException("Employee not found") }

        LocalDate today = LocalDate.now(ZoneOffset.UTC)
        LocalDate startDate
        LocalDate endDate

        switch (period?.toLowerCase()) {
            case 'month':
                startDate = today.withDayOfMonth(1)
                endDate = today.withDayOfMonth(today.lengthOfMonth())
                break
            case 'quarter':
                int quarter = (today.monthValue - 1) / 3 + 1
                startDate = LocalDate.of(today.year, (quarter - 1) * 3 + 1, 1)
                endDate = startDate.plusMonths(3).minusDays(1)
                break
            case 'year':
                startDate = LocalDate.of(today.year, 1, 1)
                endDate = LocalDate.of(today.year, 12, 31)
                break
            case 'last-month':
                LocalDate lastMonth = today.minusMonths(1)
                startDate = lastMonth.withDayOfMonth(1)
                endDate = lastMonth.withDayOfMonth(lastMonth.lengthOfMonth())
                break
            case 'last-quarter':
                int lastQuarter = (today.monthValue - 1) / 3
                if (lastQuarter == 0) {
                    lastQuarter = 4
                    startDate = LocalDate.of(today.year - 1, 10, 1)
                    endDate = LocalDate.of(today.year - 1, 12, 31)
                } else {
                    startDate = LocalDate.of(today.year, (lastQuarter - 1) * 3 + 1, 1)
                    endDate = startDate.plusMonths(3).minusDays(1)
                }
                break
            case 'last-year':
                startDate = LocalDate.of(today.year - 1, 1, 1)
                endDate = LocalDate.of(today.year - 1, 12, 31)
                break
            default:
                // Default to current month
                startDate = today.withDayOfMonth(1)
                endDate = today.withDayOfMonth(today.lengthOfMonth())
        }

        return getPerformanceForDateRange(employeeId, startDate, endDate)
    }

    /**
     * Get performance metrics for a custom date range
     */
    EmployeePerformanceDto getPerformanceForDateRange(UUID employeeId, LocalDate startDate, LocalDate endDate) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow { new RuntimeException("Employee not found") }

        log.debug("Calculating performance for employee ${employeeId} from ${startDate} to ${endDate}")

        // Get appointments in the date range
        LocalDateTime startDateTime = startDate.atStartOfDay(ZoneOffset.UTC).toLocalDateTime()
        LocalDateTime endDateTime = endDate.atTime(23, 59, 59)

        List<Appointment> appointments = appointmentRepository.findByEmployeeAndAppointmentDateTimeBetween(
                employee, startDateTime, endDateTime)

        log.debug("Found ${appointments.size()} appointments for employee ${employeeId} in date range")

        // Calculate metrics
        int totalAppointments = appointments.size()
        int completedAppointments = appointments.count { it.status == AppointmentStatus.COMPLETED }
        int cancelledAppointments = appointments.count { it.status == AppointmentStatus.CANCELLED }
        int noShowAppointments = appointments.count { it.status == AppointmentStatus.NO_SHOW }

        // Calculate rates
        BigDecimal completionRate = totalAppointments > 0 ?
                new BigDecimal(completedAppointments).divide(new BigDecimal(totalAppointments), 4, RoundingMode.HALF_UP).multiply(new BigDecimal(100)) :
                BigDecimal.ZERO

        BigDecimal cancellationRate = totalAppointments > 0 ?
                new BigDecimal(cancelledAppointments).divide(new BigDecimal(totalAppointments), 4, RoundingMode.HALF_UP).multiply(new BigDecimal(100)) :
                BigDecimal.ZERO

        BigDecimal noShowRate = totalAppointments > 0 ?
                new BigDecimal(noShowAppointments).divide(new BigDecimal(totalAppointments), 4, RoundingMode.HALF_UP).multiply(new BigDecimal(100)) :
                BigDecimal.ZERO

        // Calculate revenue
        List<Appointment> completedWithPayment = appointments.findAll {
            it.status == AppointmentStatus.COMPLETED && it.hasSuccessfulCardPayment()
        }
        BigDecimal totalRevenue = completedWithPayment.sum { it.totalAmount } ?: BigDecimal.ZERO

        BigDecimal averageServiceValue = completedAppointments > 0 ?
                totalRevenue.divide(new BigDecimal(completedAppointments), 2, RoundingMode.HALF_UP) :
                BigDecimal.ZERO

        // Calculate ratings
        List<Rating> ratings = ratingRepository.findByUser(employee.user)
                .findAll { rating ->
                    rating.createdAt.toLocalDate().isAfter(startDate.minusDays(1)) &&
                    rating.createdAt.toLocalDate().isBefore(endDate.plusDays(1))
                }

        BigDecimal averageRating = ratings.isEmpty() ? BigDecimal.ZERO :
                ratings.sum { it.stars }.divide(new BigDecimal(ratings.size()), 2, RoundingMode.HALF_UP)

        // Calculate attendance (simplified - would need leave request integration for accuracy)
        long totalWorkingDays = ChronoUnit.DAYS.between(startDate, endDate) + 1
        long weekends = 0
        LocalDate current = startDate
        while (!current.isAfter(endDate)) {
            if (current.dayOfWeek.value >= 6) { // Saturday = 6, Sunday = 7
                weekends++
            }
            current = current.plusDays(1)
        }
        long workingDays = totalWorkingDays - weekends

        BigDecimal attendanceRate = workingDays > 0 ?
                new BigDecimal(workingDays - 0).divide(new BigDecimal(workingDays), 4, RoundingMode.HALF_UP).multiply(new BigDecimal(100)) :
                BigDecimal.ZERO // Simplified - assumes no absences

        // Create DTO
        return new EmployeePerformanceDto(
                id: null, // This is a calculated performance, not stored
                employeeId: employee.id,
                employeeName: employee.fullName,
                periodStart: startDate,
                periodEnd: endDate,
                periodDescription: "Custom period: ${startDate} to ${endDate}",
                totalAppointments: totalAppointments,
                completedAppointments: completedAppointments,
                cancelledAppointments: cancelledAppointments,
                noShowAppointments: noShowAppointments,
                completionRate: completionRate,
                cancellationRate: cancellationRate,
                noShowRate: noShowRate,
                totalRevenue: totalRevenue,
                averageServiceValue: averageServiceValue,
                totalWorkingHours: BigDecimal.ZERO, // Would need schedule integration
                utilizationRate: BigDecimal.ZERO, // Would need schedule integration
                averageRating: averageRating,
                totalReviews: ratings.size(),
                onTimePercentage: BigDecimal.ZERO, // Would need appointment timing data
                repeatCustomerRate: BigDecimal.ZERO, // Would need customer analysis
                daysWorked: workingDays as Integer,
                daysOff: 0, // Would need leave request integration
                sickDaysTaken: 0, // Would need leave request integration
                attendanceRate: attendanceRate,
                absenceRate: BigDecimal.ZERO, // Would need leave request integration
                totalAbsenceDays: 0, // Would need leave request integration
                remainingLeaveDays: 25, // Default value
                createdAt: LocalDateTime.now(ZoneOffset.UTC),
                updatedAt: LocalDateTime.now(ZoneOffset.UTC),
                isCurrentPeriod: false
        )
    }
}
