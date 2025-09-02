import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Info, CreditCard } from 'lucide-react';
import { Shop, Appointment } from '../../types';
import StripeConnectPaymentForm from './StripeConnectPaymentForm';
import StripePaymentForm from './StripePaymentForm';

interface CustomerData {
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
}

interface SmartPaymentFormProps {
  shop: Shop;
  service: any;
  employee: any;
  date: string;
  slot: any;
  customerData: CustomerData;
  onSuccess: (appointment: Appointment) => void;
}

const SmartPaymentForm: React.FC<SmartPaymentFormProps> = (props) => {
  console.log('🎯 SMART PAYMENT: Component mounted/re-rendered', {
    shopId: props.shop.id,
    serviceId: props.service.id,
    servicePrice: props.service.price,
    customerEmail: props.customerData.customerEmail
  });

  const [paymentFormType, setPaymentFormType] = useState<'connect' | 'regular' | 'error'>('connect');
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isCheckingConnect, setIsCheckingConnect] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  // Use refs to track current state for timeout and prevent infinite loops
  const isCheckingRef = useRef(isCheckingConnect);
  const paymentFormTypeRef = useRef(paymentFormType);
  const initializedRef = useRef(false);

  // Update refs when state changes
  useEffect(() => {
    isCheckingRef.current = isCheckingConnect;
  }, [isCheckingConnect]);

  useEffect(() => {
    paymentFormTypeRef.current = paymentFormType;
  }, [paymentFormType]);

  // Handle Stripe Connect errors and fallback to regular Stripe
  const handleConnectError = (error: string) => {
    console.log('🔄 Stripe Connect failed, checking if we should fallback to regular Stripe:', error);
    
    setConnectError(error);
    setRetryCount(prev => prev + 1);
    
    // Check if the error indicates issues that can be resolved with regular Stripe
    const fallbackErrors = [
      'Stripe Connect account',
      'payment setup',
      'not completed their payment setup',
      'currency',
      'payment method',
      'invalid_request_error',
      'Connect payment intent creation failed'
    ];
    
    const shouldFallback = fallbackErrors.some(errorType => 
      error.toLowerCase().includes(errorType.toLowerCase())
    );
    
    if (shouldFallback) {
      console.log('💡 Falling back to regular Stripe payment form');
      setPaymentFormType('regular');
    } else {
      console.log('❌ Error is not recoverable, showing error state');
      setPaymentFormType('error');
    }
    
    setIsCheckingConnect(false);
  };

  // Handle regular Stripe errors
  const handleRegularStripeError = (error: string) => {
    console.log('❌ Regular Stripe also failed:', error);
    setConnectError(error);
    setPaymentFormType('error');
  };

  // Reset to try Stripe Connect again
  const retryStripeConnect = () => {
    console.log('🔄 Retrying Stripe Connect...');
    setIsCheckingConnect(true);
    setPaymentFormType('connect');
    setConnectError(null);
  };

  // Initialize state only once when component mounts
  useEffect(() => {
    console.log('🎯 SMART PAYMENT: Component mounted, initializing state');

    // Set initial state - always try Stripe Connect first
    setIsCheckingConnect(false); // Remove artificial delay
    setPaymentFormType('connect');
    setConnectError(null);
    setRetryCount(0);
    initializedRef.current = true;

    // Cleanup function
    return () => {
      console.log('🎯 SMART PAYMENT: Component unmounting, cleaning up');
      initializedRef.current = false;
    };
  }, []); // Empty dependency array - only run once on mount

  // Reset initialization flag when shop/service changes
  useEffect(() => {
    initializedRef.current = false;
  }, [props.shop.id, props.service.id]);

  // Show loading state while checking Stripe Connect
  if (isCheckingConnect && paymentFormType === 'connect') {
    console.log('🎯 SMART PAYMENT: Showing loading state', { isCheckingConnect, paymentFormType });
    return (
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <p className="text-sm text-blue-700">
              Initializing secure payment...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show Stripe Connect form (primary option)
  if (paymentFormType === 'connect') {
    console.log('🎯 SMART PAYMENT: Rendering Stripe Connect form');
    return (
      <div className="space-y-4">
        <StripeConnectPaymentForm
          {...props}
          onError={handleConnectError}
        />
      </div>
    );
  }

  // Show regular Stripe form (fallback)
  if (paymentFormType === 'regular') {
    return (
      <div className="space-y-4">
        {/* Fallback Notice */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700">
              <p className="font-medium">Alternative Payment Method</p>
              <p>Using standard payment processing for this shop.</p>
              {retryCount > 0 && (
                <button
                  onClick={retryStripeConnect}
                  className="mt-2 text-xs underline hover:no-underline"
                >
                  Try preferred payment method again
                </button>
              )}
            </div>
          </div>
        </div>

        <StripePaymentForm
          {...props}
          onError={handleRegularStripeError}
        />
      </div>
    );
  }

  // Show error state
  return (
    <div className="space-y-4">
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">
            <p className="font-medium">Payment Unavailable</p>
            <p className="mt-1">{connectError || 'Unable to process card payments at this time.'}</p>
            <div className="mt-3 space-y-2">
              <p className="font-medium">What you can do:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Try the cash payment option instead</li>
                <li>Contact the shop directly to arrange payment</li>
                <li>Check your internet connection and try again</li>
              </ul>
              {retryCount < 3 && (
                <button
                  onClick={retryStripeConnect}
                  className="mt-2 inline-flex items-center space-x-1 text-xs bg-red-100 hover:bg-red-200 px-2 py-1 rounded border border-red-300 transition-colors"
                >
                  <CreditCard className="h-3 w-3" />
                  <span>Try Again</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartPaymentForm;
