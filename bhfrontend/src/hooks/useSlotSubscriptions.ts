import { useCallback, useState, useRef, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';

interface SlotSubscription {
  shopId: string;
  employeeId: string;
  date: string;
  serviceId?: string;
}

interface UseSlotSubscriptionsProps {
  onSlotUpdate?: (message: any) => void;
}

export const useSlotSubscriptions = (props?: UseSlotSubscriptionsProps) => {
  const [slotSubscriptions, setSlotSubscriptions] = useState<Set<string>>(new Set());
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const pendingResubscriptions = useRef<SlotSubscription[]>([]);
  const { onSlotUpdate } = props || {};

  // Store stable references to avoid infinite loops
  const isConnectedRef = useRef<boolean>(false);
  const sendMessageRef = useRef<((message: any) => boolean) | null>(null);

  const handleWebSocketMessage = useCallback((message: any) => {
    console.log('📨 Slot WebSocket message received:', message);

    // Handle slot update messages only
    if (onSlotUpdate && (
      // Standard SLOT_UPDATE messages from backend
      message.type === 'SLOT_UPDATE' ||
      message.data?.type === 'SLOT_UPDATE' ||
      // System messages for subscription management
      message.type === 'subscription_confirmed' ||
      message.type === 'unsubscription_confirmed' ||
      // Legacy message types for backward compatibility
      message.type?.includes('SLOT_') ||
      message.type?.includes('AVAILABILITY_') ||
      // Topic-based filtering
      message.topic?.includes('availability/') ||
      message.topic?.includes('slots.') ||
      // Action-based filtering for slot updates
      message.data?.action ||
      message.action === 'EARLY_COMPLETION' ||
      message.reason === 'early_completion'
    )) {
      console.log('📨 Processing slot update:', message);
      onSlotUpdate(message);
    }
  }, [onSlotUpdate]);

  const { isConnected, connectionError, sendMessage } = useWebSocket({
    url: `${process.env.REACT_APP_WS_URL || 'wss://localhost:8443'}/ws`,
    onMessage: handleWebSocketMessage,
    onConnect: () => {
      console.log('🔌 SLOT WebSocket connected to:', `${process.env.REACT_APP_WS_URL || 'wss://localhost:8443'}/ws`);

      // Process any pending re-subscriptions
      if (pendingResubscriptions.current.length > 0) {
        console.log('🔌 Processing pending re-subscriptions:', pendingResubscriptions.current);
        const toResubscribe = [...pendingResubscriptions.current];
        pendingResubscriptions.current = [];

        // Re-subscribe with a small delay to ensure connection is stable
        setTimeout(() => {
          toResubscribe.forEach(subscription => {
            console.log('🔌 Re-subscribing to:', subscription);
            // Will be handled by the subscribeToSlots function
          });
        }, 100);
      }
    },
    onDisconnect: () => {
      console.log('🔌 SLOT WebSocket disconnected');
    },
    onError: (error) => {
      console.error('🔌 SLOT WebSocket error:', error);
    },
    autoReconnect: true,
    reconnectInterval: 5000,
  });

  // Update refs when WebSocket state changes
  useEffect(() => {
    isConnectedRef.current = isConnected;
    sendMessageRef.current = sendMessage;
  }, [isConnected, sendMessage]);

  const subscribeToSlots = useCallback((subscription: SlotSubscription) => {
    console.log('🔌 subscribeToSlots called with:', subscription, 'isConnected:', isConnectedRef.current);

    if (!isConnectedRef.current || !sendMessageRef.current) {
      console.warn('Cannot subscribe to slots: WebSocket not connected');
      return false;
    }

    // Use the same topic format as backend: slots.{shopId}.{serviceId}.{employeeId}.{date}
    const topic = subscription.serviceId
      ? `slots.${subscription.shopId}.${subscription.serviceId}.${subscription.employeeId}.${subscription.date}`
      : `slots.${subscription.shopId}.${subscription.employeeId}.${subscription.date}`;

    // Check ref first to prevent duplicate subscriptions
    if (subscriptionsRef.current.has(topic)) {
      console.log('Already subscribed to slot topic:', topic);
      return true;
    }

    console.log('🔌 Subscribing to slot availability updates:', topic);

    try {
      const success = sendMessageRef.current({
        type: 'subscribe',
        topic: topic,
        shopId: subscription.shopId,
        employeeId: subscription.employeeId,
        date: subscription.date,
        serviceId: subscription.serviceId
      });

      if (success) {
        // Update both ref and state
        subscriptionsRef.current.add(topic);
        setSlotSubscriptions(prev => new Set(prev).add(topic));
        console.log('✅ Successfully subscribed to slot topic:', topic);
        return true;
      } else {
        console.error('❌ Failed to send subscription message for topic:', topic);
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to subscribe to slot updates:', error);
      return false;
    }
  }, []); // Empty dependency array - use refs instead

  const unsubscribeFromSlots = useCallback((subscription: SlotSubscription) => {
    console.log('🔌 unsubscribeFromSlots called with:', subscription);

    if (!sendMessageRef.current) {
      console.warn('Cannot unsubscribe from slots: WebSocket not available');
      return false;
    }

    // Use the same topic format as backend: slots.{shopId}.{serviceId}.{employeeId}.{date}
    const topic = subscription.serviceId
      ? `slots.${subscription.shopId}.${subscription.serviceId}.${subscription.employeeId}.${subscription.date}`
      : `slots.${subscription.shopId}.${subscription.employeeId}.${subscription.date}`;

    // Check ref first
    if (!subscriptionsRef.current.has(topic)) {
      console.log('Not subscribed to slot topic:', topic);
      return true;
    }

    console.log('🔌 Unsubscribing from slot availability updates:', topic);

    try {
      sendMessageRef.current({
        type: 'unsubscribe',
        topic: topic
      });

      // Update both ref and state
      subscriptionsRef.current.delete(topic);
      setSlotSubscriptions(prev => {
        const newSet = new Set(prev);
        newSet.delete(topic);
        return newSet;
      });

      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from slot updates:', error);
      return false;
    }
  }, []); // Empty dependency array - use refs instead

  const unsubscribeFromAllSlots = useCallback(() => {
    if (!sendMessageRef.current) {
      console.warn('Cannot unsubscribe from slots: WebSocket not available');
      return;
    }

    const currentSubscriptions = subscriptionsRef.current;
    if (currentSubscriptions.size === 0) {
      return;
    }

    console.log('🔌 Unsubscribing from all slot subscriptions:', Array.from(currentSubscriptions));

    currentSubscriptions.forEach(topic => {
      try {
        sendMessageRef.current?.({
          type: 'unsubscribe',
          topic: topic
        });
      } catch (error) {
        console.error('Failed to unsubscribe from slot topic:', topic, error);
      }
    });

    // Clear both ref and state
    subscriptionsRef.current.clear();
    setSlotSubscriptions(new Set());
  }, []); // Empty dependency array - use refs instead

  // Cleanup effect to unsubscribe from all slots when component unmounts
  useEffect(() => {
    return () => {
      // Clean up all subscriptions on unmount
      if (subscriptionsRef.current.size > 0) {
        console.log('🔌 Cleaning up slot subscriptions on unmount');
        // Use sendMessage directly to avoid dependency issues
        const currentSubscriptions = Array.from(subscriptionsRef.current);
        currentSubscriptions.forEach(topic => {
          try {
            sendMessage?.({
              type: 'unsubscribe',
              topic: topic
            });
          } catch (error) {
            console.error('Failed to unsubscribe from slot topic on unmount:', topic, error);
          }
        });

        // Clear the refs
        subscriptionsRef.current.clear();
      }
    };
  }, []); // Empty dependency array to only run on unmount

  // Simplified reconnection handling - just log for now
  useEffect(() => {
    if (isConnected) {
      console.log('🔌 WebSocket connected - ready for subscriptions');
    } else {
      console.log('🔌 WebSocket disconnected');
    }
  }, [isConnected]);

  return {
    isConnected,
    connectionError,
    subscribeToSlots,
    unsubscribeFromSlots,
    unsubscribeFromAllSlots,
    slotSubscriptions: Array.from(slotSubscriptions),
  };
};
