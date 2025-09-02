import React, { useState, useEffect } from 'react';
import { ChevronDown, Phone } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CountryCode {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  pattern?: RegExp;
  maxLength?: number;
}

const countryCodes: CountryCode[] = [
  { code: 'BG', name: 'Bulgaria', dialCode: '+359', flag: '🇧🇬', pattern: /^[0-9]{8,9}$/, maxLength: 9 },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', pattern: /^[0-9]{10}$/, maxLength: 10 },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', pattern: /^[0-9]{10,11}$/, maxLength: 11 },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪', pattern: /^[0-9]{10,12}$/, maxLength: 12 },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', pattern: /^[0-9]{9,10}$/, maxLength: 10 },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹', pattern: /^[0-9]{9,11}$/, maxLength: 11 },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸', pattern: /^[0-9]{9}$/, maxLength: 9 },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱', pattern: /^[0-9]{9}$/, maxLength: 9 },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', pattern: /^[0-9]{10}$/, maxLength: 10 },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', pattern: /^[0-9]{9}$/, maxLength: 9 },
];

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  value?: string;
  onChange?: (value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  defaultCountry?: string;
  required?: boolean;
  // Support for react-hook-form
  name?: string;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({
    className,
    label,
    error,
    helperText,
    value = '',
    onChange,
    onValidationChange,
    defaultCountry = 'BG',
    required = false,
    placeholder,
    name,
    onBlur,
    ...props
  }, ref) => {
    const [selectedCountry, setSelectedCountry] = useState<CountryCode>(
      countryCodes.find(c => c.code === defaultCountry) || countryCodes[0]
    );
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');

    // Parse initial value
    useEffect(() => {
      if (value) {
        const country = countryCodes.find(c => value.startsWith(c.dialCode));
        if (country) {
          setSelectedCountry(country);
          setPhoneNumber(value.substring(country.dialCode.length));
        } else {
          setPhoneNumber(value);
        }
      }
    }, [value]);

    const validatePhoneNumber = (number: string, country: CountryCode): boolean => {
      if (!number.trim()) return !required;
      
      // Remove any non-digit characters
      const cleanNumber = number.replace(/\D/g, '');
      
      if (country.pattern) {
        return country.pattern.test(cleanNumber);
      }
      
      // Fallback validation: 7-15 digits
      return /^[0-9]{7,15}$/.test(cleanNumber);
    };

    const handlePhoneChange = (newNumber: string) => {
      // Remove any non-digit characters except spaces and dashes for display
      const cleanNumber = newNumber.replace(/[^\d\s-]/g, '');
      
      // Limit length based on country
      if (selectedCountry.maxLength && cleanNumber.replace(/\D/g, '').length > selectedCountry.maxLength) {
        return;
      }
      
      setPhoneNumber(cleanNumber);
      
      const fullNumber = selectedCountry.dialCode + cleanNumber.replace(/\D/g, '');
      const isValid = validatePhoneNumber(cleanNumber, selectedCountry);
      
      onChange?.(fullNumber);
      onValidationChange?.(isValid);
    };

    const handleCountryChange = (country: CountryCode) => {
      setSelectedCountry(country);
      setIsDropdownOpen(false);
      
      const fullNumber = country.dialCode + phoneNumber.replace(/\D/g, '');
      const isValid = validatePhoneNumber(phoneNumber, country);
      
      onChange?.(fullNumber);
      onValidationChange?.(isValid);
    };

    const isValid = validatePhoneNumber(phoneNumber, selectedCountry);

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          <div className="flex">
            {/* Country Code Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={cn(
                  'flex items-center px-3 py-2 border border-r-0 rounded-l-lg bg-gray-50 hover:bg-gray-100 transition-colors',
                  error ? 'border-red-500' : 'border-gray-300',
                  'focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'
                )}
              >
                <span className="mr-1">{selectedCountry.flag}</span>
                <span className="text-sm font-medium">{selectedCountry.dialCode}</span>
                <ChevronDown className="ml-1 h-3 w-3 text-gray-400" />
              </button>

              {/* Dropdown */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {countryCodes.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => handleCountryChange(country)}
                      className="w-full flex items-center px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="mr-2">{country.flag}</span>
                      <span className="flex-1 text-sm">{country.name}</span>
                      <span className="text-sm text-gray-500">{country.dialCode}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Phone Number Input */}
            <div className="flex-1 relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                ref={ref}
                type="tel"
                name={name}
                value={phoneNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onBlur={onBlur}
                placeholder={placeholder || `Enter phone number`}
                className={cn(
                  'w-full pl-10 pr-4 py-2 border rounded-r-lg transition-all duration-200',
                  error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-gray-900',
                  'focus:outline-none focus:ring-2 focus:border-transparent',
                  className
                )}
                {...props}
              />
            </div>
          </div>

          {/* Validation Indicator */}
          {phoneNumber && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {isValid ? (
                <div className="text-green-500">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : (
                <div className="text-red-500">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p className="mt-2 text-sm text-red-600 flex items-center animate-slide-up">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}

        {/* Helper Text */}
        {helperText && !error && (
          <p className="mt-1 text-xs text-gray-500">{helperText}</p>
        )}

        {/* Click outside handler */}
        {isDropdownOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsDropdownOpen(false)}
          />
        )}
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

export default PhoneInput;
