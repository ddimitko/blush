import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { apiClient } from '../../lib/api';
import { queryKeys } from '../../lib/queryClient';
import { Notification } from '../../types';

// All notifications query
export const useNotificationsQuery = () => {
  const selectNotifications = useCallback((data: any) => {
    // Only log once per actual data change, not on every render
    if (data && !data._logged) {
      console.log('Notifications API response:', data);
      data._logged = true; // Mark as logged to prevent spam
    }

    // Handle different response structures
    if (Array.isArray(data)) {
      return data;
    }
    // Backend returns { notifications: [...], totalElements: ..., etc }
    if (data?.notifications && Array.isArray(data.notifications)) {
      return data.notifications;
    }
    if (data?.content && Array.isArray(data.content)) {
      return data.content;
    }
    if (data) {
      console.warn('Unexpected notifications data structure:', data);
    }
    return [];
  }, []);

  return useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: async () => {
      const result = await apiClient.getNotifications();
      return result;
    },
    staleTime: 1 * 60 * 1000, // 1 minute for notifications
    select: selectNotifications,
  });
};

// Unread notifications count query
export const useUnreadNotificationsQuery = () => {
  const { useAuthUIStore } = require('../../store/authUIStore');
  const { token, isTokenValid, isAuthenticated } = useAuthUIStore();

  // Only enable if we have a token, it's valid, and we're marked as authenticated
  // Also check that token is not empty string
  const shouldFetch = !!token && token.length > 10 && isTokenValid() && isAuthenticated;

  return useQuery({
    queryKey: queryKeys.notifications.unread,
    queryFn: () => {
      if (!shouldFetch) {
        throw new Error('Not authenticated - query should not run');
      }
      return apiClient.getUnreadNotifications();
    },
    enabled: shouldFetch,
    staleTime: 30 * 1000, // 30 seconds for unread count
    refetchInterval: false, // Disable automatic refetching to prevent loops
    retry: false,
    refetchOnWindowFocus: false, // Prevent excessive refetching
  });
};

// Mark notification as read mutation
export const useMarkNotificationReadMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (notificationId: string) => apiClient.markNotificationAsRead(notificationId),
    onSuccess: (_, notificationId) => {
      // Update the specific notification in cache
      queryClient.setQueryData(queryKeys.notifications.all, (oldData: any) => {
        if (!oldData?.notifications) return oldData;

        return {
          ...oldData,
          notifications: oldData.notifications.map((notification: Notification) =>
            notification.id === notificationId
              ? { ...notification, seen: true, readAt: new Date().toISOString() }
              : notification
          ),
        };
      });

      // Refetch unread count
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread });
    },
  });
};

// Mark all notifications as read mutation
export const useMarkAllNotificationsReadMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => apiClient.markAllNotificationsAsRead(),
    onSuccess: () => {
      // Update all notifications in cache to be read
      queryClient.setQueryData(queryKeys.notifications.all, (oldData: any) => {
        if (!oldData?.notifications) return oldData;

        return {
          ...oldData,
          notifications: oldData.notifications.map((notification: Notification) => ({
            ...notification,
            seen: true,
            readAt: new Date().toISOString(),
          })),
        };
      });

      // Update unread count to 0
      queryClient.setQueryData(queryKeys.notifications.unread, { count: 0 });
    },
  });
};

// Delete notification mutation
export const useDeleteNotificationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => apiClient.deleteNotification(notificationId),
    onSuccess: (_, notificationId) => {
      // Remove the notification from cache
      queryClient.setQueryData(queryKeys.notifications.all, (oldData: any) => {
        if (!oldData?.notifications) return oldData;

        const updatedNotifications = oldData.notifications.filter((notification: Notification) =>
          notification.id !== notificationId
        );

        return {
          ...oldData,
          notifications: updatedNotifications,
          totalElements: Math.max(0, (oldData.totalElements || 0) - 1),
        };
      });

      // Refetch unread count in case deleted notification was unread
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread });
    },
  });
};

// Clear all notifications mutation
export const useClearAllNotificationsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.clearAllNotifications(),
    onSuccess: () => {
      // Clear all notifications from cache
      queryClient.setQueryData(queryKeys.notifications.all, {
        notifications: [],
        totalElements: 0,
        totalPages: 0,
        currentPage: 0,
        hasNext: false,
        hasPrevious: false,
      });

      // Update unread count to 0
      queryClient.setQueryData(queryKeys.notifications.unread, { count: 0 });
    },
  });
};

// Export aliases for compatibility
export const useMarkNotificationAsReadMutation = useMarkNotificationReadMutation;
export const useMarkAllNotificationsAsReadMutation = useMarkAllNotificationsReadMutation;
