import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, User, Menu, X, LogOut, Settings, Calendar, Store, HelpCircle, Newspaper, Mail } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLogoutWithRedirect } from '../../hooks/useLogoutWithRedirect';
import {
  useOwnerShopsQuery,
  useUnreadNotificationsQuery
} from '../../hooks/queries';
import {
  useDashboardUIStore,
  useModalUIStore,
  useShopSearchUIStore
} from '../../store/uiStore';
import { getInitials, getAvatarUrl } from '../../lib/utils';
import { smoothScrollToTop } from '../../lib/smoothNavigation';
import { EnhancedSearchInput } from '../ui/EnhancedSearchInput';
import Button from '../ui/Button';
import LunaraLogo from '../ui/LunaraLogo';
import AuthModal from '../auth/AuthModal';
import ShopSelector from '../dashboard/ShopSelector';
import NotificationDropdown from '../notifications/NotificationDropdown';
import LanguageSwitcher from '../ui/LanguageSwitcher';



const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { logoutWithRedirect } = useLogoutWithRedirect();


  // React Query hooks - only run when authenticated
  const {
    data: unreadData,
  } = useUnreadNotificationsQuery();

  const unreadCount = unreadData?.count || 0;

  // Only fetch shops if user has OWNER role
  const {
    data: shops = [],
  } = useOwnerShopsQuery(user?.role === 'OWNER');

  // UI state
  const {
    selectedShopId,
    setSelectedShopId,
    clearSelectedShop,
    validateSelectedShop
  } = useDashboardUIStore();
  const {
    isAuthModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    isNotificationDropdownOpen,
    toggleNotificationDropdown,
    closeNotificationDropdown,
  } = useModalUIStore();

  const currentShop = shops.find(shop => shop.id === selectedShopId);

  // Remove debug calls that cause infinite loops

  const lastAuthStateRef = useRef({ isAuthenticated: false, user: null });

  // Enhanced auth modal handlers with better UX
  const handleCloseAuthModal = () => {
    closeAuthModal();
  };

  const handleOpenAuthModal = (mode: 'login' | 'register') => {
    openAuthModal(mode);
  };

  // Handle successful authentication - close modal only on explicit success
  useEffect(() => {
    // Get previous state for comparison
    const prevState = lastAuthStateRef.current;
    const wasUnauthenticated = !prevState.isAuthenticated || !prevState.user;
    const isNowAuthenticated = isAuthenticated && user;

    // Removed debug logging to prevent infinite loops

    // Only close modal if:
    // 1. We transitioned from unauthenticated to authenticated
    // 2. Modal is currently open
    // 3. User object is fully populated
    // 4. This is a real state change (not just a re-render)
    if (wasUnauthenticated && isNowAuthenticated && isAuthModalOpen && user?.id) {
      // Small delay to ensure state is fully updated
      setTimeout(() => {
        closeAuthModal();
      }, 100);
    }

    // Always update the ref after comparison
    lastAuthStateRef.current = { isAuthenticated, user };
  }, [isAuthenticated, user, isAuthModalOpen]);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Refs for click outside detection
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  // Ultra simple search - local state only
  const [localSearchValue, setLocalSearchValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { searchQuery, setSearchQuery } = useShopSearchUIStore();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Sync local value with store when on search page
  useEffect(() => {
    if (location.pathname === '/search') {
      setLocalSearchValue(searchQuery);
    }
  }, [location.pathname, searchQuery]);

  // Ultra simple search change handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearchValue(value);

    // If on search page, update store immediately
    if (location.pathname === '/search') {
      setSearchQuery(value);
      return;
    }

    // If not on search page, debounce navigation
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (value.trim().length > 0) {
      setIsSearching(true);
      debounceTimeoutRef.current = setTimeout(() => {
        setSearchQuery(value);
        navigate(`/search?q=${encodeURIComponent(value.trim())}`);
        setIsMenuOpen(false);
        setIsSearching(false);
      }, 600); // Reduced from 800ms to 600ms
    } else {
      setIsSearching(false);
    }
  }, [location.pathname, setSearchQuery, navigate]);

  // Ultra simple search submit handler
  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (localSearchValue.trim()) {
      setSearchQuery(localSearchValue);
      navigate(`/search?q=${encodeURIComponent(localSearchValue.trim())}`);
      setIsMenuOpen(false);
      setIsSearching(false);
    }
  }, [localSearchValue, setSearchQuery, navigate]);

  // Clear search when leaving search page
  useEffect(() => {
    if (location.pathname !== '/search') {
      setLocalSearchValue('');
      setSearchQuery('');
      setIsSearching(false);
    }
  }, [location.pathname, setSearchQuery]);

  // Listen for clear events from search page
  useEffect(() => {
    const handleClearSearch = () => {
      setLocalSearchValue('');
      setSearchQuery('');
    };

    window.addEventListener('clearNavbarSearch', handleClearSearch);
    return () => window.removeEventListener('clearNavbarSearch', handleClearSearch);
  }, [setSearchQuery]);



  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Detect if we're on a dashboard page
  const isOwnerDashboard = location.pathname === '/owner/dashboard';
  const isOwnerDashboardPage = location.pathname.startsWith('/shop/') &&
    (location.pathname.includes('/settings') ||
     location.pathname.includes('/employees') ||
     location.pathname.includes('/services') ||
     location.pathname.includes('/analytics'));
  const isEmployeeDashboard = location.pathname === '/employee/dashboard';
  const isDashboardPage = isOwnerDashboard || isOwnerDashboardPage || isEmployeeDashboard;

  // Debug logging removed to prevent infinite loops



  // Click outside detection for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isProfileOpen]);



  const handleLogout = async () => {
    setIsProfileOpen(false);
    await logoutWithRedirect();
  };

  // Clear selected shop when user changes (logout/login with different user)
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      // Clear shop selection when user logs out
      if (selectedShopId) {
        clearSelectedShop();
      }
    }
  }, [isAuthenticated, user?.id, selectedShopId, clearSelectedShop]);

  // Validate and auto-select shop for navbar
  useEffect(() => {
    if (!user?.id || !(isOwnerDashboard || isOwnerDashboardPage)) return;

    // Validate the currently selected shop belongs to this user
    validateSelectedShop(user.id);

    // Auto-select shop if owner has only one shop and no valid selection
    // But only if we're not on the owner dashboard (let dashboard handle its own selection)
    if (shops.length === 1 && !selectedShopId && !isOwnerDashboardPage) {
      setSelectedShopId(shops[0].id, user.id);
    }
  }, [shops, selectedShopId, setSelectedShopId, validateSelectedShop, user?.id, isOwnerDashboard, isOwnerDashboardPage]);





  const getDashboardLink = () => {
    if (!user) return '/';
    
    switch (user.role) {
      case 'OWNER':
        return '/owner/dashboard';
      case 'EMPLOYEE':
        return '/employee/dashboard';
      default:
        return '/user/profile';
    }
  };

  return (
    <>
      <nav className="bg-white/95 backdrop-blur-md border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - varies by page type */}
            <div className="flex items-center space-x-4">
              {/* Logo - always routes to home */}
              <button
                onClick={() => {
                  try {
                    // Don't clear selected shop when navigating to home
                    // This allows users to maintain their shop context
                    smoothScrollToTop();
                    navigate('/');
                  } catch (error) {
                    console.error('Error navigating to home:', error);
                    // Fallback navigation
                    window.location.href = '/';
                  }
                }}
                className="flex items-center group focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 rounded-lg p-1 relative z-10"
              >
                <LunaraLogo size="md" variant="full" className="group-hover:opacity-80 transition-opacity pointer-events-none" />
              </button>

              {/* Shop selector for owner dashboard pages */}
              {(isOwnerDashboard || isOwnerDashboardPage) && (
                <>
                  <span className="text-gray-400">|</span>
                  <ShopSelector
                    shops={shops}
                    selectedShop={currentShop}
                    onShopSelect={(shop) => setSelectedShopId(shop.id, user?.id)}
                    isLoading={false}
                  />
                </>
              )}
            </div>

            {/* Enhanced Search Bar - only show on non-dashboard pages */}
            {!isDashboardPage && (
              <div className="hidden md:flex flex-1 max-w-lg mx-8">
                <EnhancedSearchInput
                  searchValue={localSearchValue}
                  isSearching={isSearching}
                  onSearchChange={handleSearchChange}
                  onSearchSubmit={handleSearchSubmit}
                  placeholder="Search shops, services..."
                  className="focus-ring"
                />
              </div>
            )}

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              {/* Desktop navigation */}
              <div className="hidden md:flex items-center space-x-4">
                {/* Language Switcher - Always visible */}
                <LanguageSwitcher variant="dropdown" showLabel={false} />

                {isAuthenticated ? (
                  <>
                    {/* Enhanced Notifications with React Query */}
                    <div className="relative notification-bell">
                      <button
                        onClick={toggleNotificationDropdown}
                        className="relative p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200 group"
                        title={`${unreadCount} unread notifications`}
                      >
                        <Bell className="h-5 w-5 group-hover:animate-bounce-subtle" />
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </button>

                      <NotificationDropdown
                        isOpen={isNotificationDropdownOpen}
                        onClose={closeNotificationDropdown}
                        unreadCount={unreadCount}
                      />
                    </div>

                    {/* Profile dropdown */}
                    <div className="relative profile-menu" ref={profileDropdownRef}>
                      <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-100 transition-all duration-200 group"
                        data-cy="user-menu"
                      >
                        {user?.avatar ? (
                          <img
                            src={getAvatarUrl(user.avatar)}
                            alt={`${user.firstName} ${user.lastName}`}
                            className="h-10 w-10 rounded-xl object-cover ring-2 ring-luxury-200 group-hover:ring-luxury-400 transition-all duration-200"
                          />
                        ) : (
                          <div className="h-10 w-10 bg-luxury-gradient rounded-xl flex items-center justify-center ring-2 ring-luxury-200 group-hover:ring-luxury-400 transition-all duration-200">
                            <span className="text-sm font-bold text-gray-900">
                              {getInitials(user?.firstName || '', user?.lastName || '')}
                            </span>
                          </div>
                        )}
                        <div className="text-left">
                          <div className="text-sm font-bold text-gray-900">
                            {user?.firstName}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {user?.role?.toLowerCase() || 'user'}
                          </div>
                        </div>
                      </button>

                      {/* Profile dropdown menu */}
                      {isProfileOpen && (
                        <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-luxury border border-gray-100 py-2 z-50 animate-slide-down">
                          <div className="px-4 py-3 border-b border-gray-100">
                            <p className="text-sm font-bold text-gray-900">{user?.firstName} {user?.lastName}</p>
                            <p className="text-xs text-gray-500">{user?.email}</p>
                          </div>

                          {/* Appointments - Available to all authenticated users */}
                          <Link
                            to="/appointments"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-luxury-50 hover:text-luxury-700 transition-all duration-200 group"
                          >
                            <Calendar className="h-4 w-4 mr-3 group-hover:text-luxury-500" />
                            My Appointments
                          </Link>

                          {/* Dashboard - Only for EMPLOYEE and OWNER roles */}
                          {(user?.role === 'EMPLOYEE' || user?.role === 'OWNER') && (
                            <Link
                              to={getDashboardLink()}
                              onClick={() => setIsProfileOpen(false)}
                              className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-luxury-50 hover:text-luxury-700 transition-all duration-200 group"
                            >
                              <User className="h-4 w-4 mr-3 group-hover:text-luxury-500" />
                              Dashboard
                            </Link>
                          )}
                          <button
                            onClick={() => {
                              setIsProfileOpen(false);
                              smoothScrollToTop();
                              setTimeout(() => {
                                navigate('/user/profile');
                              }, 100);
                            }}
                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-luxury-50 hover:text-luxury-700 transition-all duration-200 group"
                          >
                            <Settings className="h-4 w-4 mr-3 group-hover:text-luxury-500" />
                            Profile Settings
                          </button>

                          <div className="border-t border-gray-100 mt-2 pt-2">
                            <button
                              onClick={handleLogout}
                              className="flex items-center w-full px-4 py-3 text-sm text-error-600 hover:bg-error-50 transition-all duration-200 group"
                              data-cy="logout-btn"
                            >
                              <LogOut className="h-4 w-4 mr-3 group-hover:text-error-700" />
                              Sign Out
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenAuthModal('login')}
                      data-cy="login-btn"
                    >
                      Sign In
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenAuthModal('register')}
                      data-cy="register-btn"
                    >
                      Sign Up
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          {isMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-4">
              {/* Enhanced Mobile search - only show on non-dashboard pages */}
              {!isDashboardPage && (
                <div className="mb-4">
                  <EnhancedSearchInput
                    searchValue={localSearchValue}
                    isSearching={isSearching}
                    onSearchChange={handleSearchChange}
                    onSearchSubmit={handleSearchSubmit}
                    placeholder="Search shops, services..."
                    className="py-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              )}

              {/* Mobile Language Switcher */}
              <div className="mb-4 px-3">
                <LanguageSwitcher variant="inline" showLabel={true} />
              </div>

              {/* Mobile navigation links */}
              {isAuthenticated ? (
                <div className="space-y-2">
                  {/* Appointments - Available to all authenticated users */}
                  <Link
                    to="/appointments"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                  >
                    My Appointments
                  </Link>

                  {/* Dashboard - Only for EMPLOYEE and OWNER roles */}
                  {(user?.role === 'EMPLOYEE' || user?.role === 'OWNER') && (
                    <Link
                      to={getDashboardLink()}
                      onClick={() => setIsMenuOpen(false)}
                      className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                    >
                      Dashboard
                    </Link>
                  )}
                  <Link
                    to="/faq"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                  >
                    FAQ
                  </Link>
                  <Link
                    to="/news"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                  >
                    News
                  </Link>
                  <Link
                    to="/contact"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                  >
                    Contact Us
                  </Link>
                  <button
                    onClick={() => {
                      toggleNotificationDropdown();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center w-full px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                  >
                    <Bell className="h-5 w-5 mr-2" />
                    Notifications
                    {unreadCount > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={logoutWithRedirect}
                    className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        handleOpenAuthModal('login');
                        setIsMenuOpen(false);
                      }}
                      data-cy="login-btn"
                    >
                      Sign In
                    </Button>
                    <Button
                      className="w-full mt-2"
                      onClick={() => {
                        handleOpenAuthModal('register');
                        setIsMenuOpen(false);
                      }}
                      data-cy="register-btn"
                    >
                      Sign Up
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={handleCloseAuthModal}
        defaultMode={authModalMode}
      />
    </>
  );
};

export default Navbar;
