import { render, screen } from '@testing-library/react';
import LoadingSpinner, { 
  BeautyLoadingSpinner, 
  LuxuryLoadingSpinner, 
  QuickLoadingSpinner,
  InlineLoadingSpinner 
} from '../LoadingSpinner';

describe('LoadingSpinner Component', () => {
  test('renders default loading spinner', () => {
    render(<LoadingSpinner />);
    
    // Check if spinner is rendered (look for loading animation)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  test('renders with custom text', () => {
    render(<LoadingSpinner text="Loading data..." />);
    
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  test('renders different sizes', () => {
    const { rerender } = render(<LoadingSpinner size="xs" />);
    expect(document.querySelector('.w-3')).toBeInTheDocument();
    
    rerender(<LoadingSpinner size="xl" />);
    expect(document.querySelector('.w-12')).toBeInTheDocument();
  });

  test('renders dots variant', () => {
    render(<LoadingSpinner variant="dots" />);

    // Should render loading-dots container
    const loadingDots = document.querySelector('.loading-dots');
    expect(loadingDots).toBeInTheDocument();

    // Should render multiple dots inside
    const dots = document.querySelectorAll('.loading-dots > div');
    expect(dots.length).toBeGreaterThan(0);
  });

  test('renders pulse variant', () => {
    render(<LoadingSpinner variant="pulse" />);
    
    const pulseElement = document.querySelector('.animate-pulse');
    expect(pulseElement).toBeInTheDocument();
  });

  test('renders beauty variant', () => {
    render(<LoadingSpinner variant="beauty" />);
    
    // Should have gradient background
    const beautyElement = document.querySelector('.bg-gradient-to-r');
    expect(beautyElement).toBeInTheDocument();
  });

  test('renders luxury variant', () => {
    render(<LoadingSpinner variant="luxury" />);
    
    // Should have conic gradient styling
    const luxuryElement = document.querySelector('.border-yellow-400');
    expect(luxuryElement).toBeInTheDocument();
  });

  test('applies different colors', () => {
    const { rerender } = render(<LoadingSpinner color="pink" />);
    expect(document.querySelector('.text-pink-500')).toBeInTheDocument();
    
    rerender(<LoadingSpinner color="gold" />);
    expect(document.querySelector('.text-yellow-500')).toBeInTheDocument();
  });
});

describe('Specialized Loading Components', () => {
  test('renders BeautyLoadingSpinner', () => {
    render(<BeautyLoadingSpinner />);
    
    expect(screen.getByText('Loading beauty...')).toBeInTheDocument();
    expect(document.querySelector('.bg-gradient-to-r')).toBeInTheDocument();
  });

  test('renders LuxuryLoadingSpinner', () => {
    render(<LuxuryLoadingSpinner />);
    
    expect(screen.getByText('Preparing your experience...')).toBeInTheDocument();
    expect(document.querySelector('.border-yellow-400')).toBeInTheDocument();
  });

  test('renders QuickLoadingSpinner', () => {
    render(<QuickLoadingSpinner />);

    // Should render loading-dots container (dots variant)
    const loadingDots = document.querySelector('.loading-dots');
    expect(loadingDots).toBeInTheDocument();

    // Should render multiple dots inside
    const dots = document.querySelectorAll('.loading-dots > div');
    expect(dots.length).toBeGreaterThan(0);
  });

  test('renders InlineLoadingSpinner', () => {
    render(<InlineLoadingSpinner text="Loading..." />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    // Should be minimal variant
    expect(document.querySelector('.border-t-transparent')).toBeInTheDocument();
  });

  test('BeautyLoadingSpinner accepts custom props', () => {
    render(<BeautyLoadingSpinner text="Custom beauty text" size="lg" />);
    
    expect(screen.getByText('Custom beauty text')).toBeInTheDocument();
  });

  test('LuxuryLoadingSpinner accepts custom props', () => {
    render(<LuxuryLoadingSpinner text="Custom luxury text" size="sm" />);
    
    expect(screen.getByText('Custom luxury text')).toBeInTheDocument();
  });
});
