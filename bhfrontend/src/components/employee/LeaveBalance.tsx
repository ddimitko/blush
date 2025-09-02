import React from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface LeaveBalanceProps {
  annualLeaveDays: number;
  usedLeaveDays: number;
  pendingLeaveDays?: number;
  leaveYearStart?: string;
  leaveYearEnd?: string;
}

const LeaveBalance: React.FC<LeaveBalanceProps> = ({
  annualLeaveDays,
  usedLeaveDays,
  pendingLeaveDays = 0,
  leaveYearStart,
  leaveYearEnd
}) => {
  const remainingDays = Math.max(0, annualLeaveDays - usedLeaveDays);
  const availableDays = Math.max(0, remainingDays - pendingLeaveDays);
  const usagePercentage = (usedLeaveDays / annualLeaveDays) * 100;
  
  const getUsageColor = () => {
    if (usagePercentage <= 50) return 'text-green-600 bg-green-50';
    if (usagePercentage <= 80) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getUsageIcon = () => {
    if (usagePercentage <= 50) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (usagePercentage <= 80) return <Clock className="w-5 h-5 text-yellow-600" />;
    return <AlertTriangle className="w-5 h-5 text-red-600" />;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-gray-600" />
          Annual Leave Balance
        </h3>
        {getUsageIcon()}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Used: {usedLeaveDays} days</span>
          <span>Total: {annualLeaveDays} days</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${
              usagePercentage <= 50 ? 'bg-green-500' :
              usagePercentage <= 80 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          />
        </div>
        <div className="text-center text-sm text-gray-500 mt-1">
          {usagePercentage.toFixed(1)}% used
        </div>
      </div>

      {/* Leave Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{remainingDays}</div>
          <div className="text-sm text-gray-600">Remaining</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{usedLeaveDays}</div>
          <div className="text-sm text-gray-600">Used</div>
        </div>
        
        {pendingLeaveDays > 0 && (
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{pendingLeaveDays}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
        )}
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{availableDays}</div>
          <div className="text-sm text-gray-600">Available</div>
        </div>
      </div>

      {/* Leave Year Period */}
      {leaveYearStart && leaveYearEnd && (
        <div className={`p-3 rounded-lg ${getUsageColor()}`}>
          <div className="text-sm font-medium">
            Leave Year: {formatDate(leaveYearStart)} - {formatDate(leaveYearEnd)}
          </div>
        </div>
      )}

      {/* Warnings */}
      {remainingDays <= 5 && remainingDays > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
            <span className="text-sm text-yellow-800">
              Low leave balance: Only {remainingDays} days remaining
            </span>
          </div>
        </div>
      )}

      {remainingDays === 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
            <span className="text-sm text-red-800">
              No leave days remaining for this year
            </span>
          </div>
        </div>
      )}

      {pendingLeaveDays > availableDays && (
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center">
            <Clock className="w-4 h-4 text-orange-600 mr-2" />
            <span className="text-sm text-orange-800">
              Pending requests exceed available days
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveBalance;
