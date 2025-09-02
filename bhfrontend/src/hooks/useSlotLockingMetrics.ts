import { useCallback, useRef, useEffect } from 'react';
import { useBookingUIStore } from '../store/uiStore';

interface SlotLockMetrics {
  attempts: number;
  successes: number;
  failures: number;
  retries: number;
  averageResponseTime: number;
  errorTypes: Record<string, number>;
  performanceData: {
    timestamp: number;
    responseTime: number;
    success: boolean;
    errorType?: string;
  }[];
}

interface SlotLockAttempt {
  slotKey: string;
  startTime: number;
  endTime?: number;
  success?: boolean;
  error?: string;
  retryCount?: number;
}

export const useSlotLockingMetrics = () => {
  const metricsRef = useRef<SlotLockMetrics>({
    attempts: 0,
    successes: 0,
    failures: 0,
    retries: 0,
    averageResponseTime: 0,
    errorTypes: {},
    performanceData: [],
  });

  const activeAttemptsRef = useRef<Map<string, SlotLockAttempt>>(new Map());

  // Start tracking a slot lock attempt
  const startAttempt = useCallback((slotKey: string, isRetry: boolean = false) => {
    const attempt: SlotLockAttempt = {
      slotKey,
      startTime: Date.now(),
      retryCount: isRetry ? 1 : 0,
    };

    activeAttemptsRef.current.set(slotKey, attempt);
    
    metricsRef.current.attempts++;
    if (isRetry) {
      metricsRef.current.retries++;
    }

    console.log('📊 METRICS: Started tracking slot lock attempt', { slotKey, isRetry });
  }, []);

  // End tracking a slot lock attempt
  const endAttempt = useCallback((slotKey: string, success: boolean, error?: string) => {
    const attempt = activeAttemptsRef.current.get(slotKey);
    if (!attempt) {
      console.warn('📊 METRICS: No active attempt found for slot', slotKey);
      return;
    }

    const endTime = Date.now();
    const responseTime = endTime - attempt.startTime;

    // Update attempt
    attempt.endTime = endTime;
    attempt.success = success;
    attempt.error = error;

    // Update metrics
    if (success) {
      metricsRef.current.successes++;
    } else {
      metricsRef.current.failures++;
      
      if (error) {
        const errorType = categorizeError(error);
        metricsRef.current.errorTypes[errorType] = (metricsRef.current.errorTypes[errorType] || 0) + 1;
      }
    }

    // Update performance data
    metricsRef.current.performanceData.push({
      timestamp: endTime,
      responseTime,
      success,
      errorType: error ? categorizeError(error) : undefined,
    });

    // Keep only last 100 performance data points
    if (metricsRef.current.performanceData.length > 100) {
      metricsRef.current.performanceData = metricsRef.current.performanceData.slice(-100);
    }

    // Update average response time
    const totalResponseTime = metricsRef.current.performanceData.reduce((sum, data) => sum + data.responseTime, 0);
    metricsRef.current.averageResponseTime = totalResponseTime / metricsRef.current.performanceData.length;

    // Remove from active attempts
    activeAttemptsRef.current.delete(slotKey);

    console.log('📊 METRICS: Ended tracking slot lock attempt', { 
      slotKey, 
      success, 
      responseTime, 
      error: error || 'none' 
    });
  }, []);

  // Categorize errors for better analytics
  const categorizeError = (error: string): string => {
    if (error.includes('already locked') || error.includes('already taken')) {
      return 'slot_conflict';
    }
    if (error.includes('network') || error.includes('timeout')) {
      return 'network_error';
    }
    if (error.includes('unauthorized') || error.includes('forbidden')) {
      return 'auth_error';
    }
    if (error.includes('server') || error.includes('500')) {
      return 'server_error';
    }
    return 'unknown_error';
  };

  // Get current metrics
  const getMetrics = useCallback((): SlotLockMetrics => {
    return { ...metricsRef.current };
  }, []);

  // Get success rate
  const getSuccessRate = useCallback((): number => {
    const total = metricsRef.current.attempts;
    if (total === 0) return 0;
    return (metricsRef.current.successes / total) * 100;
  }, []);

  // Get failure rate by error type
  const getFailureRateByType = useCallback((): Record<string, number> => {
    const total = metricsRef.current.failures;
    if (total === 0) return {};

    const rates: Record<string, number> = {};
    Object.entries(metricsRef.current.errorTypes).forEach(([type, count]) => {
      rates[type] = (count / total) * 100;
    });

    return rates;
  }, []);

  // Get performance trends
  const getPerformanceTrends = useCallback(() => {
    const data = metricsRef.current.performanceData;
    if (data.length < 2) return null;

    const recent = data.slice(-10); // Last 10 attempts
    const older = data.slice(-20, -10); // Previous 10 attempts

    const recentAvg = recent.reduce((sum, d) => sum + d.responseTime, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((sum, d) => sum + d.responseTime, 0) / older.length : recentAvg;

    const trend = recentAvg > olderAvg ? 'slower' : recentAvg < olderAvg ? 'faster' : 'stable';
    const change = Math.abs(recentAvg - olderAvg);

    return {
      trend,
      change,
      recentAverage: recentAvg,
      previousAverage: olderAvg,
    };
  }, []);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      attempts: 0,
      successes: 0,
      failures: 0,
      retries: 0,
      averageResponseTime: 0,
      errorTypes: {},
      performanceData: [],
    };
    activeAttemptsRef.current.clear();
    console.log('📊 METRICS: Reset all metrics');
  }, []);

  // Log metrics summary
  const logMetricsSummary = useCallback(() => {
    const metrics = getMetrics();
    const successRate = getSuccessRate();
    const trends = getPerformanceTrends();

    console.log('📊 METRICS SUMMARY:', {
      attempts: metrics.attempts,
      successes: metrics.successes,
      failures: metrics.failures,
      retries: metrics.retries,
      successRate: `${successRate.toFixed(1)}%`,
      averageResponseTime: `${metrics.averageResponseTime.toFixed(0)}ms`,
      errorTypes: metrics.errorTypes,
      trends,
    });
  }, [getMetrics, getSuccessRate, getPerformanceTrends]);

  // Auto-log summary every 10 attempts
  useEffect(() => {
    if (metricsRef.current.attempts > 0 && metricsRef.current.attempts % 10 === 0) {
      logMetricsSummary();
    }
  }, [logMetricsSummary]);

  return {
    startAttempt,
    endAttempt,
    getMetrics,
    getSuccessRate,
    getFailureRateByType,
    getPerformanceTrends,
    resetMetrics,
    logMetricsSummary,
  };
};
