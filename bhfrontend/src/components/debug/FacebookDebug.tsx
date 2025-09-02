import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';
import facebookSDK from '../../lib/facebook';

interface DebugInfo {
  appId: string;
  sdkLoaded: boolean;
  sdkInitialized: boolean;
  fbObjectExists: boolean;
  loginStatus: string;
  currentVersion?: string;
  supportedVersions?: string[];
  error?: string;
}

/**
 * Facebook Debug Component - for troubleshooting Facebook login issues
 * This component should only be used during development/debugging
 */
const FacebookDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkFacebookStatus = async () => {
    setIsChecking(true);
    try {
      const appId = process.env.REACT_APP_FACEBOOK_APP_ID || '';
      const debugInfo = facebookSDK.getDebugInfo();

      const info: DebugInfo = {
        appId: appId.substring(0, 6) + '...' + appId.substring(appId.length - 4), // Mask for security
        sdkLoaded: !!document.getElementById('facebook-jssdk'),
        sdkInitialized: facebookSDK.isReady(),
        fbObjectExists: !!window.FB,
        loginStatus: 'unknown',
        currentVersion: debugInfo.currentVersion,
        supportedVersions: debugInfo.supportedVersions
      };

      // Try to get login status if FB is available
      if (window.FB) {
        try {
          const status = await facebookSDK.getLoginStatus();
          info.loginStatus = status.status;
        } catch (error: any) {
          info.error = error.message;
        }
      }

      setDebugInfo(info);
    } catch (error: any) {
      setDebugInfo({
        appId: 'Error',
        sdkLoaded: false,
        sdkInitialized: false,
        fbObjectExists: false,
        loginStatus: 'error',
        error: error.message
      });
    } finally {
      setIsChecking(false);
    }
  };

  const resetFacebookSDK = () => {
    facebookSDK.reset();
    setTimeout(checkFacebookStatus, 1000);
  };

  const testVersion = async (version: string) => {
    setIsChecking(true);
    try {
      await facebookSDK.forceInitWithVersion(version);
      setTimeout(checkFacebookStatus, 1000);
    } catch (error: any) {
      console.error(`Failed to test version ${version}:`, error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkFacebookStatus();
  }, []);

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <AlertCircle className="w-4 h-4 text-red-600" />
    );
  };

  if (!debugInfo) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg">
        <div className="flex items-center">
          <Clock className="w-4 h-4 text-gray-600 mr-2" />
          <span className="text-sm text-gray-600">Checking Facebook status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-100 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Facebook Debug Info</h3>
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={checkFacebookStatus}
            disabled={isChecking}
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetFacebookSDK}
          >
            Reset SDK
          </Button>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">App ID:</span>
          <span className="font-mono text-xs">{debugInfo.appId}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">SDK Script Loaded:</span>
          <div className="flex items-center">
            {getStatusIcon(debugInfo.sdkLoaded)}
            <span className="ml-1">{debugInfo.sdkLoaded ? 'Yes' : 'No'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">FB Object Exists:</span>
          <div className="flex items-center">
            {getStatusIcon(debugInfo.fbObjectExists)}
            <span className="ml-1">{debugInfo.fbObjectExists ? 'Yes' : 'No'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">SDK Initialized:</span>
          <div className="flex items-center">
            {getStatusIcon(debugInfo.sdkInitialized)}
            <span className="ml-1">{debugInfo.sdkInitialized ? 'Yes' : 'No'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Login Status:</span>
          <span className={`px-2 py-1 rounded text-xs ${
            debugInfo.loginStatus === 'connected' ? 'bg-green-100 text-green-800' :
            debugInfo.loginStatus === 'not_authorized' ? 'bg-yellow-100 text-yellow-800' :
            debugInfo.loginStatus === 'unknown' ? 'bg-gray-100 text-gray-800' :
            'bg-red-100 text-red-800'
          }`}>
            {debugInfo.loginStatus}
          </span>
        </div>

        {debugInfo.currentVersion && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Current Version:</span>
            <span className="font-mono text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {debugInfo.currentVersion}
            </span>
          </div>
        )}

        {debugInfo.supportedVersions && (
          <div className="flex items-start justify-between">
            <span className="text-gray-600">Supported Versions:</span>
            <div className="flex flex-wrap gap-1 max-w-32">
              {debugInfo.supportedVersions.map((version, index) => (
                <button
                  key={version}
                  onClick={() => testVersion(version)}
                  disabled={isChecking}
                  className={`font-mono text-xs px-1 py-0.5 rounded cursor-pointer hover:opacity-80 ${
                    version === debugInfo.currentVersion
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={`Test version ${version}`}
                >
                  {version}
                </button>
              ))}
            </div>
          </div>
        )}

        {debugInfo.error && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
            <div className="flex items-start">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-red-800">Error:</p>
                <p className="text-xs text-red-700 mt-1">{debugInfo.error}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          This debug panel should only be visible during development.
        </p>
      </div>
    </div>
  );
};

export default FacebookDebug;
