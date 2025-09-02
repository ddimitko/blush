import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../lib/api';
import { ShopStripeDetails } from '../types';

interface UseShopStripeDetailsResult {
  stripeDetails: ShopStripeDetails | null;
  subscriptionStatus: string | null;
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useShopStripeDetails = (shopId: string | undefined): UseShopStripeDetailsResult => {
  const [stripeDetails, setStripeDetails] = useState<ShopStripeDetails | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStripeDetails = useCallback(async () => {
    if (!shopId) {
      setStripeDetails(null);
      setSubscriptionStatus(null);
      setIsActive(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch basic Stripe details
      const detailsResponse = await apiClient.getShopStripeDetails(shopId);
      if (detailsResponse) {
        setStripeDetails(detailsResponse);
      }

      // Fetch real-time subscription status
      const statusResponse = await apiClient.getShopSubscriptionStatus(shopId);
      if (statusResponse) {
        setSubscriptionStatus(statusResponse.subscriptionStatus);
        setIsActive(statusResponse.isActive);
      }
    } catch (err: any) {
      console.error('Error fetching Stripe details:', err);
      setError(err.response?.data?.message || 'Failed to fetch Stripe details');
      setSubscriptionStatus('incomplete');
      setIsActive(false);
    } finally {
      setIsLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchStripeDetails();
  }, [fetchStripeDetails]);

  return {
    stripeDetails,
    subscriptionStatus,
    isActive,
    isLoading,
    error,
    refetch: fetchStripeDetails
  };
};

// Hook for multiple shops
export const useShopsStripeStatus = (shops: Array<{ id: string }>) => {
  const [shopStatuses, setShopStatuses] = useState<Record<string, { status: string; isActive: boolean }>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Memoize shop IDs to prevent unnecessary re-fetches
  const shopIds = useMemo(() => shops.map(shop => shop.id).sort().join(','), [shops]);

  const fetchAllStatuses = useCallback(async () => {
    if (!shops.length) return;

    setIsLoading(true);
    const statuses: Record<string, { status: string; isActive: boolean }> = {};

    try {
      // Fetch statuses for all shops in parallel
      const promises = shops.map(async (shop) => {
        try {
          const response = await apiClient.getShopSubscriptionStatus(shop.id);
          statuses[shop.id] = {
            status: response.subscriptionStatus || 'incomplete',
            isActive: response.isActive || false
          };
        } catch (err) {
          // If error, assume incomplete status
          statuses[shop.id] = {
            status: 'incomplete',
            isActive: false
          };
        }
      });

      await Promise.all(promises);
      setShopStatuses(statuses);
    } catch (err) {
      console.error('Error fetching shop statuses:', err);
    } finally {
      setIsLoading(false);
    }
  }, [shops]);

  useEffect(() => {
    fetchAllStatuses();
  }, [shopIds, fetchAllStatuses]);

  return {
    shopStatuses,
    isLoading,
    refetch: fetchAllStatuses
  };
};
