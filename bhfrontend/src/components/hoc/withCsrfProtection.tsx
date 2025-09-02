import React, { useEffect, useState } from 'react';
import { Shield, AlertCircle, RefreshCw } from 'lucide-react';
import { useCsrf } from '../../hooks/useCsrf';
import Button from '../ui/Button';

interface CsrfProtectionOptions {
  /**
   * Whether to show a loading state while ensuring CSRF token
   */
  showLoading?: boolean;
  
  /**
   * Whether to automatically retry if CSRF token fetch fails
   */
  autoRetry?: boolean;
  
  /**
   * Custom error message to show if CSRF protection fails
   */
  errorMessage?: string;
  
  /**
   * Whether to validate CSRF protection is working
   */
  validateProtection?: boolean;
}

/**
 * Higher-order component that ensures CSRF protection for wrapped components
 * Automatically fetches CSRF token and validates protection before rendering
 */
export function withCsrfProtection<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: CsrfProtectionOptions = {}
) {
  const {
    showLoading = true,
    autoRetry = true,
    errorMessage = 'CSRF protection is required for this component',
    validateProtection = false
  } = options;

  return function CsrfProtectedComponent(props: P) {
    const {
      isTokenAvailable,
      isLoading,
      error,
      ensureToken,
      validateCsrfProtection
    } = useCsrf();

    const [isReady, setIsReady] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    const initializeCsrf = async () => {
      try {
        setValidationError(null);
        
        // Ensure CSRF token is available
        const token = await ensureToken();
        
        if (!token) {
          throw new Error('Failed to obtain CSRF token');
        }

        // Validate protection if requested
        if (validateProtection) {
          const isProtectionWorking = await validateCsrfProtection();
          if (!isProtectionWorking) {
            throw new Error('CSRF protection validation failed');
          }
        }

        setIsReady(true);
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to initialize CSRF protection';
        setValidationError(errorMsg);
        
        // Auto-retry logic
        if (autoRetry && retryCount < 3) {
          console.log(`🔒 CSRF HOC: Retrying CSRF initialization (attempt ${retryCount + 1}/3)`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            initializeCsrf();
          }, 1000 * (retryCount + 1)); // Exponential backoff
        }
      }
    };

    const handleManualRetry = () => {
      setRetryCount(0);
      setIsReady(false);
      initializeCsrf();
    };

    useEffect(() => {
      // Check if token is already available
      if (isTokenAvailable()) {
        if (validateProtection) {
          initializeCsrf();
        } else {
          setIsReady(true);
        }
      } else {
        initializeCsrf();
      }
    }, []);

    // Loading state
    if ((isLoading || !isReady) && showLoading && !validationError) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-blue-600 animate-pulse" />
            <div className="text-sm text-gray-600">
              Initializing security protection...
            </div>
          </div>
        </div>
      );
    }

    // Error state
    if (validationError || error) {
      const displayError = validationError || error || errorMessage;
      
      return (
        <div className="flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Security Protection Required
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              {displayError}
            </p>
            
            <div className="flex justify-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRetry}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Retry
              </Button>
              
              {process.env.NODE_ENV === 'development' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.log('🔒 CSRF HOC Debug Info:', {
                      isTokenAvailable: isTokenAvailable(),
                      isLoading,
                      error,
                      validationError,
                      retryCount,
                      validateProtection
                    });
                  }}
                >
                  Debug Info
                </Button>
              )}
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-left">
                <p className="text-xs font-medium text-gray-700 mb-1">Debug Information:</p>
                <div className="text-xs text-gray-600 font-mono">
                  <div>Token Available: {isTokenAvailable() ? 'Yes' : 'No'}</div>
                  <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
                  <div>Retry Count: {retryCount}/3</div>
                  <div>Validation: {validateProtection ? 'Enabled' : 'Disabled'}</div>
                  {error && <div>API Error: {error}</div>}
                  {validationError && <div>Validation Error: {validationError}</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Render protected component
    if (isReady) {
      return <WrappedComponent {...props} />;
    }

    // Fallback loading state
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-sm text-gray-600">Loading...</div>
      </div>
    );
  };
}

/**
 * Convenience wrapper for components that need basic CSRF protection
 */
export const withBasicCsrfProtection = <P extends object>(
  WrappedComponent: React.ComponentType<P>
) => withCsrfProtection(WrappedComponent, {
  showLoading: true,
  autoRetry: true,
  validateProtection: false
});

/**
 * Convenience wrapper for components that need strict CSRF protection with validation
 */
export const withStrictCsrfProtection = <P extends object>(
  WrappedComponent: React.ComponentType<P>
) => withCsrfProtection(WrappedComponent, {
  showLoading: true,
  autoRetry: true,
  validateProtection: true,
  errorMessage: 'This component requires validated CSRF protection'
});

export default withCsrfProtection;
