// Type declarations for react-helmet-async
declare module 'react-helmet-async' {
  import { Component, ReactNode } from 'react';

  export interface HelmetProps {
    children?: ReactNode;
  }

  export interface HelmetProviderProps {
    children: ReactNode;
  }

  export class Helmet extends Component<HelmetProps> {}
  export class HelmetProvider extends Component<HelmetProviderProps> {}
}
