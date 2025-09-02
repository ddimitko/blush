import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  Calendar,
  Users,
  AlertCircle,
  ToggleLeft
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useShopEmployeesQuery } from '../hooks/queries';
import {
  useUpdateEmployeeScheduleMutation,
  validateScheduleSlots,
  type ScheduleSlotRequest
} from '../hooks/queries/useScheduleQueries';
import { useToast } from '../components/ui/Toast';
import { convertBusinessHoursToUTC, convertBusinessHoursToLocal } from '../lib/timezone';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorState from '../components/ui/ErrorState';
import { Employee, ScheduleSlot } from '../types';
import { apiClient } from '../lib/api';



interface EmployeeSchedule {
  employeeId: string;
  employeeName: string;
  schedule: Record<string, ScheduleSlot[]>;
}

const DAYS_OF_WEEK = [
  { key: 'MONDAY', label: 'Monday' },
  { key: 'TUESDAY', label: 'Tuesday' },
  { key: 'WEDNESDAY', label: 'Wednesday' },
  { key: 'THURSDAY', label: 'Thursday' },
  { key: 'FRIDAY', label: 'Friday' },
  { key: 'SATURDAY', label: 'Saturday' },
  { key: 'SUNDAY', label: 'Sunday' }
];

const ShopScheduleManagementPage: React.FC = () => {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [employeeSchedules, setEmployeeSchedules] = useState<EmployeeSchedule[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleSlotRequest[]>([]);
  const [originalSchedule, setOriginalSchedule] = useState<ScheduleSlotRequest[]>([]);
  const [deletedSlotIds, setDeletedSlotIds] = useState<string[]>([]); // Track slots to be deleted
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch employees
  const {
    data: employees = [],
    isLoading: isLoadingEmployees,
    error: employeesError
  } = useShopEmployeesQuery(shopId || '');

  // Schedule mutation
  const updateScheduleMutation = useUpdateEmployeeScheduleMutation();

  // Load all employee schedules
  const loadEmployeeSchedules = async () => {
    if (!employees.length) return;

    setIsLoading(true);
    try {
      const schedules: EmployeeSchedule[] = [];
      
      for (const employee of employees) {
        try {
          const response = await apiClient.getEmployeeSchedule(employee.id);
          schedules.push({
            employeeId: employee.id,
            employeeName: employee.fullName || employee.name || 'Unknown',
            schedule: response.schedule
          });
        } catch (err) {
          console.warn(`Failed to load schedule for employee ${employee.id}:`, err);
          // Add empty schedule for employee
          schedules.push({
            employeeId: employee.id,
            employeeName: employee.fullName || employee.name || 'Unknown',
            schedule: {}
          });
        }
      }

      setEmployeeSchedules(schedules);
    } catch (err) {
      console.error('Failed to load employee schedules:', err);
      error('Failed to load schedules', 'Please try again later');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (employees.length > 0) {
      loadEmployeeSchedules();
    }
  }, [employees]);

  const handleEditSchedule = (employee: Employee) => {
    setSelectedEmployee(employee);

    // Find existing schedule for this employee
    const existingSchedule = employeeSchedules.find(s => s.employeeId === employee.id);
    const scheduleSlots: ScheduleSlotRequest[] = [];

    if (existingSchedule) {
      // Convert existing schedule to editable format
      // Backend stores times in UTC, convert to local timezone for editing
      DAYS_OF_WEEK.forEach(day => {
        const daySlots = existingSchedule.schedule[day.key] || [];
        daySlots.forEach(slot => {
          // Convert UTC times from backend to local timezone for display/editing
          const { startTime: localStartTime, endTime: localEndTime } = convertBusinessHoursToLocal(
            slot.startTime,
            slot.endTime
          );

          const slotRequest = {
            id: slot.id, // Include the original slot ID
            dayOfWeek: day.key,
            startTime: localStartTime,
            endTime: localEndTime,
            active: slot.active // Include active status
          };

          scheduleSlots.push(slotRequest);
        });
      });
    }

    setEditingSchedule(scheduleSlots);
    setOriginalSchedule([...scheduleSlots]); // Store original for comparison
    setDeletedSlotIds([]); // Reset deleted slots
    setIsEditing(true);
  };

  const addTimeSlot = (dayOfWeek: string) => {
    const newSlot: ScheduleSlotRequest = {
      // No ID for new slots
      dayOfWeek,
      startTime: '09:00',
      endTime: '17:00'
    };
    setEditingSchedule([...editingSchedule, newSlot]);
  };

  const updateTimeSlot = (index: number, field: keyof ScheduleSlotRequest, value: string) => {
    const updated = [...editingSchedule];
    updated[index] = { ...updated[index], [field]: value };
    setEditingSchedule(updated);
  };

  const removeTimeSlot = (index: number) => {
    const slotToRemove = editingSchedule[index];

    // If this slot has an ID (exists in backend), mark it for deletion
    if (slotToRemove.id) {
      setDeletedSlotIds(prev => [...prev, slotToRemove.id!]);
    }

    // Remove from local editing state immediately
    const updated = editingSchedule.filter((_, i) => i !== index);
    setEditingSchedule(updated);
  };

  // Function to detect only changed slots
  const getChangedSlots = () => {
    const changedSlots: ScheduleSlotRequest[] = [];

    editingSchedule.forEach(currentSlot => {
      if (!currentSlot.id) {
        // New slot (no ID)
        changedSlots.push(currentSlot);
      } else {
        // Existing slot - check if it's been modified
        const originalSlot = originalSchedule.find(orig => orig.id === currentSlot.id);
        if (originalSlot) {
          const hasChanged = (
            originalSlot.dayOfWeek !== currentSlot.dayOfWeek ||
            originalSlot.startTime !== currentSlot.startTime ||
            originalSlot.endTime !== currentSlot.endTime
          );

          if (hasChanged) {
            changedSlots.push(currentSlot);
          }
        } else {
          // Slot has ID but not found in original (shouldn't happen, but include it)
          changedSlots.push(currentSlot);
        }
      }
    });

    console.log(`📝 Detected ${changedSlots.length} changed slots:`, changedSlots);
    return changedSlots;
  };

  const saveSchedule = async () => {
    if (!selectedEmployee) return;

    // Get only the changed slots
    const changedSlots = getChangedSlots();

    // Check if there are any changes (updates/creates or deletions)
    if (changedSlots.length === 0 && deletedSlotIds.length === 0) {
      success('No changes detected', 'Schedule is already up to date');
      setIsEditing(false);
      setSelectedEmployee(null);
      return;
    }

    // Validate only the changed schedule slots
    const validationErrors = validateScheduleSlots(changedSlots);
    if (validationErrors.length > 0) {
      error('Invalid schedule', validationErrors.join('. '));
      return;
    }

    try {
      // Convert only changed slots from local timezone to UTC before sending to backend
      const utcScheduleSlots = changedSlots.map(slot => {
        const { startTime: utcStartTime, endTime: utcEndTime } = convertBusinessHoursToUTC(
          slot.startTime,
          slot.endTime
        );

        const utcSlot: any = {
          dayOfWeek: slot.dayOfWeek,
          startTime: utcStartTime,
          endTime: utcEndTime
        };

        // Include ID if it exists (for updates)
        if (slot.id) {
          utcSlot.id = slot.id;
        }

        return utcSlot;
      });

      console.log(`📝 Sending ${utcScheduleSlots.length} changed slots to backend:`, utcScheduleSlots);
      console.log(`🗑️ Deleting ${deletedSlotIds.length} slots from backend:`, deletedSlotIds);

      // Process updates/creates first
      if (utcScheduleSlots.length > 0) {
        await updateScheduleMutation.mutateAsync({
          employeeId: selectedEmployee.id,
          scheduleSlots: utcScheduleSlots
        });
      }

      // Process deletions
      for (const slotId of deletedSlotIds) {
        try {
          await apiClient.deleteScheduleSlot(slotId);
          console.log(`✅ Successfully deleted slot: ${slotId}`);
        } catch (err) {
          console.error(`❌ Failed to delete slot ${slotId}:`, err);
          error('Partial save', `Failed to delete some slots. Please try again.`);
          return;
        }
      }

      success('Schedule updated successfully');

      // Reload schedules
      await loadEmployeeSchedules();

      // Close editing mode
      setIsEditing(false);
      setSelectedEmployee(null);
      setEditingSchedule([]);
      setDeletedSlotIds([]); // Clear deleted slots
    } catch (err: any) {
      console.error('Failed to save schedule:', err);
      error('Failed to save schedule', err.response?.data?.message || 'Please try again');
    }
  };

  const toggleSlotActive = async (slotId: string) => {
    if (!selectedEmployee) return;

    try {
      await apiClient.toggleScheduleSlot(slotId);
      success('Slot toggled', 'Schedule slot status has been updated');
      // Reload schedules to reflect the change
      await loadEmployeeSchedules();
    } catch (err) {
      console.error('Failed to toggle slot:', err);
      error('Toggle failed', 'Could not toggle the schedule slot');
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setSelectedEmployee(null);
    setEditingSchedule([]);
    setDeletedSlotIds([]); // Reset deleted slots
  };

  if (isLoadingEmployees) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (employeesError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 flex items-center justify-center">
        <ErrorState
          title="Failed to Load Employees"
          description="Unable to load employee data for schedule management."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/owner/dashboard`)}
            className="flex items-center text-neutral-600 hover:text-accent-600 mb-6 transition-colors duration-300 group"
          >
            <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
            <span className="font-medium">Back to Dashboard</span>
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-neutral-800 mb-3">
                Schedule Management
              </h1>
              <p className="text-lg text-neutral-600">
                Manage working hours and availability for your team
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-sm text-neutral-500 bg-neutral-100 px-3 py-2 rounded-lg">
                <Users className="inline h-4 w-4 mr-1" />
                {employees.length} employee{employees.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {employees.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-xl border border-neutral-200 p-12">
            <div className="text-center">
              <Users className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-neutral-800 mb-2">
                No Employees Found
              </h3>
              <p className="text-neutral-600 mb-6">
                Add employees to your shop to start managing their schedules.
              </p>
              <Button
                variant="primary"
                onClick={() => navigate(`/shop/${shopId}/employees/add`)}
                icon={<Plus className="h-4 w-4" />}
              >
                Add Employee
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Schedule Overview */}
            {!isEditing && (
              <div className="grid gap-6">
                {employees.map((employee) => {
                  const schedule = employeeSchedules.find(s => s.employeeId === employee.id);
                  const hasSchedule = schedule && Object.values(schedule.schedule).some(daySlots => daySlots.length > 0);

                  return (
                    <div key={employee.id} className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-accent-100 rounded-full flex items-center justify-center">
                            <Users className="h-6 w-6 text-accent-600" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-neutral-800">
                              {employee.fullName || employee.name}
                            </h3>
                            <p className="text-neutral-600">
                              {hasSchedule ? 'Schedule configured' : 'No schedule set'}
                            </p>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          onClick={() => handleEditSchedule(employee)}
                          icon={hasSchedule ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        >
                          {hasSchedule ? 'Edit Schedule' : 'Set Schedule'}
                        </Button>
                      </div>

                      {hasSchedule && schedule && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
                          {DAYS_OF_WEEK.map(day => {
                            const daySlots = schedule.schedule[day.key] || [];
                            
                            return (
                              <div key={day.key} className="bg-neutral-50 rounded-lg p-4">
                                <h4 className="font-medium text-neutral-800 mb-2 text-sm">
                                  {day.label}
                                </h4>
                                {daySlots.length > 0 ? (
                                  <div className="space-y-2">
                                    {daySlots.map((slot, index) => {
                                      // Convert UTC times from backend to local timezone for display
                                      const { startTime: localStartTime, endTime: localEndTime } = convertBusinessHoursToLocal(
                                        slot.startTime,
                                        slot.endTime
                                      );

                                      return (
                                        <div key={index} className="text-xs text-neutral-600 bg-white rounded px-2 py-1">
                                          <Clock className="inline h-3 w-3 mr-1" />
                                          {localStartTime} - {localEndTime}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-xs text-neutral-400">No hours set</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {!hasSchedule && (
                        <div className="bg-neutral-50 rounded-lg p-6 text-center">
                          <AlertCircle className="h-8 w-8 text-neutral-400 mx-auto mb-2" />
                          <p className="text-neutral-600 text-sm">
                            No working hours configured for this employee
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Schedule Editing Interface */}
            {isEditing && selectedEmployee && (
              <div className="bg-white rounded-3xl shadow-2xl border border-neutral-200 p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-neutral-800 mb-2">
                      Edit Schedule for {selectedEmployee.fullName || selectedEmployee.name}
                    </h2>
                    <p className="text-neutral-600">
                      Set working hours for each day of the week
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      onClick={cancelEditing}
                      icon={<X className="h-4 w-4" />}
                      disabled={updateScheduleMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={saveSchedule}
                      icon={<Save className="h-4 w-4" />}
                      isLoading={updateScheduleMutation.isPending}
                      disabled={updateScheduleMutation.isPending}
                    >
                      Save Schedule
                    </Button>
                  </div>
                </div>

                <div className="space-y-6">
                  {DAYS_OF_WEEK.map(day => {
                    const daySlots = editingSchedule.filter(slot => slot.dayOfWeek === day.key);

                    return (
                      <div key={day.key} className="bg-neutral-50 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-neutral-800">
                            {day.label}
                          </h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addTimeSlot(day.key)}
                            icon={<Plus className="h-4 w-4" />}
                          >
                            Add Time Slot
                          </Button>
                        </div>

                        {daySlots.length === 0 ? (
                          <div className="text-center py-8">
                            <Clock className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                            <p className="text-neutral-500 text-sm">
                              No working hours set for {day.label}
                            </p>
                            <p className="text-neutral-400 text-xs mt-1">
                              Click "Add Time Slot" to set working hours
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {daySlots.map((slot, slotIndex) => {
                              const globalIndex = editingSchedule.findIndex(
                                s => s.dayOfWeek === day.key &&
                                     s.startTime === slot.startTime &&
                                     s.endTime === slot.endTime
                              );

                              return (
                                <div key={slotIndex} className={`flex items-center space-x-4 rounded-lg p-4 border ${
                                  slot.active === false
                                    ? 'bg-red-50 border-red-200 opacity-75'
                                    : 'bg-white border-neutral-200'
                                }`}>
                                  {/* Active status indicator */}
                                  <div className="flex items-center">
                                    <div className={`w-3 h-3 rounded-full ${
                                      slot.active === false ? 'bg-red-400' : 'bg-green-400'
                                    }`} title={slot.active === false ? 'Inactive slot' : 'Active slot'} />
                                  </div>

                                  <div className="flex items-center space-x-2 flex-1">
                                    <div className="flex-1">
                                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                                        Start Time
                                      </label>
                                      <input
                                        type="time"
                                        value={slot.startTime}
                                        onChange={(e) => updateTimeSlot(globalIndex, 'startTime', e.target.value)}
                                        disabled={slot.active === false}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 ${
                                          slot.active === false
                                            ? 'border-neutral-200 bg-neutral-100 text-neutral-500 cursor-not-allowed'
                                            : 'border-neutral-300'
                                        }`}
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                                        End Time
                                      </label>
                                      <input
                                        type="time"
                                        value={slot.endTime}
                                        onChange={(e) => updateTimeSlot(globalIndex, 'endTime', e.target.value)}
                                        disabled={slot.active === false}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 ${
                                          slot.active === false
                                            ? 'border-neutral-200 bg-neutral-100 text-neutral-500 cursor-not-allowed'
                                            : 'border-neutral-300'
                                        }`}
                                      />
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    {/* Show different buttons based on slot status */}
                                    {slot.active === false ? (
                                      // Inactive slot - show reactivate button
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleSlotActive(slot.id!)}
                                        icon={<ToggleLeft className="h-4 w-4" />}
                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                      >
                                        Reactivate
                                      </Button>
                                    ) : (
                                      // Active slot - show toggle and delete buttons
                                      <>
                                        {slot.id && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => toggleSlotActive(slot.id!)}
                                            icon={<ToggleLeft className="h-4 w-4" />}
                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                          >
                                            Deactivate
                                          </Button>
                                        )}

                                        {/* Remove button (local removal, deletion happens on save) */}
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => removeTimeSlot(globalIndex)}
                                          icon={<Trash2 className="h-4 w-4" />}
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                          {slot.id ? 'Delete' : 'Remove'}
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Schedule Summary */}
                <div className="mt-8 bg-accent-50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-neutral-800 mb-4">
                    Schedule Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {DAYS_OF_WEEK.map(day => {
                      const daySlots = editingSchedule.filter(slot => slot.dayOfWeek === day.key);
                      const totalHours = daySlots.reduce((total, slot) => {
                        const start = new Date(`2000-01-01T${slot.startTime}`);
                        const end = new Date(`2000-01-01T${slot.endTime}`);
                        return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                      }, 0);

                      return (
                        <div key={day.key} className="bg-white rounded-lg p-3">
                          <h4 className="font-medium text-neutral-800 text-sm">
                            {day.label}
                          </h4>
                          <p className="text-neutral-600 text-xs mt-1">
                            {daySlots.length > 0 ? (
                              <>
                                {daySlots.length} slot{daySlots.length !== 1 ? 's' : ''} • {totalHours.toFixed(1)}h
                              </>
                            ) : (
                              'No hours'
                            )}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopScheduleManagementPage;
