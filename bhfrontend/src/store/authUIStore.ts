import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { apiClient } from '../lib/api';

// Utility function to clear all cached data
const clearAllCachedData = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🗑️ AUTH UI STORE: Clearing all cached data');
  }

  // Clear all Zustand persisted stores
  localStorage.removeItem('shop-search-ui');
  localStorage.removeItem('dashboard-ui');
  localStorage.removeItem('booking-storage');

  // Remove legacy auth_token if it exists
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth-storage');
  localStorage.removeItem('legacy-auth-storage');

  // Clear any other cached data
  sessionStorage.clear();

  if (process.env.NODE_ENV === 'development') {
    console.log('✅ AUTH UI STORE: All cached data cleared');
  }
};

// Auth UI state - only authentication state, user data comes from React Query
interface AuthUIState {
  // Authentication state
  token: string | null;
  tokenExpiration: number | null;
  isAuthenticated: boolean;
  lastActivity: number | null;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  setToken: (token: string, expiresIn?: number) => void;
  clearToken: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  updateActivity: () => void;
  isTokenValid: () => boolean;
  logout: () => Promise<void>;
  
  // Modal management
  triggerAuthSuccess: () => void;
}

export const useAuthUIStore = create<AuthUIState>()(
  persist(
    (set, get) => ({
      // Initial state
      token: null,
      tokenExpiration: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      lastActivity: null,

      // Set token and update authentication state
      setToken: (token: string, expiresIn?: number) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔑 AUTH UI STORE: Setting token', {
            tokenLength: token.length,
            expiresIn
          });
        }
        
        const expiration = expiresIn 
          ? Date.now() + (expiresIn * 1000)
          : Date.now() + (24 * 60 * 60 * 1000); // 24 hours default

        set({
          token,
          tokenExpiration: expiration,
          isAuthenticated: true,
          error: null,
          lastActivity: Date.now(),
        });

        // Update API client token
        apiClient.setToken(token);
      },

      // Clear token and reset authentication state
      clearToken: () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('🗑️ AUTH UI STORE: Clearing token');
        }
        
        set({
          token: null,
          tokenExpiration: null,
          isAuthenticated: false,
          error: null,
          lastActivity: null,
        });

        // Clear API client token
        apiClient.clearToken();
        
        // Clear all cached data
        clearAllCachedData();
      },

      // Set error state
      setError: (error: string | null) => {
        set({ error, isLoading: false });
      },

      // Set loading state
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // Update last activity timestamp
      updateActivity: () => {
        const { isAuthenticated } = get();
        if (isAuthenticated) {
          set({ lastActivity: Date.now() });
        }
      },

      // Check if current token is valid
      isTokenValid: () => {
        const { token, tokenExpiration } = get();
        
        if (!token || !tokenExpiration) {
          return false;
        }

        // Check if token is expired (with 5 minute buffer)
        const isExpired = Date.now() > (tokenExpiration - 5 * 60 * 1000);
        
        if (isExpired) {
          console.log('⚠️ AUTH UI STORE: Token expired');
          return false;
        }

        return true;
      },

      // Logout action
      logout: async () => {
        const { clearToken } = get();
        
        try {
          set({ isLoading: true });
          
          // Call logout API
          await apiClient.logout();
          
          console.log('✅ AUTH UI STORE: Logout successful');
        } catch (error: any) {
          console.error('❌ AUTH UI STORE: Logout error:', error);
          // Continue with logout even if API call fails
        } finally {
          // Always clear local state
          clearToken();
          set({ isLoading: false });
        }
      },

      // Trigger auth success event for modal management
      triggerAuthSuccess: () => {
        console.log('Auth success triggered');
      },

    }),
    {
      name: 'auth-ui-storage',
      partialize: (state) => ({
        token: state.token,
        tokenExpiration: state.tokenExpiration,
        isAuthenticated: state.isAuthenticated,
        lastActivity: state.lastActivity,
      }),
      // Increment version to clear old conflicting data
      version: 2,
    }
  )
);

// Initialize API client token on store creation
const initializeApiToken = () => {
  const state = useAuthUIStore.getState();
  if (state.token && state.isTokenValid()) {
    apiClient.setToken(state.token);
    console.log('🔄 AUTH UI STORE: API client token initialized from storage');
  } else if (state.token) {
    // Token exists but is invalid, clear it
    console.log('⚠️ AUTH UI STORE: Stored token is invalid, clearing');
    state.clearToken();
  }
};

// Initialize on module load
initializeApiToken();
