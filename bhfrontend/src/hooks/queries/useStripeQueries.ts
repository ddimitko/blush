import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { queryKeys } from '../../lib/queryClient';

// Stripe subscription details query
export const useStripeSubscriptionQuery = (shopId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.stripe.subscription(shopId!),
    queryFn: () => apiClient.getSubscriptionDetails(shopId!),
    enabled: !!shopId,
    staleTime: 2 * 60 * 1000, // 2 minutes for subscription details
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      // Don't retry on client errors (4xx)
      if (status === 401 || status === 403 || status === 404 || status === 409) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

// Stripe Connect account query
export const useStripeConnectQuery = (shopId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.stripe.connect(shopId!),
    queryFn: () => apiClient.getStripeConnectAccount(shopId!),
    enabled: !!shopId,
    staleTime: 2 * 60 * 1000, // 2 minutes for Connect account details
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      // Don't retry on client errors (4xx)
      if (status === 401 || status === 403 || status === 404 || status === 409) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

// Create subscription intent mutation
export const useCreateSubscriptionIntentMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: { shopId: string; intentData: any }) => 
      apiClient.createSubscriptionIntent(params.shopId, params.intentData),
    onSuccess: (_, variables) => {
      // Invalidate subscription details to refetch updated status
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.stripe.subscription(variables.shopId) 
      });
    },
  });
};

// Cancel subscription mutation
export const useCancelSubscriptionMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (shopId: string) => apiClient.cancelSubscription(shopId),
    onSuccess: (_, shopId) => {
      // Invalidate subscription details
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.stripe.subscription(shopId) 
      });
      
      // Invalidate shop details as subscription status affects shop
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.shops.detail(shopId) 
      });
    },
  });
};

// Create customer portal session mutation
export const useCreateCustomerPortalMutation = () => {
  return useMutation({
    mutationFn: (params: { shopId: string; returnUrl: string }) => 
      apiClient.createCustomerPortalSession(params.shopId, params.returnUrl),
  });
};

// Create Connect account mutation
export const useCreateConnectAccountMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: { shopId: string; accountData: any }) => 
      apiClient.createStripeConnectAccount(params.shopId, params.accountData),
    onSuccess: (_, variables) => {
      // Invalidate Connect account details
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.stripe.connect(variables.shopId) 
      });
    },
  });
};

// Update Connect account mutation
export const useUpdateConnectAccountMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: { shopId: string; accountData: any }) => 
      apiClient.updateStripeConnectAccount(params.shopId, params.accountData),
    onSuccess: (_, variables) => {
      // Invalidate Connect account details
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.stripe.connect(variables.shopId) 
      });
    },
  });
};

// Create Connect onboarding link mutation
export const useCreateConnectOnboardingMutation = () => {
  return useMutation({
    mutationFn: (params: { shopId: string; returnUrl: string; refreshUrl: string }) => 
      apiClient.createConnectAccountLink(params.shopId, params.returnUrl, params.refreshUrl),
  });
};

// Create Connect login link mutation
export const useCreateConnectLoginMutation = () => {
  return useMutation({
    mutationFn: (shopId: string) => apiClient.createStripeDashboardLink(shopId),
  });
};

// Payment intent creation mutation
export const useCreatePaymentIntentMutation = () => {
  return useMutation({
    mutationFn: (params: { appointmentId: string; paymentData: any }) => 
      apiClient.createPaymentIntent({ ...params.paymentData, appointmentId: params.appointmentId }),
  });
};

// Confirm payment intent mutation
export const useConfirmPaymentIntentMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: { paymentIntentId: string; paymentMethodId: string }) => 
      apiClient.confirmPaymentIntent(params.paymentIntentId, params.paymentMethodId),
    onSuccess: () => {
      // Invalidate appointments to reflect payment status
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
    },
  });
};
