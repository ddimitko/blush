import React, { useState, useEffect } from 'react';
import { Activity, Clock, CheckCircle, AlertTriangle, BarChart3, RefreshCw } from 'lucide-react';
import { useSlotLockingMetrics } from '../../hooks/useSlotLockingMetrics';
import { useBookingUIStore } from '../../store/uiStore';
import Button from '../ui/Button';

interface SlotLockingDashboardProps {
  isVisible?: boolean;
  onClose?: () => void;
}

const SlotLockingDashboard: React.FC<SlotLockingDashboardProps> = ({
  isVisible = false,
  onClose,
}) => {
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  
  const {
    getMetrics,
    getSuccessRate,
    getFailureRateByType,
    getPerformanceTrends,
    resetMetrics,
    logMetricsSummary,
  } = useSlotLockingMetrics();

  const {
    slotStates,
    lockQueue,
    isProcessingQueue,
    retryAttempts,
    maxRetryAttempts,
  } = useBookingUIStore();

  const [metrics, setMetrics] = useState(getMetrics());
  const [successRate, setSuccessRate] = useState(getSuccessRate());
  const [failureRates, setFailureRates] = useState(getFailureRateByType());
  const [trends, setTrends] = useState(getPerformanceTrends());

  // Refresh data
  const refreshData = () => {
    setMetrics(getMetrics());
    setSuccessRate(getSuccessRate());
    setFailureRates(getFailureRateByType());
    setTrends(getPerformanceTrends());
    setLastRefresh(Date.now());
  };

  // Auto-refresh every 5 seconds when visible
  useEffect(() => {
    if (isVisible) {
      refreshData();
      const interval = setInterval(refreshData, 5000);
      setRefreshInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const getStatusColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBg = (rate: number) => {
    if (rate >= 90) return 'bg-green-100';
    if (rate >= 70) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Activity className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Slot Locking Performance Dashboard
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={refreshData}
              className="flex items-center space-x-1"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={resetMetrics}
              className="text-red-600 hover:text-red-700"
            >
              Reset
            </Button>
            {onClose && (
              <Button size="sm" variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Attempts</p>
                  <p className="text-2xl font-bold text-blue-900">{metrics.attempts}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className={`rounded-lg p-4 ${getStatusBg(successRate)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Success Rate</p>
                  <p className={`text-2xl font-bold ${getStatusColor(successRate)}`}>
                    {successRate.toFixed(1)}%
                  </p>
                </div>
                <CheckCircle className={`h-8 w-8 ${getStatusColor(successRate)}`} />
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Response</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.averageResponseTime.toFixed(0)}ms
                  </p>
                </div>
                <Clock className="h-8 w-8 text-gray-600" />
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Retries</p>
                  <p className="text-2xl font-bold text-orange-900">{metrics.retries}</p>
                </div>
                <RefreshCw className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Current State */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Active Slots */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Active Slot States</h3>
              <div className="space-y-2">
                {Array.from(slotStates.entries()).map(([slotKey, state]) => (
                  <div key={slotKey} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs text-gray-600">
                      {slotKey.split('-').slice(-1)[0]}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      state.state === 'locked' ? 'bg-green-100 text-green-800' :
                      state.state === 'locking' ? 'bg-blue-100 text-blue-800' :
                      state.state === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {state.state}
                    </span>
                  </div>
                ))}
                {slotStates.size === 0 && (
                  <p className="text-gray-500 text-sm">No active slot states</p>
                )}
              </div>
            </div>

            {/* Queue Status */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Queue Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Queue Length</span>
                  <span className="font-semibold">{lockQueue.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Processing</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    isProcessingQueue ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {isProcessingQueue ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Retry Attempts</span>
                  <span className="font-semibold">{retryAttempts}/{maxRetryAttempts}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Error Analysis */}
          {Object.keys(failureRates).length > 0 && (
            <div className="bg-red-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-900 mb-3">Error Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(failureRates).map(([errorType, rate]) => (
                  <div key={errorType} className="flex items-center justify-between">
                    <span className="text-sm text-red-700 capitalize">
                      {errorType.replace('_', ' ')}
                    </span>
                    <span className="font-semibold text-red-900">{rate.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance Trends */}
          {trends && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Performance Trends</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-blue-600">Trend</p>
                  <p className={`font-semibold capitalize ${
                    trends.trend === 'faster' ? 'text-green-600' :
                    trends.trend === 'slower' ? 'text-red-600' :
                    'text-blue-600'
                  }`}>
                    {trends.trend}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-blue-600">Recent Avg</p>
                  <p className="font-semibold text-blue-900">
                    {trends.recentAverage.toFixed(0)}ms
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-blue-600">Change</p>
                  <p className="font-semibold text-blue-900">
                    ±{trends.change.toFixed(0)}ms
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-center space-x-4">
            <Button onClick={logMetricsSummary} variant="outline">
              Log Summary to Console
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlotLockingDashboard;
