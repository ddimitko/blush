import React, { useState, useEffect } from 'react';
import {
  Calculator,
  FileText,
  Globe,
  CheckCircle,
  AlertCircle,
  Settings,
  TrendingUp,
  RefreshCw,
  Plus,
  Eye
} from 'lucide-react';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useToast } from '../ui/Toast';
import { apiClient } from '../../lib/api';

interface StripeConnectTaxManagementProps {
  shopId: string;
  connectAccount?: any;
}

interface TaxRegistration {
  id: string;
  country: string;
  status: string;
  activeFrom?: number;
  expiresAt?: number;
}

interface TaxStatus {
  registered: boolean;
  registrations: TaxRegistration[];
  automaticTaxEnabled: boolean;
  defaultTaxCode?: string;
}

const StripeConnectTaxManagement: React.FC<StripeConnectTaxManagementProps> = ({
  shopId,
  connectAccount
}) => {
  const [taxStatus, setTaxStatus] = useState<TaxStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'registration' | 'settings' | 'monitoring'>('overview');
  const [supportedTaxCodes, setSupportedTaxCodes] = useState<any[]>([]);
  const { success, error } = useToast();

  useEffect(() => {
    if (connectAccount) {
      loadTaxStatus();
      loadSupportedTaxCodes();
    }
  }, [shopId, connectAccount]);

  const loadTaxStatus = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get(`/stripe/tax/status/${shopId}`);
      setTaxStatus(response.data);
    } catch (err: any) {
      console.error('Error loading tax status:', err);
      error('Error', 'Failed to load tax status');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSupportedTaxCodes = async () => {
    try {
      const response = await apiClient.get('/stripe/tax/tax-codes');
      setSupportedTaxCodes(response.data.supportedCodes || []);
    } catch (err: any) {
      console.error('Error loading tax codes:', err);
    }
  };

  const handleEnableAutomaticTax = async () => {
    try {
      setIsUpdating(true);
      await apiClient.post(`/stripe/tax/enable-automatic/${shopId}`);
      success('Success', 'Automatic tax calculation enabled');
      await loadTaxStatus();
    } catch (err: any) {
      console.error('Error enabling automatic tax:', err);
      error('Error', err.response?.data?.message || 'Failed to enable automatic tax calculation');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!connectAccount) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-900">Stripe Connect Required</h4>
            <p className="text-sm text-yellow-800 mt-1">
              You need to set up Stripe Connect before configuring tax settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'registration' as const, label: 'Tax Registration', icon: <FileText className="w-4 h-4" /> },
    { id: 'settings' as const, label: 'Tax Settings', icon: <Settings className="w-4 h-4" /> },
    { id: 'monitoring' as const, label: 'Monitoring', icon: <Eye className="w-4 h-4" /> }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Stripe Tax Management</h3>
          <p className="text-sm text-gray-600">
            Configure automatic tax calculation and registration for your shop
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadTaxStatus}
          disabled={isUpdating}
          icon={<RefreshCw className="w-4 h-4" />}
        >
          Refresh
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${taxStatus?.registered ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Globe className={`w-5 h-5 ${taxStatus?.registered ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Tax Registration</p>
              <p className={`text-sm ${taxStatus?.registered ? 'text-green-600' : 'text-gray-500'}`}>
                {taxStatus?.registered ? 'Registered' : 'Not Registered'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${taxStatus?.automaticTaxEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Calculator className={`w-5 h-5 ${taxStatus?.automaticTaxEnabled ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Automatic Tax</p>
              <p className={`text-sm ${taxStatus?.automaticTaxEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                {taxStatus?.automaticTaxEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Tax Code</p>
              <p className="text-sm text-gray-500">
                {taxStatus?.defaultTaxCode || 'Not Set'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {!taxStatus?.automaticTaxEnabled && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <Calculator className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Enable Automatic Tax Calculation</h4>
                <p className="text-sm text-blue-800 mt-1">
                  Automatically calculate and collect taxes on customer payments using Stripe Tax.
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              onClick={handleEnableAutomaticTax}
              disabled={isUpdating}
              isLoading={isUpdating}
              size="sm"
            >
              Enable Now
            </Button>
          </div>
        </div>
      )}

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
          <TaxOverviewTab
            taxStatus={taxStatus}
            supportedTaxCodes={supportedTaxCodes}
            onRefresh={loadTaxStatus}
          />
        )}

        {activeTab === 'registration' && (
          <TaxRegistrationTab
            shopId={shopId}
            taxStatus={taxStatus}
            onUpdate={loadTaxStatus}
          />
        )}

        {activeTab === 'settings' && (
          <TaxSettingsTab
            shopId={shopId}
            taxStatus={taxStatus}
            supportedTaxCodes={supportedTaxCodes}
            onUpdate={loadTaxStatus}
          />
        )}

        {activeTab === 'monitoring' && (
          <TaxMonitoringTab
            shopId={shopId}
            taxStatus={taxStatus}
          />
        )}
      </div>
    </div>
  );
};

// Placeholder components for tabs - these would be implemented separately
const TaxOverviewTab: React.FC<any> = ({ taxStatus, supportedTaxCodes }) => (
  <div className="p-6">
    <h4 className="text-lg font-medium text-gray-900 mb-4">Tax Overview</h4>
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h5 className="text-sm font-medium text-gray-900 mb-2">Registration Status</h5>
          <div className="space-y-2">
            {taxStatus?.registrations?.map((reg: TaxRegistration) => (
              <div key={reg.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{reg.country}</p>
                  <p className="text-xs text-gray-500">Status: {reg.status}</p>
                </div>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
            )) || (
              <p className="text-sm text-gray-500">No tax registrations found</p>
            )}
          </div>
        </div>
        <div>
          <h5 className="text-sm font-medium text-gray-900 mb-2">Supported Tax Codes</h5>
          <div className="space-y-2">
            {supportedTaxCodes.map((code) => (
              <div key={code.code} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">{code.name}</p>
                <p className="text-xs text-gray-500">{code.code}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const TaxRegistrationTab: React.FC<any> = ({ shopId, taxStatus, onUpdate }) => (
  <div className="p-6">
    <h4 className="text-lg font-medium text-gray-900 mb-4">Tax Registration</h4>
    <p className="text-gray-600">Tax registration functionality will be implemented here.</p>
  </div>
);

const TaxSettingsTab: React.FC<any> = ({ shopId, taxStatus, supportedTaxCodes, onUpdate }) => (
  <div className="p-6">
    <h4 className="text-lg font-medium text-gray-900 mb-4">Tax Settings</h4>
    <p className="text-gray-600">Tax settings configuration will be implemented here.</p>
  </div>
);

const TaxMonitoringTab: React.FC<any> = ({ shopId, taxStatus }) => (
  <div className="p-6">
    <h4 className="text-lg font-medium text-gray-900 mb-4">Tax Monitoring</h4>
    <p className="text-gray-600">Tax monitoring and reporting will be implemented here.</p>
  </div>
);

export default StripeConnectTaxManagement;
