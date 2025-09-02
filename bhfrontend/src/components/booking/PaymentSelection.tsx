import React from 'react';
import { CreditCard, DollarSign, Shield, Clock } from 'lucide-react';
import { Shop, PaymentMethod } from '../../types';
import Button from '../ui/Button';

interface PaymentSelectionProps {
  shop: Shop;
  selectedPaymentMethod: PaymentMethod;
  onPaymentMethodSelect: (method: PaymentMethod) => void;
  onNext: () => void;
}

const PaymentSelection: React.FC<PaymentSelectionProps> = ({
  shop,
  selectedPaymentMethod,
  onPaymentMethodSelect,
  onNext,
}) => {
  const handleMethodSelect = (method: PaymentMethod) => {
    onPaymentMethodSelect(method);
  };

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-6">
        Payment Method
      </h3>
      
      <div className="space-y-4">
        {/* Card Payment */}
        {shop.acceptsCardPayments && (
          <div
            className={`
              border rounded-lg p-4 cursor-pointer transition-all
              ${selectedPaymentMethod === 'CARD'
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
            onClick={() => handleMethodSelect('CARD')}
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className={`
                  w-12 h-12 rounded-lg flex items-center justify-center
                  ${selectedPaymentMethod === 'CARD'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600'
                  }
                `}>
                  <CreditCard className="h-6 w-6" />
                </div>
              </div>
              
              <div className="flex-1">
                <h4 className="text-lg font-medium text-gray-900 mb-1">
                  Pay with Card
                </h4>
                <p className="text-gray-600 text-sm mb-3">
                  Secure payment with credit or debit card
                </p>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 mr-1" />
                    Secure
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Instant confirmation
                  </div>
                </div>
                
                {/* Card Icons */}
                <div className="flex items-center space-x-2 mt-3">
                  <div className="text-xs text-gray-500">Accepted:</div>
                  <div className="flex space-x-1">
                    <div className="w-8 h-5 bg-blue-600 rounded text-white text-xs flex items-center justify-center font-bold">
                      VISA
                    </div>
                    <div className="w-8 h-5 bg-red-600 rounded text-white text-xs flex items-center justify-center font-bold">
                      MC
                    </div>
                    <div className="w-8 h-5 bg-blue-500 rounded text-white text-xs flex items-center justify-center font-bold">
                      AMEX
                    </div>
                  </div>
                </div>
              </div>
              
              {selectedPaymentMethod === 'CARD' && (
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Cash Payment */}
        <div
          className={`
            border rounded-lg p-4 cursor-pointer transition-all
            ${selectedPaymentMethod === 'CASH'
              ? 'border-gray-900 bg-gray-50'
              : 'border-gray-200 hover:border-gray-300'
            }
          `}
          onClick={() => handleMethodSelect('CASH')}
        >
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className={`
                w-12 h-12 rounded-lg flex items-center justify-center
                ${selectedPaymentMethod === 'CASH'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600'
                }
              `}>
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
            
            <div className="flex-1">
              <h4 className="text-lg font-medium text-gray-900 mb-1">
                Pay at Shop
              </h4>
              <p className="text-gray-600 text-sm mb-3">
                Pay with cash or card when you arrive
              </p>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Pay on arrival
                </div>
                <div>No upfront payment required</div>
              </div>
            </div>
            
            {selectedPaymentMethod === 'CASH' && (
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Payment Method Info */}
      {selectedPaymentMethod === 'CARD' && shop.acceptsCardPayments && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">
            Secure Card Payment
          </h4>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• Payment will be processed securely through Stripe</li>
            <li>• Your card details are encrypted and never stored</li>
            <li>• You'll receive an instant confirmation</li>
            <li>• Refunds are processed automatically if you cancel</li>
          </ul>
        </div>
      )}
      
      {selectedPaymentMethod === 'CASH' && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-medium text-green-900 mb-2">
            Pay at Shop
          </h4>
          <ul className="text-green-700 text-sm space-y-1">
            <li>• No upfront payment required</li>
            <li>• Pay with cash or card when you arrive</li>
            <li>• Your appointment is reserved without payment</li>
            <li>• Please arrive on time to avoid cancellation</li>
          </ul>
        </div>
      )}
      
      {/* Card Payments Disabled Notice */}
      {!shop.acceptsCardPayments && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">
            Payment Information
          </h4>
          <p className="text-yellow-700 text-sm">
            This shop currently accepts cash payments only. 
            You can pay when you arrive for your appointment.
          </p>
        </div>
      )}
      
      {/* Continue Button */}
      <div className="flex justify-end mt-8">
        <Button
          onClick={onNext}
          size="lg"
          disabled={!selectedPaymentMethod}
        >
          Review Booking
        </Button>
      </div>
    </div>
  );
};

export default PaymentSelection;
