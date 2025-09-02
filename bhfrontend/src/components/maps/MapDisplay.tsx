import React, { useEffect, useRef, useState } from 'react';
import { MapPin, ExternalLink, Navigation } from 'lucide-react';
import { Shop } from '../../types';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';
import { useGoogleMaps } from '../../lib/googleMapsLoader';

interface MapDisplayProps {
  shop: Shop;
  height?: string;
  showDirections?: boolean;
  className?: string;
}

declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

const MapDisplay: React.FC<MapDisplayProps> = ({
  shop,
  height = '400px',
  showDirections = true,
  className = ''
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const { error: showError, success } = useToast();

  // Use centralized Google Maps loader
  const { isLoaded: mapsLoaded, isLoading: mapsLoading, error: mapsError } = useGoogleMaps({
    libraries: ['places']
  });

  const hasValidCoordinates = shop.latitude && shop.longitude;

  useEffect(() => {
    if (mapsLoaded && hasValidCoordinates) {
      initializeMap();
    }
  }, [mapsLoaded, hasValidCoordinates]);



  const initializeMap = () => {
    if (!mapRef.current || !hasValidCoordinates) return;

    try {
      const position = {
        lat: shop.latitude!,
        lng: shop.longitude!
      };

      // Create map
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: position,
        zoom: 15,
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

      // Create custom marker element
      const markerElement = document.createElement('div');
      markerElement.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 2C11.6 2 8 5.6 8 10C8 16 16 30 16 30S24 16 24 10C24 5.6 20.4 2 16 2ZM16 13C14.3 13 13 11.7 13 10S14.3 7 16 7S19 8.3 19 10S17.7 13 16 13Z" fill="#BFA054"/>
        </svg>
      `;
      markerElement.style.cursor = 'pointer';

      // Use AdvancedMarkerElement if available, fallback to Marker
      if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement) {
        markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
          position: position,
          map: mapInstanceRef.current,
          title: shop.name,
          content: markerElement
        });
      } else {
        // Fallback to legacy Marker
        markerRef.current = new window.google.maps.Marker({
          position: position,
          map: mapInstanceRef.current,
          title: shop.name,
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
      }

      // Create info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; max-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #333;">${shop.name}</h3>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #666; line-height: 1.4;">${shop.address}</p>
            <p style="margin: 0; font-size: 14px; color: #666;">${shop.city}${shop.state ? `, ${shop.state}` : ''}</p>
          </div>
        `
      });

      // Show info window on marker click
      markerRef.current.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, markerRef.current);
      });

    } catch (err) {
      console.error('Map initialization error:', err);
      showError('Map Error', 'Failed to initialize map', { duration: 4000 });
    }
  };

  const openInGoogleMaps = () => {
    if (!hasValidCoordinates) {
      showError('Location Error', 'Shop coordinates not available', {
        duration: 4000,
        action: {
          label: 'Contact Shop',
          onClick: () => window.open(`tel:${shop.phone}`, '_self')
        }
      });
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${shop.latitude},${shop.longitude}`;
    window.open(url, '_blank');

    // Show success feedback
    success('Opening Google Maps', 'Redirecting to Google Maps for navigation', {
      duration: 3000
    });
  };

  const getDirections = () => {
    if (!hasValidCoordinates) {
      showError('Location Error', 'Shop coordinates not available', {
        duration: 4000,
        action: {
          label: 'Contact Shop',
          onClick: () => window.open(`tel:${shop.phone}`, '_self')
        }
      });
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`;
    window.open(url, '_blank');

    // Show success feedback
    success('Getting Directions', 'Opening turn-by-turn navigation', {
      duration: 3000
    });
  };

  // Show error state for maps loading error or missing coordinates
  const error = mapsError || (!hasValidCoordinates ? 'Shop location coordinates not available' : null);

  if (error || mapsLoading) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 text-center ${className}`}>
        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {mapsLoading ? 'Loading Map...' : 'Location Information'}
        </h3>
        <p className="text-gray-600 mb-4">{shop.address}</p>
        <p className="text-gray-600 mb-4">{shop.city}{shop.state ? `, ${shop.state}` : ''}, {shop.country}</p>
        {error && !mapsLoading && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}
        {hasValidCoordinates && showDirections && (
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={openInGoogleMaps}
              className="flex items-center"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View on Google Maps
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={getDirections}
              className="flex items-center"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Get Directions
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Map Container */}
      <div 
        ref={mapRef} 
        style={{ height }}
        className="w-full"
      />
      
      {/* Map Controls */}
      {mapsLoaded && showDirections && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openInGoogleMaps}
              className="flex items-center justify-center"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View on Google Maps
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={getDirections}
              className="flex items-center justify-center"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Get Directions
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapDisplay;
