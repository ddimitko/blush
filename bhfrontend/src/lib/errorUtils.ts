/**
 * Utility functions for handling API errors in React components
 */

import { AxiosError } from 'axios';

export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: Record<string, any>;
}

export interface ErrorInfo {
  status: number;
  type: 'network' | 'authentication' | 'permission' | 'notFound' | 'conflict' | 'validation' | 'server' | 'unknown';
  message: string;
  details?: any;
  shouldRetry: boolean;
  shouldRedirect: boolean;
  redirectPath?: string;
}

/**
 * Analyzes an API error and returns structured error information
 */
export const analyzeApiError = (error: any): ErrorInfo => {
  // Handle network errors (no response)
  if (!error.response) {
    return {
      status: 0,
      type: 'network',
      message: 'Network error. Please check your internet connection.',
      shouldRetry: true,
      shouldRedirect: false,
    };
  }

  const status = error.response.status;
  const data = error.response.data as ApiErrorResponse;
  const message = data?.message || data?.error || error.message || 'An error occurred';

  switch (status) {
    case 400:
      return {
        status,
        type: 'validation',
        message: message || 'Invalid request. Please check your input.',
        details: data?.details,
        shouldRetry: false,
        shouldRedirect: false,
      };

    case 401:
      return {
        status,
        type: 'authentication',
        message: message || 'Authentication required. Please sign in.',
        shouldRetry: false,
        shouldRedirect: true,
        redirectPath: '/',
      };

    case 403:
      return {
        status,
        type: 'permission',
        message: message || 'You do not have permission to access this resource.',
        shouldRetry: false,
        shouldRedirect: false,
      };

    case 404:
      return {
        status,
        type: 'notFound',
        message: message || 'The requested resource was not found.',
        shouldRetry: false,
        shouldRedirect: false,
      };

    case 409:
      return {
        status,
        type: 'conflict',
        message: message || 'The request conflicts with existing data.',
        details: data?.details,
        shouldRetry: false,
        shouldRedirect: false,
      };

    case 422:
      return {
        status,
        type: 'validation',
        message: message || 'Validation failed. Please check your input.',
        details: data?.details,
        shouldRetry: false,
        shouldRedirect: false,
      };

    case 500:
    case 502:
    case 503:
    case 504:
      return {
        status,
        type: 'server',
        message: message || 'Server error. Please try again later.',
        shouldRetry: true,
        shouldRedirect: false,
      };

    default:
      return {
        status,
        type: 'unknown',
        message: message || 'An unexpected error occurred.',
        shouldRetry: status >= 500,
        shouldRedirect: false,
      };
  }
};

/**
 * Gets user-friendly error message based on error type and context
 */
export const getErrorMessage = (errorInfo: ErrorInfo, context?: string): string => {
  const contextPrefix = context ? `${context}: ` : '';
  
  switch (errorInfo.type) {
    case 'network':
      return `${contextPrefix}Connection problem. Please check your internet connection and try again.`;
    
    case 'authentication':
      return `${contextPrefix}Please sign in to continue.`;
    
    case 'permission':
      return `${contextPrefix}You don't have permission to perform this action.`;
    
    case 'notFound':
      return `${contextPrefix}The requested item was not found.`;
    
    case 'conflict':
      return `${contextPrefix}This action conflicts with existing data. Please refresh and try again.`;
    
    case 'validation':
      return `${contextPrefix}Please check your input and try again.`;
    
    case 'server':
      return `${contextPrefix}Server error. Please try again in a few moments.`;
    
    default:
      return `${contextPrefix}${errorInfo.message}`;
  }
};

/**
 * Determines if an error should trigger a retry
 */
export const shouldRetryError = (error: any): boolean => {
  const errorInfo = analyzeApiError(error);
  return errorInfo.shouldRetry;
};

/**
 * Determines if an error should trigger a redirect
 */
export const shouldRedirectOnError = (error: any): { shouldRedirect: boolean; path?: string } => {
  const errorInfo = analyzeApiError(error);
  return {
    shouldRedirect: errorInfo.shouldRedirect,
    path: errorInfo.redirectPath,
  };
};

/**
 * Gets the appropriate error state variant for ErrorState component
 */
export const getErrorStateVariant = (error: any): 'network' | 'server' | 'unauthorized' | 'forbidden' | 'notFound' | 'conflict' | 'general' => {
  const errorInfo = analyzeApiError(error);
  
  switch (errorInfo.type) {
    case 'network':
      return 'network';
    case 'authentication':
      return 'unauthorized';
    case 'permission':
      return 'forbidden';
    case 'notFound':
      return 'notFound';
    case 'conflict':
      return 'conflict';
    case 'server':
      return 'server';
    default:
      return 'general';
  }
};

/**
 * Extracts validation errors from API response
 */
export const extractValidationErrors = (error: any): Record<string, string> => {
  const errorInfo = analyzeApiError(error);
  
  if (errorInfo.type === 'validation' && errorInfo.details) {
    return errorInfo.details;
  }
  
  return {};
};

/**
 * Checks if error is a specific type
 */
export const isErrorType = (error: any, type: ErrorInfo['type']): boolean => {
  const errorInfo = analyzeApiError(error);
  return errorInfo.type === type;
};

/**
 * React hook for handling API errors consistently
 */
export const useApiErrorHandler = () => {
  const handleError = (error: any, context?: string) => {
    const errorInfo = analyzeApiError(error);
    const message = getErrorMessage(errorInfo, context);
    
    // Log error for debugging
    console.error(`API Error [${errorInfo.status}]:`, {
      type: errorInfo.type,
      message: errorInfo.message,
      context,
      details: errorInfo.details,
    });
    
    return {
      errorInfo,
      message,
      shouldRetry: errorInfo.shouldRetry,
      shouldRedirect: errorInfo.shouldRedirect,
      redirectPath: errorInfo.redirectPath,
      variant: getErrorStateVariant(error),
    };
  };
  
  return { handleError, analyzeApiError, getErrorMessage, getErrorStateVariant };
};
