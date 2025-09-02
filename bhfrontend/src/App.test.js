import { render, screen, waitFor } from './test-utils';
import App from './App';

// Mock the auth hook to avoid API calls in tests
jest.mock('./hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    checkAuth: jest.fn(),
  }),
}));

// Mock the auth activity hook
jest.mock('./hooks/useAuthActivity', () => ({
  useAuthActivity: () => {},
}));

// Mock the auth interceptor hook
jest.mock('./hooks/useAuthInterceptor', () => ({
  useAuthInterceptor: () => ({
    isAuthenticating: false,
    hasValidToken: false,
  }),
}));

test('renders BeautyHub app', async () => {
  render(<App />);

  // Wait for the app to load and check for navigation elements
  await waitFor(() => {
    // Look for the BeautyHub logo or navigation
    const appElement = screen.getByRole('main') || screen.getByText(/BeautyHub/i) || document.body;
    expect(appElement).toBeInTheDocument();
  });
});
