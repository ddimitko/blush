/**
 * Reusable component for handling API errors with appropriate UI states
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorState, {
  NetworkErrorState,
  ServerErrorState,
  UnauthorizedErrorState,
  NotFoundErrorState,
  ConflictErrorState
} from '../ui/ErrorState';
import { analyzeApiError, getErrorStateVariant } from '../../lib/errorUtils';
import { useToast } from '../ui/Toast';

interface ApiErrorHandlerProps {
  error: any;
  onRetry?: () => void;
  onGoBack?: () => void;
  onGoHome?: () => void;
  context?: string;
  showInline?: boolean;
  className?: string;
}

/**
 * Component that renders appropriate error UI based on API error type
 */
export const ApiErrorHandler: React.FC<ApiErrorHandlerProps> = ({
  error,
  onRetry,
  onGoBack,
  onGoHome,
  context,
  showInline = false,
  className
}) => {
  const navigate = useNavigate();
  const { error: showToast } = useToast();
  
  if (!error) return null;
  
  const errorInfo = analyzeApiError(error);
  const variant = getErrorStateVariant(error);
  
  // Handle automatic redirects for auth errors
  React.useEffect(() => {
    if (errorInfo.shouldRedirect && errorInfo.redirectPath) {
      navigate(errorInfo.redirectPath, { replace: true });
    }
  }, [errorInfo.shouldRedirect, errorInfo.redirectPath, navigate]);
  
  // Show toast for inline errors
  React.useEffect(() => {
    if (showInline && errorInfo.message) {
      const title = context ? `${context} Error` : 'Error';
      showToast(title, errorInfo.message);
    }
  }, [showInline, errorInfo.message, context, showToast]);
  
  // Don't render UI for inline errors or auth redirects
  if (showInline || errorInfo.shouldRedirect) {
    return null;
  }
  
  const defaultGoHome = () => navigate('/');
  const defaultGoBack = () => navigate(-1);
  
  // Render specific error components based on type
  switch (variant) {
    case 'network':
      return (
        <NetworkErrorState 
          onRetry={onRetry}
        />
      );
      
    case 'server':
      return (
        <ServerErrorState 
          error={errorInfo.message}
          onRetry={onRetry}
        />
      );
      
    case 'unauthorized':
      return (
        <UnauthorizedErrorState 
          onSignIn={() => navigate('/')}
        />
      );
      
    case 'notFound':
      return (
        <NotFoundErrorState 
          onGoHome={onGoHome || defaultGoHome}
          onGoBack={onGoBack || defaultGoBack}
        />
      );
      
    case 'conflict':
      return (
        <ConflictErrorState 
          message={errorInfo.message}
          onRetry={onRetry}
          onGoBack={onGoBack || defaultGoBack}
        />
      );
      
    default:
      return (
        <ErrorState
          variant={variant}
          title={context ? `${context} Error` : undefined}
          description={errorInfo.message}
          error={error}
          onRetry={onRetry}
          onGoBack={onGoBack || defaultGoBack}
          onGoHome={onGoHome || defaultGoHome}
          className={className}
          showDetails={process.env.NODE_ENV === 'development'}
        />
      );
  }
};

/**
 * Hook for handling API errors in React Query mutations
 */
export const useApiErrorHandler = () => {
  const navigate = useNavigate();
  const { error: showToast } = useToast();
  
  const handleError = React.useCallback((error: any, context?: string) => {
    const errorInfo = analyzeApiError(error);
    
    // Log error for debugging
    console.error(`API Error [${errorInfo.status}]:`, {
      type: errorInfo.type,
      message: errorInfo.message,
      context,
      details: errorInfo.details,
    });
    
    // Handle automatic redirects
    if (errorInfo.shouldRedirect && errorInfo.redirectPath) {
      navigate(errorInfo.redirectPath, { replace: true });
      return;
    }
    
    // Show toast notification for non-critical errors
    if (errorInfo.type === 'validation' || errorInfo.type === 'conflict') {
      const title = context ? `${context} Error` : 'Error';
      showToast(title, errorInfo.message);
    }
    
    return errorInfo;
  }, [navigate, showToast]);
  
  return { handleError };
};

/**
 * Higher-order component that wraps components with error handling
 */
export const withApiErrorHandler = <P extends object>(
  Component: React.ComponentType<P>,
  context?: string
) => {
  return React.forwardRef<any, P & { error?: any; onRetry?: () => void }>((props, ref) => {
    const { error, onRetry, ...componentProps } = props;
    
    if (error) {
      return (
        <ApiErrorHandler
          error={error}
          onRetry={onRetry}
          context={context}
        />
      );
    }
    
    return <Component ref={ref} {...(componentProps as P)} />;
  });
};

export default ApiErrorHandler;
