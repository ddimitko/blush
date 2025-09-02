/**
 * Comprehensive error handling and reporting system
 */

export interface ErrorInfo {
  message: string;
  stack?: string;
  code?: string | number;
  context?: Record<string, any>;
  timestamp: number;
  userId?: string;
  url: string;
  userAgent: string;
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorReport extends ErrorInfo {
  id: string;
  severity: ErrorSeverity;
  category: 'network' | 'validation' | 'authentication' | 'permission' | 'notFound' | 'conflict' | 'server' | 'runtime' | 'unknown';
  resolved: boolean;
}

class ErrorHandler {
  private errors: ErrorReport[] = [];
  private maxErrors = 50; // Keep last 50 errors in memory
  private reportingEndpoint = '/api/errors'; // Backend endpoint for error reporting

  constructor() {
    this.setupGlobalErrorHandlers();
  }

  private setupGlobalErrorHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(event.reason, 'high', 'runtime', {
        type: 'unhandledrejection',
        promise: event.promise
      });
    });

    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), 'high', 'runtime', {
        type: 'javascript',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Handle resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target && event.target !== window) {
        const target = event.target as HTMLElement;
        this.captureError(
          new Error(`Failed to load resource: ${target.tagName}`),
          'medium',
          'network',
          {
            type: 'resource',
            tagName: target.tagName,
            src: (target as any).src || (target as any).href
          }
        );
      }
    }, true);
  }

  captureError(
    error: Error | string,
    severity: ErrorSeverity = 'medium',
    category: ErrorReport['category'] = 'unknown',
    context?: Record<string, any>
  ): string {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    
    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      message: errorObj.message,
      stack: errorObj.stack,
      code: (errorObj as any).code,
      context: {
        ...context,
        component: this.getCurrentComponent(),
        route: window.location.pathname
      },
      timestamp: Date.now(),
      userId: this.getCurrentUserId(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      severity,
      category,
      resolved: false
    };

    this.addError(errorReport);
    this.reportError(errorReport);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error captured:', errorReport);
    }

    return errorReport.id;
  }

  private addError(error: ErrorReport) {
    this.errors.unshift(error);
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }
  }

  private async reportError(error: ErrorReport) {
    // Only report in production or when explicitly enabled
    if (process.env.NODE_ENV !== 'production' && !process.env.REACT_APP_ENABLE_ERROR_REPORTING) {
      return;
    }

    try {
      // Send to backend error reporting endpoint
      await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(error),
      });
    } catch (reportingError) {
      // Silently fail if error reporting fails
      console.warn('Failed to report error:', reportingError);
    }
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentUserId(): string | undefined {
    try {
      const authStorage = localStorage.getItem('auth-ui-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        return parsed.state?.user?.id;
      }
    } catch {
      // Ignore parsing errors
    }
    return undefined;
  }

  private getCurrentComponent(): string | undefined {
    // Try to extract component name from stack trace
    try {
      const stack = new Error().stack;
      if (stack) {
        const lines = stack.split('\n');
        for (const line of lines) {
          if (line.includes('src/') && line.includes('.tsx')) {
            const match = line.match(/src\/.*?([A-Z][a-zA-Z]*\.tsx)/);
            if (match) {
              return match[1].replace('.tsx', '');
            }
          }
        }
      }
    } catch {
      // Ignore errors in component detection
    }
    return undefined;
  }

  getErrors(): ErrorReport[] {
    return [...this.errors];
  }

  getErrorById(id: string): ErrorReport | undefined {
    return this.errors.find(error => error.id === id);
  }

  markErrorAsResolved(id: string): boolean {
    const error = this.getErrorById(id);
    if (error) {
      error.resolved = true;
      return true;
    }
    return false;
  }

  clearErrors(): void {
    this.errors = [];
  }

  getErrorStats(): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byCategory: Record<ErrorReport['category'], number>;
    resolved: number;
  } {
    const stats = {
      total: this.errors.length,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      byCategory: { network: 0, validation: 0, authentication: 0, permission: 0, notFound: 0, conflict: 0, server: 0, runtime: 0, unknown: 0 },
      resolved: 0
    };

    this.errors.forEach(error => {
      stats.bySeverity[error.severity]++;
      stats.byCategory[error.category]++;
      if (error.resolved) stats.resolved++;
    });

    return stats;
  }
}

// Singleton instance
export const errorHandler = new ErrorHandler();

// Utility functions for common error scenarios
export const handleApiError = (error: any, context?: Record<string, any>) => {
  const status = error.response?.status;

  // Determine severity based on status code
  const severity: ErrorSeverity =
    status >= 500 ? 'high' :
    status === 401 || status === 403 ? 'medium' :
    status === 409 ? 'medium' :
    'low';

  // Categorize error based on status code
  const category: ErrorReport['category'] =
    status === 401 ? 'authentication' :
    status === 403 ? 'permission' :
    status === 404 ? 'notFound' :
    status === 409 ? 'conflict' :
    status >= 500 ? 'server' :
    status >= 400 ? 'validation' :
    'network';

  return errorHandler.captureError(
    error.message || 'API request failed',
    severity,
    category,
    {
      ...context,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method,
      responseData: error.response?.data
    }
  );
};

export const handleValidationError = (message: string, field?: string, value?: any) => {
  return errorHandler.captureError(
    message,
    'low',
    'validation',
    { field, value }
  );
};

export const handleAuthError = (message: string, context?: Record<string, any>) => {
  return errorHandler.captureError(
    message,
    'high',
    'authentication',
    context
  );
};

export const handlePermissionError = (message: string, requiredRole?: string) => {
  return errorHandler.captureError(
    message,
    'medium',
    'permission',
    { requiredRole }
  );
};

export const handleNotFoundError = (message: string, resource?: string) => {
  return errorHandler.captureError(
    message,
    'low',
    'notFound',
    { resource }
  );
};

export const handleConflictError = (message: string, conflictType?: string) => {
  return errorHandler.captureError(
    message,
    'medium',
    'conflict',
    { conflictType }
  );
};

export const handleServerError = (message: string, context?: Record<string, any>) => {
  return errorHandler.captureError(
    message,
    'high',
    'server',
    context
  );
};

// React hook for error boundary integration
export const useErrorHandler = () => {
  return {
    captureError: errorHandler.captureError.bind(errorHandler),
    handleApiError,
    handleValidationError,
    handleAuthError,
    handlePermissionError,
    handleNotFoundError,
    handleConflictError,
    handleServerError
  };
};
