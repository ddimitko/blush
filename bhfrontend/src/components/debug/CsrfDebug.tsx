import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, AlertCircle, CheckCircle, Clock, Eye, EyeOff } from 'lucide-react';
import Button from '../ui/Button';
import { useCsrf } from '../../hooks/useCsrf';

interface CsrfDebugInfo {
  tokenPresent: boolean;
  tokenValue: string | null;
  tokenLength: number;
  cookieCount: number;
  lastRefreshed: string | null;
  protectionWorking: boolean | null;
}

/**
 * CSRF Debug Component - for troubleshooting CSRF token issues
 * This component should only be used during development/debugging
 */
const CsrfDebug: React.FC = () => {
  const {
    token,
    isLoading,
    error,
    lastFetched,
    isTokenAvailable,
    needsRefresh,
    refreshToken,
    ensureToken,
    getCsrfHeaders,
    validateCsrfProtection
  } = useCsrf();

  const [debugInfo, setDebugInfo] = useState<CsrfDebugInfo | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showTokenValue, setShowTokenValue] = useState(false);

  const checkCsrfStatus = async () => {
    try {
      const tokenValue = token;
      const allCookies = document.cookie.split(';');
      const csrfCookies = allCookies.filter(cookie => 
        cookie.trim().startsWith('XSRF-TOKEN') || 
        cookie.trim().startsWith('CSRF-TOKEN')
      );

      const info: CsrfDebugInfo = {
        tokenPresent: isTokenAvailable(),
        tokenValue: tokenValue,
        tokenLength: tokenValue?.length || 0,
        cookieCount: csrfCookies.length,
        lastRefreshed: lastFetched ? new Date(lastFetched).toLocaleString() : null,
        protectionWorking: null
      };

      setDebugInfo(info);
    } catch (error: any) {
      console.error('Error checking CSRF status:', error);
    }
  };

  const testCsrfProtection = async () => {
    setIsValidating(true);
    try {
      const isWorking = await validateCsrfProtection();
      setDebugInfo(prev => prev ? { ...prev, protectionWorking: isWorking } : null);
    } catch (error) {
      console.error('Error validating CSRF protection:', error);
      setDebugInfo(prev => prev ? { ...prev, protectionWorking: false } : null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleRefreshToken = async () => {
    await refreshToken();
    setTimeout(checkCsrfStatus, 500);
  };

  const handleEnsureToken = async () => {
    await ensureToken();
    setTimeout(checkCsrfStatus, 500);
  };

  useEffect(() => {
    checkCsrfStatus();
  }, [token, lastFetched]);

  const getStatusIcon = (status: boolean | null) => {
    if (status === null) return <Clock className="w-4 h-4 text-gray-600" />;
    return status ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <AlertCircle className="w-4 h-4 text-red-600" />
    );
  };

  const getStatusColor = (status: boolean | null) => {
    if (status === null) return 'text-gray-600';
    return status ? 'text-green-600' : 'text-red-600';
  };

  if (!debugInfo) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg">
        <div className="flex items-center">
          <Clock className="w-4 h-4 text-gray-600 mr-2" />
          <span className="text-sm text-gray-600">Checking CSRF status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-100 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Shield className="w-4 h-4 text-blue-600 mr-2" />
          <h3 className="text-sm font-medium text-gray-900">CSRF Debug Info</h3>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={checkCsrfStatus}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshToken}
            disabled={isLoading}
          >
            Refresh Token
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEnsureToken}
            disabled={isLoading}
          >
            Ensure Token
          </Button>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Token Present:</span>
          <div className="flex items-center">
            {getStatusIcon(debugInfo.tokenPresent)}
            <span className={`ml-1 ${getStatusColor(debugInfo.tokenPresent)}`}>
              {debugInfo.tokenPresent ? 'Yes' : 'No'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Token Length:</span>
          <span className={`${debugInfo.tokenLength > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {debugInfo.tokenLength} chars
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">CSRF Cookies:</span>
          <span className={`${debugInfo.cookieCount > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {debugInfo.cookieCount}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Needs Refresh:</span>
          <span className={`${needsRefresh() ? 'text-yellow-600' : 'text-green-600'}`}>
            {needsRefresh() ? 'Yes' : 'No'}
          </span>
        </div>

        {debugInfo.lastRefreshed && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Last Refreshed:</span>
            <span className="text-xs text-gray-500">{debugInfo.lastRefreshed}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Protection Status:</span>
          <div className="flex items-center">
            {getStatusIcon(debugInfo.protectionWorking)}
            <span className={`ml-1 ${getStatusColor(debugInfo.protectionWorking)}`}>
              {debugInfo.protectionWorking === null ? 'Unknown' : 
               debugInfo.protectionWorking ? 'Working' : 'Not Working'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={testCsrfProtection}
              disabled={isValidating}
              className="ml-2"
            >
              {isValidating ? 'Testing...' : 'Test'}
            </Button>
          </div>
        </div>

        {debugInfo.tokenValue && (
          <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-700">Token Value:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTokenValue(!showTokenValue)}
              >
                {showTokenValue ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
            </div>
            <div className="font-mono text-xs text-gray-600 break-all">
              {showTokenValue ? debugInfo.tokenValue : '•'.repeat(Math.min(debugInfo.tokenLength, 50))}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
            <div className="flex items-start">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-red-800">Error:</p>
                <p className="text-xs text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
          <p className="text-xs font-medium text-blue-800 mb-1">CSRF Headers:</p>
          <div className="font-mono text-xs text-blue-700">
            {JSON.stringify(getCsrfHeaders(), null, 2)}
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          This debug panel should only be visible during development.
        </p>
      </div>
    </div>
  );
};

export default CsrfDebug;
