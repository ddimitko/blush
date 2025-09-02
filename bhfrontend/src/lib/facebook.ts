// Facebook SDK Integration
declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

interface FacebookLoginResponse {
  authResponse: {
    accessToken: string;
    expiresIn: number;
    signedRequest: string;
    userID: string;
  } | null;
  status: 'connected' | 'not_authorized' | 'unknown';
}

interface FacebookUser {
  id: string;
  name: string;
  email: string;
  first_name: string;
  last_name: string;
  picture: {
    data: {
      url: string;
    };
  };
  error?: any;
}

class FacebookSDK {
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private readonly INIT_TIMEOUT = 15000; // 15 seconds
  private readonly LOGIN_TIMEOUT = 30000; // 30 seconds
  private static instance: FacebookSDK | null = null;
  private appId: string | null = null;

  // Supported Facebook SDK versions (starting with most stable, then latest)
  private readonly SUPPORTED_VERSIONS = ['v20.0', 'v19.0', 'v21.0', 'v22.0', 'v23.0', 'v18.0'];
  private currentVersion = 'v20.0';

  async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    // Check if Facebook App ID is configured
    const appId = process.env.REACT_APP_FACEBOOK_APP_ID;
    if (!appId || appId === 'your_facebook_app_id_here' || appId.length < 10) {
      throw new Error('Facebook App ID not configured. Please set REACT_APP_FACEBOOK_APP_ID in your environment variables.');
    }

    // Store app ID for consistency checks
    this.appId = appId;

    this.initPromise = new Promise((resolve, reject) => {
      // Set up timeout for initialization
      const timeoutId = setTimeout(() => {
        console.error('Facebook SDK initialization timeout');
        reject(new Error('Facebook SDK initialization timed out. Please check your internet connection and try again.'));
      }, this.INIT_TIMEOUT);

      // Check if FB SDK is already loaded and initialized
      if (window.FB && this.isSDKProperlyInitialized()) {
        clearTimeout(timeoutId);
        console.log('Facebook SDK already initialized, reusing existing instance');
        this.isInitialized = true;
        resolve();
        return;
      }

      // If FB exists but not properly initialized, reinitialize
      if (window.FB) {
        console.log('Facebook SDK exists but not properly initialized, reinitializing...');
        this.initializeFB(appId, resolve, reject, timeoutId);
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.getElementById('facebook-jssdk');
      if (existingScript) {
        console.log('Facebook SDK script already exists, waiting for initialization...');
        // Script exists but FB not ready yet, wait for fbAsyncInit
        this.setupFbAsyncInit(appId, resolve, reject, timeoutId);
        return;
      }

      // Load Facebook SDK
      this.setupFbAsyncInit(appId, resolve, reject, timeoutId);

      // Load the SDK script
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';

      script.onerror = () => {
        clearTimeout(timeoutId);
        console.error('Failed to load Facebook SDK script');
        reject(new Error('Failed to load Facebook SDK. Please check your internet connection and try again.'));
      };

      script.onload = () => {
        console.log('Facebook SDK script loaded successfully');
      };

      const firstScript = document.getElementsByTagName('script')[0];
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
      } else {
        document.head.appendChild(script);
      }
    });

    return this.initPromise;
  }

  private setupFbAsyncInit(appId: string, resolve: () => void, reject: (error: Error) => void, timeoutId: NodeJS.Timeout): void {
    // Preserve any existing fbAsyncInit to avoid conflicts
    const originalFbAsyncInit = window.fbAsyncInit;

    window.fbAsyncInit = () => {
      try {
        // Call original fbAsyncInit if it exists (from other libraries)
        if (originalFbAsyncInit && typeof originalFbAsyncInit === 'function') {
          console.log('Calling original fbAsyncInit...');
          originalFbAsyncInit();
        }

        this.initializeFB(appId, resolve, reject, timeoutId);
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Facebook SDK initialization error:', error);
        reject(new Error(`Facebook SDK initialization failed: ${error}`));
      }
    };
  }

  private isSDKProperlyInitialized(): boolean {
    if (!window.FB) return false;

    try {
      // Check if FB.getLoginStatus is available (indicates proper initialization)
      return typeof window.FB.getLoginStatus === 'function' &&
             typeof window.FB.login === 'function' &&
             typeof window.FB.api === 'function';
    } catch (error) {
      console.warn('Error checking Facebook SDK initialization:', error);
      return false;
    }
  }

  private initializeFB(appId: string, resolve: () => void, reject: (error: Error) => void, timeoutId: NodeJS.Timeout): void {
    console.log('Initializing Facebook SDK with App ID:', appId);

    if (!window.FB) {
      clearTimeout(timeoutId);
      reject(new Error('Facebook SDK not available after script load'));
      return;
    }

    try {
      // Always force a fresh initialization to avoid version conflicts
      console.log('Forcing fresh Facebook SDK initialization to avoid version conflicts...');

      // Clear any existing FB state that might have old version info
      if (window.FB._state) {
        delete window.FB._state;
      }

      // Try to initialize with the current version
      this.initializeWithVersion(appId, resolve, reject, timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Facebook SDK init() call failed:', error);
      reject(new Error(`Facebook SDK initialization failed: ${error}`));
    }
  }

  private initializeWithVersion(appId: string, resolve: () => void, reject: (error: Error) => void, timeoutId: NodeJS.Timeout, versionIndex = 0): void {
    if (versionIndex >= this.SUPPORTED_VERSIONS.length) {
      clearTimeout(timeoutId);
      reject(new Error('Facebook SDK initialization failed: No supported version found'));
      return;
    }

    const version = this.SUPPORTED_VERSIONS[versionIndex];
    this.currentVersion = version;

    console.log('Attempting Facebook SDK initialization with version:', version);

    // Create a wrapper to catch initialization errors
    const tryInitialization = () => {
      try {
        // Clear any existing initialization state
        if (window.FB && window.FB._state) {
          console.log('Clearing existing Facebook SDK state...');
          delete window.FB._state;
        }

        // Initialize with specific configuration to avoid conflicts
        window.FB.init({
          appId: appId,
          cookie: true,
          xfbml: false, // Disable XFBML to prevent conflicts
          version: version,
          status: false, // Don't automatically check login status
          frictionlessRequests: false // Disable frictionless requests
        });

        console.log('Facebook SDK init() call completed with version:', version);
        return true;
      } catch (initError) {
        console.warn(`Facebook SDK init() failed for version ${version}:`, initError);

        // Check if this is a version-related error
        if (initError && typeof initError === 'object' && 'message' in initError) {
          const errorMessage = (initError as Error).message;
          if (errorMessage.includes('version') || errorMessage.includes('init not called') || errorMessage.includes('valid version')) {
            console.log(`Version ${version} not supported, will try next version...`);
            return false; // Try next version
          }
        }

        // For non-version errors, throw to fail immediately
        throw initError;
      }
    };

    // Try the initialization
    const initSuccess = tryInitialization();
    if (!initSuccess) {
      // Version not supported, try next one
      this.initializeWithVersion(appId, resolve, reject, timeoutId, versionIndex + 1);
      return;
    }

    // Set up timeout for getLoginStatus call
    const statusTimeoutId = setTimeout(() => {
      console.warn(`Facebook SDK verification timed out for version ${version}, trying next version...`);
      this.initializeWithVersion(appId, resolve, reject, timeoutId, versionIndex + 1);
    }, 2000); // Shorter timeout for version testing

    // Verify initialization worked with a simple status check
    try {
      window.FB.getLoginStatus((response: any) => {
        clearTimeout(statusTimeoutId);

        if (response && typeof response.status === 'string') {
          clearTimeout(timeoutId);
          this.isInitialized = true;
          console.log('Facebook SDK initialized successfully with version:', version, { status: response.status });
          resolve();
        } else {
          console.warn(`Invalid Facebook SDK response for version ${version}, trying next version...`);
          this.initializeWithVersion(appId, resolve, reject, timeoutId, versionIndex + 1);
        }
      }, { force: false }); // Don't force a server round-trip
    } catch (statusError) {
      clearTimeout(statusTimeoutId);
      console.warn(`Facebook SDK getLoginStatus failed for version ${version}:`, statusError);

      // Check if this is a version-related error
      if (statusError && typeof statusError === 'object' && 'message' in statusError) {
        const errorMessage = (statusError as Error).message;
        if (errorMessage.includes('version') || errorMessage.includes('init not called') || errorMessage.includes('valid version')) {
          console.log(`Version ${version} not supported (getLoginStatus error), trying next version...`);
          this.initializeWithVersion(appId, resolve, reject, timeoutId, versionIndex + 1);
          return;
        }
      }

      // For non-version errors, fail immediately
      clearTimeout(timeoutId);
      reject(new Error(`Facebook SDK verification failed: ${statusError}`));
    }
  }

  async login(): Promise<{ accessToken: string; userInfo: FacebookUser }> {
    try {
      console.log('🔵 Starting Facebook login process...');

      // Clear any existing Facebook session conflicts first
      await this.clearSessionConflicts();

      // Try initialization first
      try {
        await this.init();
      } catch (initError: any) {
        // If we get a version error, force a complete reset and retry
        if (initError.message && (initError.message.includes('version') || initError.message.includes('init not called'))) {
          console.log('🔄 Version error detected, forcing complete reset and retry...');
          this.reset();
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for cleanup
          await this.init();
        } else {
          throw initError;
        }
      }

      // Double check that FB is available and initialized
      if (!window.FB) {
        throw new Error('Facebook SDK not loaded');
      }

      // Check current login status and clear if needed
      await this.ensureCleanLoginState();

      return new Promise((resolve, reject) => {
        // Set up timeout for login process
        const timeoutId = setTimeout(() => {
          console.error('Facebook login timeout');
          reject(new Error('Facebook login timed out. Please try again.'));
        }, this.LOGIN_TIMEOUT);

        console.log('🔵 Calling FB.login with clean state...');
        window.FB.login((response: FacebookLoginResponse) => {
          console.log('🔵 FB.login response:', response);

          if (response.status === 'connected' && response.authResponse) {
            const accessToken = response.authResponse.accessToken;
            console.log('✅ Facebook login successful, getting user info...');

            // Set up timeout for user info API call
            const userInfoTimeoutId = setTimeout(() => {
              clearTimeout(timeoutId);
              console.error('Facebook user info API timeout');
              reject(new Error('Failed to get user information from Facebook (timeout)'));
            }, 10000); // 10 seconds for user info

            // Get user information using access token directly to avoid conflicts
            window.FB.api('/me', {
              fields: 'id,name,email,first_name,last_name,picture',
              access_token: accessToken // Pass access token directly
            }, (userInfo: FacebookUser) => {
              clearTimeout(timeoutId);
              clearTimeout(userInfoTimeoutId);

              console.log('✅ Facebook user info response:', userInfo);

              if (userInfo && !userInfo.error) {
                console.log('Facebook login completed successfully');
                resolve({ accessToken, userInfo });
              } else {
                console.error('Facebook user info error:', userInfo?.error);
                reject(new Error('Failed to get user information from Facebook'));
              }
            });
          } else if (response.status === 'not_authorized') {
            clearTimeout(timeoutId);
            console.log('Facebook login not authorized');
            reject(new Error('Facebook login was not authorized. Please grant permission to continue.'));
          } else if (response.status === 'unknown') {
            clearTimeout(timeoutId);
            console.log('Facebook login cancelled or failed');
            reject(new Error('Facebook login was cancelled or failed. Please try again.'));
          } else {
            clearTimeout(timeoutId);
            console.log('Facebook login failed with status:', response.status);
            reject(new Error('Facebook login failed. Please try again.'));
          }
        }, {
          scope: 'email,public_profile',
          return_scopes: true,
          auth_type: 'rerequest' // Force fresh authorization to avoid conflicts
        });
      });
    } catch (error) {
      console.error('Facebook login initialization error:', error);
      throw new Error(`Facebook login failed: ${error}`);
    }
  }

  async getLoginStatus(): Promise<FacebookLoginResponse> {
    await this.init();

    return new Promise((resolve) => {
      window.FB.getLoginStatus((response: FacebookLoginResponse) => {
        resolve(response);
      });
    });
  }

  async logout(): Promise<void> {
    await this.init();

    return new Promise((resolve) => {
      window.FB.logout(() => {
        resolve();
      });
    });
  }

  async getUserInfo(accessToken: string): Promise<FacebookUser> {
    await this.init();

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Facebook user info request timed out'));
      }, 10000);

      window.FB.api('/me',
        {
          fields: 'id,name,email,first_name,last_name,picture',
          access_token: accessToken
        },
        (response: FacebookUser) => {
          clearTimeout(timeoutId);
          if (response && !response.error) {
            resolve(response);
          } else {
            reject(new Error('Failed to get user information'));
          }
        }
      );
    });
  }

  /**
   * Clear session conflicts that might interfere with login
   */
  private async clearSessionConflicts(): Promise<void> {
    console.log('🧹 Clearing Facebook session conflicts...');

    try {
      // Clear any existing Facebook session storage that might conflict
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('fb') || key.includes('facebook')) {
          sessionStorage.removeItem(key);
          console.log(`🗑️ Removed session storage: ${key}`);
        }
      });

      // Clear any problematic local storage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('fb') && key !== 'fbsr_892690056358950') {
          // Keep the main Facebook session but clear others
          localStorage.removeItem(key);
          console.log(`🗑️ Removed local storage: ${key}`);
        }
      });

      // Clear any stale Facebook cookies except essential ones
      document.cookie.split(";").forEach(function(c) {
        const cookieName = c.trim().split('=')[0];
        if (cookieName.startsWith('fb') && !cookieName.includes('fbsr_') && !cookieName.includes('fbm_')) {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
          console.log(`🗑️ Cleared cookie: ${cookieName}`);
        }
      });

    } catch (error) {
      console.warn('⚠️ Error clearing session conflicts:', error);
    }
  }

  /**
   * Ensure clean login state before attempting login
   */
  private async ensureCleanLoginState(): Promise<void> {
    console.log('🔍 Ensuring clean Facebook login state...');

    try {
      // Check current login status
      const currentStatus = await new Promise<FacebookLoginResponse>((resolve) => {
        window.FB.getLoginStatus((response: FacebookLoginResponse) => {
          resolve(response);
        }, { force: false }); // Don't force server round-trip
      });

      console.log('🔍 Current Facebook status:', currentStatus.status);

      // If user is connected but we want a fresh login, logout first
      if (currentStatus.status === 'connected') {
        console.log('🚪 Logging out existing Facebook session for fresh login...');
        await new Promise<void>((resolve) => {
          window.FB.logout(() => {
            console.log('✅ Facebook session cleared');
            resolve();
          });
        });
      }
    } catch (error) {
      console.warn('⚠️ Error ensuring clean login state:', error);
      // Continue anyway - this is not critical
    }
  }

  /**
   * Reset the Facebook SDK state - useful for recovering from stuck states
   */
  reset(): void {
    console.log('🔄 Resetting Facebook SDK state...');
    this.isInitialized = false;
    this.initPromise = null;
    this.appId = null;
    this.currentVersion = 'v20.0'; // Reset to default

    // Remove existing script if present
    const existingScript = document.getElementById('facebook-jssdk');
    if (existingScript) {
      existingScript.remove();
    }

    // Clear FB object completely and aggressively
    if (window.FB) {
      try {
        // Try to logout any existing session to clean up access tokens
        if (typeof window.FB.logout === 'function') {
          window.FB.logout(() => {
            console.log('Facebook session cleared during reset');
          });
        }

        // Clear internal state that might contain version info
        if (window.FB._state) {
          delete window.FB._state;
        }

        // Clear any cached data
        if (window.FB._domain) {
          delete window.FB._domain;
        }

      } catch (error) {
        console.warn('Error during Facebook cleanup in reset:', error);
      }

      // Completely remove FB object
      delete window.FB;
    }

    // Clear fbAsyncInit
    if (window.fbAsyncInit) {
      delete window.fbAsyncInit;
    }

    // Clear any Facebook-related cookies that might contain version info
    try {
      document.cookie.split(";").forEach(function(c) {
        if (c.trim().startsWith('fb')) {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        }
      });
    } catch (error) {
      console.warn('Error clearing Facebook cookies:', error);
    }

    console.log('✅ Facebook SDK state reset complete');
  }

  /**
   * Get singleton instance
   */
  static getInstance(): FacebookSDK {
    if (!FacebookSDK.instance) {
      FacebookSDK.instance = new FacebookSDK();
    }
    return FacebookSDK.instance;
  }

  /**
   * Force initialization with a specific version (for testing)
   */
  async forceInitWithVersion(version: string): Promise<void> {
    console.log(`Force initializing Facebook SDK with version: ${version}`);
    this.reset();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Temporarily override supported versions
    const originalVersions = [...this.SUPPORTED_VERSIONS];
    (this as any).SUPPORTED_VERSIONS = [version];

    try {
      await this.init();
      console.log(`Successfully initialized with version: ${version}`);
    } catch (error) {
      console.error(`Failed to initialize with version ${version}:`, error);
      // Restore original versions
      (this as any).SUPPORTED_VERSIONS = originalVersions;
      throw error;
    }

    // Restore original versions
    (this as any).SUPPORTED_VERSIONS = originalVersions;
  }

  /**
   * Check if Facebook SDK is properly initialized
   */
  isReady(): boolean {
    return this.isInitialized && !!window.FB;
  }

  /**
   * Check if Facebook is blocked (by ad blockers, network restrictions, etc.)
   */
  async checkFacebookAvailability(): Promise<{ available: boolean; reason?: string }> {
    try {
      // Check if we can reach Facebook's domain
      const response = await fetch('https://connect.facebook.net/en_US/sdk.js', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });

      return { available: true };
    } catch (error) {
      console.warn('Facebook SDK may be blocked:', error);
      return {
        available: false,
        reason: 'Facebook may be blocked by your network, ad blocker, or privacy settings'
      };
    }
  }

  /**
   * Get detailed status information for debugging
   */
  getDebugInfo(): any {
    return {
      isInitialized: this.isInitialized,
      fbExists: !!window.FB,
      scriptExists: !!document.getElementById('facebook-jssdk'),
      appId: process.env.REACT_APP_FACEBOOK_APP_ID?.substring(0, 6) + '...',
      currentVersion: this.currentVersion,
      supportedVersions: this.SUPPORTED_VERSIONS,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance to prevent conflicts
export const facebookSDK = FacebookSDK.getInstance();
export default facebookSDK;
