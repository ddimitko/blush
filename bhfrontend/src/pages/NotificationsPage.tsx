import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, CheckCheck, Trash2, Filter, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { formatNotificationRelativeTime, formatNotificationTime } from '../lib/utils';
import { useNotificationsQuery, useMarkNotificationAsReadMutation, useMarkAllNotificationsAsReadMutation, useDeleteNotificationMutation, useClearAllNotificationsMutation } from '../hooks/queries/useNotificationQueries';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Notification } from '../types';

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  // Queries and mutations
  const { data: notifications = [], isLoading, refetch } = useNotificationsQuery();
  const markAsReadMutation = useMarkNotificationAsReadMutation();
  const markAllAsReadMutation = useMarkAllNotificationsAsReadMutation();
  const deleteNotificationMutation = useDeleteNotificationMutation();
  const clearAllNotificationsMutation = useClearAllNotificationsMutation();

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.seen;
    if (filter === 'read') return notification.seen;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.seen).length;

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsReadMutation.mutateAsync(notificationId);
      success('Notification marked as read');
      refetch();
    } catch (err) {
      error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
      success('All notifications marked as read');
      refetch();
    } catch (err) {
      error('Failed to mark all notifications as read');
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await deleteNotificationMutation.mutateAsync(notificationId);
      success('Notification deleted');
      refetch();
    } catch (err) {
      error('Failed to delete notification');
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      await clearAllNotificationsMutation.mutateAsync();
      success('All notifications cleared successfully');
      refetch();
    } catch (err) {
      error('Failed to clear all notifications');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'LEAVE_REQUEST':
      case 'LEAVE_APPROVED':
      case 'LEAVE_REJECTED':
      case 'LEAVE_CANCELLED':
        return '🏖️';
      case 'APPOINTMENT_CREATED':
      case 'APPOINTMENT_UPDATED':
      case 'APPOINTMENT_CANCELLED':
        return '📅';
      case 'EMPLOYEE_INVITATION':
        return '👥';
      case 'SYSTEM':
        return '⚙️';
      default:
        return '🔔';
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'LEAVE_REQUEST':
        return 'Leave Request';
      case 'LEAVE_APPROVED':
        return 'Leave Approved';
      case 'LEAVE_REJECTED':
        return 'Leave Rejected';
      case 'LEAVE_CANCELLED':
        return 'Leave Cancelled';
      case 'APPOINTMENT_CREATED':
        return 'Appointment';
      case 'APPOINTMENT_UPDATED':
        return 'Appointment Updated';
      case 'APPOINTMENT_CANCELLED':
        return 'Appointment Cancelled';
      case 'EMPLOYEE_INVITATION':
        return 'Team Invitation';
      case 'SYSTEM':
        return 'System';
      default:
        return 'Notification';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Home"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <Bell className="w-8 h-8 mr-3 text-luxury-600" />
                  Notifications
                </h1>
                <p className="text-gray-600 mt-1">
                  {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  icon={<CheckCheck className="w-4 h-4" />}
                  disabled={markAllAsReadMutation.isPending}
                >
                  Mark All Read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to clear all notifications? This action cannot be undone.')) {
                      handleClearAllNotifications();
                    }
                  }}
                  icon={<Trash2 className="w-4 h-4" />}
                  disabled={clearAllNotificationsMutation.isPending}
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                >
                  {clearAllNotificationsMutation.isPending ? 'Clearing...' : 'Clear All'}
                </Button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-2 mt-6">
            <Filter className="w-4 h-4 text-gray-500" />
            <div className="flex space-x-1">
              {(['all', 'unread', 'read'] as const).map((filterOption) => (
                <button
                  key={filterOption}
                  onClick={() => setFilter(filterOption)}
                  className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                    filter === filterOption
                      ? 'bg-luxury-100 text-luxury-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {filterOption === 'all' ? 'All' : filterOption === 'unread' ? 'Unread' : 'Read'}
                  {filterOption === 'unread' && unreadCount > 0 && (
                    <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === 'unread' ? 'No unread notifications' :
                 filter === 'read' ? 'No read notifications' : 'No notifications'}
              </h3>
              <p className="text-gray-500">
                {filter === 'all' ? "You're all caught up! New notifications will appear here." :
                 filter === 'unread' ? "All notifications have been read." :
                 "No read notifications to show."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-xl border transition-all duration-200 hover:shadow-md ${
                  !notification.seen
                    ? 'border-luxury-200 bg-luxury-50/30'
                    : 'border-gray-200'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                          !notification.seen
                            ? 'bg-luxury-100'
                            : 'bg-gray-100'
                        }`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            !notification.seen
                              ? 'bg-luxury-100 text-luxury-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {getNotificationTypeLabel(notification.type)}
                          </span>
                          {!notification.seen && (
                            <div className="w-2 h-2 bg-luxury-500 rounded-full"></div>
                          )}
                        </div>

                        <h3 className="text-sm font-semibold text-gray-900 mb-1">
                          {notification.title}
                        </h3>

                        <p className="text-sm text-gray-600 mb-3">
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between">
                          <span
                            className="text-xs text-gray-500"
                            title={formatNotificationTime(notification.createdAt)}
                          >
                            {formatNotificationRelativeTime(notification.createdAt)}
                          </span>

                          {notification.actionUrl && (
                            <Link
                              to={notification.actionUrl}
                              className="text-xs text-luxury-600 hover:text-luxury-700 font-medium"
                            >
                              View Details →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      {!notification.seen && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="p-2 text-gray-400 hover:text-luxury-600 hover:bg-luxury-50 rounded-lg transition-colors"
                          title="Mark as read"
                          disabled={markAsReadMutation.isPending}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteNotification(notification.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete notification"
                        disabled={deleteNotificationMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
