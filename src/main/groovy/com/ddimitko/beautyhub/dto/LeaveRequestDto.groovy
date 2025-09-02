package com.ddimitko.beautyhub.dto

import com.ddimitko.beautyhub.enums.LeaveRequestStatus
import com.ddimitko.beautyhub.enums.LeaveType
import com.fasterxml.jackson.annotation.JsonFormat
import groovy.transform.CompileStatic

import jakarta.validation.constraints.NotNull
import java.time.LocalDate
import java.time.LocalDateTime

@CompileStatic
class LeaveRequestDto {
    UUID id
    UUID employeeId
    String employeeName
    String employeeEmail
    LeaveType leaveType
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    LocalDate startDate
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    LocalDate endDate
    
    String reason
    LeaveRequestStatus status
    Long leaveDays
    Integer calculatedLeaveDays
    Boolean affectsAnnualLeave

    UUID reviewedByUserId
    String reviewerName

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    LocalDateTime reviewedAt

    String reviewNotes

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    LocalDateTime createdAt

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    LocalDateTime updatedAt
    
    Boolean canBeCancelled
    Boolean canBeReviewed
    Boolean isActive
    Boolean isFuture
}

@CompileStatic
class LeaveRequestCreateDto {
    @NotNull(message = "Leave type is required")
    LeaveType leaveType
    
    @NotNull(message = "Start date is required")
    @JsonFormat(pattern = "yyyy-MM-dd")
    LocalDate startDate
    
    @NotNull(message = "End date is required")
    @JsonFormat(pattern = "yyyy-MM-dd")
    LocalDate endDate
    
    String reason
}

@CompileStatic
class LeaveRequestUpdateDto {
    LeaveType leaveType
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    LocalDate startDate
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    LocalDate endDate
    
    String reason
}

@CompileStatic
class LeaveRequestReviewDto {
    @NotNull(message = "Status is required")
    LeaveRequestStatus status
    
    String reviewNotes
}

@CompileStatic
class LeaveRequestSummaryDto {
    UUID employeeId
    String employeeName
    Integer pendingRequests
    Integer approvedRequests
    Integer totalLeaveDays
    Integer remainingLeaveDays
    LocalDate nextLeaveStart
    LocalDate nextLeaveEnd
}
