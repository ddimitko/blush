package com.ddimitko.beautyhub.dto

import com.fasterxml.jackson.annotation.JsonFormat
import groovy.transform.CompileStatic

import java.math.BigDecimal
import java.time.LocalDate

@CompileStatic
class AbsenceAnalyticsDto {
    UUID shopId
    String shopName
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    LocalDate periodStart
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    LocalDate periodEnd
    
    Integer totalEmployees
    BigDecimal overallAbsenceRate
    Integer totalAbsentDays
    Integer totalAvailableWorkdays
    
    List<EmployeeAbsenceDto> employeeAbsenceRates
    
    // Additional metrics
    BigDecimal averageAbsenceRate
    Integer employeesWithAbsence
    BigDecimal highestAbsenceRate
    BigDecimal lowestAbsenceRate
    
    // Calculated properties
    String getPeriodDescription() {
        return "${periodStart} to ${periodEnd}"
    }
    
    BigDecimal getAverageAbsenceRate() {
        if (!employeeAbsenceRates || employeeAbsenceRates.isEmpty()) {
            return BigDecimal.ZERO
        }

        BigDecimal sum = employeeAbsenceRates.collect { it.absenceRate }.sum() as BigDecimal ?: BigDecimal.ZERO
        return sum.divide(new BigDecimal(employeeAbsenceRates.size()), 2, BigDecimal.ROUND_HALF_UP)
    }

    Integer getEmployeesWithAbsence() {
        return (employeeAbsenceRates?.count { it.absentDays > 0 } ?: 0) as Integer
    }
    
    BigDecimal getHighestAbsenceRate() {
        return employeeAbsenceRates?.max { it.absenceRate }?.absenceRate ?: BigDecimal.ZERO
    }
    
    BigDecimal getLowestAbsenceRate() {
        return employeeAbsenceRates?.min { it.absenceRate }?.absenceRate ?: BigDecimal.ZERO
    }
}

@CompileStatic
class EmployeeAbsenceDto {
    UUID employeeId
    String employeeName
    Integer absentDays
    Integer availableWorkdays
    BigDecimal absenceRate
    Integer leaveRequestsCount
    Integer remainingLeaveDays
    
    // Additional metrics
    BigDecimal attendanceRate
    String absenceCategory
    
    BigDecimal getAttendanceRate() {
        if (availableWorkdays == 0) return BigDecimal.ZERO
        
        Integer presentDays = availableWorkdays - absentDays
        return new BigDecimal(presentDays)
            .divide(new BigDecimal(availableWorkdays), 4, BigDecimal.ROUND_HALF_UP)
            .multiply(new BigDecimal(100))
    }
    
    String getAbsenceCategory() {
        if (absenceRate == BigDecimal.ZERO) return "No Absence"
        if (absenceRate <= new BigDecimal(5)) return "Low"
        if (absenceRate <= new BigDecimal(10)) return "Moderate"
        if (absenceRate <= new BigDecimal(20)) return "High"
        return "Very High"
    }
}

@CompileStatic
class AbsenceTrendDto {
    @JsonFormat(pattern = "yyyy-MM-dd")
    LocalDate date
    
    BigDecimal absenceRate
    Integer absentEmployees
    Integer totalEmployees
    String period // "daily", "weekly", "monthly"
}

@CompileStatic
class AbsenceSummaryDto {
    UUID shopId
    String shopName
    
    // Current period metrics
    AbsenceAnalyticsDto currentMonth
    AbsenceAnalyticsDto currentQuarter
    AbsenceAnalyticsDto currentYear
    
    // Trends
    List<AbsenceTrendDto> monthlyTrends
    List<AbsenceTrendDto> weeklyTrends
    
    // Top absent employees
    List<EmployeeAbsenceDto> topAbsentEmployees
    
    // Alerts
    List<String> absenceAlerts
    Integer employeesAboveThreshold
    BigDecimal thresholdRate
}
