import React, { useState } from 'react';
import { CreditCard, Trash2, AlertCircle, Star, StarOff } from 'lucide-react';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';
import { useRemoveUserPaymentMethodMutation, useSetDefaultPaymentMethodMutation } from '../../hooks/queries/useUserPaymentMethodsQueries';
import { UserPaymentMethod } from '../../types';

interface PaymentMethodCardProps {
  paymentMethod: UserPaymentMethod;
}

const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({ paymentMethod }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { success, error } = useToast();
  const removePaymentMethodMutation = useRemoveUserPaymentMethodMutation();
  const setDefaultPaymentMethodMutation = useSetDefaultPaymentMethodMutation();

  const handleDelete = async () => {
    try {
      await removePaymentMethodMutation.mutateAsync(paymentMethod.id);
      success('Payment method removed successfully');
      setShowDeleteConfirm(false);
    } catch (err: any) {
      error(
        err?.response?.data?.message || 'Failed to remove payment method'
      );
    }
  };

  const handleSetDefault = async () => {
    try {
      await setDefaultPaymentMethodMutation.mutateAsync(paymentMethod.id);
      success('Default payment method updated successfully');
    } catch (err: any) {
      error(
        err?.response?.data?.message || 'Failed to set default payment method'
      );
    }
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

  const formatCardBrand = (brand: string) => {
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  const formatExpiryDate = (month: number, year: number) => {
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  };

  if (!paymentMethod.card) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg">
            <span className="text-lg">{getCardBrandIcon(paymentMethod.card.brand)}</span>
          </div>
          
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">
                {formatCardBrand(paymentMethod.card.brand)}
              </span>
              <span className="text-gray-500">•••• {paymentMethod.card.last4}</span>
              {paymentMethod.isDefault && (
                <div className="flex items-center space-x-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                  <Star className="w-3 h-3 fill-current" />
                  <span>Default</span>
                </div>
              )}
            </div>
            <div className="text-sm text-gray-500">
              Expires {formatExpiryDate(paymentMethod.card.expMonth, paymentMethod.card.expYear)}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {!showDeleteConfirm ? (
            <>
              {!paymentMethod.isDefault && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Star className="w-4 h-4" />}
                  onClick={handleSetDefault}
                  isLoading={setDefaultPaymentMethodMutation.isPending}
                  className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                >
                  Set Default
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                disabled={paymentMethod.isDefault}
              >
                Remove
              </Button>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="flex items-center text-sm text-red-600">
                <AlertCircle className="w-4 h-4 mr-1" />
                {paymentMethod.isDefault ? 'Cannot remove default payment method' : 'Remove this card?'}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                className="text-gray-600 hover:text-gray-700"
              >
                Cancel
              </Button>
              {!paymentMethod.isDefault && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDelete}
                  isLoading={removePaymentMethodMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Remove
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodCard;
