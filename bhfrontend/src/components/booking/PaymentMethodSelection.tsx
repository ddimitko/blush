import React, { useState } from 'react';
import { CreditCard, DollarSign, ChevronDown, ChevronUp, Shield, Clock } from 'lucide-react';
import { Shop, PaymentMethod, Appointment, UserPaymentMethod } from '../../types';
import { formatCurrency, createUTCAppointmentDateTime } from '../../lib/utils';
import { useBookingUIStore } from '../../store/uiStore';
import { useCreateAppointmentMutation } from '../../hooks/queries';
import Button from '../ui/Button';
import SmartPaymentForm from './SmartPaymentForm';
import SavedPaymentMethodSelector from './SavedPaymentMethodSelector';
import EnhancedStripeConnectPaymentForm from './EnhancedStripeConnectPaymentForm';
import { useAuth } from '../../hooks/useAuth';

interface CustomerData {
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
}

interface PaymentMethodSelectionProps {
  shop: Shop;
  service: any;
  employee: any;
  date: string;
  slot: any;
  customerData: CustomerData;
  onSuccess: (appointment: Appointment) => void;
  onBack: () => void;
}

const PaymentMethodSelection: React.FC<PaymentMethodSelectionProps> = ({
  shop,
  service,
  employee,
  date,
  slot,
  customerData,
  onSuccess,
  onBack,
}) => {

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(
    shop.acceptsCardPayments ? 'CARD' : 'CASH'
  );
  const [expandedAccordion, setExpandedAccordion] = useState<PaymentMethod | null>(
    shop.acceptsCardPayments ? 'CARD' : 'CASH'
  );
  const [isProcessingCash, setIsProcessingCash] = useState(false);
  const [selectedSavedPaymentMethod, setSelectedSavedPaymentMethod] = useState<UserPaymentMethod | null>(null);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');
  const [saveNewPaymentMethod, setSaveNewPaymentMethod] = useState(false);
  const [showSavedMethods, setShowSavedMethods] = useState(false);
  const { currentLockSessionId } = useBookingUIStore();
  const createAppointmentMutation = useCreateAppointmentMutation();
  const { isAuthenticated } = useAuth();

  const handleAccordionToggle = (method: PaymentMethod) => {
    setExpandedAccordion(expandedAccordion === method ? null : method);
    setSelectedPaymentMethod(method);

    // Reset payment method selections when switching between CARD and CASH
    if (method === 'CARD') {
      setSelectedSavedPaymentMethod(null);
      setSelectedPaymentMethodId('');
      setSaveNewPaymentMethod(false);
    }
  };

  const handleSavedPaymentMethodSelect = (paymentMethod: UserPaymentMethod) => {
    setSelectedSavedPaymentMethod(paymentMethod);
    setSelectedPaymentMethodId(paymentMethod.id);
  };

  const handleNewPaymentMethodSelect = () => {
    setSelectedSavedPaymentMethod(null);
    setSelectedPaymentMethodId('new');
  };

  const handleSavedMethodsToggle = () => {
    setShowSavedMethods(!showSavedMethods);
    if (!showSavedMethods) {
      // Reset selections when opening saved methods
      setSelectedSavedPaymentMethod(null);
      setSelectedPaymentMethodId('');
    }
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

  const handleCashPayment = async () => {
    if (!currentLockSessionId) {
      console.error('No lock session ID available');
      return;
    }

    setIsProcessingCash(true);
    try {
      // Create appointment with cash payment using React Query mutation
      const appointmentData = {
        shopId: shop.id,
        serviceId: service.id,
        employeeId: employee.id,
        appointmentDateTime: createUTCAppointmentDateTime(date, slot.time || slot.startTime),
        paymentType: 'CASH' as PaymentMethod,
        notes: customerData.notes,
        slotLockToken: currentLockSessionId,
        // Add guest information based on authentication status
        guestEmail: !isAuthenticated ? customerData.customerEmail : 'dummy@example.com',
        guestFirstName: !isAuthenticated ? customerData.customerFirstName : 'Dummy',
        guestLastName: !isAuthenticated ? customerData.customerLastName : 'User',
        guestPhone: !isAuthenticated ? convertPhoneNumber(customerData.customerPhone) : '+1234567890',
      };

      const appointment = await createAppointmentMutation.mutateAsync(appointmentData);
      onSuccess(appointment);
    } catch (error) {
      console.error('Cash payment failed:', error);
    } finally {
      setIsProcessingCash(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Payment Method
          </h3>
          <p className="text-gray-600">
            Choose how you'd like to pay for your appointment
          </p>
        </div>

        <div className="space-y-3">
          {/* Card Payment Accordion */}
          {shop.acceptsCardPayments && (
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
              <button
                onClick={() => handleAccordionToggle('CARD')}
                className={`
                  w-full p-5 text-left transition-all duration-300 transform hover:scale-[1.01]
                  ${expandedAccordion === 'CARD'
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-white hover:bg-blue-50/30'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center
                      ${expandedAccordion === 'CARD'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                      }
                    `}>
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Card Payment</h4>
                      <p className="text-sm text-gray-600">Pay securely with your card</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(service.price, shop.country)}
                    </span>
                    {expandedAccordion === 'CARD' ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </button>

              {expandedAccordion === 'CARD' && (
                <div className="p-4 bg-blue-50 border-t border-blue-200">
                  <div className="mb-4">
                    <div className="flex items-start space-x-2 text-sm text-blue-700">
                      <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Secure Payment</p>
                        <ul className="mt-1 space-y-1">
                          <li>• Payment processed securely through Stripe Connect</li>
                          <li>• Payment goes directly to {shop.name}</li>
                          <li>• Your card details are encrypted and never stored</li>
                          <li>• Instant confirmation and receipt</li>
                          <li>• Easy refunds if you need to cancel</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Authenticated users see saved payment methods option */}
                  {isAuthenticated ? (
                    <div className="space-y-4">
                      <SavedPaymentMethodSelector
                        onSelectSavedMethod={handleSavedPaymentMethodSelect}
                        onSelectNewMethod={handleNewPaymentMethodSelect}
                        selectedMethodId={selectedPaymentMethodId}
                        isExpanded={showSavedMethods}
                        onToggleExpanded={handleSavedMethodsToggle}
                      />

                      {/* Show payment form when a method is selected */}
                      {(selectedSavedPaymentMethod || selectedPaymentMethodId === 'new') && (
                        <EnhancedStripeConnectPaymentForm
                          key={`${shop.id}-${service.id}-${employee.id}-${selectedPaymentMethodId}`}
                          shop={shop}
                          service={service}
                          employee={employee}
                          date={date}
                          slot={slot}
                          customerData={customerData}
                          onSuccess={onSuccess}
                          selectedPaymentMethod={selectedSavedPaymentMethod || undefined}
                          savePaymentMethod={selectedPaymentMethodId === 'new' ? saveNewPaymentMethod : false}
                          onSavePaymentMethodChange={selectedPaymentMethodId === 'new' ? setSaveNewPaymentMethod : undefined}
                        />
                      )}
                    </div>
                  ) : (
                    /* Guest users see regular payment form */
                    <SmartPaymentForm
                      key={`${shop.id}-${service.id}-${employee.id}`}
                      shop={shop}
                      service={service}
                      employee={employee}
                      date={date}
                      slot={slot}
                      customerData={customerData}
                      onSuccess={onSuccess}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Cash Payment Accordion */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
            <button
              onClick={() => handleAccordionToggle('CASH')}
              className={`
                w-full p-5 text-left transition-all duration-300 transform hover:scale-[1.01]
                ${expandedAccordion === 'CASH'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-white hover:bg-green-50/30'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center
                    ${expandedAccordion === 'CASH'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Cash Payment</h4>
                    <p className="text-sm text-gray-600">Pay when you arrive</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(service.price, shop.country)}
                  </span>
                  {expandedAccordion === 'CASH' ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
            </button>

            {expandedAccordion === 'CASH' && (
              <div className="p-4 bg-green-50 border-t border-green-200">
                <div className="mb-4">
                  <div className="flex items-start space-x-2 text-sm text-green-700">
                    <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Pay at the Shop</p>
                      <ul className="mt-1 space-y-1">
                        <li>• No payment required now</li>
                        <li>• Pay the full amount when you arrive</li>
                        <li>• Bring exact change if possible</li>
                        <li>• Your appointment is confirmed upon booking</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleCashPayment}
                  disabled={isProcessingCash || createAppointmentMutation.isPending}
                  isLoading={isProcessingCash || createAppointmentMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  Confirm Appointment
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Payment Method Disabled Notice */}
        {!shop.acceptsCardPayments && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">
              Payment Information
            </h4>
            <p className="text-yellow-700 text-sm">
              This shop currently accepts cash payments only. 
              You can pay when you arrive for your appointment.
            </p>
          </div>
        )}
      </div>

      {/* Back Button */}
      <div className="flex justify-start">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isProcessingCash || createAppointmentMutation.isPending}
        >
          Back to Details
        </Button>
      </div>
    </div>
  );
};

export default PaymentMethodSelection;
