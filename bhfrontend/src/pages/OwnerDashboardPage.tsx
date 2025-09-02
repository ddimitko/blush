import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Users,
  DollarSign,
  Clock,
  Plus,
  Settings,
  BarChart3,
  Building2,
  AlertCircle,
  CreditCard,
  Play,
  Bell
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  useOwnerShopsQuery,
  useShopAppointmentsQuery,
  useShopEmployeesQuery,
  useShopAnalyticsQuery,
  useOnboardingStatusQuery
} from '../hooks/queries';
import { useShopStripeDetails } from '../hooks/useShopStripeDetails';
import { useShopPaymentCapability } from '../hooks/useShopPaymentCapability';
import { useDashboardUIStore } from '../store/uiStore';
import { useToast } from '../components/ui/Toast';

import AppointmentCalendar from '../components/dashboard/AppointmentCalendar';
import DailyAppointments from '../components/dashboard/DailyAppointments';
import SetupBanners from '../components/dashboard/SetupBanners';
import InteractiveTutorialSystem from '../components/tutorial/InteractiveTutorialSystem';
import { getOwnerTutorialSteps } from '../components/tutorial/tutorialSteps';
import { SkeletonCard } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import Button from '../components/ui/Button';
import { Shop, Appointment, Employee } from '../types';
import { formatCurrency } from '../lib/utils';

const OwnerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { success, error } = useToast();

  // UI state
  const {
    selectedShopId,
    setSelectedShopId,
    clearSelectedShop,
    validateSelectedShop
  } = useDashboardUIStore();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [highlightedAppointmentId, setHighlightedAppointmentId] = useState<string | null>(null);

  // React Query hooks - only fetch if user has OWNER role
  const {
    data: shops = [],
    isLoading: isLoadingShops,
    error: shopsError,
    refetch: refetchShops,
  } = useOwnerShopsQuery(user?.role === 'OWNER');

  const currentShop = shops.find(shop => shop.id === selectedShopId);

  // Get Stripe details for the current shop
  const {
    subscriptionStatus,
    isActive: isSubscriptionActive,
    isLoading: isLoadingStripe
  } = useShopStripeDetails(selectedShopId);

  // Get payment capability details
  const {
    canAcceptPayments,
    hasStripeAccount,
    onboardingCompleted,
    isLoading: isLoadingPayments
  } = useShopPaymentCapability(selectedShopId);

  const {
    data: appointmentsResponse,
    isLoading: isLoadingAppointments,
    error: appointmentsError,
  } = useShopAppointmentsQuery(selectedShopId || undefined);

  // Extract appointments array from paginated response
  const appointments = appointmentsResponse?.content || [];

  const {
    data: employees = [],
    isLoading: isLoadingEmployees,
    error: employeesError,
  } = useShopEmployeesQuery(selectedShopId || undefined, false);

  // Re-enabled analytics with backend -parameters flag fix
  const {
    data: analytics,
    isLoading: isLoadingAnalytics,
    error: analyticsError,
  } = useShopAnalyticsQuery(selectedShopId || undefined);

  // Onboarding status query
  const { data: onboardingStatus } = useOnboardingStatusQuery();

  const isLoadingData = isLoadingAppointments || isLoadingEmployees || isLoadingAnalytics;

  // Validate and auto-select shop
  useEffect(() => {
    if (!user?.id) return;

    // First, validate the currently selected shop belongs to this user
    const isValidSelection = validateSelectedShop(user.id);

    if (!isValidSelection) {
      console.log('🚫 DASHBOARD: Current shop selection is invalid, cleared');
    }

    // Auto-select shop if owner has only one shop and no valid selection
    if (shops.length === 1 && !selectedShopId) {
      console.log('✅ DASHBOARD: Auto-selecting single shop:', shops[0]);
      setSelectedShopId(shops[0].id, user.id);
      // Don't show toast for auto-selection
    }

    // If multiple shops and no valid selection, clear to show selection UI
    if (shops.length > 1 && !selectedShopId) {
      console.log('🏪 DASHBOARD: Multiple shops available, showing selection UI');
    }
  }, [shops, selectedShopId, setSelectedShopId, validateSelectedShop, user?.id]);

  // Auto-trigger tutorial for new owners
  useEffect(() => {
    if (user?.role === 'OWNER' && onboardingStatus && !onboardingStatus.onboardingCompleted && currentShop) {
      // Small delay to ensure page is fully loaded
      const timer = setTimeout(() => {
        setIsTutorialOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user?.role, onboardingStatus, currentShop]);

  // Handle appointment highlighting from notifications
  useEffect(() => {
    const highlightAppointmentId = searchParams.get('highlight');
    if (highlightAppointmentId && appointments.length > 0) {
      // Find the appointment to highlight
      const appointmentToHighlight = appointments.find(apt => apt.id === highlightAppointmentId);
      if (appointmentToHighlight) {
        // Set the date to show the appointment
        const appointmentDate = new Date(appointmentToHighlight.appointmentDateTime);
        setSelectedDate(appointmentDate);
        setHighlightedAppointmentId(highlightAppointmentId);

        // Clear the highlight parameter from URL after processing
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('highlight');
        setSearchParams(newSearchParams, { replace: true });

        // Show success message
        success('Appointment found', `Showing appointment on ${appointmentDate.toLocaleDateString()}`);

        // Clear highlight after a few seconds
        setTimeout(() => {
          setHighlightedAppointmentId(null);
        }, 5000);
      }
    }
  }, [searchParams, appointments, setSearchParams, success]);

  const handleShopSelect = (shop: Shop, showToast: boolean = true) => {
    setSelectedShopId(shop.id, user?.id);
    setSelectedDate(null); // Reset selected date when changing shops
    if (showToast) {
      success('Shop selected', `Now managing ${shop.name}`);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleCloseDailyView = () => {
    setSelectedDate(null);
  };

  // Filter appointments for selected date
  const dailyAppointments = useMemo(() => {
    if (!selectedDate) return [];

    const selectedDateStr = selectedDate.toDateString();
    return appointments.filter(appointment =>
      new Date(appointment.appointmentDateTime).toDateString() === selectedDateStr
    );
  }, [appointments, selectedDate]);

  // Calculate dashboard stats
  const stats = useMemo(() => {
    const today = new Date();
    const thisMonth = appointments.filter(apt => {
      const aptDate = new Date(apt.appointmentDateTime);
      return aptDate.getMonth() === today.getMonth() &&
             aptDate.getFullYear() === today.getFullYear();
    });

    const confirmedAppointments = thisMonth.filter(apt =>
      apt.status.toLowerCase() === 'confirmed'
    );

    const revenue = confirmedAppointments.reduce((sum, apt) => sum + apt.totalAmount, 0);

    return {
      totalAppointments: thisMonth.length,
      confirmedAppointments: confirmedAppointments.length,
      totalRevenue: revenue,
      totalEmployees: employees.length
    };
  }, [appointments, employees]);

  // Show loading state
  if (isLoadingShops) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your shops...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (shopsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <ErrorState
          variant="server"
          error={shopsError}
          onRetry={refetchShops}
        />
      </div>
    );
  }

  // Show shop selection if no shop is selected
  if (!currentShop && shops.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-6">
          <EmptyState
            variant="shops"
            title="Select a shop to manage"
            description="Choose a shop from the selector in the navbar to view appointments and manage your business."
            action={{
              label: 'Create New Shop',
              onClick: () => navigate('/shop/create'),
              variant: 'primary'
            }}
          />
        </div>
      </div>
    );
  }

  // Show create shop if no shops exist
  if (shops.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-6">
          <EmptyState
            variant="shops"
            title="Create your first shop"
            description="Get started by creating your first shop to begin managing appointments and growing your business."
            action={{
              label: 'Create Shop',
              onClick: () => navigate('/shop/create'),
              variant: 'primary'
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {currentShop?.name} Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Manage appointments, employees, and business insights
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="md"
              icon={<Play className="w-4 h-4" />}
              onClick={() => setIsTutorialOpen(true)}
            >
              Tutorial
            </Button>
            <Button
              variant="outline"
              size="md"
              icon={<Settings className="w-4 h-4" />}
              onClick={() => navigate(`/shop/${selectedShopId}/settings`)}
              disabled={!selectedShopId}
              className="settings-btn"
            >
              Settings
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => navigate(`/shop/${selectedShopId}/employees/add`)}
              disabled={!selectedShopId}
            >
              Add Employee
            </Button>
          </div>
        </div>

        {/* Setup Banners */}
        {currentShop && (
          <div className="setup-banners" data-tutorial="setup-banners">
            <SetupBanners
              shopId={currentShop.id}
              shopName={currentShop.name}
              subscriptionStatus={subscriptionStatus}
              isSubscriptionActive={isSubscriptionActive}
              canAcceptPayments={canAcceptPayments}
              hasStripeAccount={hasStripeAccount}
              onboardingCompleted={onboardingCompleted}
              isLoadingSubscription={isLoadingStripe}
              isLoadingPayments={isLoadingPayments}
            />
          </div>
        )}

        {/* Stats Cards */}
        {isLoadingData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonCard key={index} className="h-24" />
            ))}
          </div>
        ) : (
          <div className="stats-overview grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-tutorial="stats-overview">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Month</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalAppointments}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Appointments</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Confirmed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.confirmedAppointments}</p>
                  <p className="text-xs text-gray-500 mt-1">Appointments</p>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue, currentShop?.country)}</p>
                  <p className="text-xs text-gray-500 mt-1">This Month</p>
                </div>
                <div className="w-12 h-12 bg-accent-50 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-accent-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Team</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
                  <p className="text-xs text-gray-500 mt-1">Active Employees</p>
                </div>
                <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="appointment-calendar lg:col-span-2">
            {isLoadingData ? (
              <SkeletonCard className="h-96" />
            ) : (
              <AppointmentCalendar
                appointments={appointments}
                employees={employees}
                onDateSelect={handleDateSelect}
                selectedDate={selectedDate}
                shopId={selectedShopId || undefined}
              />
            )}
          </div>

          {/* Daily Appointments or Quick Actions */}
          <div className="lg:col-span-1">
            {selectedDate ? (
              <DailyAppointments
                date={selectedDate}
                appointments={dailyAppointments}
                onClose={handleCloseDailyView}
                shopCountry={currentShop?.country}
                highlightedAppointmentId={highlightedAppointmentId}
                onAppointmentClick={(appointment) => {
                  // Navigate to appointment details
                  navigate(`/appointment/${appointment.id}`);
                }}
              />
            ) : (
              <div className="quick-actions bg-white rounded-lg border border-gray-200 p-6 space-y-4" data-tutorial="quick-actions">
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>

                <div className="space-y-3">
                  <Button
                    variant="outline"
                    fullWidth
                    icon={<Users className="w-4 h-4" />}
                    onClick={() => {
                      if (!selectedShopId || !currentShop) {
                        error('No shop selected', 'Please select a shop first');
                        return;
                      }
                      navigate(`/shop/${selectedShopId}/employees`);
                    }}
                    disabled={!selectedShopId || !currentShop}
                  >
                    Manage Employees
                  </Button>

                  <Button
                    variant="outline"
                    fullWidth
                    icon={<Calendar className="w-4 h-4" />}
                    onClick={() => {
                      if (!selectedShopId || !currentShop) {
                        error('No shop selected', 'Please select a shop first');
                        return;
                      }
                      navigate(`/shop/${selectedShopId}/services`);
                    }}
                    disabled={!selectedShopId || !currentShop}
                  >
                    Manage Services
                  </Button>

                  <Button
                    variant="outline"
                    fullWidth
                    icon={<BarChart3 className="w-4 h-4" />}
                    onClick={() => {
                      if (!selectedShopId || !currentShop) {
                        error('No shop selected', 'Please select a shop first');
                        return;
                      }

                      // Validate that the selected shop belongs to the current user
                      if (currentShop.owner.id !== user?.id) {
                        error('Access denied', 'You can only view analytics for your own shops');
                        return;
                      }

                      console.log('🔍 DASHBOARD: Navigating to analytics for shop:', {
                        shopId: selectedShopId,
                        shopName: currentShop.name,
                        userId: user?.id
                      });

                      navigate(`/shop/${selectedShopId}/analytics`);
                    }}
                    disabled={!selectedShopId || !currentShop}
                  >
                    View Analytics
                  </Button>

                  <Button
                    variant="outline"
                    fullWidth
                    icon={<Clock className="w-4 h-4" />}
                    onClick={() => {
                      if (!selectedShopId || !currentShop) {
                        error('No shop selected', 'Please select a shop first');
                        return;
                      }
                      navigate(`/shop/${selectedShopId}/schedule`);
                    }}
                    disabled={!selectedShopId || !currentShop}
                  >
                    Manage Schedules
                  </Button>

                  <Button
                    variant="outline"
                    fullWidth
                    icon={<Clock className="w-4 h-4" />}
                    onClick={() => navigate('/owner/leave-requests')}
                    disabled={!selectedShopId}
                  >
                    Leave Requests
                  </Button>

                  <Button
                    variant="outline"
                    fullWidth
                    icon={<Settings className="w-4 h-4" />}
                    onClick={() => navigate(`/shop/${selectedShopId}/settings`)}
                    disabled={!selectedShopId}
                  >
                    Shop Settings
                  </Button>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-3">
                    Click on a calendar date to view appointments for that day.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Tutorial System - Only render when open */}
      {isTutorialOpen && (
        <InteractiveTutorialSystem
          isOpen={isTutorialOpen}
          onClose={() => setIsTutorialOpen(false)}
          onComplete={() => {
            setIsTutorialOpen(false);
            success('Tutorial completed!', 'You can restart the tutorial anytime from the Tutorial button.');
          }}
          userRole="OWNER"
          tutorialSteps={getOwnerTutorialSteps(selectedShopId || undefined)}
        />
      )}
    </div>
  );
};

export default OwnerDashboardPage;
