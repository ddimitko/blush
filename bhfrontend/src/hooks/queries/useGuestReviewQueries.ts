import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { GuestReviewRequest, GuestReviewResponse, GuestAppointmentForReview } from '../../types';

// Get guest appointment for review
export const useGuestAppointmentForReviewQuery = (
  appointmentId: string, 
  guestEmail: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['guest-reviews', 'appointment', appointmentId, guestEmail],
    queryFn: () => apiClient.getGuestAppointmentForReview(appointmentId, guestEmail),
    enabled: enabled && !!appointmentId && !!guestEmail,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Check if guest can review appointment
export const useCanGuestReviewQuery = (
  appointmentId: string, 
  guestEmail: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['guest-reviews', 'can-review', appointmentId, guestEmail],
    queryFn: () => apiClient.canGuestReviewAppointment(appointmentId, guestEmail),
    enabled: enabled && !!appointmentId && !!guestEmail,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Submit guest review mutation
export const useSubmitGuestReviewMutation = () => {
  return useMutation({
    mutationFn: (reviewData: GuestReviewRequest) => apiClient.submitGuestReview(reviewData),
    onError: (error: any) => {
      console.error('Failed to submit guest review:', error);
    },
  });
};
