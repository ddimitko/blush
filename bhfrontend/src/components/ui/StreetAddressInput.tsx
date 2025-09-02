import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { useToast } from './Toast';

interface AddressSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types: string[];
}

interface StreetAddressInputProps {
  value: string;
  onChange: (address: string) => void;
  onPlaceSelect?: (place: {
    address: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  }) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  countryCode?: string;
  label?: string;
}

export const StreetAddressInput: React.FC<StreetAddressInputProps> = ({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Enter street address",
  error,
  disabled = false,
  required = false,
  className = "",
  countryCode = 'US',
  label = "Street Address"
}) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState(value);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  
  const { error: showError } = useToast();

  // Initialize Google Places services
  useEffect(() => {
    if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
      autocompleteServiceRef.current = new (window as any).google.maps.places.AutocompleteService();

      // Create a dummy div for PlacesService (required by Google Maps API)
      const dummyDiv = document.createElement('div');
      placesServiceRef.current = new (window as any).google.maps.places.PlacesService(dummyDiv);
    }
  }, []);

  // Sync with external value changes
  useEffect(() => {
    if (value !== searchValue) {
      setSearchValue(value);
    }
  }, [value]);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!autocompleteServiceRef.current || !query.trim() || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    try {
      const request = {
        input: query,
        types: ['address'],
        componentRestrictions: { country: countryCode.toLowerCase() },
        fields: ['place_id', 'description', 'structured_formatting']
      };

      autocompleteServiceRef.current.getPlacePredictions(
        request,
        (predictions: any, status: any) => {
          setIsLoading(false);

          if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && predictions) {
            const formattedSuggestions: AddressSuggestion[] = predictions.map((prediction: any) => ({
              placeId: prediction.place_id,
              description: prediction.description,
              mainText: prediction.structured_formatting.main_text,
              secondaryText: prediction.structured_formatting.secondary_text || '',
              types: prediction.types || []
            }));

            setSuggestions(formattedSuggestions);
          } else {
            setSuggestions([]);
            if (status === (window as any).google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
              showError('Rate Limit', 'Too many requests. Please try again in a moment.');
            }
          }
        }
      );
    } catch (error) {
      setIsLoading(false);
      setSuggestions([]);
      console.warn('Address autocomplete error:', error);
    }
  }, [countryCode, showError]);

  const debouncedFetchSuggestions = useCallback((query: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);
  }, [fetchSuggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchValue(newValue);
    onChange(newValue);

    if (newValue.trim().length >= 3) {
      debouncedFetchSuggestions(newValue);
      if (!isOpen) {
        setIsOpen(true);
      }
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const handlePlaceSelect = async (suggestion: AddressSuggestion) => {
    if (!placesServiceRef.current || !onPlaceSelect) {
      // Simple selection without place details
      setSearchValue(suggestion.description);
      onChange(suggestion.description);
      setIsOpen(false);
      setSuggestions([]);
      return;
    }

    try {
      const request = {
        placeId: suggestion.placeId,
        fields: ['address_components', 'formatted_address', 'geometry']
      };

      placesServiceRef.current.getDetails(request, (place: any, status: any) => {
        if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && place) {
          // Parse address components
          const addressComponents = place.address_components || [];
          let streetNumber = '';
          let route = '';
          let city = '';
          let state = '';
          let postalCode = '';
          let country = '';

          addressComponents.forEach((component: any) => {
            const types = component.types;
            if (types.includes('street_number')) {
              streetNumber = component.long_name;
            } else if (types.includes('route')) {
              route = component.long_name;
            } else if (types.includes('locality')) {
              city = component.long_name;
            } else if (types.includes('administrative_area_level_1')) {
              state = component.short_name;
            } else if (types.includes('postal_code')) {
              postalCode = component.long_name;
            } else if (types.includes('country')) {
              country = component.short_name;
            }
          });

          const fullAddress = `${streetNumber} ${route}`.trim();
          const latitude = place.geometry?.location?.lat();
          const longitude = place.geometry?.location?.lng();

          setSearchValue(fullAddress);
          onChange(fullAddress);

          onPlaceSelect({
            address: fullAddress,
            city,
            state,
            postalCode,
            country,
            latitude,
            longitude
          });
        } else {
          // Fallback to simple selection
          setSearchValue(suggestion.description);
          onChange(suggestion.description);
        }

        setIsOpen(false);
        setSuggestions([]);
      });
    } catch (error) {
      console.warn('Place details error:', error);
      // Fallback to simple selection
      setSearchValue(suggestion.description);
      onChange(suggestion.description);
      setIsOpen(false);
      setSuggestions([]);
    }
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    // Delay closing to allow for suggestion selection
    setTimeout(() => setIsOpen(false), 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSuggestions([]);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const hasGoogleMaps = (window as any).google && (window as any).google.maps && (window as any).google.maps.places;

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            autoComplete="off"
            className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 ${
              error ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-accent-500 border-t-transparent rounded-full animate-spin"></div>
            ) : hasGoogleMaps ? (
              <MapPin className="w-4 h-4 text-gray-400" />
            ) : (
              <Navigation className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>

        {/* Suggestions dropdown */}
        {isOpen && !disabled && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div
                key={`${suggestion.placeId}-${index}`}
                onClick={() => handlePlaceSelect(suggestion)}
                className="px-3 py-3 hover:bg-accent-50 cursor-pointer transition-colors duration-150 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-start space-x-3">
                  <MapPin className="w-4 h-4 text-accent-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {suggestion.mainText}
                    </p>
                    {suggestion.secondaryText && (
                      <p className="text-xs text-gray-500 truncate">
                        {suggestion.secondaryText}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Google Maps fallback message */}
        {!hasGoogleMaps && searchValue.length >= 3 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
            <p className="text-sm text-gray-500 text-center">
              Enable Google Maps for address suggestions
            </p>
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default StreetAddressInput;
