import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  OAuth2AuthResponse,
  UserConnection,
  User,
  Shop,
  Employee,
  Service,
  Appointment,
  AppointmentResponse,
  Notification,
  OwnerAnalytics,
  ShopCreationRequest,
  EmployeeCreationRequest,
  EmployeeInvitationRequest,
  ServiceCreationRequest,
  AppointmentCreationRequest,
  PaymentIntentRequest,
  PaymentIntentResponse,
  AvailableSlot,
  ApiResponse,
  PaginatedResponse,
  PaymentMethodsResponse,
  SetupIntentResponse,
  UserPaymentMethod
} from '../types';
import { transformAppointmentResponse } from './utils';

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private csrfTokenFromResponse: string | null = null;
  private lastErrorTime: number = 0;
  private errorCount: number = 0;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080/api',
      timeout: 30000,
      withCredentials: true, // Enable cookies for CSRF token
    });

    // Request interceptor to add auth token and CSRF token
    this.client.interceptors.request.use(
      (config) => {
        // Add JWT Bearer token
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }

        // Add CSRF token from cookie for state-changing requests
        const method = config.method?.toUpperCase();
        const isStateChangingRequest = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method || '');

        if (isStateChangingRequest) {
          const csrfToken = this.getCsrfToken();
          if (csrfToken) {
            // Only add CSRF token if it's not already present (to avoid overriding manual additions)
            // Use X-XSRF-TOKEN header as expected by Spring Security
            if (!config.headers['X-XSRF-TOKEN'] && !config.headers['X-CSRF-TOKEN']) {
              config.headers['X-XSRF-TOKEN'] = csrfToken;
              if (process.env.NODE_ENV === 'development') {
                console.log(`🔒 API CLIENT: Adding CSRF token to ${method} request to ${config.url}`);
              }
            }
          } else if (process.env.NODE_ENV === 'development') {
            console.warn(`⚠️ API CLIENT: No CSRF token available for ${method} request to ${config.url}`);
          }
        }

        // Set appropriate Content-Type based on request data
        if (config.data instanceof FormData) {
          // For FormData, don't set Content-Type - let axios set it with boundary
          delete config.headers['Content-Type'];
          if (process.env.NODE_ENV === 'development') {
            console.log(`🔒 API CLIENT: Allowing axios to set Content-Type for FormData request to ${config.url}`);
          }
        } else if (!config.headers['Content-Type']) {
          // For non-FormData requests, set JSON content type if not already set
          config.headers['Content-Type'] = 'application/json';
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling and token refresh
    this.client.interceptors.response.use(
      (response) => {
        // Reset error count on successful response
        this.errorCount = 0;
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Circuit breaker: prevent rapid successive error handling
        const now = Date.now();
        if (now - this.lastErrorTime < 1000) { // Less than 1 second since last error
          this.errorCount++;
          if (this.errorCount > 5) {
            console.log('🚫 API CLIENT: Circuit breaker activated - too many rapid errors');
            return Promise.reject(error);
          }
        } else {
          this.errorCount = 1;
        }
        this.lastErrorTime = now;

        // Handle CSRF token errors (403 Forbidden)
        if (error.response?.status === 403 && !originalRequest._csrfRetry) {
          console.log('🚫 API CLIENT: 403 Forbidden detected');

          // Check if this might be a CSRF token issue
          const errorMessage = error.response?.data?.message || '';
          const isCsrfError = errorMessage.toLowerCase().includes('csrf') ||
                             errorMessage.toLowerCase().includes('forbidden') ||
                             error.response?.data?.error === 'Forbidden';

          if (isCsrfError) {
            console.log('🔒 API CLIENT: Attempting CSRF token refresh for 403 error');
            originalRequest._csrfRetry = true;

            try {
              // Clear any existing CSRF token and get a fresh one
              document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
              this.csrfTokenFromResponse = null; // Clear stored token
              await this.ensureCsrfToken();

              // Add the new CSRF token to the request
              const newCsrfToken = this.getCsrfToken();
              if (newCsrfToken) {
                originalRequest.headers['X-XSRF-TOKEN'] = newCsrfToken;
                console.log('🔒 API CLIENT: Retrying request with new CSRF token');
                return this.client(originalRequest);
              }
            } catch (csrfError) {
              console.error('❌ API CLIENT: Failed to refresh CSRF token:', csrfError);
            }
          }
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            console.log('🔄 API CLIENT: 401 detected, attempting token refresh...');

            // Try to refresh the token
            const refreshResponse = await this.client.post('/auth/refresh');
            const newToken = refreshResponse.data.token;

            if (newToken) {
              console.log('✅ API CLIENT: Token refresh successful');
              this.setToken(newToken);

              // Update auth UI store with new token
              try {
                const { useAuthUIStore } = await import('../store/authUIStore');
                const authUIStore = useAuthUIStore.getState();
                authUIStore.setToken(newToken);
              } catch (importError) {
                console.warn('⚠️ API CLIENT: Could not update auth UI store with new token:', importError);
              }

              // Update the original request with new token
              originalRequest.headers.Authorization = `Bearer ${newToken}`;

              // Retry the original request
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            console.error('❌ API CLIENT: Token refresh failed:', refreshError);
            this.clearToken();

            // Trigger logout through auth UI store
            try {
              const { useAuthUIStore } = await import('../store/authUIStore');
              const authUIStore = useAuthUIStore.getState();
              console.log('🚪 API CLIENT: Triggering logout due to refresh failure');
              authUIStore.clearToken();
              // Clear all auth storage
              localStorage.removeItem('auth-ui-storage');
              localStorage.removeItem('auth-storage');
              localStorage.removeItem('legacy-auth-storage');
            } catch (importError) {
              console.error('❌ API CLIENT: Failed to import auth UI store for logout:', importError);
            }
          }
        }

        if (error.response?.status === 401) {
          console.log('🚫 API CLIENT: 401 Unauthorized detected (no retry)');

          // Only clear token once per session to prevent loops
          if (this.token) {
            this.clearToken();

            // Trigger logout through auth UI store with delay to prevent loops
            setTimeout(async () => {
              try {
                const { useAuthUIStore } = await import('../store/authUIStore');
                const authUIStore = useAuthUIStore.getState();
                console.log('🚪 API CLIENT: Triggering logout due to 401 error');
                authUIStore.clearToken();
              } catch (importError) {
                console.error('❌ API CLIENT: Failed to import auth UI store for 401 logout:', importError);
              }
            }, 100);
          }
        }

        if (error.response?.status === 403) {
          console.log('🚫 API CLIENT: 403 Forbidden detected');
          // Don't clear token for 403 unless it's a critical auth endpoint
          // Only clear token for specific auth endpoints to prevent infinite loops
          if (originalRequest.url?.includes('/user/profile') || originalRequest.url?.includes('/auth/user')) {
            console.log('🚫 API CLIENT: 403 on critical auth endpoint, clearing token');

            // Only clear token once to prevent loops
            if (this.token) {
              this.clearToken();

              // Delay the auth store update to prevent immediate re-triggering
              setTimeout(async () => {
                try {
                  const { useAuthUIStore } = await import('../store/authUIStore');
                  const authUIStore = useAuthUIStore.getState();
                  authUIStore.clearToken();
                } catch (importError) {
                  console.error('❌ API CLIENT: Failed to import auth UI store for 403 logout:', importError);
                }
              }, 200);
            }
          }
        }

        // Handle 404 Not Found errors
        if (error.response?.status === 404) {
          console.log('🔍 API CLIENT: 404 Not Found detected');
          // Let the component handle 404 errors appropriately
          // Don't retry 404 errors as the resource doesn't exist
        }

        // Handle 409 Conflict errors
        if (error.response?.status === 409) {
          console.log('⚠️ API CLIENT: 409 Conflict detected');
          // Log conflict details for debugging
          const conflictData = error.response?.data;
          console.log('Conflict details:', conflictData);
          // Don't retry conflict errors as they require user intervention
        }

        // Handle 500+ Server errors
        if (error.response?.status >= 500) {
          console.log('🚨 API CLIENT: Server error detected:', error.response?.status);
          // Log server error details for monitoring
          const serverErrorData = error.response?.data;
          console.error('Server error details:', serverErrorData);
          // Server errors will be retried by React Query if configured
        }

        return Promise.reject(error);
      }
    );

    // Load token from localStorage
    this.loadToken();
  }

  private loadToken(): void {
    // Load token from auth-ui-storage only
    try {
      const authUIStorage = localStorage.getItem('auth-ui-storage');
      if (authUIStorage) {
        const parsed = JSON.parse(authUIStorage);
        if (parsed.state?.token && parsed.state?.isAuthenticated) {
          this.token = parsed.state.token;
          console.log('🔑 API CLIENT: Token loaded from auth-ui-storage');
        }
      }

      // Clean up any legacy storage
      const legacyKeys = ['auth-storage', 'auth-token', 'legacy-auth-storage'];
      legacyKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          console.log(`🧹 API CLIENT: Removing legacy storage: ${key}`);
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('❌ API CLIENT: Failed to load token from auth-ui-storage:', error);
      this.token = null;
    }
  }

  setToken(token: string): void {
    this.token = token;
    if (process.env.NODE_ENV === 'development') {
      console.log('🔑 API CLIENT: Token set', { tokenLength: token.length });
    }
    // Token will be persisted by Zustand auth store, no need for separate storage
  }

  clearToken(): void {
    this.token = null;
    this.csrfTokenFromResponse = null; // Also clear CSRF token
    if (process.env.NODE_ENV === 'development') {
      console.log('🗑️ API CLIENT: Token cleared');
    }
    // Token will be cleared by Zustand auth store, no need for separate storage
  }

  private getCsrfToken(): string | null {
    // Prefer token from response body if available
    if (this.csrfTokenFromResponse) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔒 API CLIENT: Using CSRF token from response:', this.csrfTokenFromResponse.substring(0, 10) + '...');
      }
      return this.csrfTokenFromResponse;
    }

    try {
      // Fallback to cookie-based token
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'XSRF-TOKEN') {
          const decodedValue = decodeURIComponent(value);
          // Validate token format (should be non-empty and reasonable length)
          if (decodedValue && decodedValue.length > 10 && decodedValue.length < 500) {
            if (process.env.NODE_ENV === 'development') {
              console.log('🔒 API CLIENT: Found CSRF token in cookie:', decodedValue.substring(0, 10) + '...');
            }
            return decodedValue;
          }
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ API CLIENT: No valid CSRF token found in cookies or response');
        console.log('🔒 API CLIENT: Available cookies:', document.cookie);
      }
    } catch (error) {
      console.warn('⚠️ API CLIENT: Error reading CSRF token from cookie:', error);
    }
    return null;
  }

  /**
   * Get headers for multipart form data requests with CSRF token
   */
  private getMultipartHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const csrfToken = this.getCsrfToken();

    if (csrfToken) {
      // Use X-XSRF-TOKEN header as expected by Spring Security
      headers['X-XSRF-TOKEN'] = csrfToken;
      if (process.env.NODE_ENV === 'development') {
        console.log('🔒 API CLIENT: Adding CSRF token to multipart request');
        console.log('🔒 API CLIENT: CSRF token being sent:', csrfToken.substring(0, 10) + '...');
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ API CLIENT: No CSRF token available for multipart request');
    }

    // Don't set Content-Type for multipart/form-data - let axios set it with boundary
    return headers;
  }

  // Ensure CSRF token is available before making protected requests
  async ensureCsrfToken(forceFresh: boolean = false): Promise<void> {
    const existingToken = this.getCsrfToken();
    if (existingToken && !forceFresh) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔒 API CLIENT: CSRF token already available');
      }
      return; // Already have a token
    }

    if (forceFresh) {
      // Clear existing tokens when forcing fresh
      this.csrfTokenFromResponse = null;
      document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      if (process.env.NODE_ENV === 'development') {
        console.log('🔒 API CLIENT: Forcing fresh CSRF token');
      }
    }

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔒 API CLIENT: Fetching CSRF token...');
      }

      // Get CSRF token from the backend
      const response = await this.client.get('/auth/csrf');

      // Store the token from response body (this is the authoritative token)
      if (response.data?.token) {
        this.csrfTokenFromResponse = response.data.token;
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ API CLIENT: CSRF token obtained from response:', response.data.token.substring(0, 10) + '...');
        }
      }

      // Verify token is now available
      const newToken = this.getCsrfToken();
      if (newToken) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ API CLIENT: CSRF token ready for use');
        }
      } else {
        console.warn('⚠️ API CLIENT: CSRF token endpoint succeeded but no token available');
      }
    } catch (error: any) {
      // Check if this is a 403 error which might indicate CSRF is required
      if (error.response?.status === 403) {
        console.error('❌ API CLIENT: 403 error when fetching CSRF token - this might indicate a configuration issue');
      } else {
        console.warn('⚠️ API CLIENT: Failed to get CSRF token:', error.message || error);
      }
      // Continue anyway - some endpoints might not require CSRF or might be excluded
    }
  }

  // Authentication endpoints
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    if (process.env.NODE_ENV === 'development') {
      console.log('📡 API CLIENT: Making login request', { email: credentials.email });
    }
    const response = await this.client.post<LoginResponse>('/auth/login', credentials);
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ API CLIENT: Login request successful', { userId: response.data.id });
    }
    return response.data;
  }

  async register(userData: RegisterRequest): Promise<LoginResponse> {
    console.log('📡 API CLIENT: Making register request', { email: userData.email });
    const response = await this.client.post<LoginResponse>('/auth/register', userData);
    console.log('✅ API CLIENT: Register request successful', { userId: response.data.id });
    return response.data;
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout');
    this.clearToken();
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await this.client.post<{ message: string }>('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await this.client.post<{ message: string }>('/auth/reset-password', {
      token,
      newPassword
    });
    return response.data;
  }

  // OAuth2 Authentication endpoints
  async authenticateWithFacebook(accessToken: string): Promise<OAuth2AuthResponse> {
    const response = await this.client.post<OAuth2AuthResponse>('/auth/oauth2/facebook', {
      accessToken
    });
    return response.data;
  }

  async authenticateWithGoogle(accessToken: string): Promise<OAuth2AuthResponse> {
    const response = await this.client.post<OAuth2AuthResponse>('/auth/oauth2/google', {
      accessToken
    });
    return response.data;
  }

  async getUserConnections(): Promise<UserConnection[]> {
    const response = await this.client.get<UserConnection[]>('/auth/oauth2/connections');
    return response.data;
  }

  async connectProvider(provider: string, accessToken: string): Promise<UserConnection> {
    const response = await this.client.post<UserConnection>(`/auth/oauth2/connect/${provider}`, {
      accessToken
    });
    return response.data;
  }

  async disconnectProvider(provider: string): Promise<void> {
    await this.client.delete(`/auth/oauth2/disconnect/${provider}`);
  }

  // User endpoints
  async getUserProfile(): Promise<User> {
    const response = await this.client.get<User>('/user/profile');
    const userData = response.data;

    // Normalize role by removing ROLE_ prefix if present
    if (userData.role && typeof userData.role === 'string') {
      userData.role = userData.role.replace('ROLE_', '') as any;
    }

    return userData;
  }

  async updateUserProfile(userData: Partial<User>): Promise<User> {
    await this.ensureCsrfToken();
    const response = await this.client.put<User>('/user/profile', userData);
    return response.data;
  }

  async uploadAvatar(file: File): Promise<{ avatarUrl: string; user: User }> {
    // Force fresh CSRF token for avatar upload to avoid stale token issues
    await this.ensureCsrfToken(true);
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post('/user/avatar', formData, {
      headers: this.getMultipartHeaders()
    });
    return response.data;
  }

  // Onboarding endpoints
  async getOnboardingStatus(): Promise<{ onboardingCompleted: boolean }> {
    const response = await this.client.get<{ onboardingCompleted: boolean }>('/user/onboarding-status');
    return response.data;
  }

  async completeOnboarding(): Promise<{ message: string; onboardingCompleted: boolean }> {
    await this.ensureCsrfToken();
    const response = await this.client.put<{ message: string; onboardingCompleted: boolean }>('/user/complete-onboarding');
    return response.data;
  }

  async resetOnboarding(): Promise<{ message: string; onboardingCompleted: boolean }> {
    await this.ensureCsrfToken();
    const response = await this.client.put<{ message: string; onboardingCompleted: boolean }>('/user/reset-onboarding');
    return response.data;
  }

  // Shop endpoints
  async getShops(params?: {
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
  }): Promise<PaginatedResponse<Shop>> {
    // Transform search parameter to name for backend compatibility
    const apiParams: any = { ...params };
    if (params?.search && !params?.name) {
      apiParams.name = params.search;
      delete apiParams.search;
    }

    // Handle array parameters properly for Spring Boot
    if (params?.businessTypes && params.businessTypes.length > 0) {
      // Spring Boot expects multiple parameters with the same name for arrays
      delete apiParams.businessTypes;
    }

    // Build URL search params manually to handle arrays correctly
    const searchParams = new URLSearchParams();

    Object.entries(apiParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    // Add business types as separate parameters
    if (params?.businessTypes && params.businessTypes.length > 0) {
      params.businessTypes.forEach(type => {
        searchParams.append('businessTypes', type);
      });
    }

    const url = `/public/shops?${searchParams.toString()}`;
    const response = await this.client.get<PaginatedResponse<Shop>>(url);
    return response.data;
  }

  async getShop(id: string): Promise<Shop> {
    const response = await this.client.get<Shop>(`/public/shops/${id}`);
    return response.data;
  }

  async getShopDetails(id: string): Promise<Shop> {
    // Private API for shop owners to access their shop details
    const response = await this.client.get<Shop>(`/shops/${id}/details`);
    return response.data;
  }

  async createShop(shopData: ShopCreationRequest): Promise<{ shopId: string; message: string }> {
    await this.ensureCsrfToken();
    const response = await this.client.post('/shops', shopData);
    return response.data;
  }

  async createShopWithSubscription(shopData: any): Promise<any> {
    // Force fresh CSRF token for shop creation with subscription to avoid stale token issues
    await this.ensureCsrfToken(true);
    const response = await this.client.post('/shops/with-subscription', shopData);
    return response.data;
  }

  async refreshToken(): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/auth/refresh');
    return response.data;
  }

  async refreshCurrentUserToken(): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/auth/refresh-current');
    return response.data;
  }

  async getMyShops(): Promise<Shop[]> {
    const response = await this.client.get<Shop[]>('/shops/my-shops');
    return response.data;
  }

  async updateShop(id: string, shopData: Partial<Shop>): Promise<Shop> {
    await this.ensureCsrfToken();
    const response = await this.client.put<Shop>(`/shops/${id}`, shopData);
    return response.data;
  }

  async uploadShopImages(shopId: string, files: File[]): Promise<{ images: string[] }> {
    // Force fresh CSRF token for shop image upload to avoid stale token issues
    await this.ensureCsrfToken(true);
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const response = await this.client.post(`/shops/${shopId}/images`, formData, {
      headers: this.getMultipartHeaders()
    });
    return response.data;
  }

  // Employee endpoints
  async getShopEmployees(shopId: string): Promise<Employee[]> {
    // Use owner-specific endpoint for authenticated access
    const response = await this.client.get(`/employees/shops/${shopId}`);
    // Owner endpoint returns direct array, public endpoint returns wrapped data
    return response.data.data || response.data || [];
  }

  async getPublicShopEmployees(shopId: string): Promise<Employee[]> {
    // Public endpoint for non-authenticated access
    console.log('API: Calling GET /public/shops/' + shopId + '/employees');
    const response = await this.client.get(`/public/shops/${shopId}/employees`);
    console.log('API: Employees response:', response.data);
    // The response contains a data array, not direct array
    const employees = response.data.data || response.data || [];
    console.log('API: Parsed employees:', employees);
    return employees;
  }

  async createEmployee(shopId: string, employeeData: EmployeeCreationRequest): Promise<Employee> {
    await this.ensureCsrfToken(true);
    const response = await this.client.post(`/employees/shops/${shopId}/create`, employeeData);
    return response.data;
  }

  async updateEmployee(employeeId: string, employeeData: Partial<EmployeeCreationRequest>): Promise<Employee> {
    await this.ensureCsrfToken(true);
    const response = await this.client.put(`/employees/${employeeId}`, employeeData);
    return response.data;
  }

  async deleteEmployee(employeeId: string): Promise<void> {
    // Force fresh CSRF token for employee deletion to avoid stale token issues
    await this.ensureCsrfToken(true);
    await this.client.delete(`/employees/${employeeId}`);
  }

  async inviteEmployee(shopId: string, inviteData: EmployeeInvitationRequest): Promise<Employee> {
    // Force fresh CSRF token for employee invitations to avoid stale token issues
    await this.ensureCsrfToken(true);
    const response = await this.client.post(`/employees/shops/${shopId}/invite`, inviteData);
    return response.data;
  }

  async assignOwnerAsEmployee(shopId: string, employeeData: Omit<EmployeeCreationRequest, 'firstName' | 'lastName' | 'email' | 'password' | 'confirmPassword' | 'phone'>): Promise<Employee> {
    // Force fresh CSRF token for owner assignment to avoid stale token issues
    await this.ensureCsrfToken(true);
    const response = await this.client.post(`/employees/shops/${shopId}/assign-owner`, employeeData);
    return response.data;
  }

  async acceptInvitationThroughApp(shopId: string): Promise<any> {
    const response = await this.client.post(`/employees/invitations/${shopId}/accept`);
    return response.data;
  }

  async checkEmailExists(email: string): Promise<{ exists: boolean; firstName?: string; lastName?: string }> {
    const response = await this.client.get(`/user/check-email?email=${encodeURIComponent(email)}`);
    return response.data;
  }

  async getInvitationDetails(token: string): Promise<any> {
    const response = await this.client.get(`/employee-invitations/${token}`);
    return response.data;
  }

  async acceptInvitation(token: string): Promise<any> {
    const response = await this.client.post(`/employee-invitations/${token}/accept-existing`);
    return response.data;
  }

  async acceptInvitationWithAccountSetup(token: string, data: {
    firstName: string;
    lastName: string;
    phone: string;
    password: string;
    confirmPassword: string;
  }): Promise<any> {
    const response = await this.client.post(`/employee-invitations/${token}/accept`, data);
    return response.data;
  }

  async cancelInvitation(invitationId: string): Promise<any> {
    await this.ensureCsrfToken();
    const response = await this.client.delete(`/employees/invitations/${invitationId}`);
    return response.data;
  }

  async getMyEmployeeShops(): Promise<Shop[]> {
    const response = await this.client.get<Shop[]>('/employees/my-shops');
    return response.data;
  }

  // Gallery endpoints
  async uploadGalleryImage(shopId: string, file: File): Promise<{ imageUrl: string; galleryCount: number }> {
    // Force fresh CSRF token for gallery uploads to avoid stale token issues
    await this.ensureCsrfToken(true);
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post(`/shops/${shopId}/gallery`, formData, {
      headers: this.getMultipartHeaders()
    });
    return response.data;
  }

  async deleteGalleryImage(shopId: string, imageUrl: string): Promise<void> {
    // Force fresh CSRF token for gallery deletion to avoid stale token issues
    await this.ensureCsrfToken(true);
    await this.client.delete(`/shops/${shopId}/gallery`, {
      data: { imageUrl }
    });
  }

  async setShopThumbnail(shopId: string, imageUrl: string): Promise<{ thumbnail: string }> {
    // Force fresh CSRF token for thumbnail setting to avoid stale token issues
    await this.ensureCsrfToken(true);
    const response = await this.client.put(`/shops/${shopId}/thumbnail`, { imageUrl });
    return response.data;
  }

  // Employee invitation endpoints
  async getEmployeeInvitation(token: string): Promise<any> {
    const response = await this.client.get(`/employee-invitations/${token}`);
    return response.data;
  }

  async acceptEmployeeInvitation(token: string, data: { password: string; confirmPassword: string; phone?: string }): Promise<any> {
    const response = await this.client.post(`/employee-invitations/${token}/accept`, data);
    return response.data;
  }

  async getEmployeeProfile(userId: string): Promise<Employee> {
    const response = await this.client.get<Employee>(`/employees/profile/${userId}`);
    return response.data;
  }

  async getUserAppointments(params?: {
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<Appointment>> {
    const response = await this.client.get<PaginatedResponse<AppointmentResponse>>('/appointments/my-appointments', { params });
    // Transform the response data
    const transformedContent = response.data.content.map(transformAppointmentResponse);
    return {
      ...response.data,
      content: transformedContent
    };
  }

  // Service endpoints
  async getShopServices(shopId: string): Promise<Service[]> {
    // Use owner-specific endpoint for authenticated access
    const response = await this.client.get('/services', {
      params: { shopId }
    });
    // The response contains a data array, not direct array
    return response.data.data || response.data || [];
  }

  async getPublicShopServices(shopId: string): Promise<Service[]> {
    // Public endpoint for non-authenticated access
    console.log('API: Calling GET /public/shops/' + shopId + '/services');
    const response = await this.client.get(`/public/shops/${shopId}/services`);
    console.log('API: Services response:', response.data);
    // The response contains a data array, not direct array
    const services = response.data.data || response.data || [];
    console.log('API: Parsed services:', services);
    return services;
  }

  async getShopHours(shopId: string): Promise<any> {
    // Public endpoint for shop business hours
    const response = await this.client.get(`/public/shops/${shopId}/hours`);
    return response.data.data || response.data || [];
  }

  async createService(serviceData: ServiceCreationRequest): Promise<Service> {
    await this.ensureCsrfToken(true);
    const response = await this.client.post('/services', serviceData);
    return response.data;
  }

  async updateService(serviceId: string, serviceData: Partial<ServiceCreationRequest>): Promise<Service> {
    await this.ensureCsrfToken(true);
    const response = await this.client.put(`/services/${serviceId}`, serviceData);
    return response.data;
  }

  async activateService(serviceId: string): Promise<void> {
    await this.ensureCsrfToken(true);
    await this.client.put(`/services/${serviceId}/activate`);
  }

  async deactivateService(serviceId: string): Promise<void> {
    await this.ensureCsrfToken(true);
    await this.client.put(`/services/${serviceId}/deactivate`);
  }

  async deleteService(serviceId: string): Promise<void> {
    await this.ensureCsrfToken(true);
    await this.client.delete(`/services/${serviceId}`);
  }

  async getServiceCategories(): Promise<{ value: string; label: string }[]> {
    const response = await this.client.get('/services/categories');
    return response.data.categories;
  }



  // Appointment endpoints
  async getAvailableSlots(params: {
    shopId: string;
    serviceId: string;
    employeeId: string;
    date: string;
  }): Promise<AvailableSlot[]> {
    const response = await this.client.get<AvailableSlot[]>('/appointments/available-slots', { params });
    return response.data;
  }

  async createAppointment(appointmentData: any): Promise<Appointment> {
    const response = await this.client.post<{ appointment: Appointment }>('/appointments', appointmentData);
    return response.data.appointment;
  }

  async getMyAppointments(params?: {
    status?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<Appointment>> {
    const response = await this.client.get<PaginatedResponse<AppointmentResponse>>('/appointments/my-appointments', { params });
    // Transform the response data
    const transformedContent = response.data.content.map(transformAppointmentResponse);
    return {
      ...response.data,
      content: transformedContent
    };
  }

  async getShopAppointments(shopId: string, params?: {
    date?: string;
    status?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<Appointment>> {
    const response = await this.client.get<PaginatedResponse<AppointmentResponse>>(`/appointments/shop/${shopId}`, { params });
    // Transform the response data
    const transformedContent = response.data.content.map(transformAppointmentResponse);
    return {
      ...response.data,
      content: transformedContent
    };
  }

  async getEmployeeAppointments(employeeId: string, params?: {
    date?: string;
    status?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<Appointment>> {
    const response = await this.client.get<PaginatedResponse<AppointmentResponse>>(`/appointments/employee/${employeeId}`, { params });
    // Transform the response data
    const transformedContent = response.data.content.map(transformAppointmentResponse);
    return {
      ...response.data,
      content: transformedContent
    };
  }

  async getAppointment(appointmentId: string): Promise<Appointment> {
    const response = await this.client.get<AppointmentResponse>(`/appointments/${appointmentId}`);
    return transformAppointmentResponse(response.data);
  }

  async updateAppointment(appointmentId: string, data: Partial<Appointment>): Promise<Appointment> {
    // Force fresh CSRF token for appointment updates to avoid stale token issues
    await this.ensureCsrfToken(true);
    const response = await this.client.put<{ appointment: Appointment }>(`/appointments/${appointmentId}`, data);
    return response.data.appointment;
  }

  async updateAppointmentStatus(appointmentId: string, status: string): Promise<Appointment> {
    // Force fresh CSRF token for appointment status updates to avoid stale token issues
    await this.ensureCsrfToken(true);
    const response = await this.client.put<{ appointment: Appointment }>(`/appointments/${appointmentId}/status`, { status });
    return response.data.appointment;
  }

  async cancelAppointment(appointmentId: string, reason?: string, refundAmount?: number): Promise<void> {
    // Force fresh CSRF token for appointment cancellation to avoid stale token issues
    await this.ensureCsrfToken(true);
    const payload: any = { reason: reason || 'No reason provided' };
    if (refundAmount !== undefined) {
      payload.refundAmount = refundAmount;
    }
    await this.client.put(`/appointments/${appointmentId}/cancel`, payload);
  }

  async refundAppointment(appointmentId: string, amount: number, reason?: string): Promise<any> {
    // Force fresh CSRF token for appointment refunds to avoid stale token issues
    await this.ensureCsrfToken(true);
    const response = await this.client.post(`/appointments/${appointmentId}/refund`, {
      amount,
      reason: reason || 'Refund processed by shop owner'
    });
    return response.data;
  }

  async getEmployeeAbsences(shopId: string, params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Promise<any[]> {
    try {
      if (!params?.startDate || !params?.endDate) {
        console.warn('Start date and end date are required for employee absences');
        return [];
      }

      const response = await this.client.get(`/leave-requests/shop/${shopId}/absences`, {
        params: {
          startDate: params.startDate,
          endDate: params.endDate
        }
      });

      return response.data.absences || [];
    } catch (error) {
      console.warn('Failed to load employee absences, falling back to empty array:', error);
      return [];
    }
  }

  // Shop Stripe Details endpoints
  async getShopStripeDetails(shopId: string): Promise<any> {
    const response = await this.client.get(`/shops/${shopId}/stripe`);
    return response.data;
  }

  async getShopSubscriptionStatus(shopId: string): Promise<any> {
    const response = await this.client.get(`/shops/${shopId}/stripe/subscription-status`);
    return response.data;
  }

  async getShopPaymentCapability(shopId: string): Promise<any> {
    const response = await this.client.get(`/shops/${shopId}/stripe/payment-capability`);
    return response.data;
  }

  async getShopStripeAccountStatus(shopId: string): Promise<any> {
    const response = await this.client.get(`/shops/${shopId}/stripe/account-status`);
    return response.data;
  }



  // Notification endpoints
  async getNotifications(params?: { page?: number; size?: number }): Promise<any> {
    const response = await this.client.get('/notifications', { params });
    return response.data;
  }

  async getUnreadNotifications(): Promise<{ notifications: Notification[]; count: number }> {
    const response = await this.client.get('/notifications/unread');
    return response.data;
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    // Force fresh CSRF token for notification operations to avoid stale token issues
    await this.ensureCsrfToken(true);
    await this.client.put(`/notifications/${notificationId}/read`);
  }

  async markAllNotificationsAsRead(): Promise<void> {
    // Force fresh CSRF token for notification operations to avoid stale token issues
    await this.ensureCsrfToken(true);
    await this.client.put('/notifications/mark-all-read');
  }

  async autoMarkNotificationsAsSeen(): Promise<void> {
    // Force fresh CSRF token for notification operations to avoid stale token issues
    await this.ensureCsrfToken(true);
    await this.client.put('/notifications/auto-mark-seen');
  }

  async deleteNotification(notificationId: string): Promise<void> {
    // Force fresh CSRF token for notification deletion to avoid stale token issues
    await this.ensureCsrfToken(true);
    await this.client.delete(`/notifications/${notificationId}`);
  }

  async clearAllNotifications(): Promise<void> {
    // Force fresh CSRF token for notification clearing to avoid stale token issues
    await this.ensureCsrfToken(true);
    await this.client.delete('/notifications/clear-all');
  }

  // Analytics endpoints
  async getOwnerAnalytics(): Promise<OwnerAnalytics> {
    const response = await this.client.get<OwnerAnalytics>('/analytics/owner');
    return response.data;
  }

  async getShopAnalytics(shopId: string): Promise<any> {
    const response = await this.client.get(`/analytics/shop/${shopId}`);
    return response.data;
  }

  async getAppointmentStats(shopId: string, period?: string): Promise<any> {
    const params = period ? { period } : {};
    const response = await this.client.get(`/analytics/shop/${shopId}/appointments`, { params });
    return response.data;
  }

  async getRevenueStats(shopId: string, period?: string): Promise<any> {
    const params = period ? { period } : {};
    const response = await this.client.get(`/analytics/shop/${shopId}/revenue`, { params });
    return response.data;
  }

  async getCustomerStats(shopId: string, period?: string): Promise<any> {
    const params = period ? { period } : {};
    const response = await this.client.get(`/analytics/shop/${shopId}/customers`, { params });
    return response.data;
  }

  async getEmployeePerformanceMetrics(employeeId: string, period?: string): Promise<any> {
    const params = period ? { period } : {};
    const response = await this.client.get(`/performance/employee/${employeeId}/metrics`, { params });
    return response.data;
  }

  async getAbsenceAnalytics(shopId: string, period?: string): Promise<any> {
    try {
      let endpoint = `/absence-analytics/shop/${shopId}`;

      // If period is specified, use the appropriate endpoint
      if (period) {
        switch (period) {
          case 'month':
            endpoint = `/absence-analytics/shop/${shopId}/current-month`;
            break;
          case 'quarter':
            endpoint = `/absence-analytics/shop/${shopId}/current-quarter`;
            break;
          case 'year':
            endpoint = `/absence-analytics/shop/${shopId}/current-year`;
            break;
          case 'dashboard':
            endpoint = `/absence-analytics/shop/${shopId}/dashboard`;
            break;
          default:
            // For custom periods, we would need start and end dates
            console.warn('Custom periods require start and end dates');
            return null;
        }
      }

      const response = await this.client.get(endpoint);
      return response.data.analytics || response.data;
    } catch (error) {
      console.error('Failed to fetch absence analytics:', error);
      throw error;
    }
  }

  // Slot locking endpoints
  async lockSlot(params: {
    shopId: string;
    serviceId: string;
    employeeId: string;
    date: string;
    time: string;
  }): Promise<{ lockToken: string; expiresIn: number }> {
    // Force fresh CSRF token for slot locking to avoid stale token issues
    await this.ensureCsrfToken(true);

    // Import the utility function
    const { createUTCAppointmentDateTime } = await import('./utils');

    // Use UTC time directly from slot (no conversion needed)
    const dateTime = createUTCAppointmentDateTime(params.date, params.time);

    const response = await this.client.post('/appointments/lock-slot', {
      shopId: params.shopId,
      serviceId: params.serviceId,
      employeeId: params.employeeId,
      dateTime: dateTime,
    });
    return response.data;
  }

  async unlockSlot(params: {
    shopId: string;
    serviceId: string;
    employeeId: string;
    date: string;
    time: string;
    sessionId: string;
  }): Promise<void> {
    // Force fresh CSRF token for slot unlocking to avoid stale token issues
    await this.ensureCsrfToken(true);

    // Import the utility function
    const { createUTCAppointmentDateTime } = await import('./utils');

    // Use UTC time directly from slot (no conversion needed)
    const dateTime = createUTCAppointmentDateTime(params.date, params.time);

    await this.client.post('/appointments/unlock-slot', {
      shopId: params.shopId,
      serviceId: params.serviceId,
      employeeId: params.employeeId,
      dateTime: dateTime,
      lockToken: params.sessionId,
    });
  }

  // Subscription endpoints
  async getSubscriptionPlans(): Promise<any[]> {
    const response = await this.client.get('/subscription-plans');
    return response.data.plans || response.data || [];
  }

  async createSubscription(shopId: string, subscriptionData: any): Promise<any> {
    // Force fresh CSRF token for subscription creation to avoid stale token issues
    await this.ensureCsrfToken(true);
    const response = await this.client.post(`/subscriptions/shops/${shopId}`, subscriptionData);
    return response.data;
  }

  async createSubscriptionPaymentIntent(shopId: string, intentData: any): Promise<any> {
    // Force fresh CSRF token for subscription payment intent to avoid stale token issues
    await this.ensureCsrfToken(true);
    const response = await this.client.post(`/subscriptions/shops/${shopId}/payment-intent`, intentData);
    return response.data;
  }

  async confirmSubscription(shopId: string, paymentIntentId: string): Promise<any> {
    // Force fresh CSRF token for subscription confirmation to avoid stale token issues
    await this.ensureCsrfToken(true);
    const response = await this.client.post(`/subscriptions/shops/${shopId}/confirm-subscription`, {
      paymentIntentId
    });
    return response.data;
  }

  async confirmSetupAndActivateSubscription(shopId: string, setupIntentId: string): Promise<any> {
    await this.ensureCsrfToken();
    const response = await this.client.post(`/subscriptions/shops/${shopId}/confirm-setup-and-activate`, {
      setupIntentId
    });
    return response.data;
  }

  async createSubscriptionSetupPaymentIntent(shopId: string, intentData: any): Promise<any> {
    await this.ensureCsrfToken();
    const response = await this.client.post(`/subscriptions/shops/${shopId}/setup-payment-intent`, intentData);
    return response.data;
  }

  async createSubscriptionIntent(shopId: string, intentData: any): Promise<any> {
    await this.ensureCsrfToken();
    const response = await this.client.post(`/subscriptions/shops/${shopId}/intent`, intentData);
    return response.data;
  }

  async getSubscriptionDetails(shopId: string): Promise<any> {
    const response = await this.client.get(`/subscriptions/shops/${shopId}`);
    return response.data;
  }

  async getDetailedSubscriptionInfo(shopId: string): Promise<any> {
    const response = await this.client.get(`/subscriptions/shops/${shopId}/detailed`);
    return response.data;
  }

  async cancelSubscription(shopId: string, cancelData?: { cancelImmediately?: boolean }): Promise<any> {
    // Force fresh CSRF token for subscription cancellation to avoid stale token issues
    await this.ensureCsrfToken(true);
    const response = await this.client.post(`/subscriptions/shops/${shopId}/cancel`, cancelData || {});
    return response.data;
  }

  async reactivateSubscription(shopId: string): Promise<any> {
    await this.ensureCsrfToken(true);
    const response = await this.client.post(`/subscriptions/shops/${shopId}/reactivate`);
    return response.data;
  }

  async updateSubscription(shopId: string, updateData: { priceId: string }): Promise<any> {
    // Force fresh CSRF token for subscription updates to avoid stale token issues
    await this.ensureCsrfToken(true);
    const response = await this.client.put(`/subscriptions/shops/${shopId}`, updateData);
    return response.data;
  }

  async updateSubscriptionPlan(shopId: string, updateData: { newStripePriceId: string; prorate?: boolean; prorationBehavior?: string }): Promise<any> {
    await this.ensureCsrfToken(true);
    const response = await this.client.put(`/subscriptions/shops/${shopId}/plan`, updateData);
    return response.data;
  }

  async createCustomerPortalSession(shopId: string, returnUrl: string): Promise<any> {
    await this.ensureCsrfToken();
    const response = await this.client.post(`/subscriptions/customer-portal/${shopId}`, { returnUrl });
    return response.data;
  }

  // Stripe Tax endpoints
  async getTaxRegistrationRequirements(countryCode: string): Promise<any> {
    const response = await this.client.get(`/stripe/tax/requirements/${countryCode}`);
    return response.data;
  }

  async registerShopForTax(shopId: string, registrationData: any): Promise<any> {
    await this.ensureCsrfToken();
    const response = await this.client.post(`/stripe/tax/register/${shopId}`, registrationData);
    return response.data;
  }

  async enableAutomaticTaxCalculation(shopId: string): Promise<any> {
    await this.ensureCsrfToken();
    const response = await this.client.post(`/stripe/tax/enable-automatic/${shopId}`);
    return response.data;
  }

  async getTaxRegistrationStatus(shopId: string): Promise<any> {
    const response = await this.client.get(`/stripe/tax/status/${shopId}`);
    return response.data;
  }

  async calculateTaxForPayment(shopId: string, paymentData: any): Promise<any> {
    const response = await this.client.post(`/stripe/tax/calculate/${shopId}`, paymentData);
    return response.data;
  }

  async getSupportedTaxCodes(): Promise<any> {
    const response = await this.client.get('/stripe/tax/tax-codes');
    return response.data;
  }

  async getPaymentMethods(shopId: string): Promise<any> {
    const response = await this.client.get(`/subscriptions/shops/${shopId}/payment-methods`);
    return response.data;
  }

  async addPaymentMethod(shopId: string, paymentMethodId: string): Promise<any> {
    await this.ensureCsrfToken();
    const response = await this.client.post(`/subscriptions/shops/${shopId}/payment-methods`, { paymentMethodId });
    return response.data;
  }

  async setDefaultPaymentMethod(shopId: string, paymentMethodId: string): Promise<any> {
    await this.ensureCsrfToken();
    const response = await this.client.post(`/subscriptions/shops/${shopId}/payment-methods/${paymentMethodId}/default`);
    return response.data;
  }

  async removePaymentMethod(shopId: string, paymentMethodId: string): Promise<any> {
    await this.ensureCsrfToken();
    const response = await this.client.delete(`/subscriptions/shops/${shopId}/payment-methods/${paymentMethodId}`);
    return response.data;
  }

  async getSubscriptionInvoices(shopId: string, params?: { limit?: number; startingAfter?: string }): Promise<any> {
    const response = await this.client.get(`/subscriptions/shops/${shopId}/invoices`, { params });
    return response.data;
  }

  async getUpcomingInvoice(shopId: string): Promise<any> {
    const response = await this.client.get(`/subscriptions/shops/${shopId}/upcoming-invoice`);
    return response.data;
  }

  async syncSubscriptionStatus(shopId: string): Promise<any> {
    await this.ensureCsrfToken();
    const response = await this.client.post(`/subscriptions/sync-status/${shopId}`);
    return response.data;
  }



  // New shop creation workflow endpoints
  async createSetupIntent(setupData: any): Promise<any> {
    const response = await this.client.post('/subscriptions/setup-intent', setupData);
    return response.data;
  }

  async confirmSetupAndCreateShop(confirmData: any): Promise<any> {
    const response = await this.client.post('/subscriptions/confirm-setup-and-create-shop', confirmData);
    return response.data;
  }



  // Stripe Connect endpoints
  async createStripeConnectAccount(shopId: string, accountData: any): Promise<any> {
    await this.ensureCsrfToken();
    const response = await this.client.post(`/stripe/connect/accounts/${shopId}`, accountData);
    return response.data;
  }

  async getStripeConnectAccount(shopId: string): Promise<any> {
    const response = await this.client.get(`/stripe/connect/accounts/${shopId}`);
    return response.data;
  }

  async createStripeAccountSession(shopId: string): Promise<any> {
    await this.ensureCsrfToken();
    const response = await this.client.post(`/stripe/connect/accounts/${shopId}/account-session`);
    return response.data;
  }

  async createStripeDashboardLink(shopId: string): Promise<any> {
    await this.ensureCsrfToken();
    const response = await this.client.post(`/stripe/connect/accounts/${shopId}/dashboard-link`);
    return response.data;
  }

  async updateStripeConnectAccount(shopId: string, accountData: any): Promise<any> {
    await this.ensureCsrfToken();
    const response = await this.client.put(`/stripe/connect/accounts/${shopId}/api-onboarding`, accountData);
    return response.data;
  }

  // Enhanced Stripe Connect management
  async getConnectAccountBalance(shopId: string): Promise<any> {
    const response = await this.client.get(`/stripe/connect/accounts/${shopId}/balance`);
    return response.data;
  }

  async getConnectAccountPayouts(shopId: string, params?: { limit?: number; starting_after?: string }): Promise<any> {
    const response = await this.client.get(`/stripe/connect/accounts/${shopId}/payouts`, { params });
    return response.data;
  }

  async getConnectAccountTransactions(shopId: string, params?: { limit?: number; starting_after?: string }): Promise<any> {
    const response = await this.client.get(`/stripe/connect/accounts/${shopId}/transactions`, { params });
    return response.data;
  }

  async updateConnectAccountDetails(shopId: string, updateData: any): Promise<any> {
    await this.ensureCsrfToken();
    const response = await this.client.put(`/stripe/connect/accounts/${shopId}/details`, updateData);
    return response.data;
  }

  async getConnectAccountRequirements(shopId: string): Promise<any> {
    const response = await this.client.get(`/stripe/connect/accounts/${shopId}/requirements`);
    return response.data;
  }

  async submitConnectAccountForReview(shopId: string): Promise<any> {
    await this.ensureCsrfToken();
    const response = await this.client.post(`/stripe/connect/accounts/${shopId}/submit`);
    return response.data;
  }

  async createConnectAccountLink(shopId: string, returnUrl: string, refreshUrl?: string): Promise<any> {
    await this.ensureCsrfToken();
    const response = await this.client.post(`/stripe/connect/accounts/${shopId}/account-link`, {
      returnUrl,
      refreshUrl
    });
    return response.data;
  }



  // Payment endpoints
  async createPaymentIntent(request: {
    shopId: string;
    serviceId: string;
    amount: number;
    currency?: string;
    description?: string;
    customerEmail?: string;
    customerName?: string;
  }): Promise<{
    paymentIntentId: string;
    clientSecret: string;
    amount: number;
    currency: string;
    status: string;
    shopName: string;
    description: string;
  }> {
    // Force fresh CSRF token for payment intent creation to avoid stale token issues
    await this.ensureCsrfToken(true);
    const response = await this.client.post('/payments/create-payment-intent', request);
    return response.data;
  }

  async confirmPaymentIntent(paymentIntentId: string, paymentMethodId: string): Promise<any> {
    // Force fresh CSRF token for payment confirmation to avoid stale token issues
    await this.ensureCsrfToken(true);
    const response = await this.client.post('/payments/confirm-payment-intent', null, {
      params: { paymentIntentId, paymentMethodId }
    });
    return response.data;
  }

  // Stripe Connect Direct Charges payment intent
  async createConnectPaymentIntent(request: {
    shopId: string;
    serviceId: string;
    amount: number;
    currency: string;
    description?: string;
    customerEmail?: string;
    customerName?: string;
    paymentMethodTypes?: string[];
    savePaymentMethod?: boolean;
  }): Promise<{
    paymentIntentId: string;
    clientSecret: string;
    amount: number;
    currency: string;
    status: string;
    shopName: string;
    description: string;
    connectedAccountId: string;
  }> {
    const response = await this.client.post('/payments/create-connect-payment-intent', request);
    return response.data;
  }



  // User Payment Methods endpoints
  async getUserPaymentMethods(): Promise<PaymentMethodsResponse> {
    const response = await this.client.get('/user/payment-methods');
    return response.data;
  }

  async getDefaultUserPaymentMethod(): Promise<{ success: boolean; defaultPaymentMethod: UserPaymentMethod | null }> {
    const response = await this.client.get('/user/payment-methods/default');
    return response.data;
  }

  async createUserSetupIntent(): Promise<SetupIntentResponse> {
    await this.ensureCsrfToken();
    const response = await this.client.post('/user/payment-methods/setup-intent');
    return response.data;
  }

  async removeUserPaymentMethod(paymentMethodId: string): Promise<{ success: boolean; message: string }> {
    await this.ensureCsrfToken();
    const response = await this.client.delete(`/user/payment-methods/${paymentMethodId}`);
    return response.data;
  }

  async setDefaultUserPaymentMethod(paymentMethodId: string): Promise<{ success: boolean; message: string }> {
    await this.ensureCsrfToken();
    const response = await this.client.put(`/user/payment-methods/${paymentMethodId}/set-default`);
    return response.data;
  }

  async checkDuplicateCard(fingerprint: string): Promise<{ success: boolean; isDuplicate: boolean }> {
    await this.ensureCsrfToken();
    const response = await this.client.post('/user/payment-methods/check-duplicate', { fingerprint });
    return response.data;
  }

  // Leave Request endpoints
  async getEmployeeByUserId(userId: string): Promise<any> {
    const response = await this.client.get(`/employees/user/${userId}`);
    return response.data;
  }

  async getEmployeeLeaveRequests(employeeId: string, params?: {
    page?: number;
    size?: number;
  }): Promise<any> {
    const response = await this.client.get(`/leave-requests/employee/${employeeId}`, { params });
    return response.data;
  }





  async getShopLeaveRequests(shopId: string, params?: {
    page?: number;
    size?: number;
  }): Promise<any> {
    const response = await this.client.get(`/leave-requests/shop/${shopId}`, { params });
    return response.data;
  }

  async reviewLeaveRequest(requestId: string, data: {
    action: 'APPROVE' | 'REJECT';
    comments?: string;
  }): Promise<any> {
    await this.ensureCsrfToken();
    // Transform frontend data to backend format
    const reviewData = {
      status: data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      reviewNotes: data.comments || null
    };

    const response = await this.client.post(`/leave-requests/${requestId}/review`, reviewData);
    return response.data;
  }

  async cancelLeaveRequest(requestId: string, employeeId: string): Promise<any> {
    await this.ensureCsrfToken();
    const response = await this.client.post(`/leave-requests/${requestId}/cancel/employee/${employeeId}`);
    return response.data;
  }

  async createLeaveRequest(employeeId: string, data: {
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
  }): Promise<any> {
    await this.ensureCsrfToken();
    const response = await this.client.post(`/leave-requests/employee/${employeeId}`, data);
    return response.data;
  }

  // Schedule endpoints
  async getEmployeeSchedule(employeeId: string): Promise<any> {
    // GET requests don't need CSRF protection
    const response = await this.client.get(`/schedules/employee/${employeeId}`);
    return response.data;
  }

  async updateEmployeeSchedule(employeeId: string, scheduleSlots: any[]): Promise<any> {
    // Force fresh CSRF token for schedule updates to avoid stale token issues
    await this.ensureCsrfToken(true);
    const response = await this.client.post(`/schedules/employee/${employeeId}`, scheduleSlots);
    return response.data;
  }

  async deleteScheduleSlot(slotId: string): Promise<any> {
    await this.ensureCsrfToken();
    const response = await this.client.delete(`/schedules/slot/${slotId}`);
    return response.data;
  }

  async hardDeleteScheduleSlot(slotId: string): Promise<any> {
    await this.ensureCsrfToken();
    const response = await this.client.delete(`/schedules/slot/${slotId}/hard`);
    return response.data;
  }

  async toggleScheduleSlot(slotId: string): Promise<any> {
    await this.ensureCsrfToken();
    const response = await this.client.put(`/schedules/slot/${slotId}/toggle`);
    return response.data;
  }

  async getPublicEmployeeSchedule(employeeId: string): Promise<any> {
    const response = await this.client.get(`/schedules/public/employee/${employeeId}`);
    return response.data;
  }

  async getMySchedule(): Promise<any> {
    // GET requests don't need CSRF protection
    const response = await this.client.get('/schedules/my-schedule');
    return response.data;
  }

  // Content endpoints
  async getFAQs(): Promise<any[]> {
    try {
      const response = await this.client.get('/content/faqs');
      return response.data;
    } catch (error) {
      // Fallback to default FAQs if API is not available
      console.warn('FAQ API not available, using fallback data');
      return this.getFallbackFAQs();
    }
  }

  async getNews(params?: { category?: string; limit?: number; offset?: number }): Promise<any> {
    try {
      const response = await this.client.get('/content/news', { params });
      return response.data;
    } catch (error) {
      console.warn('News API not available, using fallback data');
      return this.getFallbackNews();
    }
  }

  async getNewsItem(newsId: string): Promise<any> {
    try {
      const response = await this.client.get(`/content/news/${newsId}`);
      return response.data;
    } catch (error) {
      console.warn('News item API not available');
      throw error;
    }
  }

  async getFeaturedNews(limit: number = 3): Promise<any[]> {
    try {
      const response = await this.client.get(`/content/news/featured?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.warn('Featured news API not available, using fallback data');
      return this.getFallbackNews().slice(0, limit);
    }
  }

  // Fallback data methods
  private getFallbackFAQs(): any[] {
    return [
      {
        id: '1',
        category: 'Booking',
        question: 'How do I book an appointment?',
        answer: 'You can book an appointment by browsing our salon listings, selecting your preferred service and time slot, and completing the booking process. All bookings are confirmed instantly with real-time availability.',
        order: 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        category: 'Booking',
        question: 'Can I cancel or reschedule my appointment?',
        answer: 'Yes, you can cancel or reschedule your appointment up to 24 hours before the scheduled time. Simply go to your bookings in your account dashboard to make changes.',
        order: 2,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '3',
        category: 'Payment',
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit cards, debit cards, and digital payment methods. Some salons may also accept cash payments on-site. Payment methods are clearly indicated for each salon.',
        order: 3,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '4',
        category: 'Account',
        question: 'Do I need to create an account to book?',
        answer: 'While you can browse salons without an account, creating one allows you to manage bookings, save favorite salons, and receive personalized recommendations.',
        order: 4,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }

  private getFallbackNews(): any[] {
    return [
      {
        id: '1',
        title: 'Welcome to Lunara - Your Premium Beauty Platform',
        content: 'We are excited to announce the launch of Lunara, the premier platform for booking beauty services. Discover top-rated salons and book your perfect appointment today.',
        excerpt: 'Discover the future of beauty booking with Lunara.',
        category: 'Announcements',
        tags: ['launch', 'beauty', 'platform'],
        isPublished: true,
        publishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }



  async calculateTaxWithStripe(shopId: string, taxData: any): Promise<any> {
    await this.ensureCsrfToken();
    const response = await this.client.post(`/subscriptions/${shopId}/tax/calculate`, taxData);
    return response.data;
  }

  // Guest Review endpoints
  async getGuestAppointmentForReview(appointmentId: string, guestEmail: string): Promise<any> {
    const response = await this.client.get(`/guest-reviews/appointment/${appointmentId}`, {
      params: { email: guestEmail }
    });
    return response.data;
  }

  async submitGuestReview(reviewData: any): Promise<any> {
    const response = await this.client.post('/guest-reviews', reviewData);
    return response.data;
  }

  // Authenticated User Review endpoints
  async createReview(reviewData: any): Promise<any> {
    await this.ensureCsrfToken();
    const response = await this.client.post('/ratings', reviewData);
    return response.data;
  }

  async createReviewWithImage(formData: FormData): Promise<any> {
    // Force fresh CSRF token for rating upload to avoid stale token issues
    await this.ensureCsrfToken(true);
    const response = await this.client.post('/ratings/with-image', formData, {
      headers: this.getMultipartHeaders()
    });
    return response.data;
  }

  async canGuestReviewAppointment(appointmentId: string, guestEmail: string): Promise<any> {
    const response = await this.client.get(`/guest-reviews/can-review/${appointmentId}`, {
      params: { email: guestEmail }
    });
    return response.data;
  }

  // Shop Reviews endpoints
  async getShopReviews(shopId: string, page: number = 0, size: number = 10): Promise<any> {
    const response = await this.client.get(`/ratings/shop/${shopId}`, {
      params: { page, size }
    });
    return response.data;
  }

  async getShopRatingStats(shopId: string): Promise<any> {
    const response = await this.client.get(`/ratings/shop/${shopId}/stats`);
    return response.data;
  }

  // Test endpoints
  async testConnection(): Promise<{ message: string; status: string }> {
    const response = await this.client.get('/test/hello');
    return response.data;
  }

  // Generic HTTP methods for compliance components
  async get(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.client.get(url, config);
  }

  async post(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    await this.ensureCsrfToken();
    return this.client.post(url, data, config);
  }

  async put(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    await this.ensureCsrfToken();
    return this.client.put(url, data, config);
  }

  async delete(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    await this.ensureCsrfToken();
    return this.client.delete(url, config);
  }
}

export const apiClient = new ApiClient();
export default apiClient;
