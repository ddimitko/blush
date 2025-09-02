import React, { useState } from 'react';
import { CreditCard, DollarSign, Shield, Clock, MapPin, User, Calendar, AlertCircle } from 'lucide-react';
import { Shop, Service, Employee, AvailableSlot, PaymentMethod, Appointment } from '../../types';
import { formatCurrency, formatTime, formatDate, getCurrencyForCountry, createUTCAppointmentDateTime } from '../../lib/utils';
import { getUserTimezone } from '../../lib/timezone';
import { useBookingUIStore } from '../../store/uiStore';
import { useCreateAppointmentMutation } from '../../hooks/queries';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import SlotCountdown from './SlotCountdown';

interface CustomerData {
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
}

interface PaymentSummaryProps {
  shop: Shop;
  service: Service;
  employee: Employee;
  date: string;
  slot: AvailableSlot;
  customerData: CustomerData;
  onSuccess: (appointment: Appointment) => void;
  onBack: () => void;
}

const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  shop,
  service,
  employee,
  date,
  slot,
  customerData,
  onSuccess,
  onBack,
}) => {
  const { isAuthenticated } = useAuth();
  const { currentLockSessionId } = useBookingUIStore();
  const createAppointmentMutation = useCreateAppointmentMutation();
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(
    shop.acceptsCardPayments ? 'CARD' : 'CASH'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);



  const formattedPrice = formatCurrency(service.price, shop.country);

  const appointmentDate = new Date(date);
  const formattedDate = formatDate(appointmentDate);
  const formattedTime = formatTime(slot.time);

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    setBookingError(null);
  };

  const handleConfirmBooking = async () => {
    if (!currentLockSessionId) {
      setBookingError('Slot lock has expired. Please select a new time slot.');
      return;
    }

    setIsProcessing(true);
    setBookingError(null);

    try {
      // Use the UTC time directly from the slot (no conversion needed)
      const timeToUse = slot.startTime || slot.time;
      const appointmentDateTime = createUTCAppointmentDateTime(date, timeToUse);

      // Build appointment data based on authentication status
      const appointmentData: any = {
        shopId: shop.id,
        serviceId: service.id,
        employeeId: employee.id,
        appointmentDateTime: appointmentDateTime,
        paymentType: selectedPaymentMethod.toUpperCase(), // Ensure it matches the enum (CARD/CASH)
        notes: customerData.notes || '',
        slotLockToken: currentLockSessionId,
      };

      // Convert phone number to proper format
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

      // Add guest information for all users (backend will ignore for authenticated users)
      // But we need to send valid data to pass validation
      if (!isAuthenticated) {
        // For unauthenticated users, use actual customer data
        appointmentData.guestEmail = customerData.customerEmail;
        appointmentData.guestFirstName = customerData.customerFirstName;
        appointmentData.guestLastName = customerData.customerLastName;
        appointmentData.guestPhone = convertPhoneNumber(customerData.customerPhone);
      } else {
        // For authenticated users, send dummy valid data to pass validation
        // Backend will ignore these fields for authenticated users anyway
        appointmentData.guestEmail = 'dummy@example.com';
        appointmentData.guestFirstName = 'Dummy';
        appointmentData.guestLastName = 'User';
        appointmentData.guestPhone = '+1234567890'; // Valid format that passes regex
      }





      const appointment = await createAppointmentMutation.mutateAsync(appointmentData);
      onSuccess(appointment);
    } catch (error: any) {
      setBookingError(error.response?.data?.message || 'Failed to create appointment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Slot Countdown */}
      <SlotCountdown 
        onExpired={() => setBookingError('Your slot reservation has expired. Please select a new time slot.')}
      />

      {/* Booking Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Booking Summary
        </h3>
        
        <div className="space-y-4">
          {/* Shop Info */}
          <div className="flex items-start space-x-3">
            <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">{shop.name}</p>
              <p className="text-sm text-gray-600">{shop.address}</p>
            </div>
          </div>

          {/* Service Info */}
          <div className="flex items-start space-x-3">
            <div className="h-5 w-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
              <div className="h-2 w-2 bg-blue-600 rounded-full" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{service.name}</p>
              <p className="text-sm text-gray-600">{service.durationMinutes} minutes • {formattedPrice}</p>
            </div>
          </div>

          {/* Employee Info */}
          <div className="flex items-start space-x-3">
            <User className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">{employee.firstName} {employee.lastName}</p>
              <p className="text-sm text-gray-600">{employee.specialties}</p>
            </div>
          </div>

          {/* Date & Time */}
          <div className="flex items-start space-x-3">
            <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">{formattedDate}</p>
              <p className="text-sm text-gray-600">{formattedTime}</p>
            </div>
          </div>

          {/* Customer Info */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-2">Customer Information</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Name:</strong> {`${customerData.customerFirstName} ${customerData.customerLastName}`.trim()}</p>
              <p><strong>Email:</strong> {customerData.customerEmail}</p>
              <p><strong>Phone:</strong> {customerData.customerPhone}</p>
              {customerData.notes && (
                <p><strong>Notes:</strong> {customerData.notes}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method Selection */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Payment Method
        </h3>
        
        <div className="space-y-3">
          {/* Card Payment Option */}
          {shop.acceptsCardPayments && (
            <div
              onClick={() => handlePaymentMethodSelect('CARD')}
              className={`
                p-4 border rounded-lg cursor-pointer transition-all
                ${selectedPaymentMethod === 'CARD'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`
                    w-4 h-4 rounded-full border-2 flex items-center justify-center
                    ${selectedPaymentMethod === 'CARD' ? 'border-blue-500' : 'border-gray-300'}
                  `}>
                    {selectedPaymentMethod === 'CARD' && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </div>
                  <CreditCard className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">Card Payment</p>
                    <p className="text-sm text-gray-600">Pay securely with your credit or debit card</p>
                  </div>
                </div>
                <Shield className="h-5 w-5 text-green-500" />
              </div>
            </div>
          )}

          {/* Cash Payment Option */}
          <div
            onClick={() => handlePaymentMethodSelect('CASH')}
            className={`
              p-4 border rounded-lg cursor-pointer transition-all
              ${selectedPaymentMethod === 'CASH'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`
                  w-4 h-4 rounded-full border-2 flex items-center justify-center
                  ${selectedPaymentMethod === 'CASH' ? 'border-blue-500' : 'border-gray-300'}
                `}>
                  {selectedPaymentMethod === 'CASH' && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </div>
                <DollarSign className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Cash Payment</p>
                  <p className="text-sm text-gray-600">Pay in cash when you arrive</p>
                </div>
              </div>
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Payment Info */}
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

      {/* Total */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="text-lg font-medium text-gray-900">Total</span>
          <span className="text-2xl font-bold text-gray-900">{formattedPrice}</span>
        </div>
      </div>

      {/* Error Message */}
      {(bookingError || createAppointmentMutation.error) && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700 text-sm">
              {bookingError || createAppointmentMutation.error?.message || 'An error occurred'}
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isProcessing || createAppointmentMutation.isPending}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={handleConfirmBooking}
          disabled={!selectedPaymentMethod || isProcessing || createAppointmentMutation.isPending}
          className="flex-1"
        >
          {isProcessing || createAppointmentMutation.isPending ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Creating Appointment...
            </>
          ) : (
            'Confirm Booking'
          )}
        </Button>
      </div>
    </div>
  );
};

export default PaymentSummary;
