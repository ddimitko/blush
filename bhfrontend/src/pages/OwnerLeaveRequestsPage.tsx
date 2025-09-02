import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import {
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Search,
  ArrowLeft,
  FileText,
  Download
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useDashboardUIStore } from '../store/uiStore';
import { useToast } from '../components/ui/Toast';
import { useReviewLeaveRequestMutation } from '../hooks/queries/useLeaveRequestQueries';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { SkeletonCard } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import Modal from '../components/ui/Modal';
import api from '../lib/api';
import { formatDate } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  calculatedLeaveDays: number;
  createdAt: string;
  reviewedAt?: string;
  reviewerName?: string;
  reviewNotes?: string;
}

const OwnerLeaveRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = useParams();
  const { user } = useAuth();
  const { selectedShopId } = useDashboardUIStore();
  const { success, error } = useToast();
  const reviewLeaveRequestMutation = useReviewLeaveRequestMutation();

  // Get highlighted request ID from URL params
  const highlightRequestId = searchParams.get('highlight');

  // Debug logging
  useEffect(() => {
    console.log('Current URL:', window.location.href);
    console.log('Highlight request ID:', highlightRequestId);
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
  }, [highlightRequestId, searchParams]);

  // Handle legacy URLs - if accessed via /shop/:shopId/leave-requests, redirect to new URL
  useEffect(() => {
    if (params.shopId && window.location.pathname.includes('/shop/')) {
      console.log('Legacy URL detected, redirecting...');
      console.log('Current pathname:', window.location.pathname);
      console.log('Current search:', window.location.search);

      // Extract highlight parameter from current URL
      const urlParams = new URLSearchParams(window.location.search);
      const highlight = urlParams.get('highlight');

      const newUrl = highlight
        ? `/owner/leave-requests?highlight=${highlight}`
        : '/owner/leave-requests';

      console.log('Redirecting to:', newUrl);
      navigate(newUrl, { replace: true });
    }
  }, [params.shopId, navigate]);

  // State management
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [reviewComments, setReviewComments] = useState('');

  // Load leave requests
  const loadLeaveRequests = async () => {
    if (!selectedShopId) return;

    setIsLoading(true);
    try {
      const response = await api.getShopLeaveRequests(selectedShopId);
      console.log('Leave requests response:', response);
      console.log('Leave requests data:', response.leaveRequests);
      setLeaveRequests(response.leaveRequests || []);
    } catch (err) {
      console.error('Failed to load leave requests:', err);
      error('Failed to load leave requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLeaveRequests();
  }, [selectedShopId]);

  // Scroll to highlighted request when data loads
  useEffect(() => {
    if (highlightRequestId && leaveRequests.length > 0) {
      console.log('Attempting to highlight request:', highlightRequestId);
      console.log('Available requests:', leaveRequests.map(r => r.id));

      // Add a small delay to ensure DOM elements are rendered
      const timeoutId = setTimeout(() => {
        const element = document.getElementById(`request-${highlightRequestId}`);
        console.log('Looking for element with ID:', `request-${highlightRequestId}`);
        console.log('Found element:', element);

        if (element) {
          console.log('Found element, scrolling to it');
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Add a temporary visual indicator
          element.style.boxShadow = '0 0 20px rgba(191, 160, 84, 0.5)';
          setTimeout(() => {
            element.style.boxShadow = '';
          }, 3000);
        } else {
          console.log('Element not found for highlighting');
          console.log('All elements with request- prefix:',
            Array.from(document.querySelectorAll('[id^="request-"]')).map(el => el.id)
          );
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [highlightRequestId, leaveRequests]);

  // Filter leave requests
  const filteredRequests = leaveRequests.filter(request => {
    const matchesSearch = request.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         request.reason.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Highlight specific request when navigating from notifications
  useEffect(() => {
    if (highlightRequestId && filteredRequests.length > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Filtered requests for highlighting:', filteredRequests.map(r => ({ id: r.id, employeeName: r.employeeName })));
        const matchingRequest = filteredRequests.find(r => r.id === highlightRequestId);
        console.log('Matching request found:', matchingRequest);
      }
    }
  }, [highlightRequestId, filteredRequests]);

  // Handle review submission
  const handleReviewSubmit = async () => {
    if (!selectedRequest || !reviewAction) return;

    setIsSubmitting(true);
    try {
      await reviewLeaveRequestMutation.mutateAsync({
        requestId: selectedRequest.id,
        data: {
          action: reviewAction,
          comments: reviewComments
        }
      });

      success(`Leave request ${reviewAction.toLowerCase()}d successfully`);
      setIsReviewModalOpen(false);
      setSelectedRequest(null);
      setReviewAction(null);
      setReviewComments('');
      loadLeaveRequests(); // Reload data
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || `Failed to ${reviewAction.toLowerCase()} leave request`;
      error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open review modal
  const openReviewModal = (request: LeaveRequest, action: 'APPROVE' | 'REJECT') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setIsReviewModalOpen(true);
  };

  // Get status styling
  const getStatusStyling = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4" />;
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4" />;
      case 'REJECTED':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Format leave type enum to readable string
  const formatLeaveType = (leaveType: string) => {
    switch (leaveType) {
      case 'SICK_LEAVE':
        return 'Sick Leave';
      case 'VACATION':
        return 'Vacation';
      case 'PERSONAL_LEAVE':
        return 'Personal Leave';
      case 'MATERNITY_LEAVE':
        return 'Maternity Leave';
      case 'PATERNITY_LEAVE':
        return 'Paternity Leave';
      case 'BEREAVEMENT_LEAVE':
        return 'Bereavement Leave';
      case 'EMERGENCY_LEAVE':
        return 'Emergency Leave';
      default:
        return leaveType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  // Export leave requests to CSV
  const handleExportLeaveRequests = () => {
    try {
      const csvHeaders = [
        'Employee Name',
        'Leave Type',
        'Start Date',
        'End Date',
        'Workdays',
        'Status',
        'Reason',
        'Review Comments',
        'Submitted Date'
      ];

      const csvData = filteredRequests.map(request => [
        request.employeeName,
        formatLeaveType(request.leaveType),
        formatDate(request.startDate),
        formatDate(request.endDate),
        request.calculatedLeaveDays.toString(),
        request.status,
        `"${request.reason.replace(/"/g, '""')}"`, // Escape quotes in CSV
        `"${(request.reviewNotes || '').replace(/"/g, '""')}"`,
        request.createdAt ? formatDate(request.createdAt) : ''
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvData.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `leave-requests-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      success('Leave requests exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      error('Failed to export leave requests');
    }
  };

  if (!selectedShopId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Shop Selected</h2>
          <p className="text-gray-600">Please select a shop to view leave requests.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Leave Requests</h1>
              <p className="text-gray-600 mt-1">Review and manage employee leave requests</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                icon={<Download className="w-4 h-4" />}
                onClick={handleExportLeaveRequests}
              >
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by employee name or reason..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Leave Requests List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Leave Requests ({filteredRequests.length})
            </h3>
          </div>
          
          {isLoading ? (
            <div className="p-6">
              <SkeletonCard className="h-32 mb-4" />
              <SkeletonCard className="h-32 mb-4" />
              <SkeletonCard className="h-32" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || statusFilter !== 'ALL' ? 'No matching requests' : 'No leave requests'}
              </h3>
              <p className="text-gray-600">
                {searchQuery || statusFilter !== 'ALL' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Employee leave requests will appear here when submitted.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  id={`request-${request.id}`}
                  className={`p-6 transition-colors ${
                    highlightRequestId === request.id
                      ? 'bg-yellow-50 border-l-4 border-yellow-400'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="flex items-center space-x-2">
                          <User className="w-5 h-5 text-gray-400" />
                          <span className="font-medium text-gray-900">{request.employeeName}</span>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyling(request.status)}`}>
                          {getStatusIcon(request.status)}
                          <span className="ml-1">{request.status}</span>
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-500">Leave Type</p>
                          <p className="font-medium text-gray-900">{formatLeaveType(request.leaveType)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Duration</p>
                          <p className="font-medium text-gray-900">
                            {formatDate(request.startDate)} - {formatDate(request.endDate)}
                          </p>
                          <p className="text-xs text-gray-500">{request.calculatedLeaveDays} workdays</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Submitted</p>
                          <p className="font-medium text-gray-900">
                            {request.createdAt ?
                              formatDistanceToNow(new Date(request.createdAt), { addSuffix: true }) :
                              'Unknown'
                            }
                          </p>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-sm text-gray-500">Reason</p>
                        <p className="text-gray-900">{request.reason}</p>
                      </div>
                      
                      {request.reviewNotes && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-500">Review Comments</p>
                          <p className="text-gray-900">{request.reviewNotes}</p>
                        </div>
                      )}
                    </div>
                    
                    {request.status === 'PENDING' && (
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openReviewModal(request, 'REJECT')}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Reject
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => openReviewModal(request, 'APPROVE')}
                        >
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setSelectedRequest(null);
          setReviewAction(null);
          setReviewComments('');
        }}
        title={`${reviewAction === 'APPROVE' ? 'Approve' : 'Reject'} Leave Request`}
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Request Details</h4>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Employee:</span> {selectedRequest.employeeName}</p>
                <p><span className="font-medium">Type:</span> {formatLeaveType(selectedRequest.leaveType)}</p>
                <p><span className="font-medium">Duration:</span> {formatDate(selectedRequest.startDate)} - {formatDate(selectedRequest.endDate)}</p>
                <p><span className="font-medium">Workdays:</span> {selectedRequest.calculatedLeaveDays}</p>
                <p><span className="font-medium">Reason:</span> {selectedRequest.reason}</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments {reviewAction === 'REJECT' ? '(Required)' : '(Optional)'}
              </label>
              <textarea
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                placeholder={`Add comments for ${reviewAction === 'APPROVE' ? 'approval' : 'rejection'}...`}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsReviewModalOpen(false);
                  setSelectedRequest(null);
                  setReviewAction(null);
                  setReviewComments('');
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant={reviewAction === 'APPROVE' ? 'primary' : 'outline'}
                onClick={handleReviewSubmit}
                disabled={isSubmitting || (reviewAction === 'REJECT' && !reviewComments.trim())}
                icon={isSubmitting ? <LoadingSpinner size="sm" /> : undefined}
                className={reviewAction === 'REJECT' ? 'text-red-600 border-red-200 hover:bg-red-50' : ''}
              >
                {isSubmitting ? 'Processing...' : `${reviewAction === 'APPROVE' ? 'Approve' : 'Reject'} Request`}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OwnerLeaveRequestsPage;
