/**
 * Environment configuration and utilities
 */

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:8080/api',
  WS_URL: process.env.REACT_APP_WS_URL || 'ws://localhost:8080',
  STRIPE_PUBLISHABLE_KEY: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '',
  FACEBOOK_APP_ID: process.env.REACT_APP_FACEBOOK_APP_ID || '',
  GOOGLE_CLIENT_ID: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
} as const;

export const isDevelopment = ENV.NODE_ENV === 'development';
export const isProduction = ENV.NODE_ENV === 'production';

// Feature flags
export const FEATURES = {
  ENABLE_ANALYTICS: isProduction,
  ENABLE_ERROR_REPORTING: isProduction,
  ENABLE_PERFORMANCE_MONITORING: isProduction,
  ENABLE_DEBUG_LOGGING: isDevelopment,
  ENABLE_SERVICE_WORKER: isProduction,
  ENABLE_OFFLINE_SUPPORT: isProduction,
} as const;

// API Configuration
export const API_CONFIG = {
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: isProduction ? 3 : 1,
  RETRY_DELAY: 1000,
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
} as const;

// Performance Configuration
export const PERFORMANCE_CONFIG = {
  LAZY_LOAD_THRESHOLD: '50px',
  IMAGE_QUALITY: isProduction ? 80 : 90,
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 100,
  VIRTUAL_SCROLL_THRESHOLD: 100,
} as const;

// Security Configuration
export const SECURITY_CONFIG = {
  CSP_ENABLED: isProduction,
  HTTPS_ONLY: isProduction,
  SECURE_COOKIES: isProduction,
  RATE_LIMIT_ENABLED: isProduction,
  INPUT_SANITIZATION: true,
} as const;

// Logging Configuration
export const LOGGING_CONFIG = {
  LEVEL: isDevelopment ? 'debug' : 'error',
  CONSOLE_ENABLED: isDevelopment,
  REMOTE_ENABLED: isProduction,
  MAX_LOG_SIZE: 1000,
} as const;

// Validation helpers
export const validateEnvironment = () => {
  const requiredVars = [
    'REACT_APP_API_URL',
    'REACT_APP_STRIPE_PUBLISHABLE_KEY'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate URLs
  try {
    new URL(ENV.API_URL);
    new URL(ENV.WS_URL);
  } catch (error) {
    throw new Error('Invalid URL format in environment variables');
  }

  // Validate Stripe key format
  if (ENV.STRIPE_PUBLISHABLE_KEY && !ENV.STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
    throw new Error('Invalid Stripe publishable key format');
  }
};

// Safe console logging
export const safeLog = {
  debug: (...args: any[]) => {
    if (FEATURES.ENABLE_DEBUG_LOGGING) {
      console.log(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (LOGGING_CONFIG.CONSOLE_ENABLED) {
      console.info(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (LOGGING_CONFIG.CONSOLE_ENABLED) {
      console.warn(...args);
    }
  },
  
  error: (...args: any[]) => {
    console.error(...args);
    
    if (FEATURES.ENABLE_ERROR_REPORTING) {
      // Send to error reporting service in production
      // Implementation would depend on chosen service (Sentry, LogRocket, etc.)
    }
  }
};

// Performance monitoring
export const performanceLog = {
  mark: (name: string) => {
    if (FEATURES.ENABLE_PERFORMANCE_MONITORING && 'performance' in window) {
      performance.mark(name);
    }
  },
  
  measure: (name: string, startMark: string, endMark?: string) => {
    if (FEATURES.ENABLE_PERFORMANCE_MONITORING && 'performance' in window) {
      try {
        performance.measure(name, startMark, endMark);
        const measure = performance.getEntriesByName(name, 'measure')[0];
        
        if (measure && isDevelopment) {
          console.log(`Performance: ${name} took ${measure.duration.toFixed(2)}ms`);
        }
        
        return measure;
      } catch (error) {
        safeLog.warn('Performance measurement failed:', error);
      }
    }
  },
  
  clearMarks: (name?: string) => {
    if (FEATURES.ENABLE_PERFORMANCE_MONITORING && 'performance' in window) {
      performance.clearMarks(name);
    }
  },
  
  clearMeasures: (name?: string) => {
    if (FEATURES.ENABLE_PERFORMANCE_MONITORING && 'performance' in window) {
      performance.clearMeasures(name);
    }
  }
};

// Error boundary helpers
export const errorBoundaryConfig = {
  fallbackComponent: 'ErrorFallback',
  onError: (error: Error, errorInfo: any) => {
    safeLog.error('Error Boundary caught an error:', error, errorInfo);
    
    if (FEATURES.ENABLE_ERROR_REPORTING) {
      // Report to error tracking service
    }
  }
};

// Initialize environment
export const initializeEnvironment = () => {
  try {
    validateEnvironment();
    
    if (isDevelopment) {
      safeLog.debug('Environment initialized:', {
        NODE_ENV: ENV.NODE_ENV,
        API_URL: ENV.API_URL,
        FEATURES,
        PERFORMANCE_CONFIG
      });
    }
    
    return true;
  } catch (error) {
    safeLog.error('Environment initialization failed:', error);
    return false;
  }
};

// Export environment info for debugging
export const getEnvironmentInfo = () => ({
  environment: ENV.NODE_ENV,
  features: FEATURES,
  apiConfig: API_CONFIG,
  performanceConfig: PERFORMANCE_CONFIG,
  securityConfig: SECURITY_CONFIG,
  timestamp: new Date().toISOString()
});
