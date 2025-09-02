import { useEffect, useRef } from 'react';

/**
 * Hook to prevent double execution in React Strict Mode
 * Useful for effects that should only run once even in development
 */
export const useStableEffect = (effect: () => void | (() => void), deps?: React.DependencyList) => {
  const hasRunRef = useRef(false);
  const cleanupRef = useRef<(() => void) | void>(undefined);

  useEffect(() => {
    // In development with Strict Mode, this will run twice
    // We use a ref to ensure the effect only runs once
    if (!hasRunRef.current) {
      hasRunRef.current = true;
      cleanupRef.current = effect();
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = undefined;
      }
      hasRunRef.current = false;
    };
  }, deps);
};

/**
 * Hook to debounce effects and prevent excessive re-renders
 */
export const useDebouncedEffect = (
  effect: () => void | (() => void),
  deps: React.DependencyList,
  delay: number = 300
) => {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const cleanupRef = useRef<(() => void) | void>(undefined);

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Clear previous cleanup
    if (cleanupRef.current) {
      cleanupRef.current();
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      cleanupRef.current = effect();
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [...deps, delay]);
};

/**
 * Hook to prevent unnecessary re-renders with deep comparison
 */
export const useDeepMemo = <T>(value: T): T => {
  const ref = useRef<T>(value);
  const prevRef = useRef<string | undefined>(undefined);

  const currentSerialized = JSON.stringify(value);
  
  if (prevRef.current !== currentSerialized) {
    ref.current = value;
    prevRef.current = currentSerialized;
  }

  return ref.current;
};

/**
 * Hook to track and log component re-renders in development
 */
export const useRenderTracker = (componentName: string, props?: Record<string, any>) => {
  const renderCount = useRef(0);
  const prevProps = useRef(props);

  renderCount.current += 1;

  if (process.env.NODE_ENV === 'development') {
    if (renderCount.current > 1) {
      const changedProps = props && prevProps.current 
        ? Object.keys(props).filter(key => props[key] !== prevProps.current?.[key])
        : [];

      if (changedProps.length > 0) {
        console.log(`🔄 ${componentName} re-rendered (${renderCount.current}) due to:`, changedProps);
      } else if (renderCount.current > 5) {
        console.warn(`⚠️ ${componentName} has re-rendered ${renderCount.current} times`);
      }
    }
  }

  prevProps.current = props;
  return renderCount.current;
};

/**
 * Hook to prevent effects from running on initial mount in Strict Mode
 */
export const useUpdateEffect = (effect: () => void | (() => void), deps: React.DependencyList) => {
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    return effect();
  }, deps);
};
