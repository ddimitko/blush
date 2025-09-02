import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';
import { apiClient } from '../../lib/api';

interface BookingCalendarProps {
  shopId: string;
  employeeId: string;
  serviceId: string;
  selectedDate?: string;
  onDateSelect: (date: string) => void;
  className?: string;
  currentAppointmentDate?: string; // For edit mode - shows the currently booked date
}

interface EmployeeAvailability {
  date: string;
  hasAvailableSlots: boolean;
  isWorkingDay: boolean;
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({
  shopId,
  employeeId,
  serviceId,
  selectedDate,
  onDateSelect,
  className,
  currentAppointmentDate
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availability, setAvailability] = useState<EmployeeAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  // Note: Employee leave status is not checked for customer-facing calendar
  // Customers should only see availability based on working hours and existing appointments

  // Load employee availability for the current month
  useEffect(() => {
    const loadAvailability = async () => {
      if (!shopId || !employeeId || !serviceId) return;

      setIsLoading(true);
      try {
        // Get month boundaries for availability checking
        // const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        // const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        // Get availability for each day in the month
        const availabilityPromises = [];
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          // Use local date formatting to avoid timezone issues
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const dayStr = String(date.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${dayStr}`;
          
          // Skip past dates
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (date < today) {
            availabilityPromises.push(Promise.resolve({
              date: dateStr,
              hasAvailableSlots: false,
              isWorkingDay: false
            }));
            continue;
          }

          // Check availability only (no leave status for customers)
          availabilityPromises.push(
            apiClient.getAvailableSlots({
              shopId,
              serviceId,
              employeeId,
              date: dateStr,
            }).then(slots => ({
              date: dateStr,
              hasAvailableSlots: slots && slots.length > 0,
              isWorkingDay: true
            })).catch(error => ({
              date: dateStr,
              hasAvailableSlots: false,
              isWorkingDay: false
            }))
          );
        }

        const monthAvailability = await Promise.all(availabilityPromises);
        setAvailability(monthAvailability);
      } catch (error) {
        console.error('Failed to load availability:', error);
        setAvailability([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAvailability();
  }, [currentDate, shopId, employeeId, serviceId, daysInMonth]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        // Don't allow going to previous months if it would show past dates
        const prevMonth = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
        const today = new Date();
        if (prevMonth.getFullYear() < today.getFullYear() || 
            (prevMonth.getFullYear() === today.getFullYear() && prevMonth.getMonth() < today.getMonth())) {
          return prev; // Don't navigate to past months
        }
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        // Limit to 3 months in advance
        const nextMonth = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
        const maxDate = new Date();
        maxDate.setMonth(maxDate.getMonth() + 3);
        if (nextMonth > maxDate) {
          return prev; // Don't navigate beyond 3 months
        }
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
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    // Use local date formatting to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayStr = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    return selectedDate === dateStr;
  };

  const isCurrentAppointment = (day: number) => {
    if (!currentAppointmentDate) return false;
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    // Use local date formatting to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayStr = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    return currentAppointmentDate === dateStr;
  };

  const isPastDate = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const getDateAvailability = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    // Use local date formatting to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayStr = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    return availability.find(a => a.date === dateStr);
  };

  const canNavigatePrev = () => {
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const today = new Date();
    return prevMonth.getFullYear() > today.getFullYear() || 
           (prevMonth.getFullYear() === today.getFullYear() && prevMonth.getMonth() >= today.getMonth());
  };

  const canNavigateNext = () => {
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);
    return nextMonth <= maxDate;
  };

  const renderCalendarDay = (day: number) => {
    const dateAvailability = getDateAvailability(day);
    const isPast = isPastDate(day);
    const hasSlots = dateAvailability?.hasAvailableSlots || false;
    const isWorkingDay = dateAvailability?.isWorkingDay || false;
    const isCurrentAppt = isCurrentAppointment(day);

    return (
      <button
        key={day}
        onClick={() => {
          if (!isPast && hasSlots) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            // Use local date formatting to avoid timezone issues
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const dayStr = String(date.getDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${dayStr}`;
            console.log('📅 Calendar date selected:', { day, dateString, originalDate: date });
            onDateSelect(dateString);
          }
        }}
        disabled={isPast || !hasSlots || isLoading}
        className={cn(
          "relative w-full aspect-square p-2 text-sm transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-1",
          "border border-transparent rounded-lg",
          // Selected state
          isSelected(day) && "bg-accent-600 text-white border-accent-700 shadow-md",
          // Current appointment date (special styling)
          isCurrentAppt && !isSelected(day) && "bg-blue-100 border-blue-300 text-blue-900 ring-2 ring-blue-200",
          // Today indicator
          isToday(day) && !isSelected(day) && !isCurrentAppt && "ring-2 ring-accent-200",
          // Available dates
          !isPast && hasSlots && !isSelected(day) && !isCurrentAppt && "hover:bg-accent-50 border-accent-200 text-accent-900 cursor-pointer",
          // Working day but no slots
          !isPast && isWorkingDay && !hasSlots && !isSelected(day) && !isCurrentAppt && "bg-gray-50 text-gray-400 border-gray-200",
          // Past dates
          isPast && "text-gray-300 cursor-not-allowed",
          // Non-working days
          !isPast && !isWorkingDay && "text-gray-300 cursor-not-allowed",
          // Loading state
          isLoading && "animate-pulse"
        )}
        aria-label={`${monthName} ${day}, ${year}${isCurrentAppt ? ' - Current appointment' : hasSlots ? ' - Available' : isPast ? ' - Past date' : ' - Unavailable'}`}
        aria-pressed={isSelected(day)}
      >
        <span className="block">{day}</span>

        {/* Current appointment indicator */}
        {isCurrentAppt && (
          <div className="absolute top-1 left-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full" />
          </div>
        )}

        {/* Availability indicator */}
        {!isPast && isWorkingDay && !isCurrentAppt && (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              hasSlots ? (isSelected(day) ? "bg-white" : "bg-accent-500") : "bg-gray-300"
            )} />
          </div>
        )}

        {/* Today indicator */}
        {isToday(day) && !isSelected(day) && !isCurrentAppt && (
          <div className="absolute top-1 right-1">
            <div className="w-2 h-2 bg-accent-500 rounded-full" />
          </div>
        )}
      </button>
    );
  };

  const renderEmptyDay = (index: number) => (
    <div key={`empty-${index}`} className="aspect-square" />
  );

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 shadow-sm", className)}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            {monthName} {year}
          </h3>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => navigateMonth('prev')}
            disabled={!canNavigatePrev()}
            className={cn(
              "p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500",
              canNavigatePrev() 
                ? "hover:bg-gray-100 text-gray-600" 
                : "text-gray-300 cursor-not-allowed"
            )}
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigateMonth('next')}
            disabled={!canNavigateNext()}
            className={cn(
              "p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500",
              canNavigateNext()
                ? "hover:bg-gray-100 text-gray-600"
                : "text-gray-300 cursor-not-allowed"
            )}
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
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

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month starts */}
          {Array.from({ length: firstDayOfMonth }, (_, index) => renderEmptyDay(index))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }, (_, index) => renderCalendarDay(index + 1))}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-600 flex-wrap">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-accent-500 rounded-full" />
              <span>Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-300 rounded-full" />
              <span>Unavailable</span>
            </div>
            {currentAppointmentDate && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full" />
                <span>Current Appointment</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 border-2 border-accent-500 rounded-full" />
              <span>Today</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingCalendar;
