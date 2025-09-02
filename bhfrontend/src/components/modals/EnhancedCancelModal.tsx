import React, { useState } from 'react';
import { AlertCircle, DollarSign, Trash2 } from 'lucide-react';
import { Appointment } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../ui/Toast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { formatCurrency } from '../../lib/utils';
import { apiClient } from '../../lib/api';

interface EnhancedCancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
  onSuccess: () => void;
}

const EnhancedCancelModal: React.FC<EnhancedCancelModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [reason, setReason] = useState('');
  const [refundAmount, setRefundAmount] = useState(appointment.totalAmount);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if user can choose refund amount (owners and employees only)
  const canChooseRefundAmount = user && (
    user.role === 'OWNER' || user.role === 'EMPLOYEE'
  );

  // Check if appointment has successful card payment
  // Note: paymentIntentId might be undefined for some appointments, but if paymentStatus is succeeded, it's a valid card payment
  const hasSuccessfulCardPayment = appointment.paymentType === 'CARD' &&
    (appointment.paymentStatus?.toLowerCase() === 'paid' || appointment.paymentStatus?.toLowerCase() === 'succeeded') &&
    appointment.totalAmount > 0;



  // Only show refund options to owners and employees for successful card payments
  const showRefundOptions = canChooseRefundAmount && hasSuccessfulCardPayment;

  const handleCancel = async () => {
    setIsProcessing(true);
    try {
      // Only pass refund amount if user can choose it and appointment has card payment
      const refundAmountToSend = showRefundOptions ? refundAmount : undefined;

      await apiClient.cancelAppointment(appointment.id, reason, refundAmountToSend);

      const refundMessage = hasSuccessfulCardPayment
        ? ` A refund of ${formatCurrency(refundAmountToSend || appointment.totalAmount, appointment.shop.country)} will be processed.`
        : '';

      success('Appointment cancelled', `The appointment has been cancelled successfully.${refundMessage}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      error('Failed to cancel appointment', err.response?.data?.message || 'Please try again later.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setReason('');
      setRefundAmount(appointment.totalAmount);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Cancel Appointment"
      size="md"
    >
      <div className="space-y-6">
        {/* Warning */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-800">
                Are you sure you want to cancel this appointment?
              </h4>
              <p className="text-sm text-red-700 mt-1">
                This action cannot be undone.
                {hasSuccessfulCardPayment && ' The payment will be refunded automatically.'}
              </p>
            </div>
          </div>
        </div>

        {/* Appointment Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Appointment Details</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <div>Customer: {appointment.customerName}</div>
            <div>Service: {appointment.service.name}</div>
            <div>Date: {new Date(appointment.appointmentDateTime).toLocaleDateString()}</div>
            <div>Time: {new Date(appointment.appointmentDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            {hasSuccessfulCardPayment && (
              <div>Payment: {formatCurrency(appointment.totalAmount, appointment.shop.country)} (Card)</div>
            )}
          </div>
        </div>

        {/* Refund Amount Selection (only for owners/employees with card payments) */}
        {showRefundOptions && (
          <div>
            <label htmlFor="refundAmount" className="block text-sm font-medium text-gray-700 mb-2">
              Refund Amount
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="number"
                id="refundAmount"
                value={refundAmount}
                onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                min="0"
                max={appointment.totalAmount}
                step="0.01"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent-500 focus:border-accent-500"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Maximum refund: {formatCurrency(appointment.totalAmount, appointment.shop.country)}
            </p>
            
            {/* Quick refund options */}
            <div className="flex space-x-2 mt-2">
              <button
                type="button"
                onClick={() => setRefundAmount(0)}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                No Refund
              </button>
              <button
                type="button"
                onClick={() => setRefundAmount(appointment.totalAmount * 0.5)}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                50% Refund
              </button>
              <button
                type="button"
                onClick={() => setRefundAmount(appointment.totalAmount)}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Full Refund
              </button>
            </div>
          </div>
        )}

        {/* Cancellation Reason */}
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
            Reason for Cancellation
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent-500 focus:border-accent-500"
            placeholder="Please provide a reason for cancelling this appointment..."
          />
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
            className="flex-1"
          >
            Keep Appointment
          </Button>
          <Button
            variant="primary"
            onClick={handleCancel}
            disabled={isProcessing || (showRefundOptions && refundAmount > appointment.totalAmount)}
            isLoading={isProcessing}
            className="flex-1 bg-red-600 hover:bg-red-700"
            icon={<Trash2 className="w-4 h-4" />}
          >
            {isProcessing ? 'Cancelling...' : 'Cancel Appointment'}
          </Button>
        </div>

        {/* Refund Info */}
        {hasSuccessfulCardPayment && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start">
              <DollarSign className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Refund Information</p>
                <p className="mt-1">
                  {showRefundOptions
                    ? `A refund of ${formatCurrency(refundAmount, appointment.shop.country)} will be processed automatically.`
                    : `A full refund of ${formatCurrency(appointment.totalAmount, appointment.shop.country)} will be processed automatically.`
                  }
                  {' '}Refunds typically take 5-10 business days to appear in the customer's account.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default EnhancedCancelModal;
