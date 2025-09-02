import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle, 
  CreditCard, 
  Wallet, 
  ArrowRight,
  CheckCircle,
  Clock
} from 'lucide-react';
import Button from '../ui/Button';

interface SetupBannersProps {
  shopId: string;
  shopName: string;
  subscriptionStatus: string | null;
  isSubscriptionActive: boolean;
  canAcceptPayments: boolean;
  hasStripeAccount: boolean;
  onboardingCompleted: boolean;
  isLoadingSubscription: boolean;
  isLoadingPayments: boolean;
}

const SetupBanners: React.FC<SetupBannersProps> = ({
  shopId,
  shopName,
  subscriptionStatus,
  isSubscriptionActive,
  canAcceptPayments,
  hasStripeAccount,
  onboardingCompleted,
  isLoadingSubscription,
  isLoadingPayments
}) => {
  const navigate = useNavigate();

  // Don't show banners while loading
  if (isLoadingSubscription || isLoadingPayments) {
    return null;
  }

  // Banner 1: Subscription Setup Required (highest priority)
  const needsSubscriptionSetup = !isSubscriptionActive || 
    (subscriptionStatus && !['active', 'trialing'].includes(subscriptionStatus));

  // Banner 2: Stripe Connect Setup Required (only if subscription is active)
  const needsConnectSetup = isSubscriptionActive && 
    subscriptionStatus && 
    ['active', 'trialing'].includes(subscriptionStatus) && 
    (!hasStripeAccount || !onboardingCompleted || !canAcceptPayments);

  if (needsSubscriptionSetup) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 shadow-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100 rounded-full opacity-20 transform translate-x-16 -translate-y-16"></div>
        <div className="relative flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold text-amber-900">
                Subscription Setup Required
              </h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                Action Required
              </span>
            </div>
            <p className="text-amber-800 mb-4 leading-relaxed">
              Your shop <strong>{shopName}</strong> is currently inactive and not visible to customers. 
              Complete your subscription setup to activate your shop and start accepting bookings.
            </p>
            <div className="flex items-center space-x-3">
              <Button
                variant="primary"
                size="md"
                icon={<CreditCard className="w-4 h-4" />}
                onClick={() => navigate(`/shop/${shopId}/settings?tab=subscription`)}
                className="bg-amber-600 hover:bg-amber-700 border-amber-600 hover:border-amber-700 shadow-sm"
              >
                Complete Subscription Setup
              </Button>
              <span className="text-sm text-amber-700 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                Takes 2-3 minutes
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (needsConnectSetup) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full opacity-20 transform translate-x-16 -translate-y-16"></div>
        <div className="relative flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold text-blue-900">
                Enable Card Payments
              </h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Optional
              </span>
            </div>
            <p className="text-blue-800 mb-4 leading-relaxed">
              Your shop is active! Set up Stripe Connect to accept card payments from customers and 
              increase your booking conversion rate.
            </p>
            <div className="flex items-center space-x-3">
              <Button
                variant="primary"
                size="md"
                icon={<Wallet className="w-4 h-4" />}
                onClick={() => navigate(`/shop/${shopId}/settings?tab=payments`)}
                className="bg-blue-600 hover:bg-blue-700 border-blue-600 hover:border-blue-700 shadow-sm"
              >
                Set Up Card Payments
              </Button>
            </div>
            <div className="mt-3 flex items-center text-sm text-blue-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span>Secure payments powered by Stripe</span>
              <ArrowRight className="w-4 h-4 mx-2" />
              <span>No setup fees</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No banners needed - everything is set up
  return null;
};

export default SetupBanners;
