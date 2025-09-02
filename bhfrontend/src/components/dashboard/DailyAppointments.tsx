import React, { useMemo } from 'react';
import { Clock, User, Phone, Mail, DollarSign, Calendar, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Appointment } from '../../types';
import { formatCurrency, formatTime } from '../../lib/utils';
import AppointmentStatusButton from '../appointments/AppointmentStatusButton';


interface DailyAppointmentsProps {
  date: Date;
  appointments: Appointment[];
  onClose: () => void;
  onAppointmentClick?: (appointment: Appointment) => void;
  className?: string;
  shopCountry?: string;
  highlightedAppointmentId?: string;
}

const DailyAppointments: React.FC<DailyAppointmentsProps> = ({
  date,
  appointments,
  onClose,
  onAppointmentClick,
  className,
  shopCountry,
  highlightedAppointmentId
}) => {
  const { formattedDate, appointmentsByEmployee } = useMemo(() => {
    const formatted = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Group appointments by employee with error handling
    const grouped: Record<string, Appointment[]> = {};

    if (appointments && Array.isArray(appointments)) {
      appointments.forEach(appointment => {
        try {
          // Ensure appointment has required employee data
          if (!appointment?.employee?.id) {
            console.warn('Invalid appointment data - missing employee:', appointment);
            return;
          }

          const employeeId = appointment.employee.id;
          if (!grouped[employeeId]) {
            grouped[employeeId] = [];
          }
          grouped[employeeId].push(appointment);
        } catch (error) {
          console.error('Error processing appointment in daily view:', appointment, error);
        }
      });
    }

    // Sort appointments by time within each employee group
    Object.keys(grouped).forEach(employeeId => {
      grouped[employeeId].sort((a, b) =>
        new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime()
      );
    });

    return {
      formattedDate: formatted,
      appointmentsByEmployee: grouped
    };
  }, [date, appointments]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const totalAppointments = appointments.length;
  const totalRevenue = appointments
    .filter(apt => apt.status.toLowerCase() !== 'cancelled')
    .reduce((sum, apt) => sum + apt.totalAmount, 0);

  if (appointments.length === 0) {
    return (
      <div className={cn("bg-white rounded-lg border border-gray-200 p-6", className)}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">{formattedDate}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments scheduled</h3>
          <p className="text-gray-600">This day is free of appointments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{formattedDate}</h2>
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{totalAppointments} appointments</span>
            </div>
            <div className="flex items-center space-x-1">
              <DollarSign className="w-4 h-4" />
              <span>{formatCurrency(totalRevenue, shopCountry)}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Appointments by Employee */}
      <div className="p-6 space-y-6">
        {Object.entries(appointmentsByEmployee).map(([employeeId, employeeAppointments]) => {
          const employee = employeeAppointments[0].employee;
          
          return (
            <div key={employeeId} className="space-y-4">
              {/* Employee Header */}
              <div className="flex items-center space-x-3 pb-3 border-b border-gray-100">
                <div className="w-10 h-10 bg-accent-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-accent-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim()}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {employeeAppointments.length} appointment{employeeAppointments.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Employee's Appointments */}
              <div className="space-y-3">
                {employeeAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    onClick={() => onAppointmentClick?.(appointment)}
                    className={cn(
                      "p-4 rounded-lg border transition-all duration-200",
                      "hover:shadow-md hover:border-gray-300",
                      onAppointmentClick && "cursor-pointer",
                      highlightedAppointmentId === appointment.id
                        ? "border-accent-500 bg-accent-50 shadow-md"
                        : "border-gray-200"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        {/* Time and Service */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2 text-sm font-medium text-gray-900">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <span>{formatTime(appointment.appointmentDateTime)} - {formatTime(appointment.endDateTime)}</span>
                            </div>
                            <span className="text-gray-400">•</span>
                            <span className="text-sm font-medium text-gray-900">
                              {appointment.service.name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-semibold text-gray-900">
                              {formatCurrency(appointment.totalAmount, shopCountry)}
                            </span>
                            <span className={cn(
                              "px-2 py-1 text-xs font-medium rounded-full border",
                              getStatusColor(appointment.status)
                            )}>
                              {appointment.status}
                            </span>
                          </div>
                        </div>

                        {/* Customer Info */}
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4" />
                            <span>{appointment.customerName}</span>
                          </div>
                          {appointment.customerPhone && (
                            <div className="flex items-center space-x-2">
                              <Phone className="w-4 h-4" />
                              <span>{appointment.customerPhone}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4" />
                            <span>{appointment.customerEmail}</span>
                          </div>
                        </div>

                        {/* Notes */}
                        {appointment.notes && (
                          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                            <strong>Notes:</strong> {appointment.notes}
                          </div>
                        )}

                        {/* Status Action Button */}
                        <div className="flex justify-end pt-3">
                          <AppointmentStatusButton
                            appointmentId={appointment.id}
                            currentStatus={appointment.status}
                            size="sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DailyAppointments;
