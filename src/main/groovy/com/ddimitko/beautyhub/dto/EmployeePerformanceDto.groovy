package com.ddimitko.beautyhub.dto

import com.fasterxml.jackson.annotation.JsonFormat
import groovy.transform.CompileStatic

import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime

@CompileStatic
class EmployeePerformanceDto {
    UUID id
    UUID employeeId
    String employeeName
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    LocalDate periodStart
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    LocalDate periodEnd
    
    String periodDescription
    
    // Appointment metrics
    Integer totalAppointments
    Integer completedAppointments
    Integer cancelledAppointments
    Integer noShowAppointments
    BigDecimal completionRate
    BigDecimal cancellationRate
    BigDecimal noShowRate
    
    // Revenue metrics
    BigDecimal totalRevenue
    BigDecimal averageServiceValue
    
    // Time metrics
    BigDecimal totalWorkingHours
    BigDecimal utilizationRate
    
    // Customer satisfaction
    BigDecimal averageRating
    Integer totalReviews
    
    // Efficiency metrics
    BigDecimal onTimePercentage
    BigDecimal repeatCustomerRate
    
    // Attendance metrics
    Integer daysWorked
    Integer daysOff
    Integer sickDaysTaken
    BigDecimal attendanceRate
    BigDecimal absenceRate
    Integer totalAbsenceDays
    Integer remainingLeaveDays

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    LocalDateTime createdAt
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    LocalDateTime updatedAt
    
    Boolean isCurrentPeriod
}

@CompileStatic
class EmployeePerformanceSummaryDto {
    UUID employeeId
    String employeeName
    
    // Current period metrics
    EmployeePerformanceDto currentPeriod
    
    // Comparison with previous period
    EmployeePerformanceDto previousPeriod
    
    // Trends (percentage change from previous period)
    BigDecimal appointmentsTrend
    BigDecimal revenueTrend
    BigDecimal ratingTrend
    BigDecimal completionRateTrend
    
    // Rankings within shop
    Integer appointmentsRank
    Integer revenueRank
    Integer ratingRank
    
    // Goals and targets
    BigDecimal monthlyAppointmentTarget
    BigDecimal monthlyRevenueTarget
    BigDecimal targetCompletionRate
    
    // Achievement percentages
    BigDecimal appointmentTargetAchievement
    BigDecimal revenueTargetAchievement
    BigDecimal completionRateAchievement
}

@CompileStatic
class PerformanceMetricsDto {
    // Key performance indicators
    BigDecimal totalRevenue
    Integer totalAppointments
    BigDecimal averageRating
    BigDecimal completionRate
    
    // Trends (compared to previous period)
    BigDecimal revenueTrend
    BigDecimal appointmentsTrend
    BigDecimal ratingTrend
    BigDecimal completionRateTrend
    
    // Time period
    @JsonFormat(pattern = "yyyy-MM-dd")
    LocalDate periodStart
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    LocalDate periodEnd
}

@CompileStatic
class PerformanceComparisonDto {
    String employeeName
    EmployeePerformanceDto currentPeriod
    EmployeePerformanceDto previousPeriod
    Map<String, BigDecimal> trends // metric name -> percentage change
}

@CompileStatic
class ShopPerformanceOverviewDto {
    UUID shopId
    String shopName
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    LocalDate periodStart
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    LocalDate periodEnd
    
    // Aggregated metrics
    Integer totalEmployees
    Integer activeEmployees
    BigDecimal totalRevenue
    Integer totalAppointments
    BigDecimal averageRating
    BigDecimal averageCompletionRate
    
    // Top performers
    List<EmployeePerformanceDto> topPerformers
    
    // Performance trends
    BigDecimal revenueTrend
    BigDecimal appointmentsTrend
    BigDecimal ratingTrend
}
