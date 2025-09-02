import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AppointmentResponse, Appointment, Employee, Service, Shop, User } from '../types';
import { getCurrencyForCountry as getCountryCurrency, getLocaleForCountry as getCountryLocale } from './countryConfig';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Country to currency mapping
const COUNTRY_CURRENCY_MAP: { [key: string]: string } = {
  'US': 'USD', 'CA': 'CAD', 'GB': 'GBP', 'DE': 'EUR', 'FR': 'EUR',
  'IT': 'EUR', 'ES': 'EUR', 'NL': 'EUR', 'BE': 'EUR', 'AT': 'EUR',
  'PT': 'EUR', 'IE': 'EUR', 'FI': 'EUR', 'GR': 'EUR', 'LU': 'EUR',
  'AU': 'AUD', 'NZ': 'NZD', 'JP': 'JPY', 'KR': 'KRW', 'CN': 'CNY',
  'IN': 'INR', 'BR': 'BRL', 'MX': 'MXN', 'AR': 'ARS', 'CL': 'CLP',
  'CH': 'CHF', 'NO': 'NOK', 'SE': 'SEK', 'DK': 'DKK', 'IS': 'ISK',
  'PL': 'PLN', 'CZ': 'CZK', 'HU': 'HUF', 'RO': 'RON', 'BG': 'BGN',
  'HR': 'HRK', 'RS': 'RSD', 'TR': 'TRY', 'RU': 'RUB', 'UA': 'UAH',
  'ZA': 'ZAR', 'EG': 'EGP', 'MA': 'MAD'
};

// Country to locale mapping for proper number formatting
const COUNTRY_LOCALE_MAP: { [key: string]: string } = {
  'US': 'en-US', 'CA': 'en-CA', 'GB': 'en-GB', 'AU': 'en-AU', 'NZ': 'en-NZ',
  'DE': 'de-DE', 'FR': 'fr-FR', 'IT': 'it-IT', 'ES': 'es-ES', 'NL': 'nl-NL',
  'BE': 'nl-BE', 'AT': 'de-AT', 'PT': 'pt-PT', 'IE': 'en-IE', 'FI': 'fi-FI',
  'GR': 'el-GR', 'LU': 'fr-LU', 'JP': 'ja-JP', 'KR': 'ko-KR', 'CN': 'zh-CN',
  'IN': 'en-IN', 'BR': 'pt-BR', 'MX': 'es-MX', 'AR': 'es-AR', 'CL': 'es-CL',
  'CH': 'de-CH', 'NO': 'nb-NO', 'SE': 'sv-SE', 'DK': 'da-DK', 'IS': 'is-IS',
  'PL': 'pl-PL', 'CZ': 'cs-CZ', 'HU': 'hu-HU', 'RO': 'ro-RO', 'BG': 'bg-BG',
  'HR': 'hr-HR', 'RS': 'sr-RS', 'TR': 'tr-TR', 'RU': 'ru-RU', 'UA': 'uk-UA',
  'ZA': 'en-ZA', 'EG': 'ar-EG', 'MA': 'ar-MA'
};

export function getCurrencyForCountry(country: string): string {
  return getCountryCurrency(country);
}

export function getLocaleForCountry(country: string): string {
  return getCountryLocale(country);
}

export function formatCurrency(amount: number, country?: string, currency?: string): string {
  // Handle edge cases
  if (typeof amount !== 'number' || isNaN(amount)) {
    amount = 0;
  }

  const finalCurrency = currency || getCurrencyForCountry(country || 'US');
  const locale = getLocaleForCountry(country || 'US');

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: finalCurrency.toUpperCase(),
    }).format(amount); // Amount is in regular units, not cents
  } catch (error) {
    // Fallback to USD if currency formatting fails
    console.warn(`Currency formatting failed for ${finalCurrency} in ${country}:`, error);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }
}

// ===== TIMEZONE UTILITIES =====

/**
 * Parse a UTC datetime string and return a Date object in local timezone
 * Backend sends all datetimes in UTC format (ISO 8601 with 'Z' suffix)
 */
export function parseUTCDateTime(utcDateTimeString: string | null | undefined): Date {
  if (!utcDateTimeString) {
    throw new Error('Cannot parse null or undefined datetime string');
  }

  // Handle different UTC formats from backend
  let utcString = utcDateTimeString.trim();

  // If the string doesn't end with 'Z', assume it's UTC and add 'Z'
  if (!utcString.endsWith('Z') && !utcString.includes('+') && !utcString.includes('-')) {
    utcString = `${utcString}Z`;
  }

  const date = new Date(utcString);

  // Validate the parsed date
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid datetime string: ${utcDateTimeString}`);
  }

  return date;
}

/**
 * Convert a local Date object to UTC string for sending to backend
 * Backend expects ISO 8601 format with 'Z' suffix
 */
export function toUTCString(localDate: Date): string {
  if (!(localDate instanceof Date) || isNaN(localDate.getTime())) {
    throw new Error('Invalid Date object provided');
  }
  return localDate.toISOString();
}

/**
 * Convert a local date and time to UTC datetime string for backend
 * @param date - Date string in YYYY-MM-DD format
 * @param time - Time string in HH:mm format
 * @returns UTC datetime string in ISO 8601 format
 */
export function localDateTimeToUTC(date: string, time: string): string {
  const [hours, minutes] = time.split(':').map(num => parseInt(num, 10));

  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error(`Invalid time format: ${time}`);
  }

  const localDateTime = new Date(date);
  localDateTime.setHours(hours, minutes, 0, 0);

  return toUTCString(localDateTime);
}

/**
 * Convert a UTC time string (like "04:30:00") to local time for display
 * This is used for schedule times that are stored as UTC in the backend
 */
export function utcTimeToLocal(utcTimeString: string): string {
  const timeParts = utcTimeString.split(':');
  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) {
    return utcTimeString; // Return original if parsing fails
  }

  // Create a date in UTC with the given time
  const utcDate = new Date();
  utcDate.setUTCHours(hours, minutes, 0, 0);

  // Return the local time representation
  return utcDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Convert local time string to UTC time string
 * @param localTimeString - Time string in HH:mm format (local time)
 * @returns Time string in HH:mm format (UTC time)
 */
export function localTimeToUTC(localTimeString: string): string {
  const [hours, minutes] = localTimeString.split(':').map(num => parseInt(num, 10));

  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error(`Invalid time format: ${localTimeString}`);
  }

  const localDate = new Date();
  localDate.setHours(hours, minutes, 0, 0);

  return `${localDate.getUTCHours().toString().padStart(2, '0')}:${localDate.getUTCMinutes().toString().padStart(2, '0')}`;
}

/**
 * Get user's timezone offset in minutes
 */
export function getTimezoneOffset(): number {
  return new Date().getTimezoneOffset();
}

/**
 * Get user's timezone identifier (e.g., "America/New_York")
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Convert UTC date to local date string (YYYY-MM-DD)
 */
export function utcDateToLocalDateString(utcDateString: string): string {
  const date = parseUTCDateTime(utcDateString);
  return date.toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD format
}

/**
 * Convert local date string to UTC date string
 */
export function localDateStringToUTC(localDateString: string): string {
  const localDate = new Date(localDateString + 'T00:00:00');
  return localDate.toISOString().split('T')[0];
}

/**
 * Create appointment datetime from date and UTC time slot
 * This is used when the time is already in UTC (from available slots)
 * No timezone conversion is needed since both date and time are already in UTC context
 */
export function createUTCAppointmentDateTime(date: string, utcTime: string): string {
  // Remove any seconds from the time string if present
  const timeWithoutSeconds = utcTime.split(':').slice(0, 2).join(':');

  // Combine date and UTC time directly (no timezone conversion needed)
  return `${date}T${timeWithoutSeconds}:00Z`;
}



/**
 * Check if a UTC datetime is in the past relative to user's local time
 */
export function isUTCDateTimeInPast(utcDateTimeString: string): boolean {
  try {
    const utcDate = parseUTCDateTime(utcDateTimeString);
    return utcDate.getTime() < Date.now();
  } catch {
    return false; // If parsing fails, assume it's not in the past
  }
}

/**
 * Check if a UTC datetime is within the next N hours
 */
export function isUTCDateTimeWithinHours(utcDateTimeString: string, hours: number): boolean {
  try {
    const utcDate = parseUTCDateTime(utcDateTimeString);
    const now = Date.now();
    const hoursInMs = hours * 60 * 60 * 1000;
    return utcDate.getTime() >= now && utcDate.getTime() <= (now + hoursInMs);
  } catch {
    return false;
  }
}

/**
 * Create appointment datetime from date and time strings in user's local timezone
 * Converts to UTC for backend storage
 */
export function createAppointmentDateTime(date: string, time: string): string {
  return localDateTimeToUTC(date, time);
}

// ===== DATE/TIME FORMATTING =====

/**
 * Format a date for display (converts UTC to local timezone)
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) {
    return 'N/A';
  }

  try {
    const d = typeof date === 'string' ? parseUTCDateTime(date) : date;
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Format a time for display (converts UTC to local timezone)
 */
export function formatTime(time: string | Date | null | undefined): string {
  if (!time) {
    return 'N/A';
  }

  try {
    if (typeof time === 'string') {
      if (time.includes(':') && !time.includes('T')) {
        // Handle time string like "04:30:00" or "14:30"
        // These are UTC times from schedule slots, convert to local time
        return utcTimeToLocal(time);
      } else {
        // Handle datetime string - backend sends UTC, convert to local time
        const date = parseUTCDateTime(time);
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      }
    } else {
      // Handle Date object
      return time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
  } catch {
    return 'Invalid Time';
  }
}

/**
 * Format a datetime for display (converts UTC to local timezone)
 */
export function formatDateTime(dateTime: string | Date | null | undefined): string {
  if (!dateTime) {
    return 'N/A';
  }

  try {
    const d = typeof dateTime === 'string' ? parseUTCDateTime(dateTime) : dateTime;
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'Invalid DateTime';
  }
}

/**
 * Format a short date for display (converts UTC to local timezone)
 */
export function formatShortDate(date: string | Date | null | undefined): string {
  if (!date) {
    return 'N/A';
  }

  try {
    const d = typeof date === 'string' ? parseUTCDateTime(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Format time range for display (converts UTC times to local timezone)
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  try {
    const start = formatTime(startTime);
    const end = formatTime(endTime);
    return `${start} - ${end}`;
  } catch {
    return 'Invalid Time Range';
  }
}



/**
 * Get relative time from now (e.g., "in 2 hours", "3 days ago")
 */
export function getTimeFromNow(date: string | Date | null | undefined): string {
  if (!date) {
    return 'N/A';
  }

  try {
    const now = new Date();
    const target = typeof date === 'string' ? parseUTCDateTime(date) : date;
    const diffInMs = target.getTime() - now.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (Math.abs(diffInDays) > 0) {
      return diffInDays > 0
        ? `in ${diffInDays} day${diffInDays > 1 ? 's' : ''}`
        : `${Math.abs(diffInDays)} day${Math.abs(diffInDays) > 1 ? 's' : ''} ago`;
    } else if (Math.abs(diffInHours) > 0) {
      return diffInHours > 0
        ? `in ${diffInHours} hour${diffInHours > 1 ? 's' : ''}`
        : `${Math.abs(diffInHours)} hour${Math.abs(diffInHours) > 1 ? 's' : ''} ago`;
    } else if (Math.abs(diffInMinutes) > 0) {
      return diffInMinutes > 0
        ? `in ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`
        : `${Math.abs(diffInMinutes)} minute${Math.abs(diffInMinutes) > 1 ? 's' : ''} ago`;
    } else {
      return 'now';
    }
  } catch {
    return 'Invalid Date';
  }
}

// ===== NOTIFICATION SPECIFIC FORMATTING =====

/**
 * Format notification timestamp for display in user's local timezone
 * Handles UTC timestamps from backend and converts them properly
 */
export function formatNotificationTime(utcTimestamp: string | null | undefined): string {
  if (!utcTimestamp) {
    return 'N/A';
  }

  try {
    const localDate = parseUTCDateTime(utcTimestamp);
    return localDate.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Format notification timestamp as relative time (e.g., "2 hours ago")
 * Properly handles UTC to local timezone conversion
 */
export function formatNotificationRelativeTime(utcTimestamp: string | null | undefined): string {
  if (!utcTimestamp) {
    return 'N/A';
  }

  try {
    const localDate = parseUTCDateTime(utcTimestamp);
    const now = new Date();
    const diffInMs = now.getTime() - localDate.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);

    if (diffInMinutes < 1) {
      return 'just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    } else if (diffInWeeks < 4) {
      return `${diffInWeeks} week${diffInWeeks === 1 ? '' : 's'} ago`;
    } else if (diffInMonths < 12) {
      return `${diffInMonths} month${diffInMonths === 1 ? '' : 's'} ago`;
    } else {
      // For very old notifications, show the actual date
      return formatNotificationTime(utcTimestamp);
    }
  } catch {
    return 'Invalid Date';
  }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  // Remove all non-digit characters except the leading +
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  // Backend expects: ^\\+?[1-9]\\d{1,14}$
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(cleanPhone);
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function getInitials(firstName: string, lastName: string): string {
  const first = (firstName || '').trim();
  const last = (lastName || '').trim();

  if (!first && !last) return 'U'; // Default to 'U' for User
  if (!first) return last.charAt(0).toUpperCase();
  if (!last) return first.charAt(0).toUpperCase();

  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

// Normalize role by removing ROLE_ prefix if present
export function normalizeRole(role: string): string {
  if (!role) return role;
  return role.replace(/^ROLE_/, '');
}

export function isValidPassword(password: string): boolean {
  // At least 8 characters, one uppercase, one lowercase
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
  return passwordRegex.test(password);
}

export function getPasswordStrength(password: string): {
  score: number;
  feedback: string;
} {
  let score = 0;
  let feedback = '';

  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z\d]/.test(password)) score += 1;

  switch (score) {
    case 0:
    case 1:
      feedback = 'Very weak';
      break;
    case 2:
      feedback = 'Weak';
      break;
    case 3:
      feedback = 'Fair';
      break;
    case 4:
      feedback = 'Good';
      break;
    case 5:
      feedback = 'Strong';
      break;
    default:
      feedback = 'Very weak';
  }

  return { score, feedback };
}

// Business type options for forms
export const businessTypeOptions = [
  { value: 'HAIRDRESSER', label: 'Hairdresser' },
  { value: 'NAIL_STYLIST', label: 'Nail Stylist' },
  { value: 'SPA', label: 'Spa' },
  { value: 'BARBER', label: 'Barber' },
  { value: 'BEAUTY_SALON', label: 'Beauty Salon' },
  { value: 'MASSAGE', label: 'Massage' },
  { value: 'SKINCARE_CLINIC', label: 'Skincare Clinic' },
  { value: 'MAKEUP_ARTIST', label: 'Makeup Artist' },
  { value: 'EYEBROW_THREADING', label: 'Eyebrow Threading' },
  { value: 'TATTOO_PARLOR', label: 'Tattoo Parlor' },
  { value: 'WELLNESS_CENTER', label: 'Wellness Center' },
  { value: 'LASH_EXTENSIONS', label: 'Lash Extensions' },
  { value: 'MICROBLADING', label: 'Microblading' },
  { value: 'PERMANENT_MAKEUP', label: 'Permanent Makeup' },
  { value: 'WAXING_SALON', label: 'Waxing Salon' }
];

export function getBusinessTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    HAIRDRESSER: 'Hairdresser',
    NAIL_STYLIST: 'Nail Stylist',
    SPA: 'Spa',
    BARBER: 'Barber',
    BEAUTY_SALON: 'Beauty Salon',
    MASSAGE: 'Massage',
    SKINCARE_CLINIC: 'Skincare Clinic',
    MAKEUP_ARTIST: 'Makeup Artist',
    EYEBROW_THREADING: 'Eyebrow Threading',
    TATTOO_PARLOR: 'Tattoo Parlor',
    WELLNESS_CENTER: 'Wellness Center',
    LASH_EXTENSIONS: 'Lash Extensions',
    MICROBLADING: 'Microblading',
    PERMANENT_MAKEUP: 'Permanent Makeup',
    WAXING_SALON: 'Waxing Salon',
  };
  return labels[type] || type;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'text-yellow-600 bg-yellow-100',
    CONFIRMED: 'text-blue-600 bg-blue-100',
    IN_PROGRESS: 'text-purple-600 bg-purple-100',
    COMPLETED: 'text-green-600 bg-green-100',
    CANCELLED: 'text-red-600 bg-red-100',
    NO_SHOW: 'text-gray-600 bg-gray-100',
    PAID: 'text-green-600 bg-green-100',
    FAILED: 'text-red-600 bg-red-100',
    REFUNDED: 'text-orange-600 bg-orange-100',
    active: 'text-green-600 bg-green-100',
    trialing: 'text-blue-600 bg-blue-100',
    past_due: 'text-yellow-600 bg-yellow-100',
    canceled: 'text-red-600 bg-red-100',
    incomplete: 'text-gray-600 bg-gray-100',
  };
  return colors[status] || 'text-gray-600 bg-gray-100';
}

export function downloadFile(data: Blob, filename: string): void {
  const url = window.URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
    document.body.removeChild(textArea);
    return Promise.resolve();
  }
}

export function getAvatarUrl(avatar?: string): string {
  if (!avatar) return '';
  if (avatar.startsWith('http')) return avatar;
  return `${process.env.REACT_APP_API_URL || 'http://localhost:8080'}${avatar}`;
}

export function getImageUrl(imagePath?: string): string {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath;
  return `${process.env.REACT_APP_API_URL || 'http://localhost:8080'}${imagePath}`;
}

/**
 * Transforms a backend AppointmentResponse to frontend Appointment format
 */
export function transformAppointmentResponse(response: AppointmentResponse): Appointment {
  // Create nested employee object
  const employee: Employee = {
    id: response.employeeId,
    fullName: response.employeeName,
    email: '', // Not provided in response
    specialties: response.employeeSpecialties || '',
    active: true,
    hireDate: '', // Not provided in response
    shop: {} as Shop, // Will be filled below
    services: [], // Not provided in response
  };

  // Create nested service object
  const service: Service = {
    id: response.serviceId,
    name: response.serviceName,
    description: response.serviceDescription,
    price: response.servicePrice,
    durationMinutes: response.serviceDurationMinutes,
    active: true,
    shop: {} as Shop, // Will be filled below
    employees: [employee],
  };

  // Create nested shop object
  const shop: Shop = {
    id: response.shopId,
    name: response.shopName,
    address: response.shopAddress,
    phone: response.shopPhone,
    country: response.shopCountry,
    active: true,
    businessTypes: [], // Not provided in response
    description: '', // Not provided in response
    city: '', // Not provided in response
    state: '', // Not provided in response
    postalCode: '', // Not provided in response (using postalCode instead of zipCode)
    email: '', // Not provided in response
    website: '', // Not provided in response
    gallery: [], // Not provided in response
    thumbnail: '', // Not provided in response
    ratingAverage: 0, // Not provided in response
    ratingCount: 0, // Not provided in response
    acceptsCardPayments: false, // Not provided in response
    owner: {} as User, // Not provided in response
    createdAt: '', // Not provided in response
    updatedAt: '', // Not provided in response
  };

  // Update references
  employee.shop = shop;
  service.shop = shop;

  // Create customer object if user data is available
  const customer: User | undefined = response.userId ? {
    id: response.userId,
    firstName: response.userName?.split(' ')[0] || '',
    lastName: response.userName?.split(' ').slice(1).join(' ') || '',
    email: response.userEmail || '',
    role: 'USER',
    emailVerified: true,
    onboardingCompleted: false,
    createdAt: '', // Not provided in response
    updatedAt: '', // Not provided in response
  } : undefined;

  // Determine customer information
  const customerName = response.customerName ||
                      response.userName ||
                      (response.guestFirstName && response.guestLastName ?
                        `${response.guestFirstName} ${response.guestLastName}`.trim() :
                        'Guest Customer');

  const customerEmail = response.customerEmail ||
                       response.userEmail ||
                       response.guestEmail ||
                       '';

  const customerPhone = response.customerPhone || response.guestPhone;

  return {
    id: response.id,
    customerName,
    customerEmail,
    customerPhone,
    appointmentDateTime: response.appointmentDateTime,
    endDateTime: response.endDateTime,
    status: response.status,
    totalAmount: response.totalAmount,
    paymentType: response.paymentType,
    paymentStatus: response.paymentStatus,
    notes: response.notes,
    service,
    employee,
    shop,
    customer,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
  };
}


