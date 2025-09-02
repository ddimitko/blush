import { useEffect, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';
import { useAuth } from './useAuth';
import { useToast } from '../components/ui/Toast';
import { queryKeys } from '../lib/queryClient';
import { Notification } from '../types';

interface NotificationMessage {
  type: string;
  data: Notification;
  topic?: string;
  timestamp?: number;
}

interface NotificationCountMessage {
  type: string;
  data: {
    unreadCount: number;
  };
  topic?: string;
}

// This hook is now only for user-specific notifications
// Slot subscriptions are handled by useSlotSubscriptions hook

export const useRealTimeNotifications = () => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { success, info } = useToast();
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleNewNotification = useCallback((message: NotificationMessage) => {
    if (!message?.data) {
      console.warn('Received notification message without data');
      return;
    }

    const notification = message.data;
    console.log('Processing new notification:', notification);

    // Validate notification structure
    if (!notification.id || !notification.title || !notification.type) {
      console.warn('Received notification with invalid structure:', notification);
      return;
    }

    // Add notification to the cache and track if it was actually added
    let notificationAdded = false;
    queryClient.setQueryData(queryKeys.notifications.all, (oldData: any) => {
      const currentNotifications = oldData?.notifications || [];

      // Check if notification already exists to prevent duplicates
      const existsById = currentNotifications.some((n: Notification) => n.id === notification.id);
      if (existsById) {
        console.log('Notification already exists with same ID, skipping:', notification.id);
        return oldData;
      }

      // Additional check for near-duplicate notifications (same title, message, and type within 5 seconds)
      const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
      const nearDuplicate = currentNotifications.some((n: Notification) =>
        n.title === notification.title &&
        n.message === notification.message &&
        n.type === notification.type &&
        n.createdAt > fiveSecondsAgo
      );

      if (nearDuplicate) {
        console.log('Near-duplicate notification detected, skipping:', notification);
        return oldData;
      }

      notificationAdded = true;
      return {
        ...oldData,
        notifications: [notification, ...currentNotifications],
        totalElements: (oldData?.totalElements || 0) + 1,
      };
    });

    // Only update unread count if notification was actually added
    if (notificationAdded) {
      queryClient.setQueryData(queryKeys.notifications.unread, (oldData: any) => ({
        count: (oldData?.count || 0) + 1,
      }));
    }

    // Show toast notification for important notifications only if it was actually added
    if (notificationAdded && notification.type && (notification.type.startsWith('LEAVE_REQUEST_') || notification.type.startsWith('APPOINTMENT_'))) {
      try {
        info(notification.title, notification.message || '');
      } catch (error) {
        console.error('Error showing toast notification:', error);
      }
    }

    // Invalidate queries to ensure fresh data (with small delay to allow backend transaction to commit)
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread });
    }, 100);
  }, [queryClient, info]);

  const handleNotificationCountUpdate = useCallback((message: NotificationCountMessage) => {
    if (!message?.data) {
      console.warn('Received notification count message without data');
      return;
    }

    const { unreadCount } = message.data;

    console.log('Updating notification count:', unreadCount);

    // Update unread count in cache
    queryClient.setQueryData(queryKeys.notifications.unread, {
      count: unreadCount,
    });
  }, [queryClient]);

  const handleAppointmentStatusChange = useCallback((message: any) => {
    if (!message?.appointmentId) {
      console.warn('Received appointment status change message without appointmentId');
      return;
    }

    console.log('Handling appointment status change:', message);

    // Invalidate appointment queries to refresh the data
    queryClient.invalidateQueries({ queryKey: queryKeys.appointments.user });

    // Invalidate specific appointment if we have the ID
    queryClient.invalidateQueries({
      queryKey: ['appointments', 'detail', message.appointmentId]
    });

    // If it's a completion status change, show a review prompt
    if (message.newStatus === 'COMPLETED' && message.appointmentId) {
      // Show a toast notification for completed appointments
      setTimeout(() => {
        info('Appointment Completed', 'Your appointment has been completed. You can now leave a review!');
      }, 1000);
    }

    // Show general status change notification
    if (message.serviceName && message.newStatus) {
      const statusDisplayName = message.newStatus.toLowerCase().replace('_', ' ');
      info('Appointment Status Updated', `Your ${message.serviceName} appointment is now ${statusDisplayName}.`);
    }
  }, [queryClient, info]);

  const handleWebSocketMessage = useCallback((message: any) => {
    console.log('Received WebSocket message:', message);

    try {
      // Validate message structure
      if (!message || typeof message !== 'object') {
        console.warn('Received invalid WebSocket message:', message);
        return;
      }

      // Skip subscription confirmation messages
      if (message.type === 'subscription_confirmed') {
        console.log('WebSocket subscription confirmed for topic:', message.topic);
        return;
      }

      // Skip authentication confirmation messages
      if (message.type === 'authentication_confirmed') {
        console.log('WebSocket authentication confirmed');
        return;
      }

      // Handle different message types
      if (message.type === 'notification' || message.topic?.startsWith('notifications.')) {
        handleNewNotification(message);
      } else if (message.type === 'notification-count' || message.topic?.startsWith('notification-count.')) {
        handleNotificationCountUpdate(message);
      } else if (message.type === 'NOTIFICATION') {
        // Handle RabbitMQ format
        if (message.data) {
          handleNewNotification({ type: 'notification', data: message.data });
        }
      } else if (message.type === 'appointment_status_changed') {
        // Handle real-time appointment status changes
        handleAppointmentStatusChange(message);
      } else {
        console.log('Unhandled notification WebSocket message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket notification message:', error);
    }
  }, [handleNewNotification, handleNotificationCountUpdate, handleAppointmentStatusChange]);

  // Only create WebSocket connection for authenticated users
  const { isConnected, connectionError, sendMessage } = useWebSocket({
    url: isAuthenticated ? `${process.env.REACT_APP_WS_URL || 'wss://localhost:8443'}/ws` : '',
    onMessage: handleWebSocketMessage,
    onConnect: () => {
      console.log('📢 NOTIFICATION WebSocket connected for authenticated user to:', `${process.env.REACT_APP_WS_URL || 'wss://localhost:8443'}/ws`);
      setIsSubscribed(false); // Reset subscription state on new connection
    },
    onDisconnect: () => {
      console.log('📢 NOTIFICATION WebSocket disconnected');
      setIsSubscribed(false); // Reset subscription state on disconnect
    },
    onError: (error) => {
      console.error('📢 NOTIFICATION WebSocket error:', error);
    },
    autoReconnect: isAuthenticated, // Only reconnect for authenticated users
    reconnectInterval: 5000,
  });

  // Subscribe to topics when user changes (only once per connection)
  useEffect(() => {
    if (isConnected && isAuthenticated && user?.id && !isSubscribed && sendMessage) {
      console.log('Subscribing to notification topics for user:', user.id);

      // Add a small delay to ensure WebSocket is fully ready
      const timeoutId = setTimeout(() => {
        try {
          sendMessage({
            type: 'subscribe',
            topic: `notifications.${user.id}`,
          });

          sendMessage({
            type: 'subscribe',
            topic: `notification-count.${user.id}`,
          });

          setIsSubscribed(true);
        } catch (error) {
          console.error('Failed to subscribe to notification topics:', error);
        }
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        // Don't reset subscription state here to prevent re-subscription loops
      };
    }
  }, [isConnected, isAuthenticated, user?.id, sendMessage, isSubscribed]);

  // Refresh notifications when connection is restored
  useEffect(() => {
    if (isConnected && isAuthenticated) {
      // Invalidate queries to get fresh data after reconnection
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread });
    }
  }, [isConnected, isAuthenticated, queryClient]);



  return {
    isConnected,
    connectionError,
  };
};

export default useRealTimeNotifications;
