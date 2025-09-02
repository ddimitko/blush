import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Calendar, 
  User, 
  Shield, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Zap
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useBookingUIStore } from '../../store/uiStore';
import { Employee, Service } from '../../types';
import { format, isAfter, isBefore, addMinutes, isToday, isTomorrow } from 'date-fns';
import Button from '../ui/Button';

interface PreventionRule {
  id: string;
  type: 'block' | 'warn' | 'confirm';
  priority: number;
  title: string;
  message: string;
  icon: React.ReactNode;
  check: () => boolean;
  action?: () => void;
  actionLabel?: string;
}

interface BookingPreventionSystemProps {
  selectedService: Service | null;
  selectedEmployee: Employee | null;
  selectedDate: string | null;
  selectedSlot: any | null;
  onPreventionChange: (canProceed: boolean, blockers: PreventionRule[], warnings: PreventionRule[]) => void;
  children: React.ReactNode;
}

const BookingPreventionSystem: React.FC<BookingPreventionSystemProps> = ({
  selectedService,
  selectedEmployee,
  selectedDate,
  selectedSlot,
  onPreventionChange,
  children
}) => {
  const { user, isAuthenticated } = useAuth();
  const { currentLockSessionId } = useBookingUIStore();
  const [acknowledgedWarnings, setAcknowledgedWarnings] = useState<Set<string>>(new Set());
  const [isChecking, setIsChecking] = useState(false);

  const preventionRules: PreventionRule[] = [
    // BLOCKING RULES (prevent booking entirely)
    {
      id: 'employee-self-booking',
      type: 'block',
      priority: 1,
      title: 'Self-Booking Prohibited',
      message: 'Employees cannot book appointments for themselves. Please use a different account or log out.',
      icon: <Shield className="h-5 w-5" />,
      check: () => {
        return isAuthenticated && 
               user && 
               selectedEmployee && 
               user.id === selectedEmployee.user?.id;
      },
      action: () => {
        if (window.confirm('Would you like to log out to book as a guest?')) {
          window.location.href = '/logout';
        }
      },
      actionLabel: 'Log Out'
    },
    {
      id: 'past-appointment',
      type: 'block',
      priority: 2,
      title: 'Invalid Time',
      message: 'Cannot book appointments in the past. Please select a future time slot.',
      icon: <Clock className="h-5 w-5" />,
      check: () => {
        if (!selectedDate || !selectedSlot) return false;
        // Properly handle UTC time from backend
        const appointmentDateTime = new Date(`${selectedDate}T${selectedSlot.startTime || selectedSlot.time}Z`);
        return isBefore(appointmentDateTime, new Date());
      }
    },
    {
      id: 'service-employee-mismatch',
      type: 'block',
      priority: 3,
      title: 'Service Unavailable',
      message: 'The selected specialist cannot perform this service. Please choose a different specialist.',
      icon: <User className="h-5 w-5" />,
      check: () => {
        if (!selectedService || !selectedEmployee) return false;
        const employeeServices = selectedEmployee.services || [];
        return !employeeServices.some(service => service.id === selectedService.id);
      }
    },
    {
      id: 'expired-slot-lock',
      type: 'block',
      priority: 4,
      title: 'Slot Lock Expired',
      message: 'Your time slot reservation has expired. Please select the time slot again.',
      icon: <Shield className="h-5 w-5" />,
      check: () => {
        return selectedDate && selectedSlot && !currentLockSessionId;
      },
      action: () => {
        window.location.reload();
      },
      actionLabel: 'Refresh Page'
    },

    // WARNING RULES (show warnings but allow booking)
    {
      id: 'short-notice',
      type: 'warn',
      priority: 5,
      title: 'Short Notice Booking',
      message: 'This appointment is less than 2 hours away. The shop may need more notice for preparation.',
      icon: <Clock className="h-5 w-5" />,
      check: () => {
        if (!selectedDate || !selectedSlot) return false;
        // Properly handle UTC time from backend
        const appointmentDateTime = new Date(`${selectedDate}T${selectedSlot.startTime || selectedSlot.time}Z`);
        const twoHoursFromNow = addMinutes(new Date(), 120);
        return isAfter(twoHoursFromNow, appointmentDateTime) && isAfter(appointmentDateTime, new Date());
      }
    },
    {
      id: 'same-day-booking',
      type: 'warn',
      priority: 6,
      title: 'Same Day Booking',
      message: 'You\'re booking for today. Please ensure the shop can accommodate same-day appointments.',
      icon: <Calendar className="h-5 w-5" />,
      check: () => {
        if (!selectedDate) return false;
        return isToday(new Date(selectedDate));
      }
    },
    {
      id: 'weekend-booking',
      type: 'warn',
      priority: 7,
      title: 'Weekend Appointment',
      message: 'This is a weekend appointment. Please confirm the shop operates on weekends.',
      icon: <Calendar className="h-5 w-5" />,
      check: () => {
        if (!selectedDate) return false;
        const appointmentDate = new Date(selectedDate);
        const dayOfWeek = appointmentDate.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
      }
    },
    {
      id: 'early-morning',
      type: 'warn',
      priority: 8,
      title: 'Early Morning Appointment',
      message: 'This is an early morning appointment. Please confirm the shop opens this early.',
      icon: <Clock className="h-5 w-5" />,
      check: () => {
        if (!selectedSlot) return false;
        const time = selectedSlot.startTime || selectedSlot.time;
        const hour = parseInt(time.split(':')[0]);
        return hour < 8; // Before 8 AM
      }
    },
    {
      id: 'late-evening',
      type: 'warn',
      priority: 9,
      title: 'Late Evening Appointment',
      message: 'This is a late evening appointment. Please confirm the shop stays open this late.',
      icon: <Clock className="h-5 w-5" />,
      check: () => {
        if (!selectedSlot) return false;
        const time = selectedSlot.startTime || selectedSlot.time;
        const hour = parseInt(time.split(':')[0]);
        return hour >= 19; // After 7 PM
      }
    },

    // CONFIRMATION RULES (require explicit confirmation)
    {
      id: 'far-future',
      type: 'confirm',
      priority: 10,
      title: 'Far Future Booking',
      message: 'This appointment is more than 3 months away. Are you sure this is correct?',
      icon: <Calendar className="h-5 w-5" />,
      check: () => {
        if (!selectedDate) return false;
        const appointmentDate = new Date(selectedDate);
        const threeMonthsFromNow = addMinutes(new Date(), 3 * 30 * 24 * 60); // Approximate 3 months
        return isAfter(appointmentDate, threeMonthsFromNow);
      }
    }
  ];

  useEffect(() => {
    checkPreventionRules();
  }, [selectedService, selectedEmployee, selectedDate, selectedSlot, currentLockSessionId, user, acknowledgedWarnings]);

  const checkPreventionRules = async () => {
    setIsChecking(true);
    
    // Small delay to simulate checking
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const activeRules = preventionRules.filter(rule => rule.check());
    
    const blockers = activeRules.filter(rule => rule.type === 'block');
    const warnings = activeRules.filter(rule => 
      rule.type === 'warn' && !acknowledgedWarnings.has(rule.id)
    );
    const confirmations = activeRules.filter(rule => 
      rule.type === 'confirm' && !acknowledgedWarnings.has(rule.id)
    );
    
    // Treat unacknowledged confirmations as blockers
    const allBlockers = [...blockers, ...confirmations];
    
    const canProceed = allBlockers.length === 0;
    
    onPreventionChange(canProceed, allBlockers, warnings);
    setIsChecking(false);
  };

  const acknowledgeWarning = (ruleId: string) => {
    setAcknowledgedWarnings(prev => {
      const newSet = new Set(prev);
      newSet.add(ruleId);
      return newSet;
    });
  };

  const acknowledgeAllWarnings = () => {
    const warningIds = preventionRules
      .filter(rule => rule.type === 'warn' || rule.type === 'confirm')
      .map(rule => rule.id);
    setAcknowledgedWarnings(prev => {
      const newSet = new Set(prev);
      warningIds.forEach(id => newSet.add(id));
      return newSet;
    });
  };

  const getRuleColor = (type: PreventionRule['type']) => {
    switch (type) {
      case 'block':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'warn':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'confirm':
        return 'border-blue-200 bg-blue-50 text-blue-800';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  const getRuleIconColor = (type: PreventionRule['type']) => {
    switch (type) {
      case 'block':
        return 'text-red-600';
      case 'warn':
        return 'text-yellow-600';
      case 'confirm':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const activeRules = preventionRules.filter(rule => rule.check());
  const blockers = activeRules.filter(rule => rule.type === 'block');
  const warnings = activeRules.filter(rule => 
    rule.type === 'warn' && !acknowledgedWarnings.has(rule.id)
  );
  const confirmations = activeRules.filter(rule => 
    rule.type === 'confirm' && !acknowledgedWarnings.has(rule.id)
  );

  const hasActiveIssues = blockers.length > 0 || warnings.length > 0 || confirmations.length > 0;

  return (
    <div className="space-y-6">
      {/* Prevention Issues */}
      {hasActiveIssues && (
        <div className="space-y-3">
          {/* Blockers */}
          {blockers.map((rule) => (
            <div
              key={rule.id}
              className={`border rounded-2xl p-4 ${getRuleColor(rule.type)}`}
            >
              <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 ${getRuleIconColor(rule.type)}`}>
                  {rule.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold mb-1 flex items-center">
                    <XCircle className="h-4 w-4 mr-1" />
                    {rule.title}
                  </h4>
                  <p className="text-sm mb-2">
                    {rule.message}
                  </p>
                  {rule.action && rule.actionLabel && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={rule.action}
                    >
                      {rule.actionLabel}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Confirmations */}
          {confirmations.map((rule) => (
            <div
              key={rule.id}
              className={`border rounded-2xl p-4 ${getRuleColor(rule.type)}`}
            >
              <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 ${getRuleIconColor(rule.type)}`}>
                  {rule.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold mb-1 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    {rule.title}
                  </h4>
                  <p className="text-sm mb-3">
                    {rule.message}
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => acknowledgeWarning(rule.id)}
                    >
                      Yes, Continue
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.history.back()}
                    >
                      Go Back
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Warnings */}
          {warnings.map((rule) => (
            <div
              key={rule.id}
              className={`border rounded-2xl p-4 ${getRuleColor(rule.type)}`}
            >
              <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 ${getRuleIconColor(rule.type)}`}>
                  {rule.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold mb-1 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    {rule.title}
                  </h4>
                  <p className="text-sm mb-2">
                    {rule.message}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => acknowledgeWarning(rule.id)}
                    icon={<CheckCircle className="h-4 w-4" />}
                  >
                    I Understand
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* Acknowledge All Button */}
          {(warnings.length > 1 || confirmations.length > 1) && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={acknowledgeAllWarnings}
                icon={<Zap className="h-4 w-4" />}
              >
                Acknowledge All Warnings
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Loading State - Hidden to avoid interrupting user flow */}
      {/* {isChecking && (
        <div className="flex items-center justify-center py-4">
          <RefreshCw className="h-5 w-5 animate-spin text-accent-600 mr-2" />
          <span className="text-sm text-neutral-600">Validating booking...</span>
        </div>
      )} */}

      {/* Content (show if no blockers, regardless of checking state) */}
      {blockers.length === 0 && confirmations.length === 0 && children}
    </div>
  );
};

export default BookingPreventionSystem;
