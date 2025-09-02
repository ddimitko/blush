/**
 * Facebook Authentication Debug Utilities
 * 
 * Use these functions in the browser console to debug Facebook login issues
 */

/**
 * Debug Facebook authentication state
 * Call this in the browser console: window.debugFacebookAuth()
 */
export const debugFacebookAuth = (): void => {
  console.log('🔍 Facebook Authentication Debug Report');
  console.log('=====================================');

  // 1. Check Facebook SDK
  console.log('\n1. Facebook SDK Status:');
  if (window.FB) {
    console.log('✅ Facebook SDK loaded');
    console.log('   - Version:', (window.FB as any).version || 'Unknown');
    console.log('   - getLoginStatus available:', typeof window.FB.getLoginStatus === 'function');
    console.log('   - login available:', typeof window.FB.login === 'function');
    console.log('   - api available:', typeof window.FB.api === 'function');
    
    // Check internal state
    if ((window.FB as any)._state) {
      console.log('   - Internal state:', (window.FB as any)._state);
    }
  } else {
    console.log('❌ Facebook SDK not loaded');
  }

  // 2. Check scripts
  console.log('\n2. Facebook Scripts:');
  const scripts = document.querySelectorAll('script[src*="facebook"]');
  console.log(`   - Found ${scripts.length} Facebook script(s)`);
  scripts.forEach((script, index) => {
    console.log(`   - Script ${index + 1}:`, script.getAttribute('src'));
  });

  // 3. Check storage
  console.log('\n3. Storage Analysis:');
  
  // Local Storage
  const localStorageKeys = Object.keys(localStorage).filter(key => 
    key.includes('fb') || key.includes('facebook') || key.includes('auth')
  );
  console.log(`   - Local Storage (${localStorageKeys.length} keys):`, localStorageKeys);
  
  // Session Storage
  const sessionStorageKeys = Object.keys(sessionStorage).filter(key => 
    key.includes('fb') || key.includes('facebook') || key.includes('auth')
  );
  console.log(`   - Session Storage (${sessionStorageKeys.length} keys):`, sessionStorageKeys);

  // 4. Check cookies
  console.log('\n4. Cookies:');
  const cookies = document.cookie.split(';').map(c => c.trim().split('=')[0]);
  const facebookCookies = cookies.filter(name => name.includes('fb'));
  console.log(`   - Facebook cookies (${facebookCookies.length}):`, facebookCookies);

  // 5. Check URL state
  console.log('\n5. URL State:');
  if (window.location.hash) {
    console.log('   - Hash:', window.location.hash);
    if (window.location.hash.includes('access_token') || window.location.hash.includes('error')) {
      console.log('   ⚠️ OAuth state detected in URL hash');
    }
  }

  // 6. Check for conflicts
  console.log('\n6. Potential Conflicts:');
  let conflictCount = 0;

  if (scripts.length > 1) {
    console.log('   ⚠️ Multiple Facebook SDK scripts detected');
    conflictCount++;
  }

  if (sessionStorageKeys.length > 0) {
    console.log('   ⚠️ Facebook session storage detected');
    conflictCount++;
  }

  const authModals = document.querySelectorAll('[id*="facebook"], [class*="facebook"]');
  if (authModals.length > 0) {
    console.log('   ⚠️ Facebook-related DOM elements detected:', authModals.length);
    conflictCount++;
  }

  if (conflictCount === 0) {
    console.log('   ✅ No obvious conflicts detected');
  }

  console.log('\n=====================================');
  console.log('Debug report complete');
};

/**
 * Test Facebook login status
 */
export const testFacebookLoginStatus = async (): Promise<void> => {
  console.log('🔍 Testing Facebook login status...');
  
  if (!window.FB) {
    console.log('❌ Facebook SDK not loaded');
    return;
  }

  try {
    const response = await new Promise<any>((resolve) => {
      window.FB.getLoginStatus((response: any) => {
        resolve(response);
      });
    });

    console.log('✅ Facebook login status response:', response);
  } catch (error) {
    console.log('❌ Facebook login status error:', error);
  }
};

/**
 * Force clean Facebook state
 */
export const forceCleanFacebookState = (): void => {
  console.log('🧹 Force cleaning Facebook state...');
  
  // Clear storage
  Object.keys(localStorage).forEach(key => {
    if (key.includes('fb') || key.includes('facebook')) {
      localStorage.removeItem(key);
      console.log(`🗑️ Removed localStorage: ${key}`);
    }
  });

  Object.keys(sessionStorage).forEach(key => {
    if (key.includes('fb') || key.includes('facebook')) {
      sessionStorage.removeItem(key);
      console.log(`🗑️ Removed sessionStorage: ${key}`);
    }
  });

  // Clear cookies
  document.cookie.split(";").forEach(cookie => {
    const cookieName = cookie.trim().split('=')[0];
    if (cookieName.includes('fb')) {
      document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
      console.log(`🗑️ Cleared cookie: ${cookieName}`);
    }
  });

  // Remove SDK
  if (window.FB) {
    delete window.FB;
    console.log('🗑️ Removed Facebook SDK object');
  }

  const script = document.getElementById('facebook-jssdk');
  if (script) {
    script.remove();
    console.log('🗑️ Removed Facebook SDK script');
  }

  console.log('✅ Facebook state cleaned');
};

/**
 * Initialize debug utilities on window object for console access
 */
export const initializeDebugUtils = (): void => {
  if (typeof window !== 'undefined') {
    (window as any).debugFacebookAuth = debugFacebookAuth;
    (window as any).testFacebookLoginStatus = testFacebookLoginStatus;
    (window as any).forceCleanFacebookState = forceCleanFacebookState;
    
    console.log('🔧 Facebook debug utilities initialized');
    console.log('   - window.debugFacebookAuth() - Full debug report');
    console.log('   - window.testFacebookLoginStatus() - Test login status');
    console.log('   - window.forceCleanFacebookState() - Force clean state');
  }
};
