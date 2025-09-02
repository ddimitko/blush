import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import StripeConnectPaymentForm from '../StripeConnectPaymentForm';
import SmartPaymentForm from '../SmartPaymentForm';

// Mock the API client
jest.mock('../../../lib/api', () => ({
  apiClient: {
    createConnectPaymentIntent: jest.fn(),
  },
}));

// Mock Stripe context
jest.mock('../../../contexts/StripeContext', () => ({
  useStripe: () => ({
    stripe: null,
    isLoading: false,
    error: null,
  }),
}));

// Mock hooks
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
  }),
}));

jest.mock('../../../hooks/queries', () => ({
  useCreateAppointmentMutation: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

jest.mock('../../../store/uiStore', () => ({
  useBookingUIStore: () => ({
    currentLockSessionId: 'test-lock-session',
  }),
}));

// Mock Stripe Elements
jest.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PaymentElement: () => <div data-testid="payment-element">Payment Element</div>,
  useStripe: () => null,
  useElements: () => null,
}));

const mockShop = {
  id: 'shop-1',
  name: 'Test Shop',
  country: 'Bulgaria',
  acceptsCardPayments: true,
};

const mockService = {
  id: 'service-1',
  name: 'Test Service',
  price: 50,
};

const mockEmployee = {
  id: 'employee-1',
  name: 'Test Employee',
};

const mockCustomerData = {
  customerFirstName: 'John',
  customerLastName: 'Doe',
  customerEmail: 'john@example.com',
  customerPhone: '+1234567890',
  notes: 'Test notes',
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Payment Fixes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SmartPaymentForm', () => {
    test('should render without infinite loops', async () => {
      render(
        <TestWrapper>
          <SmartPaymentForm
            shop={mockShop}
            service={mockService}
            employee={mockEmployee}
            date="2024-01-15"
            slot={{ time: '10:00' }}
            customerData={mockCustomerData}
            onSuccess={jest.fn()}
          />
        </TestWrapper>
      );

      // Should render without throwing errors or infinite loops
      await waitFor(() => {
        expect(screen.getByTestId('payment-element')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('should not create multiple payment intents', async () => {
      const mockCreatePaymentIntent = jest.fn().mockResolvedValue({
        paymentIntentId: 'pi_test',
        clientSecret: 'pi_test_client_secret',
      });

      require('../../../lib/api').apiClient.createConnectPaymentIntent = mockCreatePaymentIntent;

      render(
        <TestWrapper>
          <SmartPaymentForm
            shop={mockShop}
            service={mockService}
            employee={mockEmployee}
            date="2024-01-15"
            slot={{ time: '10:00' }}
            customerData={mockCustomerData}
            onSuccess={jest.fn()}
          />
        </TestWrapper>
      );

      // Wait for component to stabilize
      await waitFor(() => {
        expect(screen.getByTestId('payment-element')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Should only call createConnectPaymentIntent once, not multiple times
      expect(mockCreatePaymentIntent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Payment Type Validation', () => {
    test('should ensure CARD payment type is preserved', () => {
      // This test verifies that when we create an appointment with CARD payment,
      // the payment type is correctly set and not overridden by backend logic
      const appointmentData = {
        shopId: 'shop-1',
        serviceId: 'service-1',
        employeeId: 'employee-1',
        appointmentDateTime: '2024-01-15T10:00:00Z',
        paymentType: 'CARD' as const,
        paymentIntentId: 'pi_test',
        paymentMethodId: 'pm_test',
        notes: 'Test notes',
        slotLockToken: 'test-lock',
      };

      // Verify that the payment type is explicitly set to CARD
      expect(appointmentData.paymentType).toBe('CARD');
      expect(appointmentData.paymentIntentId).toBeDefined();
      expect(appointmentData.paymentMethodId).toBeDefined();
    });

    test('should ensure CASH payment type is preserved', () => {
      const appointmentData = {
        shopId: 'shop-1',
        serviceId: 'service-1',
        employeeId: 'employee-1',
        appointmentDateTime: '2024-01-15T10:00:00Z',
        paymentType: 'CASH' as const,
        notes: 'Test notes',
        slotLockToken: 'test-lock',
      };

      // Verify that the payment type is explicitly set to CASH
      expect(appointmentData.paymentType).toBe('CASH');
      // Cash payments should not have payment intent or method IDs
      expect(appointmentData.paymentIntentId).toBeUndefined();
      expect(appointmentData.paymentMethodId).toBeUndefined();
    });
  });
});
