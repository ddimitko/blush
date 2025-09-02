import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Download,
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  Clock,
  FileText,
  Settings,
  TrendingUp,
  XCircle,
  ArrowUp,
  ArrowDown,
  Check
} from 'lucide-react';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useToast } from '../ui/Toast';
import { apiClient } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useSyncSubscriptionStatus } from '../../hooks/useSubscriptionManagement';
import { SubscriptionDetails, StripePaymentMethod } from '../../types';

interface AdvancedSubscriptionManagementProps {
  shopId: string;
  subscription: SubscriptionDetails;
  onSubscriptionUpdate: () => void;
}

interface Invoice {
  id: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: string;
  created: number;
  due_date?: number;
  period_start: number;
  period_end: number;
  hosted_invoice_url?: string;
  invoice_pdf?: string;
}

const AdvancedSubscriptionManagement: React.FC<AdvancedSubscriptionManagementProps> = ({
  shopId,
  subscription,
  onSubscriptionUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'payment-methods' | 'invoices' | 'settings'>('overview');
  const [paymentMethods, setPaymentMethods] = useState<StripePaymentMethod[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [upcomingInvoice, setUpcomingInvoice] = useState<Invoice | null>(null);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionDetails>(subscription);
  const { success, error } = useToast();
  const syncSubscriptionStatus = useSyncSubscriptionStatus();

  // Load detailed subscription data on component mount
  useEffect(() => {
    loadDetailedSubscriptionData();
    loadAvailablePlans();
  }, [shopId]);

  useEffect(() => {
    if (activeTab === 'payment-methods') {
      loadPaymentMethods();
    } else if (activeTab === 'invoices') {
      loadInvoices();
      loadUpcomingInvoice();
    }
  }, [activeTab, shopId]);

  // Load detailed subscription data with trial information
  const loadDetailedSubscriptionData = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Loading detailed subscription data...');
      const response = await apiClient.getDetailedSubscriptionInfo(shopId);
      setCurrentSubscription(response);
      console.log('✅ Detailed subscription data loaded:', response);
    } catch (err: any) {
      console.error('Error loading detailed subscription data:', err);
      // Fall back to the subscription data passed as props
      setCurrentSubscription(subscription);
      error('Warning', 'Using cached subscription data. Some information may be outdated.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailablePlans = async () => {
    try {
      const response = await apiClient.getSubscriptionPlans();
      setAvailablePlans(response);
    } catch (err: any) {
      console.error('Error loading available plans:', err);
    }
  };

  // Refresh subscription data from Stripe API
  const refreshSubscriptionData = async () => {
    try {
      setIsUpdating(true);
      console.log('🔄 Refreshing subscription data from Stripe API...');
      await loadDetailedSubscriptionData();
      onSubscriptionUpdate(); // Also update parent component
      success('Success', 'Subscription data refreshed from Stripe');
    } catch (err: any) {
      console.error('Error refreshing subscription data:', err);
      error('Error', 'Failed to refresh subscription data');
    } finally {
      setIsUpdating(false);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getPaymentMethods(shopId);
      setPaymentMethods(response.data || []);
    } catch (err: any) {
      console.error('Error loading payment methods:', err);
      error('Error', 'Failed to load payment methods');
    } finally {
      setIsLoading(false);
    }
  };

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getSubscriptionInvoices(shopId, { limit: 10 });
      setInvoices(response.data || []);
    } catch (err: any) {
      console.error('Error loading invoices:', err);
      error('Error', 'Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUpcomingInvoice = async () => {
    try {
      const response = await apiClient.getUpcomingInvoice(shopId);
      setUpcomingInvoice(response);
    } catch (err: any) {
      console.error('Error loading upcoming invoice:', err);
      // Don't show error for upcoming invoice as it might not exist
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setIsUpdating(true);
      await apiClient.cancelSubscription(shopId);
      success('Subscription Cancelled', 'Your subscription has been cancelled');
      await loadDetailedSubscriptionData();
      onSubscriptionUpdate(); // Update parent component
    } catch (err: any) {
      console.error('Error cancelling subscription:', err);
      error('Error', 'Failed to cancel subscription');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateSubscription = async (newPriceId: string) => {
    try {
      setIsUpdating(true);
      await apiClient.updateSubscriptionPlan(shopId, { newStripePriceId: newPriceId });
      success('Subscription Updated', 'Your subscription has been updated');
      await loadDetailedSubscriptionData();
      onSubscriptionUpdate(); // Update parent component
    } catch (err: any) {
      console.error('Error updating subscription:', err);
      error('Error', 'Failed to update subscription');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      setIsUpdating(true);
      await apiClient.reactivateSubscription(shopId);
      success('Subscription Reactivated', 'Your subscription has been reactivated');
      await loadDetailedSubscriptionData();
      onSubscriptionUpdate(); // Update parent component
    } catch (err: any) {
      console.error('Error reactivating subscription:', err);
      error('Error', 'Failed to reactivate subscription');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSyncStatus = async () => {
    try {
      setIsUpdating(true);
      await syncSubscriptionStatus.mutateAsync(shopId);
      await loadDetailedSubscriptionData();
      onSubscriptionUpdate(); // Refresh parent component
    } catch (err: any) {
      // Error is already handled by the hook
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePlanUpdate = async (newPriceId: string) => {
    try {
      setIsUpdating(true);

      // For active subscriptions, update the plan
      await apiClient.updateSubscriptionPlan(shopId, {
        newStripePriceId: newPriceId,
        prorate: true,
        prorationBehavior: 'create_prorations'
      });
      success('Plan Updated', 'Your subscription plan has been updated successfully');

      await loadDetailedSubscriptionData();
      onSubscriptionUpdate();
      setShowPlanSelector(false);
    } catch (err: any) {
      error('Update Failed', err.response?.data?.message || 'Failed to update subscription plan');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSetDefaultPaymentMethod = async (paymentMethodId: string) => {
    try {
      setIsUpdating(true);
      await apiClient.setDefaultPaymentMethod(shopId, paymentMethodId);
      await loadPaymentMethods();
      success('Success', 'Default payment method updated');
    } catch (err: any) {
      console.error('Error setting default payment method:', err);
      error('Error', 'Failed to update default payment method');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemovePaymentMethod = async (paymentMethodId: string) => {
    if (!window.confirm('Are you sure you want to remove this payment method?')) return;
    
    try {
      setIsUpdating(true);
      await apiClient.removePaymentMethod(shopId, paymentMethodId);
      await loadPaymentMethods();
      success('Success', 'Payment method removed');
    } catch (err: any) {
      console.error('Error removing payment method:', err);
      error('Error', 'Failed to remove payment method');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'trialing':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'past_due':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'canceled':
      case 'incomplete':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'payment-methods' as const, label: 'Payment Methods', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'invoices' as const, label: 'Invoices', icon: <FileText className="w-4 h-4" /> },
    { id: 'settings' as const, label: 'Settings', icon: <Settings className="w-4 h-4" /> }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Subscription Management</h2>
          <p className="text-gray-600 mt-1">
            Manage your BeautyHub subscription, payment methods, and billing.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={refreshSubscriptionData}
          disabled={isUpdating}
          isLoading={isUpdating}
          icon={<RefreshCw className="w-4 h-4" />}
        >
          Refresh from Stripe
        </Button>
      </div>

      {/* Subscription Status Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Current Subscription</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(currentSubscription.status)}`}>
            {currentSubscription.status.charAt(0).toUpperCase() + currentSubscription.status.slice(1)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600">Plan</p>
            <p className="text-lg font-medium text-gray-900">{currentSubscription.planDisplayName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Amount</p>
            <p className="text-lg font-medium text-gray-900">
              {formatCurrency(currentSubscription.amount / 100, undefined, currentSubscription.currency)} / {currentSubscription.interval}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">
              {currentSubscription.isTrialing ? 'Trial Ends' : 'Next Billing'}
            </p>
            <p className="text-lg font-medium text-gray-900">
              {currentSubscription.isTrialing && currentSubscription.trialEnd
                ? formatDate(currentSubscription.trialEnd)
                : currentSubscription.nextBillingDate
                  ? formatDate(currentSubscription.nextBillingDate)
                  : 'N/A'
              }
            </p>
          </div>
        </div>

        {/* Trial Information */}
        {currentSubscription.isTrialing && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-blue-900">Free Trial Active</h4>
                <p className="text-sm text-blue-700 mt-1">
                  {currentSubscription.trialDaysRemaining !== undefined && currentSubscription.trialDaysRemaining > 0
                    ? `${currentSubscription.trialDaysRemaining} days remaining in your free trial`
                    : 'Your free trial is ending soon'
                  }
                </p>
              </div>
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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
      <div className="bg-white border border-gray-200 rounded-lg">
        {activeTab === 'overview' && (
          <OverviewTab
            subscription={currentSubscription}
            upcomingInvoice={upcomingInvoice}
            availablePlans={availablePlans}
            onCancelSubscription={handleCancelSubscription}
            onUpdateSubscription={handlePlanUpdate}
            onReactivateSubscription={handleReactivateSubscription}
            onSyncStatus={handleSyncStatus}
            onShowPlanSelector={() => setShowPlanSelector(true)}
            isUpdating={isUpdating}
          />
        )}

        {activeTab === 'payment-methods' && (
          <PaymentMethodsTab
            paymentMethods={paymentMethods}
            isLoading={isLoading}
            isUpdating={isUpdating}
            onSetDefault={handleSetDefaultPaymentMethod}
            onRemove={handleRemovePaymentMethod}
          />
        )}

        {activeTab === 'invoices' && (
          <InvoicesTab
            invoices={invoices}
            upcomingInvoice={upcomingInvoice}
            isLoading={isLoading}
            subscription={currentSubscription}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            subscription={currentSubscription}
            onCancelSubscription={handleCancelSubscription}
            isUpdating={isUpdating}
          />
        )}
      </div>

      {/* Plan Selector Modal */}
      {showPlanSelector && (
        <PlanSelectorModal
          currentSubscription={currentSubscription}
          availablePlans={availablePlans}
          onSelectPlan={handlePlanUpdate}
          onClose={() => setShowPlanSelector(false)}
          isUpdating={isUpdating}
        />
      )}
    </div>
  );
};

// Overview Tab Component
interface OverviewTabProps {
  subscription: SubscriptionDetails;
  upcomingInvoice: Invoice | null;
  availablePlans: any[];
  onCancelSubscription: () => void;
  onUpdateSubscription: (priceId: string) => void;
  onReactivateSubscription: () => void;
  onSyncStatus: () => void;
  onShowPlanSelector: () => void;
  isUpdating: boolean;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  subscription,
  upcomingInvoice,
  availablePlans,
  onCancelSubscription,
  onUpdateSubscription,
  onReactivateSubscription,
  onSyncStatus,
  onShowPlanSelector,
  isUpdating
}) => {
  const isCancelled = subscription.status === 'canceled';
  const canCancel = !subscription.cancelAtPeriodEnd && !isCancelled;
  return (
    <div className="p-6 space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        {/* Plan Modification - Only show for active subscriptions */}
        {!isCancelled && (
          <Button
            variant="primary"
            onClick={onShowPlanSelector}
            disabled={isUpdating}
            icon={<TrendingUp className="w-4 h-4" />}
          >
            Change Plan
          </Button>
        )}

        {/* Cancel Subscription - Only show if not already cancelled or scheduled for cancellation */}
        {canCancel && (
          <Button
            variant="outline"
            onClick={onCancelSubscription}
            disabled={isUpdating}
            isLoading={isUpdating}
            icon={<XCircle className="w-4 h-4" />}
          >
            Cancel Subscription
          </Button>
        )}

        {/* Reactivate - Show if scheduled for cancellation */}
        {subscription.cancelAtPeriodEnd && !isCancelled && (
          <Button
            variant="primary"
            onClick={onReactivateSubscription}
            disabled={isUpdating}
            isLoading={isUpdating}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Reactivate Subscription
          </Button>
        )}

        {/* New Subscription - Show if fully cancelled */}
        {isCancelled && (
          <Button
            variant="primary"
            onClick={onShowPlanSelector}
            disabled={isUpdating}
            icon={<Plus className="w-4 h-4" />}
          >
            Subscribe Again
          </Button>
        )}

        {/* Sync Status - Always available */}
        <Button
          variant="outline"
          onClick={onSyncStatus}
          disabled={isUpdating}
          isLoading={isUpdating}
          icon={<RefreshCw className="w-4 h-4" />}
        >
          Sync Status
        </Button>
      </div>

      {/* Upcoming Invoice */}
      {upcomingInvoice && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-blue-900">Upcoming Invoice</h4>
              <p className="text-sm text-blue-700 mt-1">
                {formatCurrency(upcomingInvoice.amount_due / 100, undefined, upcomingInvoice.currency)} due on{' '}
                {upcomingInvoice.due_date ? formatDate(new Date(upcomingInvoice.due_date * 1000)) : 'Next billing cycle'}
              </p>
            </div>
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
        </div>
      )}

      {/* Subscription Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Billing Information</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Customer ID</span>
              <span className="text-sm text-gray-900 font-mono">{subscription.customerId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Subscription ID</span>
              <span className="text-sm text-gray-900 font-mono">{subscription.subscriptionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Current Period</span>
              <span className="text-sm text-gray-900">
                {subscription.currentPeriodStart && subscription.currentPeriodEnd
                  ? `${formatDate(subscription.currentPeriodStart)} - ${formatDate(subscription.currentPeriodEnd)}`
                  : 'N/A'
                }
              </span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Subscription Status</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Active</span>
              <span className="text-sm text-gray-900">{subscription.isActive ? 'Yes' : 'No'}</span>
            </div>
            {subscription.isTrialing && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Trial Status</span>
                  <span className="text-sm text-blue-600 font-medium">
                    {subscription.trialDaysRemaining !== undefined && subscription.trialDaysRemaining > 0
                      ? `${subscription.trialDaysRemaining} days remaining`
                      : 'Trial ending soon'
                    }
                  </span>
                </div>
                {subscription.trialEnd && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Trial Ends</span>
                    <span className="text-sm text-gray-900">{formatDate(subscription.trialEnd)}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Cancel at Period End</span>
              <span className="text-sm text-gray-900">{subscription.cancelAtPeriodEnd ? 'Yes' : 'No'}</span>
            </div>
            {subscription.canceledAt && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Canceled At</span>
                <span className="text-sm text-gray-900">{formatDate(subscription.canceledAt)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Payment Methods Tab Component
interface PaymentMethodsTabProps {
  paymentMethods: StripePaymentMethod[];
  isLoading: boolean;
  isUpdating: boolean;
  onSetDefault: (paymentMethodId: string) => void;
  onRemove: (paymentMethodId: string) => void;
}

const PaymentMethodsTab: React.FC<PaymentMethodsTabProps> = ({
  paymentMethods,
  isLoading,
  isUpdating,
  onSetDefault,
  onRemove
}) => {
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Payment Methods</h3>
        <p className="text-sm text-gray-600">Manage payment methods through your subscription settings</p>
      </div>

      {paymentMethods.length === 0 ? (
        <div className="text-center py-8">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Payment Methods</h4>
          <p className="text-gray-600 mb-4">Payment methods will appear here once added to your subscription.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {method.card?.brand?.toUpperCase()} •••• {method.card?.last4}
                  </p>
                  <p className="text-sm text-gray-600">
                    Expires {method.card?.exp_month}/{method.card?.exp_year}
                  </p>
                  {method.is_default && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                      Default
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {!method.is_default && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSetDefault(method.id)}
                    disabled={isUpdating}
                  >
                    Set Default
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRemove(method.id)}
                  disabled={isUpdating || method.is_default}
                  icon={<Trash2 className="w-4 h-4" />}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Invoices Tab Component
interface InvoicesTabProps {
  invoices: Invoice[];
  upcomingInvoice: Invoice | null;
  isLoading: boolean;
  subscription: SubscriptionDetails;
}

const InvoicesTab: React.FC<InvoicesTabProps> = ({
  invoices,
  upcomingInvoice,
  isLoading,
  subscription
}) => {
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const getInvoiceStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'open':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'void':
      case 'uncollectible':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Billing History</h3>

      {/* Upcoming Invoice */}
      {upcomingInvoice && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-blue-900">Next Invoice</h4>
              <p className="text-sm text-blue-700 mt-1">
                {formatCurrency(upcomingInvoice.amount_due / 100, undefined, upcomingInvoice.currency)} due on{' '}
                {upcomingInvoice.due_date
                  ? formatDate(new Date(upcomingInvoice.due_date * 1000))
                  : subscription.nextBillingDate
                    ? formatDate(subscription.nextBillingDate)
                    : 'N/A'
                }
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-700">
                Period: {formatDate(new Date(upcomingInvoice.period_start * 1000))} -{' '}
                {formatDate(new Date(upcomingInvoice.period_end * 1000))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Invoice List */}
      {invoices.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Invoices</h4>
          <p className="text-gray-600">Your billing history will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(new Date(invoice.created * 1000))}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(invoice.amount_due / 100, undefined, invoice.currency)}
                  </p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getInvoiceStatusColor(invoice.status)} mt-1`}>
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {invoice.hosted_invoice_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(invoice.hosted_invoice_url, '_blank')}
                    icon={<ExternalLink className="w-4 h-4" />}
                  >
                    View
                  </Button>
                )}
                {invoice.invoice_pdf && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(invoice.invoice_pdf, '_blank')}
                    icon={<Download className="w-4 h-4" />}
                  >
                    Download
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Settings Tab Component
interface SettingsTabProps {
  subscription: SubscriptionDetails;
  onCancelSubscription: () => void;
  isUpdating: boolean;
}

const SettingsTab: React.FC<SettingsTabProps> = ({
  subscription,
  onCancelSubscription,
  isUpdating
}) => {
  const isCancelled = subscription.status === 'canceled';
  const canCancel = !subscription.cancelAtPeriodEnd && !isCancelled;

  return (
    <div className="p-6 space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Subscription Settings</h3>

      {/* Subscription Management */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Manage Subscription</h4>
        <p className="text-sm text-gray-600 mb-4">
          Manage your subscription directly within the app. Cancel or modify your plan as needed.
        </p>

        {isCancelled && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              <strong>Subscription Cancelled:</strong> Your subscription has been cancelled and is no longer active.
            </p>
          </div>
        )}

        {canCancel && (
          <Button
            variant="outline"
            onClick={onCancelSubscription}
            disabled={isUpdating}
            isLoading={isUpdating}
            icon={<XCircle className="w-4 h-4" />}
          >
            Cancel Subscription
          </Button>
        )}

        {!canCancel && !isCancelled && (
          <p className="text-sm text-gray-500">
            Subscription cancellation is scheduled for {formatDate(subscription.currentPeriodEnd)}.
          </p>
        )}
      </div>

      {/* Cancellation Warning */}
      {subscription.cancelAtPeriodEnd && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Subscription Cancellation Scheduled</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Your subscription will be canceled at the end of the current billing period on{' '}
                {formatDate(subscription.currentPeriodEnd)}.
              </p>
              <div className="mt-3">
                <p className="text-sm text-yellow-700">
                  Contact support to reactivate your subscription if needed.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Subscription Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Plan</p>
            <p className="text-sm text-gray-900 mt-1">{subscription.planDisplayName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Billing Cycle</p>
            <p className="text-sm text-gray-900 mt-1 capitalize">{subscription.interval}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Amount</p>
            <p className="text-sm text-gray-900 mt-1">
              {formatCurrency(subscription.amount / 100, undefined, subscription.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
            <p className="text-sm text-gray-900 mt-1 capitalize">{subscription.status}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Plan Selector Modal Component
interface PlanSelectorModalProps {
  currentSubscription: SubscriptionDetails;
  availablePlans: any[];
  onSelectPlan: (priceId: string) => void;
  onClose: () => void;
  isUpdating: boolean;
}

const PlanSelectorModal: React.FC<PlanSelectorModalProps> = ({
  currentSubscription,
  availablePlans,
  onSelectPlan,
  onClose,
  isUpdating
}) => {
  const formatPrice = (priceInCents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(priceInCents / 100);
  };

  const isCancelled = currentSubscription.status === 'canceled';

  const getPlanType = (plan: any) => {
    // If subscription is cancelled, all plans are "new subscription"
    if (isCancelled) return 'new';

    const currentAmount = currentSubscription.amount;
    if (plan.priceInCents > currentAmount) return 'upgrade';
    if (plan.priceInCents < currentAmount) return 'downgrade';
    return 'current';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            {isCancelled ? 'Choose a Subscription Plan' : 'Change Subscription Plan'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isUpdating}
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availablePlans.map((plan) => {
            const planType = getPlanType(plan);
            const isCurrentPlan = !isCancelled && plan.stripePriceId === currentSubscription.stripePriceId;

            return (
              <div
                key={plan.stripePriceId}
                className={`border rounded-lg p-4 relative ${
                  isCurrentPlan
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {isCurrentPlan && (
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <Check className="w-3 h-3 mr-1" />
                      Current
                    </span>
                  </div>
                )}

                {!isCurrentPlan && planType === 'upgrade' && (
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <ArrowUp className="w-3 h-3 mr-1" />
                      Upgrade
                    </span>
                  </div>
                )}

                {!isCurrentPlan && planType === 'downgrade' && (
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      <ArrowDown className="w-3 h-3 mr-1" />
                      Downgrade
                    </span>
                  </div>
                )}

                {planType === 'new' && (
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      <Plus className="w-3 h-3 mr-1" />
                      New
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h4 className="text-lg font-medium text-gray-900">{plan.displayName}</h4>
                  <p className="text-sm text-gray-600">{plan.description}</p>
                </div>

                <div className="mb-4">
                  <span className="text-2xl font-bold text-gray-900">
                    {formatPrice(plan.priceInCents, plan.currency)}
                  </span>
                  <span className="text-gray-600">/{plan.interval}</span>
                </div>

                {plan.features && (
                  <ul className="space-y-2 mb-4">
                    {plan.features.slice(0, 4).map((feature: string, index: number) => (
                      <li key={index} className="flex items-center text-sm text-gray-600">
                        <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}

                <Button
                  variant={isCurrentPlan ? "outline" : "primary"}
                  onClick={() => !isCurrentPlan && onSelectPlan(plan.stripePriceId)}
                  disabled={isCurrentPlan || isUpdating}
                  isLoading={isUpdating}
                  className="w-full"
                >
                  {isCurrentPlan
                    ? 'Current Plan'
                    : isCancelled
                      ? `Subscribe to ${plan.displayName}`
                      : `Switch to ${plan.displayName}`
                  }
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            {isCancelled ? 'New Subscription Information' : 'Plan Change Information'}
          </h4>
          <ul className="text-sm text-gray-600 space-y-1">
            {isCancelled ? (
              <>
                <li>• New subscription starts immediately</li>
                <li>• You'll be charged the full amount for the selected plan</li>
                <li>• Your billing cycle starts from today</li>
                <li>• All features will be activated immediately</li>
              </>
            ) : (
              <>
                <li>• Plan changes take effect immediately</li>
                <li>• You'll be charged/credited the prorated amount</li>
                <li>• Your next billing date remains the same</li>
                <li>• You can change your plan anytime</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSubscriptionManagement;
