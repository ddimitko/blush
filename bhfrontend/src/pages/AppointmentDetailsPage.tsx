import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  CreditCard,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit3,
  Trash2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { apiClient } from '../lib/api';
import { Appointment } from '../types';
import { useShopEmployeesQuery } from '../hooks/queries';
import { formatCurrency, formatDateTime, formatTime } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import EnhancedCancelModal from '../components/modals/EnhancedCancelModal';
import AppointmentEditModal from '../components/modals/AppointmentEditModal';
import AppointmentStatusButton from '../components/appointments/AppointmentStatusButton';
import OwnerAppointmentEditModal from '../components/modals/OwnerAppointmentEditModal';
import { SkeletonCard } from '../components/ui/Skeleton';

const AppointmentDetailsPage: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [appointment, setAppointment] = useState<Appointment | null>(null);

  // Get employees for owner edit modal (private query for owners)
  const { data: employees = [] } = useShopEmployeesQuery(
    appointment?.shop.id && user?.role === 'OWNER' ? appointment.shop.id : undefined,
    false // private query for owners
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);
  const [newStatus, setNewStatus] = useState('');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  useEffect(() => {
    if (appointmentId) {
      loadAppointment();
    }
  }, [appointmentId]);

  const loadAppointment = async () => {
    if (!appointmentId) return;

    setIsLoading(true);
    try {
      const appointmentData = await apiClient.getAppointment(appointmentId);
      setAppointment(appointmentData);
    } catch (err: any) {
      error('Failed to load appointment details', err.response?.data?.message || 'Please try again later.');
      // Navigate back if appointment not found or access denied
      setTimeout(() => navigate(-1), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'CANCELLED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'PENDING':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'IN_PROGRESS':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'NO_SHOW':
        return <XCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'NO_SHOW':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canEdit = () => {
    if (!appointment || !user) return false;

    // Check if user is the customer, employee, or shop owner
    const isCustomer = appointment.customer?.id === user.id;
    const isEmployee = appointment.employee.user?.id === user.id;
    const isOwner = appointment.shop.owner?.id === user.id;

    return isCustomer || isEmployee || isOwner;
  };

  const canCancel = () => {
    if (!appointment || !user) return false;

    // Owners can cancel anytime, customers/employees need 1 hour buffer
    const isOwner = appointment.shop.owner?.id === user.id;
    if (isOwner) {
      return ['PENDING', 'CONFIRMED'].includes(appointment.status);
    }

    // Can cancel if confirmed and appointment is more than 1 hour away
    const appointmentTime = new Date(appointment.appointmentDateTime);
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

    return appointment.status === 'CONFIRMED' && appointmentTime > oneHourFromNow;
  };

  const canRefund = () => {
    if (!appointment || !user) return false;

    // Only owners can issue refunds for card payments
    const isOwner = appointment.shop.owner?.id === user.id;
    return isOwner &&
           appointment.paymentType === 'CARD' &&
           appointment.paymentStatus === 'PAID' &&
           ['CANCELLED', 'NO_SHOW'].includes(appointment.status);
  };

  const canUpdateStatus = () => {
    if (!appointment || !user) return false;

    // Owners and employees can update status
    const isOwner = appointment.shop.owner?.id === user.id;
    const isEmployee = appointment.employee.user?.id === user.id;

    return (isOwner || isEmployee) &&
           !['CANCELLED', 'COMPLETED'].includes(appointment.status);
  };

  const handleCancelAppointment = async () => {
    if (!appointment) return;

    setIsUpdating(true);
    try {
      await apiClient.cancelAppointment(appointment.id, cancellationReason);
      success('Appointment cancelled', 'The appointment has been cancelled successfully.');
      setShowCancelModal(false);
      setCancellationReason('');
      await loadAppointment(); // Reload to get updated status
    } catch (err: any) {
      error('Failed to cancel appointment', err.response?.data?.message || 'Please try again later.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRefundPayment = async () => {
    if (!appointment) return;

    setIsProcessingRefund(true);
    try {
      // Call refund API endpoint
      await apiClient.refundAppointment(appointment.id, refundAmount, 'Refund processed by shop owner');
      success('Refund processed', `Refund of ${formatCurrency(refundAmount, appointment.shop.country)} has been processed.`);
      setShowRefundModal(false);
      setRefundAmount(0);
      await loadAppointment(); // Reload to get updated payment status
    } catch (err: any) {
      error('Failed to process refund', err.response?.data?.message || 'Please try again later.');
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!appointment) return;

    setIsUpdating(true);
    try {
      await apiClient.updateAppointmentStatus(appointment.id, newStatus);
      success('Status updated', `Appointment status updated to ${newStatus}.`);
      setShowStatusModal(false);
      setNewStatus('');
      await loadAppointment(); // Reload to get updated status
    } catch (err: any) {
      error('Failed to update status', err.response?.data?.message || 'Please try again later.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <SkeletonCard className="h-8 w-48" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <SkeletonCard className="h-64" />
              <SkeletonCard className="h-48" />
            </div>
            <div className="space-y-6">
              <SkeletonCard className="h-32" />
              <SkeletonCard className="h-48" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Appointment Not Found</h1>
          <p className="text-gray-600 mb-6">
            The appointment you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button onClick={() => navigate(-1)} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Appointment Details</h1>
              <p className="text-gray-600 mt-1">
                {formatDateTime(appointment.appointmentDateTime)}
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
                {getStatusIcon(appointment.status)}
                <span className="ml-2">{appointment.status.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Service & Employee Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Details</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-medium text-gray-900">{appointment.service.name}</h3>
                  {appointment.service.description && (
                    <p className="text-gray-600 mt-1">{appointment.service.description}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>{appointment.service.durationMinutes} minutes</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <DollarSign className="w-4 h-4 mr-2" />
                    <span>{formatCurrency(appointment.service.price, appointment.shop.country)}</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Your Stylist</h4>
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-accent-100 rounded-full flex items-center justify-center mr-3">
                      <User className="w-5 h-5 text-accent-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{appointment.employee.fullName}</p>
                      {appointment.employee.specialties && (
                        <p className="text-sm text-gray-600">{appointment.employee.specialties}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <User className="w-4 h-4 text-gray-400 mr-3" />
                  <span className="text-gray-900">{appointment.customerName}</span>
                </div>
                <div className="flex items-center">
                  <Mail className="w-4 h-4 text-gray-400 mr-3" />
                  <span className="text-gray-900">{appointment.customerEmail}</span>
                </div>
                {appointment.customerPhone && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 text-gray-400 mr-3" />
                    <span className="text-gray-900">{appointment.customerPhone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {appointment.notes && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
                <div className="flex items-start">
                  <FileText className="w-4 h-4 text-gray-400 mr-3 mt-0.5" />
                  <p className="text-gray-700">{appointment.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Shop Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Shop Details</h2>
              
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-gray-900">{appointment.shop.name}</h3>
                </div>
                <div className="flex items-start">
                  <MapPin className="w-4 h-4 text-gray-400 mr-3 mt-0.5" />
                  <span className="text-gray-600">{appointment.shop.address}</span>
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 text-gray-400 mr-3" />
                  <span className="text-gray-600">{appointment.shop.phone}</span>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment</h2>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="font-medium text-gray-900">{formatCurrency(appointment.totalAmount, appointment.shop.country)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Payment Method</span>
                  <div className="flex items-center">
                    <CreditCard className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-900">{appointment.paymentType}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`font-medium ${
                    appointment.paymentStatus === 'PAID' ? 'text-green-600' : 
                    appointment.paymentStatus === 'PENDING' ? 'text-yellow-600' : 
                    'text-red-600'
                  }`}>
                    {appointment.paymentStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            {(canEdit() || canCancel() || canRefund() || canUpdateStatus()) && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>

                <div className="space-y-3">
                  {/* Quick Status Actions */}
                  <div className="flex justify-center">
                    <AppointmentStatusButton
                      appointmentId={appointment.id}
                      currentStatus={appointment.status}
                      onStatusChange={() => loadAppointment()}
                      size="md"
                    />
                  </div>

                  {canUpdateStatus() && (
                    <Button
                      variant="outline"
                      className="w-full"
                      icon={<Edit3 className="w-4 h-4" />}
                      onClick={() => {
                        setNewStatus(appointment?.status || '');
                        setShowStatusModal(true);
                      }}
                    >
                      Update Status
                    </Button>
                  )}

                  {canEdit() && (
                    <Button
                      variant="outline"
                      className="w-full"
                      icon={<Edit3 className="w-4 h-4" />}
                      onClick={() => setShowEditModal(true)}
                    >
                      Edit Appointment
                    </Button>
                  )}

                  {canCancel() && (
                    <Button
                      variant="outline"
                      className="w-full text-red-600 border-red-200 hover:bg-red-50"
                      icon={<Trash2 className="w-4 h-4" />}
                      onClick={() => setShowCancelModal(true)}
                    >
                      Cancel Appointment
                    </Button>
                  )}

                  {canRefund() && (
                    <Button
                      variant="outline"
                      className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                      icon={<DollarSign className="w-4 h-4" />}
                      onClick={() => {
                        setRefundAmount(appointment?.totalAmount || 0);
                        setShowRefundModal(true);
                      }}
                    >
                      Process Refund
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Cancel Appointment Modal */}
        <EnhancedCancelModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          appointment={appointment}
          onSuccess={() => {
            setShowCancelModal(false);
            loadAppointment(); // Reload appointment data
          }}
        />

        {/* Refund Modal */}
        <Modal
          isOpen={showRefundModal}
          onClose={() => {
            setShowRefundModal(false);
            setRefundAmount(0);
          }}
          title="Process Refund"
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <DollarSign className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800">
                    Process refund for this appointment
                  </h4>
                  <p className="text-sm text-blue-700 mt-1">
                    The refund will be processed back to the original payment method.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Refund Amount
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                  max={appointment?.totalAmount || 0}
                  min={0}
                  step="0.01"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Maximum refund: {formatCurrency(appointment?.totalAmount || 0)}
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRefundModal(false);
                  setRefundAmount(0);
                }}
                disabled={isProcessingRefund}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleRefundPayment}
                isLoading={isProcessingRefund}
                loadingText="Processing..."
                disabled={refundAmount <= 0 || refundAmount > (appointment?.totalAmount || 0)}
              >
                Process Refund
              </Button>
            </div>
          </div>
        </Modal>

        {/* Status Update Modal */}
        <Modal
          isOpen={showStatusModal}
          onClose={() => {
            setShowStatusModal(false);
            setNewStatus('');
          }}
          title="Update Appointment Status"
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              >
                <option value="">Select status...</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="NO_SHOW">No Show</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowStatusModal(false);
                  setNewStatus('');
                }}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdateStatus}
                isLoading={isUpdating}
                loadingText="Updating..."
                disabled={!newStatus || newStatus === appointment?.status}
              >
                Update Status
              </Button>
            </div>
          </div>
        </Modal>

        {/* Edit Appointment Modal */}
        {appointment && (
          user?.role === 'OWNER' ? (
            <OwnerAppointmentEditModal
              isOpen={showEditModal}
              onClose={() => setShowEditModal(false)}
              appointment={appointment}
              employees={employees}
              onSuccess={() => {
                setShowEditModal(false);
                loadAppointment(); // Reload appointment data
              }}
            />
          ) : (
            <AppointmentEditModal
              isOpen={showEditModal}
              onClose={() => setShowEditModal(false)}
              appointment={appointment}
              onSuccess={() => {
                setShowEditModal(false);
                loadAppointment(); // Reload appointment data
              }}
            />
          )
        )}
      </div>
    </div>
  );
};

export default AppointmentDetailsPage;
