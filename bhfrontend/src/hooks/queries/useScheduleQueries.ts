import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { ScheduleSlot } from '../../types';

interface ScheduleSlotRequest {
  id?: string; // Optional ID for updating existing slots
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  active?: boolean; // Optional active status for existing slots
}

interface EmployeeScheduleResponse {
  employeeId: string;
  employeeName: string;
  schedule: Record<string, ScheduleSlot[]>;
}

// Get employee schedule
export const useEmployeeScheduleQuery = (employeeId: string) => {
  return useQuery({
    queryKey: ['employee-schedule', employeeId],
    queryFn: (): Promise<EmployeeScheduleResponse> => apiClient.getEmployeeSchedule(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Get public employee schedule (for booking)
export const usePublicEmployeeScheduleQuery = (employeeId: string) => {
  return useQuery({
    queryKey: ['public-employee-schedule', employeeId],
    queryFn: () => apiClient.getPublicEmployeeSchedule(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Get my schedule (for employees)
export const useMyScheduleQuery = () => {
  return useQuery({
    queryKey: ['my-schedule'],
    queryFn: () => apiClient.getMySchedule(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Update employee schedule
export const useUpdateEmployeeScheduleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      scheduleSlots
    }: {
      employeeId: string;
      scheduleSlots: ScheduleSlotRequest[]
    }) => apiClient.updateEmployeeSchedule(employeeId, scheduleSlots),
    onSuccess: (data, variables) => {
      // Invalidate and refetch employee schedule
      queryClient.invalidateQueries({ 
        queryKey: ['employee-schedule', variables.employeeId] 
      });
      
      // Invalidate public schedule as well
      queryClient.invalidateQueries({ 
        queryKey: ['public-employee-schedule', variables.employeeId] 
      });
      
      // Invalidate my schedule if it's the current user
      queryClient.invalidateQueries({ 
        queryKey: ['my-schedule'] 
      });
    },
    onError: (error) => {
      console.error('Failed to update employee schedule:', error);
    },
  });
};

// Delete schedule slot (soft delete)
export const useDeleteScheduleSlotMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slotId: string) => apiClient.deleteScheduleSlot(slotId),
    onSuccess: () => {
      // Invalidate all schedule-related queries
      queryClient.invalidateQueries({
        queryKey: ['employee-schedule']
      });
      queryClient.invalidateQueries({
        queryKey: ['public-employee-schedule']
      });
      queryClient.invalidateQueries({
        queryKey: ['my-schedule']
      });
    },
    onError: (error) => {
      console.error('Failed to delete schedule slot:', error);
    },
  });
};

// Hard delete schedule slot (permanent removal)
export const useHardDeleteScheduleSlotMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slotId: string) => apiClient.hardDeleteScheduleSlot(slotId),
    onSuccess: () => {
      // Invalidate all schedule-related queries
      queryClient.invalidateQueries({
        queryKey: ['employee-schedule']
      });
      queryClient.invalidateQueries({
        queryKey: ['public-employee-schedule']
      });
      queryClient.invalidateQueries({
        queryKey: ['my-schedule']
      });
    },
    onError: (error) => {
      console.error('Failed to permanently delete schedule slot:', error);
    },
  });
};

// Toggle schedule slot active status
export const useToggleScheduleSlotMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slotId: string) => apiClient.toggleScheduleSlot(slotId),
    onSuccess: () => {
      // Invalidate all schedule-related queries
      queryClient.invalidateQueries({
        queryKey: ['employee-schedule']
      });
      queryClient.invalidateQueries({
        queryKey: ['public-employee-schedule']
      });
      queryClient.invalidateQueries({
        queryKey: ['my-schedule']
      });
    },
    onError: (error) => {
      console.error('Failed to toggle schedule slot:', error);
    },
  });
};

// Bulk schedule operations
export const useBulkScheduleOperationsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      operations 
    }: { 
      operations: Array<{
        type: 'create' | 'update' | 'delete';
        employeeId: string;
        scheduleSlots?: ScheduleSlotRequest[];
        slotId?: string;
      }>
    }) => {
      const results = [];
      
      for (const operation of operations) {
        try {
          let result;
          
          switch (operation.type) {
            case 'create':
            case 'update':
              if (operation.scheduleSlots) {
                result = await apiClient.updateEmployeeSchedule(
                  operation.employeeId,
                  operation.scheduleSlots
                );
              }
              break;
            case 'delete':
              if (operation.slotId) {
                result = await apiClient.deleteScheduleSlot(operation.slotId);
              }
              break;
          }
          
          results.push({ 
            success: true, 
            operation, 
            data: result?.data 
          });
        } catch (error) {
          results.push({ 
            success: false, 
            operation, 
            error 
          });
        }
      }
      
      return results;
    },
    onSuccess: () => {
      // Invalidate all schedule-related queries
      queryClient.invalidateQueries({ 
        queryKey: ['employee-schedule'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['public-employee-schedule'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['my-schedule'] 
      });
    },
    onError: (error) => {
      console.error('Failed to perform bulk schedule operations:', error);
    },
  });
};

// Helper function to format schedule data for display
export const formatScheduleForDisplay = (schedule: Record<string, ScheduleSlot[]>) => {
  const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  return daysOfWeek.map(day => ({
    day,
    dayLabel: day.charAt(0) + day.slice(1).toLowerCase(),
    slots: schedule[day] || [],
    hasSlots: (schedule[day] || []).length > 0,
    totalHours: (schedule[day] || []).reduce((total, slot) => {
      // Note: slot times are in UTC, but for duration calculation it doesn't matter
      // since we're just calculating the difference
      const start = new Date(`2000-01-01T${slot.startTime}`);
      const end = new Date(`2000-01-01T${slot.endTime}`);
      return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0)
  }));
};

// Helper function to validate schedule slots
export const validateScheduleSlots = (slots: ScheduleSlotRequest[]): string[] => {
  const errors: string[] = [];
  
  // Group slots by day
  const slotsByDay = slots.reduce((acc, slot) => {
    if (!acc[slot.dayOfWeek]) {
      acc[slot.dayOfWeek] = [];
    }
    acc[slot.dayOfWeek].push(slot);
    return acc;
  }, {} as Record<string, ScheduleSlotRequest[]>);
  
  // Check for overlapping slots within each day
  Object.entries(slotsByDay).forEach(([day, daySlots]) => {
    for (let i = 0; i < daySlots.length; i++) {
      for (let j = i + 1; j < daySlots.length; j++) {
        const slot1 = daySlots[i];
        const slot2 = daySlots[j];
        
        const start1 = new Date(`2000-01-01T${slot1.startTime}`);
        const end1 = new Date(`2000-01-01T${slot1.endTime}`);
        const start2 = new Date(`2000-01-01T${slot2.startTime}`);
        const end2 = new Date(`2000-01-01T${slot2.endTime}`);
        
        // Check for overlap
        if (start1 < end2 && start2 < end1) {
          errors.push(`Overlapping time slots on ${day}: ${slot1.startTime}-${slot1.endTime} and ${slot2.startTime}-${slot2.endTime}`);
        }
      }
    }
  });
  
  // Check for invalid time ranges (allow cross-midnight schedules)
  slots.forEach((slot, index) => {
    const start = new Date(`2000-01-01T${slot.startTime}`);
    const end = new Date(`2000-01-01T${slot.endTime}`);

    // Only reject if start and end times are exactly the same
    if (start.getTime() === end.getTime()) {
      errors.push(`Invalid time range at slot ${index + 1}: Start time and end time cannot be the same`);
    }
  });
  
  return errors;
};

export type { ScheduleSlotRequest, EmployeeScheduleResponse };
