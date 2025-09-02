import { useTranslation as useI18nTranslation } from 'react-i18next';
import {
  formatCurrency,
  formatDate,
  formatTime,
  formatRelativeTime,
  formatDuration,
  getCurrentLanguage,
  type SupportedLanguage
} from '../lib/i18n';

/**
 * Enhanced translation hook with additional formatting utilities
 */
export const useTranslation = (namespace?: string) => {
  const { t, i18n } = useI18nTranslation(namespace);
  
  return {
    t,
    i18n,
    
    // Language utilities
    currentLanguage: getCurrentLanguage(),
    isLanguage: (lang: SupportedLanguage) => getCurrentLanguage() === lang,
    
    // Formatting utilities
    formatCurrency: (amount: number, currency?: string) => 
      formatCurrency(amount, currency),
    
    formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => 
      formatDate(date, options),
    
    formatTime: (date: Date | string) => 
      formatTime(date),
    
    formatRelativeTime: (date: Date | string) =>
      formatRelativeTime(date),

    formatDuration: (minutes: number) =>
      formatDuration(minutes),
    
    // Common translation shortcuts
    tCommon: (key: string, options?: any) => t(`common:${key}`, options),
    tAuth: (key: string, options?: any) => t(`auth:${key}`, options),
    tAppointments: (key: string, options?: any) => t(`appointments:${key}`, options),
    tShops: (key: string, options?: any) => t(`shops:${key}`, options),
    tValidation: (key: string, options?: any) => t(`validation:${key}`, options),
    tErrors: (key: string, options?: any) => t(`errors:${key}`, options),
    
    // Status translations
    tStatus: (status: string) => t(`common:status.${status.toLowerCase()}`, status),
    
    // Action translations
    tAction: (action: string) => t(`common:actions.${action.toLowerCase()}`, action),
    
    // Label translations
    tLabel: (label: string) => t(`common:labels.${label.toLowerCase()}`, label),
    
    // Navigation translations
    tNav: (nav: string) => t(`common:navigation.${nav.toLowerCase()}`, nav),
    
    // Time translations
    tTime: (time: string) => t(`common:time.${time.toLowerCase()}`, time),
    
    // Day translations
    tDay: (day: string) => t(`common:days.${day.toLowerCase()}`, day),
    
    // Month translations
    tMonth: (month: string) => t(`common:months.${month.toLowerCase()}`, month),
    
    // Role translations
    tRole: (role: string) => t(`common:roles.${role.toLowerCase()}`, role),
    
    // Message translations
    tMessage: (message: string) => t(`common:messages.${message}`, message),
    
    // Validation error translations
    tValidationError: (field: string, error: string, options?: any) => 
      t(`validation:${field}.${error}`, options) || 
      t(`validation:field.${error}`, { field: t(`common:labels.${field}`, field), ...options }),
    
    // Success message translations
    tSuccess: (action: string, options?: any) => 
      t(`common:success.${action}`, options),
    
    // Error message translations
    tError: (error: string, options?: any) => 
      t(`errors:${error}`, options),
    
    // Pluralization helper
    tPlural: (key: string, count: number, options?: any) => 
      t(key, { count, ...options }),
    
    // Conditional translation (returns key if translation not found)
    tOptional: (key: string, fallback?: string, options?: any) => {
      const translation = t(key, { ...options, defaultValue: null });
      return translation || fallback || key;
    },
    
    // Translation with interpolation
    tInterpolate: (key: string, values: Record<string, any>, options?: any) => 
      t(key, { ...values, ...options }),
    
    // Check if translation exists
    hasTranslation: (key: string, namespace?: string) => {
      const fullKey = namespace ? `${namespace}:${key}` : key;
      return i18n.exists(fullKey);
    },
    
    // Get all translations for a namespace (useful for debugging)
    getNamespaceTranslations: (ns: string) => {
      const store = i18n.getResourceBundle(getCurrentLanguage(), ns);
      return store || {};
    }
  };
};

/**
 * Hook for common translations (shortcut)
 */
export const useCommonTranslation = () => useTranslation('common');

/**
 * Hook for auth translations
 */
export const useAuthTranslation = () => useTranslation('auth');

/**
 * Hook for appointment translations
 */
export const useAppointmentTranslation = () => useTranslation('appointments');

/**
 * Hook for shop translations
 */
export const useShopTranslation = () => useTranslation('shops');

/**
 * Hook for validation translations
 */
export const useValidationTranslation = () => useTranslation('validation');

/**
 * Hook for error translations
 */
export const useErrorTranslation = () => useTranslation('errors');

export default useTranslation;
