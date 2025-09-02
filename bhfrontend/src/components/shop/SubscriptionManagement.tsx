import { useState, useEffect, FC } from 'react';
import { apiClient } from '../../lib/api';
import { useToast } from '../ui/Toast';
import LoadingSpinner from '../ui/LoadingSpinner';
import { SubscriptionDetails, ShopStripeDetails } from '../../types';
import ExistingShopSubscriptionSetup from '../stripe/ExistingShopSubscriptionSetup';
import AdvancedSubscriptionManagement from '../stripe/AdvancedSubscriptionManagement';

interface SubscriptionManagementProps {
  shopId: string;
}

const SubscriptionManagement: FC<SubscriptionManagementProps> = ({ shopId }) => {
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [stripeDetails, setStripeDetails] = useState<ShopStripeDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { error } = useToast();

  const loadSubscriptionDetails = async () => {
    try {
      setIsLoading(true);

      // Load both subscription details and Stripe details
      const [subscriptionResponse, stripeDetailsResponse] = await Promise.allSettled([
        apiClient.getSubscriptionDetails(shopId),
        apiClient.getShopStripeDetails(shopId)
      ]);

      // Handle subscription response
      if (subscriptionResponse.status === 'fulfilled') {
        setSubscription(subscriptionResponse.value);
      } else {
        console.error('Error loading subscription:', subscriptionResponse.reason);
        // If subscription doesn't exist (404), that's expected for new shops
        if (subscriptionResponse.reason?.response?.status === 404) {
          setSubscription(null);
        } else {
          error('Error', 'Failed to load subscription details');
        }
      }

      // Handle Stripe details response
      if (stripeDetailsResponse.status === 'fulfilled') {
        setStripeDetails(stripeDetailsResponse.value);
      } else {
        console.error('Error loading Stripe details:', stripeDetailsResponse.reason);
        setStripeDetails(null);
      }
    } catch (err: any) {
      console.error('Error loading subscription data:', err);
      error('Error', 'Failed to load subscription information');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptionDetails();
  }, [shopId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Determine if subscription setup is needed
  // If they have a subscription ID, they should be able to manage it regardless of status
  // EXCEPT for cancelled subscriptions - they should go through setup again for a new subscription
  const isCancelled = subscription?.status === 'canceled';
  const needsSubscriptionSetup = !subscription || !subscription.subscriptionId || isCancelled;

  // Show setup if subscription is needed
  // This will use the shop's existing Stripe IDs (stripeCustomerId, etc.) if they exist
  if (needsSubscriptionSetup) {
    return (
      <ExistingShopSubscriptionSetup
        shopId={shopId}
        onSubscriptionComplete={loadSubscriptionDetails}
        existingStripeDetails={stripeDetails}
      />
    );
  }

  return (
    <AdvancedSubscriptionManagement
      shopId={shopId}
      subscription={subscription}
      onSubscriptionUpdate={loadSubscriptionDetails}
    />
  );
};

export default SubscriptionManagement;
