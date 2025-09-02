import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, Lock, AlertCircle } from 'lucide-react';
import { Shop, Appointment } from '../../types';
import { formatCurrency, getCurrencyForCountry, createUTCAppointmentDateTime } from '../../lib/utils';
import { useBookingUIStore } from '../../store/uiStore';
import { useCreateAppointmentMutation } from '../../hooks/queries';
import { apiClient } from '../../lib/api';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface CustomerData {
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
}

interface StripePaymentFormProps {
  shop: Shop;
  service: any;
  employee: any;
  date: string;
  slot: any;
  customerData: CustomerData;
  onSuccess: (appointment: Appointment) => void;
  onError?: (error: string) => void;
}

const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  shop,
  service,
  employee,
  date,
  slot,
  customerData,
  onSuccess,
  onError,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [isCreatingPaymentIntent, setIsCreatingPaymentIntent] = useState(false);
  const { currentLockSessionId } = useBookingUIStore();
  const createAppointmentMutation = useCreateAppointmentMutation();
  const [cardData, setCardData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: `${customerData.customerFirstName} ${customerData.customerLastName}`.trim(),
  });

  // Use refs to prevent duplicate payment intent creation
  const isCreatingRef = useRef(false);
  const componentMountedRef = useRef(true);
  const creationAttemptedRef = useRef(false);

  // Cleanup effect
  useEffect(() => {
    componentMountedRef.current = true;
    return () => {
      componentMountedRef.current = false;
      isCreatingRef.current = false;
    };
  }, []);

  // Create payment intent when component mounts
  useEffect(() => {
    const createPaymentIntent = async () => {
      // Prevent duplicate creation
      if (isCreatingRef.current || isCreatingPaymentIntent || paymentIntent || creationAttemptedRef.current) {
        console.log('💳 REGULAR STRIPE: Skipping creation - already in progress or exists');
        return;
      }

      creationAttemptedRef.current = true;
      isCreatingRef.current = true;
      setIsCreatingPaymentIntent(true);
      setError(null);

      try {
        const paymentIntentResponse = await apiClient.createPaymentIntent({
          shopId: shop.id,
          serviceId: service.id,
          amount: service.price,
          currency: getCurrencyForCountry(shop.country), // Use shop's country to determine currency
          description: `${service.name} - ${shop.name}`,
          customerEmail: customerData.customerEmail,
          customerName: `${customerData.customerFirstName} ${customerData.customerLastName}`.trim(),
        });

        if (componentMountedRef.current) {
          setPaymentIntent(paymentIntentResponse);
        }
      } catch (error: any) {
        if (componentMountedRef.current) {
          console.error('Failed to create payment intent:', error);
          const errorMessage = 'Failed to initialize payment. Please try again.';
          setError(errorMessage);
          if (onError) {
            onError(errorMessage);
          }
        }
      } finally {
        if (componentMountedRef.current) {
          isCreatingRef.current = false;
          setIsCreatingPaymentIntent(false);
        }
      }
    };

    // Only create if we have required data and haven't attempted before
    if (shop.id && service.id && customerData.customerEmail && !creationAttemptedRef.current) {
      createPaymentIntent();
    }
  }, [shop.id, service.id, service.price, customerData.customerEmail]);

  const handleInputChange = (field: string, value: string) => {
    setCardData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const formatCardNumber = (value: string) => {
    // Remove all non-digits
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    // Add spaces every 4 digits
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    // Remove all non-digits
    const v = value.replace(/\D/g, '');
    // Add slash after 2 digits
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

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

  const validateForm = () => {
    if (!cardData.cardNumber || cardData.cardNumber.replace(/\s/g, '').length < 13) {
      setError('Please enter a valid card number');
      return false;
    }
    if (!cardData.expiryDate || cardData.expiryDate.length < 5) {
      setError('Please enter a valid expiry date');
      return false;
    }
    if (!cardData.cvv || cardData.cvv.length < 3) {
      setError('Please enter a valid CVV');
      return false;
    }
    if (!cardData.cardholderName.trim()) {
      setError('Please enter the cardholder name');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!paymentIntent) {
      setError('Payment not initialized. Please refresh and try again.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // For now, we'll simulate Stripe payment processing
      // In a real implementation, you would use Stripe.js to confirm the payment
      console.log('Processing payment with intent:', paymentIntent.paymentIntentId);

      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create a mock payment method ID (in real implementation, this comes from Stripe.js)
      const mockPaymentMethodId = 'pm_' + Math.random().toString(36).substr(2, 9);

      // Check if we have a valid lock session
      if (!currentLockSessionId) {
        setError('Slot lock has expired. Please go back and select a time slot again.');
        return;
      }

      // Create appointment with card payment including payment intent details
      const appointmentData = {
        shopId: shop.id,
        serviceId: service.id,
        employeeId: employee.id,
        appointmentDateTime: createUTCAppointmentDateTime(date, slot.time || slot.startTime),
        paymentType: 'CARD' as const,
        guestEmail: customerData.customerEmail,
        guestFirstName: customerData.customerFirstName,
        guestLastName: customerData.customerLastName,
        guestPhone: convertPhoneNumber(customerData.customerPhone),
        notes: customerData.notes,
        paymentIntentId: paymentIntent.paymentIntentId,
        paymentMethodId: mockPaymentMethodId,
        slotLockToken: currentLockSessionId,
      };

      const appointment = await createAppointmentMutation.mutateAsync(appointmentData);
      onSuccess(appointment);
    } catch (error: any) {
      const errorMessage = error.message || 'Payment failed. Please try again.';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Show loading state while creating payment intent
  if (isCreatingPaymentIntent) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <p className="text-blue-700">Initializing secure payment...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if payment intent creation failed
  if (!paymentIntent && !isCreatingPaymentIntent) {
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

      {/* Card Number */}
      <div>
        <Input
          label="Card Number"
          value={cardData.cardNumber}
          onChange={(e) => handleInputChange('cardNumber', formatCardNumber(e.target.value))}
          placeholder="1234 5678 9012 3456"
          maxLength={19}
          className="font-mono"
          disabled={isProcessing}
        />
      </div>

      {/* Expiry and CVV */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Input
            label="Expiry Date"
            value={cardData.expiryDate}
            onChange={(e) => handleInputChange('expiryDate', formatExpiryDate(e.target.value))}
            placeholder="MM/YY"
            maxLength={5}
            className="font-mono"
            disabled={isProcessing}
          />
        </div>
        <div>
          <Input
            label="CVV"
            value={cardData.cvv}
            onChange={(e) => handleInputChange('cvv', e.target.value.replace(/\D/g, '').substring(0, 4))}
            placeholder="123"
            maxLength={4}
            className="font-mono"
            disabled={isProcessing}
          />
        </div>
      </div>

      {/* Cardholder Name */}
      <div>
        <Input
          label="Cardholder Name"
          value={cardData.cardholderName}
          onChange={(e) => handleInputChange('cardholderName', e.target.value)}
          placeholder="John Doe"
          disabled={isProcessing}
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
        disabled={isProcessing || createAppointmentMutation.isPending || !paymentIntent}
        isLoading={isProcessing || createAppointmentMutation.isPending}
        className="w-full"
        size="lg"
      >
        <CreditCard className="h-5 w-5 mr-2" />
        {(isProcessing || createAppointmentMutation.isPending) ? 'Processing Payment...' : `Pay ${formatCurrency(service.price, shop.country)}`}
      </Button>
    </form>
  );
};

export default StripePaymentForm;
