import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Search, MapPin, Globe } from 'lucide-react';
import { 
  COUNTRIES, 
  getStatesByCountry, 
  getCitiesByCountry, 
  getCitiesByState,
  searchCities,
  Country,
  State,
  City
} from '../../lib/locationData';

interface CountryDropdownProps {
  value: string;
  onChange: (countryCode: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export const CountryDropdown: React.FC<CountryDropdownProps> = ({
  value,
  onChange,
  error,
  disabled = false,
  placeholder = "Select country",
  required = false,
  className = ""
}) => {
  return (
    <div className={className}>
      <label className="block text-sm font-semibold text-gray-900 mb-2">
        Country {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 appearance-none bg-white ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        >
          <option value="">{placeholder}</option>
          {COUNTRIES.map(country => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <Globe className="w-4 h-4 text-gray-400" />
        </div>
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

interface StateDropdownProps {
  countryCode: string;
  value: string;
  onChange: (stateCode: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export const StateDropdown: React.FC<StateDropdownProps> = ({
  countryCode,
  value,
  onChange,
  error,
  disabled = false,
  placeholder,
  required = false,
  className = ""
}) => {
  const states = useMemo(() => getStatesByCountry(countryCode), [countryCode]);
  const country = useMemo(() => COUNTRIES.find(c => c.code === countryCode), [countryCode]);
  
  const stateLabel = country?.stateLabel || 'State';
  const defaultPlaceholder = `Select ${stateLabel.toLowerCase()}`;
  
  if (!country?.hasStates) {
    return null;
  }

  return (
    <div className={className}>
      <label className="block text-sm font-semibold text-gray-900 mb-2">
        {stateLabel} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || states.length === 0}
          className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 appearance-none bg-white ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${disabled || states.length === 0 ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        >
          <option value="">{placeholder || defaultPlaceholder}</option>
          {states.map(state => (
            <option key={state.code} value={state.code}>
              {state.name}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

interface CityDropdownProps {
  countryCode: string;
  stateCode?: string;
  value: string;
  onChange: (cityName: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  className?: string;
  allowCustomInput?: boolean;
}

export const CityDropdown: React.FC<CityDropdownProps> = ({
  countryCode,
  stateCode,
  value,
  onChange,
  error,
  disabled = false,
  placeholder = "Select or type city",
  required = false,
  className = "",
  allowCustomInput = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);

  const cities = useMemo(() => {
    if (stateCode) {
      return getCitiesByState(countryCode, stateCode);
    }
    return getCitiesByCountry(countryCode);
  }, [countryCode, stateCode]);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const results = searchCities(searchTerm, countryCode, stateCode);
      setFilteredCities(results);
    } else {
      setFilteredCities(cities.slice(0, 10)); // Show first 10 cities when no search
    }
  }, [searchTerm, countryCode, stateCode, cities]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);

    // Only update the actual value if custom input is allowed
    if (allowCustomInput) {
      onChange(newValue);
    }

    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleCitySelect = (cityName: string) => {
    setSearchTerm(cityName);
    onChange(cityName);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Only allow Enter if there's an exact match or custom input is allowed
      const exactMatch = filteredCities.find(city =>
        city.name.toLowerCase() === searchTerm.toLowerCase()
      );

      if (exactMatch) {
        handleCitySelect(exactMatch.name);
      } else if (allowCustomInput && searchTerm.trim()) {
        handleCitySelect(searchTerm.trim());
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      // Reset to current value if custom input not allowed
      if (!allowCustomInput) {
        setSearchTerm(value);
      }
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputBlur = () => {
    // Delay closing to allow for city selection
    setTimeout(() => setIsOpen(false), 200);
  };

  return (
    <div className={className}>
      <label className="block text-sm font-semibold text-gray-900 mb-2">
        City {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            disabled={disabled}
            placeholder={placeholder}
            autoComplete="off"
            className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 ${
              error ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <MapPin className="w-4 h-4 text-gray-400" />
          </div>
        </div>
        
        {isOpen && !disabled && filteredCities.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredCities.map((city, index) => (
              <div
                key={`${city.name}-${city.stateCode}-${index}`}
                onClick={() => handleCitySelect(city.name)}
                className="px-3 py-2 hover:bg-accent-50 cursor-pointer flex items-center justify-between transition-colors duration-150"
              >
                <span className="text-gray-900">{city.name}</span>
                {city.stateCode && (
                  <span className="text-sm text-gray-500">{city.stateCode}</span>
                )}
              </div>
            ))}
            {allowCustomInput && searchTerm && !filteredCities.some(city =>
              city.name.toLowerCase() === searchTerm.toLowerCase()
            ) && (
              <div
                onClick={() => handleCitySelect(searchTerm)}
                className="px-3 py-2 hover:bg-accent-50 cursor-pointer border-t border-gray-200 text-accent-600 transition-colors duration-150"
              >
                Use "{searchTerm}"
              </div>
            )}
          </div>
        )}

        {/* No results message when search doesn't match and custom input not allowed */}
        {isOpen && !disabled && searchTerm && filteredCities.length === 0 && !allowCustomInput && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
            <p className="text-sm text-gray-500 text-center">
              No cities found matching "{searchTerm}". Please select from available options.
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

interface LocationDropdownsProps {
  country: string;
  state: string;
  city: string;
  onCountryChange: (countryCode: string) => void;
  onStateChange: (stateCode: string) => void;
  onCityChange: (cityName: string) => void;
  errors?: {
    country?: string;
    state?: string;
    city?: string;
  };
  disabled?: boolean;
  required?: {
    country?: boolean;
    state?: boolean;
    city?: boolean;
  };
  allowCustomInput?: boolean;
  className?: string;
}

export const LocationDropdowns: React.FC<LocationDropdownsProps> = ({
  country,
  state,
  city,
  onCountryChange,
  onStateChange,
  onCityChange,
  errors = {},
  disabled = false,
  required = {},
  allowCustomInput = true,
  className = ""
}) => {
  const handleCountryChange = (countryCode: string) => {
    onCountryChange(countryCode);
    // Clear state and city when country changes
    onStateChange('');
    onCityChange('');
  };

  const handleStateChange = (stateCode: string) => {
    onStateChange(stateCode);
    // Clear city when state changes
    onCityChange('');
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
      <CountryDropdown
        value={country}
        onChange={handleCountryChange}
        error={errors.country}
        disabled={disabled}
        required={required.country}
      />
      
      <StateDropdown
        countryCode={country}
        value={state}
        onChange={handleStateChange}
        error={errors.state}
        disabled={disabled}
        required={required.state}
      />
      
      <CityDropdown
        countryCode={country}
        stateCode={state}
        value={city}
        onChange={onCityChange}
        error={errors.city}
        disabled={disabled}
        required={required.city}
        allowCustomInput={allowCustomInput}
      />
    </div>
  );
};
