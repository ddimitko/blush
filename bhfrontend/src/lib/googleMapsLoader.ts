/**
 * Centralized Google Maps API loader to prevent multiple script loads
 * and handle proper async loading with error handling
 */

interface GoogleMapsLoaderOptions {
  libraries?: string[];
  language?: string;
  region?: string;
}

class GoogleMapsLoader {
  private static instance: GoogleMapsLoader;
  private loadPromise: Promise<void> | null = null;
  private isLoaded = false;
  private isLoading = false;

  private constructor() {}

  static getInstance(): GoogleMapsLoader {
    if (!GoogleMapsLoader.instance) {
      GoogleMapsLoader.instance = new GoogleMapsLoader();
    }
    return GoogleMapsLoader.instance;
  }

  /**
   * Load Google Maps API with proper async loading and error handling
   */
  async load(options: GoogleMapsLoaderOptions = {}): Promise<void> {
    // Return immediately if already loaded
    if (this.isLoaded && window.google && window.google.maps) {
      return Promise.resolve();
    }

    // Return existing promise if already loading
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    // Check API key
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      throw new Error('Google Maps API key not configured. Please set REACT_APP_GOOGLE_MAPS_API_KEY in your environment variables.');
    }

    this.isLoading = true;
    this.loadPromise = this.loadScript(apiKey, options);
    
    try {
      await this.loadPromise;
      this.isLoaded = true;
      this.isLoading = false;
    } catch (error) {
      this.isLoading = false;
      this.loadPromise = null;
      throw error;
    }
  }

  private loadScript(apiKey: string, options: GoogleMapsLoaderOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        // Script exists, check if Google Maps is available
        if (window.google && window.google.maps) {
          resolve();
          return;
        }
        
        // Script exists but not loaded yet, wait for it
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Failed to load existing Google Maps script')));
        return;
      }

      // Create new script element
      const script = document.createElement('script');
      
      // Build URL with proper parameters
      const params = new URLSearchParams({
        key: apiKey,
        loading: 'async',
        callback: '__googleMapsCallback'
      });

      if (options.libraries && options.libraries.length > 0) {
        params.append('libraries', options.libraries.join(','));
      }

      if (options.language) {
        params.append('language', options.language);
      }

      if (options.region) {
        params.append('region', options.region);
      }

      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.async = true;
      script.defer = true;

      // Set up global callback
      (window as any).__googleMapsCallback = () => {
        delete (window as any).__googleMapsCallback;
        resolve();
      };

      script.onerror = () => {
        delete (window as any).__googleMapsCallback;
        document.head.removeChild(script);
        reject(new Error('Failed to load Google Maps JavaScript API. Please check your API key and billing settings.'));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Check if Google Maps is loaded and available
   */
  isGoogleMapsLoaded(): boolean {
    return this.isLoaded && !!(window.google && window.google.maps);
  }

  /**
   * Get the current loading status
   */
  getLoadingStatus(): { isLoaded: boolean; isLoading: boolean } {
    return {
      isLoaded: this.isLoaded,
      isLoading: this.isLoading
    };
  }

  /**
   * Reset the loader state (useful for testing)
   */
  reset(): void {
    this.isLoaded = false;
    this.isLoading = false;
    this.loadPromise = null;
  }
}

// Export singleton instance
export const googleMapsLoader = GoogleMapsLoader.getInstance();

// Convenience function for loading with common options
export const loadGoogleMaps = (options?: GoogleMapsLoaderOptions) => {
  return googleMapsLoader.load({
    libraries: ['places', 'geometry'],
    ...options
  });
};

// Hook for React components
export const useGoogleMaps = (options?: GoogleMapsLoaderOptions) => {
  const [isLoaded, setIsLoaded] = React.useState(googleMapsLoader.isGoogleMapsLoaded());
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const loadMaps = async () => {
      if (googleMapsLoader.isGoogleMapsLoaded()) {
        setIsLoaded(true);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        await googleMapsLoader.load(options);
        if (mounted) {
          setIsLoaded(true);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load Google Maps');
          setIsLoading(false);
        }
      }
    };

    loadMaps();

    return () => {
      mounted = false;
    };
  }, []);

  return { isLoaded, isLoading, error };
};

// Add React import for the hook
import React from 'react';
