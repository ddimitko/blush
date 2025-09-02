import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  useShopQuery,
  useShopServicesQuery,
  useShopEmployeesQuery
} from '../hooks/queries';
import { useBookingUIStore } from '../store/uiStore';
import { Appointment } from '../types';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorState from '../components/ui/ErrorState';
import ServiceSelection from '../components/booking/ServiceSelection';
import EmployeeSelection from '../components/booking/EmployeeSelection';
import DateTimeSelection from '../components/booking/DateTimeSelection';
import CustomerDetails from '../components/booking/CustomerDetails';
import PaymentMethodSelection from '../components/booking/PaymentMethodSelection';
import BookingSuccess from '../components/booking/BookingSuccess';
import SlotCountdown from '../components/booking/SlotCountdown';
import BookingLoadingSpinner from '../components/booking/BookingLoadingSpinner';
import BookingErrorState from '../components/booking/BookingErrorState';
import AppointmentValidationGuard from '../components/booking/AppointmentValidationGuard';
import BookingPreventionSystem from '../components/booking/BookingPreventionSystem';

import { useSlotSubscriptions } from '../hooks/useSlotSubscriptions';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';


type BookingStep = 'service' | 'employee' | 'datetime' | 'details' | 'payment' | 'success';

const BookingPage: React.FC = () => {
  const { shopId, serviceId } = useParams<{ shopId: string; serviceId?: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  // React Query hooks for data fetching
  const {
    data: currentShop,
    isLoading: isShopLoading,
    error: shopError
  } = useShopQuery(shopId);

  const {
    data: services = [],
    isLoading: isServicesLoading
  } = useShopServicesQuery(shopId, true);

  const {
    data: employees = [],
    isLoading: isEmployeesLoading
  } = useShopEmployeesQuery(shopId, true);

  // UI state from Zustand
  const {
    selectedService,
    selectedEmployee,
    selectedDate,
    selectedSlot,
    currentLockSessionId,
    setSelectedService,
    setSelectedEmployee,
    setSelectedDate,
    setSelectedSlot,
    setCurrentShopId,
    clearBookingState,
    addLockedSlot,
    removeLockedSlot,
    setCurrentLockSessionId,
    setSlotState,
    getSlotState,
    clearSlotState,
    addBookedSlot,
    removeBookedSlot,
  } = useBookingUIStore();

  // Combined loading state
  const shopLoading = isShopLoading || isServicesLoading || isEmployeesLoading;

  // Helper function to generate slot keys for state management (matches DateTimeSelection format)
  const generateSlotKey = useCallback((slotData: any) => {
    const currentShopId = slotData.shopId || shopId;
    const serviceId = slotData.serviceId || selectedService?.id;
    const employeeId = slotData.employeeId || selectedEmployee?.id;
    const date = slotData.date || selectedDate;

    // Handle different datetime formats from WebSocket messages
    let dateTimeStr = slotData.dateTime;
    if (!dateTimeStr && date && slotData.slotTime) {
      dateTimeStr = `${date}T${slotData.slotTime}:00`;
    } else if (!dateTimeStr && slotData.time) {
      dateTimeStr = `${date}T${slotData.time}:00`;
    }

    if (dateTimeStr && currentShopId && serviceId && employeeId) {
      return `${currentShopId}-${serviceId}-${employeeId}-${dateTimeStr}`;
    }

    console.warn('🚫 Could not generate slot key:', { slotData, currentShopId, serviceId, employeeId, dateTimeStr });
    return null;
  }, [shopId, selectedService?.id, selectedEmployee?.id, selectedDate]);

  // Helper function to update slot state based on WebSocket message
  const updateSlotStateFromMessage = useCallback((slotData: any, action: string) => {
    const slotKey = generateSlotKey(slotData);
    if (!slotKey) return;

    console.log('🔄 Updating slot state:', { slotKey, action, userId: slotData.userId, currentUser: user?.id });

    switch (action) {
      case 'LOCKED':
        // Check if this lock belongs to the current user
        // For authenticated users: check userId match
        // For guest users and all users: check if the lock token matches current session
        const isCurrentUserLock = (
          // Check user ID match for authenticated users
          (slotData.userId && user?.id && slotData.userId === user.id) ||
          // Check lock token match for current session (works for both auth and guest users)
          (slotData.sessionId && currentLockSessionId && slotData.sessionId === currentLockSessionId)
        );

        if (isCurrentUserLock) {
          // Current user's own lock - show as locked (green, clickable)
          setSlotState(slotKey, {
            state: 'locked',
            lockToken: slotData.sessionId,
            lastAttempt: Date.now()
          });
          console.log('🔒 Current user locked slot:', slotKey);
        } else {
          // Another user's lock - show as error (red, not clickable)
          setSlotState(slotKey, {
            state: 'error',
            error: 'Slot is temporarily reserved by another user',
            lastAttempt: Date.now()
          });
          console.log('🔒 Another user locked slot:', slotKey);
        }
        break;
      case 'UNLOCKED':
      case 'CANCELLED':
      case 'AVAILABLE':
        // Clear the slot state to make it available again
        clearSlotState(slotKey);
        break;
      case 'BOOKED':
        // Check if this booking belongs to the current user
        const isCurrentUserBooking = (
          // Check user ID match for authenticated users
          (slotData.userId && user?.id && slotData.userId === user.id) ||
          // Check lock token match for current session (works for both auth and guest users)
          (slotData.sessionId && currentLockSessionId && slotData.sessionId === currentLockSessionId)
        );

        if (isCurrentUserBooking) {
          // Current user's own booking - clear the slot state since they're done with booking
          clearSlotState(slotKey);
          console.log('✅ Current user booked slot:', slotKey);
          // Note: Cache invalidation for current user's booking is handled in handleBookingSuccess
        } else {
          // Another user's booking - immediately mark as booked for instant UI update
          const slotDateTime = slotData.dateTime || slotData.time;
          if (slotDateTime) {
            addBookedSlot(slotDateTime);
            console.log('⚡ Immediately marked slot as booked by another user:', slotDateTime);
          }

          // Also set slot state as error for additional visual feedback
          setSlotState(slotKey, {
            state: 'error',
            error: 'This time slot has been booked by another customer',
            lastAttempt: Date.now()
          });
          console.log('📅 Another user booked slot:', slotKey);

          // Force refresh of available slots to remove the booked slot
          console.log('🔄 Invalidating slot cache due to another user booking');
          invalidateSlotCache(slotData);
        }
        break;
      case 'UNAVAILABLE':
        // Slot is unavailable due to schedule changes
        setSlotState(slotKey, {
          state: 'error',
          error: 'This time slot is no longer available',
          lastAttempt: Date.now()
        });
        break;
      default:
        console.log('🤷 Unknown action for slot state update:', action);
    }
  }, [generateSlotKey, setSlotState, clearSlotState, user?.id, currentLockSessionId]);

  // Helper function to invalidate slot cache for real-time updates
  const invalidateSlotCache = useCallback((slotData: any) => {
    const params = {
      shopId: slotData.shopId || shopId,
      serviceId: slotData.serviceId || selectedService?.id,
      employeeId: slotData.employeeId || selectedEmployee?.id,
      date: slotData.date || selectedDate,
    };

    // Only invalidate if we have all required parameters
    if (params.shopId && params.serviceId && params.employeeId && params.date) {
      console.log('🔄 Invalidating slot cache for real-time update:', params);
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.availableSlots(params)
      });
      console.log('✅ Slot cache invalidated - available slots will refresh');
    }
  }, [queryClient, shopId, selectedService?.id, selectedEmployee?.id, selectedDate]);

  const [currentStep, setCurrentStep] = useState<BookingStep>('service');

  // Debug step changes
  const setCurrentStepWithLogging = (step: BookingStep) => {
    console.log('🔄 BOOKING PAGE: Step change', { from: currentStep, to: step });
    setCurrentStep(step);
  };
  const [customerData, setCustomerData] = useState({
    customerFirstName: user?.firstName || '',
    customerLastName: user?.lastName || '',
    customerEmail: user?.email || '',
    customerPhone: user?.phone || '',
    notes: '',
  });

  // Memoize the setCustomerData function to prevent infinite loops
  const handleCustomerDataChange = useCallback((data: {
    customerFirstName: string;
    customerLastName: string;
    customerEmail: string;
    customerPhone: string;
    notes: string;
  }) => {
    setCustomerData(data);
  }, []);
  const [createdAppointment, setCreatedAppointment] = useState<Appointment | null>(null);
  const [isBookingComplete, setIsBookingComplete] = useState(false);

  const [validationIssues, setValidationIssues] = useState<any[]>([]);
  const [preventionBlockers, setPreventionBlockers] = useState<any[]>([]);
  const [canProceedWithBooking, setCanProceedWithBooking] = useState(true);

  // WebSocket for slot updates only (separate from notifications)
  const {
    subscribeToSlots,
    unsubscribeFromSlots,
    unsubscribeFromAllSlots,
    slotSubscriptions
  } = useSlotSubscriptions({
    onSlotUpdate: (message) => {
      console.log('📨 Slot update received in BookingPage:', message);

      // Handle the standardized SLOT_UPDATE message format from backend
      if (message.type === 'SLOT_UPDATE' || message.data?.type === 'SLOT_UPDATE') {
        const slotData = message.data || message;
        const action = slotData.action;
        const slotTime = slotData.dateTime || slotData.time;

        console.log('🔄 Processing SLOT_UPDATE:', { action, slotTime, slotData });

        switch (action) {
          case 'LOCKED':
            console.log('🔒 Slot locked by another user:', slotTime);
            addLockedSlot(slotTime);
            updateSlotStateFromMessage(slotData, action);
            invalidateSlotCache(slotData);
            break;
          case 'UNLOCKED':
            console.log('🔓 Slot unlocked:', slotTime);
            removeLockedSlot(slotTime);
            updateSlotStateFromMessage(slotData, action);
            invalidateSlotCache(slotData);
            break;
          case 'BOOKED':
            console.log('📅 Slot permanently booked by another user:', slotTime);
            addLockedSlot(slotTime);
            updateSlotStateFromMessage(slotData, action);
            invalidateSlotCache(slotData);
            break;
          case 'CANCELLED':
            console.log('❌ Slot booking cancelled:', slotTime);
            removeLockedSlot(slotTime);
            updateSlotStateFromMessage(slotData, action);
            invalidateSlotCache(slotData);
            break;
          case 'AVAILABLE':
            console.log('✅ Slot became available:', slotTime);
            removeLockedSlot(slotTime);
            updateSlotStateFromMessage(slotData, action);
            invalidateSlotCache(slotData);
            break;
          case 'UNAVAILABLE':
            console.log('🚫 Slot became unavailable:', slotTime);
            addLockedSlot(slotTime);
            updateSlotStateFromMessage(slotData, action);
            invalidateSlotCache(slotData);
            break;
          case 'EARLY_COMPLETION':
            console.log('⚡ Early completion - new slots available:', slotData);
            // Remove any locked slots in the freed time range
            if (slotData.availableFrom && slotData.availableUntil) {
              console.log('🔓 Freeing slots from early completion:', slotData.availableFrom, 'to', slotData.availableUntil);
              // Trigger a refresh of available slots for the current selection
              if (selectedEmployee && selectedService && selectedDate) {
                // Force refresh of slots by clearing cache and refetching
                setTimeout(() => {
                  console.log('🔄 Refreshing slots due to early completion');
                  // This will trigger a re-fetch of available slots
                  setSelectedDate(selectedDate);
                }, 500);
              }
            }
            break;
          default:
            console.log('🤷 Unknown slot update action:', action);
        }
      } else {
        // Handle legacy message types and system messages
        switch (message.type) {
          case 'subscription_confirmed':
            console.log('✅ Slot subscription confirmed:', message.topic);
            break;
          case 'unsubscription_confirmed':
            console.log('✅ Slot unsubscription confirmed:', message.topic);
            break;
          case 'SLOT_HELD':
          case 'SLOT_LOCKED':
            console.log('🔒 Legacy slot held/locked:', message.payload?.dateTime || message.payload?.time);
            addLockedSlot(message.payload?.dateTime || message.payload?.time);
            break;
          case 'SLOT_RELEASED':
          case 'SLOT_UNLOCKED':
            console.log('🔓 Legacy slot released/unlocked:', message.payload?.dateTime || message.payload?.time);
            removeLockedSlot(message.payload?.dateTime || message.payload?.time);
            break;
          case 'SLOT_BOOKED':
            console.log('📅 Legacy slot booked:', message.payload?.dateTime || message.payload?.time);
            addLockedSlot(message.payload?.dateTime || message.payload?.time);
            break;
          case 'AVAILABILITY_UPDATE':
            console.log('📊 Availability update for employee:', message.payload);
            break;
          default:
            console.log('🤷 Unknown message type:', message.type);
        }
      }
    },
  });



  // Set current shop ID when shopId changes
  useEffect(() => {
    if (shopId) {
      setCurrentShopId(shopId);
    }

    return () => {
      clearBookingState();
    };
  }, [shopId, setCurrentShopId, clearBookingState]);

  // Handle service pre-selection separately to avoid infinite loop
  useEffect(() => {
    if (serviceId && services.length > 0 && !selectedService) {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        setSelectedService(service);
        setCurrentStep('employee');
      }
    }
  }, [serviceId, services, selectedService, setSelectedService]);

  // Subscribe to slot updates when date is selected and on datetime step
  useEffect(() => {
    if (currentStep === 'datetime' && selectedEmployee && selectedDate && selectedService && shopId) {
      console.log('🔌 Subscribing to slot updates for:', {
        employeeId: selectedEmployee.id,
        date: selectedDate,
        serviceId: selectedService.id
      });

      const subscription = {
        shopId: shopId,
        employeeId: selectedEmployee.id,
        date: selectedDate,
        serviceId: selectedService.id
      };

      const success = subscribeToSlots(subscription);
      console.log('🔌 Subscription result:', success);

      // Return cleanup function that unsubscribes from this specific subscription
      return () => {
        console.log('🔌 Unsubscribing from slot updates due to dependency change or unmount');
        unsubscribeFromSlots(subscription);
      };
    }

    // No cleanup needed if we didn't subscribe
    return undefined;
  }, [currentStep, selectedEmployee, selectedDate, selectedService, shopId]); // Removed function dependencies

  // Cleanup all slot subscriptions on unmount (only when component unmounts, not on re-renders)
  useEffect(() => {
    return () => {
      console.log('🔌 BookingPage unmounting, cleaning up all slot subscriptions');
      unsubscribeFromAllSlots();
    };
  }, []); // Empty dependency array - only run on unmount



  const handleBack = () => {
    // Prevent going back if booking is complete
    if (isBookingComplete) {
      return;
    }

    switch (currentStep) {
      case 'employee':
        // Clear selected service when going back
        setSelectedService(null);
        setCurrentStep('service');
        break;
      case 'datetime':
        // Clear selected employee when going back
        setSelectedEmployee(null);
        setSelectedDate(null);
        setSelectedSlot(null);
        setCurrentStep('employee');
        break;
      case 'details':
        // Don't unlock slot when going back to datetime - keep it reserved
        setCurrentStep('datetime');
        break;
      case 'payment':
        // Go back to details if unauthenticated, or datetime if authenticated
        // Don't unlock slot - keep it reserved
        if (isAuthenticated) {
          setCurrentStep('datetime');
        } else {
          setCurrentStep('details');
        }
        break;
      case 'success':
        // Don't allow going back from success
        return;
      default:
        navigate(`/shop/${shopId}`);
    }
  };

  const handleBookingSuccess = (appointment: Appointment) => {
    setCreatedAppointment(appointment);
    setIsBookingComplete(true);
    setCurrentStep('success');

    // Immediately add slot to booked slots for instant UI update
    if (selectedSlot && selectedDate) {
      const bookedSlotDateTime = `${selectedDate}T${selectedSlot}:00`;
      addBookedSlot(bookedSlotDateTime);
      console.log('⚡ Immediately marked slot as booked:', bookedSlotDateTime);
    }

    // Invalidate slot cache to remove the booked slot from available slots
    if (selectedEmployee && selectedDate && selectedService) {
      console.log('🔄 Invalidating slot cache after successful booking');
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.availableSlots({
          shopId: shopId,
          serviceId: selectedService.id,
          employeeId: selectedEmployee.id,
          date: selectedDate,
        })
      });

      // Clear any slot state for the booked slot
      if (selectedSlot) {
        const bookedSlotKey = `${shopId}-${selectedService.id}-${selectedEmployee.id}-${selectedDate}T${selectedSlot}:00`;
        clearSlotState(bookedSlotKey);
        console.log('🧹 Cleared slot state for booked slot:', bookedSlotKey);
      }
    }
  };

  // Memoized callback for slot countdown expiration to prevent re-renders
  const handleSlotExpired = useCallback(() => {
    // Reset to datetime step when slot expires
    setCurrentStep('datetime');
  }, []);

  // Memoized callback for validation change to prevent infinite loops
  const handleValidationChange = useCallback((isValid: boolean, issues: any[]) => {
    setValidationIssues(issues);
  }, []);

  const getStepNumber = (step: BookingStep): number => {
    const steps = ['service', 'employee', 'datetime', 'details', 'payment', 'success'];
    return steps.indexOf(step) + 1;
  };

  const getStepLabel = (step: BookingStep): string => {
    const labels = {
      service: 'Service',
      employee: 'Specialist',
      datetime: 'Date & Time',
      details: 'Details',
      payment: 'Payment'
    };
    return labels[step] || step;
  };

  const getStepDescription = (step: BookingStep): string => {
    const descriptions = {
      service: 'Choose your desired service',
      employee: 'Select your preferred specialist',
      datetime: 'Pick your appointment time',
      details: 'Provide your contact information',
      payment: 'Complete your booking'
    };
    return descriptions[step] || '';
  };

  const getStepTimeEstimate = (step: BookingStep): string => {
    const estimates = {
      service: '1-2 minutes',
      employee: '1 minute',
      datetime: '2-3 minutes',
      details: '2 minutes',
      payment: '2-3 minutes'
    };
    return estimates[step] || '1-2 minutes';
  };

  const isStepCompleted = (step: BookingStep): boolean => {
    const stepOrder = ['service', 'employee', 'datetime', 'details', 'payment'];
    const currentStepIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(step);

    // A step is completed only if we've moved past it
    return stepIndex < currentStepIndex;
  };

  if (shopLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 flex items-center justify-center">
        <BookingLoadingSpinner step="service" message="Loading shop information..." size="lg" />
      </div>
    );
  }

  if (shopError || !currentShop) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 flex items-center justify-center">
        <BookingErrorState
          type="general"
          title="Shop Not Found"
          message="The shop you're looking for doesn't exist or is temporarily unavailable."
          onGoBack={() => navigate('/search')}
          showRetry={false}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-12">

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-neutral-800 mb-3 bg-gradient-to-r from-neutral-800 to-accent-700 bg-clip-text text-transparent">
                Book Your Appointment
              </h1>
              <div className="flex items-center text-neutral-600">
                <div className="w-2 h-2 bg-accent-500 rounded-full mr-3 animate-pulse"></div>
                <p className="text-lg">
                  {currentShop.name} • {currentShop.city}, {currentShop.state}
                </p>
              </div>
            </div>




          </div>
        </div>

        {/* Enhanced Progress Steps - Hide on success */}
        {currentStep !== 'success' && (
          <div className="mb-12">
            {/* Progress Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-neutral-800 mb-2">
                Book Your Appointment
              </h2>
              <p className="text-neutral-600">
                Step {getStepNumber(currentStep)} of 5 - {getStepDescription(currentStep)}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="relative mb-8">
              <div className="absolute top-6 left-0 w-full h-0.5 bg-neutral-200 rounded-full" />
              <div
                className="absolute top-6 left-0 h-0.5 bg-gradient-to-r from-accent-600 to-accent-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${(getStepNumber(currentStep) - 1) * 25}%` }}
              />

              <div className="relative flex justify-between">
                {(['service', 'employee', 'datetime', 'details', 'payment'] as BookingStep[]).map((step, index) => (
                  <div key={step} className="flex flex-col items-center">
                    {/* Step Circle */}
                    <div className={`
                      relative w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold
                      transition-all duration-500 transform border-2
                      ${currentStep === step
                        ? 'bg-accent-600 text-white border-accent-600 shadow-lg scale-110 ring-4 ring-accent-200'
                        : isStepCompleted(step)
                        ? 'bg-accent-500 text-white border-accent-500 shadow-md scale-105'
                        : getStepNumber(currentStep) > index + 1
                        ? 'bg-accent-500 text-white border-accent-500'
                        : 'bg-white text-neutral-400 border-neutral-200 hover:border-accent-300'
                      }
                    `}>
                      {isStepCompleted(step) || getStepNumber(currentStep) > index + 1 ? (
                        <CheckCircle className="h-6 w-6 animate-in zoom-in duration-300" />
                      ) : (
                        <span className="font-bold">{index + 1}</span>
                      )}

                      {/* Active Step Pulse */}
                      {currentStep === step && (
                        <div className="absolute inset-0 rounded-full bg-accent-600 animate-ping opacity-20" />
                      )}
                    </div>

                    {/* Step Label */}
                    <div className="mt-3 text-center">
                      <p className={`text-xs font-medium transition-colors duration-300 ${
                        currentStep === step
                          ? 'text-accent-700'
                          : isStepCompleted(step) || getStepNumber(currentStep) > index + 1
                          ? 'text-accent-600'
                          : 'text-neutral-500'
                      }`}>
                        {getStepLabel(step)}
                      </p>
                      {currentStep === step && (
                        <div className="mt-1 w-2 h-2 bg-accent-600 rounded-full mx-auto animate-pulse" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step Time Estimate */}
            <div className="text-center">
              <p className="text-sm text-neutral-500">
                <Clock className="inline h-4 w-4 mr-1" />
                Estimated time: {getStepTimeEstimate(currentStep)}
              </p>
            </div>
          </div>
        )}

        {/* Slot Countdown - Show when slot is locked and not on datetime step */}
        {selectedSlot && currentLockSessionId && currentStep !== 'success' && currentStep !== 'datetime' && (
          <div className="mb-6">
            <SlotCountdown onExpired={handleSlotExpired} />
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-3xl shadow-2xl border border-neutral-200 p-10 transition-all duration-500 hover:shadow-3xl backdrop-blur-sm">
          {/* Validation and Prevention - Non-blocking */}
          <BookingPreventionSystem
            selectedService={selectedService}
            selectedEmployee={selectedEmployee}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            onPreventionChange={(canProceed, blockers, warnings) => {
              setCanProceedWithBooking(canProceed);
              setPreventionBlockers(blockers);
            }}
          >
            <div></div>
          </BookingPreventionSystem>

          <AppointmentValidationGuard
            selectedService={selectedService}
            selectedEmployee={selectedEmployee}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            onValidationChange={handleValidationChange}
          >
            <div></div>
          </AppointmentValidationGuard>
          {currentStep === 'service' && (
            <div className="animate-in fade-in slide-in-from-right-5 duration-700 ease-out">
              <ServiceSelection
                services={services}
                selectedService={selectedService}
                shopCountry={currentShop?.country}
                onServiceSelect={(service) => {
                  setSelectedService(service);
                  // Auto-advance to employee selection with smooth transition
                  setTimeout(() => setCurrentStep('employee'), 800);
                }}
              />
            </div>
          )}

          {currentStep === 'employee' && selectedService && (
            <div className="animate-in fade-in slide-in-from-right-5 duration-700 ease-out">
              <EmployeeSelection
                employees={employees.filter(emp =>
                  emp.services && Array.isArray(emp.services) && emp.services.some(s => s.id === selectedService.id)
                )}
                selectedEmployee={selectedEmployee}
                onEmployeeSelect={(employee) => {
                  setSelectedEmployee(employee);
                  // Auto-advance to datetime selection with smooth transition
                  setTimeout(() => setCurrentStep('datetime'), 800);
                }}
                onBack={handleBack}
              />
            </div>
          )}

          {currentStep === 'datetime' && selectedService && selectedEmployee && (
            <div className="animate-in fade-in slide-in-from-right-5 duration-700 ease-out">
              <DateTimeSelection
                onBack={handleBack}
                onDateTimeSelect={() => {
                console.log('📅 BOOKING PAGE: onDateTimeSelect called', {
                  isAuthenticated,
                  currentStep,
                  selectedService: !!selectedService,
                  selectedEmployee: !!selectedEmployee,
                  selectedDate: !!selectedDate,
                  selectedSlot: !!selectedSlot,
                  currentLockSessionId: !!currentLockSessionId
                });

                // Get fresh state to ensure we have the latest values
                const freshState = useBookingUIStore.getState();
                console.log('📅 BOOKING PAGE: Fresh state check', {
                  freshService: !!freshState.selectedService,
                  freshEmployee: !!freshState.selectedEmployee,
                  freshDate: !!freshState.selectedDate,
                  freshSlot: !!freshState.selectedSlot,
                  freshLockSession: !!freshState.currentLockSessionId
                });

                // Use fresh state for validation
                if (!freshState.selectedService || !freshState.selectedEmployee || !freshState.selectedDate) {
                  console.error('❌ BOOKING PAGE: Missing core required data for step progression', {
                    missingService: !freshState.selectedService,
                    missingEmployee: !freshState.selectedEmployee,
                    missingDate: !freshState.selectedDate
                  });
                  return;
                }

                // For slot and lock session, we'll be more lenient as they might be updating
                if (!freshState.selectedSlot || !freshState.currentLockSessionId) {
                  console.warn('⚠️ BOOKING PAGE: Slot/lock data missing, but proceeding as it might be updating', {
                    missingSlot: !freshState.selectedSlot,
                    missingLockSession: !freshState.currentLockSessionId
                  });
                }

                // Unsubscribe from slot updates when moving to next step
                if (freshState.selectedEmployee && freshState.selectedDate) {
                  console.log('🔌 Unsubscribing from slot updates after slot selection');
                  unsubscribeFromSlots({
                    shopId: shopId!,
                    employeeId: freshState.selectedEmployee.id,
                    date: freshState.selectedDate,
                    serviceId: freshState.selectedService?.id
                  });
                }

                // Skip customer details if user is authenticated
                if (isAuthenticated) {
                  console.log('📅 BOOKING PAGE: Moving to payment step (authenticated user)');
                  setCurrentStepWithLogging('payment');
                } else {
                  console.log('📅 BOOKING PAGE: Moving to details step (guest user)');
                  setCurrentStepWithLogging('details');
                }
              }}

              shopId={shopId}
            />
            </div>
          )}

          {currentStep === 'details' && !isAuthenticated && (
            <div className="animate-in fade-in slide-in-from-right-5 duration-700 ease-out">
              <CustomerDetails
                customerData={customerData}
                onCustomerDataChange={handleCustomerDataChange}
                onNext={() => setCurrentStep('payment')}
                isAuthenticated={isAuthenticated}
                onBack={handleBack}
              />
            </div>
          )}

          {currentStep === 'payment' && currentShop && selectedService && selectedEmployee && selectedDate && selectedSlot && (
            <div className="animate-in fade-in slide-in-from-right-5 duration-700 ease-out">
              <PaymentMethodSelection
                shop={currentShop}
                service={selectedService}
                employee={selectedEmployee}
                date={selectedDate}
                slot={selectedSlot}
                customerData={customerData}
                onSuccess={handleBookingSuccess}
                onBack={() => {
                  if (isAuthenticated) {
                    setCurrentStepWithLogging('datetime');
                  } else {
                    setCurrentStepWithLogging('details');
                  }
                }}
              />
            </div>
          )}

          {currentStep === 'success' && createdAppointment && (
            <div className="animate-in fade-in slide-in-from-bottom-5 duration-1000 ease-out">
              <BookingSuccess
                appointment={createdAppointment}
                shop={currentShop!}
                service={selectedService!}
                employee={selectedEmployee!}
                date={selectedDate!}
                slot={selectedSlot!}
                customerData={customerData}
                paymentMethod={createdAppointment.paymentType}
                isAuthenticated={isAuthenticated}
                onGoToShop={() => navigate(`/shop/${shopId}`)}
                onViewAppointments={() => navigate('/appointments')}
                onCreateAccount={() => navigate('/signup')}
              />
            </div>
          )}
        </div>
      </div>


    </div>
  );
};

export default BookingPage;
