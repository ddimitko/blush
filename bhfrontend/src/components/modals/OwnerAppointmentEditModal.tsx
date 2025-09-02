import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, User, Users, ArrowLeft } from 'lucide-react';
import { Appointment, AvailableSlot, Employee } from '../../types';
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

interface OwnerAppointmentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
  employees: Employee[];
  onSuccess: () => void;
}

const OwnerAppointmentEditModal: React.FC<OwnerAppointmentEditModalProps> = ({
  isOpen,
  onClose,
  appointment,
  employees,
  onSuccess,
}) => {
  const { success, error } = useToast();
  const [step, setStep] = useState<'employee' | 'date' | 'slot' | 'notes'>('employee');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(appointment.employee.id);
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

  // Get available slots for selected employee and date
  const {
    data: availableSlots = [],
    isLoading: isLoadingSlots,
    refetch: refetchSlots,
  } = useAvailableSlotsQuery({
    shopId: appointment.shop.id,
    serviceId: appointment.service.id,
    employeeId: selectedEmployeeId,
    date: selectedDate,
  });

  // WebSocket subscriptions for real-time slot updates
  const { subscribeToSlots, unsubscribeFromSlots } = useSlotSubscriptions({
    onSlotUpdate: (message) => {
      console.log('📨 Slot update received in owner edit modal:', message);
      // Refetch slots when updates are received
      if (selectedDate) {
        refetchSlots();
      }
    },
  });

  // Generate slot key for state tracking
  const generateSlotKey = useCallback((slot: AvailableSlot) => {
    return `${appointment.shop.id}-${appointment.service.id}-${selectedEmployeeId}-${slot.dateTime || `${selectedDate}T${slot.startTime || slot.time}:00`}`;
  }, [appointment.shop.id, appointment.service.id, selectedEmployeeId, selectedDate]);

  // Subscribe to slot updates when date/employee/service changes
  useEffect(() => {
    if (selectedDate && appointment.shop.id && appointment.service.id && selectedEmployeeId) {
      subscribeToSlots({
        shopId: appointment.shop.id,
        serviceId: appointment.service.id,
        employeeId: selectedEmployeeId,
        date: selectedDate,
      });

      return () => {
        unsubscribeFromSlots({
          shopId: appointment.shop.id,
          serviceId: appointment.service.id,
          employeeId: selectedEmployeeId,
          date: selectedDate,
        });
      };
    }
  }, [selectedDate, appointment.shop.id, appointment.service.id, selectedEmployeeId, subscribeToSlots, unsubscribeFromSlots]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('employee');
      setSelectedEmployeeId(appointment.employee.id);
      setSelectedDate('');
      setSelectedSlot(null);
      setNotes(appointment.notes || '');
      setShowCalendar(true);
      clearError();
    }
  }, [isOpen, appointment, clearError]);

  // Filter employees who can perform this service
  const availableEmployees = employees.filter(emp =>
    emp.services && emp.services.some(service => service.id === appointment.service.id)
  );

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setStep('date');
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
        employeeId: selectedEmployeeId,
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
      if (selectedSlot && selectedDate && currentLockSessionId) {
        updateData.appointmentDateTime = createUTCAppointmentDateTime(selectedDate, selectedSlot.startTime || selectedSlot.time);
        updateData.lockToken = currentLockSessionId;
      }

      await updateAppointmentMutation.mutateAsync({
        appointmentId: appointment.id,
        appointmentData: updateData,
      });

      success('Appointment updated', 'The appointment has been updated successfully.');
      onSuccess();
      onClose();
    } catch (err: any) {
      error('Failed to update appointment', err.message || 'Please try again later.');
    }
  };



  const handleBack = () => {
    if (step === 'employee') return;
    if (step === 'date') {
      setStep('employee');
    } else if (step === 'slot') {
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
          employeeId: selectedEmployeeId,
          date: selectedDate,
          time: selectedSlot.startTime || selectedSlot.time,
          sessionId: currentLockSessionId,
        }).catch(console.error);
      }
    }
  };

  const canProceed = () => {
    if (step === 'employee') return selectedEmployeeId;
    if (step === 'date') return selectedDate;
    if (step === 'slot') return selectedSlot;
    if (step === 'notes') return true;
    return false;
  };

  const getStepTitle = () => {
    switch (step) {
      case 'employee': return 'Select Employee';
      case 'date': return 'Select Date';
      case 'slot': return 'Select Time Slot';
      case 'notes': return 'Update Notes';
      default: return 'Edit Appointment';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Appointment"
      size="lg"
    >
      <div className="space-y-6">
        {/* Current Appointment Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Current Appointment</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center">
              <User className="w-4 h-4 mr-2" />
              {appointment.service.name} with {appointment.employee.fullName || appointment.employee.name}
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              {formatDate(appointment.appointmentDateTime)}
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              {formatTime(appointment.appointmentDateTime)} - {formatTime(appointment.endDateTime)}
            </div>
          </div>
        </div>

        {/* Step Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {step !== 'employee' && (
              <Button
                variant="outline"
                size="sm"
                icon={<ArrowLeft className="w-4 h-4" />}
                onClick={handleBack}
              >
                Back
              </Button>
            )}
            <h3 className="text-lg font-medium text-gray-900">{getStepTitle()}</h3>
          </div>
          <div className="text-sm text-gray-500">
            Step {step === 'employee' ? 1 : step === 'date' ? 2 : step === 'slot' ? 3 : 4} of 4
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">
          {step === 'employee' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Select an employee who can perform {appointment.service.name}:
              </p>
              {availableEmployees.map((employee) => (
                <button
                  key={employee.id}
                  onClick={() => handleEmployeeSelect(employee.id)}
                  className={`w-full p-4 text-left border rounded-lg transition-colors ${
                    selectedEmployeeId === employee.id
                      ? 'border-accent-500 bg-accent-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {employee.fullName || employee.name}
                      </p>
                      {employee.specialties && (
                        <p className="text-sm text-gray-600">{employee.specialties}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {(step === 'date' || (step === 'slot' && showCalendar)) && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Select a new date for the appointment:
              </p>
              <BookingCalendar
                shopId={appointment.shop.id}
                employeeId={selectedEmployeeId}
                serviceId={appointment.service.id}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                currentAppointmentDate={(() => {
                  // Extract current appointment date for calendar display
                  const appointmentDate = new Date(appointment.appointmentDateTime);
                  const year = appointmentDate.getFullYear();
                  const month = String(appointmentDate.getMonth() + 1).padStart(2, '0');
                  const day = String(appointmentDate.getDate()).padStart(2, '0');
                  return `${year}-${month}-${day}`;
                })()}
              />
            </div>
          )}

          {step === 'slot' && !showCalendar && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Select an available time slot for {formatDate(selectedDate)}:
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<ArrowLeft className="w-4 h-4" />}
                  onClick={handleBackToCalendar}
                >
                  Back to Calendar
                </Button>
              </div>

              {isLoadingSlots ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No available slots for this date.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBackToCalendar}
                  >
                    Choose Different Date
                  </Button>
                </div>
              ) : (
                (() => {
                  const { morning, afternoon } = (() => {
                    const localSlots = convertSlotTimesToLocal(availableSlots);
                    const morning: AvailableSlot[] = [];
                    const afternoon: AvailableSlot[] = [];

                    localSlots.forEach((localSlot, index) => {
                      const originalSlot = availableSlots[index];
                      const slotTime = localSlot.startTime;
                      const hour = parseInt(slotTime.split(':')[0]);

                      if (hour < 12) {
                        morning.push(originalSlot);
                      } else {
                        afternoon.push(originalSlot);
                      }
                    });

                    return { morning, afternoon };
                  })();

                  return (
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
                  );
                })()
              )}
            </div>
          )}

          {step === 'notes' && (
            <div className="space-y-3">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Appointment Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent-500 focus:border-accent-500"
                placeholder="Add any notes for this appointment..."
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          {step === 'notes' ? (
            <Button
              variant="primary"
              onClick={handleSaveChanges}
              disabled={updateAppointmentMutation.isPending}
              isLoading={updateAppointmentMutation.isPending}
              className="flex-1"
            >
              Save Changes
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => {
                if (step === 'employee') setStep('date');
                else if (step === 'date') setStep('slot');
                else if (step === 'slot') setStep('notes');
              }}
              disabled={!canProceed()}
              className="flex-1"
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default OwnerAppointmentEditModal;
