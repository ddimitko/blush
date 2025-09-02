import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Service, Employee, AvailableSlot } from '../types';

// Enhanced slot states for optimistic updates
export type SlotState = 'available' | 'locking' | 'locked' | 'unlocking' | 'error' | 'retrying';

export interface SlotStateInfo {
  state: SlotState;
  lockToken?: string;
  error?: string;
  retryCount?: number;
  lastAttempt?: number;
}

// UI state for booking flow
interface BookingUIState {
  // Current booking selections
  selectedService: Service | null;
  selectedEmployee: Employee | null;
  selectedDate: string | null;
  selectedSlot: AvailableSlot | null;
  currentShopId: string | null;

  // Enhanced slot locking state
  lockedSlots: Set<string>;
  bookedSlots: Set<string>; // Track slots that have been booked and should be hidden
  currentLockSessionId: string | null;
  slotStates: Map<string, SlotStateInfo>; // Track individual slot states
  lockQueue: string[]; // Queue for pending lock requests
  isProcessingQueue: boolean;

  // Lock extension state
  lockExpiresAt: number | null;
  lockExtensionCount: number;
  maxLockExtensions: number;

  // Error recovery state
  lastError: string | null;
  retryAttempts: number;
  maxRetryAttempts: number;

  // Actions
  setCurrentShopId: (shopId: string | null) => void;
  setSelectedService: (service: Service | null) => void;
  setSelectedEmployee: (employee: Employee | null) => void;
  setSelectedDate: (date: string | null) => void;
  setSelectedSlot: (slot: AvailableSlot | null) => void;
  addLockedSlot: (slotDateTime: string) => void;
  removeLockedSlot: (slotDateTime: string) => void;
  setLockedSlots: (slots: Set<string>) => void;
  addBookedSlot: (slotDateTime: string) => void;
  removeBookedSlot: (slotDateTime: string) => void;
  setCurrentLockSessionId: (sessionId: string | null) => void;

  // Enhanced slot state management
  setSlotState: (slotKey: string, state: SlotStateInfo) => void;
  getSlotState: (slotKey: string) => SlotStateInfo;
  clearSlotState: (slotKey: string) => void;

  // Queue management
  addToLockQueue: (slotKey: string) => void;
  removeFromLockQueue: (slotKey: string) => void;
  processLockQueue: () => void;

  // Lock extension
  setLockExpiration: (expiresAt: number) => void;
  extendLock: () => boolean;
  canExtendLock: () => boolean;

  // Error handling
  setError: (error: string) => void;
  clearError: () => void;
  incrementRetryAttempts: () => void;
  resetRetryAttempts: () => void;

  clearBookingState: () => void;
}

export const useBookingUIStore = create<BookingUIState>((set, get) => ({
  // Initial state
  selectedService: null,
  selectedEmployee: null,
  selectedDate: null,
  selectedSlot: null,
  currentShopId: null,
  lockedSlots: new Set(),
  bookedSlots: new Set(),
  currentLockSessionId: null,
  slotStates: new Map(),
  lockQueue: [],
  isProcessingQueue: false,
  lockExpiresAt: null,
  lockExtensionCount: 0,
  maxLockExtensions: 2,
  lastError: null,
  retryAttempts: 0,
  maxRetryAttempts: 3,

  // Actions
  setCurrentShopId: (shopId) => {
    set({ currentShopId: shopId });
  },

  setSelectedService: (service) => {
    set({
      selectedService: service,
      selectedEmployee: null,
      selectedDate: null,
      selectedSlot: null,
    });
  },

  setSelectedEmployee: (employee) => {
    set({
      selectedEmployee: employee,
      selectedDate: null,
      selectedSlot: null,
    });
  },

  setSelectedDate: (date) => {
    set({
      selectedDate: date,
      selectedSlot: null,
    });
  },

  setSelectedSlot: (slot) => {
    set({ selectedSlot: slot });
  },

  addLockedSlot: (slotDateTime) => {
    const { lockedSlots } = get();
    const newLockedSlots = new Set(lockedSlots);
    newLockedSlots.add(slotDateTime);
    set({ lockedSlots: newLockedSlots });
  },

  removeLockedSlot: (slotDateTime) => {
    const { lockedSlots } = get();
    const newLockedSlots = new Set(lockedSlots);
    newLockedSlots.delete(slotDateTime);
    set({ lockedSlots: newLockedSlots });
  },

  setLockedSlots: (slots) => {
    set({ lockedSlots: new Set(slots) });
  },

  addBookedSlot: (slotDateTime) => {
    const { bookedSlots } = get();
    const newBookedSlots = new Set(bookedSlots);
    newBookedSlots.add(slotDateTime);
    set({ bookedSlots: newBookedSlots });
  },

  removeBookedSlot: (slotDateTime) => {
    const { bookedSlots } = get();
    const newBookedSlots = new Set(bookedSlots);
    newBookedSlots.delete(slotDateTime);
    set({ bookedSlots: newBookedSlots });
  },

  setCurrentLockSessionId: (sessionId) => {
    const expiresAt = sessionId ? Date.now() + (5 * 60 * 1000) : null; // 5 minutes from now
    set({
      currentLockSessionId: sessionId,
      lockExpiresAt: expiresAt,
      lockExtensionCount: 0
    });
  },

  // Enhanced slot state management
  setSlotState: (slotKey, stateInfo) => {
    const { slotStates } = get();
    const newSlotStates = new Map(slotStates);
    newSlotStates.set(slotKey, stateInfo);
    set({ slotStates: newSlotStates });
  },

  getSlotState: (slotKey) => {
    const { slotStates } = get();
    return slotStates.get(slotKey) || { state: 'available' };
  },

  clearSlotState: (slotKey) => {
    const { slotStates } = get();
    const newSlotStates = new Map(slotStates);
    newSlotStates.delete(slotKey);
    set({ slotStates: newSlotStates });
  },

  // Queue management
  addToLockQueue: (slotKey) => {
    const { lockQueue } = get();
    if (!lockQueue.includes(slotKey)) {
      set({ lockQueue: [...lockQueue, slotKey] });
    }
  },

  removeFromLockQueue: (slotKey) => {
    const { lockQueue } = get();
    set({ lockQueue: lockQueue.filter(key => key !== slotKey) });
  },

  processLockQueue: () => {
    const { lockQueue, isProcessingQueue } = get();
    if (isProcessingQueue || lockQueue.length === 0) return;

    set({ isProcessingQueue: true });
    // Queue processing logic will be handled by the component
  },

  // Lock extension
  setLockExpiration: (expiresAt) => {
    set({ lockExpiresAt: expiresAt });
  },

  extendLock: () => {
    const { lockExtensionCount, maxLockExtensions, lockExpiresAt } = get();
    if (lockExtensionCount < maxLockExtensions && lockExpiresAt) {
      const newExpiresAt = Date.now() + (5 * 60 * 1000); // Extend by 5 minutes
      set({
        lockExpiresAt: newExpiresAt,
        lockExtensionCount: lockExtensionCount + 1
      });
      return true;
    }
    return false;
  },

  canExtendLock: () => {
    const { lockExtensionCount, maxLockExtensions, currentLockSessionId } = get();
    return currentLockSessionId && lockExtensionCount < maxLockExtensions;
  },

  // Error handling
  setError: (error) => {
    set({ lastError: error });
  },

  clearError: () => {
    set({ lastError: null, retryAttempts: 0 });
  },

  incrementRetryAttempts: () => {
    const { retryAttempts } = get();
    set({ retryAttempts: retryAttempts + 1 });
  },

  resetRetryAttempts: () => {
    set({ retryAttempts: 0 });
  },

  clearBookingState: () => {
    set({
      selectedService: null,
      selectedEmployee: null,
      selectedDate: null,
      selectedSlot: null,
      currentShopId: null,
      lockedSlots: new Set(),
      currentLockSessionId: null,
      slotStates: new Map(),
      lockQueue: [],
      isProcessingQueue: false,
      lockExpiresAt: null,
      lockExtensionCount: 0,
      lastError: null,
      retryAttempts: 0,
    });
  },
}));

// Enhanced UI state for shop search and filters
interface ShopSearchUIState {
  searchQuery: string;
  filters: {
    businessTypes: string[];
    city: string;
    minRating: number;
    acceptsCard: boolean | null;
    distance: number | null;
    useLocation: boolean;
  };
  viewMode: 'grid' | 'list';
  sortBy: 'name' | 'rating' | 'distance';
  sortDir: 'asc' | 'desc';
  recentSearches: string[];
  currentPage: number;
  pageSize: number;

  // Actions
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<ShopSearchUIState['filters']>) => void;
  clearFilters: () => void;
  clearAll: () => void; // Clear both search query and filters
  setViewMode: (mode: 'grid' | 'list') => void;
  setSortBy: (sort: ShopSearchUIState['sortBy']) => void;
  setSortDir: (dir: 'asc' | 'desc') => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}

export const useShopSearchUIStore = create<ShopSearchUIState>()(
  persist(
    (set, get) => ({
      searchQuery: '',
      filters: {
        businessTypes: [],
        city: '',
        minRating: 0,
        acceptsCard: null,
        distance: null,
        useLocation: false,
      },
      viewMode: 'grid',
      sortBy: 'name',
      sortDir: 'asc',
      recentSearches: [],
      currentPage: 0,
      pageSize: 12,

      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
        if (query.trim()) {
          get().addRecentSearch(query.trim());
        }
      },

      setFilters: (filters: Partial<ShopSearchUIState['filters']>) => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
        }));
      },

      clearFilters: () => {
        set({
          filters: {
            businessTypes: [],
            city: '',
            minRating: 0,
            acceptsCard: null,
            distance: null,
            useLocation: false,
          },
          currentPage: 0,
        });
      },

      clearAll: () => {
        set({
          searchQuery: '',
          filters: {
            businessTypes: [],
            city: '',
            minRating: 0,
            acceptsCard: null,
            distance: null,
            useLocation: false,
          },
          currentPage: 0,
        });
        // Notify navbar to clear its search input
        window.dispatchEvent(new CustomEvent('clearNavbarSearch'));
      },

      setViewMode: (mode) => {
        set({ viewMode: mode });
      },

      setSortBy: (sort) => {
        set({ sortBy: sort, currentPage: 0 });
      },

      setSortDir: (dir) => {
        set({ sortDir: dir, currentPage: 0 });
      },

      setCurrentPage: (page) => {
        set({ currentPage: page });
      },

      setPageSize: (size) => {
        set({ pageSize: size, currentPage: 0 });
      },

      addRecentSearch: (query) => {
        const current = get().recentSearches;
        const filtered = current.filter(s => s !== query);
        const updated = [query, ...filtered].slice(0, 5); // Keep only 5 recent searches
        set({ recentSearches: updated });
      },

      clearRecentSearches: () => {
        set({ recentSearches: [] });
      },
    }),
    {
      name: 'shop-search-ui',
      partialize: (state) => ({
        searchQuery: state.searchQuery,
        filters: state.filters,
        viewMode: state.viewMode,
        sortBy: state.sortBy,
        sortDir: state.sortDir,
        recentSearches: state.recentSearches,
        pageSize: state.pageSize,
      }),
      version: 3, // Increment version for new features
    }
  )
);

// UI state for modals and overlays
interface ModalUIState {
  // Modal states
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  isProfileModalOpen: boolean;
  isNotificationDropdownOpen: boolean;

  // Actions
  openAuthModal: (mode: 'login' | 'register') => void;
  closeAuthModal: () => void;
  setAuthModalMode: (mode: 'login' | 'register') => void;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  toggleNotificationDropdown: () => void;
  closeNotificationDropdown: () => void;
}

export const useModalUIStore = create<ModalUIState>((set) => ({
  // Initial state
  isAuthModalOpen: false,
  authModalMode: 'login',
  isProfileModalOpen: false,
  isNotificationDropdownOpen: false,

  // Actions
  openAuthModal: (mode) => {
    set({ isAuthModalOpen: true, authModalMode: mode });
  },

  closeAuthModal: () => {
    set({ isAuthModalOpen: false });
  },

  setAuthModalMode: (mode) => {
    set({ authModalMode: mode });
  },

  openProfileModal: () => {
    set({ isProfileModalOpen: true });
  },

  closeProfileModal: () => {
    set({ isProfileModalOpen: false });
  },

  toggleNotificationDropdown: () => {
    set((state) => ({ isNotificationDropdownOpen: !state.isNotificationDropdownOpen }));
  },

  closeNotificationDropdown: () => {
    set({ isNotificationDropdownOpen: false });
  },
}));

// UI state for dashboard and owner interface
interface DashboardUIState {
  // Selected shop for owner dashboard
  selectedShopId: string | null;

  // Dashboard view states
  selectedDate: Date | null;
  viewMode: 'calendar' | 'list' | 'analytics';

  // Track which user the selected shop belongs to
  selectedShopUserId: string | null;

  // Actions
  setSelectedShopId: (shopId: string | null, userId?: string | null) => void;
  setSelectedDate: (date: Date | null) => void;
  setViewMode: (mode: 'calendar' | 'list' | 'analytics') => void;
  clearSelectedShop: () => void;
  validateSelectedShop: (userId: string | null) => boolean;
}

export const useDashboardUIStore = create<DashboardUIState>()(
  persist(
    (set, get) => ({
      selectedShopId: null,
      selectedDate: null,
      viewMode: 'calendar',
      selectedShopUserId: null,

      setSelectedShopId: (shopId, userId = null) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('🏪 DASHBOARD UI: Setting selected shop', { shopId, userId });
        }
        set({
          selectedShopId: shopId,
          selectedShopUserId: userId
        });
      },

      setSelectedDate: (date) => {
        set({ selectedDate: date });
      },

      setViewMode: (mode) => {
        set({ viewMode: mode });
      },

      clearSelectedShop: () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('🗑️ DASHBOARD UI: Clearing selected shop');
        }
        set({
          selectedShopId: null,
          selectedShopUserId: null,
          selectedDate: null
        });
      },

      validateSelectedShop: (userId) => {
        const { selectedShopId, selectedShopUserId } = get();

        // If no shop is selected, it's valid (will show selection UI)
        if (!selectedShopId) return true;

        // If no user is provided, consider it invalid
        if (!userId) return false;

        // If the selected shop belongs to a different user, it's invalid
        if (selectedShopUserId && selectedShopUserId !== userId) {
          console.log('⚠️ DASHBOARD UI: Selected shop belongs to different user, clearing', {
            selectedShopUserId,
            currentUserId: userId
          });
          get().clearSelectedShop();
          return false;
        }

        return true;
      },
    }),
    {
      name: 'dashboard-ui',
      partialize: (state) => ({
        selectedShopId: state.selectedShopId,
        selectedShopUserId: state.selectedShopUserId,
        viewMode: state.viewMode,
      }),
    }
  )
);
