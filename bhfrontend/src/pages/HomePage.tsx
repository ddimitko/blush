import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, MapPin, ArrowRight, Calendar, ChevronRight, Sparkles, Clock, Shield, CreditCard, ChevronDown, ChevronUp, Users, Store } from 'lucide-react';
import SEOHead from '../components/seo/SEOHead';
import { smoothScrollToTop } from '../lib/smoothNavigation';
import { useShopsQuery } from '../hooks/queries';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import { useModalUIStore } from '../store/uiStore';
import { Shop } from '../types';
import { getBusinessTypeLabel, getImageUrl } from '../lib/utils';
import Button from '../components/ui/Button';
import { SkeletonCard } from '../components/ui/Skeleton';
import { SearchEmptyState } from '../components/ui/EmptyState';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { tCommon, tShops } = useTranslation();
  const { openAuthModal } = useModalUIStore();
  const [activeAccordion, setActiveAccordion] = useState<'customers' | 'owners' | null>('customers');

  // Load featured shops with React Query
  const { data: shopsData, isLoading } = useShopsQuery({ page: 0, size: 6 });
  const shops = shopsData?.content || [];

  const featuredShops = shops.slice(0, 6);

  // Enhanced navigation with smooth scrolling
  const handleNavigation = (path: string) => {
    smoothScrollToTop();
    setTimeout(() => {
      navigate(path);
    }, 100);
  };

  // Handle business listing with authentication check
  const handleListBusiness = () => {
    if (!isAuthenticated) {
      openAuthModal('register');
    } else {
      handleNavigation('/shop/create');
    }
  };

  return (
    <>
      <SEOHead
        title="Lunara - Premium Beauty Services & Salon Booking"
        description="Discover and book appointments at the finest beauty salons, spas, and wellness centers. Experience luxury beauty services with real-time booking and instant confirmation."
        keywords="beauty salon booking, spa appointments, hair salon, nail salon, massage booking, beauty services, wellness center, premium beauty treatments"
        url="/"
      />
      <div className="min-h-screen bg-neutral-50 component-fade-in">
      {/* Hero Section - FARFETCH inspired */}
      <section className="relative bg-white border-b border-neutral-200">
        <div className="container-elegant">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center min-h-[80vh] py-12 lg:py-20">
            {/* Left Content */}
            <div className="space-y-8 animate-fade-in-up">
              <div className="space-y-6">
                <div className="inline-flex items-center px-3 py-1 bg-neutral-100 rounded-full text-neutral-700 text-sm font-medium">
                  <Sparkles className="h-3 w-3 mr-2" />
                  {String(tCommon('app.tagline') || 'Premium Beauty Platform')}
                </div>

                <h1 className="heading-1 text-neutral-900 leading-tight">
                  {String(tCommon('hero.title') || 'Book Premium')}
                  <span className="block text-accent-600">{String(tCommon('hero.subtitle') || 'Beauty Services')}</span>
                </h1>

                <p className="text-lg text-neutral-600 leading-relaxed max-w-lg">
                  {String(tCommon('hero.description') || 'Discover and book appointments at the finest beauty salons.')}
                </p>
              </div>



              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-6 items-center">
                <Button
                  size="lg"
                  variant="primary"
                  onClick={() => handleNavigation('/search')}
                  icon={<Sparkles className="h-4 w-4" />}
                  iconPosition="left"
                >
                  {String(tCommon('actions.smartSearch') || 'Smart Search')}
                </Button>
                <button
                  onClick={() => handleNavigation('/search')}
                  className="text-neutral-700 hover:text-accent-600 font-medium transition-colors group flex items-center"
                >
                  <span>Explore Shops</span>
                  <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Right Content - Enhanced Book Instantly Accordion */}
            <div className="relative lg:h-[600px] animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-accent-50 to-accent-100 rounded-lg"></div>
              <div className="absolute inset-4 bg-white rounded-lg shadow-elegant-lg p-6">
                <div className="h-full flex flex-col space-y-4">
                  {/* Header */}
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto">
                      <Calendar className="h-8 w-8 text-accent-600" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold text-neutral-900">Discover Lunara</h3>
                      <p className="text-sm text-neutral-600">Your gateway to premium beauty experiences</p>
                    </div>
                  </div>

                  {/* Accordion */}
                  <div className="flex-1 space-y-3">
                    {/* For Customers */}
                    <div className="border border-neutral-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setActiveAccordion(activeAccordion === 'customers' ? null : 'customers')}
                        className="w-full px-4 py-3 bg-white hover:bg-neutral-50 flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <Users className="h-5 w-5 text-accent-600" />
                          <span className="font-medium text-neutral-900">For Customers</span>
                        </div>
                        {activeAccordion === 'customers' ? (
                          <ChevronUp className="h-4 w-4 text-neutral-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-neutral-500" />
                        )}
                      </button>

                      {activeAccordion === 'customers' && (
                        <div className="px-4 pb-4 bg-neutral-50 space-y-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                              <Clock className="h-3 w-3 text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-neutral-900">Real-time Booking</p>
                              <p className="text-xs text-neutral-600">See live availability instantly</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <Shield className="h-3 w-3 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-neutral-900">Secure Payments</p>
                              <p className="text-xs text-neutral-600">Protected transactions</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                              <Star className="h-3 w-3 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-neutral-900">Premium Salons</p>
                              <p className="text-xs text-neutral-600">Verified professionals</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* For Shop Owners */}
                    <div className="border border-neutral-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setActiveAccordion(activeAccordion === 'owners' ? null : 'owners')}
                        className="w-full px-4 py-3 bg-white hover:bg-neutral-50 flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <Store className="h-5 w-5 text-accent-600" />
                          <span className="font-medium text-neutral-900">For Shop Owners</span>
                        </div>
                        {activeAccordion === 'owners' ? (
                          <ChevronUp className="h-4 w-4 text-neutral-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-neutral-500" />
                        )}
                      </button>

                      {activeAccordion === 'owners' && (
                        <div className="px-4 pb-4 bg-neutral-50 space-y-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                              <Calendar className="h-3 w-3 text-orange-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-neutral-900">Smart Scheduling</p>
                              <p className="text-xs text-neutral-600">Automated booking management</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                              <CreditCard className="h-3 w-3 text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-neutral-900">Secure Payments</p>
                              <p className="text-xs text-neutral-600">Stripe integration</p>
                            </div>
                          </div>

                          <button
                            onClick={handleListBusiness}
                            className="w-full mt-3 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors text-sm font-medium"
                          >
                            List Your Business
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Minimalistic */}
      <section className="section-padding bg-white">
        <div className="container-elegant">
          <div className="grid lg:grid-cols-4 gap-8 lg:gap-12">
            <div className="lg:col-span-1">
              <h2 className="heading-3 text-neutral-800 mb-4">
                Why Lunara
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                Experience premium beauty services with our curated platform.
              </p>
            </div>

            <div className="lg:col-span-3 grid md:grid-cols-3 gap-8">
              <div className="space-y-4 stagger-item">
                <div className="w-12 h-12 bg-neutral-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-neutral-700" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-neutral-900 mb-2">
                    Instant Booking
                  </h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    Real-time availability and instant confirmation for all appointments.
                  </p>
                </div>
              </div>

              <div className="space-y-4 stagger-item">
                <div className="w-12 h-12 bg-neutral-100 rounded-lg flex items-center justify-center">
                  <Star className="h-6 w-6 text-neutral-700" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-neutral-900 mb-2">
                    Curated Quality
                  </h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    Hand-selected salons and professionals for exceptional service.
                  </p>
                </div>
              </div>

              <div className="space-y-4 stagger-item">
                <div className="w-12 h-12 bg-neutral-100 rounded-lg flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-neutral-700" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-neutral-900 mb-2">
                    Premium Experience
                  </h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    Luxury treatments and personalized beauty experiences.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Shops Section */}
      <section className="section-padding bg-neutral-50">
        <div className="container-elegant">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="heading-3 text-neutral-900 mb-2">
                Featured Salons
              </h2>
              <p className="text-neutral-600">
                Discover our curated selection of premium beauty destinations
              </p>
            </div>
            <Link
              to="/search"
              className="hidden md:flex items-center text-neutral-900 hover:text-accent-600 font-medium group transition-colors"
            >
              View All
              <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-accent-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Featured Salons Coming Soon
              </h3>
              <p className="text-gray-600 mb-4">
                We're working on curating the best beauty salons for you. Featured salons will be selected carefully by Lunara and displayed here.
              </p>
              <Button
                onClick={() => navigate('/search')}
                variant="primary"
                className="mx-auto"
              >
                Browse All Salons
              </Button>
            </div>
          </div>

          <div className="text-center mt-12 md:hidden">
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/search')}
              className="group"
            >
              View All Salons
              <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section - Minimalistic */}
      <section className="section-padding bg-white border-t border-neutral-200">
        <div className="container-elegant">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h2 className="heading-3 text-neutral-900">
                Ready to Book Your Next Appointment?
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                Join thousands of satisfied customers who trust Lunara for their beauty needs.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="primary"
                onClick={() => navigate('/search')}
                icon={<Calendar className="h-4 w-4" />}
                iconPosition="left"
              >
                Book Appointment
              </Button>
              {user?.role === 'USER' && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    navigate('/shop/create');
                  }}
                >
                  List Your Business
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
      </div>
    </>
  );
};

// Shop Card Component - FARFETCH inspired
const ShopCard: React.FC<{ shop: Shop; index: number }> = ({ shop, index }) => {
  const navigate = useNavigate();

  const handleShopClick = () => {
    navigate(`/shop/${shop.id}`);
  };

  return (
    <button
      onClick={handleShopClick}
      className="card-elegant card-hover hover-glow group block w-full text-left animate-stagger-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="relative aspect-[4/3] bg-neutral-100 overflow-hidden">
        {shop.thumbnail ? (
          <img
            src={getImageUrl(shop.thumbnail)}
            alt={shop.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : shop.gallery && shop.gallery.length > 0 ? (
          <img
            src={getImageUrl(shop.gallery[0])}
            alt={shop.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-100">
            <Sparkles className="h-12 w-12 text-neutral-400" />
          </div>
        )}

        {/* Rating Badge */}
        <div className="absolute top-3 right-3">
          <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded flex items-center space-x-1">
            <Star className="h-3 w-3 text-accent-500 fill-current" />
            <span className="text-xs font-medium text-neutral-900">
              {shop.ratingAverage ? shop.ratingAverage.toFixed(1) : '5.0'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <h3 className="font-medium text-neutral-900 group-hover:text-accent-600 transition-colors">
            {shop.name}
          </h3>

          <div className="flex items-center text-neutral-500 text-sm">
            <MapPin className="h-3 w-3 mr-1" />
            <span>{shop.city}{shop.state ? `, ${shop.state}` : ''}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {shop.businessTypes && shop.businessTypes.slice(0, 2).map((type) => (
            <span
              key={type}
              className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs rounded"
            >
              {getBusinessTypeLabel(type)}
            </span>
          ))}
          {shop.businessTypes && shop.businessTypes.length > 2 && (
            <span className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs rounded">
              +{shop.businessTypes.length - 2}
            </span>
          )}
        </div>

        <p className="text-sm text-neutral-600 leading-relaxed line-clamp-2">
          {shop.description}
        </p>
      </div>
    </button>
  );
};

export default HomePage;
