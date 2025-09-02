import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  XCircle,
  Building2,
  DollarSign,
  TrendingUp,
  Settings,
  BarChart3,
  CreditCard,
  FileText,
  Shield,
  Calculator
} from 'lucide-react';
import { apiClient } from '../../lib/api';
import { useToast } from '../ui/Toast';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { StripeConnectAccount, ConnectAccountBalance, ConnectAccountPayout, ConnectAccountTransaction } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import CustomConnectOnboarding from './CustomConnectOnboarding';
import StripeConnectTaxManagement from './StripeConnectTaxManagement';

interface AdvancedConnectManagementProps {
  shopId: string;
  connectAccount?: StripeConnectAccount | null;
  onConnectAccountUpdate?: () => void;
}

interface ConnectRequirement {
  field: string;
  code: string;
  reason: string;
  deadline?: number;
}

const AdvancedConnectManagement: React.FC<AdvancedConnectManagementProps> = ({
  shopId,
  connectAccount,
  onConnectAccountUpdate
}) => {
  const [account, setAccount] = useState<StripeConnectAccount | null>(connectAccount || null);
  const [balance, setBalance] = useState<ConnectAccountBalance | null>(null);
  const [payouts, setPayouts] = useState<ConnectAccountPayout[]>([]);
  const [transactions, setTransactions] = useState<ConnectAccountTransaction[]>([]);
  const [requirements, setRequirements] = useState<ConnectRequirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOpeningDashboard, setIsOpeningDashboard] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'onboarding' | 'balance' | 'payouts' | 'transactions' | 'requirements' | 'tax'>('overview');
  const { success, error } = useToast();

  // Update local account state when prop changes
  useEffect(() => {
    if (connectAccount) {
      setAccount(connectAccount);
      setIsLoading(false);
    }
  }, [connectAccount]);

  useEffect(() => {
    if (account && activeTab === 'balance') {
      loadBalance();
    } else if (account && activeTab === 'payouts') {
      loadPayouts();
    } else if (account && activeTab === 'transactions') {
      loadTransactions();
    } else if (account && activeTab === 'requirements') {
      loadRequirements();
    }
  }, [activeTab, account]);

  const loadAccountDetails = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getStripeConnectAccount(shopId);
      setAccount(response);
      // Don't call parent callback here to avoid infinite loop
      // The parent already has the account data from its own API call
    } catch (err: any) {
      console.error('Error loading Connect account:', err);
      if (err.response?.status !== 404) {
        error('Error', 'Failed to load Connect account details');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadBalance = async () => {
    try {
      const response = await apiClient.getConnectAccountBalance(shopId);
      setBalance(response);
    } catch (err: any) {
      console.error('Error loading balance:', err);
      error('Error', 'Failed to load account balance');
    }
  };

  const loadPayouts = async () => {
    try {
      const response = await apiClient.getConnectAccountPayouts(shopId, { limit: 10 });
      setPayouts(response.data || []);
    } catch (err: any) {
      console.error('Error loading payouts:', err);
      error('Error', 'Failed to load payouts');
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await apiClient.getConnectAccountTransactions(shopId, { limit: 10 });
      setTransactions(response.data || []);
    } catch (err: any) {
      console.error('Error loading transactions:', err);
      error('Error', 'Failed to load transactions');
    }
  };

  const loadRequirements = async () => {
    try {
      const response = await apiClient.getConnectAccountRequirements(shopId);
      const allRequirements = [
        ...(response.currently_due || []).map((field: string) => ({ field, code: 'currently_due', reason: 'Required for account activation' })),
        ...(response.eventually_due || []).map((field: string) => ({ field, code: 'eventually_due', reason: 'Will be required in the future' })),
        ...(response.past_due || []).map((field: string) => ({ field, code: 'past_due', reason: 'Overdue requirement' })),
        ...(response.pending_verification || []).map((field: string) => ({ field, code: 'pending_verification', reason: 'Under review by Stripe' }))
      ];
      setRequirements(allRequirements);
    } catch (err: any) {
      console.error('Error loading requirements:', err);
      error('Error', 'Failed to load account requirements');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);

    // Refresh tab-specific data
    if (activeTab === 'balance') await loadBalance();
    if (activeTab === 'payouts') await loadPayouts();
    if (activeTab === 'transactions') await loadTransactions();
    if (activeTab === 'requirements') await loadRequirements();

    // Call parent callback to refresh account data
    if (onConnectAccountUpdate) {
      onConnectAccountUpdate();
    }

    setIsRefreshing(false);
    success('Refreshed', 'Account data has been updated');
  };

  const handleOpenDashboard = async () => {
    try {
      setIsOpeningDashboard(true);
      const response = await apiClient.createStripeDashboardLink(shopId);
      window.open(response.url, '_blank');
      success('Dashboard Opened', 'Stripe dashboard opened in new tab');
    } catch (err: any) {
      console.error('Error opening dashboard:', err);
      error('Error', 'Failed to open Stripe dashboard');
    } finally {
      setIsOpeningDashboard(false);
    }
  };

  const getAccountStatus = () => {
    if (!account) return { status: 'not_created', color: 'gray', label: 'Not Created' };
    
    if (account.chargesEnabled && account.payoutsEnabled) {
      return { status: 'active', color: 'green', label: 'Active' };
    } else if (account.detailsSubmitted) {
      return { status: 'pending', color: 'yellow', label: 'Under Review' };
    } else {
      return { status: 'incomplete', color: 'red', label: 'Setup Required' };
    }
  };

  const getRequirementLabel = (field: string) => {
    const labels: { [key: string]: string } = {
      'business_profile.url': 'Business Website',
      'business_profile.mcc': 'Business Category',
      'business_type': 'Business Type',
      'company.name': 'Company Name',
      'company.tax_id': 'Tax ID',
      'company.address.line1': 'Company Address',
      'company.address.city': 'Company City',
      'company.address.postal_code': 'Company Postal Code',
      'company.address.state': 'Company State',
      'individual.first_name': 'First Name',
      'individual.last_name': 'Last Name',
      'individual.email': 'Email Address',
      'individual.phone': 'Phone Number',
      'individual.dob.day': 'Date of Birth',
      'individual.address.line1': 'Address',
      'individual.address.city': 'City',
      'individual.address.postal_code': 'Postal Code',
      'individual.address.state': 'State',
      'individual.id_number': 'ID Number',
      'individual.ssn_last_4': 'SSN Last 4',
      'individual.verification.document': 'Identity Document',
      'individual.verification.additional_document': 'Additional Document',
      'external_account': 'Bank Account',
      'tos_acceptance.date': 'Terms of Service',
      'tos_acceptance.ip': 'Terms Acceptance IP'
    };
    return labels[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const statusInfo = getAccountStatus();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'onboarding' as const, label: 'Setup', icon: <Settings className="w-4 h-4" /> },
    { id: 'balance' as const, label: 'Balance', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'payouts' as const, label: 'Payouts', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'transactions' as const, label: 'Transactions', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'requirements' as const, label: 'Requirements', icon: <FileText className="w-4 h-4" /> },
    { id: 'tax' as const, label: 'Tax Management', icon: <Calculator className="w-4 h-4" /> }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Stripe Connect Management</h2>
          <p className="text-gray-600 mt-1">
            Manage your payment processing and account settings.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            isLoading={isRefreshing}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
          {account && (
            <Button
              variant="primary"
              onClick={handleOpenDashboard}
              disabled={isOpeningDashboard}
              isLoading={isOpeningDashboard}
              icon={<ExternalLink className="w-4 h-4" />}
            >
              Stripe Dashboard
            </Button>
          )}
        </div>
      </div>

      {/* Account Status Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Account Status</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
            statusInfo.color === 'green' ? 'text-green-600 bg-green-50 border-green-200' :
            statusInfo.color === 'yellow' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
            statusInfo.color === 'red' ? 'text-red-600 bg-red-50 border-red-200' :
            'text-gray-600 bg-gray-50 border-gray-200'
          }`}>
            {statusInfo.label}
          </span>
        </div>

        {account && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              {account.chargesEnabled ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">Charges</p>
                <p className="text-sm text-gray-600">{account.chargesEnabled ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {account.payoutsEnabled ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">Payouts</p>
                <p className="text-sm text-gray-600">{account.payoutsEnabled ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {account.detailsSubmitted ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">Details</p>
                <p className="text-sm text-gray-600">{account.detailsSubmitted ? 'Submitted' : 'Incomplete'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-accent-500 text-accent-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white border border-gray-200 rounded-lg">
        {activeTab === 'overview' && (
          <ConnectOverviewTab
            account={account}
            balance={balance}
            onLoadBalance={loadBalance}
          />
        )}

        {activeTab === 'onboarding' && (
          <ConnectOnboardingTab
            account={account}
            shopId={shopId}
            onAccountUpdate={loadAccountDetails}
          />
        )}

        {activeTab === 'balance' && (
          <ConnectBalanceTab
            balance={balance}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'payouts' && (
          <ConnectPayoutsTab
            payouts={payouts}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'transactions' && (
          <ConnectTransactionsTab
            transactions={transactions}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'requirements' && (
          <ConnectRequirementsTab
            requirements={requirements}
            account={account}
            getRequirementLabel={getRequirementLabel}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'tax' && (
          <div className="p-6">
            <StripeConnectTaxManagement
              shopId={shopId}
              connectAccount={account}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Connect Overview Tab Component
interface ConnectOverviewTabProps {
  account: StripeConnectAccount | null;
  balance: ConnectAccountBalance | null;
  onLoadBalance: () => void;
}

const ConnectOverviewTab: React.FC<ConnectOverviewTabProps> = ({
  account,
  balance,
  onLoadBalance
}) => {
  useEffect(() => {
    if (account && !balance) {
      onLoadBalance();
    }
  }, [account, balance, onLoadBalance]);

  if (!account) {
    return (
      <div className="p-6 text-center">
        <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Connect Account</h3>
        <p className="text-gray-600">Set up your Stripe Connect account to start accepting payments.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Account Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Account ID</p>
              <p className="text-sm text-gray-600 font-mono">{account.stripeAccountId}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Currency</p>
              <p className="text-sm text-gray-600 uppercase">{account.defaultCurrency}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Country</p>
              <p className="text-sm text-gray-600 uppercase">{account.country}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Balance Overview */}
      {balance && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Account Balance</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">Available</p>
              <p className="text-2xl font-bold text-gray-900">
                {balance.available?.length > 0
                  ? formatCurrency(balance.available[0].amount / 100, undefined, balance.available[0].currency)
                  : formatCurrency(0, undefined, account.defaultCurrency)
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {balance.pending?.length > 0
                  ? formatCurrency(balance.pending[0].amount / 100, undefined, balance.pending[0].currency)
                  : formatCurrency(0, undefined, account.defaultCurrency)
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Business Profile */}
      {account.businessProfile && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Business Profile</h4>
          <div className="space-y-2">
            {account.businessProfile.name && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Business Name</span>
                <span className="text-sm text-gray-900">{account.businessProfile.name}</span>
              </div>
            )}
            {account.businessProfile.url && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Website</span>
                <a
                  href={account.businessProfile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {account.businessProfile.url}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compliance Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Shield className="w-5 h-5 text-blue-600" />
          <h4 className="text-sm font-medium text-blue-900">Compliance Status</h4>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-blue-700">Stripe Connect Setup</span>
            <span className="text-sm text-blue-900 font-medium">
              {account.chargesEnabled && account.payoutsEnabled ? '✅ Complete' : '⚠️ Pending'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-blue-700">Payment Processing</span>
            <span className="text-sm text-blue-900 font-medium">
              {account.chargesEnabled ? '✅ Enabled' : '❌ Disabled'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-blue-700">Payout Capability</span>
            <span className="text-sm text-blue-900 font-medium">
              {account.payoutsEnabled ? '✅ Enabled' : '❌ Disabled'}
            </span>
          </div>
          <div className="text-xs text-blue-600 mt-3 p-2 bg-blue-100 rounded">
            <p className="font-medium mb-1">Compliance Requirements:</p>
            <p>• Legal compliance with local laws declared during setup</p>
            <p>• KYC/KYB verification completed through Stripe</p>
            <p>• VAT registration status provided if applicable</p>
            <p>• Terms of Service acceptance recorded</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Connect Onboarding Tab Component
interface ConnectOnboardingTabProps {
  account: StripeConnectAccount | null;
  shopId: string;
  onAccountUpdate: () => void;
}

const ConnectOnboardingTab: React.FC<ConnectOnboardingTabProps> = ({
  account,
  shopId,
  onAccountUpdate
}) => {
  return (
    <div className="p-6">
      {!account ? (
        <CustomConnectOnboarding
          shopId={shopId}
          onOnboardingComplete={onAccountUpdate}
        />
      ) : (
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">Account Setup Complete</h3>
          <p className="text-gray-600 mb-6">
            Your Stripe Connect account has been successfully configured.
          </p>
          <Button
            variant="outline"
            onClick={onAccountUpdate}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh Account Status
          </Button>
        </div>
      )}
    </div>
  );
};

// Connect Balance Tab Component
interface ConnectBalanceTabProps {
  balance: ConnectAccountBalance | null;
  isLoading: boolean;
}

const ConnectBalanceTab: React.FC<ConnectBalanceTabProps> = ({
  balance,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!balance) {
    return (
      <div className="p-6 text-center">
        <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Balance Data</h3>
        <p className="text-gray-600">Balance information is not available.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Account Balance</h3>

      {/* Available Balance */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h4 className="text-sm font-medium text-green-900 mb-4">Available Balance</h4>
        {balance.available && balance.available.length > 0 ? (
          <div className="space-y-3">
            {balance.available.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-green-700 uppercase">{item.currency}</span>
                <span className="text-lg font-bold text-green-900">
                  {formatCurrency(item.amount / 100, undefined, item.currency)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-green-700">No available balance</p>
        )}
      </div>

      {/* Pending Balance */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h4 className="text-sm font-medium text-yellow-900 mb-4">Pending Balance</h4>
        {balance.pending && balance.pending.length > 0 ? (
          <div className="space-y-3">
            {balance.pending.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-yellow-700 uppercase">{item.currency}</span>
                <span className="text-lg font-bold text-yellow-900">
                  {formatCurrency(item.amount / 100, undefined, item.currency)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-yellow-700">No pending balance</p>
        )}
      </div>
    </div>
  );
};

// Connect Payouts Tab Component
interface ConnectPayoutsTabProps {
  payouts: ConnectAccountPayout[];
  isLoading: boolean;
}

const ConnectPayoutsTab: React.FC<ConnectPayoutsTabProps> = ({
  payouts,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const getPayoutStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'in_transit':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'canceled':
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Recent Payouts</h3>

      {payouts.length === 0 ? (
        <div className="text-center py-8">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Payouts</h4>
          <p className="text-gray-600">Your payout history will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payouts.map((payout) => (
            <div
              key={payout.id}
              className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(payout.amount / 100, undefined, payout.currency)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatDate(new Date(payout.created * 1000))}
                  </p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPayoutStatusColor(payout.status)} mt-1`}>
                    {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm text-gray-600">
                  {payout.arrival_date ? `Arrives ${formatDate(new Date(payout.arrival_date * 1000))}` : 'Processing'}
                </p>
                {payout.method && (
                  <p className="text-sm text-gray-500 capitalize">{payout.method}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Connect Transactions Tab Component
interface ConnectTransactionsTabProps {
  transactions: ConnectAccountTransaction[];
  isLoading: boolean;
}

const ConnectTransactionsTab: React.FC<ConnectTransactionsTabProps> = ({
  transactions,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>

      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Transactions</h4>
          <p className="text-gray-600">Your transaction history will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(transaction.amount / 100, undefined, transaction.currency)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatDate(new Date(transaction.created * 1000))}
                  </p>
                  <p className="text-sm text-gray-500 capitalize">{transaction.type}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm text-gray-600">{transaction.description || 'Payment'}</p>
                {transaction.fee && (
                  <p className="text-sm text-gray-500">
                    Fee: {formatCurrency(transaction.fee / 100, undefined, transaction.currency)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Connect Requirements Tab Component
interface ConnectRequirementsTabProps {
  requirements: ConnectRequirement[];
  account: StripeConnectAccount | null;
  getRequirementLabel: (field: string) => string;
  isLoading: boolean;
}

const ConnectRequirementsTab: React.FC<ConnectRequirementsTabProps> = ({
  requirements,
  account,
  getRequirementLabel,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const getRequirementColor = (code: string) => {
    switch (code) {
      case 'currently_due':
      case 'past_due':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'eventually_due':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'pending_verification':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Account Requirements</h3>

      {requirements.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">All Requirements Met</h4>
          <p className="text-gray-600">Your account meets all current Stripe requirements.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requirements.map((requirement, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {getRequirementLabel(requirement.field)}
                  </p>
                  <p className="text-sm text-gray-600">{requirement.reason}</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRequirementColor(requirement.code)} mt-1`}>
                    {requirement.code.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
              </div>

              {requirement.deadline && (
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    Due: {formatDate(new Date(requirement.deadline * 1000))}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdvancedConnectManagement;
