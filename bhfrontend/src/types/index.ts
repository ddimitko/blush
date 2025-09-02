// User and Authentication Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'USER' | 'OWNER' | 'EMPLOYEE' | 'ADMIN';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface LoginResponse {
  token: string;
  refreshToken?: string;
  type: string;
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  roles: string[];
}

// OAuth2 Types
export interface OAuth2AuthRequest {
  accessToken: string;
  provider: 'facebook' | 'google';
}

// User Payment Method Types (for saved payment methods)
export interface UserPaymentMethod {
  id: string;
  type: string;
  isDefault: boolean;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    fingerprint: string;
  };
  created: number;
}

export interface PaymentMethodsResponse {
  success: boolean;
  paymentMethods: UserPaymentMethod[];
}

export interface SetupIntentResponse {
  success: boolean;
  setupIntent: {
    setupIntentId: string;
    clientSecret: string;
    customerId: string;
  };
}

export interface OAuth2AuthResponse {
  token: string;
  refreshToken?: string;
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  roles: string[];
  isNewUser: boolean;
  provider: string;
}

export interface FacebookAuthRequest {
  accessToken: string;
}

export interface UserConnection {
  id: string;
  provider: string;
  providerId: string;
  providerEmail: string;
  providerName: string;
  connectedAt: string;
}

// Shop Types
export interface Shop {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  postalCode: string; // Backend uses postalCode, not zipCode
  country: string;
  phone: string;
  email: string;
  website?: string;
  businessTypes: BusinessType[];
  gallery: string[]; // Backend uses gallery, not images
  thumbnail?: string;
  ratingAverage: number; // Backend uses ratingAverage, not rating
  ratingCount: number; // Backend uses ratingCount, not reviewCount
  active: boolean;
  acceptsCardPayments: boolean; // Backend uses acceptsCardPayments
  owner: User;
  businessHours?: BusinessHours[];
  latitude?: number; // Geolocation coordinates
  longitude?: number; // Geolocation coordinates
  createdAt: string;
  updatedAt: string;
  // Optional distance property for location-based searches
  distance?: number; // Distance in kilometers from user's location
}

// Separate interface for Stripe details (fetched per request for security)
export interface ShopStripeDetails {
  id: string;
  shopId: string;
  stripeAccountId?: string;
  stripeOnboardingCompleted: boolean;
  subscriptionId?: string;
  stripeCustomerId?: string;
  stripePriceId?: string;
  lastStripeSync?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessHours {
  dayOfWeek: string;
  closed: boolean;
  openTime?: string;
  closeTime?: string;
}

export type BusinessType =
  | 'HAIRDRESSER'
  | 'BARBER'
  | 'MASSAGE'
  | 'NAIL_STYLIST'
  | 'SPA'
  | 'BEAUTY_SALON'
  | 'SKINCARE_CLINIC'
  | 'EYEBROW_THREADING'
  | 'TATTOO_PARLOR'
  | 'WELLNESS_CENTER'
  | 'MAKEUP_ARTIST'
  | 'LASH_EXTENSIONS'
  | 'MICROBLADING'
  | 'PERMANENT_MAKEUP'
  | 'WAXING_SALON';

export type SubscriptionStatus = 
  | 'incomplete' 
  | 'incomplete_expired' 
  | 'trialing' 
  | 'active' 
  | 'past_due' 
  | 'canceled' 
  | 'unpaid';

export interface ShopCreationRequest {
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  businessTypes: BusinessType[];
  termsAccepted: boolean;
  latitude?: number;
  longitude?: number;
}

// Employee Types
export interface Employee {
  id: string;
  fullName?: string; // Made optional since backend might return 'name' instead
  name?: string; // Backend returns this field instead of fullName
  email: string;
  phone?: string;
  bio?: string;
  specialties?: string; // Backend returns this as a string, not array
  yearsExperience?: number;
  hourlyRate?: number;
  commissionRate?: number;
  hireDate: string;
  active: boolean;
  avatar?: string;
  invitationStatus?: string; // For tracking invitation status (PENDING, ACCEPTED, REJECTED)
  invitationId?: string; // For canceling pending invitations
  shop: Shop;
  user?: User;
  services: Service[];
  // Helper properties for easier access
  firstName?: string;
  lastName?: string;
}

export interface EmployeeCreationRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  bio?: string;
  specialties?: string;
  yearsExperience?: number;
  hourlyRate?: number;
  commissionRate?: number;
}

export interface EmployeeInvitationRequest {
  email: string;
  bio?: string;
  specialties?: string;
  yearsExperience?: number;
  hourlyRate?: number;
  commissionRate?: number;
}

export interface EmployeeInvitationAcceptRequest {
  token: string;
  password: string;
  confirmPassword: string;
  phone?: string;
}

// Service Types
export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  category?: string;
  active: boolean;
  bookingBufferMinutes?: number;
  shop: Shop;
  employees: Employee[];
}

export interface ServiceCreationRequest {
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  category?: string;
  employeeIds: string[];
  shopId: string;
  active?: boolean;
  bookingBufferMinutes?: number;
}

export interface ServiceUpdateRequest {
  name?: string;
  description?: string;
  price?: number;
  durationMinutes?: number;
  category?: string;
  employeeIds?: string[];
  active?: boolean;
  bookingBufferMinutes?: number;
}

// Appointment Types - Backend Response (flat structure)
export interface AppointmentResponse {
  id: string;

  // Shop information
  shopId: string;
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  shopCountry: string;

  // Employee information
  employeeId: string;
  employeeName: string;
  employeeSpecialties?: string;

  // Service information
  serviceId: string;
  serviceName: string;
  serviceDescription?: string;
  serviceDurationMinutes: number;
  servicePrice: number;

  // User information (null for guest appointments)
  userId?: string;
  userName?: string;
  userEmail?: string;

  // Guest information (null for authenticated user appointments)
  guestEmail?: string;
  guestFirstName?: string;
  guestLastName?: string;
  guestPhone?: string;

  // Appointment details
  appointmentDateTime: string;
  endDateTime: string;
  status: AppointmentStatus;
  paymentType: PaymentMethod;
  totalAmount: number;
  depositAmount?: number;
  notes?: string;

  // Payment information
  paymentIntentId?: string;
  paymentMethodId?: string;
  paymentStatus: PaymentStatus;

  // Refund information
  refundId?: string;
  refundStatus?: string;
  refundAmount?: number;
  refundDate?: string;

  // Cancellation information
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;

  // Notification flags
  reminderSent?: boolean;
  confirmationSent?: boolean;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Computed properties
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

// Appointment Types - Frontend Interface (nested structure)
export interface Appointment {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  appointmentDateTime: string; // Changed from appointmentDate/startTime
  endDateTime: string; // Changed from endTime
  status: AppointmentStatus;
  totalAmount: number; // Changed from totalCost
  paymentType: PaymentMethod; // Changed from paymentMethod
  paymentStatus: PaymentStatus;
  notes?: string;
  service: Service;
  employee: Employee;
  shop: Shop;
  customer?: User;
  createdAt: string;
  updatedAt: string;

  // Payment information
  paymentIntentId?: string;
  paymentMethodId?: string;

  // Refund information
  refundId?: string;
  refundStatus?: string;
  refundAmount?: number;
  refundDate?: string;

  // Cancellation information
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
}

export type AppointmentStatus = 
  | 'PENDING' 
  | 'CONFIRMED' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'NO_SHOW';

export type PaymentMethod = 'CARD' | 'CASH';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface AppointmentCreationRequest {
  shopId: string;
  serviceId: string;
  employeeId: string;
  appointmentDateTime: string;
  paymentType: PaymentMethod;
  notes?: string;
  slotLockToken: string;

  // Guest user information (for unauthenticated users)
  guestEmail?: string;
  guestFirstName?: string;
  guestLastName?: string;
  guestPhone?: string;

  // Stripe payment information (if payment type is CARD)
  paymentIntentId?: string;
  paymentMethodId?: string;

  // Deposit amount (optional)
  depositAmount?: number;
}

// Schedule Types
export interface ScheduleSlot {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  active: boolean;
  employee: Employee;
}

export interface AvailableSlot {
  dateTime: string;
  startTime: string;
  endTime: string;
  time: string; // Keep for backward compatibility
  available: boolean;
  locked?: boolean;
  lockedBy?: string;
  employeeId: string;
  employeeName: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  price: number;
}

// Notification Types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  actionUrl?: string;
  data?: string; // JSON data for additional context
  seen: boolean;
  readAt?: string;
  pushSent?: boolean;
  emailSent?: boolean;
  createdAt: string;
  updatedAt?: string;
  formattedDate?: string;
  userName?: string;
  // Computed property for compatibility
  read?: boolean;
}

export type NotificationType =
  | 'APPOINTMENT_REMINDER'
  | 'APPOINTMENT_CONFIRMED'
  | 'APPOINTMENT_CANCELLED'
  | 'APPOINTMENT_RESCHEDULED'
  | 'APPOINTMENT_CREATED'
  | 'APPOINTMENT_EDITED'
  | 'APPOINTMENT_CANCELLED_BY_CUSTOMER'
  | 'APPOINTMENT_CANCELLED_BY_EMPLOYEE'
  | 'APPOINTMENT_EDITED_BY_CUSTOMER'
  | 'APPOINTMENT_EDITED_BY_EMPLOYEE'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'NEW_BOOKING'
  | 'BOOKING_CANCELLED'
  | 'EMPLOYEE_INVITATION'
  | 'LEAVE_REQUEST_SUBMITTED'
  | 'LEAVE_REQUEST_APPROVED'
  | 'LEAVE_REQUEST_REJECTED'
  | 'SHOP_APPROVED'
  | 'SHOP_REJECTED'
  | 'SUBSCRIPTION_EXPIRING'
  | 'SUBSCRIPTION_RENEWED'
  | 'SUBSCRIPTION_CANCELLED'
  | 'REVIEW_REQUEST'
  | 'APPOINTMENT_STARTED'
  | 'APPOINTMENT_STATUS_CHANGED'
  | 'SYSTEM_MAINTENANCE'
  | 'PROMOTIONAL'
  | 'SHOP_CREATED';

// Payment Types
export interface PaymentIntentRequest {
  shopId: string;
  serviceId: string;
  amount: number;
  currency?: string;
  description?: string;
  customerEmail?: string;
  customerName?: string;
}

export interface PaymentIntentResponse {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
  shopName: string;
  description: string;
  connectedAccountId?: string;

  // Tax information (if calculated)
  taxAmount?: number;
  taxRate?: number;
  totalAmount?: number;
  taxCalculated?: boolean;
  taxCode?: string;
  taxBehavior?: 'inclusive' | 'exclusive';
}

// Guest Review Types
export interface GuestReviewRequest {
  appointmentId: string;
  guestEmail: string;
  stars: number;
  comment?: string;
  anonymous?: boolean;
  createAccount?: boolean;
  firstName?: string;
  lastName?: string;
  password?: string;
  phoneNumber?: string;
}

export interface GuestReviewResponse {
  ratingId: string;
  appointmentId: string;
  stars: number;
  comment?: string;
  anonymous: boolean;
  createdAt: string;
  shopName: string;
  serviceName: string;
  employeeName: string;
  accountCreated: boolean;
  userId?: string;
  message: string;
}

export interface GuestAppointmentForReview {
  id: string;
  serviceName: string;
  shopName: string;
  employeeName: string;
  appointmentDateTime: string;
  guestName: string;
}

// Analytics Types
export interface OwnerAnalytics {
  totalRevenue: number;
  totalAppointments: number;
  totalCustomers: number;
  averageRating: number;
  revenueGrowth: number;
  appointmentGrowth: number;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
  }>;
  topServices: Array<{
    name: string;
    bookings: number;
    revenue: number;
  }>;
  topEmployees: Array<{
    name: string;
    bookings: number;
    revenue: number;
  }>;
}

// Stripe Types
export interface SubscriptionDetails {
  shopId: string;
  subscriptionId: string;
  customerId: string;
  status: SubscriptionStatus;
  message: string;
  clientSecret?: string;
  requiresPayment: boolean;
  stripePriceId: string;
  planDisplayName: string;
  amount: number;
  currency: string;
  interval: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string;
  createdAt: string;
  isActive: boolean;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  customerPortalUrl?: string;

  // Trial-related fields
  isTrialing?: boolean;
  trialStart?: string;
  trialEnd?: string;
  trialDaysRemaining?: number;
  trialExpired?: boolean;
}

export interface StripeConnectAccount {
  shopId: string;
  stripeAccountId: string;
  onboardingCompleted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requiresAction: boolean;
  currentlyDue: string[];
  eventuallyDue: string[];
  pastDue: string[];
  pendingVerification: string[];
  country: string;
  defaultCurrency: string;
  email?: string;
  businessType?: string;
  businessProfile?: {
    name?: string;
    url?: string;
    supportEmail?: string;
    supportPhone?: string;
  };
}

export interface CustomerPortalRequest {
  returnUrl: string;
}

export interface CustomerPortalResponse {
  url: string;
  sessionId: string;
}

export interface SubscriptionUpdateRequest {
  newStripePriceId: string;
  prorate?: boolean;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
}

export interface SubscriptionCancelRequest {
  cancelImmediately?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  interval: string;
  stripePriceId: string;
  features: string[];
  popular?: boolean;

  // Trial-related fields
  hasFreeTrial?: boolean;
  trialDays?: number;
  trialDescription?: string;
}

// Enhanced Stripe types
export interface StripePaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  billing_details?: {
    name?: string;
    email?: string;
    address?: {
      city?: string;
      country?: string;
      line1?: string;
      line2?: string;
      postal_code?: string;
      state?: string;
    };
  };
  created: number;
  is_default?: boolean;
}

export interface Invoice {
  id: string;
  amount_due: number;
  amount_paid: number;
  amount_remaining: number;
  currency: string;
  status: string;
  created: number;
  due_date?: number;
  hosted_invoice_url?: string;
  invoice_pdf?: string;
  number?: string;
  period_start: number;
  period_end: number;
  subscription: string;
  total: number;
}

export interface ConnectAccountBalance {
  available: Array<{
    amount: number;
    currency: string;
  }>;
  pending: Array<{
    amount: number;
    currency: string;
  }>;
}

export interface ConnectAccountPayout {
  id: string;
  amount: number;
  currency: string;
  arrival_date: number;
  created: number;
  description?: string;
  destination: string;
  method: string;
  status: string;
  type: string;
}

export interface ConnectAccountTransaction {
  id: string;
  amount: number;
  currency: string;
  created: number;
  description?: string;
  fee: number;
  fee_details: Array<{
    amount: number;
    currency: string;
    description: string;
    type: string;
  }>;
  net: number;
  status: string;
  type: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  success?: boolean;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

// WebSocket Types
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
}

export interface SlotLockMessage {
  type: 'SLOT_LOCKED' | 'SLOT_UNLOCKED';
  payload: {
    serviceId: string;
    employeeId: string;
    date: string;
    time: string;
    sessionId: string;
  };
}

// Form Types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'radio';
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  validation?: any;
}
