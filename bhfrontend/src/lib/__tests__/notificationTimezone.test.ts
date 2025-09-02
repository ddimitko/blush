/**
 * Tests for notification timezone handling
 */

import { formatNotificationTime, formatNotificationRelativeTime, parseUTCDateTime } from '../utils';

describe('Notification Timezone Handling', () => {
  // Mock current date for consistent testing
  const mockDate = new Date('2024-07-23T15:30:00Z'); // Tuesday, July 23, 2024, 3:30 PM UTC
  
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });
  
  afterAll(() => {
    jest.useRealTimers();
  });

  describe('formatNotificationTime', () => {
    test('should format UTC timestamp to local time', () => {
      const utcTimestamp = '2024-07-23T14:30:00Z'; // 2:30 PM UTC
      const result = formatNotificationTime(utcTimestamp);
      
      // The exact format depends on the user's locale, but it should contain the date and time
      expect(result).toMatch(/Jul 23, 2024/);
      expect(result).not.toBe('Invalid Date');
      expect(result).not.toBe('N/A');
    });

    test('should handle null/undefined timestamps', () => {
      expect(formatNotificationTime(null)).toBe('N/A');
      expect(formatNotificationTime(undefined)).toBe('N/A');
    });

    test('should handle invalid timestamps', () => {
      expect(formatNotificationTime('invalid-date')).toBe('Invalid Date');
    });
  });

  describe('formatNotificationRelativeTime', () => {
    test('should show "just now" for very recent notifications', () => {
      const recentTimestamp = '2024-07-23T15:29:30Z'; // 30 seconds ago
      const result = formatNotificationRelativeTime(recentTimestamp);
      expect(result).toBe('just now');
    });

    test('should show minutes for recent notifications', () => {
      const timestamp = '2024-07-23T15:25:00Z'; // 5 minutes ago
      const result = formatNotificationRelativeTime(timestamp);
      expect(result).toBe('5 minutes ago');
    });

    test('should show hours for older notifications', () => {
      const timestamp = '2024-07-23T13:30:00Z'; // 2 hours ago
      const result = formatNotificationRelativeTime(timestamp);
      expect(result).toBe('2 hours ago');
    });

    test('should show days for old notifications', () => {
      const timestamp = '2024-07-21T15:30:00Z'; // 2 days ago
      const result = formatNotificationRelativeTime(timestamp);
      expect(result).toBe('2 days ago');
    });

    test('should show weeks for older notifications', () => {
      const timestamp = '2024-07-09T15:30:00Z'; // 2 weeks ago
      const result = formatNotificationRelativeTime(timestamp);
      expect(result).toBe('2 weeks ago');
    });

    test('should show months for very old notifications', () => {
      const timestamp = '2024-05-23T15:30:00Z'; // 2 months ago
      const result = formatNotificationRelativeTime(timestamp);
      expect(result).toBe('2 months ago');
    });

    test('should show full date for extremely old notifications', () => {
      const timestamp = '2023-07-23T15:30:00Z'; // 1 year ago
      const result = formatNotificationRelativeTime(timestamp);
      // Should fall back to full date format
      expect(result).toMatch(/Jul 23, 2023/);
    });

    test('should handle singular vs plural correctly', () => {
      const oneMinuteAgo = '2024-07-23T15:29:00Z';
      const twoMinutesAgo = '2024-07-23T15:28:00Z';
      
      expect(formatNotificationRelativeTime(oneMinuteAgo)).toBe('1 minute ago');
      expect(formatNotificationRelativeTime(twoMinutesAgo)).toBe('2 minutes ago');
    });

    test('should handle null/undefined timestamps', () => {
      expect(formatNotificationRelativeTime(null)).toBe('N/A');
      expect(formatNotificationRelativeTime(undefined)).toBe('N/A');
    });

    test('should handle invalid timestamps', () => {
      expect(formatNotificationRelativeTime('invalid-date')).toBe('Invalid Date');
    });
  });

  describe('parseUTCDateTime integration', () => {
    test('should properly parse UTC timestamps from backend', () => {
      const utcTimestamp = '2024-07-23T14:30:00Z';
      const parsed = parseUTCDateTime(utcTimestamp);
      
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.getTime()).toBe(new Date('2024-07-23T14:30:00Z').getTime());
    });

    test('should handle timestamps without Z suffix', () => {
      const utcTimestamp = '2024-07-23T14:30:00';
      const parsed = parseUTCDateTime(utcTimestamp);

      expect(parsed).toBeInstanceOf(Date);
      // The function should successfully parse the timestamp
      expect(parsed.getTime()).toBeGreaterThan(0);
    });
  });

  describe('Timezone consistency', () => {
    test('should maintain consistency between relative and absolute time formats', () => {
      const timestamp = '2024-07-23T14:30:00Z';
      
      const relativeTime = formatNotificationRelativeTime(timestamp);
      const absoluteTime = formatNotificationTime(timestamp);
      
      // Both should be valid (not error states)
      expect(relativeTime).not.toBe('Invalid Date');
      expect(relativeTime).not.toBe('N/A');
      expect(absoluteTime).not.toBe('Invalid Date');
      expect(absoluteTime).not.toBe('N/A');
      
      // Relative time should show "1 hour ago" for this test case
      expect(relativeTime).toBe('1 hour ago');
      
      // Absolute time should contain the date
      expect(absoluteTime).toMatch(/Jul 23, 2024/);
    });
  });
});
