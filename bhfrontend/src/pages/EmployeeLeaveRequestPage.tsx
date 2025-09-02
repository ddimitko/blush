import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Calendar,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { SkeletonCard } from '../components/ui/Skeleton';
import LeaveBalance from '../components/employee/LeaveBalance';
import api from '../lib/api';

interface LeaveRequestForm {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
}

const leaveTypes = [
  { value: 'VACATION', label: 'Vacation' },
  { value: 'SICK_LEAVE', label: 'Sick Leave' },
  { value: 'PERSONAL', label: 'Personal Leave' },
  { value: 'MATERNITY', label: 'Maternity Leave' },
  { value: 'PATERNITY', label: 'Paternity Leave' },
  { value: 'EMERGENCY', label: 'Emergency Leave' },
  { value: 'UNPAID', label: 'Unpaid Leave' },
  { value: 'OTHER', label: 'Other' }
];

interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string;
  status: string;
  leaveDays: number;
  calculatedLeaveDays?: number;
  affectsAnnualLeave?: boolean;
  reviewedByUserId?: string;
  reviewerName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
  canBeCancelled: boolean;
  canBeReviewed: boolean;
  isActive: boolean;
  isFuture: boolean;
}

interface EmployeeData {
  id: string;
  fullName: string;
  email: string;
  annualLeaveDays: number;
  usedLeaveDays: number;
  leaveYearStart: string;
  leaveYearEnd: string;
}

const EmployeeLeaveRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<LeaveRequestForm>();

  useEffect(() => {
    loadLeaveData();
  }, [user]);

  const loadLeaveData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Load employee data first
      const employeeResponse = await api.getEmployeeByUserId(user.id);
      setEmployeeData(employeeResponse);

      // Then load leave requests using the employee ID
      if (employeeResponse?.id) {
        const leaveResponse = await api.getEmployeeLeaveRequests(employeeResponse.id);
        setLeaveRequests(leaveResponse.leaveRequests || []);
      }
    } catch (err) {
      console.error('Failed to load leave data:', err);
      error('Failed to load leave data');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: LeaveRequestForm) => {
    if (!employeeData) return;

    setIsSubmitting(true);
    try {
      await api.createLeaveRequest(employeeData.id, data);

      success('Leave request submitted successfully');
      setIsModalOpen(false);
      reset();
      loadLeaveData(); // Reload data
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to submit leave request';
      error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!employeeData) return;

    try {
      await api.cancelLeaveRequest(requestId, employeeData.id);
      success('Leave request cancelled successfully');
      loadLeaveData(); // Reload data
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to cancel leave request';
      error(errorMessage);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'APPROVED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'CANCELLED':
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <SkeletonCard className="h-24" />
          <SkeletonCard className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
              <p className="text-gray-600">Manage your time off requests</p>
            </div>

            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsModalOpen(true)}
              disabled={!employeeData}
            >
              Request Leave
            </Button>
          </div>
        </div>

        {/* Leave Balance */}
        {employeeData && (
          <LeaveBalance
            annualLeaveDays={employeeData.annualLeaveDays}
            usedLeaveDays={employeeData.usedLeaveDays}
            pendingLeaveDays={leaveRequests
              .filter(req => req.status === 'PENDING' && req.affectsAnnualLeave)
              .reduce((sum, req) => sum + req.leaveDays, 0)
            }
            leaveYearStart={employeeData.leaveYearStart}
            leaveYearEnd={employeeData.leaveYearEnd}
          />
        )}

        {/* Leave Requests List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Your Leave Requests</h3>
          </div>

          {isLoading ? (
            <div className="p-6">
              <SkeletonCard className="h-32 mb-4" />
              <SkeletonCard className="h-32 mb-4" />
              <SkeletonCard className="h-32" />
            </div>
          ) : leaveRequests.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leave requests</h3>
              <p className="text-gray-600 mb-4">You haven't submitted any leave requests yet.</p>
              <Button
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setIsModalOpen(true)}
                disabled={!employeeData}
              >
                Request Leave
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {leaveRequests.map((request) => (
                <div key={request.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getStatusIcon(request.status)}
                        <h4 className="text-lg font-medium text-gray-900">
                          {leaveTypes.find(type => type.value === request.leaveType)?.label}
                        </h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <span className="text-sm text-gray-500">Start Date</span>
                          <p className="font-medium">{formatDate(request.startDate)}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">End Date</span>
                          <p className="font-medium">{formatDate(request.endDate)}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Duration</span>
                          <p className="font-medium">{request.leaveDays} days</p>
                        </div>
                      </div>
                      
                      {request.reason && (
                        <div className="mb-3">
                          <span className="text-sm text-gray-500">Reason</span>
                          <p className="text-gray-900">{request.reason}</p>
                        </div>
                      )}
                      
                      {request.reviewNotes && (
                        <div className="mb-3">
                          <span className="text-sm text-gray-500">Review Notes</span>
                          <p className="text-gray-900">{request.reviewNotes}</p>
                        </div>
                      )}
                      
                      <div className="text-sm text-gray-500">
                        Submitted on {formatDate(request.createdAt)}
                        {request.reviewedAt && request.reviewerName && (
                          <span> • Reviewed by {request.reviewerName} on {formatDate(request.reviewedAt)}</span>
                        )}
                      </div>
                    </div>
                    
                    {request.canBeCancelled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelRequest(request.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leave Request Modal */}
        <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Request Leave"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Leave Type
              </label>
              <select
                {...register('leaveType', { required: 'Leave type is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              >
                <option value="">Select leave type</option>
                {leaveTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.leaveType && (
                <p className="mt-1 text-sm text-red-600">{errors.leaveType.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              {...register('startDate', { required: 'Start date is required' })}
              error={errors.startDate?.message}
            />
            <Input
              label="End Date"
              type="date"
              {...register('endDate', { required: 'End date is required' })}
              error={errors.endDate?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason (Optional)
            </label>
            <textarea
              {...register('reason')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              placeholder="Provide additional details about your leave request..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Submit Request
            </Button>
          </div>
        </form>
        </Modal>
      </div>
    </div>
  );
};

export default EmployeeLeaveRequestPage;
