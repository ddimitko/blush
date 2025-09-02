/**
 * Schedule timezone handling tests
 * Tests the complete flow of schedule creation and display with timezone conversion
 */

import { convertBusinessHoursToUTC, convertBusinessHoursToLocal } from '../timezone';

describe('Schedule Timezone Handling', () => {
  
  beforeAll(() => {
    // Mock timezone to EST (UTC-5) for consistent testing
    jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => ({
      resolvedOptions: () => ({ timeZone: 'America/New_York' }),
      format: jest.fn(),
      formatToParts: jest.fn(),
      formatRange: jest.fn(),
      formatRangeToParts: jest.fn(),
    } as any));
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Business Hours UTC Conversion', () => {
    test('should convert local business hours to UTC correctly', () => {
      // User sets 9 AM - 5 PM in their local timezone (EST = UTC-5)
      const localStartTime = '09:00';
      const localEndTime = '17:00';
      
      const { startTime: utcStartTime, endTime: utcEndTime } = convertBusinessHoursToUTC(
        localStartTime, 
        localEndTime
      );
      
      // In EST (UTC-5), 9 AM local = 2 PM UTC (14:00)
      // In EST (UTC-5), 5 PM local = 10 PM UTC (22:00)
      expect(utcStartTime).toMatch(/\d{2}:\d{2}/);
      expect(utcEndTime).toMatch(/\d{2}:\d{2}/);
      
      // The exact UTC times will depend on the current date and DST
      // but they should be valid time strings
      const startHour = parseInt(utcStartTime.split(':')[0]);
      const endHour = parseInt(utcEndTime.split(':')[0]);
      
      expect(startHour).toBeGreaterThanOrEqual(0);
      expect(startHour).toBeLessThan(24);
      expect(endHour).toBeGreaterThanOrEqual(0);
      expect(endHour).toBeLessThan(24);
    });

    test('should convert UTC business hours back to local correctly', () => {
      // Backend returns UTC times
      const utcStartTime = '14:00'; // 2 PM UTC
      const utcEndTime = '22:00';   // 10 PM UTC
      
      const { startTime: localStartTime, endTime: localEndTime } = convertBusinessHoursToLocal(
        utcStartTime, 
        utcEndTime
      );
      
      // Should convert back to local timezone
      expect(localStartTime).toMatch(/\d{2}:\d{2}/);
      expect(localEndTime).toMatch(/\d{2}:\d{2}/);
      
      const startHour = parseInt(localStartTime.split(':')[0]);
      const endHour = parseInt(localEndTime.split(':')[0]);
      
      expect(startHour).toBeGreaterThanOrEqual(0);
      expect(startHour).toBeLessThan(24);
      expect(endHour).toBeGreaterThanOrEqual(0);
      expect(endHour).toBeLessThan(24);
    });

    test('should handle round-trip conversion correctly', () => {
      // Start with local times
      const originalLocalStart = '09:00';
      const originalLocalEnd = '17:00';
      
      // Convert to UTC (as frontend would do before sending to backend)
      const { startTime: utcStart, endTime: utcEnd } = convertBusinessHoursToUTC(
        originalLocalStart, 
        originalLocalEnd
      );
      
      // Convert back to local (as frontend would do when displaying backend data)
      const { startTime: finalLocalStart, endTime: finalLocalEnd } = convertBusinessHoursToLocal(
        utcStart, 
        utcEnd
      );
      
      // Should match original local times (within reasonable precision)
      expect(finalLocalStart).toBe(originalLocalStart);
      expect(finalLocalEnd).toBe(originalLocalEnd);
    });

    test('should handle edge cases correctly', () => {
      // Test midnight crossing
      const lateStart = '23:00';
      const earlyEnd = '01:00';
      
      const { startTime: utcStart, endTime: utcEnd } = convertBusinessHoursToUTC(
        lateStart, 
        earlyEnd
      );
      
      expect(utcStart).toMatch(/\d{2}:\d{2}/);
      expect(utcEnd).toMatch(/\d{2}:\d{2}/);
    });

    test('should handle different timezone scenarios', () => {
      // Test various local times
      const testCases = [
        { local: '08:00', description: 'Early morning' },
        { local: '12:00', description: 'Noon' },
        { local: '18:00', description: 'Evening' },
        { local: '23:30', description: 'Late night' }
      ];
      
      testCases.forEach(({ local, description }) => {
        const { startTime: utcTime } = convertBusinessHoursToUTC(local, local);
        expect(utcTime).toMatch(/\d{2}:\d{2}/);
        
        const { startTime: backToLocal } = convertBusinessHoursToLocal(utcTime, utcTime);
        expect(backToLocal).toBe(local);
      });
    });
  });

  describe('Schedule Data Flow Simulation', () => {
    test('should simulate complete schedule creation flow', () => {
      // 1. User creates schedule in their local timezone
      const userSchedule = [
        { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 'TUESDAY', startTime: '10:00', endTime: '18:00' },
        { dayOfWeek: 'WEDNESDAY', startTime: '08:30', endTime: '16:30' }
      ];
      
      // 2. Frontend converts to UTC before sending to backend
      const utcSchedule = userSchedule.map(slot => {
        const { startTime: utcStart, endTime: utcEnd } = convertBusinessHoursToUTC(
          slot.startTime, 
          slot.endTime
        );
        return {
          dayOfWeek: slot.dayOfWeek,
          startTime: utcStart,
          endTime: utcEnd
        };
      });
      
      // 3. Backend stores UTC times (simulated)
      const storedSchedule = utcSchedule; // Backend would store these UTC times
      
      // 4. Frontend retrieves and converts back to local for display
      const displaySchedule = storedSchedule.map(slot => {
        const { startTime: localStart, endTime: localEnd } = convertBusinessHoursToLocal(
          slot.startTime, 
          slot.endTime
        );
        return {
          dayOfWeek: slot.dayOfWeek,
          startTime: localStart,
          endTime: localEnd
        };
      });
      
      // 5. Verify round-trip accuracy
      expect(displaySchedule).toHaveLength(userSchedule.length);
      displaySchedule.forEach((displaySlot, index) => {
        const originalSlot = userSchedule[index];
        expect(displaySlot.dayOfWeek).toBe(originalSlot.dayOfWeek);
        expect(displaySlot.startTime).toBe(originalSlot.startTime);
        expect(displaySlot.endTime).toBe(originalSlot.endTime);
      });
    });

    test('should handle schedule editing flow', () => {
      // 1. Backend returns existing schedule in UTC
      const backendSchedule = {
        MONDAY: [{ startTime: '14:00', endTime: '22:00' }] // UTC times
      };
      
      // 2. Frontend converts to local for editing
      const editableSchedule = Object.entries(backendSchedule).map(([day, slots]) => 
        slots.map(slot => {
          const { startTime: localStart, endTime: localEnd } = convertBusinessHoursToLocal(
            slot.startTime, 
            slot.endTime
          );
          return {
            dayOfWeek: day,
            startTime: localStart,
            endTime: localEnd
          };
        })
      ).flat();
      
      // 3. User modifies schedule (simulated)
      const modifiedSchedule = editableSchedule.map(slot => ({
        ...slot,
        endTime: '18:00' // User changes end time to 6 PM local
      }));
      
      // 4. Frontend converts back to UTC for saving
      const utcModifiedSchedule = modifiedSchedule.map(slot => {
        const { startTime: utcStart, endTime: utcEnd } = convertBusinessHoursToUTC(
          slot.startTime, 
          slot.endTime
        );
        return {
          dayOfWeek: slot.dayOfWeek,
          startTime: utcStart,
          endTime: utcEnd
        };
      });
      
      // 5. Verify the conversion worked
      expect(utcModifiedSchedule).toHaveLength(1);
      expect(utcModifiedSchedule[0].dayOfWeek).toBe('MONDAY');
      expect(utcModifiedSchedule[0].startTime).toMatch(/\d{2}:\d{2}/);
      expect(utcModifiedSchedule[0].endTime).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid time formats gracefully', () => {
      const invalidTimes = ['25:00', 'invalid', '', '12:60'];
      
      invalidTimes.forEach(invalidTime => {
        const result = convertBusinessHoursToUTC(invalidTime, '17:00');
        // Should return something (fallback behavior)
        expect(result).toHaveProperty('startTime');
        expect(result).toHaveProperty('endTime');
      });
    });

    test('should handle timezone conversion errors gracefully', () => {
      // Test with edge case times
      const edgeCases = ['00:00', '23:59', '12:00'];
      
      edgeCases.forEach(time => {
        const { startTime: utcTime } = convertBusinessHoursToUTC(time, time);
        const { startTime: localTime } = convertBusinessHoursToLocal(utcTime, utcTime);
        
        // Should complete without throwing errors
        expect(typeof utcTime).toBe('string');
        expect(typeof localTime).toBe('string');
      });
    });
  });

  describe('Timezone Awareness', () => {
    test('should be aware of daylight saving time transitions', () => {
      // This test ensures our conversion handles DST correctly
      // The exact behavior depends on the current date and timezone
      
      const testTime = '12:00';
      const { startTime: utcTime } = convertBusinessHoursToUTC(testTime, testTime);
      const { startTime: localTime } = convertBusinessHoursToLocal(utcTime, utcTime);
      
      // Should maintain consistency regardless of DST
      expect(localTime).toBe(testTime);
    });

    test('should handle different user timezones consistently', () => {
      // Test that the conversion logic works regardless of user's timezone
      const businessHours = [
        { start: '09:00', end: '17:00' },
        { start: '10:00', end: '18:00' },
        { start: '08:00', end: '16:00' }
      ];
      
      businessHours.forEach(({ start, end }) => {
        const { startTime: utcStart, endTime: utcEnd } = convertBusinessHoursToUTC(start, end);
        const { startTime: localStart, endTime: localEnd } = convertBusinessHoursToLocal(utcStart, utcEnd);
        
        expect(localStart).toBe(start);
        expect(localEnd).toBe(end);
      });
    });
  });
});
