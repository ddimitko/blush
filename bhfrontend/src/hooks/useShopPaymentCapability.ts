import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api';

interface PaymentCapabilityResult {
  canAcceptPayments: boolean;
  hasStripeAccount: boolean;
  onboardingCompleted: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useShopPaymentCapability = (shopId: string | undefined): PaymentCapabilityResult => {
  const [canAcceptPayments, setCanAcceptPayments] = useState(false);
  const [hasStripeAccount, setHasStripeAccount] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentCapability = useCallback(async () => {
    if (!shopId) {
      setCanAcceptPayments(false);
      setHasStripeAccount(false);
      setOnboardingCompleted(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check payment capability
      const capabilityResponse = await apiClient.getShopPaymentCapability(shopId);

      if (capabilityResponse) {
        setCanAcceptPayments(capabilityResponse.canAcceptPayments || false);
        setHasStripeAccount(capabilityResponse.hasStripeAccount || false);
      }

      // Check Connect account details for onboarding status
      try {
        const connectResponse = await apiClient.getStripeConnectAccount(shopId);
        if (connectResponse) {
          setOnboardingCompleted(connectResponse.onboardingCompleted || false);
        }
      } catch (connectErr: any) {
        // If Connect account doesn't exist, onboarding is not completed
        if (connectErr.response?.status === 404 || connectErr.response?.status === 500) {
          console.log('Connect account not found for shop, setting onboarding as not completed');
          setOnboardingCompleted(false);
          setHasStripeAccount(false);
        } else {
          console.warn('Error fetching Connect account details:', connectErr);
          setOnboardingCompleted(false);
        }
      }

    } catch (err: any) {
      console.error('Error fetching payment capability:', err);
      setError(err.response?.data?.message || 'Failed to fetch payment capability');
      setCanAcceptPayments(false);
      setHasStripeAccount(false);
      setOnboardingCompleted(false);
    } finally {
      setIsLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchPaymentCapability();
  }, [fetchPaymentCapability]);

  return {
    canAcceptPayments,
    hasStripeAccount,
    onboardingCompleted,
    isLoading,
    error,
    refetch: fetchPaymentCapability
  };
};
