import React, { useState, useEffect, useRef } from 'react';
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
  Lock
} from 'lucide-react';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useToast } from '../ui/Toast';
import apiClient from '../../lib/api';

const stripePromise = loadStripe('pk_test_51QtTgOE2dBEKUmD174iW0Lk9h9YazQfOrfLeACcAlYfHoFDyUww1VP4gTILNwfZC7y1cTLO0vBY5tYPHahyCuPsz008YkKGJlv');

interface ShopCreationPaymentFormProps {
  selectedPlan: any;
  formData: any;
  onPaymentComplete: () => void;
  onBack?: () => void;
  hideBackButton?: boolean;
  hideCompleteButton?: boolean;
}

interface PaymentFormProps {
  selectedPlan: any;
  formData: any;
  setupIntent: any;
  onPaymentComplete: () => void;
  onBack?: () => void;
  hideBackButton?: boolean;
  hideCompleteButton?: boolean;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  selectedPlan,
  formData,
  setupIntent,
  onPaymentComplete,
  onBack,
  hideBackButton = false,
  hideCompleteButton = false
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { success, error: showError } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setError('Stripe has not loaded yet. Please wait and try again.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Step B & C: Confirm the SetupIntent with the payment method
      const { error: confirmError, setupIntent: confirmedSetupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/shop-creation-success`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        throw new Error(confirmError.message || 'Payment setup failed');
      }

      if (confirmedSetupIntent?.status === 'succeeded') {
        // Step D: Create shop with subscription
        const shopData = {
          name: formData.name,
          description: formData.description,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
          country: formData.country,
          phone: formData.phone,
          email: formData.email,
          website: formData.website,
          businessTypes: formData.businessTypes,
          acceptsCardPayments: false,
          termsAccepted: formData.termsAccepted,
          latitude: formData.latitude,
          longitude: formData.longitude,
        };

        const confirmData = {
          setupIntentId: confirmedSetupIntent.id,
          shopData: shopData,
        };

        const response = await apiClient.confirmSetupAndCreateShop(confirmData);

        if (response.success) {
          console.log('✅ Shop creation successful, calling onPaymentComplete');

          // Trigger custom event for external button
          window.dispatchEvent(new CustomEvent('payment-complete'));

          onPaymentComplete();
        } else {
          throw new Error(response.message || 'Failed to create shop');
        }
      } else {
        throw new Error('Payment setup was not completed successfully');
      }
    } catch (err: any) {
      console.error('Payment setup failed:', err);
      let errorMessage = 'Payment setup failed. Please try again.';

      // Handle specific error types
      if (err.type === 'card_error') {
        errorMessage = err.message || 'Your card was declined. Please try a different payment method.';
      } else if (err.type === 'validation_error') {
        errorMessage = 'Please check your payment information and try again.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      showError('Payment Failed', errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-payment-form>
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
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CreditCard className="w-5 h-5 mr-2" />
          Payment Method
        </h3>
        
        <PaymentElement
          options={{
            layout: 'tabs',
            defaultValues: {
              billingDetails: {
                name: formData.customerName,
                email: formData.customerEmail,
                phone: formData.customerPhone,
                address: {
                  line1: formData.billingAddressLine1,
                  line2: formData.billingAddressLine2,
                  city: formData.billingCity,
                  state: formData.billingState,
                  postal_code: formData.billingPostalCode,
                  country: formData.billingCountry,
                },
              },
            },
          }}
        />
      </div>

      {/* Action Buttons */}
      {(!hideBackButton || !hideCompleteButton) && (
        <div className={`flex pt-6 ${hideBackButton ? 'justify-end' : hideCompleteButton ? 'justify-start' : 'justify-between'}`}>
          {!hideBackButton && onBack && (
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={isProcessing}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Plan
            </Button>
          )}

          {!hideCompleteButton && (
            <Button
              type="submit"
              variant="primary"
              disabled={!stripe || !elements || isProcessing}
              isLoading={isProcessing}
              loadingText="Processing..."
              icon={isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            >
              {isProcessing ? 'Creating Shop...' : 'Complete Setup'}
            </Button>
          )}
        </div>
      )}
    </form>
  );
};

const ShopCreationPaymentForm: React.FC<ShopCreationPaymentFormProps> = ({
  selectedPlan,
  formData,
  onPaymentComplete,
  onBack,
  hideBackButton = false,
  hideCompleteButton = false
}) => {
  const [setupIntent, setSetupIntent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { error: showError } = useToast();

  // Prevent duplicate setup intent creation
  const isCreatingRef = useRef(false);
  const creationAttemptedRef = useRef(false);

  const createSetupIntent = async () => {
    // Prevent duplicate creation
    if (isCreatingRef.current || setupIntent || creationAttemptedRef.current) {
      console.log('💳 SHOP CREATION: Skipping setup intent creation - already in progress or exists');
      return;
    }

    try {
      isCreatingRef.current = true;
      creationAttemptedRef.current = true;
      setIsLoading(true);
      setError(null);

      console.log('💳 SHOP CREATION: Creating setup intent for shop creation');

      // Step A: Create SetupIntent
      const setupData = {
        stripePriceId: selectedPlan.id,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        billingAddressLine1: formData.billingAddressLine1,
        billingAddressLine2: formData.billingAddressLine2,
        billingCity: formData.billingCity,
        billingState: formData.billingState,
        billingPostalCode: formData.billingPostalCode,
        billingCountry: formData.billingCountry,
      };

      const response = await apiClient.createSetupIntent(setupData);
      setSetupIntent(response);
      setRetryCount(0); // Reset retry count on success
      console.log('✅ SHOP CREATION: Setup intent created successfully');
    } catch (err: any) {
      console.error('Setup intent creation failed:', err);
      let errorMessage = 'Failed to initialize payment setup';

      // Handle specific error types
      if (err.response?.status === 400) {
        errorMessage = 'Invalid payment setup data. Please check your information and try again.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in and try again.';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Server error. Please try again in a few moments.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      showError('Setup Failed', errorMessage);
      // Reset creation attempted flag on error to allow retry
      creationAttemptedRef.current = false;
    } finally {
      setIsLoading(false);
      isCreatingRef.current = false;
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    // Reset creation flags to allow retry
    isCreatingRef.current = false;
    creationAttemptedRef.current = false;
    setSetupIntent(null);
    createSetupIntent();
  };

  useEffect(() => {
    // Only create setup intent once when component mounts
    if (!creationAttemptedRef.current) {
      createSetupIntent();
    }

    // Cleanup function
    return () => {
      isCreatingRef.current = false;
    };
  }, []); // Empty dependency array to run only once

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
          {retryCount > 0 ? `Retrying... (${retryCount}/2)` : 'Initializing payment setup...'}
        </span>
      </div>
    );
  }

  if (error || !setupIntent) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">Setup Failed</p>
            <p className="text-sm text-red-600">{error || 'Failed to initialize payment setup'}</p>
            {retryCount < 3 && (
              <p className="text-xs text-red-500 mt-1">
                {retryCount > 0 && 'Auto-retrying... '}
                You can also try again manually.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={onBack}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Plan
          </Button>

          <Button
            variant="primary"
            onClick={handleRetry}
            disabled={retryCount >= 3}
          >
            {retryCount >= 3 ? 'Max Retries Reached' : 'Try Again'}
          </Button>
        </div>
      </div>
    );
  }


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
      stripe={stripePromise}
      options={{
        clientSecret: setupIntent.clientSecret,
        appearance
      }}
    >
      <PaymentForm
        selectedPlan={selectedPlan}
        formData={formData}
        setupIntent={setupIntent}
        onPaymentComplete={onPaymentComplete}
        onBack={onBack}
        hideBackButton={hideBackButton}
        hideCompleteButton={hideCompleteButton}
      />
    </Elements>
  );
};

export default ShopCreationPaymentForm;
