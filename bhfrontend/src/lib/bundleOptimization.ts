/**
 * Bundle optimization utilities for production builds
 */

// Dynamic import helper with error handling
export const dynamicImport = async <T>(
  importFn: () => Promise<{ default: T }>,
  fallback?: T
): Promise<T> => {
  try {
    const module = await importFn();
    return module.default;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Dynamic import failed:', error);
    }
    if (fallback) {
      return fallback;
    }
    throw error;
  }
};

// Preload critical resources
export const preloadResource = (href: string, as: string, type?: string) => {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  if (type) link.type = type;
  
  document.head.appendChild(link);
};

// Prefetch non-critical resources
export const prefetchResource = (href: string) => {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  
  document.head.appendChild(link);
};

// Critical CSS inlining helper
export const inlineCriticalCSS = (css: string) => {
  if (typeof window === 'undefined') return;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
};

// Service worker registration
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      if (process.env.NODE_ENV !== 'production') {
        console.log('Service Worker registered:', registration);
      }
      return registration;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Service Worker registration failed:', error);
      }
    }
  }
};

// Resource hints for better performance
export const addResourceHints = () => {
  if (typeof window === 'undefined') return;

  // DNS prefetch for external domains
  const dnsPrefetchDomains = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    'https://js.stripe.com',
    'https://api.stripe.com'
  ];

  dnsPrefetchDomains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = domain;
    document.head.appendChild(link);
  });

  // Preconnect to critical origins
  const preconnectOrigins = [
    'https://fonts.googleapis.com',
    'https://js.stripe.com'
  ];

  preconnectOrigins.forEach(origin => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
};

// Lazy load images with intersection observer
export const createImageLazyLoader = () => {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return null;
  }

  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.dataset.src;
        
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      }
    });
  }, {
    rootMargin: '50px 0px',
    threshold: 0.01
  });

  return imageObserver;
};

// Memory cleanup utilities
export const cleanupUnusedResources = () => {
  // Clean up blob URLs
  const blobUrls = new Set<string>();
  
  return {
    createBlobUrl: (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      blobUrls.add(url);
      return url;
    },
    
    revokeBlobUrl: (url: string) => {
      URL.revokeObjectURL(url);
      blobUrls.delete(url);
    },
    
    cleanup: () => {
      blobUrls.forEach(url => URL.revokeObjectURL(url));
      blobUrls.clear();
    }
  };
};

// Performance budget monitoring
export const monitorPerformanceBudget = () => {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  const budgets = {
    firstContentfulPaint: 1500, // 1.5s
    largestContentfulPaint: 2500, // 2.5s
    firstInputDelay: 100, // 100ms
    cumulativeLayoutShift: 0.1 // 0.1
  };

  // Monitor LCP
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    
    if (lastEntry.startTime > budgets.largestContentfulPaint) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`LCP budget exceeded: ${lastEntry.startTime}ms > ${budgets.largestContentfulPaint}ms`);
      }
    }
  });

  lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

  // Monitor FID
  const fidObserver = new PerformanceObserver((list) => {
    list.getEntries().forEach(entry => {
      const fidEntry = entry as PerformanceEventTiming;
      if (fidEntry.processingStart && fidEntry.processingStart - entry.startTime > budgets.firstInputDelay) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`FID budget exceeded: ${fidEntry.processingStart - entry.startTime}ms > ${budgets.firstInputDelay}ms`);
        }
      }
    });
  });

  fidObserver.observe({ entryTypes: ['first-input'] });

  // Monitor CLS
  const clsObserver = new PerformanceObserver((list) => {
    let clsValue = 0;

    list.getEntries().forEach(entry => {
      const clsEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
      if (!clsEntry.hadRecentInput && clsEntry.value) {
        clsValue += clsEntry.value;
      }
    });

    if (clsValue > budgets.cumulativeLayoutShift) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`CLS budget exceeded: ${clsValue} > ${budgets.cumulativeLayoutShift}`);
      }
    }
  });

  clsObserver.observe({ entryTypes: ['layout-shift'] });

  return () => {
    lcpObserver.disconnect();
    fidObserver.disconnect();
    clsObserver.disconnect();
  };
};

// Initialize all optimizations
export const initializeBundleOptimizations = () => {
  if (typeof window === 'undefined') return;

  // Add resource hints
  addResourceHints();

  // Register service worker
  registerServiceWorker();

  // Monitor performance budget
  const cleanupBudgetMonitoring = monitorPerformanceBudget();

  // Initialize image lazy loading
  const imageObserver = createImageLazyLoader();

  // Initialize resource cleanup
  const resourceCleanup = cleanupUnusedResources();

  return {
    cleanup: () => {
      cleanupBudgetMonitoring?.();
      imageObserver?.disconnect();
      resourceCleanup.cleanup();
    }
  };
};
