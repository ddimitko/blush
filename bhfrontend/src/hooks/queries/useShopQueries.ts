import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { queryKeys, invalidateQueries } from '../../lib/queryClient';
import { Shop, Employee, Service, ShopCreationRequest, EmployeeCreationRequest, EmployeeInvitationRequest, ServiceCreationRequest } from '../../types';

// Shop search parameters interface
export interface ShopSearchParams {
  search?: string;
  name?: string;
  businessTypes?: string[];
  city?: string;
  minRating?: number;
  acceptsCard?: boolean;
  latitude?: number;
  longitude?: number;
  maxDistance?: number;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  size?: number;
}

// Shop search query
export const useShopsQuery = (params?: ShopSearchParams) => {
  return useQuery({
    queryKey: queryKeys.shops.search(params),
    queryFn: () => apiClient.getShops(params),
    enabled: true,
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
  });
};

// Single shop query (public)
export const useShopQuery = (shopId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.shops.detail(shopId!),
    queryFn: () => apiClient.getShop(shopId!),
    enabled: !!shopId,
    staleTime: 5 * 60 * 1000, // 5 minutes for shop details
  });
};

// Shop details query (private - for shop owners)
export const useShopDetailsQuery = (shopId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.shops.detail(shopId!),
    queryFn: () => apiClient.getShopDetails(shopId!),
    enabled: !!shopId,
    staleTime: 2 * 60 * 1000, // 2 minutes for shop details (shorter cache for settings)
  });
};

// Shop employees query
export const useShopEmployeesQuery = (shopId: string | undefined, isPublic = true) => {
  return useQuery({
    queryKey: isPublic
      ? queryKeys.shops.employees(shopId!)
      : ['shops', shopId, 'employees', 'private'],
    queryFn: () => isPublic
      ? apiClient.getPublicShopEmployees(shopId!)
      : apiClient.getShopEmployees(shopId!),
    enabled: !!shopId,
    staleTime: 10 * 60 * 1000, // 10 minutes for employees
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      // Don't retry on client errors (4xx) except for network issues
      if (status === 401 || status === 403 || status === 404 || status === 409) {
        return false;
      }
      // Don't retry private queries on auth errors
      if (!isPublic && (status === 401 || status === 403)) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000, // 1 second delay between retries
  });
};

// Shop services query
export const useShopServicesQuery = (shopId: string | undefined, isPublic = true) => {
  return useQuery({
    queryKey: isPublic
      ? queryKeys.shops.services(shopId!)
      : ['shops', shopId, 'services', 'private'],
    queryFn: () => isPublic
      ? apiClient.getPublicShopServices(shopId!)
      : apiClient.getShopServices(shopId!),
    enabled: !!shopId,
    staleTime: 10 * 60 * 1000, // 10 minutes for services
  });
};

// Shop hours query
export const useShopHoursQuery = (shopId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.shops.hours(shopId!),
    queryFn: () => apiClient.getShopHours(shopId!),
    enabled: !!shopId,
    staleTime: 30 * 60 * 1000, // 30 minutes for shop hours
  });
};

// Owner shops query
export const useOwnerShopsQuery = (hasOwnerRole: boolean = true) => {
  const { useAuthUIStore } = require('../../store/authUIStore');
  const { token, isTokenValid, isAuthenticated } = useAuthUIStore();

  // Only enable if we have a token, it's valid, we're authenticated, AND user has OWNER role
  // Also check that token is not empty string
  const shouldFetch = !!token && token.length > 10 && isTokenValid() && isAuthenticated && hasOwnerRole;

  return useQuery({
    queryKey: queryKeys.owner.shops,
    queryFn: () => {
      if (!shouldFetch) {
        throw new Error('Not authenticated or not an owner - query should not run');
      }
      return apiClient.getMyShops();
    },
    enabled: shouldFetch,
    staleTime: 5 * 60 * 1000, // 5 minutes for owner shops
    retry: false,
    refetchOnWindowFocus: false, // Prevent excessive refetching
  });
};

// Shop analytics query - Re-enabled with backend -parameters flag
export const useShopAnalyticsQuery = (shopId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.shops.analytics(shopId!),
    queryFn: () => apiClient.getShopAnalytics(shopId!),
    enabled: !!shopId,
    staleTime: 2 * 60 * 1000, // 2 minutes for analytics
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      // Don't retry on client errors (4xx)
      if (status === 401 || status === 403 || status === 404 || status === 409) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000, // 1 second delay between retries
  });
};

// Owner analytics query - Re-enabled with backend -parameters flag
export const useOwnerAnalyticsQuery = () => {
  return useQuery({
    queryKey: queryKeys.owner.analytics,
    queryFn: () => apiClient.getOwnerAnalytics(),
    staleTime: 2 * 60 * 1000, // 2 minutes for analytics
    retry: 2, // Retry failed requests
    retryDelay: 1000, // 1 second delay between retries
  });
};

// Enhanced shop creation mutation with subscription support
export const useCreateShopMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shopData: any) => {
      if (shopData.withSubscription) {
        // Remove the withSubscription flag before sending to API
        const { withSubscription, ...apiData } = shopData;
        return apiClient.createShopWithSubscription(apiData);
      } else {
        // Remove the withSubscription flag before sending to API
        const { withSubscription, ...apiData } = shopData;
        return apiClient.createShop(apiData);
      }
    },
    onSuccess: (newShop) => {
      // Invalidate owner shops to refetch the list
      queryClient.invalidateQueries({ queryKey: queryKeys.owner.shops });
      // Invalidate shop search results
      queryClient.invalidateQueries({ queryKey: queryKeys.shops.all });

      // Set the new shop in cache if we have its data
      if (newShop?.id) {
        queryClient.setQueryData(queryKeys.shops.detail(newShop.id), newShop);
      }
    },
  });
};

// Shop update mutation
export const useUpdateShopMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ shopId, shopData }: { shopId: string; shopData: Partial<Shop> }) => 
      apiClient.updateShop(shopId, shopData),
    onSuccess: (updatedShop) => {
      // Update the specific shop in cache
      queryClient.setQueryData(queryKeys.shops.detail(updatedShop.id), updatedShop);
      // Invalidate related queries
      invalidateQueries.shop(updatedShop.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.owner.shops });
    },
  });
};



// Service creation mutation
export const useCreateServiceMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ shopId, serviceData }: { shopId: string; serviceData: any }) =>
      apiClient.createService({ ...serviceData, shopId }),
    onSuccess: (_, variables) => {
      // Invalidate both public and private services for this shop
      queryClient.invalidateQueries({ queryKey: queryKeys.shops.services(variables.shopId) });
      queryClient.invalidateQueries({ queryKey: ['shops', variables.shopId, 'services', 'private'] });
    },
  });
};



// Service update mutation
export const useUpdateServiceMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ shopId, serviceId, serviceData }: { 
      shopId: string; 
      serviceId: string; 
      serviceData: Partial<Service> 
    }) => apiClient.updateService(serviceId, serviceData),
    onSuccess: (_, variables) => {
      // Invalidate both public and private services for this shop
      queryClient.invalidateQueries({ queryKey: queryKeys.shops.services(variables.shopId) });
      queryClient.invalidateQueries({ queryKey: ['shops', variables.shopId, 'services', 'private'] });
    },
  });
};



// Service activation mutation
export const useActivateServiceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shopId, serviceId }: { shopId: string; serviceId: string }) =>
      apiClient.activateService(serviceId),
    onSuccess: (_, variables) => {
      // Invalidate both public and private services for this shop
      queryClient.invalidateQueries({ queryKey: queryKeys.shops.services(variables.shopId) });
      queryClient.invalidateQueries({ queryKey: ['shops', variables.shopId, 'services', 'private'] });
    },
  });
};

// Service deactivation mutation
export const useDeactivateServiceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shopId, serviceId }: { shopId: string; serviceId: string }) =>
      apiClient.deactivateService(serviceId),
    onSuccess: (_, variables) => {
      // Invalidate both public and private services for this shop
      queryClient.invalidateQueries({ queryKey: queryKeys.shops.services(variables.shopId) });
      queryClient.invalidateQueries({ queryKey: ['shops', variables.shopId, 'services', 'private'] });
    },
  });
};

// Service deletion mutation
export const useDeleteServiceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shopId, serviceId }: { shopId: string; serviceId: string }) =>
      apiClient.deleteService(serviceId),
    onSuccess: (_, variables) => {
      // Invalidate both public and private services for this shop
      queryClient.invalidateQueries({ queryKey: queryKeys.shops.services(variables.shopId) });
      queryClient.invalidateQueries({ queryKey: ['shops', variables.shopId, 'services', 'private'] });
    },
  });
};

// Employee creation mutation
export const useCreateEmployeeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shopId, employeeData }: { shopId: string; employeeData: EmployeeCreationRequest }) =>
      apiClient.createEmployee(shopId, employeeData),
    onSuccess: (_, variables) => {
      // Invalidate both public and private employees for this shop
      queryClient.invalidateQueries({ queryKey: queryKeys.shops.employees(variables.shopId) });
      queryClient.invalidateQueries({ queryKey: ['shops', variables.shopId, 'employees', 'private'] });
    },
  });
};

// Employee update mutation
export const useUpdateEmployeeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shopId, employeeId, employeeData }: {
      shopId: string;
      employeeId: string;
      employeeData: Partial<EmployeeCreationRequest>
    }) => apiClient.updateEmployee(employeeId, employeeData),
    onSuccess: (_, variables) => {
      // Invalidate both public and private employees for this shop
      queryClient.invalidateQueries({ queryKey: queryKeys.shops.employees(variables.shopId) });
      queryClient.invalidateQueries({ queryKey: ['shops', variables.shopId, 'employees', 'private'] });
    },
  });
};

// Employee deletion mutation
export const useDeleteEmployeeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shopId, employeeId }: { shopId: string; employeeId: string }) =>
      apiClient.deleteEmployee(employeeId),
    onSuccess: (_, variables) => {
      // Invalidate both public and private employees for this shop
      queryClient.invalidateQueries({ queryKey: queryKeys.shops.employees(variables.shopId) });
      queryClient.invalidateQueries({ queryKey: ['shops', variables.shopId, 'employees', 'private'] });
    },
  });
};

// Employee invitation mutation
export const useInviteEmployeeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shopId, inviteData }: {
      shopId: string;
      inviteData: EmployeeInvitationRequest
    }) => apiClient.inviteEmployee(shopId, inviteData),
    onSuccess: (_, variables) => {
      // Invalidate both public and private employees for this shop
      queryClient.invalidateQueries({ queryKey: queryKeys.shops.employees(variables.shopId) });
      queryClient.invalidateQueries({ queryKey: ['shops', variables.shopId, 'employees', 'private'] });
    },
  });
};

// Owner assignment as employee mutation
export const useAssignOwnerAsEmployeeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shopId, employeeData }: {
      shopId: string;
      employeeData: Omit<EmployeeCreationRequest, 'firstName' | 'lastName' | 'email' | 'password' | 'confirmPassword' | 'phone'>
    }) => apiClient.assignOwnerAsEmployee(shopId, employeeData),
    onSuccess: (_, variables) => {
      // Invalidate both public and private employees for this shop
      queryClient.invalidateQueries({ queryKey: queryKeys.shops.employees(variables.shopId) });
      queryClient.invalidateQueries({ queryKey: ['shops', variables.shopId, 'employees', 'private'] });
      // Also invalidate user queries since the user's role capabilities have changed
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['employee'] });
    },
  });
};

// Gallery management mutations
export const useUploadGalleryImageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shopId, file }: { shopId: string; file: File }) =>
      apiClient.uploadGalleryImage(shopId, file),
    onSuccess: (_, variables) => {
      // Invalidate shop details to refresh gallery
      queryClient.invalidateQueries({ queryKey: queryKeys.shops.detail(variables.shopId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.owner.shops });
    },
  });
};

export const useDeleteGalleryImageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shopId, imageUrl }: { shopId: string; imageUrl: string }) =>
      apiClient.deleteGalleryImage(shopId, imageUrl),
    onSuccess: (_, variables) => {
      // Invalidate shop details to refresh gallery
      queryClient.invalidateQueries({ queryKey: queryKeys.shops.detail(variables.shopId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.owner.shops });
    },
  });
};

export const useSetShopThumbnailMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shopId, imageUrl }: { shopId: string; imageUrl: string }) =>
      apiClient.setShopThumbnail(shopId, imageUrl),
    onSuccess: (_, variables) => {
      // Invalidate shop details to refresh thumbnail
      queryClient.invalidateQueries({ queryKey: queryKeys.shops.detail(variables.shopId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.owner.shops });
    },
  });
};
