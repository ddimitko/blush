import React, { useState, FormEvent } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import {
  CreditCard,
  ArrowLeft,
  ArrowRight,
  Shield,
  Loader2,
  AlertCircle
} from 'lucide-react';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';
import { apiClient } from '../../lib/api';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY!);

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

interface SubscriptionPaymentFormProps {
  selectedPlan: Plan;
  customerInfo: CustomerInfo;
  clientSecret: string;
  paymentIntentId: string;
  shopId: string;
  onSuccess: () => void;
  onBack: () => void;
}

interface PaymentFormProps {
  selectedPlan: Plan;
  customerInfo: CustomerInfo;
  paymentIntentId: string;
  shopId: string;
  onSuccess: () => void;
  onBack: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  selectedPlan,
  customerInfo,
  paymentIntentId,
  shopId,
  onSuccess,
  onBack
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { error } = useToast();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setErrorMessage(submitError.message || 'Payment submission failed');
        return;
      }

      const { error: confirmError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/subscription-success`
        },
        redirect: 'if_required'
      });

      if (confirmError) {
        setErrorMessage(confirmError.message || 'Setup confirmation failed');
      } else if (setupIntent && setupIntent.status === 'succeeded') {
        // Setup succeeded, now create and activate the subscription
        try {
          console.log('Setup succeeded, creating subscription...');
          const confirmResult = await apiClient.confirmSubscription(shopId, paymentIntentId);
          if (confirmResult.success) {
            console.log('Subscription created and activated successfully');
            onSuccess();
          } else {
            setErrorMessage('Setup succeeded but subscription creation failed. Please contact support.');
          }
        } catch (confirmErr: any) {
          console.error('Error creating subscription after setup:', confirmErr);
          setErrorMessage('Setup succeeded but subscription creation failed. Please contact support.');
        }
      } else {
        setErrorMessage('Setup confirmation completed but status is unclear. Please contact support.');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setErrorMessage('An unexpected error occurred during payment');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Method Setup
        </h2>
        <p className="text-gray-600">
          Add your payment method to activate your subscription
        </p>
      </div>

      {/* Selected Plan Summary */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-indigo-900">
              {selectedPlan.displayName}
            </h3>
            <p className="text-sm text-indigo-700">
              {selectedPlan.formattedPrice}/{selectedPlan.interval}
            </p>
          </div>
          {selectedPlan.savings && (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
              {selectedPlan.savings}
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Element */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Payment Method
          </h3>
          
          <div className="mb-4">
            <PaymentElement
              options={{
                layout: 'tabs',
                paymentMethodOrder: ['card'],
                fields: {
                  billingDetails: 'auto' // Let Stripe collect billing details
                },
                defaultValues: {
                  billingDetails: {
                    name: customerInfo.name,
                    email: customerInfo.email,
                    address: {
                      line1: customerInfo.billingAddress.line1,
                      line2: customerInfo.billingAddress.line2 || '',
                      city: customerInfo.billingAddress.city,
                      state: customerInfo.billingAddress.state || '',
                      postal_code: customerInfo.billingAddress.postal_code || '',
                      country: customerInfo.billingAddress.country
                    }
                  }
                }
              }}
            />
          </div>

          {errorMessage && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">
                Secure Payment
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                Your payment information is encrypted and secure. We use Stripe to process payments safely.
              </p>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isProcessing}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Details
          </Button>
          
          <Button
            type="submit"
            variant="primary"
            disabled={!stripe || isProcessing}
            isLoading={isProcessing}
            icon={isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          >
            {isProcessing ? 'Setting up Payment...' : `Setup Payment Method`}
          </Button>
        </div>
      </form>
    </div>
  );
};

const SubscriptionPaymentForm: React.FC<SubscriptionPaymentFormProps> = ({
  selectedPlan,
  customerInfo,
  clientSecret,
  paymentIntentId,
  shopId,
  onSuccess,
  onBack
}) => {
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
        clientSecret,
        appearance
      }}
    >
      <PaymentForm
        selectedPlan={selectedPlan}
        customerInfo={customerInfo}
        paymentIntentId={paymentIntentId}
        shopId={shopId}
        onSuccess={onSuccess}
        onBack={onBack}
      />
    </Elements>
  );
};

export default SubscriptionPaymentForm;
