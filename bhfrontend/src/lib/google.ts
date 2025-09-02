// Google OAuth2 Integration
declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

interface GoogleUser {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

interface GoogleAuthResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token: string;
}

class GoogleSDK {
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private auth2: any = null;

  async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    // Check if Google Client ID is configured
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === 'your_google_client_id_here.apps.googleusercontent.com') {
      throw new Error('Google Client ID not configured. Please set REACT_APP_GOOGLE_CLIENT_ID in your environment variables.');
    }

    this.initPromise = new Promise((resolve, reject) => {
      // Check if Google SDK is already loaded
      if (window.gapi && window.gapi.auth2) {
        this.initializeAuth2().then(resolve).catch(reject);
        return;
      }

      // Load Google SDK
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        window.gapi.load('auth2', () => {
          this.initializeAuth2().then(resolve).catch(reject);
        });
      };

      script.onerror = () => {
        reject(new Error('Failed to load Google SDK'));
      };

      document.head.appendChild(script);
    });

    return this.initPromise;
  }

  private async initializeAuth2(): Promise<void> {
    try {
      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
      this.auth2 = await window.gapi.auth2.init({
        client_id: clientId,
        scope: 'profile email'
      });
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize Google Auth2: ${error}`);
    }
  }

  async login(): Promise<{ accessToken: string; userInfo: GoogleUser }> {
    await this.init();

    try {
      const authInstance = this.auth2;
      const googleUser = await authInstance.signIn();
      const authResponse = googleUser.getAuthResponse();
      const profile = googleUser.getBasicProfile();

      const userInfo: GoogleUser = {
        id: profile.getId(),
        email: profile.getEmail(),
        verified_email: true,
        name: profile.getName(),
        given_name: profile.getGivenName(),
        family_name: profile.getFamilyName(),
        picture: profile.getImageUrl(),
        locale: 'en'
      };

      return {
        accessToken: authResponse.access_token,
        userInfo
      };
    } catch (error) {
      throw new Error('Google login was cancelled or failed');
    }
  }

  async getLoginStatus(): Promise<boolean> {
    await this.init();
    
    try {
      const authInstance = this.auth2;
      return authInstance.isSignedIn.get();
    } catch (error) {
      return false;
    }
  }

  async logout(): Promise<void> {
    await this.init();

    try {
      const authInstance = this.auth2;
      await authInstance.signOut();
    } catch (error) {
      console.error('Google logout failed:', error);
    }
  }

  async getCurrentUser(): Promise<GoogleUser | null> {
    await this.init();

    try {
      const authInstance = this.auth2;
      if (!authInstance.isSignedIn.get()) {
        return null;
      }

      const googleUser = authInstance.currentUser.get();
      const profile = googleUser.getBasicProfile();

      return {
        id: profile.getId(),
        email: profile.getEmail(),
        verified_email: true,
        name: profile.getName(),
        given_name: profile.getGivenName(),
        family_name: profile.getFamilyName(),
        picture: profile.getImageUrl(),
        locale: 'en'
      };
    } catch (error) {
      return null;
    }
  }

  async getUserInfo(accessToken: string): Promise<GoogleUser> {
    try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);
      
      if (!response.ok) {
        throw new Error('Failed to get user information from Google');
      }

      const userInfo: GoogleUser = await response.json();
      return userInfo;
    } catch (error) {
      throw new Error('Failed to get user information from Google');
    }
  }
}

export const googleSDK = new GoogleSDK();
export default googleSDK;
