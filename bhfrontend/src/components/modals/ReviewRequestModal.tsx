import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, User, Calendar, Clock, X } from 'lucide-react';
import { Appointment } from '../../types';
import { useToast } from '../ui/Toast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { formatDate, formatTime } from '../../lib/utils';

interface ReviewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
  onSubmit: (reviewData: ReviewData) => Promise<void>;
}

interface ReviewData {
  rating: number;
  comment: string;
  appointmentId: string;
  anonymous?: boolean;
}

const ReviewRequestModal: React.FC<ReviewRequestModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onSubmit,
}) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error } = useToast();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setRating(0);
      setHoveredRating(0);
      setComment('');
      setAnonymous(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

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
        anonymous,
      });

      success('Review submitted', 'Thank you for your feedback!');
      onClose();
    } catch (err: any) {
      error('Failed to submit review', err.message || 'Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setHoveredRating(0);
    setComment('');
    setAnonymous(false);
    onClose();
  };

  const handleSkip = () => {
    // Just close the modal without submitting
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="How was your appointment?"
      size="lg"
    >
      <div className="space-y-6">
        {/* Appointment Details */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{appointment.service.name}</h3>
              <p className="text-sm text-gray-600">
                with {appointment.employee.firstName} {appointment.employee.lastName}
              </p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(appointment.appointmentDateTime)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(appointment.appointmentDateTime)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rating Section */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Rate your experience *
          </label>
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
              >
                <Star
                  className={`w-8 h-8 transition-colors duration-200 ${
                    star <= (hoveredRating || rating)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-3 text-sm text-gray-600">
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </span>
            )}
          </div>
        </div>

        {/* Comment Section */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Share your experience (optional)
          </label>
          <div className="relative">
            <MessageSquare className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell others about your experience..."
              rows={4}
              maxLength={500}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>Help others by sharing your honest feedback</span>
            <span>{comment.length}/500</span>
          </div>
        </div>

        {/* Anonymous Option */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="anonymous"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="anonymous" className="text-sm text-gray-700">
            Submit review anonymously
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="text-gray-600 hover:text-gray-800"
          >
            Skip for now
          </Button>
          
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || rating === 0}
              isLoading={isSubmitting}
            >
              Submit Review
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ReviewRequestModal;
