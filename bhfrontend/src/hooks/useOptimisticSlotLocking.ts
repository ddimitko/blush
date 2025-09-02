import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBookingUIStore, SlotState, SlotStateInfo } from '../store/uiStore';
import { useLockSlotMutation, useUnlockSlotMutation } from './queries';
import { useSlotLockingMetrics } from './useSlotLockingMetrics';
import { AvailableSlot } from '../types';
import { useToast } from '../components/ui/Toast';

interface SlotLockParams {
  shopId: string;
  serviceId: string;
  employeeId: string;
  dateTime: string;
  slot: AvailableSlot;
}

interface SlotUnlockParams {
  shopId: string;
  serviceId: string;
  employeeId: string;
  date: string;
  time: string;
  sessionId: string;
}

export const useOptimisticSlotLocking = () => {
  const queryClient = useQueryClient();
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { error: showErrorToast } = useToast();

  const {
    setSlotState,
    getSlotState,
    clearSlotState,
    addToLockQueue,
    removeFromLockQueue,
    setCurrentLockSessionId,
    setError,
    clearError,
    incrementRetryAttempts,
    resetRetryAttempts,
    retryAttempts,
    maxRetryAttempts,
  } = useBookingUIStore();

  const baseLockMutation = useLockSlotMutation();
  const baseUnlockMutation = useUnlockSlotMutation();
  const { startAttempt, endAttempt } = useSlotLockingMetrics();

  // Generate slot key for tracking
  const generateSlotKey = useCallback((params: SlotLockParams | SlotUnlockParams) => {
    if ('dateTime' in params) {
      return `${params.shopId}-${params.serviceId}-${params.employeeId}-${params.dateTime}`;
    } else {
      return `${params.shopId}-${params.serviceId}-${params.employeeId}-${params.date}T${params.time}:00`;
    }
  }, []);

  // Optimistic slot lock with retry logic
  const lockSlotOptimistic = useCallback(async (params: SlotLockParams) => {
    const slotKey = generateSlotKey(params);
    const isRetry = retryAttempts > 0;

    // Start metrics tracking
    startAttempt(slotKey, isRetry);

    try {
      // Immediate optimistic update
      setSlotState(slotKey, {
        state: 'locking' as SlotState,
        lastAttempt: Date.now()
      });

      // Add to queue for processing
      addToLockQueue(slotKey);

      console.log('🔒 OPTIMISTIC: Starting slot lock for', slotKey);

      // Attempt the actual lock
      const response = await baseLockMutation.mutateAsync({
        shopId: params.shopId,
        serviceId: params.serviceId,
        employeeId: params.employeeId,
        dateTime: params.dateTime,
      });

      // Success - update state
      setSlotState(slotKey, {
        state: 'locked' as SlotState,
        lockToken: response.lockToken,
        lastAttempt: Date.now()
      });

      setCurrentLockSessionId(response.lockToken);
      removeFromLockQueue(slotKey);
      resetRetryAttempts();
      clearError();

      // End metrics tracking with success
      endAttempt(slotKey, true);

      console.log('✅ OPTIMISTIC: Slot locked successfully', { slotKey, lockToken: response.lockToken });

      return response;

    } catch (error: any) {
      console.error('❌ OPTIMISTIC: Slot lock failed', { slotKey, error: error.message });

      // End metrics tracking with failure
      endAttempt(slotKey, false, error.message);

      // Handle different error types
      if (error.message?.includes('already locked')) {
        setSlotState(slotKey, {
          state: 'error' as SlotState,
          error: 'Slot is already locked by another user',
          lastAttempt: Date.now()
        });
        removeFromLockQueue(slotKey);
        showErrorToast('Slot Unavailable', 'This time slot was just taken by another user');
      } else if (retryAttempts < maxRetryAttempts) {
        // Retry logic for network errors
        incrementRetryAttempts();
        setSlotState(slotKey, { 
          state: 'retrying' as SlotState,
          error: error.message,
          retryCount: retryAttempts + 1,
          lastAttempt: Date.now()
        });

        const retryDelay = Math.min(1000 * Math.pow(2, retryAttempts), 5000); // Exponential backoff, max 5s
        
        console.log(`🔄 OPTIMISTIC: Retrying slot lock in ${retryDelay}ms (attempt ${retryAttempts + 1}/${maxRetryAttempts})`);
        
        retryTimeoutRef.current = setTimeout(() => {
          lockSlotOptimistic(params);
        }, retryDelay);
      } else {
        // Max retries reached
        setSlotState(slotKey, { 
          state: 'error' as SlotState,
          error: 'Failed to lock slot after multiple attempts',
          lastAttempt: Date.now()
        });
        removeFromLockQueue(slotKey);
        setError('Network error. Please check your connection and try again.');
        showErrorToast('Booking Error', 'Unable to reserve time slot. Please try again.');
      }

      throw error;
    }
  }, [
    generateSlotKey, setSlotState, addToLockQueue, baseLockMutation, 
    setCurrentLockSessionId, removeFromLockQueue, resetRetryAttempts, 
    clearError, retryAttempts, maxRetryAttempts, incrementRetryAttempts, setError
  ]);

  // Optimistic slot unlock
  const unlockSlotOptimistic = useCallback(async (params: SlotUnlockParams) => {
    const slotKey = generateSlotKey(params);
    
    try {
      // Immediate optimistic update
      setSlotState(slotKey, { 
        state: 'unlocking' as SlotState,
        lastAttempt: Date.now()
      });

      console.log('🔓 OPTIMISTIC: Starting slot unlock for', slotKey);

      // Attempt the actual unlock
      await baseUnlockMutation.mutateAsync(params);

      // Success - clear state
      clearSlotState(slotKey);
      setCurrentLockSessionId(null);
      clearError();

      console.log('✅ OPTIMISTIC: Slot unlocked successfully', slotKey);

    } catch (error: any) {
      console.error('❌ OPTIMISTIC: Slot unlock failed', { slotKey, error: error.message });
      
      // Revert to locked state on error
      setSlotState(slotKey, { 
        state: 'locked' as SlotState,
        error: error.message,
        lastAttempt: Date.now()
      });

      showErrorToast('Unlock Error', 'Failed to release time slot');
      throw error;
    }
  }, [generateSlotKey, setSlotState, baseUnlockMutation, clearSlotState, setCurrentLockSessionId, clearError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    lockSlotOptimistic,
    unlockSlotOptimistic,
    getSlotState,
    isLocking: baseLockMutation.isPending,
    isUnlocking: baseUnlockMutation.isPending,
  };
};
