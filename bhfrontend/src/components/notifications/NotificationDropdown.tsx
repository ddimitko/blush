import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, Calendar, User, Clock, X, CheckCircle, AlertCircle, UserPlus } from 'lucide-react';
import {
  useNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
  useClearAllNotificationsMutation
} from '../../hooks/queries';
import { formatDistanceToNow } from 'date-fns';
import { parseUTCDateTime, formatNotificationRelativeTime, formatNotificationTime } from '../../lib/utils';
import { Notification } from '../../types';
import { apiClient } from '../../lib/api';
import { useToast } from '../ui/Toast';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorState from '../ui/ErrorState';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  unreadCount
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // React Query hooks with enhanced functionality
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
  } = useNotificationsQuery();

  const markAsReadMutation = useMarkNotificationReadMutation();
  const markAllAsReadMutation = useMarkAllNotificationsReadMutation();
  const deleteNotificationMutation = useDeleteNotificationMutation();
  const clearAllNotificationsMutation = useClearAllNotificationsMutation();
  const [acceptingInvitations, setAcceptingInvitations] = useState<Set<string>>(new Set());
  const { success, error: showError } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Auto-refresh notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Enhanced notification handlers with React Query
  const handleNotificationHover = async (notification: Notification) => {
    if (!notification.seen) {
      try {
        await markAsReadMutation.mutateAsync(notification.id);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await deleteNotificationMutation.mutateAsync(notificationId);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      showError('Failed to delete notification');
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      await clearAllNotificationsMutation.mutateAsync();
      success('All notifications cleared successfully');
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
      showError('Failed to clear all notifications');
    }
  };

  const handleAcceptInvitation = async (notification: Notification) => {
    try {
      // Parse notification data to get invitation token
      const notificationData = notification.data ? JSON.parse(notification.data) : {};
      const invitationToken = notificationData.invitationToken;

      if (!invitationToken) {
        showError('Invalid invitation', 'Unable to find invitation token. Please use the invitation link from your email.');
        return;
      }

      setAcceptingInvitations(prev => new Set(prev).add(notification.id));

      // Call the accept invitation API with token
      const response = await apiClient.acceptInvitation(invitationToken);

      // Update user data in React Query cache if role changed
      if (response.user) {
        queryClient.setQueryData(['auth', 'user'], response.user);
      }

      // Mark notification as read and delete it
      await markAsReadMutation.mutateAsync(notification.id);
      await deleteNotificationMutation.mutateAsync(notification.id);

      success(
        'Invitation accepted!',
        `You are now an employee at ${notificationData.shopName || 'the shop'}. Welcome to the team!`
      );

      // Refresh notifications
      refetch();

      // Smooth redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1500);

    } catch (error: any) {
      console.error('Failed to accept invitation:', error);
      showError(
        'Failed to accept invitation',
        error.response?.data?.message || 'An unexpected error occurred. Please try again.'
      );
    } finally {
      setAcceptingInvitations(prev => {
        const newSet = new Set(prev);
        newSet.delete(notification.id);
        return newSet;
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'APPOINTMENT_CREATED':
      case 'APPOINTMENT_UPDATED':
      case 'APPOINTMENT_EDITED':
      case 'APPOINTMENT_CONFIRMED':
      case 'APPOINTMENT_REMINDER':
      case 'NEW_BOOKING':
        return <Calendar className="w-4 h-4" />;
      case 'APPOINTMENT_CANCELLED':
      case 'APPOINTMENT_CANCELLED_BY_CUSTOMER':
      case 'APPOINTMENT_CANCELLED_BY_EMPLOYEE':
      case 'BOOKING_CANCELLED':
        return <X className="w-4 h-4" />;
      case 'PAYMENT_RECEIVED':
        return <CheckCircle className="w-4 h-4" />;
      case 'PAYMENT_FAILED':
        return <AlertCircle className="w-4 h-4" />;
      case 'EMPLOYEE_INVITED':
      case 'EMPLOYEE_INVITATION':
      case 'USER_REGISTERED':
        return <User className="w-4 h-4" />;
      case 'LEAVE_REQUEST_SUBMITTED':
      case 'LEAVE_REQUEST_APPROVED':
      case 'LEAVE_REQUEST_REJECTED':
      case 'REVIEW_REQUEST':
        return <Clock className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'APPOINTMENT_CREATED':
      case 'APPOINTMENT_CONFIRMED':
      case 'NEW_BOOKING':
        return 'text-green-600 bg-green-100';
      case 'APPOINTMENT_UPDATED':
      case 'APPOINTMENT_EDITED':
      case 'APPOINTMENT_REMINDER':
        return 'text-blue-600 bg-blue-100';
      case 'APPOINTMENT_CANCELLED':
      case 'APPOINTMENT_CANCELLED_BY_CUSTOMER':
      case 'APPOINTMENT_CANCELLED_BY_EMPLOYEE':
      case 'BOOKING_CANCELLED':
        return 'text-red-600 bg-red-100';
      case 'PAYMENT_RECEIVED':
        return 'text-green-600 bg-green-100';
      case 'PAYMENT_FAILED':
        return 'text-red-600 bg-red-100';
      case 'EMPLOYEE_INVITED':
      case 'EMPLOYEE_INVITATION':
      case 'USER_REGISTERED':
        return 'text-purple-600 bg-purple-100';
      case 'LEAVE_REQUEST_SUBMITTED':
        return 'text-yellow-600 bg-yellow-100';
      case 'REVIEW_REQUEST':
        return 'text-purple-600 bg-purple-100';
      case 'LEAVE_REQUEST_APPROVED':
        return 'text-green-600 bg-green-100';
      case 'LEAVE_REQUEST_REJECTED':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 py-0 z-[60] animate-slide-down max-h-[32rem] overflow-hidden backdrop-blur-sm"
      style={{
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        transform: 'translateX(-8px)' // Better positioning relative to bell icon
      }}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Bell className="w-5 h-5 mr-2 text-gray-600" />
              Notifications
            </h3>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition-all duration-200"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Notifications List */}
      <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="sm" text="Loading notifications..." />
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorState
              variant="inline"
              error={error}
              onRetry={refetch}
            />
          </div>
        ) : !notifications || notifications.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 text-sm font-medium">No notifications yet</p>
            <p className="text-gray-400 text-xs mt-2">You'll see updates about your appointments and bookings here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {(notifications || []).map((notification) => (
              <div
                key={notification.id}
                onMouseEnter={() => handleNotificationHover(notification)}
                className={`
                  px-6 py-4 hover:bg-gray-50 transition-all duration-200 cursor-pointer group relative
                  ${!notification.seen ? 'bg-gradient-to-r from-blue-50 to-blue-25 border-l-4 border-blue-500' : ''}
                  hover:shadow-sm
                `}
              >
                <div className="flex items-start space-x-3">
                  <div className={`
                    p-2 rounded-lg flex-shrink-0 transition-all duration-200
                    ${getNotificationColor(notification.type)}
                    ${!notification.seen ? 'ring-2 ring-blue-200' : ''}
                  `}>
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className={`text-sm mb-1 ${!notification.seen ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                      </div>

                      {/* Delete button - shows on hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notification.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 text-gray-400 hover:text-red-500 rounded"
                        title="Delete notification"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span title={formatNotificationTime(notification.createdAt)}>
                          {formatNotificationRelativeTime(notification.createdAt)}
                        </span>
                      </div>
                      {!notification.seen && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      )}
                    </div>

                    {/* Employee Invitation Actions */}
                    {notification.type === 'EMPLOYEE_INVITATION' && (
                      <div className="flex items-center space-x-2 mt-3">
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<UserPlus className="w-3 h-3" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptInvitation(notification);
                          }}
                          disabled={acceptingInvitations.has(notification.id)}
                          className="text-xs"
                        >
                          {acceptingInvitations.has(notification.id) ? 'Accepting...' : 'Accept Invitation'}
                        </Button>
                        {notification.actionUrl && (
                          <Link
                            to={notification.actionUrl}
                            onClick={onClose}
                            className="text-xs text-gray-600 hover:text-gray-800 font-medium hover:underline transition-colors duration-200"
                          >
                            View Details
                          </Link>
                        )}
                      </div>
                    )}

                    {/* Enhanced Action Link for other notifications */}
                    {notification.type !== 'EMPLOYEE_INVITATION' && notification.actionUrl && (
                      <Link
                        to={notification.actionUrl}
                        onClick={onClose}
                        className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 font-medium mt-2 hover:underline transition-colors duration-200"
                      >
                        View Details →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications && notifications.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <Link
              to="/notifications"
              onClick={onClose}
              className="text-sm text-accent-600 hover:text-accent-700 font-medium"
            >
              View all notifications
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Show confirmation for clearing all notifications
                if (window.confirm('Are you sure you want to clear all notifications? This action cannot be undone.')) {
                  handleClearAllNotifications();
                }
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
              disabled={clearAllNotificationsMutation.isPending}
            >
              {clearAllNotificationsMutation.isPending ? 'Clearing...' : 'Clear all'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
