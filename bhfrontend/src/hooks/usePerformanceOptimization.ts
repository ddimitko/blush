import { useEffect, useCallback, useRef } from 'react';
import { initializeBundleOptimizations } from '../lib/bundleOptimization';

/**
 * Hook for comprehensive performance optimization
 */
export const usePerformanceOptimization = () => {
  const cleanupRef = useRef<(() => void) | null>(null);
  const metricsRef = useRef<Map<string, number>>(new Map());

  // Initialize performance optimizations
  useEffect(() => {
    const cleanup = initializeBundleOptimizations();
    cleanupRef.current = cleanup?.cleanup || null;

    return () => {
      cleanupRef.current?.();
    };
  }, []);

  // Measure component render time
  const measureRender = useCallback((componentName: string) => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      metricsRef.current.set(`${componentName}_render`, renderTime);
      
      if (process.env.NODE_ENV === 'development' && renderTime > 16) {
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    };
  }, []);

  // Measure async operations
  const measureAsync = useCallback(async <T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      metricsRef.current.set(`${operationName}_async`, duration);
      
      if (process.env.NODE_ENV === 'development' && duration > 1000) {
        console.warn(`Slow async operation detected in ${operationName}: ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      metricsRef.current.set(`${operationName}_async_error`, duration);
      throw error;
    }
  }, []);

  // Get performance metrics
  const getMetrics = useCallback(() => {
    return Object.fromEntries(metricsRef.current);
  }, []);

  // Clear metrics
  const clearMetrics = useCallback(() => {
    metricsRef.current.clear();
  }, []);

  return {
    measureRender,
    measureAsync,
    getMetrics,
    clearMetrics
  };
};

/**
 * Hook for monitoring component re-renders
 */
export const useRenderMonitor = (componentName: string, props?: Record<string, any>) => {
  const renderCountRef = useRef(0);
  const prevPropsRef = useRef(props);

  useEffect(() => {
    renderCountRef.current += 1;
    
    if (process.env.NODE_ENV === 'development') {
      if (renderCountRef.current > 10) {
        console.warn(`High render count detected in ${componentName}: ${renderCountRef.current} renders`);
      }

      if (props && prevPropsRef.current) {
        const changedProps = Object.keys(props).filter(
          key => props[key] !== prevPropsRef.current?.[key]
        );
        
        if (changedProps.length > 0) {
          console.log(`${componentName} re-rendered due to props:`, changedProps);
        }
      }
    }

    prevPropsRef.current = props;
  });

  return renderCountRef.current;
};

/**
 * Hook for memory usage monitoring
 */
export const useMemoryMonitor = () => {
  const checkMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      
      const memoryInfo = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };

      if (process.env.NODE_ENV === 'development' && memoryInfo.usagePercentage > 80) {
        console.warn('High memory usage detected:', memoryInfo);
      }

      return memoryInfo;
    }
    
    return null;
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(checkMemoryUsage, 30000); // Check every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [checkMemoryUsage]);

  return { checkMemoryUsage };
};

/**
 * Hook for network performance monitoring
 */
export const useNetworkMonitor = () => {
  const measureNetworkRequest = useCallback(async <T>(
    url: string,
    requestFn: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await requestFn();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Network request to ${url} completed in ${duration.toFixed(2)}ms`);
        
        if (duration > 3000) {
          console.warn(`Slow network request detected: ${url} took ${duration.toFixed(2)}ms`);
        }
      }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (process.env.NODE_ENV === 'development') {
        console.error(`Network request to ${url} failed after ${duration.toFixed(2)}ms:`, error);
      }
      
      throw error;
    }
  }, []);

  return { measureNetworkRequest };
};

/**
 * Hook for bundle size monitoring
 */
export const useBundleMonitor = () => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach(entry => {
          if (entry.name.includes('.js') || entry.name.includes('.css')) {
            const resourceEntry = entry as PerformanceResourceTiming;
            const sizeKB = resourceEntry.transferSize ? (resourceEntry.transferSize / 1024).toFixed(2) : 'unknown';
            console.log(`Resource loaded: ${entry.name} (${sizeKB}KB)`);

            if (resourceEntry.transferSize && resourceEntry.transferSize > 500 * 1024) { // > 500KB
              console.warn(`Large resource detected: ${entry.name} (${sizeKB}KB)`);
            }
          }
        });
      });

      observer.observe({ entryTypes: ['resource'] });

      return () => observer.disconnect();
    }
  }, []);
};
