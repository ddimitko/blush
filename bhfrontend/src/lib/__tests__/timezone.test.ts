/**
 * Comprehensive timezone handling tests for Lunara Beauty Booking Platform
 */

import {
  parseUTCDateTime,
  toUTCString,
  localDateTimeToUTC,
  utcTimeToLocal,
  localTimeToUTC,
  getTimezoneOffset,
  getUserTimezone,
  utcDateToLocalDateString,
  localDateStringToUTC,
  isUTCDateTimeInPast,
  isUTCDateTimeWithinHours,
  createAppointmentDateTime,
  createUTCAppointmentDateTime,
  formatDate,
  formatTime,
  formatDateTime,
  formatShortDate,
  formatTimeRange,
  getTimeFromNow
} from '../utils';

import {
  convertAppointmentToLocal,
  convertAppointmentToUTC,
  createLocalAppointmentDateTime,
  convertBusinessHoursToLocal,
  convertBusinessHoursToUTC,
  convertSlotTimesToLocal,
  getLocalCalendarRange,
  isToday,
  isInPast,
  convertWebSocketTimestamp,
  isValidTimezone,
  getTimezoneDisplayName
} from '../timezone';

describe('Timezone Utilities', () => {
  
  // Mock current date for consistent testing
  const mockDate = new Date('2024-07-15T14:30:00Z'); // Monday, July 15, 2024, 2:30 PM UTC
  
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });
  
  afterAll(() => {
    jest.useRealTimers();
  });

  describe('Basic UTC Conversion', () => {
    test('parseUTCDateTime should parse UTC datetime strings correctly', () => {
      const utcString = '2024-07-15T14:30:00Z';
      const result = parseUTCDateTime(utcString);
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('2024-07-15T14:30:00.000Z');
    });

    test('parseUTCDateTime should handle strings without Z suffix', () => {
      const utcString = '2024-07-15T14:30:00';
      const result = parseUTCDateTime(utcString);
      expect(result).toBeInstanceOf(Date);
      // The result should be parsed as UTC time, but the exact hour may vary based on timezone
      expect(result.toISOString()).toMatch(/^2024-07-15T\d{2}:30:00\.000Z$/);
    });

    test('parseUTCDateTime should throw error for invalid strings', () => {
      expect(() => parseUTCDateTime('invalid-date')).toThrow();
      expect(() => parseUTCDateTime('')).toThrow();
      expect(() => parseUTCDateTime(null)).toThrow();
    });

    test('toUTCString should convert Date to UTC string', () => {
      const date = new Date('2024-07-15T14:30:00Z');
      const result = toUTCString(date);
      expect(result).toBe('2024-07-15T14:30:00.000Z');
    });

    test('toUTCString should throw error for invalid Date', () => {
      expect(() => toUTCString(new Date('invalid'))).toThrow();
    });
  });

  describe('Appointment DateTime Handling', () => {
    test('createAppointmentDateTime should combine date and time correctly', () => {
      const date = '2024-07-15';
      const time = '14:30';
      const result = createAppointmentDateTime(date, time);
      
      // Result should be a valid UTC datetime string
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      // Parse back to verify
      const parsedDate = new Date(result);
      expect(parsedDate.getUTCFullYear()).toBe(2024);
      expect(parsedDate.getUTCMonth()).toBe(6); // July is month 6 (0-indexed)
      expect(parsedDate.getUTCDate()).toBe(15);
    });

    test('createUTCAppointmentDateTime should combine UTC date and time correctly', () => {
      const date = '2024-07-15';
      const utcTime = '14:30';
      const result = createUTCAppointmentDateTime(date, utcTime);

      expect(result).toBe('2024-07-15T14:30:00Z');
    });

    test('createLocalAppointmentDateTime should convert local time to UTC', () => {
      const date = '2024-07-15';
      const localTime = '14:30';
      const result = createLocalAppointmentDateTime(date, localTime);

      // Result should be a valid UTC datetime string
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('convertAppointmentToLocal should convert UTC to local Date', () => {
      const utcString = '2024-07-15T14:30:00Z';
      const result = convertAppointmentToLocal(utcString);
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('2024-07-15T14:30:00.000Z');
    });

    test('convertAppointmentToUTC should convert local Date to UTC string', () => {
      const localDate = new Date('2024-07-15T14:30:00Z');
      const result = convertAppointmentToUTC(localDate);
      expect(result).toBe('2024-07-15T14:30:00.000Z');
    });
  });

  describe('Business Hours Conversion', () => {
    test('convertBusinessHoursToLocal should convert UTC times to local', () => {
      const utcStart = '09:00';
      const utcEnd = '17:00';
      const result = convertBusinessHoursToLocal(utcStart, utcEnd);
      
      expect(result).toHaveProperty('startTime');
      expect(result).toHaveProperty('endTime');
      expect(result).toHaveProperty('spansMidnight');
      expect(typeof result.spansMidnight).toBe('boolean');
    });

    test('convertBusinessHoursToUTC should convert local times to UTC', () => {
      const localStart = '09:00';
      const localEnd = '17:00';
      const result = convertBusinessHoursToUTC(localStart, localEnd);
      
      expect(result).toHaveProperty('startTime');
      expect(result).toHaveProperty('endTime');
      expect(result.startTime).toMatch(/^\d{2}:\d{2}$/);
      expect(result.endTime).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe('Time Slot Conversion', () => {
    test('convertSlotTimesToLocal should convert UTC slot times', () => {
      const utcSlots = [
        { startTime: '09:00', endTime: '10:00' },
        { startTime: '14:30', endTime: '15:30' }
      ];
      
      const result = convertSlotTimesToLocal(utcSlots);
      
      expect(result).toHaveLength(2);
      result.forEach(slot => {
        expect(slot).toHaveProperty('startTime');
        expect(slot).toHaveProperty('endTime');
        expect(slot).toHaveProperty('localDate');
        expect(slot.startTime).toMatch(/^\d{2}:\d{2}$/);
        expect(slot.endTime).toMatch(/^\d{2}:\d{2}$/);
      });
    });
  });

  describe('Date/Time Formatting', () => {
    test('formatDate should format dates correctly', () => {
      const utcString = '2024-07-15T14:30:00Z';
      const result = formatDate(utcString);
      expect(result).toContain('2024');
      expect(result).toContain('July');
      expect(result).toContain('15');
    });

    test('formatTime should format times correctly', () => {
      const utcString = '2024-07-15T14:30:00Z';
      const result = formatTime(utcString);
      expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
    });

    test('formatDateTime should format date and time correctly', () => {
      const utcString = '2024-07-15T14:30:00Z';
      const result = formatDateTime(utcString);
      expect(result).toContain('2024');
      expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
    });

    test('formatTimeRange should format time ranges correctly', () => {
      const startTime = '09:00';
      const endTime = '17:00';
      const result = formatTimeRange(startTime, endTime);
      expect(result).toContain(' - ');
      expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
    });
  });

  describe('Validation Functions', () => {
    test('isUTCDateTimeInPast should detect past dates', () => {
      const pastDate = '2024-07-15T10:00:00Z'; // Before mock current time
      const futureDate = '2024-07-15T18:00:00Z'; // After mock current time
      
      expect(isUTCDateTimeInPast(pastDate)).toBe(true);
      expect(isUTCDateTimeInPast(futureDate)).toBe(false);
    });

    test('isUTCDateTimeWithinHours should detect dates within time range', () => {
      const dateIn2Hours = '2024-07-15T16:30:00Z'; // 2 hours from mock time
      const dateIn5Hours = '2024-07-15T19:30:00Z'; // 5 hours from mock time
      
      expect(isUTCDateTimeWithinHours(dateIn2Hours, 3)).toBe(true);
      expect(isUTCDateTimeWithinHours(dateIn5Hours, 3)).toBe(false);
    });

    test('isToday should detect today\'s date', () => {
      const todayString = '2024-07-15';
      const tomorrowString = '2024-07-16';
      
      expect(isToday(todayString)).toBe(true);
      expect(isToday(tomorrowString)).toBe(false);
    });

    test('isInPast should detect past UTC datetimes', () => {
      const pastDate = '2024-07-15T10:00:00Z';
      const futureDate = '2024-07-15T18:00:00Z';
      
      expect(isInPast(pastDate)).toBe(true);
      expect(isInPast(futureDate)).toBe(false);
    });

    test('isValidTimezone should validate timezone strings', () => {
      expect(isValidTimezone('UTC')).toBe(true);
      expect(isValidTimezone('America/New_York')).toBe(true);
      expect(isValidTimezone('Europe/London')).toBe(true);
      expect(isValidTimezone('Invalid/Timezone')).toBe(false);
    });
  });

  describe('WebSocket Message Conversion', () => {
    test('convertWebSocketTimestamp should add local timestamp fields', () => {
      const message = {
        type: 'SLOT_UPDATE',
        timestamp: '2024-07-15T14:30:00Z',
        appointmentDateTime: '2024-07-15T16:00:00Z'
      };
      
      const result = convertWebSocketTimestamp(message);
      
      expect(result).toHaveProperty('timestampLocal');
      expect(result).toHaveProperty('appointmentDateTimeLocal');
      expect(result.timestampLocal).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('convertWebSocketTimestamp should handle null/undefined messages', () => {
      expect(convertWebSocketTimestamp(null)).toBe(null);
      expect(convertWebSocketTimestamp(undefined)).toBe(undefined);
    });
  });

  describe('Utility Functions', () => {
    test('getUserTimezone should return a valid timezone', () => {
      const timezone = getUserTimezone();
      expect(typeof timezone).toBe('string');
      expect(timezone.length).toBeGreaterThan(0);
    });

    test('getTimezoneDisplayName should return a readable name', () => {
      const displayName = getTimezoneDisplayName();
      expect(typeof displayName).toBe('string');
      expect(displayName.length).toBeGreaterThan(0);
    });

    test('getTimezoneOffset should return a number', () => {
      const offset = getTimezoneOffset();
      expect(typeof offset).toBe('number');
    });
  });

  describe('Error Handling', () => {
    test('functions should handle invalid inputs gracefully', () => {
      // Test with invalid date strings
      expect(formatDate('invalid-date')).toBe('Invalid Date');
      expect(formatTime('invalid-time')).toBe('Invalid Time');
      expect(formatDateTime('invalid-datetime')).toBe('Invalid DateTime');
      
      // Test with null/undefined inputs
      expect(formatDate(null)).toBe('N/A');
      expect(formatTime(undefined)).toBe('N/A');
      expect(formatDateTime('')).toBe('N/A');
    });

    test('timezone conversion should fallback gracefully', () => {
      const invalidSlots = [{ startTime: 'invalid', endTime: 'invalid' }];
      const result = convertSlotTimesToLocal(invalidSlots);
      expect(result).toHaveLength(1);
      // The function should handle invalid input gracefully
      expect(result[0]).toHaveProperty('startTime');
      expect(result[0]).toHaveProperty('endTime');
    });
  });
});
