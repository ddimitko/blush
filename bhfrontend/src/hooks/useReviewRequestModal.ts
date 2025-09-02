import { useState, useEffect, useCallback } from 'react';
import { useCreateReviewMutation } from './queries';
import { useToast } from '../components/ui/Toast';
import { Appointment } from '../types';

interface ReviewData {
  rating: number;
  comment: string;
  appointmentId: string;
  anonymous?: boolean;
}

interface UseReviewRequestModalProps {
  onReviewSubmitted?: (appointmentId: string) => void;
}

export const useReviewRequestModal = ({ onReviewSubmitted }: UseReviewRequestModalProps = {}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(null);
  const [hasBeenShown, setHasBeenShown] = useState<Set<string>>(new Set());
  
  const createReviewMutation = useCreateReviewMutation();
  const { success, error } = useToast();

  // Show modal for a specific appointment
  const showReviewModal = useCallback((appointment: Appointment) => {
    // Check if we've already shown this modal for this appointment
    if (hasBeenShown.has(appointment.id)) {
      return;
    }

    // Only show for completed appointments
    if (appointment.status !== 'COMPLETED') {
      return;
    }

    // Only show for authenticated users (not guest appointments)
    if (!appointment.customer) {
      return;
    }

    setCurrentAppointment(appointment);
    setIsOpen(true);
    
    // Mark as shown so it doesn't appear again
    setHasBeenShown(prev => new Set(prev).add(appointment.id));
  }, [hasBeenShown]);

  // Handle review submission
  const handleReviewSubmit = useCallback(async (reviewData: ReviewData) => {
    try {
      await createReviewMutation.mutateAsync({
        appointmentId: reviewData.appointmentId,
        stars: reviewData.rating,
        comment: reviewData.comment,
        anonymous: reviewData.anonymous,
      });

      success('Review submitted', 'Thank you for your feedback!');
      setIsOpen(false);
      setCurrentAppointment(null);
      
      // Notify parent component
      if (onReviewSubmitted) {
        onReviewSubmitted(reviewData.appointmentId);
      }
    } catch (err: any) {
      error('Failed to submit review', err.message || 'Please try again later.');
      throw err; // Re-throw so the modal can handle loading states
    }
  }, [createReviewMutation, success, error, onReviewSubmitted]);

  // Close modal
  const closeModal = useCallback(() => {
    setIsOpen(false);
    setCurrentAppointment(null);
  }, []);

  // Handle notification clicks for review requests
  const handleReviewNotificationClick = useCallback((notificationData: any) => {
    if (notificationData?.type === 'review_request' && notificationData?.appointmentId) {
      // For notification clicks, we need to fetch the appointment data
      // This would typically be done by the parent component that has access to appointment data
      console.log('Review notification clicked for appointment:', notificationData.appointmentId);
      
      // The parent component should call showReviewModal with the appointment data
      return notificationData.appointmentId;
    }
    return null;
  }, []);

  // Reset shown appointments when user changes (for testing/development)
  const resetShownAppointments = useCallback(() => {
    setHasBeenShown(new Set());
  }, []);

  // Auto-show modal when appointment ends (for real-time scenarios)
  const checkForCompletedAppointments = useCallback((appointments: Appointment[]) => {
    const now = new Date();
    
    appointments.forEach(appointment => {
      // Check if appointment just ended (within last 5 minutes) and is completed
      const endTime = new Date(appointment.endDateTime);
      const timeSinceEnd = now.getTime() - endTime.getTime();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (
        appointment.status === 'COMPLETED' &&
        timeSinceEnd >= 0 && 
        timeSinceEnd <= fiveMinutes &&
        !hasBeenShown.has(appointment.id)
      ) {
        // Small delay to ensure the appointment status has been updated
        setTimeout(() => {
          showReviewModal(appointment);
        }, 1000);
      }
    });
  }, [showReviewModal, hasBeenShown]);

  return {
    // Modal state
    isOpen,
    currentAppointment,
    
    // Actions
    showReviewModal,
    closeModal,
    handleReviewSubmit,
    handleReviewNotificationClick,
    checkForCompletedAppointments,
    resetShownAppointments,
    
    // Status
    isSubmitting: createReviewMutation.isPending,
  };
};
