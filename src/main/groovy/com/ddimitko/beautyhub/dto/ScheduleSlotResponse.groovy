package com.ddimitko.beautyhub.dto

class ScheduleSlotResponse {
    
    UUID id
    String dayOfWeek
    String startTime
    String endTime
    String formattedTimeRange
    Integer durationMinutes
    Boolean active
    
    // Employee information
    UUID employeeId
    String employeeName
    
    // Shop information
    UUID shopId
    String shopName
}
