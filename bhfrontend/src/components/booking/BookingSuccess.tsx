import React from 'react';
import { CheckCircle, Calendar, MapPin, User, CreditCard, DollarSign, Mail, Phone } from 'lucide-react';
import { Shop, Service, Employee, AvailableSlot, PaymentMethod, Appointment } from '../../types';
import { formatCurrency, formatTime, formatDate } from '../../lib/utils';
import Button from '../ui/Button';

interface CustomerData {
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
}

interface BookingSuccessProps {
  appointment: Appointment;
  shop: Shop;
  service: Service;
  employee: Employee;
  date: string;
  slot: AvailableSlot;
  customerData: CustomerData;
  paymentMethod: PaymentMethod;
  isAuthenticated?: boolean;
  onGoToShop: () => void;
  onViewAppointments: () => void;
  onCreateAccount?: () => void;
}

const BookingSuccess: React.FC<BookingSuccessProps> = ({
  appointment,
  shop,
  service,
  employee,
  date,
  slot,
  customerData,
  paymentMethod,
  isAuthenticated = false,
  onGoToShop,
  onViewAppointments,
  onCreateAccount,
}) => {
  const appointmentDate = new Date(date);
  const formattedDate = formatDate(appointmentDate);
  const formattedTime = formatTime(slot.time);



  const formattedPrice = formatCurrency(service.price, shop.country);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Booking Confirmed!
        </h2>
        <p className="text-gray-600">
          Your appointment has been successfully created. You'll receive a confirmation email shortly.
        </p>
      </div>

      {/* Appointment Details Card */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Appointment Details
        </h3>
        
        <div className="space-y-4">
          {/* Appointment ID */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Appointment ID</p>
            <p className="font-mono text-sm font-medium text-gray-900">
              {appointment.id}
            </p>
          </div>

          {/* Shop Info */}
          <div className="flex items-start space-x-3">
            <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">{shop.name}</p>
              <p className="text-sm text-gray-600">{shop.address}</p>
              <p className="text-sm text-gray-600">{shop.phone}</p>
            </div>
          </div>

          {/* Service Info */}
          <div className="flex items-start space-x-3">
            <div className="h-5 w-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
              <div className="h-2 w-2 bg-blue-600 rounded-full" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{service.name}</p>
              <p className="text-sm text-gray-600">
                {service.durationMinutes} minutes • {formattedPrice}
              </p>
              {service.description && (
                <p className="text-sm text-gray-500 mt-1">{service.description}</p>
              )}
            </div>
          </div>

          {/* Employee Info */}
          <div className="flex items-start space-x-3">
            <User className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">
                {employee.firstName} {employee.lastName}
              </p>
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

          {/* Payment Method */}
          <div className="flex items-start space-x-3">
            {paymentMethod === 'CARD' ? (
              <CreditCard className="h-5 w-5 text-gray-400 mt-0.5" />
            ) : (
              <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
            )}
            <div>
              <p className="font-medium text-gray-900">
                {paymentMethod === 'CARD' ? 'Card Payment' : 'Cash Payment'}
              </p>
              <p className="text-sm text-gray-600">
                {paymentMethod === 'CARD' 
                  ? 'Payment will be processed at the time of service'
                  : 'Pay in cash when you arrive'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Customer Information
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <User className="h-5 w-5 text-gray-400" />
            <span className="text-gray-900">{`${customerData.customerFirstName} ${customerData.customerLastName}`.trim()}</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <Mail className="h-5 w-5 text-gray-400" />
            <span className="text-gray-900">{customerData.customerEmail}</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <Phone className="h-5 w-5 text-gray-400" />
            <span className="text-gray-900">{customerData.customerPhone}</span>
          </div>

          {customerData.notes && (
            <div className="pt-2 border-t">
              <p className="text-sm text-gray-600 font-medium mb-1">Notes:</p>
              <p className="text-sm text-gray-900">{customerData.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-blue-900 mb-3">
          What's Next?
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2" />
            <span>You'll receive a confirmation email with all the details</span>
          </li>
          <li className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2" />
            <span>We'll send you a reminder 24 hours before your appointment</span>
          </li>
          <li className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2" />
            <span>Arrive 5-10 minutes early for your appointment</span>
          </li>
          {paymentMethod === 'CASH' && (
            <li className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2" />
              <span>Bring cash for payment ({formattedPrice})</span>
            </li>
          )}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          variant="outline"
          onClick={onGoToShop}
          className="flex-1"
        >
          Back to Shop
        </Button>
        {isAuthenticated ? (
          <Button
            onClick={onViewAppointments}
            className="flex-1"
          >
            View My Appointments
          </Button>
        ) : (
          <Button
            onClick={onCreateAccount || onViewAppointments}
            className="flex-1"
          >
            Create an Account
          </Button>
        )}
      </div>

      {/* Contact Information */}
      <div className="mt-8 text-center text-sm text-gray-600">
        <p>
          Need to make changes? Contact {shop.name} at{' '}
          <a href={`tel:${shop.phone}`} className="text-blue-600 hover:underline">
            {shop.phone}
          </a>
          {shop.email && (
            <>
              {' '}or{' '}
              <a href={`mailto:${shop.email}`} className="text-blue-600 hover:underline">
                {shop.email}
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default BookingSuccess;
