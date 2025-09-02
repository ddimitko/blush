import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { queryKeys, invalidateQueries } from '../../lib/queryClient';
import { User, LoginRequest, RegisterRequest, UserConnection } from '../../types';

// Current user query
export const useUserQuery = () => {
  const { useAuthUIStore } = require('../../store/authUIStore');
  const { token, isTokenValid, isAuthenticated } = useAuthUIStore();

  // Only enable if we have a token, it's valid, and we're marked as authenticated
  // Also check that token is not empty string
  const shouldFetch = !!token && token.length > 10 && isTokenValid() && isAuthenticated;

  return useQuery({
    queryKey: queryKeys.auth.user,
    queryFn: () => {
      if (!shouldFetch) {
        throw new Error('Not authenticated - query should not run');
      }
      return apiClient.getUserProfile();
    },
    enabled: shouldFetch,
    staleTime: 10 * 60 * 1000, // 10 minutes for user data
    retry: false, // Don't retry auth failures
    refetchOnWindowFocus: false, // Prevent excessive refetching
    refetchOnMount: false, // Only fetch when explicitly needed
    refetchOnReconnect: false, // Prevent reconnect refetching
  });
};

// User connections query
export const useUserConnectionsQuery = () => {
  const { useAuthUIStore } = require('../../store/authUIStore');
  const { token, isTokenValid, isAuthenticated } = useAuthUIStore();

  return useQuery({
    queryKey: queryKeys.auth.connections,
    queryFn: () => apiClient.getUserConnections(),
    enabled: !!token && isTokenValid() && isAuthenticated, // More strict conditions
    staleTime: 15 * 60 * 1000, // 15 minutes for connections
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};

// Login mutation
export const useLoginMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginRequest) => apiClient.login(credentials),
    onSuccess: (loginResponse) => {
      // Extract user data from login response (exclude token)
      const userData = {
        id: loginResponse.id,
        email: loginResponse.email,
        firstName: loginResponse.firstName,
        lastName: loginResponse.lastName,
        phone: loginResponse.phone,
        avatar: loginResponse.avatar,
        role: loginResponse.roles[0]?.replace('ROLE_', '') || 'USER', // Clean role format
        emailVerified: true, // Assume verified if login successful
        createdAt: new Date().toISOString(), // Placeholder
        updatedAt: new Date().toISOString(), // Placeholder
      };

      // Set user data in React Query cache
      queryClient.setQueryData(queryKeys.auth.user, userData);

      // Invalidate all user-related data to refetch with new auth
      invalidateQueries.user();
      invalidateQueries.owner();
    },
  });
};

// Register mutation
export const useRegisterMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: RegisterRequest) => apiClient.register(userData),
    onSuccess: (registerResponse) => {
      // Extract user data from register response (exclude token)
      const userData = {
        id: registerResponse.id,
        email: registerResponse.email,
        firstName: registerResponse.firstName,
        lastName: registerResponse.lastName,
        phone: registerResponse.phone,
        avatar: registerResponse.avatar,
        role: registerResponse.roles[0]?.replace('ROLE_', '') || 'USER', // Clean role format
        emailVerified: true, // Assume verified if registration successful
        createdAt: new Date().toISOString(), // Placeholder
        updatedAt: new Date().toISOString(), // Placeholder
      };

      // Set user data in React Query cache
      queryClient.setQueryData(queryKeys.auth.user, userData);

      // Invalidate all user-related data
      invalidateQueries.user();
    },
  });
};

// Logout mutation
export const useLogoutMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.logout(),
    onSuccess: () => {
      console.log('✅ LOGOUT MUTATION: Clearing all cached data');
      // Clear all cached data on logout
      queryClient.clear();
    },
    onError: (error) => {
      console.warn('⚠️ LOGOUT MUTATION: API logout failed, but clearing local data anyway', error);
      // Even if API logout fails, clear local data
      queryClient.clear();
    },
  });
};

// Update profile mutation
export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userData: Partial<User>) => apiClient.updateUserProfile(userData),
    onSuccess: (updatedUser) => {
      // Update user data in cache
      queryClient.setQueryData(queryKeys.auth.user, updatedUser);
    },
  });
};

// Upload avatar mutation
export const useUploadAvatarMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => apiClient.uploadAvatar(file),
    onSuccess: (response) => {
      // Update user data in cache with new avatar
      queryClient.setQueryData(queryKeys.auth.user, response.user);
      // Also invalidate the user query to force a fresh fetch
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
    },
  });
};

// Forgot password mutation
export const useForgotPasswordMutation = () => {
  return useMutation({
    mutationFn: (email: string) => apiClient.forgotPassword(email),
  });
};

// Reset password mutation
export const useResetPasswordMutation = () => {
  return useMutation({
    mutationFn: (params: { token: string; newPassword: string }) => 
      apiClient.resetPassword(params.token, params.newPassword),
  });
};

// Change password mutation
export const useChangePasswordMutation = () => {
  return useMutation({
    mutationFn: async (params: { currentPassword: string; newPassword: string }) => {
      // Placeholder implementation - API method doesn't exist yet
      console.log('Changing password:', { currentPassword: '***', newPassword: '***' });
      return Promise.resolve({ success: true });
    },
  });
};

// Facebook login mutation
export const useFacebookLoginMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accessToken: string) => apiClient.authenticateWithFacebook(accessToken),
    onSuccess: (loginResponse) => {
      console.log('✅ FACEBOOK LOGIN: Response received', {
        hasToken: !!loginResponse.token,
        hasRoles: !!loginResponse.roles,
        roles: loginResponse.roles,
        userId: loginResponse.id
      });

      // Extract user data from Facebook login response (exclude token)
      const userData = {
        id: loginResponse.id,
        email: loginResponse.email,
        firstName: loginResponse.firstName,
        lastName: loginResponse.lastName,
        phone: loginResponse.phone,
        avatar: loginResponse.avatar,
        role: loginResponse.roles?.[0]?.replace('ROLE_', '') || 'USER', // Clean role format
        emailVerified: true, // Assume verified if Facebook login successful
        createdAt: new Date().toISOString(), // Placeholder
        updatedAt: new Date().toISOString(), // Placeholder
      };

      console.log('✅ FACEBOOK LOGIN: Setting user data', userData);

      // Set user data in React Query cache
      queryClient.setQueryData(queryKeys.auth.user, userData);

      // Invalidate all user-related data
      invalidateQueries.user();
      invalidateQueries.owner();
    },
  });
};

// Google login mutation
export const useGoogleLoginMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (accessToken: string) => apiClient.authenticateWithGoogle(accessToken),
    onSuccess: (loginResponse) => {
      queryClient.setQueryData(queryKeys.auth.user, loginResponse);
      invalidateQueries.user();
      invalidateQueries.owner();
    },
  });
};

// Connect provider mutation
export const useConnectProviderMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: { provider: string; accessToken: string }) => 
      apiClient.connectProvider(params.provider, params.accessToken),
    onSuccess: () => {
      // Refetch connections
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.connections });
    },
  });
};

// Disconnect provider mutation
export const useDisconnectProviderMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider: string) => apiClient.disconnectProvider(provider),
    onSuccess: () => {
      // Refetch connections
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.connections });
    },
  });
};

// Onboarding status query
export const useOnboardingStatusQuery = () => {
  const { useAuthUIStore } = require('../../store/authUIStore');
  const { token, isTokenValid, isAuthenticated } = useAuthUIStore();

  return useQuery({
    queryKey: queryKeys.auth.onboardingStatus,
    queryFn: () => apiClient.getOnboardingStatus(),
    enabled: !!token && isTokenValid() && isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Always check onboarding status on mount
    refetchOnReconnect: false,
  });
};

// Complete onboarding mutation
export const useCompleteOnboardingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.completeOnboarding(),
    onSuccess: () => {
      // Invalidate onboarding status and user data
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.onboardingStatus });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
    },
  });
};

// Reset onboarding mutation
export const useResetOnboardingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.resetOnboarding(),
    onSuccess: () => {
      // Invalidate onboarding status and user data
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.onboardingStatus });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
    },
  });
};
