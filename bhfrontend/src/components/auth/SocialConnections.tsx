import React, { useState } from 'react';
import { Facebook, Chrome, Link, Unlink } from 'lucide-react';
import {
  useUserConnectionsQuery,
  useConnectProviderMutation,
  useDisconnectProviderMutation
} from '../../hooks/queries/useAuthQueries';
import { useToast } from '../ui/Toast';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import facebookSDK from '../../lib/facebook';
import { resolveFacebookConflicts } from '../../utils/facebookConflictResolver';

const SocialConnections: React.FC = () => {
  const { success, error } = useToast();
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);

  // React Query hooks
  const { data: connections = [], isLoading } = useUserConnectionsQuery();
  const connectProviderMutation = useConnectProviderMutation();
  const disconnectProviderMutation = useDisconnectProviderMutation();

  const handleConnectFacebookInternal = async (isRetry = false) => {
    setConnectingProvider('facebook');
    try {
      // If this is a retry, perform a complete reset
      if (isRetry) {
        console.log('🔄 Retrying Facebook connection with complete reset...');
        facebookSDK.reset();
        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Resolve any Facebook authentication conflicts before connection
      console.log('🧹 Resolving Facebook authentication conflicts...');
      await resolveFacebookConflicts();

      // Wait a moment for conflict resolution to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      const { accessToken } = await facebookSDK.login();
      await connectProviderMutation.mutateAsync({ provider: 'facebook', accessToken });
      success('Facebook Connected', 'Your Facebook account has been connected successfully.');
    } catch (err: any) {
      console.error('Facebook connection error:', err);
      let errorMessage = 'Failed to connect Facebook account';
      let showRetryOption = false;

      if (err.message?.includes('cancelled')) {
        errorMessage = 'Facebook connection was cancelled';
      } else if (err.message?.includes('App ID not configured')) {
        errorMessage = 'Facebook authentication is not configured. Please contact support.';
      } else if (err.message?.includes('timeout') || err.message?.includes('timed out')) {
        errorMessage = 'Facebook connection timed out. Please check your internet connection and try again.';
        showRetryOption = true;
      } else if (err.message?.includes('Failed to load')) {
        errorMessage = 'Failed to load Facebook authentication. Please check your internet connection and try again.';
        showRetryOption = true;
      } else if (err.message?.includes('initialization')) {
        errorMessage = 'Facebook authentication failed to initialize. Please try again.';
        showRetryOption = true;
      } else {
        errorMessage = 'Facebook connection failed. Please try again.';
        showRetryOption = true;
      }

      // Show error with retry option if applicable
      if (showRetryOption && !isRetry) {
        error('Connection Failed', errorMessage, {
          action: {
            label: 'Retry',
            onClick: () => handleConnectFacebookInternal(true)
          }
        });
      } else {
        error('Connection Failed', errorMessage);
      }
    } finally {
      setConnectingProvider(null);
    }
  };

  const handleConnectFacebook = () => {
    handleConnectFacebookInternal(false);
  };

  const handleDisconnectProvider = async (provider: string) => {
    try {
      await disconnectProviderMutation.mutateAsync(provider);
      success('Account Disconnected', `Your ${provider} account has been disconnected.`);
    } catch (err: any) {
      error('Disconnection Failed', `Failed to disconnect ${provider} account.`);
    }
  };

  const isConnected = (provider: string) => {
    return connections.some(conn => conn.provider === provider);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'facebook':
        return <Facebook className="w-5 h-5 text-blue-600" />;
      case 'google':
        return <Chrome className="w-5 h-5 text-red-500" />;
      default:
        return <Link className="w-5 h-5 text-gray-500" />;
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'facebook':
        return 'Facebook';
      case 'google':
        return 'Google';
      default:
        return provider.charAt(0).toUpperCase() + provider.slice(1);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Social Connections</h2>
      <p className="text-sm text-gray-600 mb-6">
        Connect your social accounts for easier sign-in and enhanced features.
      </p>

      <div className="space-y-4">
        {/* Facebook */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            {getProviderIcon('facebook')}
            <div>
              <p className="font-medium text-gray-900">Facebook</p>
              <p className="text-sm text-gray-600">
                {isConnected('facebook') ? 'Connected' : 'Not connected'}
              </p>
            </div>
          </div>

          {isConnected('facebook') ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDisconnectProvider('facebook')}
              disabled={isLoading}
            >
              {isLoading ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Unlink className="w-4 h-4 mr-2" />
              )}
              Disconnect
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleConnectFacebook}
              disabled={connectingProvider === 'facebook'}
            >
              {connectingProvider === 'facebook' ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Link className="w-4 h-4 mr-2" />
              )}
              Connect
            </Button>
          )}
        </div>

        {/* Google - Coming Soon */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg opacity-50">
          <div className="flex items-center space-x-3">
            {getProviderIcon('google')}
            <div>
              <p className="font-medium text-gray-900">Google</p>
              <p className="text-sm text-gray-600">Coming soon</p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            disabled
          >
            <Link className="w-4 h-4 mr-2" />
            Connect
          </Button>
        </div>
      </div>

      {connections.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Connected Accounts</h3>
          <div className="space-y-2">
            {connections.map((connection) => (
              <div key={connection.id} className="flex items-center space-x-2 text-sm text-blue-800">
                {getProviderIcon(connection.provider)}
                <span>{getProviderName(connection.provider)}</span>
                <span className="text-blue-600">
                  • Connected on {new Date(connection.connectedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialConnections;
