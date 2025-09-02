import DOMPurify from 'dompurify';

/**
 * Input validation and sanitization utilities
 */

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation (international format)
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

// Password validation
export const isValidPassword = (password: string): boolean => {
  // At least 8 characters, one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Name validation (no special characters except spaces, hyphens, apostrophes)
export const isValidName = (name: string): boolean => {
  const nameRegex = /^[a-zA-Z\s\-']{1,50}$/;
  return nameRegex.test(name);
};

// URL validation
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Sanitize HTML content
export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
};

// Sanitize text input (remove HTML tags and dangerous characters)
export const sanitizeText = (text: string): string => {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"&]/g, '') // Remove dangerous characters
    .trim();
};

// Validate and sanitize search query
export const sanitizeSearchQuery = (query: string): string => {
  return query
    .replace(/[<>'"&]/g, '') // Remove dangerous characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 100); // Limit length
};

// Validate file upload
export const isValidImageFile = (file: File): boolean => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  return allowedTypes.includes(file.type) && file.size <= maxSize;
};

// Validate appointment date (must be in the future)
export const isValidAppointmentDate = (date: string): boolean => {
  const appointmentDate = new Date(date);
  const now = new Date();
  return appointmentDate > now;
};

// Validate time slot format (HH:MM)
export const isValidTimeSlot = (time: string): boolean => {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

// Validate price (positive number with up to 2 decimal places)
export const isValidPrice = (price: string | number): boolean => {
  const priceNum = typeof price === 'string' ? parseFloat(price) : price;
  return !isNaN(priceNum) && priceNum >= 0 && priceNum <= 10000;
};

// Validate duration (positive integer in minutes)
export const isValidDuration = (duration: string | number): boolean => {
  const durationNum = typeof duration === 'string' ? parseInt(duration) : duration;
  return Number.isInteger(durationNum) && durationNum > 0 && durationNum <= 480; // Max 8 hours
};

// Rate limiting for API calls
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (key: string, maxRequests: number = 10, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
};

// Address validation with minimum length requirements
export const isValidAddress = (address: string): boolean => {
  return address.trim().length >= 5;
};

// City validation with minimum length requirements
export const isValidCity = (city: string): boolean => {
  return city.trim().length >= 2;
};

// Postal code validation with country-specific patterns
export const isValidPostalCode = (postalCode: string, countryCode: string): boolean => {
  if (!postalCode.trim()) return false;

  const patterns: { [key: string]: string } = {
    'US': '^[0-9]{5}(-[0-9]{4})?$',
    'CA': '^[A-Za-z][0-9][A-Za-z] [0-9][A-Za-z][0-9]$',
    'GB': '^[A-Za-z]{1,2}[0-9Rr][0-9A-Za-z]? [0-9][ABD-HJLNP-UW-Zabd-hjlnp-uw-z]{2}$',
    'DE': '^[0-9]{5}$',
    'FR': '^[0-9]{5}$',
    'BG': '^[0-9]{4}$',
    'AU': '^[0-9]{4}$',
    'IT': '^[0-9]{5}$',
    'ES': '^[0-9]{5}$',
    'NL': '^[0-9]{4} [A-Z]{2}$',
    'BE': '^[0-9]{4}$',
    'AT': '^[0-9]{4}$',
    'CH': '^[0-9]{4}$',
    'SE': '^[0-9]{3} [0-9]{2}$',
    'NO': '^[0-9]{4}$',
    'DK': '^[0-9]{4}$',
    'FI': '^[0-9]{5}$'
  };

  const pattern = patterns[countryCode.toUpperCase()];
  if (!pattern) return true; // Allow any format for unsupported countries

  const regex = new RegExp(pattern);
  return regex.test(postalCode.trim());
};

// Get postal code label for country
export const getPostalCodeLabel = (countryCode: string): string => {
  const labels: { [key: string]: string } = {
    'US': 'ZIP Code',
    'CA': 'Postal Code',
    'GB': 'Postcode',
    'DE': 'Postleitzahl',
    'FR': 'Code Postal',
    'BG': 'Postal Code',
    'AU': 'Postcode',
    'IT': 'CAP',
    'ES': 'Código Postal',
    'NL': 'Postcode',
    'BE': 'Postcode',
    'AT': 'Postleitzahl',
    'CH': 'Postleitzahl',
    'SE': 'Postnummer',
    'NO': 'Postnummer',
    'DK': 'Postnummer',
    'FI': 'Postinumero'
  };

  return labels[countryCode.toUpperCase()] || 'Postal Code';
};

// Get postal code placeholder for country
export const getPostalCodePlaceholder = (countryCode: string): string => {
  const placeholders: { [key: string]: string } = {
    'US': '12345 or 12345-6789',
    'CA': 'A1A 1A1',
    'GB': 'SW1A 1AA',
    'DE': '10115',
    'FR': '75001',
    'BG': '1000',
    'AU': '2000',
    'IT': '00118',
    'ES': '28001',
    'NL': '1012 AB',
    'BE': '1000',
    'AT': '1010',
    'CH': '8001',
    'SE': '123 45',
    'NO': '0001',
    'DK': '1000',
    'FI': '00100'
  };

  return placeholders[countryCode.toUpperCase()] || 'Enter postal code';
};

// Check if state/province is required for country
export const isStateRequired = (countryCode: string): boolean => {
  const stateRequiredCountries = ['US', 'CA', 'AU'];
  return stateRequiredCountries.includes(countryCode.toUpperCase());
};

// Get state/province label for country
export const getStateLabel = (countryCode: string): string => {
  const labels: { [key: string]: string } = {
    'US': 'State',
    'CA': 'Province',
    'AU': 'State',
    'GB': 'County',
    'DE': 'State',
    'FR': 'Region',
    'BG': 'Region'
  };

  return labels[countryCode.toUpperCase()] || 'State/Province';
};

// Validation error messages
export const getValidationError = (field: string, value: string): string | null => {
  switch (field) {
    case 'email':
      if (!value) return 'Email is required';
      if (!isValidEmail(value)) return 'Please enter a valid email address';
      break;
    case 'password':
      if (!value) return 'Password is required';
      if (!isValidPassword(value)) return 'Password must be at least 8 characters with uppercase, lowercase, and number';
      break;
    case 'firstName':
    case 'lastName':
      if (!value) return `${field === 'firstName' ? 'First' : 'Last'} name is required`;
      if (!isValidName(value)) return 'Name can only contain letters, spaces, hyphens, and apostrophes';
      break;
    case 'phone':
      if (!value) return 'Phone number is required';
      if (!isValidPhone(value)) return 'Please enter a valid phone number';
      break;
    default:
      return null;
  }
  return null;
};
