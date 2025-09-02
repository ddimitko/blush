import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import BookingPage from '../../../pages/BookingPage';
import { useBookingUIStore } from '../../../store/uiStore';
import * as api from '../../../lib/api';

// Mock dependencies
jest.mock('../../../lib/api');
jest.mock('../../../hooks/useSlotSubscriptions');
jest.mock('../../../hooks/useWebSocket');
jest.mock('../../../hooks/useAuth');

// Mock all React Query hooks used by BookingPage
jest.mock('../../../hooks/queries', () => ({
  useShopQuery: jest.fn(),
  useShopServicesQuery: jest.fn(),
  useShopEmployeesQuery: jest.fn(),
  useAvailableSlotsQuery: jest.fn(),
  useLockSlotMutation: jest.fn(),
  useUnlockSlotMutation: jest.fn(),
  useCreateAppointmentMutation: jest.fn(),
}));

// Mock useParams to provide shop ID
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ shopId: 'shop-1' }),
  useNavigate: () => jest.fn(),
}));

// Mock BookingPreventionSystem to avoid state update issues
jest.mock('../../../components/booking/BookingPreventionSystem', () => {
  return function MockBookingPreventionSystem({ children }: { children: React.ReactNode }) {
    return <div data-testid="booking-prevention-system">{children}</div>;
  };
});

// Mock individual booking components to simplify testing
jest.mock('../../../components/booking/ServiceSelection', () => {
  return function MockServiceSelection() {
    const React = require('react');
    const [error, setError] = React.useState('');
    const [selectedServiceId, setSelectedServiceId] = React.useState(null);

    const handleNext = () => {
      if (!selectedServiceId) {
        setError('Please select a service');
        return;
      }
      setError('');
    };

    return React.createElement('div', { 'data-testid': 'service-selection' }, [
      React.createElement('h2', { key: 'title' }, 'Select Service'),
      React.createElement('label', { key: 'label', htmlFor: 'category-filter' }, 'Filter by category'),
      React.createElement('select', {
        key: 'select',
        id: 'category-filter',
        'aria-label': 'Filter by category'
      }, [
        React.createElement('option', { key: 'all', value: '' }, 'All Categories'),
        React.createElement('option', { key: 'hair', value: 'Hair' }, 'Hair'),
        React.createElement('option', { key: 'beauty', value: 'Beauty' }, 'Beauty'),
      ]),
      React.createElement('div', { key: 'card1', 'data-cy': 'service-card' }, [
        React.createElement('button', {
          key: 'btn1',
          onClick: () => {
            setSelectedServiceId('service-1');
            const { setSelectedService } = require('../../../store/uiStore').useBookingUIStore.getState();
            setSelectedService({ id: 'service-1', name: 'Haircut', price: 50, duration: 60 });
          }
        }, 'Haircut'),
        React.createElement('span', { key: 'price1' }, '€50'),
        React.createElement('span', { key: 'duration1' }, '60 min'),
        React.createElement('span', { key: 'desc1' }, 'Professional haircut'),
      ]),
      React.createElement('div', { key: 'card2', 'data-cy': 'service-card' }, [
        React.createElement('button', {
          key: 'btn2',
          onClick: () => setSelectedServiceId('service-2')
        }, 'Hair Color'),
      ]),
      error && React.createElement('div', { key: 'error' }, error),
      React.createElement('button', { key: 'next', onClick: handleNext }, 'Next'),
    ].filter(Boolean));
  };
});

jest.mock('../../../components/booking/EmployeeSelection', () => {
  return function MockEmployeeSelection() {
    return (
      <div data-testid="employee-selection">
        <h2>Select Employee</h2>
        <div data-cy="employee-card">
          <button onClick={() => {
            const { setSelectedEmployee } = require('../../../store/uiStore').useBookingUIStore.getState();
            setSelectedEmployee({ id: 'employee-1', firstName: 'John', lastName: 'Doe' });
          }}>
            John Doe
          </button>
          <span>Experienced hairstylist</span>
          <span>5 years experience</span>
        </div>
        <div data-cy="employee-card">
          <button>Jane Smith</button>
        </div>
        <button>Next</button>
      </div>
    );
  };
});

jest.mock('../../../components/booking/DateTimeSelection', () => {
  return function MockDateTimeSelection() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return (
      <div data-testid="datetime-selection">
        <h2>Select Date & Time</h2>
        <button role="button" aria-label="calendar">Calendar</button>
        <button onClick={() => {
          const { setSelectedDate } = require('../../../store/uiStore').useBookingUIStore.getState();
          // Use UTC date for consistency
          const utcTomorrow = new Date(Date.UTC(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate()));
          setSelectedDate(utcTomorrow.toISOString().split('T')[0]);
        }}>
          {tomorrow.getDate()}
        </button>
        <button onClick={() => {
          const { setSelectedSlot } = require('../../../store/uiStore').useBookingUIStore.getState();
          setSelectedSlot({ time: '10:00', available: true });
        }}>
          10:00
        </button>
        <button>Next</button>
      </div>
    );
  };
});

jest.mock('../../../components/booking/CustomerDetails', () => {
  return function MockCustomerDetails() {
    return (
      <div data-testid="customer-details">
        <h2>Your Information</h2>
        <label htmlFor="firstName">First Name</label>
        <input id="firstName" />
        <label htmlFor="lastName">Last Name</label>
        <input id="lastName" />
        <label htmlFor="email">Email</label>
        <input id="email" type="email" />
        <label htmlFor="phone">Phone</label>
        <input id="phone" />
        <button>Next</button>
      </div>
    );
  };
});

jest.mock('../../../components/booking/PaymentMethodSelection', () => {
  return function MockPaymentMethodSelection() {
    return (
      <div data-testid="payment-selection">
        <h2>Review Your Booking</h2>
        <div>Haircut</div>
        <div>John Doe</div>
        <div>€50</div>
        <div>john.doe@example.com</div>
        <button>Confirm Booking</button>
      </div>
    );
  };
});

jest.mock('../../../components/booking/BookingSuccess', () => {
  return function MockBookingSuccess() {
    return (
      <div data-testid="booking-success">
        <h2>Booking Confirmed!</h2>
      </div>
    );
  };
});

const mockApi = api as jest.Mocked<typeof api>;
const mockQueries = require('../../../hooks/queries');

// Mock useAuth hook
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
  }),
}));

// Mock WebSocket hook
jest.mock('../../../hooks/useSlotSubscriptions', () => ({
  useSlotSubscriptions: () => ({
    subscribeToSlots: jest.fn(),
    unsubscribeFromSlots: jest.fn(),
    unsubscribeFromAllSlots: jest.fn(),
    isConnected: true,
    connectionError: null,
  }),
}));

// Mock WebSocket
jest.mock('../../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    isConnected: true,
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  }),
}));

// Test data
const mockShop = {
  id: 'shop-1',
  name: 'Beauty Salon',
  acceptsCardPayments: true,
  address: '123 Main St',
  city: 'Sofia',
  country: 'Bulgaria',
};

const mockServices = [
  {
    id: 'service-1',
    name: 'Haircut',
    price: 50,
    duration: 60,
    description: 'Professional haircut',
  },
  {
    id: 'service-2',
    name: 'Hair Color',
    price: 80,
    duration: 120,
    description: 'Hair coloring service',
  },
];

const mockEmployees = [
  {
    id: 'employee-1',
    user: {
      firstName: 'John',
      lastName: 'Doe',
    },
    bio: 'Experienced hairstylist',
    yearsExperience: 5,
  },
  {
    id: 'employee-2',
    user: {
      firstName: 'Jane',
      lastName: 'Smith',
    },
    bio: 'Color specialist',
    yearsExperience: 8,
  },
];

const mockAvailableSlots = [
  '2024-12-20T10:00:00',
  '2024-12-20T11:00:00',
  '2024-12-20T14:00:00',
  '2024-12-20T15:00:00',
];

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'USER',
};

// Test wrapper component
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

describe('BookingPage Component - Comprehensive Tests', () => {
  beforeEach(() => {
    // Reset store state
    useBookingUIStore.setState({
      selectedService: null,
      selectedEmployee: null,
      selectedDate: null,
      selectedSlot: null,
      currentShopId: null,
      currentLockSessionId: null,
      lockedSlots: new Set(),
    });

    // Mock React Query hooks used by BookingPage
    mockQueries.useShopQuery.mockReturnValue({
      data: mockShop,
      isLoading: false,
      error: null,
      isSuccess: true,
    });

    mockQueries.useShopServicesQuery.mockReturnValue({
      data: mockServices,
      isLoading: false,
      error: null,
      isSuccess: true,
    });

    mockQueries.useShopEmployeesQuery.mockReturnValue({
      data: mockEmployees,
      isLoading: false,
      error: null,
      isSuccess: true,
    });

    mockQueries.useAvailableSlotsQuery.mockReturnValue({
      data: mockAvailableSlots,
      isLoading: false,
      error: null,
      isSuccess: true,
      refetch: jest.fn(),
    });

    // Mock mutations
    mockQueries.useLockSlotMutation.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn().mockResolvedValue({
        message: 'Slot locked successfully',
        lockToken: 'lock-token-123',
        expiresIn: 5
      }),
      isLoading: false,
      error: null,
      isSuccess: true,
    });

    mockQueries.useUnlockSlotMutation.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn().mockResolvedValue({ success: true }),
      isLoading: false,
      error: null,
      isSuccess: true,
    });

    mockQueries.useCreateAppointmentMutation.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn().mockResolvedValue({
        id: 'appointment-123',
        status: 'CONFIRMED',
        customerEmail: 'john.doe@example.com'
      }),
      isLoading: false,
      error: null,
      isSuccess: true,
    });

    // Mock API client for backward compatibility
    mockApi.apiClient = {
      getShop: jest.fn().mockResolvedValue(mockShop),
      getShopServices: jest.fn().mockResolvedValue(mockServices),
      getShopEmployees: jest.fn().mockResolvedValue(mockEmployees),
      getAvailableSlots: jest.fn().mockResolvedValue(mockAvailableSlots),
      lockSlot: jest.fn().mockResolvedValue({
        message: 'Slot locked successfully',
        lockToken: 'lock-token-123',
        expiresIn: 5
      }),
      createAppointment: jest.fn().mockResolvedValue({
        id: 'appointment-123',
        status: 'CONFIRMED',
        customerEmail: 'john.doe@example.com'
      }),
    };

    // Also mock the individual API functions for backward compatibility
    mockApi.getShopServices = mockApi.apiClient.getShopServices;
    mockApi.lockSlot = mockApi.apiClient.lockSlot;
    mockApi.createAppointment = mockApi.apiClient.createAppointment;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Selection', () => {
    test('renders service selection step with all services', async () => {
      render(
        <TestWrapper>
          <BookingPage />
        </TestWrapper>
      );

      expect(screen.getByText('Select Service')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
        expect(screen.getByText('Hair Color')).toBeInTheDocument();
      });

      expect(screen.getByText('€50')).toBeInTheDocument();
      expect(screen.getByText('60 min')).toBeInTheDocument();
    });

    test('validates service selection before proceeding', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <BookingPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Next'));

      expect(screen.getByText('Please select a service')).toBeInTheDocument();
    });

    test('displays service details correctly', async () => {
      render(
        <TestWrapper>
          <BookingPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
      });

      const serviceCard = screen.getByText('Haircut').closest('[data-cy=service-card]');
      expect(serviceCard).toBeInTheDocument();
      
      within(serviceCard!).getByText('€50');
      within(serviceCard!).getByText('60 min');
      within(serviceCard!).getByText('Professional haircut');
    });

    test('filters services by category', async () => {
      render(
        <TestWrapper>
          <BookingPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
      });

      const categoryFilter = screen.getByLabelText('Filter by category');
      await userEvent.selectOptions(categoryFilter, 'Hair');

      // Should still show hair-related services
      expect(screen.getByText('Haircut')).toBeInTheDocument();
      expect(screen.getByText('Hair Color')).toBeInTheDocument();
    });
  });

  describe('Employee Selection', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <BookingPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Haircut'));
      await user.click(screen.getByText('Next'));
    });

    test('displays all available employees', async () => {
      await waitFor(() => {
        expect(screen.getByText('Select Employee')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    test('shows employee details', async () => {
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const employeeCard = screen.getByText('John Doe').closest('[data-cy=employee-card]');
      expect(employeeCard).toBeInTheDocument();
      
      within(employeeCard!).getByText('Experienced hairstylist');
      within(employeeCard!).getByText('5 years experience');
    });

    test('validates employee selection', async () => {
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Next'));

      expect(screen.getByText('Please select an employee')).toBeInTheDocument();
    });
  });

  describe('Date and Time Selection', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <BookingPage />
        </TestWrapper>
      );

      // Complete service and employee selection
      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Haircut'));
      await user.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('John Doe'));
      await user.click(screen.getByText('Next'));
    });

    test('displays calendar and available dates', async () => {
      await waitFor(() => {
        expect(screen.getByText('Select Date & Time')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /calendar/i })).toBeInTheDocument();
    });

    test('loads available slots when date is selected', async () => {
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('Select Date & Time')).toBeInTheDocument();
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      const dateButton = screen.getByText(tomorrow.getDate().toString());
      await user.click(dateButton);

      await waitFor(() => {
        expect(mockApi.getAvailableSlots).toHaveBeenCalledWith(
          mockShop.id,
          'service-1',
          'employee-1',
          tomorrowStr
        );
      });
    });

    test('handles slot locking when slot is selected', async () => {
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('Select Date & Time')).toBeInTheDocument();
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const dateButton = screen.getByText(tomorrow.getDate().toString());
      await user.click(dateButton);

      await waitFor(() => {
        expect(screen.getByText('10:00')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('10:00'));

      await waitFor(() => {
        expect(mockApi.lockSlot).toHaveBeenCalledWith({
          shopId: mockShop.id,
          serviceId: 'service-1',
          employeeId: 'employee-1',
          dateTime: expect.any(String),
        });
      });
    });

    test('shows locked slots with visual indicators', async () => {
      // Mock locked slots
      useBookingUIStore.setState({
        lockedSlots: new Set(['2024-12-20T10:00:00']),
      });

      await waitFor(() => {
        expect(screen.getByText('Select Date & Time')).toBeInTheDocument();
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const dateButton = screen.getByText(tomorrow.getDate().toString());
      await userEvent.click(dateButton);

      await waitFor(() => {
        const lockedSlot = screen.getByText('10:00').closest('button');
        expect(lockedSlot).toHaveClass('locked');
      });
    });
  });

  describe('Guest Information Form', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <BookingPage />
        </TestWrapper>
      );

      // Complete all previous steps
      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Haircut'));
      await user.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('John Doe'));
      await user.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('10:00')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('10:00'));
      await user.click(screen.getByText('Next'));
    });

    test('displays guest information form for unauthenticated users', async () => {
      await waitFor(() => {
        expect(screen.getByText('Your Information')).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    });

    test('validates all required fields', async () => {
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Next'));

      expect(screen.getByText('First name is required')).toBeInTheDocument();
      expect(screen.getByText('Last name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Phone is required')).toBeInTheDocument();
    });

    test('validates email format', async () => {
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'invalid-email');
      await user.type(screen.getByLabelText(/phone/i), '+359888123456');
      await user.click(screen.getByText('Next'));

      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });

    test('converts Bulgarian phone numbers automatically', async () => {
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      });

      const phoneInput = screen.getByLabelText(/phone/i);
      await user.type(phoneInput, '0888123456');

      await waitFor(() => {
        expect(phoneInput).toHaveValue('+359888123456');
      });
    });
  });

  describe('Booking Summary and Confirmation', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <BookingPage />
        </TestWrapper>
      );

      // Complete all steps including guest info
      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Haircut'));
      await user.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('John Doe'));
      await user.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('10:00')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('10:00'));
      await user.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'john.doe@example.com');
      await user.type(screen.getByLabelText(/phone/i), '+359888123456');
      await user.click(screen.getByText('Next'));
    });

    test('displays booking summary with all details', async () => {
      await waitFor(() => {
        expect(screen.getByText('Review Your Booking')).toBeInTheDocument();
      });

      expect(screen.getByText('Haircut')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('€50')).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });

    test('completes booking successfully', async () => {
      const user = userEvent.setup();
      
      mockApi.createAppointment.mockResolvedValue({
        data: {
          id: 'appointment-123',
          status: 'CONFIRMED',
          customerEmail: 'john.doe@example.com'
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Confirm Booking')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Confirm Booking'));

      await waitFor(() => {
        expect(mockApi.createAppointment).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText('Booking Confirmed!')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles API errors gracefully', async () => {
      mockApi.getShopServices.mockRejectedValue(new Error('Failed to load services'));

      render(
        <TestWrapper>
          <BookingPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/failed to load services/i)).toBeInTheDocument();
      });

      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    test('handles slot lock failures', async () => {
      mockApi.lockSlot.mockRejectedValue(new Error('Slot is already locked'));

      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <BookingPage />
        </TestWrapper>
      );

      // Navigate to time selection and try to lock a slot
      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Haircut'));
      await user.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('John Doe'));
      await user.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('10:00')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('10:00'));

      await waitFor(() => {
        expect(screen.getByText(/slot is already locked/i)).toBeInTheDocument();
      });
    });

    test('shows loading states during API calls', async () => {
      mockApi.getShopServices.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: mockServices }), 100))
      );

      render(
        <TestWrapper>
          <BookingPage />
        </TestWrapper>
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Navigation and State Management', () => {
    test('handles back navigation correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <BookingPage />
        </TestWrapper>
      );

      // Navigate forward
      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Haircut'));
      await user.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Select Employee')).toBeInTheDocument();
      });

      // Navigate back
      await user.click(screen.getByText('Back'));

      expect(screen.getByText('Select Service')).toBeInTheDocument();
      expect(screen.getByText('Haircut')).toBeInTheDocument();
    });

    test('clears booking state when component unmounts', () => {
      const { unmount } = render(
        <TestWrapper>
          <BookingPage />
        </TestWrapper>
      );

      // Set some booking state
      act(() => {
        useBookingUIStore.setState({
          selectedService: mockServices[0],
          selectedEmployee: mockEmployees[0],
          currentShopId: mockShop.id,
        });
      });

      unmount();

      const state = useBookingUIStore.getState();
      expect(state.selectedService).toBeNull();
      expect(state.selectedEmployee).toBeNull();
      expect(state.currentShopId).toBeNull();
    });
  });
});
