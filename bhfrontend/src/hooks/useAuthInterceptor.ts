import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';

/**
 * Authentication interceptor hook that provides seamless UX
 * - Monitors authentication state changes
 * - Handles silent token refresh
 * - Prevents authentication state flicker
 * - Provides smooth transitions between auth states
 */
export const useAuthInterceptor = () => {
  const { 
    isAuthenticated, 
    user, 
    token, 
    isLoading, 
    checkAuth, 
    refreshToken,
    isTokenValid 
  } = useAuth();
  
  const lastAuthState = useRef({ isAuthenticated: false, user: null });
  const refreshInProgress = useRef(false);
  const checkAuthInProgress = useRef(false);

  // Monitor authentication state and handle transitions
  useEffect(() => {
    const currentState = { isAuthenticated, user };
    const previousState = lastAuthState.current;

    // Detect state changes
    const authStateChanged =
      currentState.isAuthenticated !== previousState.isAuthenticated ||
      currentState.user?.id !== previousState.user?.id;

    if (authStateChanged) {
      console.log('🔄 AUTH INTERCEPTOR: Auth state changed', {
        from: previousState,
        to: currentState
      });
    }

    // Update reference
    lastAuthState.current = currentState;
  }, [isAuthenticated, user]);

  // Handle token validation and refresh (with debouncing to prevent loops)
  useEffect(() => {
    if (isAuthenticated && token && !isLoading && !refreshInProgress.current) {
      if (!isTokenValid()) {
        console.log('🔄 AUTH INTERCEPTOR: Token invalid, attempting refresh...');
        refreshInProgress.current = true;

        // Add delay to prevent rapid successive calls
        const timeoutId = setTimeout(() => {
          refreshToken()
            .then(() => {
              console.log('✅ AUTH INTERCEPTOR: Token refresh successful');
            })
            .catch((error) => {
              console.error('❌ AUTH INTERCEPTOR: Token refresh failed:', error);
            })
            .finally(() => {
              refreshInProgress.current = false;
            });
        }, 200);

        return () => {
          clearTimeout(timeoutId);
          refreshInProgress.current = false;
        };
      }
    }
  }, [isAuthenticated, token, isLoading]); // Removed function dependencies to prevent loops

  // Handle initial auth check (with debouncing to prevent loops)
  useEffect(() => {
    if (!isAuthenticated && token && !isLoading && !checkAuthInProgress.current) {
      console.log('🔍 AUTH INTERCEPTOR: Token exists but not authenticated, checking...');
      checkAuthInProgress.current = true;

      // Add delay to prevent rapid successive calls
      const timeoutId = setTimeout(() => {
        checkAuth()
          .then(() => {
            console.log('✅ AUTH INTERCEPTOR: Auth check completed');
          })
          .catch((error) => {
            console.error('❌ AUTH INTERCEPTOR: Auth check failed:', error);
          })
          .finally(() => {
            checkAuthInProgress.current = false;
          });
      }, 300);

      return () => {
        clearTimeout(timeoutId);
        checkAuthInProgress.current = false;
      };
    }
  }, [isAuthenticated, token, isLoading, checkAuth]); // Added checkAuth back but with proper memoization

  // Temporarily disable periodic and visibility token validation to debug infinite loop
  // Periodic token validation (every 5 minutes)
  // useEffect(() => {
  //   if (!isAuthenticated || !token) return;

  //   const interval = setInterval(() => {
  //     if (!refreshInProgress.current && !isTokenValid()) {
  //       console.log('⏰ AUTH INTERCEPTOR: Periodic token check - token invalid');
  //       refreshInProgress.current = true;

  //       refreshToken()
  //         .then(() => {
  //           console.log('✅ AUTH INTERCEPTOR: Periodic token refresh successful');
  //         })
  //         .catch((error) => {
  //           console.error('❌ AUTH INTERCEPTOR: Periodic token refresh failed:', error);
  //         })
  //         .finally(() => {
  //           refreshInProgress.current = false;
  //         });
  //     }
  //   }, 5 * 60 * 1000); // 5 minutes

  //   return () => clearInterval(interval);
  // }, [isAuthenticated, token]); // Removed function dependencies to prevent loops

  // Handle page visibility changes for token refresh
  // useEffect(() => {
  //   const handleVisibilityChange = () => {
  //     if (document.visibilityState === 'visible' && isAuthenticated && token) {
  //       // Check token validity when page becomes visible
  //       if (!isTokenValid() && !refreshInProgress.current) {
  //         console.log('👁️ AUTH INTERCEPTOR: Page visible, checking token validity...');
  //         refreshInProgress.current = true;

  //         refreshToken()
  //           .then(() => {
  //             console.log('✅ AUTH INTERCEPTOR: Visibility token refresh successful');
  //           })
  //           .catch((error) => {
  //             console.error('❌ AUTH INTERCEPTOR: Visibility token refresh failed:', error);
  //           })
  //           .finally(() => {
  //             refreshInProgress.current = false;
  //           });
  //       }
  //     }
  //   };

  //   document.addEventListener('visibilitychange', handleVisibilityChange);
  //   return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  // }, [isAuthenticated, token]); // Removed function dependencies to prevent loops

  return {
    isAuthenticating: isLoading || refreshInProgress.current || checkAuthInProgress.current,
    isAuthenticated,
    user,
    hasValidToken: isAuthenticated && token && isTokenValid()
  };
};
