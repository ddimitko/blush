/**
 * Advanced timezone utilities for Lunara Beauty Booking Platform
 * Handles comprehensive timezone conversion between UTC (backend) and local time (frontend)
 */

// ===== TIMEZONE CONSTANTS =====

export const UTC_TIMEZONE = 'UTC';
export const DEFAULT_DATE_FORMAT = 'yyyy-MM-dd';
export const DEFAULT_TIME_FORMAT = 'HH:mm';
export const DEFAULT_DATETIME_FORMAT = 'yyyy-MM-dd\'T\'HH:mm:ss\'Z\'';

// ===== TIMEZONE DETECTION =====

/**
 * Get the user's current timezone
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC'; // Fallback to UTC if detection fails
  }
}

/**
 * Get timezone offset in minutes (positive for behind UTC, negative for ahead)
 */
export function getTimezoneOffsetMinutes(timezone?: string): number {
  try {
    const now = new Date();
    if (timezone) {
      // Get offset for specific timezone
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const targetTime = new Date(utcTime + (getTimezoneOffsetForTimezone(timezone) * 60000));
      return (now.getTime() - targetTime.getTime()) / 60000;
    }
    return now.getTimezoneOffset();
  } catch {
    return 0; // Fallback to no offset
  }
}

/**
 * Get timezone offset for a specific timezone
 */
function getTimezoneOffsetForTimezone(timezone: string): number {
  try {
    const now = new Date();
    const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const target = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    return (utc.getTime() - target.getTime()) / 60000;
  } catch {
    return 0;
  }
}

/**
 * Check if timezone observes daylight saving time
 */
export function observesDST(timezone?: string): boolean {
  try {
    const tz = timezone || getUserTimezone();
    const jan = new Date(2024, 0, 1);
    const jul = new Date(2024, 6, 1);
    
    const janOffset = getTimezoneOffsetForTimezone(tz);
    const julOffset = getTimezoneOffsetForTimezone(tz);
    
    return janOffset !== julOffset;
  } catch {
    return false;
  }
}

// ===== APPOINTMENT TIMEZONE HANDLING =====

/**
 * Convert appointment datetime from UTC to user's local timezone
 */
export function convertAppointmentToLocal(utcDateTime: string): Date {
  if (!utcDateTime) {
    throw new Error('UTC datetime is required');
  }
  
  // Ensure the string is in proper UTC format
  let utcString = utcDateTime.trim();
  if (!utcString.endsWith('Z') && !utcString.includes('+') && !utcString.includes('-')) {
    utcString = `${utcString}Z`;
  }
  
  const date = new Date(utcString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid UTC datetime: ${utcDateTime}`);
  }
  
  return date;
}

/**
 * Convert local appointment datetime to UTC for backend
 */
export function convertAppointmentToUTC(localDate: Date): string {
  if (!(localDate instanceof Date) || isNaN(localDate.getTime())) {
    throw new Error('Valid Date object is required');
  }
  
  return localDate.toISOString();
}

/**
 * Create appointment datetime from local date and time inputs
 * Converts to UTC for backend storage
 */
export function createLocalAppointmentDateTime(dateString: string, timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(num => parseInt(num, 10));

  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error(`Invalid time format: ${timeString}`);
  }

  const localDateTime = new Date(dateString);
  localDateTime.setHours(hours, minutes, 0, 0);

  return convertAppointmentToUTC(localDateTime);
}

// ===== BUSINESS HOURS TIMEZONE HANDLING =====

/**
 * Convert business hours from UTC to local timezone
 */
export function convertBusinessHoursToLocal(utcStartTime: string, utcEndTime: string): {
  startTime: string;
  endTime: string;
  spansMidnight: boolean;
} {
  try {
    // Use today's date for conversion
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const date = today.getDate();

    // Parse UTC time strings
    const [startHour, startMinute] = utcStartTime.split(':').map(Number);
    const [endHour, endMinute] = utcEndTime.split(':').map(Number);

    // Create UTC Date objects
    const startDateUTC = new Date(Date.UTC(year, month, date, startHour, startMinute));
    let endDateUTC = new Date(Date.UTC(year, month, date, endHour, endMinute));

    // Handle cross-midnight in UTC (end time before start time indicates next day)
    if (endHour < startHour || (endHour === startHour && endMinute <= startMinute)) {
      endDateUTC = new Date(Date.UTC(year, month, date + 1, endHour, endMinute));
    }

    // Convert to local timezone
    const localStartTime = startDateUTC.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const localEndTime = endDateUTC.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    // Check if the schedule spans midnight in local time
    const spansMidnight = localEndTime <= localStartTime;

    return {
      startTime: localStartTime,
      endTime: localEndTime,
      spansMidnight
    };
  } catch (error) {
    console.error('Error converting business hours to local:', error);
    return {
      startTime: utcStartTime,
      endTime: utcEndTime,
      spansMidnight: false
    };
  }
}

/**
 * Convert local business hours to UTC for backend
 * Handles cross-midnight scenarios properly
 */
export function convertBusinessHoursToUTC(localStartTime: string, localEndTime: string): {
  startTime: string;
  endTime: string;
} {
  try {
    // Use today's date to get the correct timezone offset
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const date = today.getDate();

    // Parse time strings
    const [startHour, startMinute] = localStartTime.split(':').map(Number);
    const [endHour, endMinute] = localEndTime.split(':').map(Number);

    // Create Date objects in local timezone
    const startDate = new Date(year, month, date, startHour, startMinute);
    let endDate = new Date(year, month, date, endHour, endMinute);

    // Handle cross-midnight scenarios (e.g., 22:00 to 06:00)
    if (endDate <= startDate) {
      // End time is next day
      endDate = new Date(year, month, date + 1, endHour, endMinute);
    }

    // Convert to UTC by getting the ISO string and extracting time
    const utcStartTime = startDate.toISOString().substring(11, 16);
    const utcEndTime = endDate.toISOString().substring(11, 16);

    return {
      startTime: utcStartTime,
      endTime: utcEndTime
    };
  } catch (error) {
    console.error('Error converting business hours to UTC:', error);
    return {
      startTime: localStartTime,
      endTime: localEndTime
    };
  }
}

// ===== SLOT AVAILABILITY TIMEZONE HANDLING =====

/**
 * Convert available slot times from UTC to local timezone
 */
export function convertSlotTimesToLocal(utcSlots: Array<{ startTime: string; endTime: string }>): Array<{ startTime: string; endTime: string; localDate?: string }> {
  return utcSlots.map(slot => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const startDateTime = new Date(`${today}T${slot.startTime}Z`);
      const endDateTime = new Date(`${today}T${slot.endTime}Z`);
      
      const localStartTime = startDateTime.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      
      const localEndTime = endDateTime.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      
      const localDate = startDateTime.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      
      return {
        startTime: localStartTime,
        endTime: localEndTime,
        localDate
      };
    } catch {
      return slot; // Return original if conversion fails
    }
  });
}

// ===== CALENDAR TIMEZONE HANDLING =====

/**
 * Get calendar date range in user's timezone
 */
export function getLocalCalendarRange(utcStartDate: string, utcEndDate: string): {
  startDate: string;
  endDate: string;
} {
  try {
    const start = convertAppointmentToLocal(utcStartDate);
    const end = convertAppointmentToLocal(utcEndDate);
    
    return {
      startDate: start.toLocaleDateString('en-CA'),
      endDate: end.toLocaleDateString('en-CA')
    };
  } catch {
    return {
      startDate: utcStartDate.split('T')[0],
      endDate: utcEndDate.split('T')[0]
    };
  }
}

/**
 * Check if a date is today in user's timezone
 */
export function isToday(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    const today = new Date();
    return date.toLocaleDateString() === today.toLocaleDateString();
  } catch {
    return false;
  }
}

/**
 * Check if a UTC datetime is in the past relative to user's local time
 */
export function isInPast(utcDateTime: string): boolean {
  try {
    const date = convertAppointmentToLocal(utcDateTime);
    return date.getTime() < Date.now();
  } catch {
    return false;
  }
}

// ===== WEBSOCKET MESSAGE TIMEZONE HANDLING =====

/**
 * Convert WebSocket message timestamps to local timezone
 */
export function convertWebSocketTimestamp(message: any): any {
  if (!message || typeof message !== 'object') {
    return message;
  }
  
  const converted = { ...message };
  
  // Convert common timestamp fields
  const timestampFields = ['timestamp', 'createdAt', 'updatedAt', 'lockExpiry', 'appointmentDateTime'];
  
  timestampFields.forEach(field => {
    if (converted[field] && typeof converted[field] === 'string') {
      try {
        const localDate = convertAppointmentToLocal(converted[field]);
        converted[`${field}Local`] = localDate.toISOString();
      } catch {
        // Keep original value if conversion fails
      }
    }
  });
  
  return converted;
}

// ===== VALIDATION UTILITIES =====

/**
 * Validate timezone string
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get timezone display name
 */
export function getTimezoneDisplayName(timezone?: string): string {
  try {
    const tz = timezone || getUserTimezone();
    const now = new Date();
    return now.toLocaleString('en-US', { 
      timeZone: tz,
      timeZoneName: 'long'
    }).split(', ')[1] || tz;
  } catch {
    return timezone || 'Unknown';
  }
}
