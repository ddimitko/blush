import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Search, Check } from 'lucide-react';
import { LocationDropdowns } from '../ui/LocationDropdowns';
import LocationPicker from '../maps/LocationPicker';
import StreetAddressInput from '../ui/StreetAddressInput';
import { useToast } from '../ui/Toast';
import { geocodeAddressWithFallback, formatAddress, validatePostalCode, getCountryByCode } from '../../lib/locationData';

interface ShopLocationPickerProps {
  // Address fields
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  
  // Coordinates
  latitude?: number;
  longitude?: number;
  
  // Callbacks
  onAddressChange: (address: string) => void;
  onCityChange: (city: string) => void;
  onStateChange: (state: string) => void;
  onPostalCodeChange: (postalCode: string) => void;
  onCountryChange: (country: string) => void;
  onCoordinatesChange: (latitude: number, longitude: number) => void;
  
  // Validation
  errors?: {
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    coordinates?: string;
  };
  
  // Options
  disabled?: boolean;
  required?: {
    address?: boolean;
    city?: boolean;
    state?: boolean;
    postalCode?: boolean;
    country?: boolean;
  };
  className?: string;
}

export const ShopLocationPicker: React.FC<ShopLocationPickerProps> = ({
  address,
  city,
  state,
  postalCode,
  country,
  latitude,
  longitude,
  onAddressChange,
  onCityChange,
  onStateChange,
  onPostalCodeChange,
  onCountryChange,
  onCoordinatesChange,
  errors = {},
  disabled = false,
  required = {},
  className = ""
}) => {
  const [useGoogleMaps, setUseGoogleMaps] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const { success, error: showError, loading, dismiss } = useToast();

  const countryData = getCountryByCode(country);
  const hasValidCoordinates = latitude && longitude;

  // Auto-geocode when address components change and Google Maps is not being used
  useEffect(() => {
    if (!useGoogleMaps && address && city && country && !hasValidCoordinates) {
      handleAutoGeocode();
    }
  }, [address, city, state, country, useGoogleMaps]);

  const handleAutoGeocode = async () => {
    if (isGeocoding || !address.trim() || !city.trim() || !country) return;

    setIsGeocoding(true);
    try {
      const coordinates = await geocodeAddressWithFallback(address, city, state, country);
      if (coordinates) {
        onCoordinatesChange(coordinates.latitude, coordinates.longitude);
        success('Location Found', 'Address coordinates have been automatically determined');
      }
    } catch (err) {
      console.warn('Auto-geocoding failed:', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleManualGeocode = async () => {
    if (!address.trim() || !city.trim() || !country) {
      showError('Incomplete Address', 'Please fill in at least the street address, city, and country before geocoding');
      return;
    }

    setIsGeocoding(true);
    const loadingToastId = loading('Finding Location', 'Searching for coordinates...');

    try {
      const coordinates = await geocodeAddressWithFallback(address, city, state, country);
      if (coordinates) {
        onCoordinatesChange(coordinates.latitude, coordinates.longitude);
        dismiss(loadingToastId);
        success('Location Found', 'Address has been successfully geocoded');
      } else {
        dismiss(loadingToastId);
        showError('Geocoding Failed', 'Could not find coordinates for this address. Please check the address or use Google Maps.');
      }
    } catch (err) {
      dismiss(loadingToastId);
      showError('Geocoding Error', 'An error occurred while finding the location. Please try again.');
      console.error('Geocoding error:', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleLocationChange = (lat: number, lng: number) => {
    onCoordinatesChange(lat, lng);
  };

  const handleGoogleMapsToggle = (enabled: boolean) => {
    setUseGoogleMaps(enabled);
    if (!enabled && hasValidCoordinates) {
      // Keep existing coordinates when disabling Google Maps
      success('Google Maps Disabled', 'Your current location coordinates have been preserved');
    }
  };

  const isPostalCodeValid = postalCode ? validatePostalCode(postalCode, country) : true;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Google Maps Option */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MapPin className="w-5 h-5 text-accent-600" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Use Google Maps for Precise Location
              </h3>
              <p className="text-xs text-gray-600">
                Enable interactive map to set your exact shop location
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={useGoogleMaps}
              onChange={(e) => handleGoogleMapsToggle(e.target.checked)}
              disabled={disabled}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-600"></div>
          </label>
        </div>
      </div>

      {/* Address Fields */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Shop Address</h3>
        
        {/* Enhanced Street Address with Suggestions */}
        <StreetAddressInput
          value={address}
          onChange={onAddressChange}
          onPlaceSelect={(place) => {
            // Auto-fill location data when user selects from suggestions
            if (place.address) onAddressChange(place.address);
            if (place.city) onCityChange(place.city);
            if (place.state) onStateChange(place.state);
            if (place.postalCode) onPostalCodeChange(place.postalCode);
            if (place.country) onCountryChange(place.country);
            if (place.latitude && place.longitude) {
              onCoordinatesChange(place.latitude, place.longitude);
              success('Address Selected', 'Location details have been automatically filled');
            }
          }}
          placeholder="123 Main Street"
          error={errors.address}
          disabled={disabled}
          required={required.address}
          countryCode={country}
          label="Street Address"
        />

        {/* Location Dropdowns */}
        <LocationDropdowns
          country={country}
          state={state}
          city={city}
          onCountryChange={onCountryChange}
          onStateChange={onStateChange}
          onCityChange={onCityChange}
          errors={{
            country: errors.country,
            state: errors.state,
            city: errors.city
          }}
          disabled={disabled}
          required={{
            country: required.country,
            state: required.state,
            city: required.city
          }}
          allowCustomInput={false}
        />

        {/* Postal Code */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            {countryData?.postalCodeLabel || 'Postal Code'} {required.postalCode && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            value={postalCode}
            onChange={(e) => onPostalCodeChange(e.target.value)}
            disabled={disabled}
            placeholder={countryData?.postalCodePlaceholder || 'Enter postal code'}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 ${
              errors.postalCode || !isPostalCodeValid ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
          {(errors.postalCode || !isPostalCodeValid) && (
            <p className="mt-1 text-sm text-red-600">
              {errors.postalCode || `Please enter a valid ${countryData?.postalCodeLabel?.toLowerCase() || 'postal code'}`}
            </p>
          )}
        </div>
      </div>

      {/* Location Coordinates */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Location Coordinates</h3>
          {!useGoogleMaps && (
            <button
              type="button"
              onClick={handleManualGeocode}
              disabled={disabled || isGeocoding || !address.trim() || !city.trim() || !country}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-accent-700 bg-accent-50 border border-accent-200 rounded-lg hover:bg-accent-100 focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Search className="w-4 h-4 mr-1.5" />
              {isGeocoding ? 'Finding...' : 'Find Location'}
            </button>
          )}
        </div>

        {useGoogleMaps ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Use the interactive map below to set your shop's precise location. You can search for an address, use your current location, or drag the marker to the exact position.
            </p>
            <LocationPicker
              initialLatitude={latitude}
              initialLongitude={longitude}
              address={formatAddress(address, city, state, postalCode, country)}
              onLocationChange={handleLocationChange}
              height="350px"
            />
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            {hasValidCoordinates ? (
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Location Set</p>
                  <p className="text-xs text-gray-600">
                    Latitude: {latitude?.toFixed(6)}, Longitude: {longitude?.toFixed(6)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Navigation className="w-4 h-4 text-yellow-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Location Needed</p>
                  <p className="text-xs text-gray-600">
                    {isGeocoding 
                      ? 'Finding coordinates for your address...'
                      : 'Complete the address above to automatically find coordinates, or enable Google Maps for precise location setting.'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {errors.coordinates && (
          <p className="text-sm text-red-600">{errors.coordinates}</p>
        )}
      </div>
    </div>
  );
};
