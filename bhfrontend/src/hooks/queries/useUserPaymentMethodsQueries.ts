import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { queryKeys } from '../../lib/queryClient';

// User payment methods query
export const useUserPaymentMethodsQuery = () => {
  return useQuery({
    queryKey: queryKeys.user.paymentMethods,
    queryFn: () => apiClient.getUserPaymentMethods(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry if unauthorized
      if (error?.response?.status === 401) return false;
      return failureCount < 3;
    },
  });
};

// Default payment method query
export const useDefaultPaymentMethodQuery = () => {
  return useQuery({
    queryKey: [...queryKeys.user.paymentMethods, 'default'],
    queryFn: () => apiClient.getDefaultUserPaymentMethod(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry if unauthorized
      if (error?.response?.status === 401) return false;
      return failureCount < 3;
    },
  });
};

// Create setup intent mutation
export const useCreateUserSetupIntentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.createUserSetupIntent(),
    onSuccess: () => {
      // Invalidate payment methods after successful setup intent creation
      // This will refresh the list when a new payment method is added
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.paymentMethods
      });
    },
  });
};

// Remove payment method mutation
export const useRemoveUserPaymentMethodMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentMethodId: string) =>
      apiClient.removeUserPaymentMethod(paymentMethodId),
    onSuccess: () => {
      // Invalidate payment methods to refresh the list
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.paymentMethods
      });
    },
  });
};

// Set default payment method mutation
export const useSetDefaultPaymentMethodMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentMethodId: string) =>
      apiClient.setDefaultUserPaymentMethod(paymentMethodId),
    onSuccess: () => {
      // Invalidate payment methods to refresh the list and default
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.paymentMethods
      });
    },
  });
};

// Check duplicate card mutation
export const useCheckDuplicateCardMutation = () => {
  return useMutation({
    mutationFn: (fingerprint: string) =>
      apiClient.checkDuplicateCard(fingerprint),
  });
};
