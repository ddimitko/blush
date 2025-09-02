import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Banknote,
  Calendar,
  Users,
  BarChart3,
  PieChart
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { SkeletonCard } from '../ui/Skeleton';
import Button from '../ui/Button';

interface RevenueAnalyticsProps {
  shopId: string;
  shopCountry?: string;
}

interface RevenueData {
  totalRevenue: number;
  cardPayments: number;
  cashPayments: number;
  stripeBalance: number;
  monthlyRevenue: number[];
  monthlyLabels: string[];
  topServices: Array<{
    serviceName: string;
    revenue: number;
    bookings: number;
  }>;
  revenueGrowth: number;
  averageOrderValue: number;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
}

const RevenueAnalytics: React.FC<RevenueAnalyticsProps> = ({
  shopId,
  shopCountry = 'US'
}) => {
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadRevenueData();
  }, [selectedPeriod, shopId]);

  const loadRevenueData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/analytics/shop/${shopId}/revenue?period=${selectedPeriod}`);
      if (response.ok) {
        const data = await response.json();
        // Transform API response to match component interface
        setRevenueData({
          totalRevenue: parseFloat(data.totalRevenue?.replace('$', '') || '0'),
          cardPayments: parseFloat(data.cardPayments?.replace('$', '') || '0'),
          cashPayments: parseFloat(data.cashPayments?.replace('$', '') || '0'),
          stripeBalance: parseFloat(data.stripeBalance?.replace('$', '') || '0'),
          monthlyRevenue: data.monthlyRevenue || [],
          monthlyLabels: data.monthlyLabels || [],
          topServices: data.topServices || [],
          revenueGrowth: data.revenueGrowth || 0,
          averageOrderValue: parseFloat(data.averageBookingValue?.replace('$', '') || '0'),
          totalBookings: data.totalBookings || 0,
          completedBookings: data.completedBookings || 0,
          cancelledBookings: data.cancelledBookings || 0
        });
      } else {
        console.log('Revenue analytics API returned error, using empty data');
        setRevenueData({
          totalRevenue: 0,
          cardPayments: 0,
          cashPayments: 0,
          stripeBalance: 0,
          monthlyRevenue: [],
          monthlyLabels: [],
          topServices: [],
          revenueGrowth: 0,
          averageOrderValue: 0,
          totalBookings: 0,
          completedBookings: 0,
          cancelledBookings: 0
        });
      }
    } catch (error) {
      console.error('Failed to load revenue analytics:', error);
      setRevenueData({
        totalRevenue: 0,
        cardPayments: 0,
        cashPayments: 0,
        stripeBalance: 0,
        monthlyRevenue: [],
        monthlyLabels: [],
        topServices: [],
        revenueGrowth: 0,
        averageOrderValue: 0,
        totalBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard className="h-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} className="h-24" />
          ))}
        </div>
        <SkeletonCard className="h-64" />
      </div>
    );
  }

  if (!revenueData) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No revenue data available</p>
      </div>
    );
  }

  const cardPaymentPercentage = (revenueData.cardPayments / revenueData.totalRevenue) * 100;
  const cashPaymentPercentage = (revenueData.cashPayments / revenueData.totalRevenue) * 100;
  const completionRate = (revenueData.completedBookings / revenueData.totalBookings) * 100;

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Revenue Analytics</h2>
        <div className="flex space-x-2">
          {[
            { value: 'current-month', label: 'This Month' },
            { value: 'last-month', label: 'Last Month' },
            { value: 'current-quarter', label: 'This Quarter' },
            { value: 'current-year', label: 'This Year' }
          ].map(period => (
            <Button
              key={period.value}
              variant={selectedPeriod === period.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod(period.value)}
            >
              {period.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(revenueData.totalRevenue, shopCountry)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {revenueData.revenueGrowth >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
            )}
            <span className={`text-sm font-medium ${
              revenueData.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {Math.abs(revenueData.revenueGrowth)}% vs last period
            </span>
          </div>
        </div>

        {/* Card Payments */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Card Payments</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(revenueData.cardPayments, shopCountry)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{cardPaymentPercentage.toFixed(1)}% of total</span>
              <span className="font-medium text-blue-600">Stripe Balance</span>
            </div>
            <div className="mt-1 text-sm font-medium text-gray-900">
              {formatCurrency(revenueData.stripeBalance, shopCountry)}
            </div>
          </div>
        </div>

        {/* Cash Payments */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cash Payments</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(revenueData.cashPayments, shopCountry)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Banknote className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-600">{cashPaymentPercentage.toFixed(1)}% of total</span>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Order Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(revenueData.averageOrderValue, shopCountry)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-600">
              {revenueData.completedBookings} completed bookings
            </span>
          </div>
        </div>
      </div>

      {/* Payment Methods Comparison */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <CreditCard className="w-4 h-4 text-blue-500 mr-2" />
                <span className="text-sm font-medium text-gray-700">Card Payments</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(revenueData.cardPayments, shopCountry)} ({cardPaymentPercentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full" 
                style={{ width: `${cardPaymentPercentage}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Banknote className="w-4 h-4 text-green-500 mr-2" />
                <span className="text-sm font-medium text-gray-700">Cash Payments</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(revenueData.cashPayments, shopCountry)} ({cashPaymentPercentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full" 
                style={{ width: `${cashPaymentPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Top Services */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Services by Revenue</h3>
        <div className="space-y-3">
          {revenueData.topServices.map((service, index) => (
            <div key={service.serviceName} className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-accent-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-sm font-medium text-accent-700">{index + 1}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{service.serviceName}</p>
                  <p className="text-xs text-gray-500">{service.bookings} bookings</p>
                </div>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(service.revenue, shopCountry)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Booking Statistics */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{revenueData.totalBookings}</p>
            <p className="text-sm text-gray-600">Total Bookings</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{revenueData.completedBookings}</p>
            <p className="text-sm text-gray-600">Completed ({completionRate.toFixed(1)}%)</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{revenueData.cancelledBookings}</p>
            <p className="text-sm text-gray-600">Cancelled ({((revenueData.cancelledBookings / revenueData.totalBookings) * 100).toFixed(1)}%)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueAnalytics;
