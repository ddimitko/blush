import React, { useState, useEffect } from 'react';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  Clock,
  BarChart3,
  User
} from 'lucide-react';
import Button from '../ui/Button';
import { SkeletonCard } from '../ui/Skeleton';

interface AbsenceAnalyticsProps {
  shopId: string;
}

interface EmployeeAbsence {
  employeeId: string;
  employeeName: string;
  absentDays: number;
  availableWorkdays: number;
  absenceRate: number;
  leaveRequestsCount: number;
  remainingLeaveDays: number;
  attendanceRate: number;
  absenceCategory: string;
}

interface AbsenceAnalytics {
  shopId: string;
  shopName: string;
  periodStart: string;
  periodEnd: string;
  totalEmployees: number;
  overallAbsenceRate: number;
  totalAbsentDays: number;
  totalAvailableWorkdays: number;
  employeeAbsenceRates: EmployeeAbsence[];
  averageAbsenceRate: number;
  employeesWithAbsence: number;
  highestAbsenceRate: number;
  lowestAbsenceRate: number;
}

// Default empty analytics data
const emptyAnalytics: AbsenceAnalytics = {
  shopId: '',
  shopName: '',
  periodStart: '',
  periodEnd: '',
  totalEmployees: 0,
  overallAbsenceRate: 0,
  totalAbsentDays: 0,
  totalAvailableWorkdays: 0,
  averageAbsenceRate: 0,
  employeesWithAbsence: 0,
  highestAbsenceRate: 0,
  lowestAbsenceRate: 0,
  employeeAbsenceRates: []
};

const AbsenceAnalyticsComponent: React.FC<AbsenceAnalyticsProps> = ({ shopId }) => {
  const [analytics, setAnalytics] = useState<AbsenceAnalytics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod, shopId]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // Import apiClient dynamically to avoid circular dependencies
      const { apiClient } = await import('../../lib/api');

      // Map frontend period to backend period
      let backendPeriod = selectedPeriod;
      if (selectedPeriod === 'thisMonth') backendPeriod = 'month';
      else if (selectedPeriod === 'thisQuarter') backendPeriod = 'quarter';
      else if (selectedPeriod === 'thisYear') backendPeriod = 'year';

      const data = await apiClient.getAbsenceAnalytics(shopId, backendPeriod);

      if (data) {
        setAnalytics(data);
      } else {
        console.warn('No absence analytics data received, using empty data');
        setAnalytics(emptyAnalytics);
      }
    } catch (error) {
      console.error('Failed to load absence analytics:', error);
      setAnalytics(emptyAnalytics);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'No Absence': return 'text-green-600 bg-green-50';
      case 'Low': return 'text-blue-600 bg-blue-50';
      case 'Moderate': return 'text-yellow-600 bg-yellow-50';
      case 'High': return 'text-orange-600 bg-orange-50';
      case 'Very High': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard className="h-32" />
        <SkeletonCard className="h-64" />
        <SkeletonCard className="h-96" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Available</h3>
        <p className="text-gray-600">Unable to load absence analytics data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Absence Analytics</h2>
          <p className="text-gray-600">Track employee absence rates and patterns</p>
        </div>
        
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
        >
          <option value="current-month">Current Month</option>
          <option value="current-quarter">Current Quarter</option>
          <option value="current-year">Current Year</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overall Absence Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatPercentage(analytics.overallAbsenceRate)}
              </p>
              <div className="flex items-center mt-2">
                {analytics.overallAbsenceRate <= 10 ? (
                  <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm ${analytics.overallAbsenceRate <= 10 ? 'text-green-600' : 'text-red-600'}`}>
                  {analytics.overallAbsenceRate <= 10 ? 'Good' : 'High'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Absent Days</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.totalAbsentDays}</p>
              <p className="text-sm text-gray-500 mt-2">
                Out of {analytics.totalAvailableWorkdays} workdays
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Employees with Absence</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {analytics.employeesWithAbsence}/{analytics.totalEmployees}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {formatPercentage((analytics.employeesWithAbsence / analytics.totalEmployees) * 100)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-yellow-50 flex items-center justify-center">
              <Users className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Absence Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatPercentage(analytics.averageAbsenceRate)}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Range: {formatPercentage(analytics.lowestAbsenceRate)} - {formatPercentage(analytics.highestAbsenceRate)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Employee Absence Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Employee Absence Breakdown</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Absent Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Absence Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remaining Leave
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics.employeeAbsenceRates.map((employee) => (
                <tr key={employee.employeeId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{employee.employeeName}</div>
                        <div className="text-sm text-gray-500">{employee.leaveRequestsCount} requests</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.absentDays}</div>
                    <div className="text-sm text-gray-500">of {employee.availableWorkdays} days</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatPercentage(employee.absenceRate)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatPercentage(employee.attendanceRate)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(employee.absenceCategory)}`}>
                      {employee.absenceCategory}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.remainingLeaveDays} days</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerts */}
      {analytics.employeeAbsenceRates.some(emp => emp.absenceRate > 20) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-red-800">High Absence Alert</h4>
              <p className="text-sm text-red-700 mt-1">
                Some employees have absence rates above 20%. Consider reviewing their workload and well-being.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AbsenceAnalyticsComponent;
