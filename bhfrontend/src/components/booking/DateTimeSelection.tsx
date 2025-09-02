import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, Clock, Lock, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useBookingUIStore } from '../../store/uiStore';
import {
  useAvailableSlotsQuery,
} from '../../hooks/queries';
import { useOptimisticSlotLocking } from '../../hooks/useOptimisticSlotLocking';
import { AvailableSlot } from '../../types';
import { formatTime } from '../../lib/utils';
import { convertSlotTimesToLocal, getUserTimezone } from '../../lib/timezone';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import BookingCalendar from './BookingCalendar';
import EnhancedSlotButton from './EnhancedSlotButton';
import LockExtensionManager from './LockExtensionManager';

interface SlotSubscription {
  shopId: string;
  serviceId: string;
  employeeId: string;
  date: string;
}

interface DateTimeSelectionProps {
  onDateTimeSelect: () => void;
  shopId?: string;
  onBack?: () => void;
}

const DateTimeSelection: React.FC<DateTimeSelectionProps> = ({
  onDateTimeSelect,
  shopId,
  onBack,
}) => {
  const [showCalendar, setShowCalendar] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    selectedService,
    selectedEmployee,
    selectedDate,
    selectedSlot,
    currentLockSessionId,
    bookedSlots,
    setSelectedDate,
    setSelectedSlot,
    getSlotState,
    clearError,
  } = useBookingUIStore();

  const { lockSlotOptimistic, unlockSlotOptimistic, isLocking } = useOptimisticSlotLocking();

  // React Query hooks for slot data
  const {
    data: availableSlots = [],
    isLoading: isLoadingSlots,
    error,
    refetch: refetchSlots,
  } = useAvailableSlotsQuery({
    shopId,
    serviceId: selectedService?.id,
    employeeId: selectedEmployee?.id,
    date: selectedDate,
  });

  // Generate slot key for state tracking
  const generateSlotKey = useCallback((slot: AvailableSlot) => {
    return `${shopId}-${selectedService?.id}-${selectedEmployee?.id}-${slot.dateTime || `${selectedDate}T${slot.startTime || slot.time}:00`}`;
  }, [shopId, selectedService?.id, selectedEmployee?.id, selectedDate]);

  // Validation for required fields
  const validateSelection = () => {
    console.log('🔍 VALIDATION: Checking selection', {
      selectedService: !!selectedService,
      selectedEmployee: !!selectedEmployee,
      selectedDate: !!selectedDate,
      selectedSlot: !!selectedSlot,
      currentLockSessionId: !!currentLockSessionId,
      serviceId: selectedService?.id,
      employeeId: selectedEmployee?.id,
      slotTime: selectedSlot?.startTime || selectedSlot?.time
    });

    if (!selectedService) {
      console.error('❌ VALIDATION: Missing service');
      setValidationError('Please select a service first');
      return false;
    }
    if (!selectedEmployee) {
      console.error('❌ VALIDATION: Missing employee');
      setValidationError('Please select an employee first');
      return false;
    }
    if (!selectedDate) {
      console.error('❌ VALIDATION: Missing date');
      setValidationError('Please select a date');
      return false;
    }
    if (!selectedSlot) {
      console.error('❌ VALIDATION: Missing slot');
      setValidationError('Please select a time slot');
      return false;
    }
    if (!currentLockSessionId) {
      console.error('❌ VALIDATION: Missing lock session');
      setValidationError('Slot lock has expired. Please select a time slot again.');
      return false;
    }
    // Clear any validation errors if everything is valid
    setValidationError(null);
    console.log('✅ VALIDATION: All checks passed');
    return true;
  };

  // Hide calendar when date is selected
  useEffect(() => {
    if (selectedDate) {
      setShowCalendar(false);
      setValidationError(null);
    }
  }, [selectedDate]);

  // Clear validation errors when key dependencies change
  useEffect(() => {
    setValidationError(null);
  }, [selectedService, selectedEmployee, selectedSlot]);

  // Note: WebSocket subscription is now handled by BookingPage.tsx to avoid duplicate subscriptions
  // This component only handles the UI for date/time selection

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null); // Clear any previously selected slot
    setValidationError(null);
  };

  const handleBackToCalendar = () => {
    setShowCalendar(true);
    setSelectedDate(null);
    setSelectedSlot(null);
    setValidationError(null);
  };

  // Handle slot selection with optimistic locking
  const handleSlotSelect = async (slot: AvailableSlot) => {
    const slotKey = generateSlotKey(slot);
    const slotState = getSlotState(slotKey);

    console.log('🎯 SLOT SELECT: Starting optimistic slot selection', {
      slot: slot.startTime || slot.time,
      slotState: slotState.state,
      isLocking
    });

    // Don't allow selection if slot is in a transitional state
    if (slotState.state === 'locking' || slotState.state === 'unlocking' || slotState.state === 'retrying') {
      console.log('🚫 SLOT SELECT: Slot in transitional state', slotState.state);
      return;
    }

    // Clear any previous validation errors
    setValidationError(null);
    clearError();

    // Check if this is the same slot that's already selected
    const isSameSlot = selectedSlot && (
      (selectedSlot.startTime || selectedSlot.time) === (slot.startTime || slot.time) ||
      selectedSlot.dateTime === slot.dateTime
    );

    // If user clicks the same slot that's already locked, proceed to next step
    if (isSameSlot && currentLockSessionId) {
      console.log('🔄 SLOT SELECT: Same slot clicked, proceeding to next step');

      if (selectedService && selectedEmployee && selectedDate && selectedSlot && currentLockSessionId) {
        console.log('✅ SLOT SELECT: Same slot validation passed, calling onDateTimeSelect');
        setValidationError(null);
        onDateTimeSelect();
      } else {
        console.error('❌ SLOT SELECT: Same slot validation failed');
        setValidationError('Booking state is incomplete. Please refresh and try again.');
      }
      return;
    }

    try {
      // If there's already a selected slot, unlock it first
      if (selectedSlot && currentLockSessionId && selectedDate) {
        console.log('🔓 SLOT SELECT: Unlocking previous slot');
        await unlockSlotOptimistic({
          shopId: shopId!,
          serviceId: selectedService!.id,
          employeeId: selectedEmployee!.id,
          date: selectedDate,
          time: selectedSlot.startTime || selectedSlot.time,
          sessionId: currentLockSessionId,
        });
      }

      console.log('🔒 SLOT SELECT: Attempting optimistic slot lock');
      const lockResponse = await lockSlotOptimistic({
        shopId: shopId!,
        serviceId: selectedService!.id,
        employeeId: selectedEmployee!.id,
        dateTime: slot.dateTime || `${selectedDate}T${slot.startTime || slot.time}:00`,
        slot,
      });

      if (lockResponse?.lockToken) {
        console.log('✅ SLOT SELECT: Slot locked successfully, updating state');
        setSelectedSlot(slot);

        // Auto-advance if all data is available
        if (selectedService && selectedEmployee && selectedDate) {
          console.log('✅ SLOT SELECT: Auto-advance validation passed, calling onDateTimeSelect');
          setValidationError(null);

          // Small delay to ensure state synchronization
          setTimeout(() => {
            onDateTimeSelect();
          }, 100);
          setTimeout(() => {
            console.log('⏭️ SLOT SELECT: Calling onDateTimeSelect after state confirmation');
            onDateTimeSelect();
          }, 50);
        } else {
          console.error('❌ SLOT SELECT: Auto-advance validation failed', {
            missingService: !selectedService,
            missingEmployee: !selectedEmployee,
            missingDate: !selectedDate,
            missingSlot: !selectedSlot,
          });
          setValidationError('Booking state is incomplete. Please try selecting the slot again.');
        }
      } else {
        console.error('❌ SLOT SELECT: No lock token received');
        setValidationError('Failed to reserve time slot. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ SLOT SELECT: Failed to lock slot:', error);
      console.error('❌ SLOT SELECT: Error details:', error.response?.data);

      // Handle specific error messages for user conflicts
      const errorMessage = error.response?.data?.message || error.message || 'Failed to reserve time slot. Please try again.';

      if (errorMessage.includes('already have an appointment') ||
          errorMessage.includes('already scheduled for this email')) {
        setValidationError('You already have an appointment scheduled at this time. Please choose a different time slot.');
      } else {
        setValidationError(errorMessage);
      }
    }
  };
  // Handle retry for failed slot locks
  const handleSlotRetry = useCallback(async (slot: AvailableSlot) => {
    console.log('🔄 RETRY: Retrying slot selection', slot.startTime || slot.time);
    await handleSlotSelect(slot);
  }, []);





  const groupSlotsByTime = (slots: AvailableSlot[]) => {
    const morning = slots.filter(slot => {
      const timeStr = slot.startTime || slot.time;
      const hour = parseInt(timeStr.split(':')[0]);
      return hour < 12;
    });

    const afternoon = slots.filter(slot => {
      const timeStr = slot.startTime || slot.time;
      const hour = parseInt(timeStr.split(':')[0]);
      return hour >= 12 && hour < 17;
    });

    const evening = slots.filter(slot => {
      const timeStr = slot.startTime || slot.time;
      const hour = parseInt(timeStr.split(':')[0]);
      return hour >= 17;
    });

    return { morning, afternoon, evening };
  };

  // Filter out booked slots before grouping
  const filteredSlots = availableSlots.filter(slot => {
    const slotDateTime = slot.dateTime || (selectedDate && slot.time ? `${selectedDate}T${slot.time}:00` : null);
    const isBooked = slotDateTime && bookedSlots.has(slotDateTime);
    if (isBooked) {
      console.log('🚫 Filtering out booked slot:', slotDateTime);
    }
    return !isBooked;
  });

  const { morning, afternoon, evening } = groupSlotsByTime(filteredSlots);

  return (
    <div className="space-y-6">
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

      {/* Validation Error */}
      {validationError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="text-red-700 font-medium">{validationError}</span>
          </div>
        </div>
      )}

      <div className="animate-in fade-in duration-300">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Select Date & Time
          </h3>
          <p className="text-gray-600">
            Choose when you'd like your appointment
          </p>
        </div>
      </div>

      {/* Calendar Selection */}
      {(showCalendar || !selectedDate) && (
        <div className="mb-8">
          <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            Choose Date
          </h4>

          {selectedService && selectedEmployee && shopId ? (
            <BookingCalendar
              shopId={shopId}
              employeeId={selectedEmployee.id}
              serviceId={selectedService.id}
              selectedDate={selectedDate || undefined}
              onDateSelect={handleDateSelect}
            />
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span className="text-yellow-700">Please select a service and employee first</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Time Selection */}
      {selectedDate && !showCalendar && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-gray-900 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Choose Time for {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToCalendar}
            >
              Change Date
            </Button>
          </div>

          {isLoadingSlots ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="md" />
                <span className="ml-3 text-gray-600">Loading available times...</span>
              </div>
              {/* Loading skeleton */}
              <div className="space-y-4">
                {['Morning', 'Afternoon', 'Evening'].map((period) => (
                  <div key={period}>
                    <div className="h-4 bg-gray-200 rounded w-20 mb-3 animate-pulse"></div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <div className="text-red-600 mb-2">⚠️ Error Loading Times</div>
              <p className="text-red-700 text-sm mb-4">{error?.message || String(error)}</p>
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBackToCalendar}
                >
                  Choose Different Date
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchSlots()}
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <div className="text-gray-600 mb-2">📅 No Available Times</div>
              <p className="text-gray-700 text-sm mb-4">
                No available time slots for this date. Please choose a different date.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToCalendar}
              >
                Choose Different Date
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Morning Slots */}
              {morning.length > 0 && (
                <TimeSlotGroup
                  title="Morning"
                  slots={morning}
                  selectedSlot={selectedSlot}
                  onSlotSelect={handleSlotSelect}
                  onSlotRetry={handleSlotRetry}
                  getSlotState={getSlotState}
                  generateSlotKey={generateSlotKey}
                />
              )}

              {/* Afternoon Slots */}
              {afternoon.length > 0 && (
                <TimeSlotGroup
                  title="Afternoon"
                  slots={afternoon}
                  selectedSlot={selectedSlot}
                  onSlotSelect={handleSlotSelect}
                  onSlotRetry={handleSlotRetry}
                  getSlotState={getSlotState}
                  generateSlotKey={generateSlotKey}
                />
              )}

              {/* Evening Slots */}
              {evening.length > 0 && (
                <TimeSlotGroup
                  title="Evening"
                  slots={evening}
                  selectedSlot={selectedSlot}
                  onSlotSelect={handleSlotSelect}
                  onSlotRetry={handleSlotRetry}
                  getSlotState={getSlotState}
                  generateSlotKey={generateSlotKey}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Lock Extension Manager */}
      {selectedSlot && currentLockSessionId && (
        <div className="mt-6">
          <LockExtensionManager
            onExtend={() => {
              console.log('🔄 Lock extended successfully');
            }}
            onExpired={() => {
              console.log('⏰ Lock expired, clearing state');
              setSelectedSlot(null);
              setValidationError('Your time slot reservation has expired. Please select a new time slot.');
            }}
          />
        </div>
      )}

      {/* Selected Slot Summary */}
      {selectedSlot && currentLockSessionId && (
        <div className="mt-4 p-5 bg-blue-50 border border-blue-200 rounded-xl animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">
                  Time Slot Reserved
                </h4>
                <p className="text-blue-700 text-sm">
                  {selectedDate && new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })} at {formatTime(selectedSlot.startTime || selectedSlot.time)}
                </p>
                <p className="text-blue-600 text-xs mt-1">
                  Click the time slot again to continue, or select a different time
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Time Slot Group Component
interface TimeSlotGroupProps {
  title: string;
  slots: AvailableSlot[];
  selectedSlot: AvailableSlot | null;
  onSlotSelect: (slot: AvailableSlot) => void;
  onSlotRetry: (slot: AvailableSlot) => void;
  getSlotState: (slotKey: string) => any;
  generateSlotKey: (slot: AvailableSlot) => string;
}

const TimeSlotGroup: React.FC<TimeSlotGroupProps> = ({
  title,
  slots,
  selectedSlot,
  onSlotSelect,
  onSlotRetry,
  getSlotState,
  generateSlotKey,
}) => {
  return (
    <div>
      <h5 className="text-sm font-medium text-gray-700 mb-3">{title}</h5>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {slots.map((slot) => {
          const slotKey = generateSlotKey(slot);
          const slotState = getSlotState(slotKey);
          const isSelected = selectedSlot && (
            (selectedSlot.startTime || selectedSlot.time) === (slot.startTime || slot.time) ||
            selectedSlot.dateTime === slot.dateTime
          );

          return (
            <EnhancedSlotButton
              key={slotKey}
              slot={slot}
              isSelected={isSelected}
              slotState={slotState}
              onSlotSelect={onSlotSelect}
              onRetry={onSlotRetry}
            />
          );
        })}
      </div>
    </div>
  );
};

export default DateTimeSelection;
