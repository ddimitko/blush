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
  User,
  MapPin,
  ArrowLeft
} from 'lucide-react';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useToast } from '../ui/Toast';
import { apiClient } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

// Import the shared Stripe instance from context
import { useStripe as useStripeContext } from '../../contexts/StripeContext';

interface EnhancedSubscriptionSetupProps {
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

interface Plan {
  id: string;
  displayName: string;
  formattedPrice: string;
  interval: string;
  description: string;
  features?: string[];
  amount: number;
  currency: string;
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
    postalCodePattern: '^[0-9]{5}(-[0-9]{4})?$'
  },
  CA: {
    stateLabel: 'Province',
    stateRequired: true,
    postalCodeLabel: 'Postal Code',
    postalCodeRequired: true,
    postalCodePattern: '^[A-Za-z][0-9][A-Za-z] [0-9][A-Za-z][0-9]$'
  },
  GB: {
    stateLabel: 'County',
    stateRequired: false,
    postalCodeLabel: 'Postcode',
    postalCodeRequired: true,
    postalCodePattern: '^[A-Za-z]{1,2}[0-9Rr][0-9A-Za-z]? [0-9][ABD-HJLNP-UW-Zabd-hjlnp-uw-z]{2}$'
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

// Enhanced validation function
const validateCustomerInfo = (customerInfo: CustomerInfo, countryReqs: CountryRequirements): string | null => {
  if (!customerInfo.name.trim()) {
    return 'Full name is required';
  }
  
  if (!customerInfo.email.trim()) {
    return 'Email address is required';
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(customerInfo.email.trim())) {
    return 'Please enter a valid email address';
  }
  
  if (!customerInfo.billingAddress.line1.trim()) {
    return 'Billing address is required';
  }
  
  if (!customerInfo.billingAddress.city.trim()) {
    return 'City is required';
  }
  
  if (countryReqs.stateRequired && !customerInfo.billingAddress.state.trim()) {
    return `${countryReqs.stateLabel} is required for ${customerInfo.billingAddress.country}`;
  }
  
  if (countryReqs.postalCodeRequired && !customerInfo.billingAddress.postal_code.trim()) {
    return `${countryReqs.postalCodeLabel} is required for ${customerInfo.billingAddress.country}`;
  }
  
  if (countryReqs.postalCodePattern && customerInfo.billingAddress.postal_code.trim()) {
    const postalCodeRegex = new RegExp(countryReqs.postalCodePattern);
    if (!postalCodeRegex.test(customerInfo.billingAddress.postal_code.trim())) {
      return `Please enter a valid ${countryReqs.postalCodeLabel} for ${customerInfo.billingAddress.country}`;
    }
  }
  
  return null;
};

interface SubscriptionFormProps {
  shopId: string;
  selectedPlan: Plan;
  onSuccess: () => void;
  onBack: () => void;
}

const SubscriptionForm: FC<SubscriptionFormProps> = ({
  shopId,
  selectedPlan,
  onSuccess,
  onBack
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isElementsReady, setIsElementsReady] = useState(false);
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
  const { success, error } = useToast();

  // Pre-fill customer info on component mount
  useEffect(() => {
    loadShopOwnerInfo();
  }, [shopId]);

  const loadShopOwnerInfo = async () => {
    try {
      const [shop, currentUser] = await Promise.all([
        apiClient.getShopDetails(shopId),
        apiClient.getUserProfile().catch(() => null)
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
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !isElementsReady) {
      error('Error', 'Payment form is not ready. Please wait a moment and try again.');
      return;
    }

    const countryReqs = COUNTRY_REQUIREMENTS[customerInfo.billingAddress.country] || COUNTRY_REQUIREMENTS.US;
    
    // Validate customer information before proceeding
    const validationError = validateCustomerInfo(customerInfo, countryReqs);
    if (validationError) {
      error('Validation Error', validationError);
      return;
    }

    setIsProcessing(true);

    try {
      console.log('🔄 Creating subscription with validated customer details...');
      
      // Create subscription intent with validated customer details
      const response = await apiClient.createSubscriptionIntent(shopId, {
        stripePriceId: selectedPlan.id,
        customerName: customerInfo.name.trim(),
        customerEmail: customerInfo.email.trim(),
        billingAddress: customerInfo.billingAddress
      });

      if (!response.clientSecret) {
        throw new Error('Failed to initialize payment setup');
      }

      console.log('💳 Confirming payment with Stripe...');

      // Confirm payment with Stripe
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/shop/${shopId}/settings?tab=subscription&setup=complete`,
          payment_method_data: {
            billing_details: {
              name: customerInfo.name.trim(),
              email: customerInfo.email.trim(),
              address: {
                line1: customerInfo.billingAddress.line1.trim(),
                line2: customerInfo.billingAddress.line2?.trim() || undefined,
                city: customerInfo.billingAddress.city.trim(),
                state: customerInfo.billingAddress.state.trim(),
                postal_code: customerInfo.billingAddress.postal_code.trim(),
                country: customerInfo.billingAddress.country
              }
            }
          }
        },
        redirect: 'if_required'
      });

      if (confirmError) {
        console.error('❌ Payment confirmation failed:', confirmError);
        error('Payment Failed', confirmError.message || 'Failed to process payment');
      } else {
        console.log('✅ Payment confirmed successfully');
        success('Subscription Created', 'Your subscription has been activated successfully!');
        
        // Redirect to subscription management tab
        navigate(`/shop/${shopId}/settings?tab=subscription`);
        onSuccess();
      }
    } catch (err: any) {
      console.error('❌ Error creating subscription:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create subscription';
      error('Error', typeof errorMessage === 'string' ? errorMessage : 'Failed to create subscription');
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
          <div className="flex items-center mb-3">
            <User className="w-4 h-4 text-gray-600 mr-2" />
            <h4 className="text-sm font-medium text-gray-900">Billing Information</h4>
          </div>
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

          {/* Billing Address */}
          <div className="mt-4 space-y-4">
            <div className="flex items-center mb-2">
              <MapPin className="w-4 h-4 text-gray-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">Billing Address</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 1 *
              </label>
              <input
                type="text"
                required
                value={customerInfo.billingAddress.line1}
                onChange={(e) => setCustomerInfo(prev => ({
                  ...prev,
                  billingAddress: { ...prev.billingAddress, line1: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                placeholder="Street address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 2
              </label>
              <input
                type="text"
                value={customerInfo.billingAddress.line2 || ''}
                onChange={(e) => setCustomerInfo(prev => ({
                  ...prev,
                  billingAddress: { ...prev.billingAddress, line2: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                placeholder="Apartment, suite, etc. (optional)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={customerInfo.billingAddress.city}
                  onChange={(e) => setCustomerInfo(prev => ({
                    ...prev,
                    billingAddress: { ...prev.billingAddress, city: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {COUNTRY_REQUIREMENTS[customerInfo.billingAddress.country]?.stateLabel || 'State'}
                  {COUNTRY_REQUIREMENTS[customerInfo.billingAddress.country]?.stateRequired && ' *'}
                </label>
                <input
                  type="text"
                  required={COUNTRY_REQUIREMENTS[customerInfo.billingAddress.country]?.stateRequired}
                  value={customerInfo.billingAddress.state}
                  onChange={(e) => setCustomerInfo(prev => ({
                    ...prev,
                    billingAddress: { ...prev.billingAddress, state: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder={COUNTRY_REQUIREMENTS[customerInfo.billingAddress.country]?.stateLabel || 'State'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {COUNTRY_REQUIREMENTS[customerInfo.billingAddress.country]?.postalCodeLabel || 'Postal Code'} *
                </label>
                <input
                  type="text"
                  required
                  value={customerInfo.billingAddress.postal_code}
                  onChange={(e) => setCustomerInfo(prev => ({
                    ...prev,
                    billingAddress: { ...prev.billingAddress, postal_code: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder={COUNTRY_REQUIREMENTS[customerInfo.billingAddress.country]?.postalCodeLabel || 'Postal Code'}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country *
              </label>
              <select
                required
                value={customerInfo.billingAddress.country}
                onChange={(e) => setCustomerInfo(prev => ({
                  ...prev,
                  billingAddress: { ...prev.billingAddress, country: e.target.value, state: '', postal_code: '' }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="BG">Bulgaria</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center mb-3">
            <CreditCard className="w-4 h-4 text-gray-600 mr-2" />
            <h4 className="text-sm font-medium text-gray-900">Payment Method</h4>
          </div>
          <PaymentElement
            options={{
              layout: 'tabs',
              defaultValues: {
                billingDetails: {
                  name: customerInfo.name,
                  email: customerInfo.email,
                  address: {
                    line1: customerInfo.billingAddress.line1,
                    line2: customerInfo.billingAddress.line2,
                    city: customerInfo.billingAddress.city,
                    state: customerInfo.billingAddress.state,
                    postal_code: customerInfo.billingAddress.postal_code,
                    country: customerInfo.billingAddress.country
                  }
                }
              }
            }}
            onReady={() => {
              console.log('💳 PaymentElement is ready');
              setIsElementsReady(true);
            }}
            onLoadError={(loadError) => {
              console.error('💳 PaymentElement load error:', loadError);
              error('Error', 'Failed to load payment form. Please refresh and try again.');
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
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Plans
          </Button>
          <Button
            type="submit"
            disabled={!stripe || !isElementsReady || isProcessing}
            className="min-w-[140px]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : !isElementsReady ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
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

const EnhancedSubscriptionSetup: FC<EnhancedSubscriptionSetupProps> = ({
  shopId,
  onSubscriptionComplete
}) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<'plans' | 'payment'>('plans');
  const { error } = useToast();
  const { stripe: stripeInstance } = useStripeContext();

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
    try {
      setIsLoading(true);
      setSelectedPlan(plan);

      // Create subscription intent immediately when plan is selected
      const response = await apiClient.createSubscriptionIntent(shopId, {
        stripePriceId: plan.id,
        customerName: '', // Will be filled in the form
        customerEmail: '', // Will be filled in the form
        billingAddress: {
          line1: '',
          city: '',
          state: '',
          postal_code: '',
          country: 'US'
        }
      });

      if (response.clientSecret) {
        setClientSecret(response.clientSecret);
        setStep('payment');
      } else {
        throw new Error('Failed to initialize payment setup');
      }
    } catch (err: any) {
      console.error('Error selecting plan:', err);
      error('Error', err.response?.data?.message || 'Failed to initialize subscription setup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep('plans');
    setSelectedPlan(null);
    setClientSecret('');
  };

  if (isLoading && step === 'plans') {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (step === 'plans') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Plan</h2>
          <p className="text-gray-600">Select the perfect plan for your beauty business</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:border-accent-500 hover:shadow-lg transition-all duration-200 cursor-pointer"
              onClick={() => handlePlanSelect(plan)}
            >
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{plan.displayName}</h3>
                <div className="text-3xl font-bold text-gray-900 mb-1">{plan.formattedPrice}</div>
                <div className="text-sm text-gray-600 mb-4">per {plan.interval}</div>

                {plan.description && (
                  <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                )}

                {plan.features && plan.features.length > 0 && (
                  <ul className="text-sm text-gray-600 space-y-2 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}

                <Button className="w-full">
                  Select Plan
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          ))}
        </div>
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
        <SubscriptionForm
          shopId={shopId}
          selectedPlan={selectedPlan}
          onSuccess={onSubscriptionComplete}
          onBack={handleBack}
        />
      </Elements>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Setup Error</h3>
        <p className="text-gray-600 mb-4">There was an error setting up your subscription.</p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    </div>
  );
};

export default EnhancedSubscriptionSetup;
