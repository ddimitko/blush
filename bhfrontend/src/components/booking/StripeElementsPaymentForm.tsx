import React, { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, Lock, AlertCircle } from 'lucide-react';
import { Shop, Appointment } from '../../types';
import { formatCurrency, createUTCAppointmentDateTime } from '../../lib/utils';
import { useBookingUIStore } from '../../store/uiStore';
import { useCreateAppointmentMutation } from '../../hooks/queries';
import { apiClient } from '../../lib/api';
import { useStripe as useStripeContext } from '../../contexts/StripeContext';
import Button from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';


interface CustomerData {
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
}

interface StripeElementsPaymentFormProps {
  shop: Shop;
  service: any;
  employee: any;
  date: string;
  slot: any;
  customerData: CustomerData;
  onSuccess: (appointment: Appointment) => void;
  paymentIntent?: any;
}



interface PaymentFormProps extends StripeElementsPaymentFormProps {
  paymentIntent: any;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  shop,
  service,
  employee,
  date,
  slot,
  customerData,
  onSuccess,
  paymentIntent,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { currentLockSessionId } = useBookingUIStore();
  const createAppointmentMutation = useCreateAppointmentMutation();
  const { isAuthenticated } = useAuth();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isElementsReady, setIsElementsReady] = useState(false);
  // Reset Elements readiness when stripe or elements change
  useEffect(() => {
    if (!stripe || !elements) {
      setIsElementsReady(false);
    }
    // PaymentElement onReady callback will set isElementsReady to true
  }, [stripe, elements]);





  // Phone number converter for Bulgarian numbers
  const convertPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');

    // If starts with 0, convert to +359
    if (cleaned.startsWith('0') && cleaned.length >= 9) {
      return '+359' + cleaned.substring(1);
    }

    // If starts with 359, add +
    if (cleaned.startsWith('359') && cleaned.length >= 12) {
      return '+' + cleaned;
    }

    // Return as is if already has + or doesn't match patterns
    return cleaned;
  };



  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !paymentIntent) {
      setError('Payment system not ready. Please try again.');
      return;
    }

    if (!isElementsReady) {
      setError('Payment form is still loading. Please wait a moment and try again.');
      return;
    }



    setIsProcessing(true);
    setError(null);

    try {
      // Double-check Elements readiness before confirming payment
      if (!isElementsReady) {
        setError('Payment form is not ready. Please wait a moment and try again.');
        return;
      }

      console.log('💳 Confirming payment with Stripe...');

      // Confirm the payment with Stripe using Payment Element
      const { error: stripeError, paymentIntent: confirmedPaymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin, // Required but not used since we handle success manually
        },
        redirect: 'if_required', // Prevent automatic redirect
      });

      if (stripeError) {
        console.error('Stripe payment error:', stripeError);

        // Handle specific "Frame not initialized" error
        if (stripeError.message?.includes('Frame not initialized')) {
          setError('Payment form is not ready. Please refresh the page and try again.');
        } else {
          setError(stripeError.message || 'Payment failed. Please try again.');
        }
        return;
      }

      if (confirmedPaymentIntent?.status === 'succeeded') {
        // Payment succeeded, create the appointment
        if (!currentLockSessionId) {
          setError('Slot lock has expired. Please go back and select a time slot again.');
          return;
        }

        const appointmentData = {
          shopId: shop.id,
          serviceId: service.id,
          employeeId: employee.id,
          appointmentDateTime: createUTCAppointmentDateTime(date, slot.time || slot.startTime),
          paymentType: 'CARD' as const,
          notes: customerData.notes,
          paymentIntentId: confirmedPaymentIntent.id,
          paymentMethodId: confirmedPaymentIntent.payment_method as string,
          slotLockToken: currentLockSessionId,
          // Add guest information based on authentication status
          guestEmail: !isAuthenticated ? customerData.customerEmail : 'dummy@example.com',
          guestFirstName: !isAuthenticated ? customerData.customerFirstName : 'Dummy',
          guestLastName: !isAuthenticated ? customerData.customerLastName : 'User',
          guestPhone: !isAuthenticated ? convertPhoneNumber(customerData.customerPhone) : '+1234567890',
        };

        const appointment = await createAppointmentMutation.mutateAsync(appointmentData);
        onSuccess(appointment);
      } else {
        setError('Payment was not completed successfully. Please try again.');
      }
    } catch (error: any) {
      console.error('Payment processing error:', error);
      setError(error.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Show error if payment intent is not available
  if (!paymentIntent) {
    return (
      <div className="space-y-4">
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">
            {error || 'Failed to initialize payment. Please refresh and try again.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Payment Intent Info */}
      {paymentIntent && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <Lock className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-green-700">
              <p className="font-medium">Payment Ready</p>
              <p>Secure payment initialized for {paymentIntent.shopName}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stripe Payment Element */}
      <div className="p-4 border border-gray-300 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Information
        </label>
        <PaymentElement
          options={{
            layout: 'tabs',
            defaultValues: {
              billingDetails: {
                name: `${customerData.customerFirstName} ${customerData.customerLastName}`.trim(),
                email: customerData.customerEmail,
              },
            },
          }}
          onReady={() => {
            console.log('💳 PaymentElement is ready');
            setIsElementsReady(true);
          }}
          onLoadError={(error) => {
            console.error('💳 PaymentElement load error:', error);
            setError('Failed to load payment form. Please refresh and try again.');
          }}
        />
      </div>



      {/* Security Notice */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <Lock className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-gray-600">
            <p className="font-medium">Your payment is secure</p>
            <p>This payment is processed through Stripe Connect for {shop.name}. Your card information is encrypted and never stored on our servers.</p>
          </div>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex justify-between items-center text-sm">
          <span className="text-blue-700">Total Amount:</span>
          <span className="font-bold text-blue-900">{formatCurrency(service.price, shop.country)}</span>
        </div>
        <p className="text-xs text-blue-600 mt-1">
          Payment will be charged to your card immediately
        </p>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!stripe || !elements || !isElementsReady || isProcessing || createAppointmentMutation.isPending || !paymentIntent}
        isLoading={isProcessing || createAppointmentMutation.isPending}
        className="w-full"
        size="lg"
      >
        <CreditCard className="h-5 w-5 mr-2" />
        {!isElementsReady ? 'Loading payment form...' :
         (isProcessing || createAppointmentMutation.isPending) ? 'Processing Payment...' :
         `Pay ${formatCurrency(service.price, shop.country)}`}
      </Button>
    </form>
  );
};

const StripeElementsPaymentForm: React.FC<StripeElementsPaymentFormProps> = (props) => {
  const { stripe, isLoading, error } = useStripeContext();
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [isCreatingPaymentIntent, setIsCreatingPaymentIntent] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);



  // Create payment intent when component mounts
  useEffect(() => {
    const createPaymentIntent = async () => {
      console.log('💳 PAYMENT INTENT: Checking requirements', {
        shopId: props.shop.id,
        serviceId: props.service.id,
        servicePrice: props.service.price,
        customerEmail: props.customerData.customerEmail,
        customerFirstName: props.customerData.customerFirstName,
        customerLastName: props.customerData.customerLastName
      });

      if (!props.shop.id || !props.service.id || !props.service.price || !props.customerData.customerEmail) {
        console.log('❌ PAYMENT INTENT: Missing required data, skipping creation');
        return;
      }

      console.log('✅ PAYMENT INTENT: All requirements met, creating payment intent');

      setIsCreatingPaymentIntent(true);
      setPaymentError(null);

      try {
        const response = await apiClient.createPaymentIntent({
          shopId: props.shop.id,
          serviceId: props.service.id,
          amount: props.service.price,
          currency: props.shop.country === 'Bulgaria' ? 'bgn' : 'usd', // Use shop's country to determine currency
          description: `${props.service.name} - ${props.shop.name}`,
          customerEmail: props.customerData.customerEmail,
          customerName: `${props.customerData.customerFirstName} ${props.customerData.customerLastName}`.trim(),
        });

        if (process.env.NODE_ENV === 'development') {
          console.log('✅ PAYMENT INTENT: Created successfully', response);
        }
        setPaymentIntent(response);
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ PAYMENT INTENT: State updated, paymentIntent should now be set');
        }
      } catch (error: any) {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ PAYMENT INTENT: Creation failed:', error);
          console.error('❌ PAYMENT INTENT: Error details:', error.response?.data);
          console.error('❌ PAYMENT INTENT: Request data:', {
            shopId: props.shop.id,
            serviceId: props.service.id,
            amount: props.service.price,
            currency: props.shop.country === 'Bulgaria' ? 'bgn' : 'usd',
            description: `${props.service.name} - ${props.shop.name}`,
            customerEmail: props.customerData.customerEmail,
            customerName: `${props.customerData.customerFirstName} ${props.customerData.customerLastName}`.trim(),
          });
        }
        setPaymentError(error.response?.data?.message || error.message || 'Failed to initialize payment. Please try again.');
      } finally {
        setIsCreatingPaymentIntent(false);
      }
    };

    createPaymentIntent();
  }, [props.shop.id, props.service.id, props.service.price, props.service.name, props.shop.name, props.shop.country, props.customerData.customerEmail, props.customerData.customerFirstName, props.customerData.customerLastName]);

  if (isLoading || isCreatingPaymentIntent) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <p className="text-blue-700">
              {isLoading ? 'Loading Stripe...' : 'Initializing secure payment...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stripe || paymentError || !paymentIntent) {
    return (
      <div className="space-y-4">
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">
            {error || paymentError || 'Failed to load Stripe. Please refresh and try again.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripe}
      options={{
        clientSecret: paymentIntent.clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#3b82f6',
          },
        },
      }}
    >
      <PaymentForm {...props} paymentIntent={paymentIntent} />
    </Elements>
  );
};

export default StripeElementsPaymentForm;
