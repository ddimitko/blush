import { useState, useEffect, FC, FormEvent } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Shield,
  Star,
  Users,
  Calendar,
  Zap
} from 'lucide-react';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useToast } from '../ui/Toast';
import { apiClient } from '../../lib/api';

// Import the shared Stripe instance from context
import { useStripe as useStripeContext } from '../../contexts/StripeContext';

interface IntegratedSubscriptionSetupProps {
  shopId: string;
  onSubscriptionComplete: () => void;
}

interface CustomerInfo {
  name: string;
  email: string;
  billingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

interface CountryRequirements {
  stateLabel: string;
  stateRequired: boolean;
  postalCodeLabel: string;
  postalCodeRequired: boolean;
  postalCodePattern?: string;
  states?: { value: string; label: string }[];
}

const COUNTRY_REQUIREMENTS: Record<string, CountryRequirements> = {
  US: {
    stateLabel: 'State',
    stateRequired: true,
    postalCodeLabel: 'ZIP Code',
    postalCodeRequired: true,
    postalCodePattern: '^[0-9]{5}(-[0-9]{4})?$',
    states: [
      { value: 'AL', label: 'Alabama' },
      { value: 'AK', label: 'Alaska' },
      { value: 'AZ', label: 'Arizona' },
      { value: 'AR', label: 'Arkansas' },
      { value: 'CA', label: 'California' },
      { value: 'CO', label: 'Colorado' },
      { value: 'CT', label: 'Connecticut' },
      { value: 'DE', label: 'Delaware' },
      { value: 'FL', label: 'Florida' },
      { value: 'GA', label: 'Georgia' },
      { value: 'HI', label: 'Hawaii' },
      { value: 'ID', label: 'Idaho' },
      { value: 'IL', label: 'Illinois' },
      { value: 'IN', label: 'Indiana' },
      { value: 'IA', label: 'Iowa' },
      { value: 'KS', label: 'Kansas' },
      { value: 'KY', label: 'Kentucky' },
      { value: 'LA', label: 'Louisiana' },
      { value: 'ME', label: 'Maine' },
      { value: 'MD', label: 'Maryland' },
      { value: 'MA', label: 'Massachusetts' },
      { value: 'MI', label: 'Michigan' },
      { value: 'MN', label: 'Minnesota' },
      { value: 'MS', label: 'Mississippi' },
      { value: 'MO', label: 'Missouri' },
      { value: 'MT', label: 'Montana' },
      { value: 'NE', label: 'Nebraska' },
      { value: 'NV', label: 'Nevada' },
      { value: 'NH', label: 'New Hampshire' },
      { value: 'NJ', label: 'New Jersey' },
      { value: 'NM', label: 'New Mexico' },
      { value: 'NY', label: 'New York' },
      { value: 'NC', label: 'North Carolina' },
      { value: 'ND', label: 'North Dakota' },
      { value: 'OH', label: 'Ohio' },
      { value: 'OK', label: 'Oklahoma' },
      { value: 'OR', label: 'Oregon' },
      { value: 'PA', label: 'Pennsylvania' },
      { value: 'RI', label: 'Rhode Island' },
      { value: 'SC', label: 'South Carolina' },
      { value: 'SD', label: 'South Dakota' },
      { value: 'TN', label: 'Tennessee' },
      { value: 'TX', label: 'Texas' },
      { value: 'UT', label: 'Utah' },
      { value: 'VT', label: 'Vermont' },
      { value: 'VA', label: 'Virginia' },
      { value: 'WA', label: 'Washington' },
      { value: 'WV', label: 'West Virginia' },
      { value: 'WI', label: 'Wisconsin' },
      { value: 'WY', label: 'Wyoming' }
    ]
  },
  CA: {
    stateLabel: 'Province',
    stateRequired: true,
    postalCodeLabel: 'Postal Code',
    postalCodeRequired: true,
    postalCodePattern: '^[A-Za-z][0-9][A-Za-z] [0-9][A-Za-z][0-9]$',
    states: [
      { value: 'AB', label: 'Alberta' },
      { value: 'BC', label: 'British Columbia' },
      { value: 'MB', label: 'Manitoba' },
      { value: 'NB', label: 'New Brunswick' },
      { value: 'NL', label: 'Newfoundland and Labrador' },
      { value: 'NS', label: 'Nova Scotia' },
      { value: 'ON', label: 'Ontario' },
      { value: 'PE', label: 'Prince Edward Island' },
      { value: 'QC', label: 'Quebec' },
      { value: 'SK', label: 'Saskatchewan' },
      { value: 'NT', label: 'Northwest Territories' },
      { value: 'NU', label: 'Nunavut' },
      { value: 'YT', label: 'Yukon' }
    ]
  },
  GB: {
    stateLabel: 'County',
    stateRequired: false,
    postalCodeLabel: 'Postcode',
    postalCodeRequired: true,
    postalCodePattern: '^[A-Za-z]{1,2}[0-9Rr][0-9A-Za-z]? [0-9][ABD-HJLNP-UW-Zabd-hjlnp-uw-z]{2}$'
  },
  AU: {
    stateLabel: 'State',
    stateRequired: true,
    postalCodeLabel: 'Postcode',
    postalCodeRequired: true,
    postalCodePattern: '^[0-9]{4}$',
    states: [
      { value: 'NSW', label: 'New South Wales' },
      { value: 'VIC', label: 'Victoria' },
      { value: 'QLD', label: 'Queensland' },
      { value: 'WA', label: 'Western Australia' },
      { value: 'SA', label: 'South Australia' },
      { value: 'TAS', label: 'Tasmania' },
      { value: 'ACT', label: 'Australian Capital Territory' },
      { value: 'NT', label: 'Northern Territory' }
    ]
  },
  DE: {
    stateLabel: 'State',
    stateRequired: false,
    postalCodeLabel: 'Postal Code',
    postalCodeRequired: true,
    postalCodePattern: '^[0-9]{5}$'
  },
  FR: {
    stateLabel: 'Region',
    stateRequired: false,
    postalCodeLabel: 'Postal Code',
    postalCodeRequired: true,
    postalCodePattern: '^[0-9]{5}$'
  },
  BG: {
    stateLabel: 'Province',
    stateRequired: false,
    postalCodeLabel: 'Postal Code',
    postalCodeRequired: true,
    postalCodePattern: '^[0-9]{4}$'
  }
};

interface Plan {
  id: string;
  displayName: string;
  formattedPrice: string;
  interval: string;
  description: string;
  features?: string[];
  isYearly?: boolean;
  savings?: string;
  amount: number;
  currency: string;
}

interface SubscriptionSetupFormProps {
  shopId: string;
  selectedPlan: Plan;
  onSuccess: () => void;
  onBack: () => void;
}

const SubscriptionSetupForm: FC<SubscriptionSetupFormProps> = ({
  shopId,
  selectedPlan,
  onSuccess,
  onBack
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    billingAddress: {
      line1: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US'
    }
  });
  const { success, error } = useToast();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Create subscription with payment intent
      const response = await apiClient.createSubscription(shopId, {
        stripePriceId: selectedPlan.id,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        billingAddress: customerInfo.billingAddress
      });

      // Confirm payment with Stripe
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/shop/${shopId}/settings?tab=subscription&setup=complete`,
          payment_method_data: {
            billing_details: {
              name: customerInfo.name,
              email: customerInfo.email,
              address: customerInfo.billingAddress
            }
          }
        },
        redirect: 'if_required'
      });

      if (confirmError) {
        error('Payment Failed', confirmError.message || 'Failed to process payment');
      } else {
        success('Subscription Created', 'Your subscription has been activated successfully!');
        onSuccess();
      }
    } catch (err: any) {
      console.error('Error creating subscription:', err);
      error('Error', err.response?.data?.message || 'Failed to create subscription');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Complete Your Subscription</h3>
          <div className="text-right">
            <div className="text-sm text-gray-600">{selectedPlan.displayName}</div>
            <div className="text-lg font-semibold text-gray-900">{selectedPlan.formattedPrice}</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Billing Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                placeholder="Enter your email"
              />
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Payment Method</h4>
          <PaymentElement 
            options={{
              layout: 'tabs',
              defaultValues: {
                billingDetails: {
                  name: customerInfo.name,
                  email: customerInfo.email
                }
              }
            }}
          />
        </div>

        {/* Security Notice */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          <Shield className="w-4 h-4 text-blue-600" />
          <span>Your payment information is secured with industry-standard encryption</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isProcessing}
          >
            Back to Plans
          </Button>
          <Button
            type="submit"
            disabled={!stripe || isProcessing}
            className="min-w-[140px]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Subscribe Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

const IntegratedSubscriptionSetup: FC<IntegratedSubscriptionSetupProps> = ({
  shopId,
  onSubscriptionComplete
}) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<'plans' | 'customer' | 'payment'>('plans');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    email: '',
    billingAddress: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US'
    }
  });
  const { error, success } = useToast();
  const { stripe: stripeInstance } = useStripeContext();

  useEffect(() => {
    loadPlans();
    loadShopOwnerInfo();
  }, []);

  const loadShopOwnerInfo = async () => {
    try {
      // Pre-fill customer info with shop and current user details
      const [shop, currentUser] = await Promise.all([
        apiClient.getShopDetails(shopId),
        apiClient.getUserProfile().catch(() => null) // Don't fail if user is not authenticated
      ]);

      setCustomerInfo(prev => ({
        ...prev,
        name: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : shop.name,
        email: currentUser?.email || shop.email || '',
        billingAddress: {
          ...prev.billingAddress,
          line1: shop.address || '',
          city: shop.city || '',
          state: shop.state || '',
          postal_code: shop.postalCode || '',
          country: shop.country || 'US'
        }
      }));
    } catch (err) {
      console.error('Error loading shop owner info:', err);
      // Continue without pre-filling if there's an error
    }
  };

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

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    setStep('customer');
  };

  const handleCustomerInfoSubmit = async () => {
    try {
      setIsLoading(true);

      const countryReqs = COUNTRY_REQUIREMENTS[customerInfo.billingAddress.country] || COUNTRY_REQUIREMENTS.US;

      // Validate customer info based on country requirements
      if (!customerInfo.name.trim() || !customerInfo.email.trim() ||
          !customerInfo.billingAddress.line1.trim() || !customerInfo.billingAddress.city.trim()) {
        error('Error', 'Please fill in all required billing information');
        return;
      }

      // Country-specific validation
      if (countryReqs.stateRequired && !customerInfo.billingAddress.state.trim()) {
        error('Error', `${countryReqs.stateLabel} is required for ${customerInfo.billingAddress.country}`);
        return;
      }

      if (countryReqs.postalCodeRequired && !customerInfo.billingAddress.postal_code.trim()) {
        error('Error', `${countryReqs.postalCodeLabel} is required for ${customerInfo.billingAddress.country}`);
        return;
      }

      // Postal code format validation
      if (countryReqs.postalCodePattern && customerInfo.billingAddress.postal_code.trim()) {
        const postalCodeRegex = new RegExp(countryReqs.postalCodePattern);
        if (!postalCodeRegex.test(customerInfo.billingAddress.postal_code.trim())) {
          error('Error', `Please enter a valid ${countryReqs.postalCodeLabel} for ${customerInfo.billingAddress.country}`);
          return;
        }
      }

      if (!selectedPlan) {
        error('Error', 'No plan selected');
        return;
      }

      // Create subscription intent with customer details
      const response = await apiClient.createSubscriptionIntent(shopId, {
        stripePriceId: selectedPlan.id,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        billingAddress: customerInfo.billingAddress
      });

      if (response.clientSecret) {
        // Payment required - proceed to payment step
        setClientSecret(response.clientSecret);
        setStep('payment');
      } else if (response.subscriptionId) {
        // Subscription created successfully but no payment required (free trial, zero amount, etc.)
        success('Success', 'Subscription created successfully! No payment required.');
        onSubscriptionComplete?.();
      } else {
        error('Error', 'Failed to create subscription');
      }
    } catch (err: any) {
      console.error('Error creating subscription intent:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to initialize payment setup';
      error('Error', typeof errorMessage === 'string' ? errorMessage : 'Failed to initialize payment setup');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (step === 'customer' && selectedPlan) {
    const countryReqs = COUNTRY_REQUIREMENTS[customerInfo.billingAddress.country] || COUNTRY_REQUIREMENTS.US;

    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Billing Information</h3>
          <p className="text-gray-600">
            Complete your billing details for the {selectedPlan.displayName} plan
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-semibold text-gray-900">{selectedPlan.displayName}</h4>
              <p className="text-sm text-gray-600">{selectedPlan.description}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{selectedPlan.formattedPrice}</div>
              <div className="text-sm text-gray-600">per {selectedPlan.interval}</div>
            </div>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleCustomerInfoSubmit(); }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address Line 1 *
            </label>
            <input
              type="text"
              value={customerInfo.billingAddress.line1}
              onChange={(e) => setCustomerInfo(prev => ({
                ...prev,
                billingAddress: { ...prev.billingAddress, line1: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address Line 2
            </label>
            <input
              type="text"
              value={customerInfo.billingAddress.line2 || ''}
              onChange={(e) => setCustomerInfo(prev => ({
                ...prev,
                billingAddress: { ...prev.billingAddress, line2: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City *
              </label>
              <input
                type="text"
                value={customerInfo.billingAddress.city}
                onChange={(e) => setCustomerInfo(prev => ({
                  ...prev,
                  billingAddress: { ...prev.billingAddress, city: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {countryReqs.stateLabel} {countryReqs.stateRequired ? '*' : ''}
              </label>
              {countryReqs.states ? (
                <select
                  value={customerInfo.billingAddress.state}
                  onChange={(e) => setCustomerInfo(prev => ({
                    ...prev,
                    billingAddress: { ...prev.billingAddress, state: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  required={countryReqs.stateRequired}
                >
                  <option value="">Select {countryReqs.stateLabel}</option>
                  {countryReqs.states.map(state => (
                    <option key={state.value} value={state.value}>
                      {state.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={customerInfo.billingAddress.state}
                  onChange={(e) => setCustomerInfo(prev => ({
                    ...prev,
                    billingAddress: { ...prev.billingAddress, state: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  required={countryReqs.stateRequired}
                  placeholder={`Enter ${countryReqs.stateLabel}`}
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {countryReqs.postalCodeLabel} {countryReqs.postalCodeRequired ? '*' : ''}
              </label>
              <input
                type="text"
                value={customerInfo.billingAddress.postal_code}
                onChange={(e) => setCustomerInfo(prev => ({
                  ...prev,
                  billingAddress: { ...prev.billingAddress, postal_code: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                required={countryReqs.postalCodeRequired}
                placeholder={`Enter ${countryReqs.postalCodeLabel}`}
                pattern={countryReqs.postalCodePattern}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country *
            </label>
            <select
              value={customerInfo.billingAddress.country}
              onChange={(e) => setCustomerInfo(prev => ({
                ...prev,
                billingAddress: {
                  ...prev.billingAddress,
                  country: e.target.value,
                  state: '', // Reset state when country changes
                  postal_code: '' // Reset postal code when country changes
                }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              required
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="GB">United Kingdom</option>
              <option value="AU">Australia</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="BG">Bulgaria</option>
            </select>
          </div>

          <div className="flex space-x-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('plans')}
              className="flex-1"
            >
              Back to Plans
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Continue to Payment
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  if (step === 'payment' && selectedPlan && clientSecret) {
    const appearance = {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#6366f1',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#ef4444',
        fontFamily: 'Inter, system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '6px'
      }
    };

    return (
      <Elements
        stripe={stripeInstance}
        options={{
          clientSecret,
          appearance
        }}
      >
        <SubscriptionSetupForm
          shopId={shopId}
          selectedPlan={selectedPlan}
          onSuccess={onSubscriptionComplete}
          onBack={() => setStep('customer')}
        />
      </Elements>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Plan</h3>
        <p className="text-gray-600">Select the perfect plan for your beauty business</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="relative bg-white border border-gray-200 rounded-lg p-6 hover:border-accent-500 hover:shadow-lg transition-all duration-200 cursor-pointer"
            onClick={() => handlePlanSelect(plan)}
          >
            {plan.isYearly && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-accent-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                  {plan.savings} OFF
                </span>
              </div>
            )}

            <div className="text-center mb-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">{plan.displayName}</h4>
              <div className="text-3xl font-bold text-gray-900 mb-1">{plan.formattedPrice}</div>
              <div className="text-sm text-gray-600">per {plan.interval}</div>
            </div>

            <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

            {plan.features && (
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            )}

            <Button className="w-full" variant="outline">
              Select Plan
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
          <div className="flex items-center">
            <Shield className="w-4 h-4 mr-1" />
            Secure Payment
          </div>
          <div className="flex items-center">
            <Star className="w-4 h-4 mr-1" />
            Cancel Anytime
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1" />
            24/7 Support
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegratedSubscriptionSetup;
