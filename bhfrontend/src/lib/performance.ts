import React from 'react';

/**
 * Performance monitoring and optimization utilities
 */

// Performance metrics tracking
interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'navigation' | 'resource' | 'custom';
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers() {
    // Only initialize in production and if PerformanceObserver is supported
    if (process.env.NODE_ENV !== 'production' || typeof PerformanceObserver === 'undefined') {
      return;
    }

    try {
      // Observe navigation timing
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric({
            name: entry.name,
            value: entry.duration,
            timestamp: Date.now(),
            type: 'navigation'
          });
        }
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);

      // Observe resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric({
            name: entry.name,
            value: entry.duration,
            timestamp: Date.now(),
            type: 'resource'
          });
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);

      // Observe largest contentful paint
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric({
            name: 'largest-contentful-paint',
            value: entry.startTime,
            timestamp: Date.now(),
            type: 'custom'
          });
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

    } catch (error) {
      console.warn('Performance monitoring initialization failed:', error);
    }
  }

  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Send critical metrics to analytics in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToAnalytics(metric);
    }
  }

  private sendToAnalytics(metric: PerformanceMetric) {
    // Only send critical performance metrics
    const criticalMetrics = [
      'largest-contentful-paint',
      'first-contentful-paint',
      'cumulative-layout-shift'
    ];

    if (criticalMetrics.includes(metric.name)) {
      // Send to your analytics service
      // This is a placeholder - replace with your actual analytics implementation
      if (typeof (window as any).gtag !== 'undefined') {
        (window as any).gtag('event', 'performance_metric', {
          metric_name: metric.name,
          metric_value: metric.value,
          custom_parameter: metric.type
        });
      }
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getAverageMetric(name: string): number {
    const relevantMetrics = this.metrics.filter(m => m.name === name);
    if (relevantMetrics.length === 0) return 0;
    
    const sum = relevantMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / relevantMetrics.length;
  }

  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Custom performance measurement utilities
export const measureAsync = async <T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    
    performanceMonitor.recordMetric({
      name,
      value: duration,
      timestamp: Date.now(),
      type: 'custom'
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    performanceMonitor.recordMetric({
      name: `${name}_error`,
      value: duration,
      timestamp: Date.now(),
      type: 'custom'
    });
    throw error;
  }
};

export const measureSync = <T>(name: string, fn: () => T): T => {
  const start = performance.now();
  try {
    const result = fn();
    const duration = performance.now() - start;
    
    performanceMonitor.recordMetric({
      name,
      value: duration,
      timestamp: Date.now(),
      type: 'custom'
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    performanceMonitor.recordMetric({
      name: `${name}_error`,
      value: duration,
      timestamp: Date.now(),
      type: 'custom'
    });
    throw error;
  }
};

// React hook for component performance monitoring
export const usePerformanceMonitoring = (componentName: string) => {
  React.useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric({
        name: `component_${componentName}`,
        value: duration,
        timestamp: Date.now(),
        type: 'custom'
      });
    };
  }, [componentName]);
};

// Image optimization utilities
export const optimizeImageUrl = (url: string, width?: number, height?: number, quality: number = 80): string => {
  if (!url) return url;
  
  // If it's already optimized or external, return as-is
  if (url.includes('?') || !url.startsWith('/uploads/')) {
    return url;
  }
  
  const params = new URLSearchParams();
  if (width) params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  params.set('q', quality.toString());
  params.set('f', 'webp'); // Prefer WebP format
  
  return `${url}?${params.toString()}`;
};

// Debounce utility for performance optimization
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility for performance optimization
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Generate responsive image sources
export const generateResponsiveImageSources = (
  src: string,
  sizes: { width: number; quality?: number }[]
): { srcSet: string; sizes: string } => {
  const srcSet = sizes
    .map(({ width, quality = 80 }) => {
      const optimizedSrc = optimizeImageUrl(src, width, undefined, quality);
      return `${optimizedSrc} ${width}w`;
    })
    .join(', ');

  const sizesAttr = sizes
    .map(({ width }, index) => {
      if (index === sizes.length - 1) return `${width}px`;
      return `(max-width: ${width}px) ${width}px`;
    })
    .join(', ');

  return { srcSet, sizes: sizesAttr };
};

// Progressive image loading
export const createProgressiveImageLoader = () => {
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const loadProgressively = async (
    lowQualitySrc: string,
    highQualitySrc: string,
    onLowQualityLoad?: (img: HTMLImageElement) => void
  ): Promise<HTMLImageElement> => {
    try {
      // Load low quality first
      const lowQualityImg = await loadImage(lowQualitySrc);
      onLowQualityLoad?.(lowQualityImg);

      // Then load high quality
      const highQualityImg = await loadImage(highQualitySrc);
      return highQualityImg;
    } catch (error) {
      // Fallback to high quality if low quality fails
      return loadImage(highQualitySrc);
    }
  };

  return { loadImage, loadProgressively };
};

// WebP support detection
export const supportsWebP = (): boolean => {
  if (typeof window === 'undefined') return false;

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
};

// Cleanup function for app shutdown
export const cleanupPerformanceMonitoring = () => {
  performanceMonitor.cleanup();
};
