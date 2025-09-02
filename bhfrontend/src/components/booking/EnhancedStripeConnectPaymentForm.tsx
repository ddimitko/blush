import React, { useState, useEffect, useMemo } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, Lock, AlertCircle, Shield, Save } from 'lucide-react';
import { Shop, Appointment, UserPaymentMethod } from '../../types';
import { formatCurrency, createUTCAppointmentDateTime } from '../../lib/utils';
import { useBookingUIStore } from '../../store/uiStore';
import { useCreateAppointmentMutation } from '../../hooks/queries';
import { apiClient } from '../../lib/api';
import { useStripe as useStripeContext } from '../../contexts/StripeContext';
import { getCountryPaymentMethods } from '../../lib/countryConfig';
import Button from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../ui/Toast';

interface CustomerData {
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
}

interface PaymentFormProps {
  shop: Shop;
  service: any;
  employee: any;
  date: string;
  slot: any;
  customerData: CustomerData;
  onSuccess: (appointment: Appointment) => void;
  paymentIntent: any;
  selectedPaymentMethod?: UserPaymentMethod;
  savePaymentMethod?: boolean;
  onSavePaymentMethodChange?: (save: boolean) => void;
}

interface EnhancedStripeConnectPaymentFormProps {
  shop: Shop;
  service: any;
  employee: any;
  date: string;
  slot: any;
  customerData: CustomerData;
  onSuccess: (appointment: Appointment) => void;
  onError?: (error: string) => void;
  selectedPaymentMethod?: UserPaymentMethod;
  savePaymentMethod?: boolean;
  onSavePaymentMethodChange?: (save: boolean) => void;
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
  selectedPaymentMethod,
  savePaymentMethod = false,
  onSavePaymentMethodChange,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { currentLockSessionId } = useBookingUIStore();
  const createAppointmentMutation = useCreateAppointmentMutation();
  const { isAuthenticated } = useAuth();
  const { success, error: showError } = useToast();

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
    if (!phone) return '';
    return phone.startsWith('+') ? phone : `+${phone}`;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !paymentIntent) {
      setError('Payment system is not ready. Please try again.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      let paymentResult;

      if (selectedPaymentMethod) {
        // Use saved payment method
        paymentResult = await stripe.confirmPayment({
          clientSecret: paymentIntent.clientSecret,
          confirmParams: {
            payment_method: selectedPaymentMethod.id,
            return_url: window.location.origin,
          },
          redirect: 'if_required',
        });
      } else {
        // Use new payment method from elements
        paymentResult = await stripe.confirmPayment({
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
      }

      if (paymentResult.error) {
        setError(paymentResult.error.message || 'Payment failed. Please try again.');
      } else if (paymentResult.paymentIntent?.status === 'succeeded') {
        // Validate that we have both payment intent and payment method
        if (!paymentResult.paymentIntent.id || !paymentResult.paymentIntent.payment_method) {
          setError('Payment validation failed. Missing payment information.');
          return;
        }

        // Create appointment with validated payment data
        const appointmentData = {
          shopId: shop.id,
          serviceId: service.id,
          employeeId: employee.id,
          appointmentDateTime: createUTCAppointmentDateTime(date, slot.time || slot.startTime),
          paymentType: 'CARD' as const,
          paymentIntentId: paymentResult.paymentIntent.id,
          paymentMethodId: paymentResult.paymentIntent.payment_method,
          notes: customerData.notes,
          slotLockToken: currentLockSessionId,
          guestEmail: !isAuthenticated ? customerData.customerEmail : 'dummy@example.com',
          guestFirstName: !isAuthenticated ? customerData.customerFirstName : 'Dummy',
          guestLastName: !isAuthenticated ? customerData.customerLastName : 'User',
          guestPhone: !isAuthenticated ? convertPhoneNumber(customerData.customerPhone) : '+1234567890',
        };

        const appointment = await createAppointmentMutation.mutateAsync(appointmentData);
        
        if (savePaymentMethod && !selectedPaymentMethod) {
          success('Payment successful and payment method saved for future use!');
        } else {
          success('Payment successful!');
        }
        
        onSuccess(appointment);
      } else {
        setError('Payment was not completed successfully. Please try again.');
      }
    } catch (error: any) {
      console.warn('Payment processing error:', error);
      // Avoid logging sensitive error details that might trigger excessive Stripe error reporting
      const userFriendlyMessage = error?.message?.includes('stripe')
        ? 'Payment processing failed. Please try again.'
        : error.message || 'Payment failed. Please try again.';
      setError(userFriendlyMessage);
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Method Display */}
      {selectedPaymentMethod ? (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <Shield className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">Using Saved Payment Method</p>
              <p className="text-sm text-blue-700">
                {selectedPaymentMethod.card?.brand} •••• {selectedPaymentMethod.card?.last4}
                {selectedPaymentMethod.isDefault && ' (Default)'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* New Payment Method Form */}
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
                if (process.env.NODE_ENV === 'development') {
                  console.log('💳 Enhanced Stripe Connect PaymentElement is ready');
                }
                setIsElementsReady(true);
              }}
              onLoadError={(error) => {
                console.warn('💳 Enhanced PaymentElement load error:', error);
                setError('Failed to load payment form. Please refresh and try again.');
              }}
            />
          </div>

          {/* Save Payment Method Option */}
          {isAuthenticated && onSavePaymentMethodChange && (
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="savePaymentMethod"
                checked={savePaymentMethod}
                onChange={(e) => onSavePaymentMethodChange(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="savePaymentMethod" className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                <Save className="h-4 w-4" />
                <span>Save this payment method for future bookings</span>
              </label>
            </div>
          )}
        </>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Security Notice */}
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <Lock className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-700">
            <p className="font-medium">Secure Payment</p>
            <p>Your payment information is encrypted and secure. This shop uses Stripe for payment processing.</p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!stripe || (!selectedPaymentMethod && (!elements || !isElementsReady)) || isProcessing || createAppointmentMutation.isPending || !paymentIntent}
        isLoading={isProcessing || createAppointmentMutation.isPending}
        className="w-full"
        size="lg"
      >
        <CreditCard className="h-5 w-5 mr-2" />
        {!selectedPaymentMethod && !isElementsReady ? 'Loading payment form...' :
         (isProcessing || createAppointmentMutation.isPending) ? 'Processing Payment...' :
         `Pay ${formatCurrency(service.price, shop.country)}`}
      </Button>
    </form>
  );
};

const EnhancedStripeConnectPaymentForm: React.FC<EnhancedStripeConnectPaymentFormProps> = (props) => {
  const { stripe } = useStripeContext();
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [isCreatingPaymentIntent, setIsCreatingPaymentIntent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countryConfig = getCountryPaymentMethods(props.shop.country);
  const currency = countryConfig.currency;
  const paymentMethods = countryConfig.paymentMethods;

  useEffect(() => {
    const createPaymentIntent = async () => {
      if (paymentIntent) return;

      setIsCreatingPaymentIntent(true);
      setError(null);

      try {
        const response = await apiClient.createConnectPaymentIntent({
          shopId: props.shop.id,
          serviceId: props.service.id,
          amount: props.service.price,
          currency: currency,
          description: `${props.service.name} - ${props.shop.name}`,
          customerEmail: props.customerData.customerEmail,
          customerName: `${props.customerData.customerFirstName} ${props.customerData.customerLastName}`.trim(),
          paymentMethodTypes: paymentMethods,
          savePaymentMethod: props.savePaymentMethod && !props.selectedPaymentMethod,
        });

        setPaymentIntent(response);
      } catch (error: any) {
        console.error('Failed to create payment intent:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to initialize payment';
        setError(errorMessage);
        props.onError?.(errorMessage);
      } finally {
        setIsCreatingPaymentIntent(false);
      }
    };

    createPaymentIntent();
  }, [props.shop.id, props.service.id, currency, paymentMethods, props.customerData, props.onError, paymentIntent]);

  if (isCreatingPaymentIntent) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing secure payment...</p>
        </div>
      </div>
    );
  }

  if (error || !paymentIntent) {
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

  if (!stripe) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment system...</p>
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
        },
        locale: (countryConfig.locale || 'en') as any,
      }}
    >
      <PaymentForm {...props} paymentIntent={paymentIntent} />
    </Elements>
  );
};

export default EnhancedStripeConnectPaymentForm;
