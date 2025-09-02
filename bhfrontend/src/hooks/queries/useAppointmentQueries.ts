import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { queryKeys, invalidateQueries } from '../../lib/queryClient';
import { Appointment, AppointmentCreationRequest, AvailableSlot } from '../../types';

// Available slots query
export const useAvailableSlotsQuery = (params: {
  shopId?: string;
  serviceId?: string;
  employeeId?: string;
  date?: string;
}) => {
  const { shopId, serviceId, employeeId, date } = params;
  
  return useQuery({
    queryKey: queryKeys.appointments.availableSlots(params),
    queryFn: () => {
      // Only call API if all required parameters are present
      if (shopId && serviceId && employeeId && date) {
        return apiClient.getAvailableSlots({
          shopId,
          serviceId,
          employeeId,
          date,
        });
      }
      throw new Error('Missing required parameters for available slots');
    },
    enabled: !!(shopId && serviceId && employeeId && date),
    staleTime: 30 * 1000, // 30 seconds for slot availability
    gcTime: 2 * 60 * 1000, // 2 minutes cache time for slots
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time updates
  });
};

// User appointments query
export const useUserAppointmentsQuery = () => {
  return useQuery({
    queryKey: queryKeys.appointments.user,
    queryFn: () => apiClient.getUserAppointments(),
    staleTime: 2 * 60 * 1000, // 2 minutes for user appointments
  });
};

// Shop appointments query (for owners/employees)
export const useShopAppointmentsQuery = (shopId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.appointments.shop(shopId!),
    queryFn: () => apiClient.getShopAppointments(shopId!),
    enabled: !!shopId,
    staleTime: 1 * 60 * 1000, // 1 minute for shop appointments
    retry: (failureCount, error: any) => {
      // Don't retry on 403 (access denied) or 401 (unauthorized)
      if (error?.response?.status === 403 || error?.response?.status === 401) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000, // 1 second delay between retries
  });
};

// Employee appointments query (for specific employee)
export const useEmployeeAppointmentsQuery = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ['appointments', 'employee', employeeId],
    queryFn: () => apiClient.getEmployeeAppointments(employeeId!),
    enabled: !!employeeId,
    staleTime: 1 * 60 * 1000, // 1 minute for employee appointments
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      // Don't retry on client errors (4xx)
      if (status === 401 || status === 403 || status === 404 || status === 409) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000, // 1 second delay between retries
  });
};

// Employee by user ID query
export const useEmployeeByUserIdQuery = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['employee', 'user', userId],
    queryFn: () => apiClient.getEmployeeByUserId(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes for employee data
    retry: (failureCount, error: any) => {
      // Don't retry on 403 (access denied) or 401 (unauthorized)
      if (error?.response?.status === 403 || error?.response?.status === 401) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000, // 1 second delay between retries
  });
};

// Employee performance metrics query with period filtering
export const useEmployeePerformanceMetricsQuery = (employeeId: string | undefined, period?: string) => {
  return useQuery({
    queryKey: ['employee', 'performance', employeeId, period],
    queryFn: () => apiClient.getEmployeePerformanceMetrics(employeeId!, period),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes for performance data
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      // Don't retry on client errors (4xx)
      if (status === 401 || status === 403 || status === 404 || status === 409) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000, // 1 second delay between retries
  });
};

// Single appointment query
export const useAppointmentQuery = (appointmentId: string | undefined) => {
  return useQuery({
    queryKey: ['appointments', 'detail', appointmentId],
    queryFn: () => apiClient.getAppointment(appointmentId!),
    enabled: !!appointmentId,
    staleTime: 5 * 60 * 1000, // 5 minutes for appointment details
  });
};

// Create appointment mutation
export const useCreateAppointmentMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (appointmentData: AppointmentCreationRequest) => 
      apiClient.createAppointment(appointmentData),
    onSuccess: (newAppointment) => {
      // Invalidate user appointments
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.user });
      
      // Invalidate shop appointments if we have shop info
      if (newAppointment.shop?.id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.appointments.shop(newAppointment.shop.id) 
        });
      }
      
      // Invalidate available slots for the same parameters
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.appointments.availableSlots({
          shopId: newAppointment.shop?.id,
          serviceId: newAppointment.service?.id,
          employeeId: newAppointment.employee?.id,
          date: newAppointment.appointmentDateTime?.split('T')[0],
        })
      });
    },
  });
};

// Update appointment mutation
export const useUpdateAppointmentMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ appointmentId, appointmentData }: { 
      appointmentId: string; 
      appointmentData: Partial<Appointment> 
    }) => apiClient.updateAppointment(appointmentId, appointmentData),
    onSuccess: (updatedAppointment) => {
      // Update the specific appointment in cache
      queryClient.setQueryData(
        ['appointments', 'detail', updatedAppointment.id], 
        updatedAppointment
      );
      
      // Invalidate related queries
      invalidateQueries.appointments();
      
      if (updatedAppointment.shop?.id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.appointments.shop(updatedAppointment.shop.id) 
        });
      }
    },
  });
};

// Cancel appointment mutation
export const useCancelAppointmentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId, reason, refundAmount }: {
      appointmentId: string;
      reason?: string;
      refundAmount?: number;
    }) => apiClient.cancelAppointment(appointmentId, reason, refundAmount),
    onSuccess: (_, { appointmentId }) => {
      // Invalidate the specific appointment in cache
      queryClient.invalidateQueries({
        queryKey: ['appointments', 'detail', appointmentId]
      });

      // Invalidate related queries
      invalidateQueries.appointments();

      // Invalidate all shop appointments and available slots
      // Since we don't have the appointment details, invalidate broadly
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.shop('')
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.availableSlots({})
      });
    },
  });
};

// Update appointment status mutation
export const useUpdateAppointmentStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId, status }: {
      appointmentId: string;
      status: string;
    }) => apiClient.updateAppointmentStatus(appointmentId, status),
    onSuccess: (updatedAppointment) => {
      // Update the specific appointment in cache
      queryClient.setQueryData(
        ['appointments', 'detail', updatedAppointment.id],
        updatedAppointment
      );

      // Invalidate related queries to refresh lists
      invalidateQueries.appointments();

      if (updatedAppointment.shop?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.appointments.shop(updatedAppointment.shop.id)
        });
      }
    },
  });
};

// Lock slot mutation
export const useLockSlotMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: {
      shopId: string;
      serviceId: string;
      employeeId: string;
      dateTime: string;
    }) => {
      const [date, time] = params.dateTime.split('T');
      return apiClient.lockSlot({
        shopId: params.shopId,
        serviceId: params.serviceId,
        employeeId: params.employeeId,
        date,
        time: time.substring(0, 5), // Remove seconds if present
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate available slots to reflect the lock
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.appointments.availableSlots({
          shopId: variables.shopId,
          serviceId: variables.serviceId,
          employeeId: variables.employeeId,
          date: variables.dateTime.split('T')[0],
        })
      });
    },
  });
};

// Unlock slot mutation
export const useUnlockSlotMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      shopId: string;
      serviceId: string;
      employeeId: string;
      date: string;
      time: string;
      sessionId: string;
    }) => {
      console.log('Unlocking slot with params:', params);
      return apiClient.unlockSlot(params);
    },
    onSuccess: (_, variables) => {
      // Invalidate available slots to reflect the unlock
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.availableSlots({
          shopId: variables.shopId,
          serviceId: variables.serviceId,
          employeeId: variables.employeeId,
          date: variables.date,
        })
      });
    },
  });
};

// Extend slot lock mutation (placeholder - API method doesn't exist yet)
export const useExtendSlotLockMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      // Placeholder implementation
      console.log('Extending slot lock for sessionId:', sessionId);
      return Promise.resolve();
    },
    onSuccess: () => {
      // Invalidate all available slots queries to reflect the extension
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.availableSlots({})
      });
    },
  });
};

// Appointment payment mutation
export const useCreateAppointmentPaymentMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      appointmentId: string;
      paymentMethodId: string;
    }) => {
      // Placeholder implementation - API method doesn't exist yet
      console.log('Creating appointment payment:', params);
      return Promise.resolve({ success: true });
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific appointment to get updated payment status
      queryClient.invalidateQueries({ 
        queryKey: ['appointments', 'detail', variables.appointmentId] 
      });
      
      // Invalidate user appointments
      invalidateQueries.appointments();
    },
  });
};
