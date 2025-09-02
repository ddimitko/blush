/**
 * Comprehensive geolocation service for Lunara
 */

export interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
}

export interface GeolocationAddress {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  formattedAddress?: string;
}

export interface GeolocationResult {
  coordinates: GeolocationCoordinates;
  address?: GeolocationAddress;
  timestamp: number;
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  fallbackToIP?: boolean;
  cacheResults?: boolean;
}

class GeolocationService {
  private cache = new Map<string, GeolocationResult>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  /**
   * Get current position using browser geolocation API
   */
  async getCurrentPosition(options: GeolocationOptions = {}): Promise<GeolocationResult> {
    const {
      enableHighAccuracy = true,
      timeout = 10000,
      maximumAge = 5 * 60 * 1000, // 5 minutes
      fallbackToIP = true,
      cacheResults = true
    } = options;

    // Check cache first
    if (cacheResults) {
      const cached = this.getCachedLocation();
      if (cached) {
        return cached;
      }
    }

    try {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      const position = await this.getPositionPromise({
        enableHighAccuracy,
        timeout,
        maximumAge
      });

      const result: GeolocationResult = {
        coordinates: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude || undefined,
          altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
        },
        timestamp: Date.now()
      };

      // Try to get address information
      try {
        result.address = await this.reverseGeocode(result.coordinates);
      } catch (error) {
        console.warn('Reverse geocoding failed:', error);
      }

      // Cache the result
      if (cacheResults) {
        this.cacheLocation(result);
      }

      return result;
    } catch (error) {
      console.error('Geolocation failed:', error);

      // Fallback to IP-based location
      if (fallbackToIP) {
        try {
          return await this.getLocationByIP();
        } catch (ipError) {
          console.error('IP-based location failed:', ipError);
        }
      }

      throw new Error(`Location access failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get location by IP address (fallback method)
   */
  async getLocationByIP(): Promise<GeolocationResult> {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.reason || 'IP location service failed');
      }

      const result: GeolocationResult = {
        coordinates: {
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: 10000 // IP-based location is less accurate
        },
        address: {
          city: data.city,
          state: data.region,
          country: data.country_name,
          postalCode: data.postal,
          formattedAddress: `${data.city}, ${data.region}, ${data.country_name}`
        },
        timestamp: Date.now()
      };

      return result;
    } catch (error) {
      throw new Error(`IP-based location failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(coordinates: GeolocationCoordinates): Promise<GeolocationAddress> {
    try {
      // Try Google Geocoding API first
      if (process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
        return await this.googleReverseGeocode(coordinates);
      }

      // Fallback to OpenStreetMap Nominatim
      return await this.nominatimReverseGeocode(coordinates);
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      throw error;
    }
  }

  /**
   * Forward geocode address to coordinates
   */
  async geocodeAddress(address: string): Promise<GeolocationCoordinates> {
    try {
      // Try Google Geocoding API first
      if (process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
        return await this.googleGeocode(address);
      }

      // Fallback to OpenStreetMap Nominatim
      return await this.nominatimGeocode(address);
    } catch (error) {
      console.error('Geocoding failed:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two coordinates (in kilometers)
   */
  calculateDistance(
    coord1: GeolocationCoordinates,
    coord2: GeolocationCoordinates
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLon = this.toRadians(coord2.longitude - coord1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.latitude)) * 
      Math.cos(this.toRadians(coord2.latitude)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Watch position changes
   */
  watchPosition(
    callback: (result: GeolocationResult) => void,
    errorCallback: (error: Error) => void,
    options: GeolocationOptions = {}
  ): number {
    if (!navigator.geolocation) {
      errorCallback(new Error('Geolocation is not supported'));
      return -1;
    }

    return navigator.geolocation.watchPosition(
      async (position) => {
        try {
          const result: GeolocationResult = {
            coordinates: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude || undefined,
              altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
              heading: position.coords.heading || undefined,
              speed: position.coords.speed || undefined,
            },
            timestamp: Date.now()
          };

          // Try to get address information
          try {
            result.address = await this.reverseGeocode(result.coordinates);
          } catch (error) {
            console.warn('Reverse geocoding failed:', error);
          }

          callback(result);
        } catch (error) {
          errorCallback(error instanceof Error ? error : new Error('Unknown error'));
        }
      },
      (error) => {
        errorCallback(new Error(error.message));
      },
      {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: options.timeout ?? 10000,
        maximumAge: options.maximumAge ?? 5 * 60 * 1000
      }
    );
  }

  /**
   * Clear position watch
   */
  clearWatch(watchId: number): void {
    if (navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  // Private methods

  private getPositionPromise(options: PositionOptions): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  private async googleReverseGeocode(coordinates: GeolocationCoordinates): Promise<GeolocationAddress> {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinates.latitude},${coordinates.longitude}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results.length) {
      throw new Error('Google reverse geocoding failed');
    }

    const result = data.results[0];
    const components = result.address_components;

    return {
      street: this.extractComponent(components, 'route'),
      city: this.extractComponent(components, 'locality') || 
            this.extractComponent(components, 'administrative_area_level_2'),
      state: this.extractComponent(components, 'administrative_area_level_1'),
      country: this.extractComponent(components, 'country'),
      postalCode: this.extractComponent(components, 'postal_code'),
      formattedAddress: result.formatted_address
    };
  }

  private async googleGeocode(address: string): Promise<GeolocationCoordinates> {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results.length) {
      throw new Error('Google geocoding failed');
    }

    const location = data.results[0].geometry.location;
    return {
      latitude: location.lat,
      longitude: location.lng
    };
  }

  private async nominatimReverseGeocode(coordinates: GeolocationCoordinates): Promise<GeolocationAddress> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates.latitude}&lon=${coordinates.longitude}&zoom=18&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Lunara Beauty Booking App'
      }
    });

    const data = await response.json();

    if (!data.address) {
      throw new Error('Nominatim reverse geocoding failed');
    }

    return {
      street: data.address.road,
      city: data.address.city || data.address.town || data.address.village,
      state: data.address.state,
      country: data.address.country,
      postalCode: data.address.postcode,
      formattedAddress: data.display_name
    };
  }

  private async nominatimGeocode(address: string): Promise<GeolocationCoordinates> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Lunara Beauty Booking App'
      }
    });

    const data = await response.json();

    if (!data.length) {
      throw new Error('Nominatim geocoding failed');
    }

    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon)
    };
  }

  private extractComponent(components: any[], type: string): string | undefined {
    const component = components.find(c => c.types.includes(type));
    return component?.long_name;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private getCachedLocation(): GeolocationResult | null {
    const cached = this.cache.get('current');
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached;
    }
    return null;
  }

  private cacheLocation(result: GeolocationResult): void {
    this.cache.set('current', result);
  }
}

// Export singleton instance
export const geolocationService = new GeolocationService();

// Export convenience functions
export const getCurrentLocation = (options?: GeolocationOptions) => 
  geolocationService.getCurrentPosition(options);

export const geocodeAddress = (address: string) => 
  geolocationService.geocodeAddress(address);

export const reverseGeocode = (coordinates: GeolocationCoordinates) => 
  geolocationService.reverseGeocode(coordinates);

export const calculateDistance = (coord1: GeolocationCoordinates, coord2: GeolocationCoordinates) => 
  geolocationService.calculateDistance(coord1, coord2);
