/**
 * Tests for enhanced error handling functionality
 */

import { analyzeApiError, getErrorMessage, getErrorStateVariant, shouldRetryError } from '../errorUtils';

describe('Error Handling', () => {
  describe('analyzeApiError', () => {
    it('should handle network errors (no response)', () => {
      const error = { message: 'Network Error' };
      const result = analyzeApiError(error);
      
      expect(result.status).toBe(0);
      expect(result.type).toBe('network');
      expect(result.shouldRetry).toBe(true);
      expect(result.shouldRedirect).toBe(false);
    });

    it('should handle 400 Bad Request', () => {
      const error = {
        response: {
          status: 400,
          data: { error: 'Validation failed', message: 'Invalid input' }
        }
      };
      const result = analyzeApiError(error);
      
      expect(result.status).toBe(400);
      expect(result.type).toBe('validation');
      expect(result.message).toBe('Invalid input');
      expect(result.shouldRetry).toBe(false);
      expect(result.shouldRedirect).toBe(false);
    });

    it('should handle 401 Unauthorized', () => {
      const error = {
        response: {
          status: 401,
          data: { error: 'Authentication required', message: 'Please sign in' }
        }
      };
      const result = analyzeApiError(error);
      
      expect(result.status).toBe(401);
      expect(result.type).toBe('authentication');
      expect(result.message).toBe('Please sign in');
      expect(result.shouldRetry).toBe(false);
      expect(result.shouldRedirect).toBe(true);
      expect(result.redirectPath).toBe('/');
    });

    it('should handle 403 Forbidden', () => {
      const error = {
        response: {
          status: 403,
          data: { error: 'Access denied', message: 'Insufficient permissions' }
        }
      };
      const result = analyzeApiError(error);
      
      expect(result.status).toBe(403);
      expect(result.type).toBe('permission');
      expect(result.message).toBe('Insufficient permissions');
      expect(result.shouldRetry).toBe(false);
      expect(result.shouldRedirect).toBe(false);
    });

    it('should handle 404 Not Found', () => {
      const error = {
        response: {
          status: 404,
          data: { error: 'Resource not found', message: 'Shop not found' }
        }
      };
      const result = analyzeApiError(error);
      
      expect(result.status).toBe(404);
      expect(result.type).toBe('notFound');
      expect(result.message).toBe('Shop not found');
      expect(result.shouldRetry).toBe(false);
      expect(result.shouldRedirect).toBe(false);
    });

    it('should handle 409 Conflict', () => {
      const error = {
        response: {
          status: 409,
          data: { error: 'Data conflict', message: 'Email already exists' }
        }
      };
      const result = analyzeApiError(error);
      
      expect(result.status).toBe(409);
      expect(result.type).toBe('conflict');
      expect(result.message).toBe('Email already exists');
      expect(result.shouldRetry).toBe(false);
      expect(result.shouldRedirect).toBe(false);
    });

    it('should handle 422 Validation Error', () => {
      const error = {
        response: {
          status: 422,
          data: { 
            error: 'Validation failed', 
            message: 'Form validation failed',
            details: { email: 'Invalid email format' }
          }
        }
      };
      const result = analyzeApiError(error);
      
      expect(result.status).toBe(422);
      expect(result.type).toBe('validation');
      expect(result.message).toBe('Form validation failed');
      expect(result.details).toEqual({ email: 'Invalid email format' });
      expect(result.shouldRetry).toBe(false);
      expect(result.shouldRedirect).toBe(false);
    });

    it('should handle 500 Internal Server Error', () => {
      const error = {
        response: {
          status: 500,
          data: { error: 'Internal server error', message: 'Database connection failed' }
        }
      };
      const result = analyzeApiError(error);
      
      expect(result.status).toBe(500);
      expect(result.type).toBe('server');
      expect(result.message).toBe('Database connection failed');
      expect(result.shouldRetry).toBe(true);
      expect(result.shouldRedirect).toBe(false);
    });

    it('should handle unknown status codes', () => {
      const error = {
        response: {
          status: 418,
          data: { error: 'I am a teapot' }
        }
      };
      const result = analyzeApiError(error);
      
      expect(result.status).toBe(418);
      expect(result.type).toBe('unknown');
      expect(result.shouldRetry).toBe(false);
      expect(result.shouldRedirect).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should return context-specific messages', () => {
      const errorInfo = {
        status: 404,
        type: 'notFound' as const,
        message: 'Shop not found',
        shouldRetry: false,
        shouldRedirect: false
      };
      
      const message = getErrorMessage(errorInfo, 'Shop loading');
      expect(message).toBe('Shop loading: The requested item was not found.');
    });

    it('should return generic messages without context', () => {
      const errorInfo = {
        status: 500,
        type: 'server' as const,
        message: 'Database error',
        shouldRetry: true,
        shouldRedirect: false
      };
      
      const message = getErrorMessage(errorInfo);
      expect(message).toBe('Server error. Please try again in a few moments.');
    });
  });

  describe('getErrorStateVariant', () => {
    it('should return correct variants for different error types', () => {
      const networkError = { message: 'Network Error' };
      expect(getErrorStateVariant(networkError)).toBe('network');

      const authError = { response: { status: 401 } };
      expect(getErrorStateVariant(authError)).toBe('unauthorized');

      const permissionError = { response: { status: 403 } };
      expect(getErrorStateVariant(permissionError)).toBe('forbidden');

      const notFoundError = { response: { status: 404 } };
      expect(getErrorStateVariant(notFoundError)).toBe('notFound');

      const conflictError = { response: { status: 409 } };
      expect(getErrorStateVariant(conflictError)).toBe('conflict');

      const serverError = { response: { status: 500 } };
      expect(getErrorStateVariant(serverError)).toBe('server');
    });
  });

  describe('shouldRetryError', () => {
    it('should return true for retryable errors', () => {
      const serverError = { response: { status: 500 } };
      expect(shouldRetryError(serverError)).toBe(true);

      const networkError = { message: 'Network Error' };
      expect(shouldRetryError(networkError)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const authError = { response: { status: 401 } };
      expect(shouldRetryError(authError)).toBe(false);

      const notFoundError = { response: { status: 404 } };
      expect(shouldRetryError(notFoundError)).toBe(false);

      const conflictError = { response: { status: 409 } };
      expect(shouldRetryError(conflictError)).toBe(false);
    });
  });
});
