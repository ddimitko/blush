import { useEffect, useCallback, useRef } from 'react';
import { useBookingUIStore } from '../store/uiStore';
import { useOptimisticSlotLocking } from './useOptimisticSlotLocking';
import { AvailableSlot } from '../types';

interface QueuedSlotLock {
  slotKey: string;
  params: {
    shopId: string;
    serviceId: string;
    employeeId: string;
    dateTime: string;
    slot: AvailableSlot;
  };
  priority: number;
  timestamp: number;
}

export const useSlotLockQueue = () => {
  const {
    lockQueue,
    isProcessingQueue,
    removeFromLockQueue,
    setSlotState,
  } = useBookingUIStore();

  const { lockSlotOptimistic } = useOptimisticSlotLocking();
  const processingRef = useRef(false);
  const queueRef = useRef<QueuedSlotLock[]>([]);

  // Add slot to queue with priority
  const addToQueue = useCallback((
    slotKey: string,
    params: QueuedSlotLock['params'],
    priority: number = 1
  ) => {
    const queueItem: QueuedSlotLock = {
      slotKey,
      params,
      priority,
      timestamp: Date.now(),
    };

    // Add to internal queue with priority sorting
    queueRef.current = [...queueRef.current, queueItem]
      .sort((a, b) => {
        // Higher priority first, then by timestamp
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.timestamp - b.timestamp;
      });

    console.log('📋 QUEUE: Added slot to queue', { slotKey, priority, queueLength: queueRef.current.length });
  }, []);

  // Process the queue
  const processQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) {
      return;
    }

    processingRef.current = true;
    console.log('🔄 QUEUE: Processing queue', { queueLength: queueRef.current.length });

    try {
      while (queueRef.current.length > 0) {
        const item = queueRef.current.shift();
        if (!item) break;

        console.log('🔄 QUEUE: Processing slot lock', item.slotKey);

        try {
          // Set slot to locking state
          setSlotState(item.slotKey, {
            state: 'locking',
            lastAttempt: Date.now(),
          });

          // Attempt to lock the slot
          const response = await lockSlotOptimistic(item.params);

          if (response?.lockToken) {
            console.log('✅ QUEUE: Slot locked successfully', item.slotKey);
            setSlotState(item.slotKey, {
              state: 'locked',
              lockToken: response.lockToken,
              lastAttempt: Date.now(),
            });
          }

          // Remove from store queue
          removeFromLockQueue(item.slotKey);

          // Small delay between queue items to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error: any) {
          console.error('❌ QUEUE: Failed to process slot lock', { slotKey: item.slotKey, error: error.message });
          
          // Set error state
          setSlotState(item.slotKey, {
            state: 'error',
            error: error.message,
            lastAttempt: Date.now(),
          });

          // Remove from store queue
          removeFromLockQueue(item.slotKey);
        }
      }
    } finally {
      processingRef.current = false;
      console.log('✅ QUEUE: Queue processing completed');
    }
  }, [lockSlotOptimistic, setSlotState, removeFromLockQueue]);

  // Auto-process queue when items are added
  useEffect(() => {
    if (queueRef.current.length > 0 && !processingRef.current) {
      const timeoutId = setTimeout(() => {
        processQueue();
      }, 50); // Small delay to batch multiple additions

      return () => clearTimeout(timeoutId);
    }
  }, [processQueue]);

  // Clear queue on unmount
  useEffect(() => {
    return () => {
      queueRef.current = [];
      processingRef.current = false;
    };
  }, []);

  // Retry failed items in queue
  const retryFailedItems = useCallback(() => {
    const failedItems = queueRef.current.filter(item => {
      const slotState = useBookingUIStore.getState().getSlotState(item.slotKey);
      return slotState.state === 'error';
    });

    console.log('🔄 QUEUE: Retrying failed items', { count: failedItems.length });

    failedItems.forEach(item => {
      setSlotState(item.slotKey, {
        state: 'retrying',
        retryCount: (useBookingUIStore.getState().getSlotState(item.slotKey).retryCount || 0) + 1,
        lastAttempt: Date.now(),
      });
    });

    if (failedItems.length > 0) {
      processQueue();
    }
  }, [setSlotState, processQueue]);

  // Get queue statistics
  const getQueueStats = useCallback(() => {
    const pending = queueRef.current.length;
    const processing = processingRef.current;
    const failed = queueRef.current.filter(item => {
      const slotState = useBookingUIStore.getState().getSlotState(item.slotKey);
      return slotState.state === 'error';
    }).length;

    return {
      pending,
      processing,
      failed,
      total: pending,
    };
  }, []);

  return {
    addToQueue,
    processQueue,
    retryFailedItems,
    getQueueStats,
    isProcessing: processingRef.current,
    queueLength: queueRef.current.length,
  };
};
