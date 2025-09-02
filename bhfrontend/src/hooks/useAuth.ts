import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthUIStore } from '../store/authUIStore';
import {
  useUserQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation
} from './queries/useAuthQueries';
import { LoginRequest, RegisterRequest } from '../types';
import { apiClient } from '../lib/api';

/**
 * Unified auth hook that combines React Query for user data 
 * with Zustand for auth UI state
 */
export const useAuth = () => {
  const queryClient = useQueryClient();

  // Auth UI state from Zustand
  const {
    token,
    isAuthenticated,
    isLoading: isAuthUILoading,
    error: authUIError,
    setToken,
    clearToken,
    setError,
    setLoading,
    updateActivity,
    isTokenValid,
    logout: logoutUI,
    triggerAuthSuccess,
  } = useAuthUIStore();

  // User data from React Query
  const {
    data: user,
    isLoading: isUserLoading,
    error: userError,
    refetch: refetchUser,
  } = useUserQuery();

  // Auth mutations
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const logoutMutation = useLogoutMutation();

  // Combined loading state
  const isLoading = isAuthUILoading || isUserLoading || 
    loginMutation.isPending || registerMutation.isPending || logoutMutation.isPending;

  // Combined error state
  const error = authUIError || userError?.message || 
    loginMutation.error?.message || registerMutation.error?.message || logoutMutation.error?.message;

  // Login function
  const login = async (credentials: LoginRequest) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 AUTH HOOK: Starting login...');
      const response = await loginMutation.mutateAsync(credentials);

      console.log('✅ AUTH HOOK: Login mutation successful, setting token...', {
        hasToken: !!response.token,
        tokenLength: response.token?.length,
        userId: response.id
      });

      // Set token in UI store with 24 hour expiration
      setToken(response.token, 24 * 60 * 60); // 24 hours in seconds

      // Trigger success event
      triggerAuthSuccess();

      console.log('✅ AUTH HOOK: Login successful, token set');
      return response;
    } catch (error: any) {
      console.error('❌ AUTH HOOK: Login failed:', error);
      setError(error.message || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData: RegisterRequest) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 AUTH HOOK: Starting registration...');
      const response = await registerMutation.mutateAsync(userData);

      console.log('✅ AUTH HOOK: Registration mutation successful, setting token...', {
        hasToken: !!response.token,
        tokenLength: response.token?.length,
        userId: response.id
      });

      // Set token in UI store with 24 hour expiration
      setToken(response.token, 24 * 60 * 60); // 24 hours in seconds

      // Trigger success event
      triggerAuthSuccess();

      console.log('✅ AUTH HOOK: Registration successful, token set');
      return response;
    } catch (error: any) {
      console.error('❌ AUTH HOOK: Registration failed:', error);
      setError(error.message || 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setLoading(true);
      console.log('🚪 AUTH HOOK: Starting logout process');

      // Clear UI state first to prevent any new requests
      clearToken();

      // Clear React Query cache to prevent stale data
      queryClient.clear();

      // Try to call logout API (but don't fail if it doesn't work)
      try {
        await logoutMutation.mutateAsync();
        console.log('✅ AUTH HOOK: API logout successful');
      } catch (apiError) {
        console.warn('⚠️ AUTH HOOK: API logout failed, but local cleanup completed', apiError);
      }

      // Clear UI state again to be sure
      await logoutUI();

      console.log('✅ AUTH HOOK: Logout process completed');
    } catch (error: any) {
      console.error('❌ AUTH HOOK: Logout error:', error);
      // Ensure cleanup happens even if something fails
      clearToken();
      queryClient.clear();
    } finally {
      setLoading(false);
    }
  };

  // Check auth status
  const checkAuth = useCallback(async () => {
    if (!token || !isTokenValid()) {
      console.log('🔍 AUTH HOOK: No valid token, skipping auth check');
      return false;
    }

    try {
      setLoading(true);
      await refetchUser();
      console.log('✅ AUTH HOOK: Auth check successful');
      return true;
    } catch (error: any) {
      console.error('❌ AUTH HOOK: Auth check failed:', error);

      // If auth check fails, clear token
      if (error.response?.status === 401) {
        clearToken();
        queryClient.clear();
      }

      return false;
    } finally {
      setLoading(false);
    }
  }, [token, isTokenValid, setLoading, refetchUser, clearToken, queryClient]);

  // Refresh token (if needed)
  const refreshToken = useCallback(async () => {
    if (!token || !isTokenValid()) {
      console.log('🔍 AUTH HOOK: No valid token for refresh');
      return false;
    }

    try {
      setLoading(true);
      console.log('🔄 AUTH HOOK: Refreshing current user token');

      const response = await apiClient.refreshCurrentUserToken();

      // Update token in UI store
      setToken(response.token, 24 * 60 * 60); // 24 hours in seconds

      // Refetch user data to get updated information
      await refetchUser();

      console.log('✅ AUTH HOOK: Token refresh successful');
      return true;
    } catch (error: any) {
      console.error('❌ AUTH HOOK: Token refresh failed:', error);

      // If refresh fails with 401, clear token
      if (error.response?.status === 401) {
        clearToken();
        queryClient.clear();
      }

      return false;
    } finally {
      setLoading(false);
    }
  }, [token, isTokenValid, setLoading, setToken, refetchUser, clearToken, queryClient]);

  // Memoized clearError function to prevent infinite loops
  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  // Auto-check auth on mount if token exists (with debouncing)
  useEffect(() => {
    // Only run once on mount, not on every state change
    const shouldCheckAuth = token && isTokenValid() && !user && !isUserLoading && !isAuthUILoading;

    if (shouldCheckAuth) {
      console.log('🔄 AUTH HOOK: Auto-checking auth on mount');
      // Add a small delay to prevent rapid successive calls
      const timeoutId = setTimeout(() => {
        checkAuth();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, []); // Empty dependency array to run only once on mount

  // Update activity on user interaction
  useEffect(() => {
    if (isAuthenticated) {
      const handleActivity = () => updateActivity();

      // Listen for user activity
      window.addEventListener('mousedown', handleActivity);
      window.addEventListener('keydown', handleActivity);
      window.addEventListener('scroll', handleActivity);

      return () => {
        window.removeEventListener('mousedown', handleActivity);
        window.removeEventListener('keydown', handleActivity);
        window.removeEventListener('scroll', handleActivity);
      };
    }
  }, [isAuthenticated, updateActivity]);

  return {
    // User data
    user,

    // Auth state
    isAuthenticated: isAuthenticated && !!user,
    isLoading,
    error,
    token,

    // Auth actions
    login,
    register,
    logout,
    checkAuth,
    refreshToken,

    // Utility functions
    isTokenValid,
    updateActivity,
    triggerAuthSuccess,
    clearError,
    setToken,
  };
};
