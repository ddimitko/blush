/**
 * Facebook Authentication Conflict Resolver
 * 
 * This utility helps resolve conflicts that can cause Facebook login
 * to open in a weird way or fail to complete properly.
 */

/**
 * Check for and resolve Facebook authentication conflicts
 */
export const resolveFacebookConflicts = async (): Promise<void> => {
  console.log('🔍 Checking for Facebook authentication conflicts...');

  // 1. Clear conflicting session storage
  clearConflictingSessionStorage();

  // 2. Clear problematic local storage
  clearProblematicLocalStorage();

  // 3. Clear stale cookies
  clearStaleAuthCookies();

  // 4. Check for multiple Facebook SDK instances
  await resolveSDKConflicts();

  // 5. Clear any stuck authentication states
  clearStuckAuthStates();

  console.log('✅ Facebook conflict resolution complete');
};

/**
 * Clear conflicting session storage entries
 */
const clearConflictingSessionStorage = (): void => {
  const keysToRemove: string[] = [];
  
  // Find all Facebook-related session storage keys
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.startsWith('fb') || key.includes('facebook') || key.includes('oauth'))) {
      keysToRemove.push(key);
    }
  }

  // Remove conflicting keys
  keysToRemove.forEach(key => {
    sessionStorage.removeItem(key);
    console.log(`🗑️ Removed conflicting session storage: ${key}`);
  });
};

/**
 * Clear problematic local storage entries (keep essential ones)
 */
const clearProblematicLocalStorage = (): void => {
  const keysToRemove: string[] = [];
  
  // Find problematic Facebook local storage keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('fb') && 
        !key.includes('fbsr_') && 
        !key.includes('fbm_') &&
        !key.includes('facebook-jssdk')) {
      keysToRemove.push(key);
    }
  }

  // Remove problematic keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`🗑️ Removed problematic local storage: ${key}`);
  });
};

/**
 * Clear stale authentication cookies (keep essential ones)
 */
const clearStaleAuthCookies = (): void => {
  try {
    const cookies = document.cookie.split(";");
    
    cookies.forEach(cookie => {
      const cookieName = cookie.trim().split('=')[0];
      
      // Clear stale Facebook cookies but keep essential ones
      if (cookieName.startsWith('fb') && 
          !cookieName.includes('fbsr_') && 
          !cookieName.includes('fbm_')) {
        
        // Clear the cookie
        document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.localhost`;
        document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
        console.log(`🗑️ Cleared stale cookie: ${cookieName}`);
      }
    });
  } catch (error) {
    console.warn('⚠️ Error clearing stale cookies:', error);
  }
};

/**
 * Resolve Facebook SDK conflicts
 */
const resolveSDKConflicts = async (): Promise<void> => {
  try {
    // Check if Facebook SDK is loaded
    if (window.FB) {
      console.log('🔍 Facebook SDK detected, checking for conflicts...');
      
      // Clear any stuck internal state
      if ((window.FB as any)._state) {
        delete (window.FB as any)._state;
        console.log('🗑️ Cleared Facebook SDK internal state');
      }

      // Clear any cached domain info
      if ((window.FB as any)._domain) {
        delete (window.FB as any)._domain;
        console.log('🗑️ Cleared Facebook SDK domain cache');
      }

      // Check if SDK is properly initialized
      try {
        const isInitialized = typeof window.FB.getLoginStatus === 'function' &&
                             typeof window.FB.login === 'function';
        
        if (!isInitialized) {
          console.log('⚠️ Facebook SDK not properly initialized, will reset');
          delete window.FB;
          
          // Remove script tag
          const script = document.getElementById('facebook-jssdk');
          if (script) {
            script.remove();
          }
        }
      } catch (error) {
        console.log('⚠️ Facebook SDK check failed, will reset');
        delete window.FB;
      }
    }
  } catch (error) {
    console.warn('⚠️ Error resolving SDK conflicts:', error);
  }
};

/**
 * Clear stuck authentication states
 */
const clearStuckAuthStates = (): void => {
  try {
    // Clear any stuck OAuth states in URL
    if (window.location.hash.includes('access_token') || 
        window.location.hash.includes('error')) {
      console.log('🗑️ Clearing stuck OAuth state from URL');
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }

    // Clear any stuck authentication modals or popups
    const authModals = document.querySelectorAll('[id*="facebook"], [class*="facebook"], [id*="oauth"], [class*="oauth"]');
    authModals.forEach(modal => {
      if (modal.tagName === 'IFRAME' || modal.tagName === 'DIV') {
        modal.remove();
        console.log('🗑️ Removed stuck authentication modal');
      }
    });

  } catch (error) {
    console.warn('⚠️ Error clearing stuck auth states:', error);
  }
};

/**
 * Force reset Facebook authentication (for debugging)
 */
export const forceResetFacebookAuth = (): void => {
  console.log('🔄 Force resetting Facebook authentication...');
  
  // Clear all Facebook-related storage
  Object.keys(localStorage).forEach(key => {
    if (key.includes('fb') || key.includes('facebook')) {
      localStorage.removeItem(key);
    }
  });

  Object.keys(sessionStorage).forEach(key => {
    if (key.includes('fb') || key.includes('facebook')) {
      sessionStorage.removeItem(key);
    }
  });

  // Clear all Facebook cookies
  document.cookie.split(";").forEach(cookie => {
    const cookieName = cookie.trim().split('=')[0];
    if (cookieName.includes('fb')) {
      document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
    }
  });

  // Remove Facebook SDK
  if (window.FB) {
    delete window.FB;
  }
  
  const script = document.getElementById('facebook-jssdk');
  if (script) {
    script.remove();
  }

  console.log('✅ Facebook authentication force reset complete');
};

/**
 * Check if Facebook login conflicts exist
 */
export const checkForFacebookConflicts = (): boolean => {
  let hasConflicts = false;

  // Check for multiple Facebook SDK instances
  const scripts = document.querySelectorAll('script[src*="facebook"]');
  if (scripts.length > 1) {
    console.warn('⚠️ Multiple Facebook SDK scripts detected');
    hasConflicts = true;
  }

  // Check for conflicting session storage
  const sessionKeys = Object.keys(sessionStorage).filter(key => 
    key.startsWith('fb') || key.includes('facebook')
  );
  if (sessionKeys.length > 0) {
    console.warn('⚠️ Conflicting Facebook session storage detected:', sessionKeys);
    hasConflicts = true;
  }

  // Check for stuck authentication states
  if (window.location.hash.includes('access_token') || window.location.hash.includes('error')) {
    console.warn('⚠️ Stuck OAuth state in URL detected');
    hasConflicts = true;
  }

  return hasConflicts;
};
