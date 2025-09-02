/**
 * Performance testing and benchmarking utilities
 */

import { safeLog } from './environment';

interface PerformanceTest {
  name: string;
  fn: () => void | Promise<void>;
  iterations?: number;
  warmup?: number;
}

interface PerformanceResult {
  name: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  totalTime: number;
  iterations: number;
  memoryUsage?: {
    before: number;
    after: number;
    delta: number;
  };
}

// Performance benchmark runner
export class PerformanceBenchmark {
  private results: PerformanceResult[] = [];

  async runTest(test: PerformanceTest): Promise<PerformanceResult> {
    const { name, fn, iterations = 100, warmup = 10 } = test;
    
    safeLog.debug(`Running performance test: ${name}`);

    // Warmup runs
    for (let i = 0; i < warmup; i++) {
      await fn();
    }

    // Force garbage collection if available
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }

    // Measure memory before
    const memoryBefore = this.getMemoryUsage();
    
    const times: number[] = [];
    const startTime = performance.now();

    // Run actual tests
    for (let i = 0; i < iterations; i++) {
      const iterationStart = performance.now();
      await fn();
      const iterationEnd = performance.now();
      times.push(iterationEnd - iterationStart);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Measure memory after
    const memoryAfter = this.getMemoryUsage();

    const result: PerformanceResult = {
      name,
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      totalTime,
      iterations,
      memoryUsage: memoryBefore && memoryAfter ? {
        before: memoryBefore,
        after: memoryAfter,
        delta: memoryAfter - memoryBefore
      } : undefined
    };

    this.results.push(result);
    this.logResult(result);
    
    return result;
  }

  async runSuite(tests: PerformanceTest[]): Promise<PerformanceResult[]> {
    const results: PerformanceResult[] = [];
    
    for (const test of tests) {
      const result = await this.runTest(test);
      results.push(result);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.logSummary(results);
    return results;
  }

  private getMemoryUsage(): number | null {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return null;
  }

  private logResult(result: PerformanceResult): void {
    safeLog.debug(`Performance Test: ${result.name}`, {
      averageTime: `${result.averageTime.toFixed(2)}ms`,
      minTime: `${result.minTime.toFixed(2)}ms`,
      maxTime: `${result.maxTime.toFixed(2)}ms`,
      iterations: result.iterations,
      memoryDelta: result.memoryUsage ? `${(result.memoryUsage.delta / 1024 / 1024).toFixed(2)}MB` : 'N/A'
    });
  }

  private logSummary(results: PerformanceResult[]): void {
    safeLog.debug('Performance Test Summary:', 
      results.map(r => ({
        name: r.name,
        avgTime: `${r.averageTime.toFixed(2)}ms`,
        memoryDelta: r.memoryUsage ? `${(r.memoryUsage.delta / 1024 / 1024).toFixed(2)}MB` : 'N/A'
      }))
    );
  }

  getResults(): PerformanceResult[] {
    return [...this.results];
  }

  clearResults(): void {
    this.results = [];
  }
}

// Component render performance testing
export const testComponentRenderPerformance = async (
  componentName: string,
  renderFn: () => void,
  iterations: number = 50
): Promise<PerformanceResult> => {
  const benchmark = new PerformanceBenchmark();
  
  return benchmark.runTest({
    name: `${componentName} Render`,
    fn: renderFn,
    iterations,
    warmup: 5
  });
};

// API call performance testing
export const testAPIPerformance = async (
  apiName: string,
  apiFn: () => Promise<any>,
  iterations: number = 10
): Promise<PerformanceResult> => {
  const benchmark = new PerformanceBenchmark();
  
  return benchmark.runTest({
    name: `${apiName} API Call`,
    fn: apiFn,
    iterations,
    warmup: 2
  });
};

// Image loading performance testing
export const testImageLoadingPerformance = async (
  imageSrc: string,
  iterations: number = 20
): Promise<PerformanceResult> => {
  const benchmark = new PerformanceBenchmark();
  
  const loadImage = () => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = `${imageSrc}?t=${Date.now()}`; // Prevent caching
    });
  };

  return benchmark.runTest({
    name: `Image Loading: ${imageSrc}`,
    fn: loadImage,
    iterations,
    warmup: 2
  });
};

// Bundle size analysis
export const analyzeBundleSize = (): Promise<{
  totalSize: number;
  jsSize: number;
  cssSize: number;
  imageSize: number;
  resources: Array<{ name: string; size: number; type: string }>;
}> => {
  return new Promise((resolve) => {
    if (!('PerformanceObserver' in window)) {
      resolve({
        totalSize: 0,
        jsSize: 0,
        cssSize: 0,
        imageSize: 0,
        resources: []
      });
      return;
    }

    const resources: Array<{ name: string; size: number; type: string }> = [];
    let totalSize = 0;
    let jsSize = 0;
    let cssSize = 0;
    let imageSize = 0;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        const resourceEntry = entry as PerformanceResourceTiming;
        if (resourceEntry.transferSize) {
          const size = resourceEntry.transferSize;
          const name = entry.name;
          let type = 'other';

          if (name.includes('.js')) {
            type = 'javascript';
            jsSize += size;
          } else if (name.includes('.css')) {
            type = 'css';
            cssSize += size;
          } else if (name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
            type = 'image';
            imageSize += size;
          }

          totalSize += size;
          resources.push({ name, size, type });
        }
      });

      // Stop observing after a delay
      setTimeout(() => {
        observer.disconnect();
        resolve({
          totalSize,
          jsSize,
          cssSize,
          imageSize,
          resources: resources.sort((a, b) => b.size - a.size)
        });
      }, 5000);
    });

    observer.observe({ entryTypes: ['resource'] });
  });
};

// Core Web Vitals monitoring
export const monitorCoreWebVitals = (): Promise<{
  fcp?: number;
  lcp?: number;
  fid?: number;
  cls?: number;
}> => {
  return new Promise((resolve) => {
    const vitals: any = {};
    let resolveTimeout: NodeJS.Timeout;

    const resolveWithResults = () => {
      clearTimeout(resolveTimeout);
      resolve(vitals);
    };

    // Set a timeout to resolve even if not all metrics are captured
    resolveTimeout = setTimeout(resolveWithResults, 10000);

    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        vitals.fcp = entries[0].startTime;
        fcpObserver.disconnect();
      }
    });
    fcpObserver.observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        vitals.lcp = entries[entries.length - 1].startTime;
      }
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        const fidEntry = entries[0] as PerformanceEventTiming;
        if (fidEntry.processingStart) {
          vitals.fid = fidEntry.processingStart - entries[0].startTime;
        }
        fidObserver.disconnect();
      }
    });
    fidObserver.observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const clsEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!clsEntry.hadRecentInput && clsEntry.value) {
          clsValue += clsEntry.value;
        }
      });
      vitals.cls = clsValue;
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // Clean up observers after timeout
    setTimeout(() => {
      fcpObserver.disconnect();
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
      resolveWithResults();
    }, 10000);
  });
};

// Export singleton benchmark instance
export const performanceBenchmark = new PerformanceBenchmark();
