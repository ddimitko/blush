import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  geolocationService, 
  GeolocationResult, 
  GeolocationOptions, 
  GeolocationCoordinates 
} from '../lib/geolocation';
import { useStableEffect } from './useStableEffect';

interface UseGeolocationState {
  location: GeolocationResult | null;
  loading: boolean;
  error: string | null;
  permission: PermissionState | null;
}

interface UseGeolocationReturn extends UseGeolocationState {
  getCurrentLocation: (options?: GeolocationOptions) => Promise<void>;
  watchLocation: (options?: GeolocationOptions) => void;
  stopWatching: () => void;
  clearError: () => void;
  calculateDistanceTo: (coordinates: GeolocationCoordinates) => number | null;
}

/**
 * Hook for managing geolocation functionality
 */
export const useGeolocation = (
  autoRequest: boolean = false,
  options: GeolocationOptions = {}
): UseGeolocationReturn => {
  const [state, setState] = useState<UseGeolocationState>({
    location: null,
    loading: false,
    error: null,
    permission: null
  });

  const watchIdRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Check geolocation permission
  const checkPermission = useCallback(async () => {
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        if (mountedRef.current) {
          setState(prev => ({ ...prev, permission: result.state }));
        }
        
        // Listen for permission changes
        result.addEventListener('change', () => {
          if (mountedRef.current) {
            setState(prev => ({ ...prev, permission: result.state }));
          }
        });
      } catch (error) {
        console.warn('Permission API not supported');
      }
    }
  }, []);

  // Get current location
  const getCurrentLocation = useCallback(async (requestOptions?: GeolocationOptions) => {
    if (!mountedRef.current) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const location = await geolocationService.getCurrentPosition({
        ...options,
        ...requestOptions
      });

      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          location,
          loading: false,
          error: null
        }));
      }
    } catch (error) {
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Location access failed'
        }));
      }
    }
  }, [options]);

  // Watch location changes
  const watchLocation = useCallback((watchOptions?: GeolocationOptions) => {
    if (watchIdRef.current !== null) {
      geolocationService.clearWatch(watchIdRef.current);
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    watchIdRef.current = geolocationService.watchPosition(
      (location) => {
        if (mountedRef.current) {
          setState(prev => ({
            ...prev,
            location,
            loading: false,
            error: null
          }));
        }
      },
      (error) => {
        if (mountedRef.current) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error.message
          }));
        }
      },
      { ...options, ...watchOptions }
    );
  }, [options]);

  // Stop watching location
  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      geolocationService.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    if (mountedRef.current) {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Calculate distance to coordinates
  const calculateDistanceTo = useCallback((coordinates: GeolocationCoordinates): number | null => {
    if (!state.location) return null;
    return geolocationService.calculateDistance(state.location.coordinates, coordinates);
  }, [state.location]);

  // Auto-request location on mount
  useStableEffect(() => {
    checkPermission();

    if (autoRequest) {
      getCurrentLocation();
    }

    return () => {
      mountedRef.current = false;
      if (watchIdRef.current !== null) {
        geolocationService.clearWatch(watchIdRef.current);
      }
    };
  }, [autoRequest, checkPermission, getCurrentLocation]);

  return {
    ...state,
    getCurrentLocation,
    watchLocation,
    stopWatching,
    clearError,
    calculateDistanceTo
  };
};

/**
 * Hook for getting user's current location once
 */
export const useCurrentLocation = (options?: GeolocationOptions) => {
  const { location, loading, error, getCurrentLocation, clearError } = useGeolocation(true, options);

  return {
    location,
    loading,
    error,
    getCurrentLocation,
    refetch: getCurrentLocation,
    clearError
  };
};

/**
 * Hook for watching location changes
 */
export const useLocationWatcher = (options?: GeolocationOptions) => {
  const { 
    location, 
    loading, 
    error, 
    watchLocation, 
    stopWatching, 
    clearError 
  } = useGeolocation(false, options);

  const [isWatching, setIsWatching] = useState(false);

  const startWatching = useCallback(() => {
    watchLocation();
    setIsWatching(true);
  }, [watchLocation]);

  const stopWatchingLocation = useCallback(() => {
    stopWatching();
    setIsWatching(false);
  }, [stopWatching]);

  useEffect(() => {
    return () => {
      if (isWatching) {
        stopWatching();
      }
    };
  }, [isWatching, stopWatching]);

  return {
    location,
    loading,
    error,
    isWatching,
    startWatching,
    stopWatching: stopWatchingLocation,
    clearError
  };
};

/**
 * Hook for distance calculations
 */
export const useDistanceCalculator = () => {
  const calculateDistance = useCallback((
    coord1: GeolocationCoordinates,
    coord2: GeolocationCoordinates
  ): number => {
    return geolocationService.calculateDistance(coord1, coord2);
  }, []);

  const formatDistance = useCallback((distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    } else if (distance < 10) {
      return `${distance.toFixed(1)}km`;
    } else {
      return `${Math.round(distance)}km`;
    }
  }, []);

  return {
    calculateDistance,
    formatDistance
  };
};

/**
 * Hook for address geocoding
 */
export const useGeocoding = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const geocodeAddress = useCallback(async (address: string): Promise<GeolocationCoordinates | null> => {
    setLoading(true);
    setError(null);

    try {
      const coordinates = await geolocationService.geocodeAddress(address);
      setLoading(false);
      return coordinates;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Geocoding failed';
      setError(errorMessage);
      setLoading(false);
      return null;
    }
  }, []);

  const reverseGeocode = useCallback(async (coordinates: GeolocationCoordinates) => {
    setLoading(true);
    setError(null);

    try {
      const address = await geolocationService.reverseGeocode(coordinates);
      setLoading(false);
      return address;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Reverse geocoding failed';
      setError(errorMessage);
      setLoading(false);
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    geocodeAddress,
    reverseGeocode,
    clearError
  };
};
