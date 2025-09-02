import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Clock,
  User,
  DollarSign,
  CheckCircle,
  TrendingUp,
  Settings,
  Play
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUserQuery, useEmployeeByUserIdQuery, useEmployeeAppointmentsQuery, useEmployeePerformanceMetricsQuery, useOnboardingStatusQuery } from '../hooks/queries';
import { useToast } from '../components/ui/Toast';
import AppointmentCalendar from '../components/dashboard/AppointmentCalendar';
import DailyAppointments from '../components/dashboard/DailyAppointments';
import InteractiveTutorialSystem from '../components/tutorial/InteractiveTutorialSystem';
import { employeeTutorialSteps } from '../components/tutorial/tutorialSteps';
import { SkeletonCard } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { Appointment, Employee } from '../types';
import { formatCurrency, formatTime } from '../lib/utils';

const EmployeeDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [highlightedAppointmentId, setHighlightedAppointmentId] = useState<string | null>(null);

  // React Query hooks for employee data
  const { data: userData, isLoading: isLoadingProfile } = useUserQuery();
  const { data: employeeData, isLoading: isLoadingEmployee, error: employeeError } = useEmployeeByUserIdQuery(user?.id);
  const { data: employeeAppointments = [], isLoading: isLoadingAppointments } = useEmployeeAppointmentsQuery(employeeData?.id);
  const { data: performanceMetrics, isLoading: isLoadingPerformance } = useEmployeePerformanceMetricsQuery(employeeData?.id);

  // Onboarding status query
  const { data: onboardingStatus } = useOnboardingStatusQuery();

  const employee = employeeData;
  // Handle both array and paginated response formats
  const appointments = Array.isArray(employeeAppointments) ? employeeAppointments : employeeAppointments?.content || [];
  const isLoadingData = isLoadingProfile || isLoadingEmployee || isLoadingAppointments;

  // Handle React Query errors - only show error if there's an actual error from the query
  useEffect(() => {
    if (employeeError && !isLoadingEmployee && user?.id) {
      error('Failed to load employee data', 'Please try again later.');
    }
  }, [employeeError, isLoadingEmployee, user?.id, error]);

  // Auto-trigger tutorial for new employees
  useEffect(() => {
    if (user?.role === 'EMPLOYEE' && onboardingStatus && !onboardingStatus.onboardingCompleted && employee) {
      // Small delay to ensure page is fully loaded
      const timer = setTimeout(() => {
        setIsTutorialOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user?.role, onboardingStatus, employee]);

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

  // Calculate employee stats - use performance metrics if available, fallback to appointment calculations
  const stats = useMemo(() => {
    if (performanceMetrics?.metrics) {
      // Use real performance data from backend
      const metrics = performanceMetrics.metrics;
      return {
        todayAppointments: appointments.filter(apt =>
          new Date(apt.appointmentDateTime).toDateString() === new Date().toDateString()
        ).length,
        weeklyAppointments: metrics.totalAppointments || 0,
        completedAppointments: metrics.completedAppointments || 0,
        weeklyEarnings: metrics.totalRevenue || 0
      };
    }

    // Fallback to appointment calculations
    const today = new Date();
    const thisWeek = appointments.filter(apt => {
      const aptDate = new Date(apt.appointmentDateTime);
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      return aptDate >= weekStart && aptDate <= weekEnd;
    });

    const todayAppointments = appointments.filter(apt =>
      new Date(apt.appointmentDateTime).toDateString() === today.toDateString()
    );

    const completedAppointments = thisWeek.filter(apt =>
      apt.status.toLowerCase() === 'completed'
    );

    const earnings = completedAppointments.reduce((sum, apt) => sum + apt.totalAmount, 0);

    return {
      todayAppointments: todayAppointments.length,
      weeklyAppointments: thisWeek.length,
      completedAppointments: completedAppointments.length,
      weeklyEarnings: earnings
    };
  }, [appointments, performanceMetrics]);

  // Get today's upcoming appointments
  const todayUpcoming = useMemo(() => {
    const today = new Date();
    const now = new Date();

    return appointments
      .filter(apt => {
        const aptDate = new Date(apt.appointmentDateTime);
        return aptDate.toDateString() === today.toDateString() &&
               aptDate > now &&
               apt.status.toLowerCase() !== 'cancelled';
      })
      .sort((a, b) => new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime())
      .slice(0, 3);
  }, [appointments]);

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <SkeletonCard className="h-24" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonCard key={index} className="h-24" />
            ))}
          </div>
          <SkeletonCard className="h-96" />
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <EmptyState
          variant="general"
          title="Employee profile not found"
          description="Unable to load your employee profile. Please contact your shop owner."
          action={{
            label: 'Go to Home',
            onClick: () => navigate('/'),
            variant: 'primary'
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-accent-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-accent-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {`${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || employee?.email || 'Employee'}
                </h1>
                <p className="text-sm text-gray-600">
                  Employee Dashboard
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                icon={<Play className="w-4 h-4" />}
                onClick={() => setIsTutorialOpen(true)}
              >
                Tutorial
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<Settings className="w-4 h-4" />}
                onClick={() => navigate('/employee/settings')}
              >
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="performance-stats grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todayAppointments}</p>
                <p className="text-xs text-gray-500 mt-1">Appointments</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">{stats.weeklyAppointments}</p>
                <p className="text-xs text-gray-500 mt-1">Total Appointments</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedAppointments}</p>
                <p className="text-xs text-gray-500 mt-1">This Month</p>
              </div>
              <div className="w-12 h-12 bg-accent-50 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-accent-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Earnings</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.weeklyEarnings, employee?.shop?.country || 'US')}</p>
                <p className="text-xs text-gray-500 mt-1">This Month</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="appointment-calendar lg:col-span-2">
            {isLoadingData ? (
              <SkeletonCard className="h-96" />
            ) : (
              <AppointmentCalendar
                appointments={appointments}
                employees={[]} // Empty for now since we don't have proper employee data
                onDateSelect={handleDateSelect}
                selectedDate={selectedDate}
                shopId={employee?.shop?.id}
                hideEmployeeFilter={true} // Hide employee filter for employee dashboard
                currentEmployeeId={employee?.id} // Only show this employee's absences
              />
            )}
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Daily Appointments or Today's Schedule */}
            {selectedDate ? (
              <DailyAppointments
                date={selectedDate}
                appointments={dailyAppointments}
                onClose={handleCloseDailyView}
                shopCountry={employee?.shop?.country}
                highlightedAppointmentId={highlightedAppointmentId}
                onAppointmentClick={(appointment) => {
                  navigate(`/appointment/${appointment.id}`);
                }}
              />
            ) : (
              <div className="daily-appointments bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Schedule</h3>

                {todayUpcoming.length === 0 ? (
                  <div className="text-center py-6">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">No upcoming appointments today</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayUpcoming.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {formatTime(appointment.appointmentDateTime)}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            appointment.status.toLowerCase() === 'confirmed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {appointment.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 font-medium">
                          {appointment.service.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {appointment.customerName}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center">
                    Click on a calendar date to view all appointments for that day
                  </p>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="quick-actions bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  fullWidth
                  icon={<TrendingUp className="w-4 h-4" />}
                  onClick={() => navigate('/employee/performance')}
                >
                  View Performance
                </Button>

                <Button
                  variant="outline"
                  fullWidth
                  icon={<User className="w-4 h-4" />}
                  onClick={() => navigate('/employee/profile')}
                >
                  Edit Profile
                </Button>

                <Button
                  variant="outline"
                  fullWidth
                  icon={<Calendar className="w-4 h-4" />}
                  onClick={() => navigate('/employee/leave-request')}
                >
                  Request Leave
                </Button>
              </div>
            </div>
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
          userRole="EMPLOYEE"
          tutorialSteps={employeeTutorialSteps}
        />
      )}
    </div>
  );
};

export default EmployeeDashboardPage;
