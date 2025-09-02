import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Settings, CreditCard, Building2, Save, AlertCircle, Shield, FileText } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useOwnerShopsQuery, useShopDetailsQuery } from '../hooks/queries';
import { useShopStripeDetails } from '../hooks/useShopStripeDetails';
import { useShopPaymentCapability } from '../hooks/useShopPaymentCapability';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { smoothScrollToTop, smoothScrollToForm } from '../lib/smoothNavigation';

import SubscriptionManagement from '../components/shop/SubscriptionManagement';
import StripeConnectManagement from '../components/shop/StripeConnectManagement';
import ShopSettingsForm from '../components/shop/ShopSettingsForm';

const ShopSettingsPage: React.FC = () => {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { success, error } = useToast();

  // React Query hooks - only fetch if user has OWNER role
  const { data: shops = [], isLoading: isLoadingShops } = useOwnerShopsQuery(user?.role === 'OWNER');
  const { data: currentShop, isLoading: isLoadingShop } = useShopDetailsQuery(shopId);

  // Get Stripe details for the current shop
  const { subscriptionStatus, isActive: isSubscriptionActive } = useShopStripeDetails(shopId);

  // Get payment capability details
  const {
    hasStripeAccount,
    onboardingCompleted,
    isLoading: isLoadingPayments
  } = useShopPaymentCapability(shopId);

  const [activeTab, setActiveTab] = useState<'general' | 'subscription' | 'payments'>(() => {
    const tabParam = searchParams.get('tab');
    return (tabParam === 'subscription' || tabParam === 'payments') ? tabParam : 'general';
  });

  // Smooth scroll to top when component mounts
  useEffect(() => {
    smoothScrollToTop();
  }, []);

  // Check if user has access to this shop
  useEffect(() => {
    if (!shopId || !user?.id) return;

    if (!isLoadingShops && shops.length > 0) {
      const hasAccess = shops.some(shop => shop.id === shopId);
      if (!hasAccess) {
        error('Shop not found or you do not have access to it');
        navigate('/dashboard');
      }
    }
  }, [shopId, user?.id, shops, isLoadingShops, navigate, error]);

  // Determine which tabs to show based on subscription status
  const hasActiveSubscription = isSubscriptionActive &&
                                (subscriptionStatus === 'active' || subscriptionStatus === 'trialing');

  const tabs = [
    {
      id: 'general' as const,
      label: 'General Settings',
      icon: <Settings className="w-4 h-4" />,
      description: 'Basic shop information and preferences'
    },
    {
      id: 'subscription' as const,
      label: 'Subscription',
      icon: <CreditCard className="w-4 h-4" />,
      description: 'Manage your Lunara subscription'
    },
    // Only show Payment Setup tab if shop has active subscription
    ...(hasActiveSubscription ? [{
      id: 'payments' as const,
      label: 'Payment Setup',
      icon: <Building2 className="w-4 h-4" />,
      description: 'Stripe Connect and payment processing'
    }] : [])
  ];

  if (isLoadingShops || isLoadingShop || isLoadingPayments) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (!currentShop) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Shop Not Found</h3>
            <p className="text-gray-600 mb-4">The requested shop could not be found.</p>
            <Button onClick={() => navigate('/owner/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shop Settings</h1>
            <p className="text-gray-600">{currentShop.name}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  smoothScrollToForm('.shop-settings-content');
                }}
                className={`
                  flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'border-accent-500 text-accent-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="shop-settings-content bg-white rounded-lg shadow-sm border border-gray-200">
          {activeTab === 'general' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">General Settings</h2>
                <p className="text-gray-600">Update your shop's basic information and preferences.</p>
              </div>
              <ShopSettingsForm shop={currentShop} />
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Subscription Management</h2>
                <p className="text-gray-600">Manage your BeautyHub subscription and billing.</p>
              </div>
              <SubscriptionManagement shopId={currentShop.id} />
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Payment Setup</h2>
                <p className="text-gray-600">Configure Stripe Connect to accept payments from customers.</p>
              </div>
              <StripeConnectManagement shopId={currentShop.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopSettingsPage;
