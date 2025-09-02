import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { queryKeys } from '../../lib/queryClient';

// Types
interface CreateReviewRequest {
  appointmentId: string;
  stars: number;
  comment?: string;
  anonymous?: boolean;
}

interface Review {
  id: string;
  stars: number;
  comment?: string;
  anonymous: boolean;
  userName: string;
  shopName: string;
  employeeName: string;
  serviceName: string;
  appointmentId: string;
  createdAt: string;
  formattedDate: string;
}

// Create review mutation
export const useCreateReviewMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewData: CreateReviewRequest) => apiClient.createReview(reviewData),
    onSuccess: () => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all });
    },
  });
};

// Create review with image mutation
export const useCreateReviewWithImageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => apiClient.createReviewWithImage(formData),
    onSuccess: () => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all });
    },
  });
};

// Get review by appointment
export const useReviewByAppointmentQuery = (appointmentId: string) => {
  return useQuery({
    queryKey: queryKeys.reviews.byAppointment(appointmentId),
    queryFn: async () => {
      const response = await fetch(`/api/ratings/appointment/${appointmentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch review');
      }

      return response.json();
    },
    enabled: !!appointmentId,
  });
};

// Get user's reviews
export const useUserReviewsQuery = () => {
  return useQuery({
    queryKey: queryKeys.reviews.byUser,
    queryFn: async () => {
      const response = await fetch('/api/ratings/my-ratings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user reviews');
      }

      return response.json();
    },
  });
};

// Get shop reviews
export const useShopReviewsQuery = (shopId: string, page = 0, size = 10) => {
  return useQuery({
    queryKey: queryKeys.reviews.byShop(shopId, page, size),
    queryFn: () => apiClient.getShopReviews(shopId, page, size),
    enabled: !!shopId && shopId.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      // Don't retry on client errors (4xx) except for network issues
      if (status === 401 || status === 403 || status === 404 || status === 409) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

// Get shop rating statistics
export const useShopRatingStatsQuery = (shopId: string) => {
  return useQuery({
    queryKey: queryKeys.reviews.shopStats(shopId),
    queryFn: () => apiClient.getShopRatingStats(shopId),
    enabled: !!shopId && shopId.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      // Don't retry on client errors (4xx) except for network issues
      if (status === 401 || status === 403 || status === 404 || status === 409) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

// Check if user can rate appointment
export const useCanRateAppointmentQuery = (appointmentId: string) => {
  return useQuery({
    queryKey: queryKeys.reviews.canRate(appointmentId),
    queryFn: async () => {
      const response = await fetch(`/api/ratings/can-rate/${appointmentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to check rating eligibility');
      }

      return response.json();
    },
    enabled: !!appointmentId,
  });
};
