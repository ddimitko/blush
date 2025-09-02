import React from 'react';
import { Clock, DollarSign, Star, Sparkles } from 'lucide-react';
import { Service } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface ServiceSelectionProps {
  services: Service[];
  selectedService: Service | null;
  onServiceSelect: (service: Service) => void;
  shopCountry?: string;
  onBack?: () => void; // Optional since this is step 1
}

const ServiceSelection: React.FC<ServiceSelectionProps> = ({
  services,
  selectedService,
  onServiceSelect,
  shopCountry = 'US',
}) => {
  if (services.length === 0) {
    return (
      <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl">
        <div className="relative">
          <Sparkles className="h-16 w-16 mx-auto mb-4 text-gray-300 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <DollarSign className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No Services Available
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          This shop doesn't have any services available for booking at the moment.
          Please check back later or contact the shop directly.
        </p>
      </div>
    );
  }

  const handleServiceSelect = (service: Service) => {
    onServiceSelect(service);
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-accent-100 rounded-lg mr-3">
            <Sparkles className="h-6 w-6 text-accent-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-neutral-800">
              Choose Your Service
            </h3>
            <p className="text-neutral-600 text-sm">
              Select the perfect treatment for you
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-neutral-600">
            Discover our premium services designed to enhance your natural beauty
          </p>
          <div className="text-sm text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full">
            {services.length} service{services.length !== 1 ? 's' : ''} available
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {services.map((service, index) => (
          <div
            key={service.id}
            className={`
              group border rounded-2xl p-6 cursor-pointer transition-all duration-500 transform hover:scale-[1.02] hover:-translate-y-2
              ${selectedService?.id === service.id
                ? 'border-accent-500 bg-gradient-to-br from-accent-50 to-accent-100 shadow-2xl ring-2 ring-accent-500 ring-opacity-30 scale-[1.02] -translate-y-2'
                : 'border-neutral-200 hover:border-accent-300 hover:bg-gradient-to-br hover:from-accent-50/30 hover:to-accent-100/30 hover:shadow-xl bg-white'
              }
            `}
            onClick={() => handleServiceSelect(service)}
            style={{ animationDelay: `${index * 150}ms` }}
            role="button"
            tabIndex={0}
            aria-pressed={selectedService?.id === service.id}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleServiceSelect(service);
              }
            }}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center mb-3">
                  <h4 className="text-xl font-semibold text-neutral-800 group-hover:text-accent-700 transition-colors duration-300">
                    {service.name}
                  </h4>
                  {/* Featured service indicator - can be added to Service type later */}
                  {(service as any).featured && (
                    <Star className="h-5 w-5 text-accent-500 ml-2 fill-current" />
                  )}
                </div>

                {service.description && (
                  <p className="text-neutral-600 mb-4 leading-relaxed group-hover:text-neutral-700 transition-colors duration-300">
                    {service.description}
                  </p>
                )}

                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center text-neutral-600 group-hover:text-accent-600 transition-colors duration-300">
                    <Clock className="h-4 w-4 mr-2 text-accent-500" />
                    <span className="font-medium">{service.durationMinutes} minutes</span>
                  </div>

                  {service.category && (
                    <div className="px-3 py-1 bg-gradient-to-r from-accent-100 to-accent-200 text-accent-700 rounded-full text-xs font-medium">
                      {service.category}
                    </div>
                  )}

                  {(service as any).difficulty && (
                    <div className="flex items-center text-neutral-500">
                      <span className="text-xs">Difficulty: {(service as any).difficulty}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right ml-6">
                <div className={`text-2xl font-bold transition-all duration-300 ${
                  selectedService?.id === service.id
                    ? 'text-accent-600 scale-110'
                    : 'text-neutral-800 group-hover:text-accent-600 group-hover:scale-105'
                }`}>
                  {formatCurrency(service.price, shopCountry)}
                </div>
                {(service as any).originalPrice && (service as any).originalPrice > service.price && (
                  <div className="text-sm text-neutral-500 line-through">
                    {formatCurrency((service as any).originalPrice, shopCountry)}
                  </div>
                )}
                {selectedService?.id === service.id && (
                  <div className="text-xs text-accent-600 font-medium mt-1">
                    Selected
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServiceSelection;
