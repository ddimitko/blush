import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { useToast } from '../components/ui/Toast';
import { SubscriptionDetails, SubscriptionUpdateRequest, SubscriptionCancelRequest } from '../types';

// Query keys
export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  details: (shopId: string) => [...subscriptionKeys.all, 'details', shopId] as const,
  detailed: (shopId: string) => [...subscriptionKeys.all, 'detailed', shopId] as const,
};

// Hook for getting detailed subscription information with trial data
export const useDetailedSubscriptionInfo = (shopId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: subscriptionKeys.detailed(shopId),
    queryFn: () => apiClient.getDetailedSubscriptionInfo(shopId),
    enabled: enabled && !!shopId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

// Hook for updating subscription plan
export const useUpdateSubscriptionPlan = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ shopId, updateData }: { shopId: string; updateData: SubscriptionUpdateRequest }) =>
      apiClient.updateSubscriptionPlan(shopId, updateData),
    onSuccess: (data, variables) => {
      success('Plan Updated', 'Your subscription plan has been updated successfully');
      // Invalidate and refetch subscription data
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.detailed(variables.shopId) });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.details(variables.shopId) });
    },
    onError: (err: any) => {
      error('Update Failed', err.response?.data?.message || 'Failed to update subscription plan');
    },
  });
};

// Hook for canceling subscription
export const useCancelSubscription = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ shopId, cancelData }: { shopId: string; cancelData?: SubscriptionCancelRequest }) =>
      apiClient.cancelSubscription(shopId, cancelData),
    onSuccess: (data, variables) => {
      success('Subscription Cancelled', 'Your subscription has been cancelled');
      // Invalidate and refetch subscription data
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.detailed(variables.shopId) });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.details(variables.shopId) });
    },
    onError: (err: any) => {
      error('Cancellation Failed', err.response?.data?.message || 'Failed to cancel subscription');
    },
  });
};

// Hook for reactivating subscription
export const useReactivateSubscription = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (shopId: string) => apiClient.reactivateSubscription(shopId),
    onSuccess: (data, shopId) => {
      success('Subscription Reactivated', 'Your subscription has been reactivated');
      // Invalidate and refetch subscription data
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.detailed(shopId) });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.details(shopId) });
    },
    onError: (err: any) => {
      error('Reactivation Failed', err.response?.data?.message || 'Failed to reactivate subscription');
    },
  });
};

// Hook for refreshing subscription data from Stripe
export const useRefreshSubscriptionData = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (shopId: string) => apiClient.getDetailedSubscriptionInfo(shopId),
    onSuccess: (data, shopId) => {
      success('Data Refreshed', 'Subscription data has been refreshed from Stripe');
      // Update the cache with fresh data
      queryClient.setQueryData(subscriptionKeys.detailed(shopId), data);
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.details(shopId) });
    },
    onError: (err: any) => {
      error('Refresh Failed', err.response?.data?.message || 'Failed to refresh subscription data');
    },
  });
};

// Hook for syncing subscription status from Stripe
export const useSyncSubscriptionStatus = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (shopId: string) => apiClient.syncSubscriptionStatus(shopId),
    onSuccess: (data, shopId) => {
      success('Status Synced', 'Subscription status has been synced with Stripe');
      // Invalidate all related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.detailed(shopId) });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.details(shopId) });
      // Also invalidate shop queries to update shop status
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    },
    onError: (err: any) => {
      error('Sync Failed', err.response?.data?.message || 'Failed to sync subscription status');
    },
  });
};
