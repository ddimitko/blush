import { FC } from 'react';
import { useToast } from '../ui/Toast';
import LoadingSpinner from '../ui/LoadingSpinner';
import { StripeConnectAccount } from '../../types';
import CountrySpecificConnectSetup from '../stripe/CountrySpecificConnectSetup';
import AdvancedConnectManagement from '../stripe/AdvancedConnectManagement';
import { useStripeConnectQuery } from '../../hooks/queries/useStripeQueries';

interface StripeConnectManagementProps {
  shopId: string;
}

const StripeConnectManagement: FC<StripeConnectManagementProps> = ({ shopId }) => {
  const { success } = useToast();

  // Use React Query for Connect account data
  const {
    data: connectAccount,
    isLoading,
    error: queryError,
    refetch: loadConnectAccount
  } = useStripeConnectQuery(shopId);

  // Handle query errors
  if (queryError && queryError.response?.status !== 404) {
    console.error('Error loading Connect account:', queryError);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show setup if no Connect account exists or onboarding is not completed
  if (!connectAccount || !connectAccount.onboardingCompleted) {
    return <CountrySpecificConnectSetup shopId={shopId} onSetupComplete={() => loadConnectAccount()} />;
  }

  return (
    <AdvancedConnectManagement
      shopId={shopId}
      connectAccount={connectAccount}
      onConnectAccountUpdate={() => loadConnectAccount()}
    />
  );
};

export default StripeConnectManagement;
