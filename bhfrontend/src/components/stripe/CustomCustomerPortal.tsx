import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Calendar,
  Download,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  Edit3,
  ExternalLink
} from 'lucide-react';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useToast } from '../ui/Toast';
import { apiClient } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';

// const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY!);

interface CustomCustomerPortalProps {
  shopId: string;
  subscription: any;
}

interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  billing_details?: {
    name?: string;
    email?: string;
  };
}

interface Invoice {
  id: string;
  number: string;
  status: string;
  amount_paid: number;
  amount_due: number;
  currency: string;
  created: number;
  period_start: number;
  period_end: number;
  hosted_invoice_url: string;
  invoice_pdf: string;
}

const CustomCustomerPortal: React.FC<CustomCustomerPortalProps> = ({
  shopId,
  subscription
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { success, error } = useToast();

  // Simplified - removed complex data loading for now

  const handleOpenCustomerPortal = async () => {
    try {
      setIsUpdating(true);
      const response = await apiClient.createCustomerPortalSession(shopId, window.location.href);
      window.open(response.url, '_blank');
      success('Portal Opened', 'Stripe customer portal opened in new tab');
    } catch (err: any) {
      console.error('Error opening customer portal:', err);
      error('Error', 'Failed to open customer portal');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Subscription Management</h2>
        <p className="text-gray-600">
          Manage your subscription, payment methods, and billing history.
        </p>
      </div>

      {/* Current Subscription */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Current Subscription</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600">Plan</p>
            <p className="text-lg font-medium text-gray-900">{subscription.planDisplayName || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="text-lg font-medium text-gray-900 capitalize">{subscription.status || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Amount</p>
            <p className="text-lg font-medium text-gray-900">
              {subscription.amount && subscription.currency
                ? `${formatCurrency(subscription.amount / 100, undefined, subscription.currency)} / ${subscription.interval}`
                : 'N/A'
              }
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Next Billing Date</p>
            <p className="text-lg font-medium text-gray-900">
              {subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'N/A'}
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <Button
            variant="primary"
            onClick={handleOpenCustomerPortal}
            disabled={isUpdating}
            isLoading={isUpdating}
            icon={<ExternalLink className="w-4 h-4" />}
          >
            Open Stripe Customer Portal
          </Button>
          <p className="text-sm text-gray-600 mt-2">
            Manage payment methods, view invoices, and update billing information in Stripe's secure portal.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomCustomerPortal;
