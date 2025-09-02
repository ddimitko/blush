import React, { useEffect, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';

// Import global transition styles
import './styles/transitions.css';

// Initialize i18n
import './lib/i18n';

import { queryClient } from './lib/queryClient';
import { useAuth } from './hooks/useAuth';
import { useAuthActivity } from './hooks/useAuthActivity';
import { useAuthInterceptor } from './hooks/useAuthInterceptor';
import { useAuthStateSync } from './hooks/useAuthStateSync';
import { useRealTimeNotifications } from './hooks/useRealTimeNotifications';
import { performanceMonitor, cleanupPerformanceMonitoring } from './lib/performance';
import { errorHandler } from './lib/errorHandling';
import { initializeEnvironment, safeLog, performanceLog } from './lib/environment';
import { usePerformanceOptimization } from './hooks/usePerformanceOptimization';
import { initializeDebugUtils } from './utils/debugFacebookAuth';
// import { clearStaleAuthData } from './utils/clearAuthData';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import LoadingSpinner from './components/ui/LoadingSpinner';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import { StripeProvider } from './contexts/StripeContext';
import SonnerToaster from './components/ui/SonnerToaster';
import LazyWrapper from './components/ui/LazyWrapper';


// Route Protection Components
import ProtectedRoute from './components/auth/ProtectedRoute';
import OwnerRoute from './components/auth/OwnerRoute';
import EmployeeRoute from './components/auth/EmployeeRoute';
import AuthenticatedRoute from './components/auth/AuthenticatedRoute';

import AuthErrorHandler from './components/auth/AuthErrorHandler';

// Core page imports (loaded immediately)
import HomePage from './pages/HomePage';
import ShopSearchPage from './pages/ShopSearchPage';
import ShopDetailsPage from './pages/ShopDetailsPage';
import BookingPage from './pages/BookingPage';
import OAuth2SuccessHandler from './components/auth/OAuth2SuccessHandler';
import OAuth2ErrorHandler from './components/auth/OAuth2ErrorHandler';

// Lazy-loaded page imports (loaded on demand)
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const UserAppointmentsPage = lazy(() => import('./pages/UserAppointmentsPage'));
const OwnerDashboardPage = lazy(() => import('./pages/OwnerDashboardPage'));
const EmployeeDashboardPage = lazy(() => import('./pages/EmployeeDashboardPage'));
const EmployeePerformancePage = lazy(() => import('./pages/EmployeePerformancePage'));
const EmployeeProfilePage = lazy(() => import('./pages/EmployeeProfilePage'));
const EmployeeLeaveRequestPage = lazy(() => import('./pages/EmployeeLeaveRequestPage'));
const OwnerLeaveRequestsPage = lazy(() => import('./pages/OwnerLeaveRequestsPage'));
const AppointmentDetailsPage = lazy(() => import('./pages/AppointmentDetailsPage'));
const ShopCreationPage = lazy(() => import('./pages/ShopCreationPage'));
const ShopSettingsPage = lazy(() => import('./pages/ShopSettingsPage'));
const ShopEmployeesPage = lazy(() => import('./pages/ShopEmployeesPage'));
const ShopServicesPage = lazy(() => import('./pages/ShopServicesPage'));
const ShopAnalyticsPage = lazy(() => import('./pages/ShopAnalyticsPage'));
const ShopScheduleManagementPage = lazy(() => import('./pages/ShopScheduleManagementPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const NewsPage = lazy(() => import('./pages/NewsPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage'));
const CookiePolicyPage = lazy(() => import('./pages/CookiePolicyPage'));
const EmployeeInvitationPage = lazy(() => import('./pages/EmployeeInvitationPage'));
const InvitationWizardPage = lazy(() => import('./pages/InvitationWizardPage'));
const GuestReviewPage = lazy(() => import('./pages/GuestReviewPage'));
const GuestReviewSuccessPage = lazy(() => import('./pages/GuestReviewSuccessPage'));
const UserReviewPage = lazy(() => import('./pages/UserReviewPage'));

// Test components
const I18nTest = lazy(() => import('./components/test/I18nTest'));
const TranslationTestPage = lazy(() => import('./pages/TranslationTestPage'));

// Conditional Footer component that hides footer on dashboard pages
const ConditionalFooter: React.FC = () => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/owner') ||
                     location.pathname.startsWith('/employee') ||
                     (location.pathname.includes('/shop/') &&
                     (location.pathname.includes('/settings') ||
                      location.pathname.includes('/employees') ||
                      location.pathname.includes('/services') ||
                      location.pathname.includes('/analytics') ||
                      location.pathname.includes('/schedule')));

  return isDashboard ? null : <Footer />;
};

// Component to initialize real-time notifications for authenticated users only
function NotificationInitializer() {
  const { isAuthenticated } = useAuth();

  // Always call the hook, but it will only connect for authenticated users
  useRealTimeNotifications();

  return null;
}

// Inner App component that uses React Query hooks
function AppContent() {
  const { isLoading, isAuthenticated, user, checkAuth } = useAuth();
  const { measureRender } = usePerformanceOptimization();

  // Initialize auth activity tracking
  useAuthActivity();

  // Initialize authentication interceptor
  const { isAuthenticating, hasValidToken } = useAuthInterceptor();

  // Initialize authentication state synchronization
  useAuthStateSync();

  useEffect(() => {
    // Initialize environment
    const envInitialized = initializeEnvironment();
    if (!envInitialized) {
      safeLog.error('Failed to initialize environment');
      return;
    }

    // Initialize Facebook debug utilities in development
    if (process.env.NODE_ENV === 'development') {
      initializeDebugUtils();
    }

    // Performance measurement
    performanceLog.mark('app-start');
    const endMeasurement = measureRender('App');

    // Simple auth data cleanup on app start
    const authStorage = localStorage.getItem('auth-ui-storage');
    if (authStorage) {
      try {
        const parsed = JSON.parse(authStorage);
        if (parsed.state?.token && parsed.state?.tokenExpiration) {
          const isExpired = Date.now() > (parsed.state.tokenExpiration - 5 * 60 * 1000);
          if (isExpired) {
            localStorage.removeItem('auth-ui-storage');
          }
        }
      } catch (e) {
        localStorage.removeItem('auth-ui-storage');
      }
    }

    // Initialize performance monitoring
    if (process.env.NODE_ENV === 'production') {
      performanceMonitor.recordMetric({
        name: 'app_initialization',
        value: performance.now(),
        timestamp: Date.now(),
        type: 'custom'
      });
    }

    // Cleanup on unmount
    return () => {
      endMeasurement();
      performanceLog.measure('app-initialization', 'app-start');
      cleanupPerformanceMonitoring();
    };
  }, [measureRender]); // Run only once on mount

  // Only show loading spinner on initial load when we don't have any auth state yet
  const shouldShowLoading = (isLoading || isAuthenticating) && !isAuthenticated && !user;

  if (shouldShowLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="mb-8">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-accent-500 rounded-full animate-spin mx-auto"></div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Lunara</h1>
          <p className="text-gray-600">Loading your beauty experience...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <NotificationInitializer />
        <StripeProvider>
          <Router>
            <AuthErrorHandler />
            <div className="min-h-screen bg-gray-50">
              <Navbar />
              <main>
                <Routes>
                  {/* Public Routes - No Authentication Required */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/search" element={<ShopSearchPage />} />
                  <Route path="/shop/:id" element={<ShopDetailsPage />} />
                  <Route path="/book/:shopId" element={<BookingPage />} />
                  <Route path="/book/:shopId/:serviceId" element={<BookingPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/faq" element={<FAQPage />} />
                  <Route path="/news" element={<NewsPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/privacy" element={<PrivacyPolicyPage />} />
                  <Route path="/terms" element={<TermsOfServicePage />} />
                  <Route path="/cookies" element={<CookiePolicyPage />} />

                  {/* Test Routes - Development Only */}
                  <Route path="/test/i18n" element={
                    <LazyWrapper>
                      <I18nTest />
                    </LazyWrapper>
                  } />
                  <Route path="/test/translations" element={
                    <LazyWrapper>
                      <TranslationTestPage />
                    </LazyWrapper>
                  } />

                  {/* Employee Invitation - Public Route */}
                  <Route path="/employee-invitation/accept/:token" element={<EmployeeInvitationPage />} />
                  <Route path="/invitation/:token" element={
                    <LazyWrapper>
                      <InvitationWizardPage />
                    </LazyWrapper>
                  } />

                  {/* Guest Review Routes - Public */}
                  <Route path="/guest-review/:appointmentId" element={
                    <LazyWrapper>
                      <GuestReviewPage />
                    </LazyWrapper>
                  } />
                  <Route path="/guest-review-success" element={
                    <LazyWrapper>
                      <GuestReviewSuccessPage />
                    </LazyWrapper>
                  } />

                  {/* User Review Routes - Authenticated */}
                  <Route path="/appointments/:appointmentId/review" element={
                    <AuthenticatedRoute>
                      <LazyWrapper>
                        <UserReviewPage />
                      </LazyWrapper>
                    </AuthenticatedRoute>
                  } />

                  {/* OAuth2 Routes */}
                  <Route path="/auth/oauth2/success" element={<OAuth2SuccessHandler />} />
                  <Route path="/auth/oauth2/error" element={<OAuth2ErrorHandler />} />

                  {/* Authenticated User Routes - Any authenticated user */}
                  <Route
                    path="/user/profile"
                    element={
                      <AuthenticatedRoute>
                        <LazyWrapper>
                          <UserProfilePage />
                        </LazyWrapper>
                      </AuthenticatedRoute>
                    }
                  />
                  <Route
                    path="/appointments"
                    element={
                      <AuthenticatedRoute>
                        <LazyWrapper>
                          <UserAppointmentsPage />
                        </LazyWrapper>
                      </AuthenticatedRoute>
                    }
                  />
                  {/* Redirect legacy route to new route */}
                  <Route
                    path="/user/appointments"
                    element={<Navigate to="/appointments" replace />}
                  />
                  <Route
                    path="/appointment/:appointmentId"
                    element={
                      <AuthenticatedRoute>
                        <LazyWrapper>
                          <AppointmentDetailsPage />
                        </LazyWrapper>
                      </AuthenticatedRoute>
                    }
                  />
                  <Route
                    path="/notifications"
                    element={
                      <AuthenticatedRoute>
                        <LazyWrapper>
                          <NotificationsPage />
                        </LazyWrapper>
                      </AuthenticatedRoute>
                    }
                  />

                  {/* Shop Creation - Any authenticated user can create shops */}
                  <Route
                    path="/shop/create"
                    element={
                      <AuthenticatedRoute>
                        <ShopCreationPage />
                      </AuthenticatedRoute>
                    }
                  />

                  {/* Owner Dashboard - Owner Only */}
                  <Route
                    path="/owner/dashboard"
                    element={
                      <OwnerRoute>
                        <OwnerDashboardPage />
                      </OwnerRoute>
                    }
                  />

                  {/* Shop Management Routes - Owner Only */}
                  <Route
                    path="/shop/:shopId/settings"
                    element={
                      <OwnerRoute>
                        <ShopSettingsPage />
                      </OwnerRoute>
                    }
                  />
                  <Route
                    path="/shop/:shopId/employees"
                    element={
                      <OwnerRoute>
                        <ShopEmployeesPage />
                      </OwnerRoute>
                    }
                  />
                  <Route
                    path="/shop/:shopId/analytics"
                    element={
                      <OwnerRoute>
                        <ShopAnalyticsPage />
                      </OwnerRoute>
                    }
                  />
                  <Route
                    path="/shop/:shopId/schedule"
                    element={
                      <OwnerRoute>
                        <ShopScheduleManagementPage />
                      </OwnerRoute>
                    }
                  />

                  {/* Service Management - Owner or Employee */}
                  <Route
                    path="/shop/:shopId/services"
                    element={
                      <ProtectedRoute allowedRoles={['OWNER', 'EMPLOYEE']}>
                        <ShopServicesPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Employee Dashboard - Employee Only */}
                  <Route
                    path="/employee/dashboard"
                    element={
                      <EmployeeRoute>
                        <EmployeeDashboardPage />
                      </EmployeeRoute>
                    }
                  />

                  {/* Employee Performance - Employee Only */}
                  <Route
                    path="/employee/performance"
                    element={
                      <EmployeeRoute>
                        <EmployeePerformancePage />
                      </EmployeeRoute>
                    }
                  />

                  {/* Employee Profile - Employee Only */}
                  <Route
                    path="/employee/profile"
                    element={
                      <EmployeeRoute>
                        <EmployeeProfilePage />
                      </EmployeeRoute>
                    }
                  />

                  {/* Employee Leave Requests - Employee Only */}
                  <Route
                    path="/employee/leave-request"
                    element={
                      <EmployeeRoute>
                        <EmployeeLeaveRequestPage />
                      </EmployeeRoute>
                    }
                  />

                  {/* Owner Leave Requests - Owner Only */}
                  <Route
                    path="/owner/leave-requests"
                    element={
                      <OwnerRoute>
                        <OwnerLeaveRequestsPage />
                      </OwnerRoute>
                    }
                  />

                  {/* Legacy redirect for old notification URLs */}
                  <Route
                    path="/shop/:shopId/leave-requests"
                    element={
                      <OwnerRoute>
                        <OwnerLeaveRequestsPage />
                      </OwnerRoute>
                    }
                  />



                  {/* Catch-all route for 404 - redirect to home */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              <ConditionalFooter />
            </div>
            </Router>
          </StripeProvider>
        </ToastProvider>
      </ErrorBoundary>
  );
}

// Main App component that provides React Query context
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <SonnerToaster />
    </QueryClientProvider>
  );
}

export default App;
