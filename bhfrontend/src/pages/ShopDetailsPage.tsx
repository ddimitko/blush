import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Star, Clock, Phone, Mail, Calendar, ChevronLeft, ChevronRight, User, Award } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  useShopQuery,
  useShopEmployeesQuery,
  useShopServicesQuery,
  useShopHoursQuery
} from '../hooks/queries';
import { useShopReviewsQuery, useShopRatingStatsQuery } from '../hooks/queries/useReviewQueries';
import { ReviewDetailsModal } from '../components/ReviewDetailsModal';
import { ShopGalleryModal } from '../components/ShopGalleryModal';
import { Service, Employee } from '../types';
import { getBusinessTypeLabel, getImageUrl, formatCurrency, getInitials, getAvatarUrl, formatTime } from '../lib/utils';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorState from '../components/ui/ErrorState';
import MapDisplay from '../components/maps/MapDisplay';

const ShopDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [businessHoursCalculated, setBusinessHoursCalculated] = useState({});
  const [selectedReview, setSelectedReview] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);

  // React Query hooks for data fetching
  const {
    data: currentShop,
    isLoading: isShopLoading,
    error: shopError
  } = useShopQuery(id);

  const {
    data: employees = [],
    isLoading: isEmployeesLoading
  } = useShopEmployeesQuery(id, true);

  const {
    data: services = [],
    isLoading: isServicesLoading
  } = useShopServicesQuery(id, true);

  const {
    data: businessHours,
    isLoading: isHoursLoading
  } = useShopHoursQuery(id);

  // Reviews data
  const {
    data: reviewsData,
    isLoading: isReviewsLoading,
    error: reviewsError
  } = useShopReviewsQuery(id || '', 0, 10);

  const {
    data: ratingStats,
    isLoading: isRatingStatsLoading,
    error: ratingStatsError
  } = useShopRatingStatsQuery(id || '');



  // Combined loading state
  const isLoading = isShopLoading || isEmployeesLoading || isServicesLoading || isHoursLoading;

  // Define images array
  const images = currentShop?.gallery && currentShop.gallery.length > 0
    ? currentShop.gallery
    : [currentShop?.thumbnail].filter(Boolean);

  // Auto-rotate gallery images
  useEffect(() => {
    if (images.length > 1) {
      const interval = setInterval(() => {
        setSelectedImageIndex((prev) => (prev + 1) % images.length);
      }, 5000); // Change image every 5 seconds

      return () => clearInterval(interval);
    }
  }, [images.length]);

  // Business hours are managed directly by the shop
  // Employee schedules are handled separately in the scheduling system

  // Business hours calculation removed - using shop's direct business hours instead

  // Extract reviews data
  const reviews = reviewsData?.ratings || [];
  const totalReviews = reviewsData?.totalElements || 0;
  const hasMoreReviews = totalReviews > 3;

  const handleBookService = (service: Service) => {
    // Allow both authenticated and unauthenticated users to book
    navigate(`/book/${id}/${service.id}`);
  };

  const handleReviewClick = (review: any) => {
    setSelectedReview(review);
    setIsReviewModalOpen(true);
  };

  const handleCloseReviewModal = () => {
    setIsReviewModalOpen(false);
    setSelectedReview(null);
  };

  const handleOpenGallery = (startIndex: number = 0) => {
    // Only open gallery if there are images
    if (images.length === 0) return;

    setGalleryStartIndex(startIndex);
    setIsGalleryOpen(true);
  };

  const handleCloseGallery = () => {
    setIsGalleryOpen(false);
    setGalleryStartIndex(0);
  };

  const handleBookAppointment = () => {
    navigate(`/shop/${id}/book`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Error state
  if (shopError || !currentShop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorState
          variant="notFound"
          title="Shop Not Found"
          description="The shop you're looking for doesn't exist."
          onGoBack={() => navigate('/search')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 component-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
          {/* Image Gallery Carousel */}
          <div className={`relative h-64 md:h-96 group ${images.length > 0 ? 'cursor-pointer' : ''}`} onClick={images.length > 0 ? () => handleOpenGallery(selectedImageIndex) : undefined}>
            {images.length > 0 ? (
              <>
                <img
                  src={getImageUrl(images[selectedImageIndex])}
                  alt={currentShop.name}
                  className="w-full h-full object-cover transition-all duration-700 ease-in-out hover:scale-105"
                />

                {/* Gallery Overlay - Only show if there are images */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
                    <span className="text-sm font-medium">View Gallery ({images.length} photos)</span>
                  </div>
                </div>

                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageIndex((prev) =>
                          prev === 0 ? images.length - 1 : prev - 1
                        );
                      }}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/70"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageIndex((prev) =>
                          (prev + 1) % images.length
                        );
                      }}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/70"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Dots Indicator */}
                {images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImageIndex(index);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleOpenGallery(index);
                        }}
                        className={`w-3 h-3 rounded-full transition-all duration-200 ${
                          index === selectedImageIndex
                            ? 'bg-white scale-110'
                            : 'bg-white/50 hover:bg-white/75'
                        }`}
                        title={`View image ${index + 1} (double-click to open gallery)`}
                      />
                    ))}
                  </div>
                )}

                {/* Image Counter */}
                {images.length > 1 && (
                  <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                    {selectedImageIndex + 1} / {images.length}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400 text-lg">No images available</span>
              </div>
            )}
          </div>



          {/* Shop Info */}
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {currentShop.name}
                </h1>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center">
                    <Star className="h-5 w-5 text-yellow-400 fill-current mr-1" />
                    <span className="font-medium">
                      {currentShop.ratingAverage ? currentShop.ratingAverage.toFixed(1) : '0.0'}
                    </span>
                    <span className="text-gray-600 ml-1">
                      ({currentShop.ratingCount || 0} reviews)
                    </span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{currentShop.city}{currentShop.state ? `, ${currentShop.state}` : ''}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {currentShop.businessTypes && currentShop.businessTypes.length > 0 ? (
                    currentShop.businessTypes.map((type) => (
                      <span
                        key={type}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                      >
                        {getBusinessTypeLabel(type)}
                      </span>
                    ))
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                      Beauty Services
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-4 md:mt-0">
                <Button
                  size="lg"
                  onClick={() => navigate(`/book/${id}`)}
                  disabled={services.length === 0}
                >
                  <Calendar className="h-5 w-5 mr-2" />
                  Book Appointment
                </Button>
              </div>
            </div>

            <p className="text-gray-700 mb-6">{currentShop.description}</p>

            {/* Contact Info */}
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center text-gray-600">
                <MapPin className="h-4 w-4 mr-2" />
                <span>{currentShop.address}, {currentShop.city}{currentShop.state ? `, ${currentShop.state}` : ''} {currentShop.postalCode}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Phone className="h-4 w-4 mr-2" />
                <span>{currentShop.phone}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Mail className="h-4 w-4 mr-2" />
                <span>{currentShop.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Location Map */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Location</h3>
            <MapDisplay
              shop={currentShop}
              height="350px"
              showDirections={true}
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Services */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Services</h2>
              {services.length === 0 ? (
                <p className="text-gray-600">No services available at this time.</p>
              ) : (
                <div className="space-y-4">
                  {services.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      shopCountry={currentShop?.country}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Team */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Our Team</h3>
              {employees.length === 0 ? (
                <p className="text-gray-600">No team members listed.</p>
              ) : (
                <div className="space-y-4">
                  {employees.slice(0, 3).map((employee) => (
                    <EmployeeCard key={employee.id} employee={employee} />
                  ))}
                  {employees.length > 3 && (
                    <p className="text-sm text-gray-600">
                      +{employees.length - 3} more team members
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Business Hours */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Business Hours</h3>
              <div className="space-y-2 text-sm">
                {(businessHours || currentShop?.businessHours) && (businessHours || currentShop?.businessHours)!.length > 0 ? (
                  (businessHours || currentShop?.businessHours)!.map((hours) => (
                    <div key={hours.dayOfWeek} className="flex justify-between">
                      <span className="text-gray-600">
                        {hours.dayOfWeek.charAt(0) + hours.dayOfWeek.slice(1).toLowerCase()}
                      </span>
                      <span className={hours.closed ? "text-red-600" : ""}>
                        {hours.closed ? 'Closed' : `${formatTime(hours.openTime!)} - ${formatTime(hours.closeTime!)}`}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-center py-4">
                    Business hours not available
                  </div>
                )}
              </div>
            </div>

            {/* Reviews Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Customer Reviews</h3>
                {ratingStats && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="font-medium">{ratingStats.averageRating?.toFixed(1) || '0.0'}</span>
                    <span>({ratingStats.totalRatings || 0} reviews)</span>
                  </div>
                )}
              </div>

              {/* Rating Statistics */}
              {ratingStats && ratingStats.totalRatings > 0 && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-gray-900">{ratingStats.averageRating?.toFixed(1) || '0.0'}</div>
                        <div className="flex items-center justify-center mb-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < Math.round(ratingStats.averageRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="text-sm text-gray-600">{ratingStats.totalRatings} reviews</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {[5, 4, 3, 2, 1].map((stars) => {
                        const count = ratingStats.starCounts?.[stars] || 0;
                        const percentage = ratingStats.totalRatings > 0 ? (count / ratingStats.totalRatings) * 100 : 0;
                        return (
                          <div key={stars} className="flex items-center space-x-2 text-sm">
                            <span className="w-8">{stars}★</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-yellow-400 h-2 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="w-8 text-gray-600">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {isReviewsLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.slice(0, 3).map((review) => (
                    <div
                      key={review.id}
                      className="border-b border-gray-100 last:border-b-0 pb-4 last:pb-0 cursor-pointer hover:bg-gray-50 rounded-lg p-3 -m-3 transition-colors"
                      onClick={() => handleReviewClick(review)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-accent-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-accent-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{review.userName}</p>
                            <p className="text-xs text-gray-500">{review.formattedDate}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.stars ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {hasMoreReviews && (
                    <div className="text-center pt-2">
                      <Button variant="outline" size="sm">
                        View All Reviews ({totalReviews})
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Star className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No reviews yet</p>
                  <p className="text-xs">Reviews can only be left after completing an appointment</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Review Details Modal */}
      {selectedReview && (
        <ReviewDetailsModal
          review={selectedReview}
          isOpen={isReviewModalOpen}
          onClose={handleCloseReviewModal}
        />
      )}

      {/* Shop Gallery Modal - Only render if there are images */}
      {images.length > 0 && (
        <ShopGalleryModal
          images={images}
          initialIndex={galleryStartIndex}
          isOpen={isGalleryOpen}
          onClose={handleCloseGallery}
          shopName={currentShop?.name || 'Shop Gallery'}
        />
      )}
    </div>
  );
};

// Service Card Component
const ServiceCard: React.FC<{ service: Service; shopCountry?: string }> = ({
  service,
  shopCountry,
}) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors card-hover">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-lg font-semibold text-gray-900">{service.name}</h4>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">
            {formatCurrency(service.price, shopCountry)}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="h-4 w-4 mr-1" />
            {service.durationMinutes} min
          </div>
        </div>
      </div>
      {service.description && (
        <p className="text-gray-600 text-sm">{service.description}</p>
      )}
      {service.category && (
        <div className="mt-2">
          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
            {service.category}
          </span>
        </div>
      )}
    </div>
  );
};

// Employee Card Component
const EmployeeCard: React.FC<{ employee: Employee }> = ({ employee }) => {
  return (
    <div className="border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition-colors card-hover">
      <div className="flex items-start space-x-3">
        {employee.avatar ? (
          <img
            src={getAvatarUrl(employee.avatar)}
            alt={employee.fullName || employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee'}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 bg-accent-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-accent-700">
              {(() => {
                const fullName = employee.fullName || employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
                const nameParts = fullName.split(' ');
                return getInitials(nameParts[0] || '', nameParts[1] || '');
              })()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {employee.fullName || employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee'}
            </p>
            {employee.yearsExperience && (
              <div className="flex items-center text-xs text-gray-500">
                <Award className="w-3 h-3 mr-1" />
                {employee.yearsExperience}y exp
              </div>
            )}
          </div>
          {employee.specialties && (
            <p className="text-xs text-gray-600 mb-2">
              {Array.isArray(employee.specialties)
                ? employee.specialties.join(', ')
                : employee.specialties}
            </p>
          )}
          {employee.bio && (
            <p className="text-xs text-gray-500 line-clamp-2">
              {employee.bio}
            </p>
          )}

        </div>
      </div>
    </div>
  );
};

export default ShopDetailsPage;
