import React, { Suspense, memo } from 'react';
import LoadingSpinner from './LoadingSpinner';
import ErrorBoundary from './ErrorBoundary';

interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

/**
 * Wrapper component for lazy-loaded components with proper loading and error states
 */
const LazyWrapper: React.FC<LazyWrapperProps> = memo(({
  children,
  fallback,
  errorFallback
}) => {
  const defaultFallback = (
    <div className="flex items-center justify-center min-h-[200px]">
      <LoadingSpinner size="lg" text="Loading..." />
    </div>
  );

  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback || defaultFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
});

LazyWrapper.displayName = 'LazyWrapper';

export default LazyWrapper;
