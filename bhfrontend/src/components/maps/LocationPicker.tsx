import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Search, Target, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useToast } from '../ui/Toast';
import { geocodeAddress } from '../../lib/geolocation';
import { useGoogleMaps } from '../../lib/googleMapsLoader';

interface LocationPickerProps {
  initialLatitude?: number;
  initialLongitude?: number;
  address?: string;
  onLocationChange: (latitude: number, longitude: number) => void;
  className?: string;
  height?: string;
}

declare global {
  interface Window {
    google: any;
  }
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  initialLatitude,
  initialLongitude,
  address = '',
  onLocationChange,
  className = '',
  height = '400px'
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [searchAddress, setSearchAddress] = useState(address);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(
    initialLatitude && initialLongitude ? { lat: initialLatitude, lng: initialLongitude } : null
  );
  const { success, error: showError, loading, dismiss, info } = useToast();

  // Use centralized Google Maps loader
  const { isLoaded: mapsLoaded, isLoading: mapsLoading, error: mapsError } = useGoogleMaps({
    libraries: ['places']
  });

  useEffect(() => {
    if (mapsLoaded) {
      initializeMap();
    }
  }, [mapsLoaded]);



  const initializeMap = () => {
    if (!mapRef.current) return;

    try {
      // Default to a central location if no initial coordinates
      const defaultPosition = currentLocation || { lat: 40.7128, lng: -74.0060 }; // New York

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: defaultPosition,
        zoom: currentLocation ? 15 : 10,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      // Create draggable marker
      if (currentLocation) {
        createMarker(currentLocation);
      }

      // Add click listener to map
      mapInstanceRef.current.addListener('click', (event: any) => {
        const position = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng()
        };
        updateLocation(position);
      });

    } catch (err) {
      console.error('Map initialization error:', err);
      showError('Map Error', 'Failed to initialize map', { duration: 4000 });
    }
  };

  const createMarker = (position: {lat: number, lng: number}) => {
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    markerRef.current = new window.google.maps.Marker({
      position: position,
      map: mapInstanceRef.current,
      draggable: true,
      title: 'Shop Location (Drag to adjust)',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 2C11.6 2 8 5.6 8 10C8 16 16 30 16 30S24 16 24 10C24 5.6 20.4 2 16 2ZM16 13C14.3 13 13 11.7 13 10S14.3 7 16 7S19 8.3 19 10S17.7 13 16 13Z" fill="#BFA054"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(32, 32),
        anchor: new window.google.maps.Point(16, 32)
      }
    });

    // Add drag listener
    markerRef.current.addListener('dragend', (event: any) => {
      const position = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      };
      updateLocation(position);
    });
  };

  const updateLocation = useCallback((position: {lat: number, lng: number}) => {
    setCurrentLocation(position);
    onLocationChange(position.lat, position.lng);
    
    if (!markerRef.current) {
      createMarker(position);
    } else {
      markerRef.current.setPosition(position);
    }

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter(position);
    }
  }, [onLocationChange]);

  const handleGeocodeAddress = async () => {
    if (!searchAddress.trim()) {
      showError('Address Required', 'Please enter an address to search', {
        duration: 4000,
        action: {
          label: 'Use Current Location',
          onClick: getCurrentLocation
        }
      });
      return;
    }

    setIsGeocoding(true);
    const loadingToastId = loading('Searching Location', 'Finding coordinates for your address...');

    try {
      const coordinates = await geocodeAddress(searchAddress);
      const position = {
        lat: coordinates.latitude,
        lng: coordinates.longitude
      };

      updateLocation(position);

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setZoom(15);
      }

      dismiss(loadingToastId);
      success('Location Found', `Successfully found coordinates for "${searchAddress}"`, {
        duration: 4000,
        action: {
          label: 'Fine-tune',
          onClick: () => info('Tip', 'You can drag the marker to adjust the exact location')
        }
      });
    } catch (err) {
      dismiss(loadingToastId);
      showError('Geocoding Failed', 'Could not find coordinates for this address. Please try a more specific address or use the map directly.', {
        duration: 6000,
        action: {
          label: 'Use Current Location',
          onClick: getCurrentLocation
        }
      });
      console.error('Geocoding error:', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      showError('Geolocation Error', 'Geolocation is not supported by this browser', {
        duration: 6000,
        action: {
          label: 'Search Address',
          onClick: () => {
            const addressInput = document.querySelector('input[placeholder*="address"]') as HTMLInputElement;
            if (addressInput) {
              addressInput.focus();
            }
          }
        }
      });
      return;
    }

    const loadingToastId = loading('Getting Location', 'Accessing your current location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        updateLocation(pos);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setZoom(15);
        }

        dismiss(loadingToastId);
        success('Location Found', 'Successfully using your current location', {
          duration: 4000,
          action: {
            label: 'Fine-tune',
            onClick: () => info('Tip', 'You can drag the marker to adjust the exact location')
          }
        });
      },
      (error) => {
        dismiss(loadingToastId);
        let errorMessage = 'Unable to get your current location';
        let actionLabel = 'Search Address';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions and try again.';
            actionLabel = 'Enable Location';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please try searching for an address instead.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again or search for an address.';
            break;
        }

        showError('Location Error', errorMessage, {
          duration: 8000,
          action: {
            label: actionLabel,
            onClick: () => {
              const addressInput = document.querySelector('input[placeholder*="address"]') as HTMLInputElement;
              if (addressInput) {
                addressInput.focus();
              }
            }
          }
        });
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  // Show error state for maps loading error
  const error = mapsError;

  if (error || mapsLoading) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 text-center ${className}`}>
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {mapsLoading ? 'Loading Map...' : 'Map Unavailable'}
        </h3>
        {error && !mapsLoading && (
          <p className="text-gray-600 mb-4">{error}</p>
        )}
        <p className="text-sm text-gray-500">
          {mapsLoading
            ? 'Please wait while we load the interactive map...'
            : 'You can still save your shop information. Location features will be limited.'
          }
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Search Controls */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Enter address to search..."
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleGeocodeAddress()}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGeocodeAddress}
              disabled={isGeocoding}
              className="flex items-center"
            >
              <Search className="w-4 h-4 mr-2" />
              {isGeocoding ? 'Searching...' : 'Search'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={getCurrentLocation}
              className="flex items-center"
            >
              <Target className="w-4 h-4 mr-2" />
              Use Current
            </Button>
          </div>
        </div>
        
        {currentLocation && (
          <div className="mt-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 inline mr-1" />
            Location: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
          </div>
        )}
      </div>

      {/* Map Container */}
      <div 
        ref={mapRef} 
        style={{ height }}
        className="w-full"
      />
      
      {/* Instructions */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          <strong>Instructions:</strong> Click on the map or drag the marker to set your shop's location. 
          You can also search for an address or use your current location.
        </p>
      </div>
    </div>
  );
};

export default LocationPicker;
