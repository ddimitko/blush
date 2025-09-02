import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Calendar, User, Shield, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useBookingUIStore } from '../../store/uiStore';
import { Employee, Service } from '../../types';
import { format, isAfter, isBefore, addMinutes, startOfDay, endOfDay } from 'date-fns';

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: () => void;
  actionLabel?: string;
}

interface AppointmentValidationGuardProps {
  selectedService: Service | null;
  selectedEmployee: Employee | null;
  selectedDate: string | null;
  selectedSlot: any | null;
  onValidationChange: (isValid: boolean, issues: ValidationIssue[]) => void;
  children: React.ReactNode;
}

const AppointmentValidationGuard: React.FC<AppointmentValidationGuardProps> = ({
  selectedService,
  selectedEmployee,
  selectedDate,
  selectedSlot,
  onValidationChange,
  children
}) => {
  const { user, isAuthenticated } = useAuth();
  const { currentLockSessionId } = useBookingUIStore();
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const issues = validateAppointmentData();
    setValidationIssues(issues);

    const hasErrors = issues.some(issue => issue.type === 'error');
    const valid = !hasErrors;
    setIsValid(valid);

    onValidationChange(valid, issues);
  }, [selectedService, selectedEmployee, selectedDate, selectedSlot, currentLockSessionId, user, isAuthenticated, onValidationChange]);

  const validateAppointmentData = (): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    // 1. Prevent employee self-booking
    if (isAuthenticated && user && selectedEmployee) {
      if (user.id === selectedEmployee.user?.id) {
        issues.push({
          type: 'error',
          icon: <Shield className="h-5 w-5" />,
          title: 'Self-Booking Not Allowed',
          message: 'Employees cannot book appointments for themselves. Please log out or use a different account.',
          action: () => {
            // Could trigger logout or account switch
            window.location.href = '/logout';
          },
          actionLabel: 'Switch Account'
        });
      }
    }

    // 2. Validate appointment timing
    if (selectedDate && selectedSlot) {
      // Properly handle UTC time from backend
      const appointmentDateTime = new Date(`${selectedDate}T${selectedSlot.startTime || selectedSlot.time}Z`);
      const now = new Date();

      // Check if appointment is in the past
      if (isBefore(appointmentDateTime, now)) {
        issues.push({
          type: 'error',
          icon: <Clock className="h-5 w-5" />,
          title: 'Invalid Time',
          message: 'Cannot book appointments in the past. Please select a future time slot.',
        });
      }

      // Check if appointment is too far in the future (e.g., more than 6 months)
      const sixMonthsFromNow = addMinutes(now, 6 * 30 * 24 * 60); // Approximate 6 months
      if (isAfter(appointmentDateTime, sixMonthsFromNow)) {
        issues.push({
          type: 'warning',
          icon: <Calendar className="h-5 w-5" />,
          title: 'Far Future Booking',
          message: 'This appointment is more than 6 months away. Please confirm this is correct.',
        });
      }

      // Check if booking is too close to current time (less than 1 hour notice)
      const oneHourFromNow = addMinutes(now, 60);
      if (isAfter(oneHourFromNow, appointmentDateTime)) {
        issues.push({
          type: 'warning',
          icon: <Clock className="h-5 w-5" />,
          title: 'Short Notice Booking',
          message: 'This appointment is less than 1 hour away. The shop may need more notice.',
        });
      }
    }

    // 3. Validate service and employee compatibility
    if (selectedService && selectedEmployee) {
      const employeeServices = selectedEmployee.services || [];
      const canPerformService = employeeServices.some(service => service.id === selectedService.id);
      
      if (!canPerformService) {
        issues.push({
          type: 'error',
          icon: <User className="h-5 w-5" />,
          title: 'Service Mismatch',
          message: `${selectedEmployee.fullName || selectedEmployee.name} cannot perform ${selectedService.name}. Please select a different specialist.`,
        });
      }
    }

    // 4. Validate slot lock status
    if (selectedDate && selectedSlot && !currentLockSessionId) {
      issues.push({
        type: 'error',
        icon: <Shield className="h-5 w-5" />,
        title: 'Slot Lock Expired',
        message: 'Your time slot reservation has expired. Please select the time slot again to continue.',
      });
    }

    // 5. Check for weekend bookings (if shop has restrictions)
    if (selectedDate) {
      const appointmentDate = new Date(selectedDate);
      const dayOfWeek = appointmentDate.getDay();
      
      // Check if it's a weekend (Saturday = 6, Sunday = 0)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        issues.push({
          type: 'info',
          icon: <Calendar className="h-5 w-5" />,
          title: 'Weekend Appointment',
          message: 'This is a weekend appointment. Please confirm the shop is open on this day.',
        });
      }
    }

    // 6. Validate guest information completeness
    if (!isAuthenticated && selectedService && selectedEmployee && selectedDate && selectedSlot) {
      issues.push({
        type: 'info',
        icon: <User className="h-5 w-5" />,
        title: 'Guest Booking',
        message: 'You\'re booking as a guest. You\'ll need to provide contact information in the next step.',
      });
    }

    // 7. Check for potential double booking (if user has other appointments)
    if (isAuthenticated && selectedDate && selectedSlot) {
      // This would require an API call to check user's existing appointments
      // For now, we'll add a warning
      issues.push({
        type: 'info',
        icon: <CheckCircle className="h-5 w-5" />,
        title: 'Booking Validation',
        message: 'We\'ll check for scheduling conflicts when you confirm your booking.',
      });
    }

    return issues;
  };

  const getIssueColor = (type: ValidationIssue['type']) => {
    switch (type) {
      case 'error':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'info':
        return 'border-blue-200 bg-blue-50 text-blue-800';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  const getIssueIconColor = (type: ValidationIssue['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  if (validationIssues.length === 0) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-6">
      {/* Validation Issues */}
      <div className="space-y-3">
        {validationIssues.map((issue, index) => (
          <div
            key={index}
            className={`border rounded-2xl p-4 ${getIssueColor(issue.type)}`}
          >
            <div className="flex items-start space-x-3">
              <div className={`flex-shrink-0 ${getIssueIconColor(issue.type)}`}>
                {issue.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold mb-1">
                  {issue.title}
                </h4>
                <p className="text-sm">
                  {issue.message}
                </p>
                {issue.action && issue.actionLabel && (
                  <button
                    onClick={issue.action}
                    className="mt-2 text-sm font-medium underline hover:no-underline"
                  >
                    {issue.actionLabel}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content (only show if no errors) */}
      {isValid && children}
    </div>
  );
};

export default AppointmentValidationGuard;
