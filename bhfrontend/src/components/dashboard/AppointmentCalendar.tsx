import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Users, Clock, Filter, X } from 'lucide-react';
import { cn, formatDate, formatTime } from '../../lib/utils';
import { getUserTimezone, isToday } from '../../lib/timezone';
import { Appointment, Employee } from '../../types';
import Button from '../ui/Button';
import { apiClient } from '../../lib/api';

interface EmployeeAbsence {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string;
  status: string;
  calculatedLeaveDays: number;
}

interface AppointmentCalendarProps {
  appointments: Appointment[];
  employees: Employee[];
  onDateSelect: (date: Date, employeeId?: string) => void;
  selectedDate?: Date | null;
  className?: string;
  shopId?: string;
  hideEmployeeFilter?: boolean; // New prop to hide employee filter for employee-specific views
  currentEmployeeId?: string; // For employee dashboard - only show this employee's absences
}

const AppointmentCalendar: React.FC<AppointmentCalendarProps> = ({
  appointments,
  employees,
  onDateSelect,
  selectedDate,
  className,
  shopId,
  hideEmployeeFilter = false,
  currentEmployeeId
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [employeeAbsences, setEmployeeAbsences] = useState<EmployeeAbsence[]>([]);
  const [showEmployeeFilter, setShowEmployeeFilter] = useState(false);

  // Close employee filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showEmployeeFilter && !target.closest('[data-employee-filter]')) {
        setShowEmployeeFilter(false);
      }
    };

    if (showEmployeeFilter) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showEmployeeFilter]);

  const { daysInMonth, firstDayOfMonth, monthName, year } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    return {
      daysInMonth: lastDay.getDate(),
      firstDayOfMonth: firstDay.getDay(),
      monthName: firstDay.toLocaleDateString('en-US', { month: 'long' }),
      year: year
    };
  }, [currentDate]);

  // Load employee absences for the current month
  useEffect(() => {
    const loadEmployeeAbsences = async () => {
      if (!shopId) return;

      try {
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const absences = await apiClient.getEmployeeAbsences(shopId, {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          status: 'APPROVED'
        });

        console.log('📅 CALENDAR: Loaded absences:', absences);
        setEmployeeAbsences(absences);
      } catch (error) {
        console.error('Failed to load employee absences:', error);
        setEmployeeAbsences([]);
      }
    };

    loadEmployeeAbsences();
  }, [shopId, currentDate]);

  // Filter appointments by selected employee
  const filteredAppointments = useMemo(() => {
    if (!selectedEmployeeId) return appointments;
    return appointments.filter(apt => apt.employee?.id === selectedEmployeeId);
  }, [appointments, selectedEmployeeId]);

  // Filter absences by selected employee or current employee (for employee dashboard)
  const filteredAbsences = useMemo(() => {
    let absences = employeeAbsences;

    // If this is an employee dashboard (currentEmployeeId provided), only show that employee's absences
    if (currentEmployeeId) {
      absences = absences.filter(absence => absence.employeeId === currentEmployeeId);
    }

    // Further filter by selected employee if one is selected
    if (selectedEmployeeId) {
      absences = absences.filter(absence => absence.employeeId === selectedEmployeeId);
    }

    return absences;
  }, [employeeAbsences, selectedEmployeeId, currentEmployeeId]);

  const appointmentsByDate = useMemo(() => {
    const grouped: Record<string, { employeeId: string; count: number; employeeName: string }[]> = {};

    // Add null/undefined checks and error handling
    if (!filteredAppointments || !Array.isArray(filteredAppointments)) {
      return grouped;
    }

    filteredAppointments.forEach(appointment => {
      try {
        // Ensure appointment has required fields
        if (!appointment?.appointmentDateTime || !appointment?.employee?.id) {
          console.warn('Invalid appointment data:', appointment);
          return;
        }

        const date = new Date(appointment.appointmentDateTime).toDateString();
        if (!grouped[date]) {
          grouped[date] = [];
        }

        const existingEmployee = grouped[date].find(e => e.employeeId === appointment.employee.id);
        if (existingEmployee) {
          existingEmployee.count++;
        } else {
          // Safely get employee name with fallbacks
          const employeeName = appointment.employee.fullName ||
                              `${appointment.employee.firstName || ''} ${appointment.employee.lastName || ''}`.trim() ||
                              'Unknown Employee';

          grouped[date].push({
            employeeId: appointment.employee.id,
            count: 1,
            employeeName
          });
        }
      } catch (error) {
        console.error('Error processing appointment:', appointment, error);
      }
    });

    return grouped;
  }, [filteredAppointments]);

  // Check if a date has employee absences
  const hasEmployeeAbsence = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];

    return filteredAbsences.some(absence => {
      const startDate = new Date(absence.startDate);
      const endDate = new Date(absence.endDate);
      return date >= startDate && date <= endDate;
    });
  };

  // Get absences for a specific date
  const getDateAbsences = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];

    return filteredAbsences.filter(absence => {
      const startDate = new Date(absence.startDate);
      const endDate = new Date(absence.endDate);
      return date >= startDate && date <= endDate;
    });
  };

  // Get absence pills for consecutive days with improved logic
  const getAbsencePills = () => {
    const pills: Array<{
      absence: EmployeeAbsence;
      startDay: number;
      endDay: number;
      gridStartPos: number;
      gridEndPos: number;
      row: number;
      isFirstSegment: boolean;
      isLastSegment: boolean;
      totalSegments: number;
      segmentIndex: number;
    }> = [];

    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    filteredAbsences.forEach(absence => {
      const startDate = new Date(absence.startDate);
      const endDate = new Date(absence.endDate);

      // Only process absences that overlap with current month
      if (startDate <= monthEnd && endDate >= monthStart) {
        // Clamp to current month boundaries
        const clampedStart = startDate < monthStart ? monthStart : startDate;
        const clampedEnd = endDate > monthEnd ? monthEnd : endDate;

        const startDay = clampedStart.getDate();
        const endDay = clampedEnd.getDate();

        // Calculate grid positions (0-based)
        const startGridPos = firstDayOfMonth + startDay - 1;
        const endGridPos = firstDayOfMonth + endDay - 1;

        const startRow = Math.floor(startGridPos / 7);
        const endRow = Math.floor(endGridPos / 7);

        const segments: Array<{
          startPos: number;
          endPos: number;
          row: number;
          isFirst: boolean;
          isLast: boolean;
        }> = [];

        if (startRow === endRow) {
          // Single row
          segments.push({
            startPos: startGridPos,
            endPos: endGridPos,
            row: startRow,
            isFirst: true,
            isLast: true
          });
        } else {
          // Multi-row - create segments
          // First row
          segments.push({
            startPos: startGridPos,
            endPos: (startRow + 1) * 7 - 1,
            row: startRow,
            isFirst: true,
            isLast: false
          });

          // Middle rows
          for (let row = startRow + 1; row < endRow; row++) {
            segments.push({
              startPos: row * 7,
              endPos: (row + 1) * 7 - 1,
              row,
              isFirst: false,
              isLast: false
            });
          }

          // Last row
          if (endRow > startRow) {
            segments.push({
              startPos: endRow * 7,
              endPos: endGridPos,
              row: endRow,
              isFirst: false,
              isLast: true
            });
          }
        }

        // Convert segments to pills
        segments.forEach((segment, index) => {
          const startCol = segment.startPos % 7;
          const endCol = segment.endPos % 7;
          const spanCols = endCol - startCol + 1;

          pills.push({
            absence,
            startDay: startDay + (segment.startPos - startGridPos),
            endDay: startDay + (segment.endPos - startGridPos),
            gridStartPos: segment.startPos,
            gridEndPos: segment.endPos,
            row: segment.row,
            isFirstSegment: segment.isFirst,
            isLastSegment: segment.isLast,
            totalSegments: segments.length,
            segmentIndex: index
          });
        });
      }
    });

    return pills;
  };

  // Check if a date is the start of an absence
  const isAbsenceStart = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];

    return filteredAbsences.some(absence => {
      return absence.startDate === dateStr;
    });
  };

  // Check if a date is the end of an absence
  const isAbsenceEnd = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];

    return filteredAbsences.some(absence => {
      return absence.endDate === dateStr;
    });
  };

  // Handle absence click - navigate to leave requests page
  const handleAbsenceClick = (absenceId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    // Navigate to leave requests page with the absence highlighted
    window.location.href = `/owner/leave-requests?highlight=${absenceId}`;
  };

  // Get all unique absences that span across the current month
  const getMonthAbsences = () => {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    return filteredAbsences.filter(absence => {
      const startDate = new Date(absence.startDate);
      const endDate = new Date(absence.endDate);
      // Include absences that overlap with the current month
      return startDate <= monthEnd && endDate >= monthStart;
    });
  };

  // Calculate the position and width of absence bars
  const getAbsenceBarStyle = (absence: EmployeeAbsence) => {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(absence.startDate);
    const endDate = new Date(absence.endDate);

    // Clamp dates to current month
    const clampedStart = startDate < monthStart ? monthStart : startDate;
    const clampedEnd = endDate > monthEnd ? monthEnd : endDate;

    const startDay = clampedStart.getDate();
    const endDay = clampedEnd.getDate();
    const daysInMonth = monthEnd.getDate();

    // Calculate position and width as percentages
    const startPercent = ((startDay - 1) / daysInMonth) * 100;
    const endPercent = (endDay / daysInMonth) * 100;
    const widthPercent = endPercent - startPercent;

    return {
      left: `${startPercent}%`,
      width: `${widthPercent}%`
    };
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && 
           today.getMonth() === currentDate.getMonth() && 
           today.getFullYear() === currentDate.getFullYear();
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return selectedDate.getDate() === day && 
           selectedDate.getMonth() === currentDate.getMonth() && 
           selectedDate.getFullYear() === currentDate.getFullYear();
  };

  const getDayAppointments = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return appointmentsByDate[date.toDateString()] || [];
  };

  const renderCalendarDay = (day: number) => {
    const dayAppointments = getDayAppointments(day);
    const hasAppointments = dayAppointments.length > 0;
    const totalAppointments = dayAppointments.reduce((sum, emp) => sum + emp.count, 0);
    const hasAbsence = hasEmployeeAbsence(day);
    const dateAbsences = getDateAbsences(day);
    const isAbsStart = isAbsenceStart(day);
    const isAbsEnd = isAbsenceEnd(day);

    return (
      <button
        key={day}
        onClick={() => {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          onDateSelect(date);
        }}
        className={cn(
          "relative w-full aspect-square p-2 text-sm transition-all duration-200",
          "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-1",
          "border border-transparent rounded-lg",
          isToday(day) && "bg-accent-50 border-accent-200 text-accent-900 font-semibold",
          isSelected(day) && "bg-accent-100 border-accent-300 text-accent-900",
          hasAppointments && !isToday(day) && !isSelected(day) && "bg-blue-50 border-blue-200",
          hasAbsence && !hasAppointments && !isToday(day) && !isSelected(day) && "bg-red-50 border-red-200",
          hasAbsence && hasAppointments && !isToday(day) && !isSelected(day) && "bg-orange-50 border-orange-200",
          !hasAppointments && !hasAbsence && "text-gray-700 hover:text-gray-900"
        )}
        aria-label={`${monthName} ${day}, ${year}${hasAppointments ? ` - ${totalAppointments} appointment${totalAppointments !== 1 ? 's' : ''}` : ''}${hasAbsence ? ` - ${dateAbsences.length} employee${dateAbsences.length !== 1 ? 's' : ''} on leave` : ''}`}
        aria-pressed={isSelected(day)}
      >
        <span className="block">{day}</span>

        {/* Appointments indicator */}
        {hasAppointments && (
          <div className="absolute bottom-1 left-1 right-1">
            <div className="flex items-center justify-center space-x-1">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                isToday(day) || isSelected(day) ? "bg-accent-600" : "bg-blue-500"
              )} />
              <span className={cn(
                "text-xs font-medium",
                isToday(day) || isSelected(day) ? "text-accent-700" : "text-blue-600"
              )}>
                {totalAppointments}
              </span>
            </div>

            {dayAppointments.length > 1 && (
              <div className="flex justify-center mt-0.5 space-x-0.5">
                {dayAppointments.slice(0, 3).map((emp, index) => (
                  <div
                    key={emp.employeeId}
                    className={cn(
                      "w-1 h-1 rounded-full",
                      isToday(day) || isSelected(day) ? "bg-accent-500" : "bg-blue-400"
                    )}
                  />
                ))}
                {dayAppointments.length > 3 && (
                  <div className={cn(
                    "w-1 h-1 rounded-full",
                    isToday(day) || isSelected(day) ? "bg-accent-300" : "bg-blue-300"
                  )} />
                )}
              </div>
            )}
          </div>
        )}

        {/* Simple absence indicator dot */}
        {hasAbsence && (
          <div
            className={cn(
              "absolute top-1 right-1 w-2 h-2 rounded-full",
              hasAppointments ? "bg-orange-400" : "bg-red-400"
            )}
            title={dateAbsences.map(abs => `${abs.employeeName}: ${abs.leaveType}${abs.reason ? ` - ${abs.reason}` : ''}`).join('\n')}
          />
        )}
      </button>
    );
  };

  const renderEmptyDay = (index: number) => (
    <div key={`empty-${index}`} className="w-full aspect-square" />
  );

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 shadow-sm", className)}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {monthName} {year}
          </h2>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Employee Filter - Hidden for employee-specific views */}
          {!hideEmployeeFilter && (
            <div className="relative" data-employee-filter>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowEmployeeFilter(!showEmployeeFilter);
              }}
              icon={<Filter className="w-4 h-4" />}
              className={selectedEmployeeId ? 'bg-blue-50 border-blue-200' : ''}
            >
              {selectedEmployeeId
                ? employees.find(e => e.id === selectedEmployeeId)?.fullName ||
                  employees.find(e => e.id === selectedEmployeeId)?.name ||
                  `${employees.find(e => e.id === selectedEmployeeId)?.firstName || ''} ${employees.find(e => e.id === selectedEmployeeId)?.lastName || ''}`.trim() ||
                  'Employee'
                : 'All Employees'
              }
            </Button>

            {showEmployeeFilter && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="p-2">
                  <button
                    onClick={() => {
                      setSelectedEmployeeId(null);
                      setShowEmployeeFilter(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                      !selectedEmployeeId ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50"
                    )}
                  >
                    All Employees
                  </button>
                  {employees.map(employee => (
                    <button
                      key={employee.id}
                      onClick={() => {
                        setSelectedEmployeeId(employee.id);
                        setShowEmployeeFilter(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                        selectedEmployeeId === employee.id ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50"
                      )}
                    >
                      {employee.fullName || employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee'}
                    </button>
                  ))}
                </div>
              </div>
            )}
            </div>
          )}

          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>{selectedEmployeeId ? 'Filtered' : 'All'} Appointments</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>{employees?.length || 0} Employee{employees?.length !== 1 ? 's' : ''}</span>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-gray-400">
                Debug: {employees?.length || 0} employees, {filteredAbsences?.length || 0}/{employeeAbsences?.length || 0} absences
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days Container */}
        <div className="relative">
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDayOfMonth }, (_, index) => renderEmptyDay(index))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }, (_, index) => renderCalendarDay(index + 1))}
          </div>

          {/* Absence Pills Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {getAbsencePills().map((pill, index) => {
              const totalCells = firstDayOfMonth + daysInMonth;
              const totalRows = Math.ceil(totalCells / 7);

              const startCol = pill.gridStartPos % 7;
              const endCol = pill.gridEndPos % 7;
              const spanCols = endCol - startCol + 1;

              // Calculate precise positioning
              const cellWidth = 100 / 7; // percentage
              const cellHeight = 100 / totalRows; // percentage
              const gapSize = 0.25; // rem converted to percentage approximation

              const left = startCol * cellWidth + (startCol * gapSize);
              const top = pill.row * cellHeight + (pill.row * gapSize);
              const width = spanCols * cellWidth + ((spanCols - 1) * gapSize);

              // Determine pill styling based on segment position
              const isConnected = pill.totalSegments > 1;
              const roundedClass = isConnected
                ? pill.isFirstSegment
                  ? 'rounded-l-full rounded-r-sm'
                  : pill.isLastSegment
                  ? 'rounded-r-full rounded-l-sm'
                  : 'rounded-sm'
                : 'rounded-full';

              return (
                <div
                  key={`${pill.absence.id}-${pill.row}-${index}`}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${width}%`,
                    height: `${cellHeight}%`,
                    zIndex: 20
                  }}
                >
                  <div className="relative h-full flex items-end p-1">
                    <div
                      className={cn(
                        "w-full px-2 py-1 text-xs font-medium bg-red-100 text-red-800 border border-red-200",
                        "hover:bg-red-200 transition-all duration-200 cursor-pointer pointer-events-auto",
                        "shadow-sm hover:shadow-md transform hover:scale-105",
                        "flex items-center justify-center text-center",
                        roundedClass
                      )}
                      title={`${pill.absence.employeeName}: ${pill.absence.leaveType} (${pill.absence.startDate} to ${pill.absence.endDate})${pill.absence.reason ? ` - ${pill.absence.reason}` : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAbsenceClick(pill.absence.id, e);
                      }}
                    >
                      <span className="truncate">
                        {pill.isFirstSegment || !isConnected
                          ? `${pill.absence.employeeName.split(' ')[0]} - ${pill.absence.leaveType}`
                          : '···'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Absence Summary */}
        {getMonthAbsences().length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-sm font-medium text-red-800">
                  {getMonthAbsences().length} absence{getMonthAbsences().length !== 1 ? 's' : ''} this month
                </span>
              </div>
              <button
                onClick={() => window.location.href = '/owner/leave-requests'}
                className="text-xs text-red-600 hover:text-red-800 underline"
              >
                View all
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredAppointments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium">
              {selectedEmployeeId ? 'No appointments for selected employee' : 'No appointments scheduled'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {selectedEmployeeId ? 'Try selecting a different employee or view all employees' : 'Appointments will appear here when scheduled'}
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-accent-500 rounded-full" />
              <span>Today</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>Has Appointments</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-400 rounded-full" />
              <span>Employee Absence (click for details)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full" />
              <span>Appointments + Absence</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Click date to view details</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentCalendar;
