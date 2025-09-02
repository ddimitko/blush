import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Shop } from '../../types';
import ShopSelector from './ShopSelector';

interface DashboardLayoutProps {
  children: React.ReactNode;
  shops: Shop[];
  selectedShop: Shop | null;
  onShopSelect: (shop: Shop) => void;
  isLoadingShops?: boolean;
  className?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  shops,
  selectedShop,
  onShopSelect,
  isLoadingShops = false,
  className
}) => {
  return (
    <div className={cn("min-h-screen bg-gray-50", className)}>
      {/* Dashboard Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Logo and Shop Selector */}
            <div className="flex items-center space-x-6">
              {/* Logo */}
              <Link to="/" className="flex items-center space-x-3 group">
                <div className="w-8 h-8 bg-gray-900 rounded flex items-center justify-center group-hover:bg-accent-600 transition-colors">
                  <span className="text-white font-bold text-sm">BH</span>
                </div>
              </Link>

              {/* Shop Selector */}
              <ShopSelector
                shops={shops}
                selectedShop={selectedShop}
                onShopSelect={onShopSelect}
                isLoading={isLoadingShops}
              />
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Back to BeautyHub
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
