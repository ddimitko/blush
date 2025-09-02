import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ErrorState, { InlineErrorState, MaintenanceErrorState } from '../ErrorState';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

describe('ErrorState Component', () => {
  test('renders default error state', () => {
    render(<ErrorState />);
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
  });

  test('renders custom title and description', () => {
    render(
      <ErrorState 
        title="Custom Error" 
        description="Custom description" 
      />
    );
    
    expect(screen.getByText('Custom Error')).toBeInTheDocument();
    expect(screen.getByText('Custom description')).toBeInTheDocument();
  });

  test('shows retry button when onRetry is provided', () => {
    const mockRetry = jest.fn();
    render(<ErrorState onRetry={mockRetry} />);
    
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  test('disables retry button when max retries reached', () => {
    const mockRetry = jest.fn();
    render(
      <ErrorState 
        onRetry={mockRetry} 
        retryCount={3} 
        maxRetries={3} 
      />
    );
    
    const retryButton = screen.getByText('Max Retries Reached');
    expect(retryButton).toBeDisabled();
  });

  test('shows error details when showDetails is true', () => {
    const error = new Error('Test error message');
    render(
      <ErrorState 
        error={error} 
        showDetails={true} 
      />
    );
    
    expect(screen.getByText('Show Error Details')).toBeInTheDocument();
  });

  test('toggles error details visibility', () => {
    const error = new Error('Test error message');
    render(
      <ErrorState 
        error={error} 
        showDetails={true} 
      />
    );
    
    const toggleButton = screen.getByText('Show Error Details');
    fireEvent.click(toggleButton);
    
    expect(screen.getByText('Hide Error Details')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  test('copies error details to clipboard', async () => {
    const error = new Error('Test error message');
    render(
      <ErrorState 
        error={error} 
        showDetails={true} 
      />
    );
    
    // Open error details
    fireEvent.click(screen.getByText('Show Error Details'));
    
    // Click copy button
    const copyButton = screen.getByText('Copy');
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  test('shows support contact when max retries reached', () => {
    render(
      <ErrorState 
        retryCount={3} 
        maxRetries={3} 
        supportEmail="test@example.com" 
      />
    );
    
    expect(screen.getByText('Still having trouble?')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });
});

describe('InlineErrorState Component', () => {
  test('renders inline error state', () => {
    render(<InlineErrorState error="Inline error" />);
    
    expect(screen.getByText('Oops!')).toBeInTheDocument();
  });
});

describe('MaintenanceErrorState Component', () => {
  test('renders maintenance error state', () => {
    render(<MaintenanceErrorState estimatedTime="30 minutes" />);
    
    expect(screen.getByText('Under Maintenance')).toBeInTheDocument();
    expect(screen.getByText(/We'll be back in approximately 30 minutes/)).toBeInTheDocument();
  });
});
