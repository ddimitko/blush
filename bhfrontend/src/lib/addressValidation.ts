import { 
  isValidAddress, 
  isValidCity, 
  isValidPostalCode, 
  getPostalCodeLabel, 
  getPostalCodePlaceholder,
  isStateRequired,
  getStateLabel 
} from './validation';

export interface AddressValidationErrors {
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface AddressData {
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

/**
 * Validates address data with country-specific rules
 */
export const validateAddress = (data: AddressData): AddressValidationErrors => {
  const errors: AddressValidationErrors = {};

  // Address validation
  if (!data.address.trim()) {
    errors.address = 'Address is required';
  } else if (!isValidAddress(data.address)) {
    errors.address = 'Please enter a complete address (minimum 5 characters)';
  }

  // City validation
  if (!data.city.trim()) {
    errors.city = 'City is required';
  } else if (!isValidCity(data.city)) {
    errors.city = 'City name must be at least 2 characters long';
  }

  // Country validation
  if (!data.country.trim()) {
    errors.country = 'Country is required';
  }

  // State validation (country-specific)
  if (data.country && isStateRequired(data.country)) {
    if (!data.state.trim()) {
      errors.state = `${getStateLabel(data.country)} is required`;
    }
  }

  // Postal code validation (country-specific)
  if (!data.postalCode.trim()) {
    errors.postalCode = `${getPostalCodeLabel(data.country)} is required`;
  } else if (data.country && !isValidPostalCode(data.postalCode, data.country)) {
    errors.postalCode = `Please enter a valid ${getPostalCodeLabel(data.country).toLowerCase()} (e.g., ${getPostalCodePlaceholder(data.country)})`;
  }

  return errors;
};

/**
 * Checks if address data is valid
 */
export const isAddressValid = (data: AddressData): boolean => {
  const errors = validateAddress(data);
  return Object.keys(errors).length === 0;
};

/**
 * Gets country-specific address configuration
 */
export const getAddressConfig = (countryCode: string) => {
  return {
    postalCodeLabel: getPostalCodeLabel(countryCode),
    postalCodePlaceholder: getPostalCodePlaceholder(countryCode),
    stateLabel: getStateLabel(countryCode),
    stateRequired: isStateRequired(countryCode)
  };
};

/**
 * React Hook Form validation rules for address fields
 */
export const getAddressValidationRules = (countryCode: string) => {
  const config = getAddressConfig(countryCode);
  
  return {
    address: {
      required: 'Address is required',
      validate: (value: string) => {
        if (!isValidAddress(value)) {
          return 'Please enter a complete address (minimum 5 characters)';
        }
        return true;
      }
    },
    city: {
      required: 'City is required',
      validate: (value: string) => {
        if (!isValidCity(value)) {
          return 'City name must be at least 2 characters long';
        }
        return true;
      }
    },
    state: config.stateRequired ? {
      required: `${config.stateLabel} is required`
    } : {},
    postalCode: {
      required: `${config.postalCodeLabel} is required`,
      validate: (value: string) => {
        if (!isValidPostalCode(value, countryCode)) {
          return `Please enter a valid ${config.postalCodeLabel.toLowerCase()} (e.g., ${config.postalCodePlaceholder})`;
        }
        return true;
      }
    },
    country: {
      required: 'Country is required'
    }
  };
};
