import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import {
  CreditCard,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Shield,
  Lock,
  CheckCircle
} from 'lucide-react';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useToast } from '../ui/Toast';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import PlanSelection from './PlanSelection';
import CustomerDetailsForm from './CustomerDetailsForm';

const stripePromise = loadStripe('pk_test_51QtTgOE2dBEKUmD174iW0Lk9h9YazQfOrfLeACcAlYfHoFDyUww1VP4gTILNwfZC7y1cTLO0vBY5tYPHahyCuPsz008YkKGJlv');

interface ExistingShopSubscriptionSetupProps {
  shopId: string;
  onSubscriptionComplete: () => void;
  existingStripeDetails?: any;
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

type SetupStep = 'plans' | 'customer' | 'payment' | 'success';

interface PaymentFormProps {
  selectedPlan: Plan;
  shopId: string;
  setupIntent: any;
  onPaymentComplete: () => void;
  onBack: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  selectedPlan,
  shopId,
  setupIntent,
  onPaymentComplete,
  onBack
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { success, error: showError } = useToast();
  const { user, checkAuth } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setError('Stripe has not loaded yet. Please wait and try again.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Step C: Confirm SetupIntent with payment method (no redirect)
      const { error: confirmError, setupIntent: confirmedSetupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      });

      if (confirmError) {
        throw new Error(confirmError.message || 'Payment setup failed');
      }

      if (confirmedSetupIntent?.status === 'succeeded') {
        // Step D: Ensure user has OWNER role before subscription confirmation
        console.log('🔄 Checking user role before subscription confirmation...');

        // Check if user has OWNER role, if not, refresh auth data
        if (user?.role !== 'OWNER') {
          console.log('⚠️ User does not have OWNER role, refreshing authentication...');
          try {
            await checkAuth();
            console.log('✅ User authentication refreshed successfully');

            // Small delay to ensure role update is processed
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (refreshError) {
            console.warn('⚠️ Failed to refresh user authentication:', refreshError);
            throw new Error('Unable to verify user permissions. Please refresh the page and try again.');
          }
        }

        // Step D: Activate subscription for existing shop
        const confirmResult = await apiClient.confirmSetupAndActivateSubscription(shopId, confirmedSetupIntent.id);

        if (confirmResult.success) {
          console.log('✅ Subscription activation successful, calling onPaymentComplete');
          onPaymentComplete();
        } else {
          throw new Error(confirmResult.message || 'Failed to activate subscription');
        }
      } else {
        throw new Error('Payment setup was not completed successfully');
      }
    } catch (err: any) {
      console.error('Error processing payment:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to process payment';
      setError(errorMessage);
      showError('Payment Failed', errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Security Notice */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start space-x-2">
        <Shield className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium">Secure Payment Setup</p>
          <p>Your payment information is encrypted and secure. We use Stripe for payment processing.</p>
        </div>
      </div>

      {/* Payment Element */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Payment Method</h3>
        <div className="border border-gray-300 rounded-lg p-4">
          <PaymentElement />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isProcessing}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Plan
        </Button>

        <Button
          type="submit"
          variant="primary"
          disabled={!stripe || !elements || isProcessing}
          isLoading={isProcessing}
          loadingText="Processing..."
          icon={isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
        >
          {isProcessing ? 'Activating Subscription...' : 'Complete Setup'}
        </Button>
      </div>
    </form>
  );
};

const ExistingShopSubscriptionSetup: React.FC<ExistingShopSubscriptionSetupProps> = ({
  shopId,
  onSubscriptionComplete,
  existingStripeDetails
}) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
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
  const [setupIntent, setSetupIntent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingShopInfo, setIsLoadingShopInfo] = useState(true);
  const [step, setStep] = useState<SetupStep>('plans');
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const { error: showError, success } = useToast();

  const loadPlans = async () => {
    try {
      const response = await apiClient.getSubscriptionPlans();
      setPlans(response);
    } catch (err: any) {
      console.error('Error loading plans:', err);
      setError('Failed to load subscription plans');
      showError('Error', 'Failed to load subscription plans');
    }
  };

  const loadShopOwnerInfo = async () => {
    try {
      setIsLoadingShopInfo(true);
      // Get shop details to pre-fill customer information
      const shopResponse = await apiClient.getShopDetails(shopId);
      console.log('Shop response for pre-filling:', shopResponse);

      if (shopResponse.owner) {
        const ownerName = `${shopResponse.owner.firstName || ''} ${shopResponse.owner.lastName || ''}`.trim();
        console.log('Pre-filling customer info with:', {
          name: ownerName,
          email: shopResponse.owner.email,
          address: shopResponse.address
        });

        setCustomerInfo(prev => ({
          ...prev,
          name: ownerName,
          email: shopResponse.owner.email || '',
          billingAddress: {
            ...prev.billingAddress,
            line1: shopResponse.address || '',
            city: shopResponse.city || '',
            state: shopResponse.state || '',
            postal_code: shopResponse.postalCode || '',
            country: shopResponse.country || 'US'
          }
        }));
      }
    } catch (err: any) {
      console.error('Error loading shop owner info:', err);
      // Don't show error to user, just continue with empty form
    } finally {
      setIsLoadingShopInfo(false);
    }
  };

  const createSetupIntent = async (customerDetails: CustomerInfo) => {
    if (!selectedPlan) {
      showError('Error', 'No plan selected');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Step A: Create SetupIntent for existing shop subscription with plan and customer details
      const setupData = {
        stripePriceId: selectedPlan.id,
        customerName: customerDetails.name.trim(),
        customerEmail: customerDetails.email.trim(),
        billingAddress: customerDetails.billingAddress
      };

      console.log('Creating subscription setup intent for existing shop:', setupData);

      const response = await apiClient.createSubscriptionSetupPaymentIntent(shopId, setupData);
      console.log('Setup intent response:', response);

      if (response.clientSecret && response.setupIntentId) {
        setSetupIntent(response);
        setStep('payment');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Error creating setup intent:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to initialize payment setup';
      setError(errorMessage);
      showError('Setup Error', errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    setStep('customer');
  };

  const handleCustomerDetailsComplete = (details: CustomerInfo) => {
    setCustomerInfo(details);
    createSetupIntent(details);
  };

  const handlePaymentSuccess = () => {
    success('Success', 'Subscription activated successfully!');
    setStep('success');
    setTimeout(() => {
      onSubscriptionComplete();
    }, 2000);
  };

  const handleBack = () => {
    switch (step) {
      case 'customer':
        setStep('plans');
        break;
      case 'payment':
        setStep('customer');
        setSetupIntent(null);
        break;
      default:
        break;
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    if (selectedPlan && customerInfo.name && customerInfo.email) {
      createSetupIntent(customerInfo);
    } else {
      loadPlans();
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          loadPlans(),
          loadShopOwnerInfo()
        ]);
      } catch (err) {
        console.error('Error loading initial data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [shopId]);

  // Auto-retry logic for transient errors
  useEffect(() => {
    if (error && retryCount < 2 && (
      error.includes('Server error') ||
      error.includes('network') ||
      error.includes('timeout')
    )) {
      const timer = setTimeout(() => {
        handleRetry();
      }, 2000 * (retryCount + 1)); // Exponential backoff

      return () => clearTimeout(timer);
    }
  }, [error, retryCount]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">
          {step === 'plans' ? 'Loading subscription plans...' :
           retryCount > 0 ? `Retrying... (${retryCount}/2)` : 'Initializing payment setup...'}
        </span>
      </div>
    );
  }

  if (error && retryCount >= 2) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Setup Failed</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={handleRetry} variant="primary">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Setup Required Alert */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
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

      {/* Step Content */}
      {step === 'plans' && (
        <PlanSelection
          plans={plans}
          onPlanSelect={handlePlanSelect}
          isLoading={isLoading}
        />
      )}

      {step === 'customer' && selectedPlan && (
        isLoadingShopInfo ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-gray-600">Loading customer details...</span>
          </div>
        ) : (
          <CustomerDetailsForm
            initialCustomerInfo={customerInfo}
            selectedPlan={selectedPlan}
            onComplete={handleCustomerDetailsComplete}
            onBack={handleBack}
            isProcessing={isProcessing}
          />
        )
      )}

      {step === 'payment' && selectedPlan && setupIntent && (
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <CreditCard className="w-16 h-16 text-accent-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Subscription Setup</h2>
            <p className="text-gray-600">
              Activate your {selectedPlan.displayName} subscription to make your shop visible to customers.
            </p>
          </div>

          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: setupIntent.clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#6366f1',
                  colorBackground: '#ffffff',
                  colorText: '#1f2937',
                  colorDanger: '#ef4444',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  spacingUnit: '4px',
                  borderRadius: '8px',
                }
              }
            }}
          >
            <PaymentForm
              selectedPlan={selectedPlan}
              shopId={shopId}
              setupIntent={setupIntent}
              onPaymentComplete={handlePaymentSuccess}
              onBack={handleBack}
            />
          </Elements>
        </div>
      )}

      {step === 'success' && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Subscription Activated Successfully!
          </h3>
          <p className="text-gray-600 mb-4">
            Your shop is now active and visible to customers.
          </p>
          <div className="flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span className="text-sm text-gray-500">Refreshing subscription details...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExistingShopSubscriptionSetup;
