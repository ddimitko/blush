import React, { useState } from 'react';
import { Star, MessageSquare, User, Calendar, Clock } from 'lucide-react';
import { Appointment } from '../../types';
import { useToast } from '../ui/Toast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { formatDate, formatTime } from '../../lib/utils';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
  onSubmit: (reviewData: ReviewData) => Promise<void>;
}

interface ReviewData {
  rating: number;
  comment: string;
  appointmentId: string;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onSubmit,
}) => {
  const { success, error } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      error('Please select a rating', 'Rating is required to submit your review.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        rating,
        comment: comment.trim(),
        appointmentId: appointment.id,
      });

      success('Review submitted', 'Thank you for your feedback!');
      onClose();
      
      // Reset form
      setRating(0);
      setComment('');
    } catch (err: any) {
      error('Failed to submit review', err.message || 'Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setComment('');
    onClose();
  };

  const renderStars = () => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="p-1 transition-colors"
          >
            <Star
              className={`w-8 h-8 ${
                star <= (hoveredRating || rating)
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const getRatingText = () => {
    const currentRating = hoveredRating || rating;
    switch (currentRating) {
      case 1:
        return 'Poor';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Very Good';
      case 5:
        return 'Excellent';
      default:
        return 'Select a rating';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Leave a Review"
      size="lg"
    >
      <div className="space-y-6">
        {/* Appointment Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Your Appointment</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center">
              <User className="w-4 h-4 mr-2" />
              <span>{appointment.service.name} with {appointment.employee.firstName} {appointment.employee.lastName}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{formatDate(appointment.appointmentDateTime)}</span>
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              <span>{formatTime(appointment.appointmentDateTime)}</span>
            </div>
            <div className="flex items-center">
              <span className="font-medium">{appointment.shop.name}</span>
            </div>
          </div>
        </div>

        {/* Rating Section */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            How would you rate your experience?
          </label>
          <div className="flex items-center space-x-4">
            {renderStars()}
            <span className="text-sm font-medium text-gray-600">
              {getRatingText()}
            </span>
          </div>
        </div>

        {/* Comment Section */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Share your experience (optional)
            </label>
            <textarea
              placeholder="Tell others about your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
            />
          </div>
          <p className="text-xs text-gray-500">
            {comment.length}/500 characters
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={rating === 0}
          >
            Submit Review
          </Button>
        </div>

        {/* Rating Guidelines */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h5 className="text-sm font-medium text-blue-900 mb-2">
            Rating Guidelines
          </h5>
          <div className="text-xs text-blue-800 space-y-1">
            <div className="flex items-center">
              <div className="flex mr-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3 h-3 ${
                      star <= 5 ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span>Excellent - Exceeded expectations</span>
            </div>
            <div className="flex items-center">
              <div className="flex mr-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3 h-3 ${
                      star <= 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span>Very Good - Above expectations</span>
            </div>
            <div className="flex items-center">
              <div className="flex mr-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3 h-3 ${
                      star <= 3 ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span>Good - Met expectations</span>
            </div>
            <div className="flex items-center">
              <div className="flex mr-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3 h-3 ${
                      star <= 2 ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span>Fair - Below expectations</span>
            </div>
            <div className="flex items-center">
              <div className="flex mr-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3 h-3 ${
                      star <= 1 ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span>Poor - Well below expectations</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ReviewModal;
