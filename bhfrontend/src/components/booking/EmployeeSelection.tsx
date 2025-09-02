import React, { useMemo, useCallback } from 'react';
import { Star, Award, User, Lock, ArrowLeft } from 'lucide-react';
import { Employee } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { getAvatarUrl, getInitials } from '../../lib/utils';
import { useBookingUIStore } from '../../store/uiStore';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

interface EmployeeSelectionProps {
  employees: Employee[];
  selectedEmployee: Employee | null;
  onEmployeeSelect: (employee: Employee) => void;
  onBack?: () => void;
}

const EmployeeSelection: React.FC<EmployeeSelectionProps> = ({
  employees,
  selectedEmployee,
  onEmployeeSelect,
  onBack,
}) => {
  const { setSelectedEmployee } = useBookingUIStore();
  const { user, isAuthenticated } = useAuth();

  // Fetch current user's employee data to properly identify self-selection
  const { data: currentUserEmployeeData } = useQuery({
    queryKey: ['employee', 'current-user', user?.id],
    queryFn: () => apiClient.getEmployeeByUserId(user!.id),
    enabled: isAuthenticated && !!user?.id && (user.role === 'EMPLOYEE' || (user.role as string) === 'ROLE_EMPLOYEE'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false
  });

  const handleEmployeeSelect = (employee: Employee) => {
    // Prevent self-booking for authenticated employees
    if (isAuthenticated && user && employee.user?.id === user.id) {
      console.warn('🚫 Self-booking prevented for employee:', user.id);
      alert('You cannot book an appointment for yourself. Please log out or use a different account.');
      return; // Do nothing if trying to select themselves
    }

    // Additional check using employee ID if user has employeeId
    if (isAuthenticated && user && (user as any).employeeId && employee.id === (user as any).employeeId) {
      console.warn('🚫 Self-booking prevented via employee ID:', employee.id);
      alert('You cannot book an appointment for yourself. Please log out or use a different account.');
      return;
    }

    console.log('✅ Employee selection allowed:', {
      selectedEmployee: employee.fullName || employee.name,
      currentUser: user?.email
    });

    setSelectedEmployee(employee);
    onEmployeeSelect(employee);
  };

  // Memoize current user's employee IDs to avoid recalculation
  const currentUserEmployeeIds = useMemo(() => {
    if (!currentUserEmployeeData) return [];

    return Array.isArray(currentUserEmployeeData) ?
      currentUserEmployeeData.map((emp: any) => String(emp.id || emp.employeeId)) :
      [String(currentUserEmployeeData.id || currentUserEmployeeData.employeeId)];
  }, [currentUserEmployeeData]);

  // Memoize the self-check function to prevent repeated calls
  const isEmployeeSelf = useCallback((employee: Employee) => {
    if (!isAuthenticated || !user) return false;

    // Check via user.id comparison (string comparison)
    const isSelfViaUserId = employee.user?.id && user.id && String(employee.user.id) === String(user.id);

    // Check via employeeId if available (string comparison)
    const userEmployeeId = (user as any).employeeId;
    const isSelfViaEmployeeId = userEmployeeId && employee.id && String(employee.id) === String(userEmployeeId);

    // Check via email comparison as fallback
    const isSelfViaEmail = employee.user?.email && user.email && employee.user.email === user.email;

    // Check using fetched employee data
    const isSelfViaFetchedData = currentUserEmployeeIds.includes(String(employee.id));

    const isSelf = isSelfViaUserId || isSelfViaEmployeeId || isSelfViaEmail || isSelfViaFetchedData;

    // Only log once per employee (when isSelf is true or for debugging)
    if (isSelf || employee.id === 'd8ce238f-6cf4-414d-948d-06ca224899e4') {
      console.log('🔍 Employee self-check DETAILED:', {
        isAuthenticated,
        user: {
          id: user?.id,
          email: user?.email,
          employeeId: userEmployeeId,
          role: user?.role
        },
        employee: {
          id: employee.id,
          name: employee.fullName || employee.name,
          userId: employee.user?.id,
          userEmail: employee.user?.email
        },
        currentUserEmployeeData,
        currentUserEmployeeIds,
        comparisons: {
          isSelfViaUserId: `${employee.user?.id} === ${user.id} = ${isSelfViaUserId}`,
          isSelfViaEmployeeId: `${employee.id} === ${userEmployeeId} = ${isSelfViaEmployeeId}`,
          isSelfViaEmail: `${employee.user?.email} === ${user.email} = ${isSelfViaEmail}`,
          isSelfViaFetchedData: `${employee.id} in [${currentUserEmployeeIds.join(', ')}] = ${isSelfViaFetchedData}`,
          finalResult: isSelf
        }
      });
    }

    return isSelf;
  }, [isAuthenticated, user, currentUserEmployeeIds, currentUserEmployeeData]);

  // Memoize available employees (excluding self) for "Any Available" option
  const availableEmployees = useMemo(() => {
    return employees.filter(emp => !isEmployeeSelf(emp));
  }, [employees, isEmployeeSelf]);

  if (employees.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-lg">
        <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Available Staff
        </h3>
        <p className="text-gray-600">
          No staff members are available for the selected service at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      {/* Arrow Left Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center text-neutral-600 hover:text-accent-600 mb-6 transition-colors duration-300 group"
        >
          <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
          <span className="font-medium">Back</span>
        </button>
      )}

      <div className="mb-8">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-accent-100 rounded-lg mr-3">
            <Award className="h-6 w-6 text-accent-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-neutral-800">
              Choose Your Specialist
            </h3>
            <p className="text-neutral-600 text-sm">
              Select your preferred beauty expert
            </p>
          </div>
        </div>
        <p className="text-neutral-600">
          Our skilled professionals are here to provide you with exceptional service and personalized care
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        {employees.map((employee) => {
          const isSelf = isEmployeeSelf(employee);

          return (
            <div
              key={employee.id}
              className={`
                group border rounded-2xl p-6 transition-all duration-500 transform relative
                ${isSelf
                  ? 'border-red-200 bg-red-50 cursor-not-allowed opacity-60 pointer-events-none'
                  : selectedEmployee?.id === employee.id
                    ? 'border-accent-500 bg-gradient-to-br from-accent-50 to-accent-100 shadow-xl ring-2 ring-accent-500 ring-opacity-30 scale-[1.02] -translate-y-1 cursor-pointer'
                    : 'border-neutral-200 hover:border-accent-300 hover:bg-gradient-to-br hover:from-accent-50/30 hover:to-accent-100/30 hover:shadow-lg bg-white cursor-pointer hover:scale-[1.02] hover:-translate-y-1'
                }
              `}
              onClick={() => !isSelf && handleEmployeeSelect(employee)}
            >
            <div className="flex items-start space-x-4">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {employee.avatar ? (
                  <img
                    src={getAvatarUrl(employee.avatar)}
                    alt={employee.fullName || employee.name || 'Employee'}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center ring-2 ring-accent-200">
                    <span className="text-lg font-medium text-accent-700">
                      {getInitials(
                        (employee.fullName || employee.name || '').split(' ')[0] || '',
                        (employee.fullName || employee.name || '').split(' ')[1] || ''
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Employee Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center mb-2">
                  <h4 className={`text-lg font-semibold transition-colors duration-300 ${
                    isSelf ? 'text-red-600' : 'text-neutral-800 group-hover:text-accent-700'
                  }`}>
                    {employee.fullName || employee.name || 'Unknown Employee'}
                  </h4>
                  {isSelf && (
                    <div className="ml-2 flex items-center text-red-600">
                      <Lock className="h-4 w-4 mr-1" />
                      <span className="text-xs font-medium">You</span>
                    </div>
                  )}
                </div>

                {employee.specialties && (
                  <p className="text-neutral-600 text-sm mb-3 group-hover:text-neutral-700 transition-colors duration-300">
                    {employee.specialties}
                  </p>
                )}

                <div className="flex items-center space-x-4 text-sm text-neutral-600 group-hover:text-accent-600 transition-colors duration-300">
                  {employee.yearsExperience && (
                    <div className="flex items-center">
                      <Award className="h-4 w-4 mr-1 text-accent-500" />
                      {employee.yearsExperience} years exp.
                    </div>
                  )}

                  {/* Mock rating - you can add this to your Employee model */}
                  <div className="flex items-center">
                    <Star className="h-4 w-4 mr-1 text-accent-500 fill-current" />
                    4.8
                  </div>
                </div>

                {employee.bio && !isSelf && (
                  <p className="text-neutral-600 text-sm mt-3 line-clamp-2 group-hover:text-neutral-700 transition-colors duration-300">
                    {employee.bio}
                  </p>
                )}

                {isSelf && (
                  <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm font-medium">
                      Employees cannot book appointments for themselves
                    </p>
                    <p className="text-red-600 text-xs mt-1">
                      Please log out or use a different account to book an appointment
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        })}
      </div>
      
      {/* Any Employee Option */}
      <div className="mt-8">
        <div
          className={`
            group border rounded-2xl p-6 cursor-pointer transition-all duration-500 transform hover:scale-[1.02] hover:-translate-y-1
            border-neutral-200 hover:border-accent-300 hover:bg-gradient-to-br hover:from-accent-50/30 hover:to-accent-100/30 hover:shadow-lg bg-white
          `}
          onClick={() => {
            // Select the first available employee as "any" (but not self)
            if (availableEmployees.length > 0) {
              handleEmployeeSelect(availableEmployees[0]);
            }
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-accent-100 rounded-full mr-4">
                <User className="h-6 w-6 text-accent-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-neutral-800 mb-1 group-hover:text-accent-700 transition-colors duration-300">
                  Any Available Specialist
                </h4>
                <p className="text-neutral-600 text-sm group-hover:text-neutral-700 transition-colors duration-300">
                  We'll assign the next available specialist for your appointment
                </p>
              </div>
            </div>
            <div className="text-sm text-accent-600 font-medium bg-accent-100 px-3 py-1 rounded-full">
              Fastest booking
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeSelection;
