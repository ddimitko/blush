declare module '@stripe/connect-js' {
  export interface StripeConnectInstance {
    // Add any methods you need
  }

  export interface ConnectInitializeOptions {
    publishableKey: string;
    fetchClientSecret: () => Promise<string>;
    appearance?: {
      overlays?: string;
      variables?: {
        colorPrimary?: string;
        colorBackground?: string;
        colorText?: string;
        colorDanger?: string;
        fontFamily?: string;
        spacingUnit?: string;
        borderRadius?: string;
      };
    };
  }

  export function loadConnectAndInitialize(
    options: ConnectInitializeOptions
  ): Promise<StripeConnectInstance>;
}

declare module '@stripe/react-connect-js' {
  import { ReactNode } from 'react';

  export interface ConnectComponentsProviderProps {
    connectInstance: any;
    children: ReactNode;
  }

  export interface ConnectAccountOnboardingProps {
    onExit?: () => void;
  }

  export function ConnectComponentsProvider(
    props: ConnectComponentsProviderProps
  ): JSX.Element;

  export function ConnectAccountOnboarding(
    props: ConnectAccountOnboardingProps
  ): JSX.Element;
}
