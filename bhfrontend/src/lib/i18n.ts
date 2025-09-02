import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Import translation files
import enCommon from '../locales/en/common.json';
import enAuth from '../locales/en/auth.json';
import enAppointments from '../locales/en/appointments.json';
import enShops from '../locales/en/shops.json';
import enValidation from '../locales/en/validation.json';
import enErrors from '../locales/en/errors.json';

import bgCommon from '../locales/bg/common.json';
import bgAuth from '../locales/bg/auth.json';
import bgAppointments from '../locales/bg/appointments.json';
import bgShops from '../locales/bg/shops.json';
import bgValidation from '../locales/bg/validation.json';
import bgErrors from '../locales/bg/errors.json';

// Define supported languages
export const SUPPORTED_LANGUAGES = ['en', 'bg'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  bg: 'Български'
};

// Country flags for language selector
export const LANGUAGE_FLAGS: Record<SupportedLanguage, string> = {
  en: '🇺🇸', // US flag for English
  bg: '🇧🇬'  // Bulgarian flag
};

// Translation resources
const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    appointments: enAppointments,
    shops: enShops,
    validation: enValidation,
    errors: enErrors
  },
  bg: {
    common: bgCommon,
    auth: bgAuth,
    appointments: bgAppointments,
    shops: bgShops,
    validation: bgValidation,
    errors: bgErrors
  }
};

// Initialize i18next
i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'auth', 'appointments', 'shops', 'validation', 'errors'],
    
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'lunara-language',
    },
    
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    
    react: {
      useSuspense: false,
    },
  });

export default i18n;

// Utility functions
export const getCurrentLanguage = (): SupportedLanguage => {
  const current = i18n.language;
  return SUPPORTED_LANGUAGES.includes(current as SupportedLanguage) 
    ? (current as SupportedLanguage) 
    : 'en';
};

export const changeLanguage = async (language: SupportedLanguage): Promise<void> => {
  await i18n.changeLanguage(language);
  localStorage.setItem('lunara-language', language);
};

export const isLanguageSupported = (language: string): language is SupportedLanguage => {
  return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage);
};

// Format currency based on locale
export const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  const locale = getCurrentLanguage();
  const localeMap: Record<SupportedLanguage, string> = {
    en: 'en-US',
    bg: 'bg-BG'
  };
  
  return new Intl.NumberFormat(localeMap[locale], {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Format date based on locale
export const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
  const locale = getCurrentLanguage();
  const localeMap: Record<SupportedLanguage, string> = {
    en: 'en-US',
    bg: 'bg-BG'
  };
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat(localeMap[locale], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  }).format(dateObj);
};

// Format time based on locale
export const formatTime = (date: Date | string): string => {
  const locale = getCurrentLanguage();
  const localeMap: Record<SupportedLanguage, string> = {
    en: 'en-US',
    bg: 'bg-BG'
  };
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat(localeMap[locale], {
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj);
};

// Format relative time (e.g., "2 hours ago")
export const formatRelativeTime = (date: Date | string): string => {
  const locale = getCurrentLanguage();
  const localeMap: Record<SupportedLanguage, string> = {
    en: 'en-US',
    bg: 'bg-BG'
  };
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  const rtf = new Intl.RelativeTimeFormat(localeMap[locale], { numeric: 'auto' });
  
  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'second');
  } else if (diffInSeconds < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
  } else if (diffInSeconds < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
  } else {
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
  }
};

// Get localized day names
export const getDayNames = (): string[] => {
  const locale = getCurrentLanguage();
  const localeMap: Record<SupportedLanguage, string> = {
    en: 'en-US',
    bg: 'bg-BG'
  };
  
  const formatter = new Intl.DateTimeFormat(localeMap[locale], { weekday: 'long' });
  const days = [];
  
  // Start from Sunday (0) to Saturday (6)
  for (let i = 0; i < 7; i++) {
    const date = new Date(2024, 0, i); // January 2024 starts on Monday
    days.push(formatter.format(date));
  }
  
  return days;
};

// Get localized month names
export const getMonthNames = (): string[] => {
  const locale = getCurrentLanguage();
  const localeMap: Record<SupportedLanguage, string> = {
    en: 'en-US',
    bg: 'bg-BG'
  };
  
  const formatter = new Intl.DateTimeFormat(localeMap[locale], { month: 'long' });
  const months = [];
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(2024, i, 1);
    months.push(formatter.format(date));
  }
  
  return months;
};

// Format duration in minutes to localized hours and minutes
export const formatDuration = (minutes: number): string => {
  // Get the translation function for the current locale
  const t = (key: string) => {
    const resources = i18n.getResourceBundle(getCurrentLanguage(), 'common');
    const keys = key.split('.');
    let value = resources;
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  if (minutes < 60) {
    // Less than an hour - show only minutes
    const minuteKey = minutes === 1 ? 'duration.minute' : 'duration.minutes';
    return `${minutes} ${t(minuteKey)}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    // Exact hours
    const hourKey = hours === 1 ? 'duration.hour' : 'duration.hours';
    return `${hours} ${t(hourKey)}`;
  } else {
    // Hours and minutes
    const hourKey = hours === 1 ? 'duration.hour' : 'duration.hours';
    const minuteKey = remainingMinutes === 1 ? 'duration.minute' : 'duration.minutes';
    const andText = t('duration.and');
    return `${hours} ${t(hourKey)} ${andText} ${remainingMinutes} ${t(minuteKey)}`;
  }
};
