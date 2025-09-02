import React from 'react';
import { X, Calendar, Clock, User, MapPin } from 'lucide-react';
import Modal from '../ui/Modal';
import GuestReviewForm from '../guest/GuestReviewForm';
import { GuestAppointmentForReview } from '../../types';
import { formatDate, formatTime } from '../../lib/utils';

interface GuestReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: GuestAppointmentForReview;
  guestEmail: string;
  onSuccess?: (response: any) => void;
}

const GuestReviewModal: React.FC<GuestReviewModalProps> = ({
  isOpen,
  onClose,
  appointment,
  guestEmail,
  onSuccess,
}) => {
  const handleSuccess = (response: any) => {
    onSuccess?.(response);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Review Your Appointment
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Appointment Details */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Appointment Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <div>
                <span className="text-gray-500">Shop:</span>
                <span className="ml-1 font-medium text-gray-900">{appointment.shopName}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-400" />
              <div>
                <span className="text-gray-500">Provider:</span>
                <span className="ml-1 font-medium text-gray-900">{appointment.employeeName}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <span className="text-gray-500">Service:</span>
                <span className="ml-1 font-medium text-gray-900">{appointment.serviceName}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <div>
                <span className="text-gray-500">Date & Time:</span>
                <span className="ml-1 font-medium text-gray-900">
                  {formatDate(appointment.appointmentDateTime)} at {formatTime(appointment.appointmentDateTime)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Review Form */}
        <div className="p-6">
          <GuestReviewForm
            appointment={appointment}
            guestEmail={guestEmail}
            onSuccess={handleSuccess}
            onCancel={onClose}
          />
        </div>
      </div>
    </Modal>
  );
};

export default GuestReviewModal;
