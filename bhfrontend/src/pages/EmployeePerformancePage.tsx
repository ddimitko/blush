import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Users,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import { SkeletonCard } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import { formatCurrency } from '../lib/utils';
import { useEmployeeByUserIdQuery, useEmployeePerformanceMetricsQuery } from '../hooks/queries';



const EmployeePerformancePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState('current');

  // Get employee data for current user
  const {
    data: employee,
    isLoading: isEmployeeLoading,
    error: employeeError
  } = useEmployeeByUserIdQuery(user?.id);

  // Get performance data for the employee with period filtering
  const {
    data: performanceData,
    isLoading: isPerformanceLoading,
    error: performanceError,
    refetch: refetchPerformance
  } = useEmployeePerformanceMetricsQuery(employee?.id, selectedPeriod);

  const isLoading = isEmployeeLoading || isPerformanceLoading;
  const hasError = employeeError || performanceError;

  const formatTrend = (value: number) => {
    const isPositive = value >= 0;
    const TrendIcon = isPositive ? TrendingUp : TrendingDown;
    const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
    
    return (
      <div className={`flex items-center ${colorClass}`}>
        <TrendIcon className="w-4 h-4 mr-1" />
        <span className="text-sm font-medium">
          {isPositive ? '+' : ''}{value.toFixed(1)}%
        </span>
      </div>
    );
  };

  const performanceMetrics = useMemo(() => {
    if (!performanceData?.metrics) return [];

    const metrics = performanceData.metrics;
    const completionRate = metrics.totalAppointments > 0
      ? (metrics.completedAppointments / metrics.totalAppointments) * 100
      : 0;

    return [
      {
        title: 'Total Appointments',
        value: metrics.totalAppointments || 0,
        trend: 0, // TODO: Calculate trend when historical data is available
        icon: Calendar,
        color: 'blue'
      },
      {
        title: 'Completion Rate',
        value: `${completionRate.toFixed(1)}%`,
        trend: 0, // TODO: Calculate trend when historical data is available
        icon: CheckCircle,
        color: 'green'
      },
      {
        title: 'Total Revenue',
        value: formatCurrency(metrics.totalRevenue || 0, employee?.shop?.country),
        trend: 0, // TODO: Calculate trend when historical data is available
        icon: DollarSign,
        color: 'purple'
      },
      {
        title: 'Average Rating',
        value: (metrics.averageRating || 0).toFixed(1),
        trend: 0, // TODO: Calculate trend when historical data is available
        icon: Star,
        color: 'yellow'
      }
    ];
  }, [performanceData, employee?.shop?.country]);

  const getIconColor = (color: string) => {
    const colors = {
      blue: 'text-blue-600 bg-blue-50',
      green: 'text-green-600 bg-green-50',
      purple: 'text-purple-600 bg-purple-50',
      yellow: 'text-yellow-600 bg-yellow-50'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <SkeletonCard className="h-24" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonCard key={index} className="h-32" />
            ))}
          </div>
          <SkeletonCard className="h-96" />
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <ErrorState
            variant="server"
            error={hasError}
            onRetry={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <EmptyState
            variant="general"
            title="Employee Profile Not Found"
            description="You need to have an active employee profile to view performance metrics."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                icon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => navigate('/employee/dashboard')}
              >
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Performance Overview</h1>
                <p className="text-gray-600">Track your performance metrics and trends</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              >
                <option value="current">Current Month</option>
                <option value="last">Last Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Performance Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {performanceMetrics.map((metric, index) => {
            const IconComponent = metric.icon;
            return (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                    <div className="mt-2">
                      {formatTrend(metric.trend)}
                    </div>
                  </div>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getIconColor(metric.color)}`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Performance Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Appointment Statistics */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Statistics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Appointments</span>
                <span className="font-semibold">{performanceData?.metrics?.totalAppointments || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Completed</span>
                <span className="font-semibold text-green-600">{performanceData?.metrics?.completedAppointments || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Cancelled</span>
                <span className="font-semibold text-red-600">{performanceData?.metrics?.cancelledAppointments || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">No Shows</span>
                <span className="font-semibold text-orange-600">{performanceData?.metrics?.noShowAppointments || 0}</span>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Completion Rate</span>
                  <span className="font-semibold text-green-600">
                    {performanceData?.metrics?.totalAppointments > 0
                      ? ((performanceData.metrics.completedAppointments / performanceData.metrics.totalAppointments) * 100).toFixed(1)
                      : '0.0'
                    }%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue & Customer Satisfaction */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue & Satisfaction</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Revenue</span>
                <span className="font-semibold">{formatCurrency(performanceData?.metrics?.totalRevenue || 0, employee?.shop?.country)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Average Service Value</span>
                <span className="font-semibold">{formatCurrency(performanceData?.metrics?.averageServiceValue || 0, employee?.shop?.country)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Average Rating</span>
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-400 mr-1" />
                  <span className="font-semibold">{(performanceData?.metrics?.averageRating || 0).toFixed(1)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Reviews</span>
                <span className="font-semibold">{performanceData?.metrics?.totalReviews || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance & Schedule */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance & Schedule</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{performanceData?.metrics?.daysWorked || 0}</div>
              <div className="text-sm text-gray-600">Days Worked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{performanceData?.metrics?.daysOff || 0}</div>
              <div className="text-sm text-gray-600">Days Off</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {performanceData?.metrics?.utilizationRate ? performanceData.metrics.utilizationRate.toFixed(1) : '0.0'}%
              </div>
              <div className="text-sm text-gray-600">Utilization Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {performanceData?.metrics?.absenceRate ? performanceData.metrics.absenceRate.toFixed(1) : '0.0'}%
              </div>
              <div className="text-sm text-gray-600">Absence Rate</div>
            </div>
          </div>

          {/* Personal Absence Analytics */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-md font-medium text-gray-900 mb-4">Personal Absence Analytics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Absence Days</span>
                  <span className="text-lg font-semibold text-gray-900">{performanceData?.metrics?.totalAbsenceDays || 0}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">This period</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Remaining Leave Days</span>
                  <span className="text-lg font-semibold text-gray-900">{performanceData?.metrics?.remainingLeaveDays || 25}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">Annual allowance</div>
              </div>
            </div>

            {/* Absence Rate Status */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Absence Rate Status</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  (performanceData?.metrics?.absenceRate || 0) <= 5
                    ? 'bg-green-100 text-green-800'
                    : (performanceData?.metrics?.absenceRate || 0) <= 10
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {(performanceData?.metrics?.absenceRate || 0) <= 5
                    ? 'Excellent'
                    : (performanceData?.metrics?.absenceRate || 0) <= 10
                    ? 'Good'
                    : 'Needs Attention'}
                </span>
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    (performanceData?.metrics?.absenceRate || 0) <= 5
                      ? 'bg-green-500'
                      : (performanceData?.metrics?.absenceRate || 0) <= 10
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min((performanceData?.metrics?.absenceRate || 0), 20) * 5}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>20%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeePerformancePage;
