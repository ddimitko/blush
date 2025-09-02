import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, Lock, AlertCircle, Shield } from 'lucide-react';
import { Shop, Appointment } from '../../types';
import { formatCurrency, createUTCAppointmentDateTime } from '../../lib/utils';
import { useBookingUIStore } from '../../store/uiStore';
import { useCreateAppointmentMutation } from '../../hooks/queries';
import { apiClient } from '../../lib/api';
import { useStripe as useStripeContext } from '../../contexts/StripeContext';
import { getCountryPaymentMethods } from '../../lib/countryConfig';
import Button from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';

interface CustomerData {
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
}

interface StripeConnectPaymentFormProps {
  shop: Shop;
  service: any;
  employee: any;
  date: string;
  slot: any;
  customerData: CustomerData;
  onSuccess: (appointment: Appointment) => void;
  onError?: (error: string) => void;
}

interface PaymentFormProps extends StripeConnectPaymentFormProps {
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

  const countryConfig = getCountryPaymentMethods(shop.country);

  useEffect(() => {
    if (!stripe || !elements) {
      setIsElementsReady(false);
    }
  }, [stripe, elements]);

  const convertPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('0') && cleaned.length >= 9) {
      return '+359' + cleaned.substring(1);
    }
    if (cleaned.startsWith('359') && cleaned.length >= 12) {
      return '+' + cleaned;
    }
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
      console.log('💳 Confirming Stripe Connect Direct Charge...');

      // Confirm the payment with Stripe Connect Direct Charge
      const { error: stripeError, paymentIntent: confirmedPaymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin,
          payment_method_data: {
            billing_details: {
              name: `${customerData.customerFirstName} ${customerData.customerLastName}`.trim(),
              email: customerData.customerEmail,
              phone: convertPhoneNumber(customerData.customerPhone),
            },
          },
        },
        redirect: 'if_required',
      });

      if (stripeError) {
        console.error('Stripe Connect payment error:', stripeError);
        if (stripeError.message?.includes('Frame not initialized')) {
          setError('Payment form is not ready. Please refresh the page and try again.');
        } else {
          setError(stripeError.message || 'Payment failed. Please try again.');
        }
        return;
      }

      if (confirmedPaymentIntent?.status === 'succeeded') {
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

      {/* Stripe Connect Info */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <Shield className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700">
            <p className="font-medium">Secure Payment via Stripe Connect</p>
            <p>Payment processed directly to {shop.name}</p>
          </div>
        </div>
      </div>

      {/* Country-specific Payment Element */}
      <div className="p-4 border border-gray-300 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Information
        </label>
        <PaymentElement
          options={{
            layout: 'tabs',
            paymentMethodOrder: countryConfig.paymentMethods,
            defaultValues: {
              billingDetails: {
                name: `${customerData.customerFirstName} ${customerData.customerLastName}`.trim(),
                email: customerData.customerEmail,
                phone: convertPhoneNumber(customerData.customerPhone),
              },
            },
            fields: {
              billingDetails: {
                name: 'auto',
                email: 'auto',
                phone: 'auto',
                address: {
                  country: 'auto',
                  postalCode: 'auto',
                },
              },
            },
          }}
          onReady={() => {
            console.log('💳 Stripe Connect PaymentElement is ready');
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
            <p>This payment is processed through Stripe Connect directly to {shop.name}. Your card information is encrypted and never stored.</p>
          </div>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-blue-700 font-medium">Service Price:</span>
            <span className="font-bold text-blue-900">
              {formatCurrency(service.price, shop.country)}
            </span>
          </div>
          {paymentIntent.taxCalculated && paymentIntent.taxBehavior === 'inclusive' && (
            <div className="text-xs text-blue-600">
              <span>
                (includes {(paymentIntent.taxRate * 100).toFixed(1)}% tax: {formatCurrency(paymentIntent.taxAmount, shop.country)})
              </span>
            </div>
          )}
          {paymentIntent.taxCalculated && paymentIntent.taxBehavior !== 'inclusive' && (
            <>
              <div className="flex justify-between items-center text-sm">
                <span className="text-blue-700">Subtotal:</span>
                <span className="text-blue-900">{formatCurrency(service.price, shop.country)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-blue-700">
                  Tax ({(paymentIntent.taxRate * 100).toFixed(1)}%):
                </span>
                <span className="text-blue-900">{formatCurrency(paymentIntent.taxAmount, shop.country)}</span>
              </div>
              <hr className="border-blue-300" />
              <div className="flex justify-between items-center text-sm">
                <span className="text-blue-700 font-medium">Total Amount:</span>
                <span className="font-bold text-blue-900">
                  {formatCurrency(paymentIntent.totalAmount, shop.country)}
                </span>
              </div>
            </>
          )}
        </div>
        <p className="text-xs text-blue-600 mt-2">
          Payment will be charged directly to {shop.name}
          {paymentIntent.taxCalculated && paymentIntent.taxBehavior === 'inclusive' && (
            <span className="block mt-1">Taxes are included in the service price and covered by the shop</span>
          )}
          {paymentIntent.taxCalculated && paymentIntent.taxBehavior !== 'inclusive' && (
            <span className="block mt-1">Tax calculated automatically using Stripe Tax</span>
          )}
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

const StripeConnectPaymentForm: React.FC<StripeConnectPaymentFormProps> = (props) => {
  console.log('🚀 STRIPE CONNECT: Component mounted/re-rendered', {
    shopId: props.shop.id,
    serviceId: props.service.id,
    servicePrice: props.service.price,
    customerEmail: props.customerData.customerEmail,
    shopCountry: props.shop.country
  });

  const { stripe, isLoading, error } = useStripeContext();
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [isCreatingPaymentIntent, setIsCreatingPaymentIntent] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Use refs to prevent duplicate payment intent creation and track state
  const isCreatingRef = useRef(false);
  const componentMountedRef = useRef(true);
  const creationAttemptedRef = useRef(false);
  const currentRequestRef = useRef<AbortController | null>(null);

  const countryConfig = useMemo(() => getCountryPaymentMethods(props.shop.country), [props.shop.country]);

  // Stabilize payment methods array to prevent unnecessary re-renders
  const paymentMethods = useMemo(() => countryConfig.paymentMethods, [countryConfig.paymentMethods]);
  const currency = useMemo(() => countryConfig.currency, [countryConfig.currency]);

  // Cleanup effect to handle component unmounting
  useEffect(() => {
    componentMountedRef.current = true;
    return () => {
      componentMountedRef.current = false;
      // Cancel any pending requests
      if (currentRequestRef.current) {
        currentRequestRef.current.abort();
      }
      // Reset creation state
      isCreatingRef.current = false;
    };
  }, []);

  // Call onError callback if provided to allow fallback (moved to top level to avoid hooks rule violation)
  React.useEffect(() => {
    if (props.onError && (error || paymentError)) {
      const errorMessage = error || paymentError || 'Failed to load Stripe Connect. Please refresh and try again.';
      props.onError(errorMessage);
    }
  }, [error, paymentError, props.onError]);

  // Create Stripe Connect Direct Charge payment intent
  useEffect(() => {
    console.log('🔄 STRIPE CONNECT: useEffect triggered', {
      shopId: props.shop.id,
      serviceId: props.service.id,
      servicePrice: props.service.price,
      customerEmail: props.customerData.customerEmail,
      currency: currency,
      paymentMethods: paymentMethods,
      isCreatingRef: isCreatingRef.current,
      isCreatingPaymentIntent: isCreatingPaymentIntent,
      paymentIntent: !!paymentIntent
    });

    const createConnectPaymentIntent = async () => {
      console.log('💳 STRIPE CONNECT: Creating Direct Charge payment intent', {
        shopId: props.shop.id,
        serviceId: props.service.id,
        servicePrice: props.service.price,
        shopCountry: props.shop.country,
        currency: currency,
        customerEmail: props.customerData.customerEmail,
        customerFirstName: props.customerData.customerFirstName,
        customerLastName: props.customerData.customerLastName
      });

      if (!props.shop.id || !props.service.id || !props.service.price || !props.customerData.customerEmail) {
        console.log('❌ STRIPE CONNECT: Missing required data, skipping creation');
        return;
      }

      // Prevent duplicate creation if already creating, already have payment intent, or creation already attempted
      if (isCreatingRef.current || isCreatingPaymentIntent || paymentIntent || creationAttemptedRef.current) {
        console.log('💳 STRIPE CONNECT: Skipping creation - already in progress or exists', {
          isCreating: isCreatingRef.current,
          isCreatingState: isCreatingPaymentIntent,
          hasPaymentIntent: !!paymentIntent,
          attemptedBefore: creationAttemptedRef.current
        });
        return;
      }

      // Mark that we've attempted creation to prevent retries
      creationAttemptedRef.current = true;
      isCreatingRef.current = true;
      setIsCreatingPaymentIntent(true);
      setPaymentError(null);

      // Create abort controller for this request
      const abortController = new AbortController();
      currentRequestRef.current = abortController;

      // Add timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        if (isCreatingRef.current && componentMountedRef.current) {
          console.log('⏰ Payment intent creation timed out');
          const timeoutError = 'Payment initialization timed out. Please try again.';
          setPaymentError(timeoutError);
          if (props.onError) {
            props.onError(timeoutError);
          }
          isCreatingRef.current = false;
          setIsCreatingPaymentIntent(false);
          abortController.abort();
        }
      }, 15000); // 15 second timeout

      try {
        // Create Stripe Connect Direct Charge payment intent with shop's currency
        const response = await apiClient.createConnectPaymentIntent({
          shopId: props.shop.id,
          serviceId: props.service.id,
          amount: props.service.price,
          currency: currency, // This now uses shop's country currency
          description: `${props.service.name} - ${props.shop.name}`,
          customerEmail: props.customerData.customerEmail,
          customerName: `${props.customerData.customerFirstName} ${props.customerData.customerLastName}`.trim(),
          paymentMethodTypes: paymentMethods,
        });

        // Only update state if component is still mounted
        if (componentMountedRef.current) {
          console.log('✅ STRIPE CONNECT: Direct Charge payment intent created successfully', response);
          clearTimeout(timeoutId); // Clear timeout on success
          setPaymentIntent(response);
        }
      } catch (error: any) {
        clearTimeout(timeoutId); // Clear timeout on error

        // Don't handle errors if request was aborted or component unmounted
        if (abortController.signal.aborted || !componentMountedRef.current) {
          console.log('🚫 STRIPE CONNECT: Request aborted or component unmounted');
          return;
        }

        console.error('❌ STRIPE CONNECT: Payment intent creation failed:', error);

        // Handle specific error cases
        let errorMessage = 'Failed to initialize payment. Please try again.';

        if (error.response?.data?.message) {
          const message = error.response.data.message;
          if (message.includes('Stripe Connect account')) {
            errorMessage = 'This shop has not completed their payment setup yet. Please contact the shop directly to make a booking.';
          } else if (message.includes('card payments')) {
            errorMessage = 'This shop does not accept card payments. Please contact the shop directly to make a booking.';
          } else {
            errorMessage = message;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }

        setPaymentError(errorMessage);

        // Call onError callback if provided
        if (props.onError) {
          props.onError(errorMessage);
        }
      } finally {
        // Clean up state only if component is still mounted
        if (componentMountedRef.current) {
          isCreatingRef.current = false;
          setIsCreatingPaymentIntent(false);
        }
        // Clear the current request reference
        currentRequestRef.current = null;
      }
    };

    // Only create payment intent if we haven't attempted before and have required data
    if (!creationAttemptedRef.current && props.shop.id && props.service.id && props.customerData.customerEmail) {
      createConnectPaymentIntent();
    }
  }, [
    // Only include essential dependencies that should trigger recreation
    props.shop.id,
    props.service.id,
    props.service.price,
    props.customerData.customerEmail
  ]);

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
    const errorMessage = error || paymentError || 'Failed to load Stripe Connect. Please refresh and try again.';

    return (
      <div className="space-y-4">
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">
            {errorMessage}
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
            borderRadius: '8px',
            fontFamily: 'system-ui, sans-serif',
          },
          rules: {
            '.Tab': {
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            },
            '.Tab--selected': {
              borderColor: '#3b82f6',
              boxShadow: '0 0 0 1px #3b82f6',
            },
          },
        },
        locale: (countryConfig.locale || 'en') as any,
      }}
    >
      <PaymentForm {...props} paymentIntent={paymentIntent} />
    </Elements>
  );
};

export default StripeConnectPaymentForm;
