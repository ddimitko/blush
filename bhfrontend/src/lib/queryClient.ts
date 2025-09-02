import { QueryClient } from '@tanstack/react-query';

// Create a query client with optimized defaults for Lunara
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests with smart logic
      retry: (failureCount, error: any) => {
        // Don't retry auth errors (401, 403)
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return false;
        }
        // Don't retry client errors (4xx)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Retry server errors up to 2 times
        return failureCount < 2;
      },
      // Retry with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      // Optimized refetching to prevent double renders
      refetchOnWindowFocus: false, // Disabled to prevent unnecessary refetches
      refetchOnReconnect: true,
      refetchOnMount: 'always', // Changed to 'always' for consistency
      // Prevent double fetching in Strict Mode
      refetchInterval: false,
      refetchIntervalInBackground: false,
      // Network mode for better offline handling
      networkMode: 'online',
    },
    mutations: {
      // Don't retry mutations by default for data integrity
      retry: false,
      // Network mode for mutations
      networkMode: 'online',
    },
  },
});

// Query key factory for consistent cache keys
export const queryKeys = {
  // Authentication
  auth: {
    user: ['auth', 'user'] as const,
    connections: ['auth', 'connections'] as const,
    onboardingStatus: ['auth', 'onboarding-status'] as const,
  },

  // User
  user: {
    paymentMethods: ['user', 'payment-methods'] as const,
  },
  
  // Shops
  shops: {
    all: ['shops'] as const,
    search: (params: any) => ['shops', 'search', params] as const,
    detail: (id: string) => ['shops', 'detail', id] as const,
    employees: (shopId: string) => ['shops', shopId, 'employees'] as const,
    services: (shopId: string) => ['shops', shopId, 'services'] as const,
    hours: (shopId: string) => ['shops', shopId, 'hours'] as const,
    analytics: (shopId: string) => ['shops', shopId, 'analytics'] as const,
  },
  
  // Appointments
  appointments: {
    all: ['appointments'] as const,
    shop: (shopId: string) => ['appointments', 'shop', shopId] as const,
    user: ['appointments', 'user'] as const,
    availableSlots: (params: any) => ['appointments', 'slots', params] as const,
  },
  
  // Notifications
  notifications: {
    all: ['notifications'] as const,
    unread: ['notifications', 'unread'] as const,
  },

  // Reviews/Ratings
  reviews: {
    all: ['reviews'] as const,
    byUser: ['reviews', 'user'] as const,
    byShop: (shopId?: string, page?: number, size?: number) =>
      ['reviews', 'shop', shopId, page, size] as const,
    byAppointment: (appointmentId: string) =>
      ['reviews', 'appointment', appointmentId] as const,
    shopStats: (shopId: string) =>
      ['reviews', 'shop', shopId, 'stats'] as const,
    canRate: (appointmentId: string) =>
      ['reviews', 'can-rate', appointmentId] as const,
  },

  // Guest Reviews
  guestReviews: {
    appointment: (appointmentId: string, guestEmail: string) =>
      ['guest-reviews', 'appointment', appointmentId, guestEmail] as const,
    canReview: (appointmentId: string, guestEmail: string) =>
      ['guest-reviews', 'can-review', appointmentId, guestEmail] as const,
  },
  
  // Stripe
  stripe: {
    subscription: (shopId: string) => ['stripe', 'subscription', shopId] as const,
    connect: (shopId: string) => ['stripe', 'connect', shopId] as const,
  },
  
  // Owner data
  owner: {
    shops: ['owner', 'shops'] as const,
    analytics: ['owner', 'analytics'] as const,
  },

  // Content
  content: {
    faqs: ['content', 'faqs'] as const,
    news: (params?: any) => ['content', 'news', params] as const,
    newsItem: (newsId: string) => ['content', 'news', 'detail', newsId] as const,
    featuredNews: (limit: number) => ['content', 'news', 'featured', limit] as const,
  },
} as const;

// Helper function to invalidate related queries
export const invalidateQueries = {
  // Invalidate all shop-related data
  shop: (shopId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.shops.detail(shopId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.shops.employees(shopId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.shops.services(shopId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.shops.hours(shopId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.appointments.shop(shopId) });
  },
  
  // Invalidate all appointment-related data
  appointments: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.appointments.user });
  },
  
  // Invalidate all user-related data
  user: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
    queryClient.invalidateQueries({ queryKey: queryKeys.appointments.user });
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.user.paymentMethods });
  },
  
  // Invalidate all owner-related data
  owner: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.owner.shops });
    queryClient.invalidateQueries({ queryKey: queryKeys.owner.analytics });
  },
};
