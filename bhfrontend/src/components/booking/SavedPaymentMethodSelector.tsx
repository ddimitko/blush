import React, { useState } from 'react';
import { CreditCard, Plus, Star, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useUserPaymentMethodsQuery } from '../../hooks/queries/useUserPaymentMethodsQueries';
import { UserPaymentMethod } from '../../types';

interface SavedPaymentMethodSelectorProps {
  onSelectSavedMethod: (paymentMethod: UserPaymentMethod) => void;
  onSelectNewMethod: () => void;
  selectedMethodId?: string;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

const SavedPaymentMethodSelector: React.FC<SavedPaymentMethodSelectorProps> = ({
  onSelectSavedMethod,
  onSelectNewMethod,
  selectedMethodId,
  isExpanded,
  onToggleExpanded,
}) => {
  const { data: paymentMethodsData, isLoading, error } = useUserPaymentMethodsQuery();
  const paymentMethods = paymentMethodsData?.paymentMethods || [];

  const formatCardBrand = (brand: string) => {
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  const formatExpiryDate = (month: number, year: number) => {
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  };

  const getCardBrandIcon = (brand: string) => {
    const brandLower = brand.toLowerCase();
    switch (brandLower) {
      case 'visa':
        return '💳';
      case 'mastercard':
        return '💳';
      case 'amex':
        return '💳';
      case 'discover':
        return '💳';
      default:
        return '💳';
    }
  };

  const defaultPaymentMethod = paymentMethods.find(pm => pm.isDefault);
  const otherPaymentMethods = paymentMethods.filter(pm => !pm.isDefault);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      <button
        onClick={onToggleExpanded}
        className={`
          w-full p-5 text-left transition-all duration-300 transform hover:scale-[1.01]
          ${isExpanded
            ? 'bg-blue-50 border-blue-200'
            : 'bg-white hover:bg-blue-50/30'
          }
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center
              ${isExpanded
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600'
              }
            `}>
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Saved Payment Methods</h4>
              <p className="text-sm text-gray-600">
                {isLoading ? 'Loading...' : 
                 paymentMethods.length === 0 ? 'No saved methods' :
                 `${paymentMethods.length} saved method${paymentMethods.length > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-green-500" />
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="p-5 bg-gray-50 border-t border-gray-200">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <LoadingSpinner size="sm" />
              <span className="ml-2 text-sm text-gray-600">Loading payment methods...</span>
            </div>
          ) : error ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">Failed to load payment methods</p>
            </div>
          ) : paymentMethods.length === 0 ? (
            <div className="text-center py-4">
              <CreditCard className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-3">No saved payment methods</p>
              <Button
                variant="outline"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={onSelectNewMethod}
              >
                Add Payment Method
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Default Payment Method */}
              {defaultPaymentMethod && (
                <div
                  className={`
                    p-3 border rounded-lg cursor-pointer transition-all
                    ${selectedMethodId === defaultPaymentMethod.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                    }
                  `}
                  onClick={() => onSelectSavedMethod(defaultPaymentMethod)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg">
                        <span className="text-sm">{getCardBrandIcon(defaultPaymentMethod.card?.brand || '')}</span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {formatCardBrand(defaultPaymentMethod.card?.brand || '')}
                          </span>
                          <span className="text-gray-500">•••• {defaultPaymentMethod.card?.last4}</span>
                          <div className="flex items-center space-x-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                            <Star className="w-3 h-3 fill-current" />
                            <span>Default</span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          Expires {formatExpiryDate(defaultPaymentMethod.card?.expMonth || 0, defaultPaymentMethod.card?.expYear || 0)}
                        </div>
                      </div>
                    </div>
                    <div className={`
                      w-4 h-4 rounded-full border-2 flex items-center justify-center
                      ${selectedMethodId === defaultPaymentMethod.id
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                      }
                    `}>
                      {selectedMethodId === defaultPaymentMethod.id && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Other Payment Methods */}
              {otherPaymentMethods.map((paymentMethod) => (
                <div
                  key={paymentMethod.id}
                  className={`
                    p-3 border rounded-lg cursor-pointer transition-all
                    ${selectedMethodId === paymentMethod.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                    }
                  `}
                  onClick={() => onSelectSavedMethod(paymentMethod)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg">
                        <span className="text-sm">{getCardBrandIcon(paymentMethod.card?.brand || '')}</span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {formatCardBrand(paymentMethod.card?.brand || '')}
                          </span>
                          <span className="text-gray-500">•••• {paymentMethod.card?.last4}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          Expires {formatExpiryDate(paymentMethod.card?.expMonth || 0, paymentMethod.card?.expYear || 0)}
                        </div>
                      </div>
                    </div>
                    <div className={`
                      w-4 h-4 rounded-full border-2 flex items-center justify-center
                      ${selectedMethodId === paymentMethod.id
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                      }
                    `}>
                      {selectedMethodId === paymentMethod.id && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Add New Payment Method Option */}
              <div
                className={`
                  p-3 border-2 border-dashed rounded-lg cursor-pointer transition-all hover:border-blue-300 hover:bg-blue-50/30
                  ${selectedMethodId === 'new'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300'
                  }
                `}
                onClick={onSelectNewMethod}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg">
                      <Plus className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">Add New Payment Method</span>
                      <div className="text-sm text-gray-500">Use a different card</div>
                    </div>
                  </div>
                  <div className={`
                    w-4 h-4 rounded-full border-2 flex items-center justify-center
                    ${selectedMethodId === 'new'
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                    }
                  `}>
                    {selectedMethodId === 'new' && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SavedPaymentMethodSelector;
