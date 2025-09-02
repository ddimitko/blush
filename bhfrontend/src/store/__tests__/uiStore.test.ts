import { act, renderHook } from '@testing-library/react';
import { 
  useModalUIStore, 
  useBookingUIStore, 
  useShopSearchUIStore,
  useDashboardUIStore 
} from '../uiStore';

describe('useModalUIStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useModalUIStore.setState({
      isAuthModalOpen: false,
      authModalMode: 'login',
      isNotificationDropdownOpen: false,
    });
  });

  test('opens and closes auth modal', () => {
    const { result } = renderHook(() => useModalUIStore());

    expect(result.current.isAuthModalOpen).toBe(false);

    act(() => {
      result.current.openAuthModal('register');
    });

    expect(result.current.isAuthModalOpen).toBe(true);
    expect(result.current.authModalMode).toBe('register');

    act(() => {
      result.current.closeAuthModal();
    });

    expect(result.current.isAuthModalOpen).toBe(false);
  });

  test('toggles notification dropdown', () => {
    const { result } = renderHook(() => useModalUIStore());

    expect(result.current.isNotificationDropdownOpen).toBe(false);

    act(() => {
      result.current.toggleNotificationDropdown();
    });

    expect(result.current.isNotificationDropdownOpen).toBe(true);

    act(() => {
      result.current.toggleNotificationDropdown();
    });

    expect(result.current.isNotificationDropdownOpen).toBe(false);
  });

  test('closes notification dropdown', () => {
    const { result } = renderHook(() => useModalUIStore());

    act(() => {
      result.current.toggleNotificationDropdown();
    });

    expect(result.current.isNotificationDropdownOpen).toBe(true);

    act(() => {
      result.current.closeNotificationDropdown();
    });

    expect(result.current.isNotificationDropdownOpen).toBe(false);
  });
});

describe('useBookingUIStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useBookingUIStore.setState({
      selectedService: null,
      selectedEmployee: null,
      selectedDate: null,
      selectedSlot: null,
      currentShopId: null,
      currentLockSessionId: null,
      lockedSlots: new Set(),
    });
  });

  test('sets and clears selected service', () => {
    const { result } = renderHook(() => useBookingUIStore());
    const mockService = { id: '1', name: 'Haircut', price: 50 };

    act(() => {
      result.current.setSelectedService(mockService);
    });

    expect(result.current.selectedService).toEqual(mockService);

    act(() => {
      result.current.setSelectedService(null);
    });

    expect(result.current.selectedService).toBe(null);
  });

  test('manages locked slots', () => {
    const { result } = renderHook(() => useBookingUIStore());

    act(() => {
      result.current.addLockedSlot('2024-01-15T10:00:00');
    });

    expect(result.current.lockedSlots.has('2024-01-15T10:00:00')).toBe(true);

    act(() => {
      result.current.removeLockedSlot('2024-01-15T10:00:00');
    });

    expect(result.current.lockedSlots.has('2024-01-15T10:00:00')).toBe(false);
  });

  test('clears booking state', () => {
    const { result } = renderHook(() => useBookingUIStore());
    const mockService = { id: '1', name: 'Haircut', price: 50 };

    act(() => {
      result.current.setSelectedService(mockService);
      result.current.setSelectedDate('2024-01-15');
      result.current.setCurrentShopId('shop-1');
    });

    expect(result.current.selectedService).toEqual(mockService);
    expect(result.current.selectedDate).toBe('2024-01-15');
    expect(result.current.currentShopId).toBe('shop-1');

    act(() => {
      result.current.clearBookingState();
    });

    expect(result.current.selectedService).toBe(null);
    expect(result.current.selectedDate).toBe(null);
    expect(result.current.currentShopId).toBe(null);
  });
});

describe('useShopSearchUIStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useShopSearchUIStore.setState({
      searchQuery: '',
      filters: {
        businessTypes: [],
        city: '',
        priceRange: null,
        rating: null,
        distance: null,
      },
      viewMode: 'grid',
      sortBy: 'relevance',
      recentSearches: [],
    });
  });

  test('sets search query and adds to recent searches', () => {
    const { result } = renderHook(() => useShopSearchUIStore());

    act(() => {
      result.current.setSearchQuery('beauty salon');
    });

    expect(result.current.searchQuery).toBe('beauty salon');
    expect(result.current.recentSearches).toContain('beauty salon');
  });

  test('manages filters', () => {
    const { result } = renderHook(() => useShopSearchUIStore());

    act(() => {
      result.current.setFilters({
        city: 'Sofia',
        priceRange: [20, 100],
        rating: 4,
      });
    });

    expect(result.current.filters.city).toBe('Sofia');
    expect(result.current.filters.priceRange).toEqual([20, 100]);
    expect(result.current.filters.rating).toBe(4);
  });

  test('clears filters', () => {
    const { result } = renderHook(() => useShopSearchUIStore());

    act(() => {
      result.current.setFilters({
        city: 'Sofia',
        businessTypes: ['salon'],
      });
    });

    expect(result.current.filters.city).toBe('Sofia');
    expect(result.current.filters.businessTypes).toEqual(['salon']);

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.filters.city).toBe('');
    expect(result.current.filters.businessTypes).toEqual([]);
  });

  test('clears all search query and filters', () => {
    const { result } = renderHook(() => useShopSearchUIStore());

    // Set some search query and filters
    act(() => {
      result.current.setSearchQuery('test search');
      result.current.setFilters({
        city: 'Sofia',
        businessTypes: ['salon'],
        minRating: 4
      });
    });

    expect(result.current.searchQuery).toBe('test search');
    expect(result.current.filters.city).toBe('Sofia');
    expect(result.current.filters.businessTypes).toEqual(['salon']);
    expect(result.current.filters.minRating).toBe(4);

    // Mock window.dispatchEvent
    const mockDispatchEvent = jest.fn();
    Object.defineProperty(window, 'dispatchEvent', {
      value: mockDispatchEvent,
      writable: true
    });

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.searchQuery).toBe('');
    expect(result.current.filters.city).toBe('');
    expect(result.current.filters.businessTypes).toEqual([]);
    expect(result.current.filters.minRating).toBe(0);
    expect(result.current.currentPage).toBe(0);

    // Verify that clearNavbarSearch event was dispatched
    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'clearNavbarSearch'
      })
    );
  });

  test('manages view mode and sort options', () => {
    const { result } = renderHook(() => useShopSearchUIStore());

    act(() => {
      result.current.setViewMode('list');
      result.current.setSortBy('rating');
    });

    expect(result.current.viewMode).toBe('list');
    expect(result.current.sortBy).toBe('rating');
  });

  test('limits recent searches to 5 items', () => {
    const { result } = renderHook(() => useShopSearchUIStore());

    act(() => {
      result.current.addRecentSearch('search1');
      result.current.addRecentSearch('search2');
      result.current.addRecentSearch('search3');
      result.current.addRecentSearch('search4');
      result.current.addRecentSearch('search5');
      result.current.addRecentSearch('search6');
    });

    expect(result.current.recentSearches).toHaveLength(5);
    expect(result.current.recentSearches[0]).toBe('search6');
    expect(result.current.recentSearches).not.toContain('search1');
  });
});

describe('useDashboardUIStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useDashboardUIStore.setState({
      selectedShopId: null,
    });
  });

  test('sets and gets selected shop ID', () => {
    const { result } = renderHook(() => useDashboardUIStore());

    expect(result.current.selectedShopId).toBe(null);

    act(() => {
      result.current.setSelectedShopId('shop-123');
    });

    expect(result.current.selectedShopId).toBe('shop-123');

    act(() => {
      result.current.setSelectedShopId(null);
    });

    expect(result.current.selectedShopId).toBe(null);
  });
});
