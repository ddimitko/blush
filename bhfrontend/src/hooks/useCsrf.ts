import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api';

interface CsrfState {
  token: string | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

/**
 * Hook for managing CSRF tokens in React components
 * Provides utilities for checking, refreshing, and validating CSRF tokens
 */
export const useCsrf = () => {
  const [state, setState] = useState<CsrfState>({
    token: null,
    isLoading: false,
    error: null,
    lastFetched: null
  });

  /**
   * Get CSRF token from cookie
   */
  const getCsrfToken = useCallback((): string | null => {
    try {
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'XSRF-TOKEN') {
          const decodedValue = decodeURIComponent(value);
          if (decodedValue && decodedValue.length > 10 && decodedValue.length < 500) {
            return decodedValue;
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ CSRF HOOK: Error reading CSRF token from cookie:', error);
    }
    return null;
  }, []);

  /**
   * Check if CSRF token is available and valid
   */
  const isTokenAvailable = useCallback((): boolean => {
    const token = getCsrfToken();
    return token !== null && token.length > 0;
  }, [getCsrfToken]);

  /**
   * Refresh CSRF token from server
   */
  const refreshToken = useCallback(async (): Promise<string | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('🔒 CSRF HOOK: Refreshing CSRF token...');
      
      // Clear existing token
      document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      // Fetch new token
      await apiClient.get('/auth/csrf');
      
      // Get the new token
      const newToken = getCsrfToken();
      
      if (newToken) {
        console.log('✅ CSRF HOOK: CSRF token refreshed successfully');
        setState(prev => ({
          ...prev,
          token: newToken,
          isLoading: false,
          error: null,
          lastFetched: Date.now()
        }));
        return newToken;
      } else {
        throw new Error('CSRF token not found in cookie after refresh');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to refresh CSRF token';
      console.error('❌ CSRF HOOK: Failed to refresh CSRF token:', errorMessage);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        token: null
      }));
      
      return null;
    }
  }, [getCsrfToken]);

  /**
   * Ensure CSRF token is available, refresh if needed
   */
  const ensureToken = useCallback(async (): Promise<string | null> => {
    const existingToken = getCsrfToken();
    
    if (existingToken) {
      setState(prev => ({
        ...prev,
        token: existingToken,
        error: null
      }));
      return existingToken;
    }
    
    return await refreshToken();
  }, [getCsrfToken, refreshToken]);

  /**
   * Check if token needs refresh (older than 30 minutes)
   */
  const needsRefresh = useCallback((): boolean => {
    if (!state.lastFetched) return true;
    const thirtyMinutes = 30 * 60 * 1000;
    return Date.now() - state.lastFetched > thirtyMinutes;
  }, [state.lastFetched]);

  /**
   * Get CSRF headers for manual requests
   */
  const getCsrfHeaders = useCallback((): Record<string, string> => {
    const token = getCsrfToken();
    return token ? { 'X-CSRF-TOKEN': token } : {};
  }, [getCsrfToken]);

  /**
   * Validate that CSRF protection is working
   */
  const validateCsrfProtection = useCallback(async (): Promise<boolean> => {
    try {
      // Try to make a request without CSRF token to a protected endpoint
      // This should fail with 403 if CSRF protection is working
      const testResponse = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(apiClient as any).token || ''}`
        },
        credentials: 'include',
        body: JSON.stringify({ test: true })
      });
      
      // If we get 403, CSRF protection is working
      if (testResponse.status === 403) {
        console.log('✅ CSRF HOOK: CSRF protection is working correctly');
        return true;
      } else {
        console.warn('⚠️ CSRF HOOK: CSRF protection may not be working - expected 403 but got', testResponse.status);
        return false;
      }
    } catch (error) {
      console.warn('⚠️ CSRF HOOK: Could not validate CSRF protection:', error);
      return false;
    }
  }, []);

  // Initialize token on mount
  useEffect(() => {
    const token = getCsrfToken();
    if (token) {
      setState(prev => ({
        ...prev,
        token,
        lastFetched: Date.now()
      }));
    }
  }, [getCsrfToken]);

  // Auto-refresh token if needed (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (needsRefresh() && !state.isLoading) {
        console.log('🔒 CSRF HOOK: Auto-refreshing CSRF token...');
        refreshToken();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [needsRefresh, refreshToken, state.isLoading]);

  return {
    // State
    token: state.token,
    isLoading: state.isLoading,
    error: state.error,
    lastFetched: state.lastFetched,
    
    // Utilities
    isTokenAvailable,
    needsRefresh,
    
    // Actions
    refreshToken,
    ensureToken,
    getCsrfToken,
    getCsrfHeaders,
    
    // Validation
    validateCsrfProtection
  };
};

export default useCsrf;
