import React, { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useToast } from '../ui/Toast';
import { useStripe as useStripeContext } from '../../contexts/StripeContext';
import { useCreateUserSetupIntentMutation, useCheckDuplicateCardMutation } from '../../hooks/queries/useUserPaymentMethodsQueries';

interface AddPaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface SetupFormProps {
  clientSecret: string;
  onSuccess: () => void;
  onClose: () => void;
}

const SetupForm: React.FC<SetupFormProps> = ({ clientSecret, onSuccess, onClose }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { success, error: showError } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isElementsReady, setIsElementsReady] = useState(false);
  const checkDuplicateCardMutation = useCheckDuplicateCardMutation();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !isElementsReady) {
      setError('Payment form is not ready. Please wait a moment and try again.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { error: stripeError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.origin, // Required but not used
        },
        redirect: 'if_required',
      });

      if (stripeError) {
        setError(stripeError.message || 'Failed to add payment method');
      } else if (setupIntent?.payment_method) {
        // Check for duplicates using the payment method's fingerprint
        const paymentMethod = setupIntent.payment_method;
        if (typeof paymentMethod === 'object' && paymentMethod.card?.fingerprint) {
          try {
            const duplicateCheck = await checkDuplicateCardMutation.mutateAsync(paymentMethod.card.fingerprint);
            if (duplicateCheck.isDuplicate) {
              setError('This card has already been added to your account.');
              return;
            }
          } catch (duplicateError) {
            console.warn('Failed to check for duplicate card, proceeding anyway:', duplicateError);
          }
        }

        success('Payment method added successfully');
        onSuccess();
      } else {
        setError('Failed to add payment method');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Payment Information
        </label>
        <div className="p-4 border border-gray-300 rounded-lg">
          <PaymentElement
            options={{
              layout: 'tabs',
            }}
            onReady={() => {
              console.log('PaymentElement is ready');
              setIsElementsReady(true);
            }}
            onLoadError={(error) => {
              console.error('PaymentElement load error:', error);
              setError('Failed to load payment form. Please refresh and try again.');
            }}
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isProcessing}
          disabled={!isElementsReady || isProcessing}
          icon={<CreditCard className="w-4 h-4" />}
        >
          Add Payment Method
        </Button>
      </div>
    </form>
  );
};

const AddPaymentMethodModal: React.FC<AddPaymentMethodModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { stripe: stripeInstance } = useStripeContext();
  const createSetupIntentMutation = useCreateUserSetupIntentMutation();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { error } = useToast();

  useEffect(() => {
    if (isOpen && !clientSecret) {
      createSetupIntent();
    }
  }, [isOpen]);

  const createSetupIntent = async () => {
    setIsLoading(true);
    try {
      const response = await createSetupIntentMutation.mutateAsync();
      setClientSecret(response.setupIntent.clientSecret);
    } catch (err: any) {
      error(
        err?.response?.data?.message || 'Failed to initialize payment form'
      );
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = () => {
    setClientSecret(null);
    onSuccess();
    onClose();
  };

  const handleClose = () => {
    setClientSecret(null);
    onClose();
  };

  if (!isOpen) return null;

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add Payment Method</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {isLoading || !clientSecret ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
              <span className="ml-3 text-gray-600">Initializing payment form...</span>
            </div>
          ) : stripeInstance && clientSecret ? (
            <Elements
              stripe={stripeInstance}
              options={{
                clientSecret,
                appearance
              }}
            >
              <SetupForm
                clientSecret={clientSecret}
                onSuccess={handleSuccess}
                onClose={handleClose}
              />
            </Elements>
          ) : (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">
                Failed to load Stripe. Please refresh and try again.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddPaymentMethodModal;
