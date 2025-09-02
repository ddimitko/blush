package com.ddimitko.beautyhub.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern

/**
 * Request DTO for creating/updating employee schedule slots
 * Times are expected to be in UTC format from the frontend
 */
class ScheduleSlotRequest {

    // Optional ID for updating existing slots (null for new slots)
    String id

    @NotBlank(message = "Day of week is required")
    @Pattern(regexp = "MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY",
             message = "Day of week must be a valid day")
    String dayOfWeek

    @NotBlank(message = "Start time is required")
    @Pattern(regexp = "^([01]?[0-9]|2[0-3]):[0-5][0-9]\$",
             message = "Start time must be in HH:mm format")
    String startTime // Expected in UTC format

    @NotBlank(message = "End time is required")
    @Pattern(regexp = "^([01]?[0-9]|2[0-3]):[0-5][0-9]\$",
             message = "End time must be in HH:mm format")
    String endTime // Expected in UTC format
}
