import React, { useState } from 'react';
import { DollarSign, AlertTriangle } from 'lucide-react';
import { Appointment } from '../../types';
import { useToast } from '../ui/Toast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { formatCurrency } from '../../lib/utils';
import { apiClient } from '../../lib/api';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
  onSuccess: () => void;
}

const RefundModal: React.FC<RefundModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}) => {
  const { success, error } = useToast();
  const [refundAmount, setRefundAmount] = useState(appointment.totalAmount);
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRefund = async () => {
    if (refundAmount <= 0 || refundAmount > appointment.totalAmount) {
      error('Invalid refund amount', 'Refund amount must be between 0 and the total appointment amount.');
      return;
    }

    setIsProcessing(true);
    try {
      await apiClient.refundAppointment(appointment.id, refundAmount, reason);
      success('Refund processed', `Refund of ${formatCurrency(refundAmount, appointment.shop.country)} has been processed successfully.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      error('Failed to process refund', err.response?.data?.message || 'Please try again later.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setRefundAmount(appointment.totalAmount);
      setReason('');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Process Refund"
      size="md"
    >
      <div className="space-y-6">
        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Refund Warning</h4>
              <p className="text-sm text-yellow-700 mt-1">
                This action will process a refund through Stripe and cannot be undone. 
                The refund may take 5-10 business days to appear in the customer's account.
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
            <div>Total Amount: {formatCurrency(appointment.totalAmount, appointment.shop.country)}</div>
          </div>
        </div>

        {/* Refund Amount */}
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
        </div>

        {/* Reason */}
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
            Reason for Refund
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent-500 focus:border-accent-500"
            placeholder="Enter reason for refund (optional)"
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
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleRefund}
            disabled={isProcessing || refundAmount <= 0 || refundAmount > appointment.totalAmount}
            isLoading={isProcessing}
            className="flex-1"
          >
            {isProcessing ? 'Processing...' : `Refund ${formatCurrency(refundAmount, appointment.shop.country)}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RefundModal;
