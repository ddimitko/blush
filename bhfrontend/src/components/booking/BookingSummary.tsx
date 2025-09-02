import React, { useState } from 'react';
import { Calendar, Clock, User, MapPin, CreditCard, DollarSign, CheckCircle } from 'lucide-react';
import { Shop, Service, Employee, AvailableSlot, PaymentMethod } from '../../types';
import { useCreateAppointmentMutation } from '../../hooks/queries';
import { useBookingUIStore } from '../../store/uiStore';
import { formatCurrency, formatTime, getAvatarUrl, getInitials, createUTCAppointmentDateTime } from '../../lib/utils';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';

interface CustomerData {
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
}

interface BookingSummaryProps {
  shop: Shop;
  service: Service;
  employee: Employee;
  date: string;
  slot: AvailableSlot;
  customerData: CustomerData;
  paymentMethod: PaymentMethod;
  onConfirm: () => void;
}

const BookingSummary: React.FC<BookingSummaryProps> = ({
  shop,
  service,
  employee,
  date,
  slot,
  customerData,
  paymentMethod,
  onConfirm,
}) => {
  const { currentLockSessionId } = useBookingUIStore();
  const createAppointmentMutation = useCreateAppointmentMutation();
  const [isConfirming, setIsConfirming] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);

  const appointmentDate = new Date(date);
  const formattedDate = appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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

  const handleConfirmBooking = async () => {
    if (!currentLockSessionId) {
      console.error('No lock session ID available');
      return;
    }

    setIsConfirming(true);

    try {
      await createAppointmentMutation.mutateAsync({
        shopId: shop.id,
        serviceId: service.id,
        employeeId: employee.id,
        appointmentDateTime: createUTCAppointmentDateTime(date, slot.time || slot.startTime),
        paymentType: paymentMethod,
        guestEmail: customerData.customerEmail,
        guestFirstName: customerData.customerFirstName,
        guestLastName: customerData.customerLastName,
        guestPhone: convertPhoneNumber(customerData.customerPhone),
        notes: customerData.notes,
        slotLockToken: currentLockSessionId,
      });

      setBookingComplete(true);
      setTimeout(() => {
        onConfirm();
      }, 2000);
    } catch (error) {
      console.error('Booking failed:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  if (bookingComplete) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Booking Confirmed!
        </h3>
        <p className="text-gray-600 mb-4">
          Your appointment has been successfully booked.
        </p>
        <p className="text-sm text-gray-500">
          You'll receive a confirmation email shortly.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-6">
        Review Your Booking
      </h3>
      
      <div className="space-y-6">
        {/* Shop Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">{shop.name}</h4>
          <div className="flex items-center text-gray-600 text-sm">
            <MapPin className="h-4 w-4 mr-1" />
            {shop.address}, {shop.city}, {shop.state}
          </div>
        </div>
        
        {/* Service Details */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-1">{service.name}</h4>
              {service.description && (
                <p className="text-gray-600 text-sm">{service.description}</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(service.price, shop.country)}
              </div>
              <div className="text-sm text-gray-600">
                {service.durationMinutes} minutes
              </div>
            </div>
          </div>
        </div>
        
        {/* Employee Details */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            {employee.avatar ? (
              <img
                src={getAvatarUrl(employee.avatar)}
                alt={employee.fullName || employee.name || 'Employee'}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">
                  {getInitials(
                    (employee.fullName || employee.name || '').split(' ')[0] || '',
                    (employee.fullName || employee.name || '').split(' ')[1] || ''
                  )}
                </span>
              </div>
            )}
            <div>
              <h4 className="font-medium text-gray-900">{employee.fullName || employee.name || 'Unknown Employee'}</h4>
              {employee.specialties && (
                <p className="text-gray-600 text-sm">{employee.specialties}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Date & Time */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <div className="font-medium text-gray-900">{formattedDate}</div>
                <div className="text-sm text-gray-600">Date</div>
              </div>
            </div>
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <div className="font-medium text-gray-900">{formatTime(slot.time)}</div>
                <div className="text-sm text-gray-600">Time</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Customer Information */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Contact Information</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <User className="h-4 w-4 text-gray-400 mr-3" />
              <span>{`${customerData.customerFirstName} ${customerData.customerLastName}`.trim()}</span>
            </div>
            <div className="flex items-center">
              <span className="w-4 h-4 mr-3 text-gray-400">@</span>
              <span>{customerData.customerEmail}</span>
            </div>
            <div className="flex items-center">
              <span className="w-4 h-4 mr-3 text-gray-400">📞</span>
              <span>{customerData.customerPhone}</span>
            </div>
          </div>
          
          {customerData.notes && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h5 className="font-medium text-gray-900 mb-1">Special Notes</h5>
              <p className="text-gray-600 text-sm">{customerData.notes}</p>
            </div>
          )}
        </div>
        
        {/* Payment Method */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            {paymentMethod === 'CARD' ? (
              <CreditCard className="h-5 w-5 text-gray-400 mr-3" />
            ) : (
              <DollarSign className="h-5 w-5 text-gray-400 mr-3" />
            )}
            <div>
              <div className="font-medium text-gray-900">
                {paymentMethod === 'CARD' ? 'Card Payment' : 'Pay at Shop'}
              </div>
              <div className="text-sm text-gray-600">
                {paymentMethod === 'CARD' 
                  ? 'Secure payment with credit/debit card'
                  : 'Pay with cash or card when you arrive'
                }
              </div>
            </div>
          </div>
        </div>
        
        {/* Total */}
        <div className="bg-gray-900 text-white rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium">Total</span>
            <span className="text-2xl font-bold">{formatCurrency(service.price, shop.country)}</span>
          </div>
          {paymentMethod === 'CASH' && (
            <p className="text-gray-300 text-sm mt-2">
              Payment due at appointment
            </p>
          )}
        </div>
      </div>
      
      {/* Error Message */}
      {createAppointmentMutation.error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">
            {createAppointmentMutation.error?.message || 'Failed to create appointment'}
          </p>
        </div>
      )}

      {/* Confirmation Button */}
      <div className="mt-8">
        <Button
          onClick={handleConfirmBooking}
          size="lg"
          className="w-full"
          disabled={isConfirming || createAppointmentMutation.isPending}
          isLoading={isConfirming || createAppointmentMutation.isPending}
        >
          {paymentMethod === 'CARD' ? 'Confirm & Pay' : 'Confirm Booking'}
        </Button>
        
        <p className="text-center text-sm text-gray-500 mt-3">
          By confirming, you agree to our terms of service and cancellation policy.
        </p>
      </div>
    </div>
  );
};

export default BookingSummary;
