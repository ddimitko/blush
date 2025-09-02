import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { queryKeys } from '../../lib/queryClient';

// Review leave request mutation
export const useReviewLeaveRequestMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, data }: {
      requestId: string;
      data: {
        action: 'APPROVE' | 'REJECT';
        comments?: string;
      };
    }) => apiClient.reviewLeaveRequest(requestId, data),
    onSuccess: (response, variables) => {
      // Invalidate shop employees query to update leave balances
      // We need to get the shop ID from the response or context
      if (response?.leaveRequest?.employeeId) {
        // Invalidate all shop employees queries to ensure leave balance updates
        queryClient.invalidateQueries({ 
          queryKey: ['shops', 'employees'],
          type: 'all'
        });
      }
      
      // Invalidate notifications to update the count
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.notifications.all 
      });
      
      // Invalidate any leave request specific queries if they exist
      queryClient.invalidateQueries({ 
        queryKey: ['leave-requests'],
        type: 'all'
      });
    },
  });
};

// Cancel leave request mutation
export const useCancelLeaveRequestMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, employeeId }: { requestId: string; employeeId: string }) =>
      apiClient.cancelLeaveRequest(requestId, employeeId),
    onSuccess: () => {
      // Invalidate shop employees query to update leave balances
      queryClient.invalidateQueries({
        queryKey: ['shops', 'employees'],
        type: 'all'
      });

      // Invalidate notifications to update the count
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all
      });

      // Invalidate any leave request specific queries
      queryClient.invalidateQueries({
        queryKey: ['leave-requests'],
        type: 'all'
      });
    },
  });
};

// Create leave request mutation
export const useCreateLeaveRequestMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ employeeId, data }: {
      employeeId: string;
      data: {
        leaveType: string;
        startDate: string;
        endDate: string;
        reason: string;
      };
    }) => apiClient.createLeaveRequest(employeeId, data),
    onSuccess: () => {
      // Invalidate notifications to update the count
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all
      });

      // Invalidate any leave request specific queries
      queryClient.invalidateQueries({
        queryKey: ['leave-requests'],
        type: 'all'
      });
    },
  });
};
