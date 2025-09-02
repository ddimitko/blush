import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Filter, MapPin, Star, Sparkles, SlidersHorizontal, CreditCard, Navigation, ArrowUpDown } from 'lucide-react';
import SEOHead from '../components/seo/SEOHead';
import { useShopsQuery, ShopSearchParams } from '../hooks/queries';
import { useShopSearchUIStore } from '../store/uiStore';
import { useCurrentLocation, useDistanceCalculator } from '../hooks/useGeolocation';
import { useStableEffect, useDebouncedEffect } from '../hooks/useStableEffect';
import { BusinessType } from '../types';
import { getBusinessTypeLabel, getImageUrl } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorState from '../components/ui/ErrorState';

const ShopSearchPage: React.FC = () => {
  const {
    searchQuery,
    filters,
    sortBy,
    sortDir,
    currentPage,
    pageSize,
    setSearchQuery,
    setFilters,
    setSortBy,
    setSortDir,
    setCurrentPage,
    clearAll,
  } = useShopSearchUIStore();

  const { success, error: showError } = useToast();
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const location = useLocation();

  // Enhanced geolocation integration
  const {
    location: geoLocation,
    loading: locationLoading,
    error: locationError,
    getCurrentLocation,
    clearError: clearLocationError
  } = useCurrentLocation();

  const { formatDistance } = useDistanceCalculator();

  // Sync search query from URL ONLY on initial page load
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const queryFromUrl = urlParams.get('q') || '';

    // Only sync if we don't have a search query yet (initial load)
    if (!searchQuery && queryFromUrl) {
      setSearchQuery(queryFromUrl);
    }
  }, []); // Empty dependency array - only run on mount

  // Update URL when search query changes (but not on initial load)
  const isInitialLoadRef = useRef(true);
  useEffect(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    // Update URL to reflect current search query
    if (searchQuery.trim()) {
      const newUrl = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
      window.history.replaceState(null, '', newUrl);
    } else {
      window.history.replaceState(null, '', '/search');
    }
  }, [searchQuery]);



  // Search query persistence is now handled by the global store

  // Refs for smooth scrolling
  const searchHeaderRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Build search parameters
  const searchParams: ShopSearchParams = useMemo(() => {
    const params: ShopSearchParams = {
      page: currentPage,
      size: pageSize,
      sortBy,
      sortDir,
    };

    if (searchQuery?.trim()) {
      params.search = searchQuery.trim();
    }

    if (filters.businessTypes.length > 0) {
      params.businessTypes = filters.businessTypes;
    }

    if (filters.city?.trim()) {
      params.city = filters.city.trim();
    }

    if (filters.minRating > 0) {
      params.minRating = filters.minRating;
    }

    if (filters.acceptsCard !== null) {
      params.acceptsCard = filters.acceptsCard;
    }

    if (filters.useLocation && userLocation && filters.distance) {
      params.latitude = userLocation.lat;
      params.longitude = userLocation.lng;
      params.maxDistance = filters.distance;
    }

    return params;
  }, [searchQuery, filters, sortBy, sortDir, currentPage, pageSize, userLocation]);

  // React Query for shops data
  const {
    data: shopsResponse,
    isLoading,
    error,
    refetch,
  } = useShopsQuery(searchParams);

  const shops = shopsResponse?.content || [];
  const totalElements = shopsResponse?.totalElements || 0;
  const totalPages = shopsResponse?.totalPages || 0;



  // Debug logging removed for production

  const businessTypes: BusinessType[] = [
    'HAIRDRESSER',
    'NAIL_STYLIST',
    'SPA',
    'BARBER',
    'BEAUTY_SALON',
    'MASSAGE',
    'SKINCARE_CLINIC',
    'MAKEUP_ARTIST',
    'EYEBROW_THREADING',
    'TATTOO_PARLOR',
    'WELLNESS_CENTER',
    'LASH_EXTENSIONS',
    'MICROBLADING',
    'PERMANENT_MAKEUP',
    'WAXING_SALON',
  ];

  // Smooth scroll to results
  const scrollToResults = () => {
    if (resultsRef.current) {
      const headerHeight = 80; // Account for fixed header
      const targetPosition = resultsRef.current.offsetTop - headerHeight;

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  };

  // Search is now handled exclusively by the navbar search bar

  // Enhanced geolocation with new service
  const getUserLocation = async () => {
    setFilters({ useLocation: true });

    try {
      await getCurrentLocation({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000, // 5 minutes
        fallbackToIP: true
      });

      success('Location Found', 'Using your current location for search');
      setFilters({ distance: 25 }); // Default to 25km
    } catch (error) {
      showError('Location Error', 'Unable to get your location. Please enter a city instead.');
      setFilters({ useLocation: false });
      clearLocationError();
    }
  };

  // Update userLocation when geoLocation changes
  useStableEffect(() => {
    if (geoLocation?.coordinates) {
      setUserLocation({
        lat: geoLocation.coordinates.latitude,
        lng: geoLocation.coordinates.longitude,
      });
    }
  }, [geoLocation]);

  const handleBusinessTypeToggle = (type: BusinessType) => {
    const newTypes = filters.businessTypes.includes(type)
      ? filters.businessTypes.filter(t => t !== type)
      : [...filters.businessTypes, type];

    setFilters({ businessTypes: newTypes });
    setCurrentPage(0); // Reset to first page

    // Scroll to results after filter change
    setTimeout(() => {
      scrollToResults();
    }, 100);
  };

  const clearFilters = () => {
    setFilters({
      businessTypes: [],
      city: '',
      minRating: 0,
      acceptsCard: null,
      distance: null,
      useLocation: false
    });
    setCurrentPage(0);
    setUserLocation(null);
  };

  const clearAllFiltersAndSearch = () => {
    clearAll(); // This clears both search query and filters, and notifies navbar
    setCurrentPage(0);
    setUserLocation(null);
  };

  const hasActiveFilters = () => {
    return filters.businessTypes.length > 0 ||
           !!filters.city ||
           filters.minRating > 0 ||
           filters.acceptsCard !== null ||
           filters.useLocation ||
           !!searchQuery;
  };

  const seoTitle = searchQuery
    ? `Search Results for "${searchQuery}" | BeautyHub`
    : 'Find Beauty Salons & Spas | BeautyHub';

  const seoDescription = searchQuery
    ? `Find the best beauty salons and spas for "${searchQuery}". Book appointments instantly with real-time availability.`
    : 'Discover premium beauty salons, spas, and wellness centers near you. Book appointments with real-time availability and instant confirmation.';

  return (
    <>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        keywords="beauty salon search, spa finder, hair salon near me, nail salon booking, massage appointments, beauty services search"
        url="/search"
      />
      <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Find Your Perfect Beauty Destination
          </h1>
          <p className="text-gray-600 mb-6">
            Discover premium salons, spas, and beauty services near you
          </p>

          {/* Search functionality is now exclusively handled by the navbar search bar */}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">

          {/* Filter Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters() && (
                  <span className="ml-2 bg-gray-900 text-white text-xs rounded-full px-2 py-1">
                    {[
                      filters.businessTypes.length,
                      filters.city ? 1 : 0,
                      filters.minRating > 0 ? 1 : 0,
                      filters.acceptsCard !== null ? 1 : 0,
                      filters.useLocation ? 1 : 0,
                      searchQuery ? 1 : 0
                    ].reduce((a, b) => a + b, 0)}
                  </span>
                )}
              </Button>

              {/* Sort Dropdown */}
              <select
                value={`${sortBy}-${sortDir}`}
                onChange={(e) => {
                  const [newSortBy, newSortDir] = e.target.value.split('-');
                  setSortBy(newSortBy as any);
                  setSortDir(newSortDir as 'asc' | 'desc');
                  setCurrentPage(0);

                  // Scroll to results after sort change
                  setTimeout(() => {
                    scrollToResults();
                  }, 100);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="rating-desc">Highest Rated</option>
                <option value="rating-asc">Lowest Rated</option>
                {filters.useLocation && (
                  <>
                    <option value="distance-asc">Nearest First</option>
                    <option value="distance-desc">Farthest First</option>
                  </>
                )}
              </select>
            </div>

            {hasActiveFilters() && (
              <Button variant="ghost" onClick={clearAllFiltersAndSearch}>
                Clear All
              </Button>
            )}
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Business Types */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Service Types
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {businessTypes.map((type) => (
                      <label key={type} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.businessTypes.includes(type)}
                          onChange={() => handleBusinessTypeToggle(type)}
                          className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {getBusinessTypeLabel(type)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Location
                  </h3>
                  <div className="space-y-3">
                    <Input
                      placeholder="Enter city name"
                      value={filters.city}
                      onChange={(e) => {
                        setFilters({ city: e.target.value });
                        setCurrentPage(0);
                        if (e.target.value.trim()) {
                          setTimeout(() => {
                            scrollToResults();
                          }, 100);
                        }
                      }}
                    />
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="useLocation"
                        checked={filters.useLocation}
                        onChange={(e) => {
                          if (e.target.checked) {
                            getUserLocation();
                          } else {
                            setFilters({ useLocation: false, distance: null });
                            setUserLocation(null);
                          }
                        }}
                        className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      />
                      <label htmlFor="useLocation" className="ml-2 text-sm text-gray-700 flex items-center">
                        <Navigation className="h-4 w-4 mr-1" />
                        Use my location
                      </label>
                    </div>
                    {filters.useLocation && (
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Distance: {filters.distance || 25}km
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={filters.distance || 25}
                          onChange={(e) => setFilters({ distance: parseInt(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Rating & Payment */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Quality & Payment
                  </h3>
                  <div className="space-y-3">
                    {/* Minimum Rating */}
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Minimum Rating: {filters.minRating > 0 ? `${filters.minRating}+ stars` : 'Any'}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.5"
                        value={filters.minRating}
                        onChange={(e) => {
                          setFilters({ minRating: parseFloat(e.target.value) });
                          setCurrentPage(0);
                          setTimeout(() => {
                            scrollToResults();
                          }, 100);
                        }}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Any</span>
                        <span>5★</span>
                      </div>
                    </div>

                    {/* Card Payment */}
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        Payment Options
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="cardPayment"
                            checked={filters.acceptsCard === null}
                            onChange={() => {
                              setFilters({ acceptsCard: null });
                              setCurrentPage(0);
                              setTimeout(() => {
                                scrollToResults();
                              }, 100);
                            }}
                            className="text-gray-900 focus:ring-gray-900"
                          />
                          <span className="ml-2 text-sm text-gray-700">Any payment method</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="cardPayment"
                            checked={filters.acceptsCard === true}
                            onChange={() => {
                              setFilters({ acceptsCard: true });
                              setCurrentPage(0);
                              setTimeout(() => {
                                scrollToResults();
                              }, 100);
                            }}
                            className="text-gray-900 focus:ring-gray-900"
                          />
                          <span className="ml-2 text-sm text-gray-700 flex items-center">
                            <CreditCard className="h-4 w-4 mr-1" />
                            Accepts card payments
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div ref={resultsRef}>
          {/* Results Header */}
          <div className="flex items-center justify-between mb-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 results-count">
                {isLoading ? 'Searching...' : `${totalElements} shops found`}
              </h2>
              {searchQuery && (
                <p className="text-gray-600 mt-1">
                  Results for "{searchQuery}"
                </p>
              )}
              {!isLoading && totalElements > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  Showing {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, totalElements)} of {totalElements} results
                </p>
              )}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center py-12 search-loading">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <ErrorState
              variant="server"
              error={error}
              onRetry={refetch}
            />
          )}

          {/* No Results */}
          {!isLoading && !error && shops.length === 0 && (searchQuery || hasActiveFilters()) && (
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No shops found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery
                  ? `Try adjusting your search criteria or filters for "${searchQuery}"`
                  : 'Try adjusting your filters or search for something else'
                }
              </p>
              <div>
                <Button onClick={clearAllFiltersAndSearch}>
                  Clear All
                </Button>
              </div>
            </div>
          )}

          {/* Results Grid */}
          {!isLoading && !error && shops.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {shops.map((shop, index) => (
                <Link
                  key={shop.id}
                  to={`/shop/${shop.id}`}
                  className="search-result-card bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden group search-result-item"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="relative h-48 bg-gray-200">
                    {shop.thumbnail ? (
                      <img
                        src={getImageUrl(shop.thumbnail)}
                        alt={shop.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4">
                      <div className="bg-white rounded-full px-2 py-1 flex items-center space-x-1 shadow-sm">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium">
                          {shop.ratingAverage && shop.ratingAverage > 0 ? shop.ratingAverage.toFixed(1) : 'New'}
                        </span>
                        {shop.ratingCount > 0 && (
                          <span className="text-xs text-gray-500">
                            ({shop.ratingCount})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Payment Badge */}
                    {shop.acceptsCardPayments && (
                      <div className="absolute top-4 left-4">
                        <div className="bg-green-100 text-green-800 rounded-full px-2 py-1 flex items-center space-x-1 shadow-sm">
                          <CreditCard className="h-3 w-3" />
                          <span className="text-xs font-medium">Card</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-gray-700">
                      {shop.name}
                    </h3>
                    <div className="flex items-center text-gray-600 mb-3">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span className="text-sm">
                        {shop.address && `${shop.address}, `}{shop.city}{shop.state ? `, ${shop.state}` : ''}
                        {filters.useLocation && shop.distance && (
                          <span className="ml-2 text-blue-600 font-medium">
                            • {formatDistance(shop.distance)}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {shop.businessTypes && shop.businessTypes.length > 0 ? (
                        <>
                          {shop.businessTypes.slice(0, 2).map((type) => (
                            <span
                              key={type}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                            >
                              {getBusinessTypeLabel(type)}
                            </span>
                          ))}
                          {shop.businessTypes.length > 2 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                              +{shop.businessTypes.length - 2} more
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          Beauty Services
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {shop.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && !error && totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-8 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentPage(Math.max(0, currentPage - 1));
                  setTimeout(() => {
                    scrollToResults();
                  }, 100);
                }}
                disabled={currentPage === 0}
              >
                Previous
              </Button>

              <div className="flex space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i;
                  } else if (currentPage < 3) {
                    pageNum = i;
                  } else if (currentPage > totalPages - 4) {
                    pageNum = totalPages - 5 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "primary" : "outline"}
                      onClick={() => {
                        setCurrentPage(pageNum);
                        setTimeout(() => {
                          scrollToResults();
                        }, 100);
                      }}
                      className="w-10 h-10 p-0"
                    >
                      {pageNum + 1}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setCurrentPage(Math.min(totalPages - 1, currentPage + 1));
                  setTimeout(() => {
                    scrollToResults();
                  }, 100);
                }}
                disabled={currentPage >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
};

export default ShopSearchPage;

// Force rebuild - fixed businessTypes null checks
