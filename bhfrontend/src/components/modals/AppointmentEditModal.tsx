import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, User, MessageSquare, ArrowLeft } from 'lucide-react';
import { Appointment, AvailableSlot } from '../../types';
import { useAvailableSlotsQuery, useUpdateAppointmentMutation } from '../../hooks/queries';
import { useOptimisticSlotLocking } from '../../hooks/useOptimisticSlotLocking';
import { useSlotSubscriptions } from '../../hooks/useSlotSubscriptions';
import { useBookingUIStore } from '../../store/uiStore';
import { useToast } from '../ui/Toast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import BookingCalendar from '../booking/BookingCalendar';
import EnhancedSlotButton from '../booking/EnhancedSlotButton';
import { formatDate, formatTime, createUTCAppointmentDateTime } from '../../lib/utils';
import { convertSlotTimesToLocal } from '../../lib/timezone';

interface AppointmentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
  onSuccess: () => void;
}

const AppointmentEditModal: React.FC<AppointmentEditModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}) => {
  const { success, error } = useToast();
  const [step, setStep] = useState<'date' | 'slot' | 'notes'>('date');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [notes, setNotes] = useState(appointment.notes || '');
  const [showCalendar, setShowCalendar] = useState(true);

  const updateAppointmentMutation = useUpdateAppointmentMutation();

  // Booking UI store for slot state management
  const {
    currentLockSessionId,
    getSlotState,
    clearError,
  } = useBookingUIStore();

  // Optimistic slot locking
  const { lockSlotOptimistic, unlockSlotOptimistic, isLocking } = useOptimisticSlotLocking();

  // Utility function to format date to YYYY-MM-DD string without timezone issues
  const formatDateToString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Available slots query
  const {
    data: availableSlots = [],
    isLoading: isLoadingSlots,
    refetch: refetchSlots,
  } = useAvailableSlotsQuery({
    shopId: appointment.shop.id,
    serviceId: appointment.service.id,
    employeeId: appointment.employee.id,
    date: selectedDate,
  });

  useEffect(() => {
    if (isOpen) {
      // Initialize with current appointment date - handle timezone properly
      const appointmentDate = new Date(appointment.appointmentDateTime);
      const currentDate = formatDateToString(appointmentDate);
      setSelectedDate(currentDate);
      setNotes(appointment.notes || '');
      setStep('date');
      setSelectedSlot(null);

    }
  }, [isOpen, appointment]);

  // WebSocket subscriptions for real-time slot updates
  const { subscribeToSlots, unsubscribeFromSlots } = useSlotSubscriptions({
    onSlotUpdate: (message) => {
      console.log('📨 Slot update received in edit modal:', message);
      // Refetch slots when updates are received
      if (selectedDate) {
        refetchSlots();
      }
    },
  });

  // Generate slot key for state tracking
  const generateSlotKey = useCallback((slot: AvailableSlot) => {
    return `${appointment.shop.id}-${appointment.service.id}-${appointment.employee.id}-${slot.dateTime || `${selectedDate}T${slot.startTime || slot.time}:00`}`;
  }, [appointment.shop.id, appointment.service.id, appointment.employee.id, selectedDate]);

  // Subscribe to slot updates when date/employee/service changes
  useEffect(() => {
    if (selectedDate && appointment.shop.id && appointment.service.id && appointment.employee.id) {
      subscribeToSlots({
        shopId: appointment.shop.id,
        serviceId: appointment.service.id,
        employeeId: appointment.employee.id,
        date: selectedDate,
      });

      return () => {
        unsubscribeFromSlots({
          shopId: appointment.shop.id,
          serviceId: appointment.service.id,
          employeeId: appointment.employee.id,
          date: selectedDate,
        });
      };
    }
  }, [selectedDate, appointment.shop.id, appointment.service.id, appointment.employee.id, subscribeToSlots, unsubscribeFromSlots]);

  const canModifyAppointment = () => {
    const appointmentTime = new Date(appointment.appointmentDateTime);
    const now = new Date();
    const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilAppointment >= 24;
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setShowCalendar(false);
    setStep('slot');
    refetchSlots();
  };

  const handleBackToCalendar = () => {
    setShowCalendar(true);
    setSelectedSlot(null);
  };

  const handleSlotSelect = async (slot: AvailableSlot) => {
    try {
      // Use optimistic slot locking
      await lockSlotOptimistic({
        shopId: appointment.shop.id,
        serviceId: appointment.service.id,
        employeeId: appointment.employee.id,
        dateTime: createUTCAppointmentDateTime(selectedDate, slot.startTime || slot.time),
        slot: slot,
      });

      setSelectedSlot(slot);
      setStep('notes');
    } catch (err: any) {
      error('Failed to lock slot', err.message || 'Please try another slot.');
    }
  };

  const handleSlotRetry = async (slot: AvailableSlot) => {
    console.log('🔄 Retrying slot selection:', slot);
    await handleSlotSelect(slot);
  };

  const handleSaveChanges = async () => {
    try {
      const updateData: any = {
        notes,
      };

      // If slot was changed, include new appointment time and session ID
      if (selectedSlot && currentLockSessionId) {
        updateData.appointmentDateTime = createUTCAppointmentDateTime(selectedDate, selectedSlot.startTime || selectedSlot.time);
        updateData.lockToken = currentLockSessionId;
      }

      await updateAppointmentMutation.mutateAsync({
        appointmentId: appointment.id,
        appointmentData: updateData,
      });

      success('Appointment updated', 'Your appointment has been updated successfully.');
      onSuccess();
      onClose();
    } catch (err: any) {
      error('Failed to update appointment', err.message || 'Please try again later.');
    }
  };

  const handleBack = () => {
    if (step === 'slot') {
      setStep('date');
      setShowCalendar(true);
      setSelectedSlot(null);
    } else if (step === 'notes') {
      setStep('slot');
      setSelectedSlot(null);
      // Unlock the current slot if going back
      if (selectedSlot && currentLockSessionId) {
        unlockSlotOptimistic({
          shopId: appointment.shop.id,
          serviceId: appointment.service.id,
          employeeId: appointment.employee.id,
          date: selectedDate,
          time: selectedSlot.startTime || selectedSlot.time,
          sessionId: currentLockSessionId,
        }).catch(console.error);
      }
    }
  };

  const renderDateSelection = () => {
    // Extract current appointment date for calendar display
    const currentAppointmentDate = formatDateToString(new Date(appointment.appointmentDateTime));

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Select New Date</h3>
        <p className="text-sm text-gray-600">
          Current appointment: {formatDate(appointment.appointmentDateTime)} at {formatTime(appointment.appointmentDateTime)}
        </p>

        <BookingCalendar
          shopId={appointment.shop.id}
          employeeId={appointment.employee.id}
          serviceId={appointment.service.id}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          currentAppointmentDate={currentAppointmentDate}
        />
      </div>
    );
  };

  // Group slots by time periods
  const groupSlotsByPeriod = (slots: AvailableSlot[]) => {
    const localSlots = convertSlotTimesToLocal(slots);

    const morning: AvailableSlot[] = [];
    const afternoon: AvailableSlot[] = [];

    localSlots.forEach((localSlot, index) => {
      const originalSlot = slots[index];
      const slotTime = localSlot.startTime;
      const hour = parseInt(slotTime.split(':')[0]);

      if (hour < 12) {
        morning.push(originalSlot);
      } else {
        afternoon.push(originalSlot);
      }
    });

    return { morning, afternoon };
  };

  const renderSlotSelection = () => {
    const { morning, afternoon } = groupSlotsByPeriod(availableSlots);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Select New Time</h3>
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={handleBackToCalendar}
          >
            Back to Calendar
          </Button>
        </div>

        <p className="text-sm text-gray-600">
          Selected date: {formatDate(selectedDate)}
        </p>

        {isLoadingSlots ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              No available slots for this date. Please select another date.
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
          <div className="space-y-6 max-h-64 overflow-y-auto">
            {/* Morning Slots */}
            {morning.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Morning</h4>
                <div className="grid grid-cols-3 gap-2">
                  {morning.map((slot) => (
                    <EnhancedSlotButton
                      key={slot.startTime || slot.time}
                      slot={slot}
                      isSelected={selectedSlot?.startTime === slot.startTime || selectedSlot?.time === slot.time}
                      slotState={getSlotState(generateSlotKey(slot))}
                      onSlotSelect={handleSlotSelect}
                      onRetry={handleSlotRetry}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Afternoon Slots */}
            {afternoon.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Afternoon</h4>
                <div className="grid grid-cols-3 gap-2">
                  {afternoon.map((slot) => (
                    <EnhancedSlotButton
                      key={slot.startTime || slot.time}
                      slot={slot}
                      isSelected={selectedSlot?.startTime === slot.startTime || selectedSlot?.time === slot.time}
                      slotState={getSlotState(generateSlotKey(slot))}
                      onSlotSelect={handleSlotSelect}
                      onRetry={handleSlotRetry}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderNotesEdit = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Update Notes</h3>
        {selectedSlot && (
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={handleBack}
          >
            Back
          </Button>
        )}
      </div>

      {selectedSlot && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            New appointment time: {formatDate(selectedDate)} at {formatTime(selectedSlot.time)}
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          <MessageSquare className="w-4 h-4 inline mr-2" />
          Notes (Optional)
        </label>
        <textarea
          placeholder="Add any special requests or notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSaveChanges}
          isLoading={updateAppointmentMutation.isPending}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );

  if (!canModifyAppointment()) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Cannot Edit Appointment">
        <div className="text-center py-6">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Too Late to Edit
          </h3>
          <p className="text-gray-600 mb-6">
            Appointments can only be edited up to 24 hours before the scheduled time.
          </p>
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Appointment"
      size="lg"
    >
      <div className="space-y-6">
        {/* Appointment Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Current Appointment</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center">
              <User className="w-4 h-4 mr-2" />
              {appointment.service.name} with {appointment.employee.firstName} {appointment.employee.lastName}
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              {formatDate(appointment.appointmentDateTime)}
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              {formatTime(appointment.appointmentDateTime)}
            </div>
          </div>
        </div>

        {/* Step Content */}
        {(step === 'date' || (step === 'slot' && showCalendar)) && renderDateSelection()}
        {step === 'slot' && !showCalendar && renderSlotSelection()}
        {step === 'notes' && renderNotesEdit()}
      </div>
    </Modal>
  );
};

export default AppointmentEditModal;
