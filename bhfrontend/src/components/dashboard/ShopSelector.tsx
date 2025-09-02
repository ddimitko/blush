import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Building2, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Shop } from '../../types';
import { useShopsStripeStatus } from '../../hooks/useShopStripeDetails';

interface ShopSelectorProps {
  shops: Shop[];
  selectedShop: Shop | null;
  onShopSelect: (shop: Shop) => void;
  isLoading?: boolean;
}

const ShopSelector: React.FC<ShopSelectorProps> = ({
  shops,
  selectedShop,
  onShopSelect,
  isLoading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch Stripe status for all shops
  const { shopStatuses, isLoading: statusLoading } = useShopsStripeStatus(shops);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleShopSelect = (shop: Shop) => {
    onShopSelect(shop);
    setIsOpen(false);
  };

  const getSubscriptionStatusIndicator = (shop: Shop) => {
    const stripeStatus = shopStatuses[shop.id];

    if (!shop.active || !stripeStatus?.isActive || stripeStatus?.status === 'incomplete') {
      return (
        <div className="flex items-center space-x-1">
          <AlertCircle className="w-3 h-3 text-amber-500" />
          <span className="text-xs text-amber-600">Setup Required</span>
        </div>
      );
    }

    if (stripeStatus?.status === 'active' || stripeStatus?.status === 'trialing') {
      return (
        <div className="flex items-center space-x-1">
          <CheckCircle className="w-3 h-3 text-green-500" />
          <span className="text-xs text-green-600">Active</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-1">
        <AlertCircle className="w-3 h-3 text-red-500" />
        <span className="text-xs text-red-600">Inactive</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded animate-pulse">
        <div className="w-4 h-4 bg-gray-300 rounded"></div>
        <div className="w-32 h-4 bg-gray-300 rounded"></div>
      </div>
    );
  }

  return (
    <div className="relative shop-selector" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center space-x-2 px-3 py-2 text-sm font-medium transition-all duration-200",
          "hover:bg-gray-50 rounded-lg border border-transparent",
          "focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2",
          isOpen && "bg-gray-50 border-gray-200"
        )}
      >
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-gray-500" />
          <span className="text-gray-700 max-w-32 truncate">
            {selectedShop ? selectedShop.name : 'Select Shop'}
          </span>
        </div>
        <ChevronDown 
          className={cn(
            "w-4 h-4 text-gray-500 transition-transform duration-200",
            isOpen && "rotate-180"
          )} 
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-elegant-lg border border-gray-200 py-2 z-50 animate-slide-down">
          <div className="px-3 py-2 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Select Shop</h3>
            <p className="text-xs text-gray-500 mt-1">Choose which shop to manage</p>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {shops.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No shops found</p>
                <p className="text-xs text-gray-400 mt-1">Create your first shop to get started</p>
              </div>
            ) : (
              shops.map((shop) => (
                <button
                  key={shop.id}
                  onClick={() => handleShopSelect(shop)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-3 text-left",
                    "hover:bg-gray-50 transition-colors duration-150",
                    "focus:outline-none focus:bg-gray-50",
                    selectedShop?.id === shop.id && "bg-accent-50"
                  )}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      selectedShop?.id === shop.id ? "bg-accent-100" : "bg-gray-100"
                    )}>
                      <Building2 className={cn(
                        "w-4 h-4",
                        selectedShop?.id === shop.id ? "text-accent-600" : "text-gray-500"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        selectedShop?.id === shop.id ? "text-accent-900" : "text-gray-900"
                      )}>
                        {shop.name}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500 truncate">
                          {shop.city}, {shop.state || shop.country}
                        </p>
                        {getSubscriptionStatusIndicator(shop)}
                      </div>
                    </div>
                  </div>
                  
                  {selectedShop?.id === shop.id && (
                    <Check className="w-4 h-4 text-accent-600 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
          
          {shops.length > 0 && (
            <div className="border-t border-gray-100 px-3 py-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to shop creation
                  window.location.href = '/shop/create';
                }}
                className="w-full text-left px-2 py-2 text-sm text-accent-600 hover:text-accent-700 hover:bg-accent-50 rounded transition-colors duration-150"
              >
                + Create New Shop
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ShopSelector;
