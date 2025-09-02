import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  Star
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useOwnerShopsQuery, useShopAnalyticsQuery } from '../hooks/queries';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import AbsenceAnalytics from '../components/analytics/AbsenceAnalytics';

import { formatCurrency } from '../lib/utils';

const ShopAnalyticsPage: React.FC = () => {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();

  // Use React Query for data fetching - only fetch if user has OWNER role
  const {
    data: shops = [],
    isLoading: isLoadingShops,
    error: shopsError,
  } = useOwnerShopsQuery(user?.role === 'OWNER');

  const {
    data: analytics,
    isLoading: isLoadingAnalytics,
    error: analyticsError,
  } = useShopAnalyticsQuery(shopId);

  const [currentShop, setCurrentShop] = useState<any>(null);

  // Find and validate current shop
  useEffect(() => {
    if (!shopId || !user?.id || !shops.length) return;

    console.log('🔍 ANALYTICS: Looking for shop', {
      shopId,
      userId: user.id,
      availableShops: shops.map(s => ({ id: s.id, name: s.name, ownerId: s.owner.id }))
    });

    const shop = shops.find(s => s.id === shopId);
    if (shop) {
      // Verify ownership
      if (shop.owner.id !== user.id) {
        console.log('🚫 ANALYTICS: Access denied - shop belongs to different user', {
          shopOwnerId: shop.owner.id,
          currentUserId: user.id
        });
        error('Access denied', 'You can only view analytics for your own shops');
        navigate('/owner/dashboard');
        return;
      }
      console.log('✅ ANALYTICS: Shop found and validated', shop);
      setCurrentShop(shop);
    } else {
      console.log('❌ ANALYTICS: Shop not found in available shops');
      error('Shop not found', 'The requested shop could not be found');
      navigate('/owner/dashboard');
    }
  }, [shopId, user?.id, shops, error, navigate]);

  // Handle analytics errors
  useEffect(() => {
    if (analyticsError) {
      console.error('Analytics error:', analyticsError);

      // Show user-friendly error message based on error type
      if (analyticsError.response?.status === 403) {
        error('Access Denied', 'You don\'t have permission to view analytics for this shop');
      } else if (analyticsError.response?.status === 401) {
        error('Authentication Required', 'Please sign in to view analytics');
      } else if (analyticsError.response?.status === 400) {
        error('Analytics Error', 'Backend parameter issue detected. Please contact support.');
      } else {
        error('Analytics Error', analyticsError.response?.data?.message || 'Failed to load analytics data');
      }
    }
  }, [analyticsError, error]);

  // Handle shops loading errors
  useEffect(() => {
    if (shopsError) {
      console.error('Shops loading error:', shopsError);
      error('Error', 'Failed to load shop data');
      navigate('/owner/dashboard');
    }
  }, [shopsError, error, navigate]);

  const handleShopSelect = (shop: any) => {
    setCurrentShop(shop);
    navigate(`/shop/${shop.id}/analytics`);
  };

  if (isLoadingShops) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (!currentShop) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Shop Not Found</h3>
            <p className="text-gray-600 mb-4">The requested shop could not be found.</p>
            <Button onClick={() => navigate('/owner/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600">{currentShop.name}</p>
          </div>
        </div>

        {isLoadingAnalytics ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : analytics ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {typeof analytics.totalRevenue === 'number'
                        ? formatCurrency(analytics.totalRevenue, currentShop?.country)
                        : analytics.totalRevenue || formatCurrency(0, currentShop?.country)}
                    </p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                  <span className="text-sm text-green-600 font-medium">
                    +{analytics.revenueGrowth}%
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last month</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Appointments</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalAppointments}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                  <span className="text-sm text-green-600 font-medium">
                    +{analytics.appointmentGrowth}%
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last month</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Customers</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalCustomers}</p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-500">Unique customers</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg. Rating</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {currentShop?.ratingAverage ? currentShop.ratingAverage.toFixed(1) : '0.0'}
                    </p>
                  </div>
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Star className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-500">Out of 5 stars</span>
                </div>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Revenue</h3>
              <div className="h-64 flex items-end justify-between space-x-2">
                {analytics.monthlyRevenue && analytics.monthlyRevenue.length > 0 ? (
                  analytics.monthlyRevenue.map((month: any, index: number) => (
                    <div key={month.month} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-accent-500 rounded-t"
                        style={{
                          height: `${(month.revenue / Math.max(...analytics.monthlyRevenue.map((m: any) => m.revenue))) * 200}px`
                        }}
                      />
                      <p className="text-sm text-gray-600 mt-2">{month.month}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(month.revenue, currentShop?.country)}</p>
                    </div>
                  ))
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-gray-500">No monthly revenue data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Top Services and Employees */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Top Services</h3>
                <div className="space-y-4">
                  {analytics.topServices && analytics.topServices.length > 0 ? (
                    analytics.topServices.map((service: any, index: number) => (
                      <div key={service.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-accent-100 rounded-full flex items-center justify-center">
                            <span className="text-accent-600 font-medium text-sm">{index + 1}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{service.name}</p>
                            <p className="text-xs text-gray-500">{service.bookings} bookings</p>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(service.revenue, currentShop?.country)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No service data available</p>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Top Employees</h3>
                <div className="space-y-4">
                  {analytics.topEmployees && analytics.topEmployees.length > 0 ? (
                    analytics.topEmployees.map((employee: any, index: number) => (
                      <div key={employee.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">{index + 1}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{employee.name}</p>
                            <p className="text-xs text-gray-500">{employee.bookings} appointments</p>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(employee.revenue, currentShop?.country)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No employee data available</p>
                  )}
                </div>
              </div>
            </div>

            {/* Absence Analytics */}
            <AbsenceAnalytics shopId={currentShop.id} />
          </>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
            <p className="text-gray-600 mb-4">
              Analytics data will appear here once you start receiving appointments.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopAnalyticsPage;
