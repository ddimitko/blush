import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';

export const useAuthActivity = () => {
  const { isAuthenticated } = useAuth();
  const lastActivityRef = useRef<number>(0);

  // Throttle activity updates to prevent excessive calls
  const handleActivity = useCallback(() => {
    const now = Date.now();
    // Only update activity once every 30 seconds
    if (now - lastActivityRef.current > 30000) {
      lastActivityRef.current = now;
      // Placeholder for activity tracking - can be implemented later
      console.log('User activity tracked at:', new Date().toISOString());
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Track user activity with throttling
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true, capture: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [isAuthenticated, handleActivity]);
};
