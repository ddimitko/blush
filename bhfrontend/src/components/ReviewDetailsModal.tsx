import React from 'react';
import { X, Star, User } from 'lucide-react';
import Button from './ui/Button';

interface Review {
  id: string;
  stars: number;
  comment?: string;
  anonymous: boolean;
  imageUrl?: string;
  userName: string;
  shopName: string;
  employeeName: string;
  serviceName: string;
  appointmentId: string;
  createdAt: string;
  formattedDate: string;
}

interface ReviewDetailsModalProps {
  review: Review;
  isOpen: boolean;
  onClose: () => void;
}

export const ReviewDetailsModal: React.FC<ReviewDetailsModalProps> = ({
  review,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Review Details</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Reviewer Info */}
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-accent-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-accent-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{review.userName}</p>
              <p className="text-sm text-gray-500">{review.formattedDate}</p>
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < review.stars ? 'text-yellow-400 fill-current' : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-600">({review.stars} out of 5 stars)</span>
          </div>

          {/* Service Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Service Details</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Service:</span> {review.serviceName}</p>
              <p><span className="font-medium">Employee:</span> {review.employeeName}</p>
              <p><span className="font-medium">Shop:</span> {review.shopName}</p>
            </div>
          </div>

          {/* Review Image */}
          {review.imageUrl && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Photo</h3>
              <div className="rounded-lg overflow-hidden">
                <img
                  src={`${process.env.REACT_APP_API_URL}${review.imageUrl}`}
                  alt="Review photo"
                  className="w-full h-auto max-h-96 object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}

          {/* Comment */}
          {review.comment && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Comment</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed">{review.comment}</p>
              </div>
            </div>
          )}

          {/* No comment message */}
          {!review.comment && (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">No written comment provided</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
