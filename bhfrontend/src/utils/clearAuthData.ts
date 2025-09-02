/**
 * Utility to clear all authentication data
 * Use this to reset authentication state completely
 */
export const clearAllAuthData = () => {
  console.log('🗑️ CLEAR AUTH: Clearing all authentication data');
  
  // Clear localStorage
  const authKeys = [
    'auth-ui-storage',
    'auth-storage',
    'legacy-auth-storage',
    'auth-token',
    'user-storage',
    'token-storage'
  ];
  
  authKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      console.log(`🗑️ CLEAR AUTH: Removing ${key}`);
      localStorage.removeItem(key);
    }
  });
  
  // Clear auth store
  try {
    const { useAuthUIStore } = require('../store/authUIStore');
    const authUIStore = useAuthUIStore.getState();
    authUIStore.clearToken();
    console.log('🗑️ CLEAR AUTH: Auth store cleared');
  } catch (error) {
    console.warn('⚠️ CLEAR AUTH: Failed to clear auth store:', error);
  }
  
  // Clear API client token
  try {
    const { apiClient } = require('../lib/api');
    apiClient.clearToken();
    console.log('🗑️ CLEAR AUTH: API client token cleared');
  } catch (error) {
    console.warn('⚠️ CLEAR AUTH: Failed to clear API client token:', error);
  }
};

/**
 * Check if there's any stale authentication data and clear it
 */
export const clearStaleAuthData = () => {
  console.log('🔍 CLEAR AUTH: Checking for stale auth data');

  const authStorage = localStorage.getItem('auth-ui-storage');
  if (!authStorage) {
    console.log('🔍 CLEAR AUTH: No auth storage found');
    return false;
  }

  try {
    const parsed = JSON.parse(authStorage);
    if (parsed.state?.token && parsed.state?.tokenExpiration) {
      const isExpired = Date.now() > (parsed.state.tokenExpiration - 5 * 60 * 1000);
      if (isExpired) {
        console.log('🗑️ CLEAR AUTH: Found expired token, clearing all auth data');
        clearAllAuthData();
        return true;
      } else {
        console.log('🔍 CLEAR AUTH: Token exists and is valid');
        return false;
      }
    } else {
      console.log('🗑️ CLEAR AUTH: Invalid token structure, clearing all auth data');
      clearAllAuthData();
      return true;
    }
  } catch (e) {
    console.warn('⚠️ CLEAR AUTH: Invalid auth storage, clearing all auth data');
    clearAllAuthData();
    return true;
  }
};

/**
 * Clear Facebook-specific authentication conflicts
 */
export const clearFacebookConflicts = () => {
  console.log('🧹 CLEAR AUTH: Clearing Facebook authentication conflicts');

  // Clear Facebook session storage
  Object.keys(sessionStorage).forEach(key => {
    if (key.startsWith('fb') || key.includes('facebook')) {
      sessionStorage.removeItem(key);
      console.log(`🗑️ CLEAR AUTH: Removed session storage: ${key}`);
    }
  });

  // Clear problematic Facebook local storage (keep essential ones)
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('fb') && !key.includes('fbsr_') && !key.includes('fbm_')) {
      localStorage.removeItem(key);
      console.log(`🗑️ CLEAR AUTH: Removed local storage: ${key}`);
    }
  });

  // Clear stale Facebook cookies (keep essential ones)
  document.cookie.split(";").forEach(function(c) {
    const cookieName = c.trim().split('=')[0];
    if (cookieName.startsWith('fb') && !cookieName.includes('fbsr_') && !cookieName.includes('fbm_')) {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      console.log(`🗑️ CLEAR AUTH: Cleared cookie: ${cookieName}`);
    }
  });

  console.log('✅ CLEAR AUTH: Facebook conflicts cleared');
};

/**
 * Force clear all authentication data (for debugging)
 */
export const forceResetAuth = () => {
  console.log('🔄 CLEAR AUTH: Force resetting all authentication data');

  // Clear Facebook conflicts first
  clearFacebookConflicts();

  // Clear all other auth data
  clearAllAuthData();

  // Also clear React Query cache
  try {
    const { queryClient } = require('../lib/queryClient');
    queryClient.clear();
    console.log('🗑️ CLEAR AUTH: React Query cache cleared');
  } catch (error) {
    console.warn('⚠️ CLEAR AUTH: Failed to clear React Query cache:', error);
  }

  // Reload the page to ensure clean state
  setTimeout(() => {
    window.location.reload();
  }, 100);
};
