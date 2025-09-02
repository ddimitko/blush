import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { useDashboardUIStore } from '../store/uiStore';

/**
 * Hook to synchronize authentication state changes with UI stores
 * Clears dashboard state when user changes or logs out
 */
export const useAuthStateSync = () => {
  const { user, isAuthenticated } = useAuth();
  const { clearSelectedShop, validateSelectedShop } = useDashboardUIStore();
  
  // Track previous user to detect user changes
  const previousUserRef = useRef<string | null>(null);
  
  useEffect(() => {
    const currentUserId = user?.id || null;
    const previousUserId = previousUserRef.current;
    
    // If user logged out
    if (!isAuthenticated || !currentUserId) {
      if (previousUserId) {
        console.log('🚪 AUTH STATE SYNC: User logged out, clearing dashboard state');
        clearSelectedShop();
      }
      previousUserRef.current = null;
      return;
    }
    
    // If user changed (different user logged in)
    if (previousUserId && previousUserId !== currentUserId) {
      console.log('🔄 AUTH STATE SYNC: Different user logged in, clearing dashboard state', {
        previousUserId,
        currentUserId
      });
      clearSelectedShop();
    }
    
    // If user logged in for the first time in this session
    if (!previousUserId && currentUserId) {
      console.log('✅ AUTH STATE SYNC: User logged in, validating dashboard state');
      validateSelectedShop(currentUserId);
    }
    
    // Update the ref
    previousUserRef.current = currentUserId;
  }, [user?.id, isAuthenticated, clearSelectedShop, validateSelectedShop]);
};
