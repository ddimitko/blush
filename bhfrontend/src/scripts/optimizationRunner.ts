/**
 * Comprehensive optimization runner for production analysis
 */

import { 
  performanceBenchmark, 
  analyzeBundleSize, 
  monitorCoreWebVitals,
  testComponentRenderPerformance,
  testAPIPerformance 
} from '../lib/performanceTesting';
import { safeLog, getEnvironmentInfo } from '../lib/environment';
import { performanceMonitor } from '../lib/performance';

interface OptimizationReport {
  timestamp: string;
  environment: any;
  bundleAnalysis: any;
  coreWebVitals: any;
  performanceMetrics: any;
  recommendations: string[];
  score: number;
}

class OptimizationRunner {
  private report: Partial<OptimizationReport> = {};

  async runFullAnalysis(): Promise<OptimizationReport> {
    safeLog.info('🚀 Starting comprehensive optimization analysis...');

    this.report.timestamp = new Date().toISOString();
    this.report.environment = getEnvironmentInfo();

    // Run all analysis steps
    await this.analyzeBundleSize();
    await this.measureCoreWebVitals();
    await this.runPerformanceTests();
    await this.generateRecommendations();
    
    const finalReport = this.report as OptimizationReport;
    this.logReport(finalReport);
    
    return finalReport;
  }

  private async analyzeBundleSize(): Promise<void> {
    safeLog.info('📦 Analyzing bundle size...');
    
    try {
      const bundleAnalysis = await analyzeBundleSize();
      this.report.bundleAnalysis = bundleAnalysis;
      
      safeLog.info('Bundle Analysis Results:', {
        totalSize: `${(bundleAnalysis.totalSize / 1024 / 1024).toFixed(2)}MB`,
        jsSize: `${(bundleAnalysis.jsSize / 1024 / 1024).toFixed(2)}MB`,
        cssSize: `${(bundleAnalysis.cssSize / 1024).toFixed(2)}KB`,
        imageSize: `${(bundleAnalysis.imageSize / 1024 / 1024).toFixed(2)}MB`,
        resourceCount: bundleAnalysis.resources.length
      });
    } catch (error) {
      safeLog.error('Bundle analysis failed:', error);
      this.report.bundleAnalysis = { error: 'Analysis failed' };
    }
  }

  private async measureCoreWebVitals(): Promise<void> {
    safeLog.info('⚡ Measuring Core Web Vitals...');
    
    try {
      const vitals = await monitorCoreWebVitals();
      this.report.coreWebVitals = vitals;
      
      safeLog.info('Core Web Vitals:', {
        fcp: vitals.fcp ? `${vitals.fcp.toFixed(2)}ms` : 'N/A',
        lcp: vitals.lcp ? `${vitals.lcp.toFixed(2)}ms` : 'N/A',
        fid: vitals.fid ? `${vitals.fid.toFixed(2)}ms` : 'N/A',
        cls: vitals.cls ? vitals.cls.toFixed(3) : 'N/A'
      });
    } catch (error) {
      safeLog.error('Core Web Vitals measurement failed:', error);
      this.report.coreWebVitals = { error: 'Measurement failed' };
    }
  }

  private async runPerformanceTests(): Promise<void> {
    safeLog.info('🏃 Running performance tests...');
    
    try {
      const tests = [
        {
          name: 'DOM Manipulation',
          fn: () => {
            const div = document.createElement('div');
            div.innerHTML = '<span>Test</span>';
            document.body.appendChild(div);
            document.body.removeChild(div);
          },
          iterations: 1000
        },
        {
          name: 'Array Processing',
          fn: () => {
            const arr = Array.from({ length: 1000 }, (_, i) => i);
            arr.map(x => x * 2).filter(x => x % 2 === 0).reduce((a, b) => a + b, 0);
          },
          iterations: 100
        },
        {
          name: 'Object Creation',
          fn: () => {
            const obj = { a: 1, b: 2, c: 3 };
            const copy = { ...obj, d: 4 };
            JSON.stringify(copy);
          },
          iterations: 1000
        }
      ];

      const results = await performanceBenchmark.runSuite(tests);
      this.report.performanceMetrics = {
        tests: results,
        summary: {
          averageTime: results.reduce((sum, r) => sum + r.averageTime, 0) / results.length,
          totalMemoryDelta: results.reduce((sum, r) => 
            sum + (r.memoryUsage?.delta || 0), 0
          )
        }
      };
    } catch (error) {
      safeLog.error('Performance tests failed:', error);
      this.report.performanceMetrics = { error: 'Tests failed' };
    }
  }

  private async generateRecommendations(): Promise<void> {
    safeLog.info('💡 Generating optimization recommendations...');
    
    const recommendations: string[] = [];
    let score = 100;

    // Bundle size recommendations
    if (this.report.bundleAnalysis && !this.report.bundleAnalysis.error) {
      const { totalSize, jsSize, cssSize, imageSize } = this.report.bundleAnalysis;
      
      if (totalSize > 5 * 1024 * 1024) { // > 5MB
        recommendations.push('Bundle size is large (>5MB). Consider code splitting and lazy loading.');
        score -= 15;
      }
      
      if (jsSize > 2 * 1024 * 1024) { // > 2MB
        recommendations.push('JavaScript bundle is large (>2MB). Implement dynamic imports.');
        score -= 10;
      }
      
      if (imageSize > 3 * 1024 * 1024) { // > 3MB
        recommendations.push('Image assets are large (>3MB). Optimize images and use WebP format.');
        score -= 10;
      }
    }

    // Core Web Vitals recommendations
    if (this.report.coreWebVitals && !this.report.coreWebVitals.error) {
      const { fcp, lcp, fid, cls } = this.report.coreWebVitals;
      
      if (fcp && fcp > 1800) {
        recommendations.push('First Contentful Paint is slow (>1.8s). Optimize critical rendering path.');
        score -= 15;
      }
      
      if (lcp && lcp > 2500) {
        recommendations.push('Largest Contentful Paint is slow (>2.5s). Optimize largest elements.');
        score -= 15;
      }
      
      if (fid && fid > 100) {
        recommendations.push('First Input Delay is high (>100ms). Optimize JavaScript execution.');
        score -= 10;
      }
      
      if (cls && cls > 0.1) {
        recommendations.push('Cumulative Layout Shift is high (>0.1). Stabilize layout elements.');
        score -= 10;
      }
    }

    // Performance metrics recommendations
    if (this.report.performanceMetrics && !this.report.performanceMetrics.error) {
      const { summary } = this.report.performanceMetrics;
      
      if (summary.averageTime > 10) {
        recommendations.push('Average operation time is high (>10ms). Optimize algorithms.');
        score -= 5;
      }
      
      if (summary.totalMemoryDelta > 10 * 1024 * 1024) { // > 10MB
        recommendations.push('Memory usage is high (>10MB delta). Check for memory leaks.');
        score -= 10;
      }
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Great job! No major performance issues detected.');
    } else {
      recommendations.push('Consider implementing React.memo for frequently re-rendering components.');
      recommendations.push('Use useCallback and useMemo for expensive operations.');
      recommendations.push('Implement virtual scrolling for large lists.');
      recommendations.push('Add service worker for better caching.');
    }

    this.report.recommendations = recommendations;
    this.report.score = Math.max(0, score);
  }

  private logReport(report: OptimizationReport): void {
    safeLog.info('📊 Optimization Analysis Complete!');
    safeLog.info(`Performance Score: ${report.score}/100`);
    
    if (report.score >= 90) {
      safeLog.info('🎉 Excellent performance! Your app is well optimized.');
    } else if (report.score >= 70) {
      safeLog.info('👍 Good performance with room for improvement.');
    } else if (report.score >= 50) {
      safeLog.info('⚠️ Performance needs attention. Follow recommendations.');
    } else {
      safeLog.info('🚨 Poor performance. Immediate optimization required.');
    }

    safeLog.info('Recommendations:');
    report.recommendations.forEach((rec, index) => {
      safeLog.info(`${index + 1}. ${rec}`);
    });
  }

  exportReport(report: OptimizationReport): void {
    const reportJson = JSON.stringify(report, null, 2);
    const blob = new Blob([reportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimization-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    safeLog.info('📄 Report exported successfully!');
  }
}

// Export singleton instance
export const optimizationRunner = new OptimizationRunner();

// Convenience function to run analysis
export const runOptimizationAnalysis = async (): Promise<OptimizationReport> => {
  return optimizationRunner.runFullAnalysis();
};

// Development helper to run analysis from console
if (process.env.NODE_ENV === 'development') {
  (window as any).runOptimizationAnalysis = runOptimizationAnalysis;
  (window as any).exportOptimizationReport = (report: OptimizationReport) => {
    optimizationRunner.exportReport(report);
  };
}
