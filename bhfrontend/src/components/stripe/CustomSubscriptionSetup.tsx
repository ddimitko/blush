import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ArrowRight,
  Shield
} from 'lucide-react';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useToast } from '../ui/Toast';
import { apiClient } from '../../lib/api';

// const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY!);

interface CustomSubscriptionSetupProps {
  shopId: string;
  onSubscriptionCreated: () => void;
}

interface Plan {
  id: string;
  displayName: string;
  formattedPrice: string;
  interval: string;
  description: string;
  features?: string[];
  isYearly?: boolean;
  savings?: string;
}

const CustomSubscriptionSetup: React.FC<CustomSubscriptionSetupProps> = ({
  shopId,
  onSubscriptionCreated
}) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const { success, error } = useToast();

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getSubscriptionPlans();
      setPlans(response);
    } catch (err: any) {
      console.error('Error loading plans:', err);
      error('Error', 'Failed to load subscription plans');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSelect = async (plan: Plan) => {
    if (!customerName.trim() || !customerEmail.trim()) {
      error('Validation Error', 'Please fill in customer name and email first');
      return;
    }

    try {
      setIsLoading(true);
      setSelectedPlan(plan);

      // Create subscription and redirect to Stripe Checkout
      const response = await apiClient.createSubscription(shopId, {
        stripePriceId: plan.id,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim()
      });

      if (response.checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = response.checkoutUrl;
      } else {
        // Subscription created successfully without payment required (free trial)
        success('Subscription Created', 'Your subscription has been activated');
        onSubscriptionCreated();
      }
    } catch (err: any) {
      console.error('Error creating subscription:', err);
      error('Error', err.response?.data?.message || 'Failed to create subscription');
    } finally {
      setIsLoading(false);
    }
  };

  // Removed handleBackToPlans as we're not using multi-step flow

  if (isLoading && plans.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <CreditCard className="w-16 h-16 text-accent-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choose Your Subscription Plan
        </h2>
        <p className="text-gray-600">
          Select a plan to activate your shop and start accepting bookings.
        </p>
      </div>

      {/* Setup Required Alert */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-amber-800">
              Subscription Required
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              Your shop is currently inactive. Complete your subscription setup to activate your shop and make it visible to customers.
            </p>
          </div>
        </div>
      </div>

      <PlanSelectionStep
        plans={plans}
        customerName={customerName}
        customerEmail={customerEmail}
        onCustomerNameChange={setCustomerName}
        onCustomerEmailChange={setCustomerEmail}
        onPlanSelect={handlePlanSelect}
        isLoading={isLoading}
      />

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">
              Secure Payment Processing
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              Your payment information is processed securely by Stripe. We never store your card details on our servers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface PlanSelectionStepProps {
  plans: Plan[];
  customerName: string;
  customerEmail: string;
  onCustomerNameChange: (name: string) => void;
  onCustomerEmailChange: (email: string) => void;
  onPlanSelect: (plan: Plan) => void;
  isLoading: boolean;
}

const PlanSelectionStep: React.FC<PlanSelectionStepProps> = ({
  plans,
  customerName,
  customerEmail,
  onCustomerNameChange,
  onCustomerEmailChange,
  onPlanSelect,
  isLoading
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
      {/* Customer Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Billing Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => onCustomerNameChange(e.target.value)}
              placeholder="Full name for billing"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => onCustomerEmailChange(e.target.value)}
              placeholder="Email for billing and receipts"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              required
            />
          </div>
        </div>
      </div>

      {/* Plan Selection */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Choose Your Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-all"
            >
              <div className="text-center">
                <h4 className="text-lg font-semibold text-gray-900">{plan.displayName}</h4>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-gray-900">{plan.formattedPrice}</span>
                  <span className="text-gray-600">/{plan.interval}</span>
                </div>
                {plan.isYearly && plan.savings && (
                  <div className="mt-2">
                    <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      {plan.savings}
                    </span>
                  </div>
                )}
                <p className="text-gray-600 mt-2 text-sm">{plan.description}</p>
                
                {plan.features && plan.features.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-gray-600">
                    {plan.features.slice(0, 3).map((feature: string, index: number) => (
                      <li key={index} className="flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-4">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onPlanSelect(plan)}
                    disabled={!customerName.trim() || !customerEmail.trim() || isLoading}
                    isLoading={isLoading}
                    icon={<ArrowRight className="w-4 h-4" />}
                    iconPosition="right"
                    className="w-full"
                  >
                    Select Plan
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// PaymentStep component removed - using external Stripe Checkout instead

export default CustomSubscriptionSetup;
