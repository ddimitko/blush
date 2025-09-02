import React, { useState } from 'react';
import { Star, User, Mail, Lock, Phone } from 'lucide-react';
import { useSubmitGuestReviewMutation } from '../../hooks/queries/useGuestReviewQueries';
import { useToast } from '../ui/Toast';
import Button from '../ui/Button';
import Input from '../ui/Input';
import LoadingSpinner from '../ui/LoadingSpinner';
import { GuestReviewRequest, GuestAppointmentForReview } from '../../types';

interface GuestReviewFormProps {
  appointment: GuestAppointmentForReview;
  guestEmail: string;
  onSuccess?: (response: any) => void;
  onCancel?: () => void;
}

const GuestReviewForm: React.FC<GuestReviewFormProps> = ({
  appointment,
  guestEmail,
  onSuccess,
  onCancel,
}) => {
  const { success, error } = useToast();
  
  // Form state
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [createAccount, setCreateAccount] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const submitReviewMutation = useSubmitGuestReviewMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      error('Please select a rating', 'Rating is required to submit your review.');
      return;
    }

    if (createAccount && (!firstName || !lastName || !password)) {
      error('Please fill in all required fields', 'First name, last name, and password are required to create an account.');
      return;
    }

    try {
      const reviewData: GuestReviewRequest = {
        appointmentId: appointment.id,
        guestEmail,
        stars: rating,
        comment: comment.trim(),
        anonymous,
        createAccount,
        ...(createAccount && {
          firstName,
          lastName,
          password,
          phoneNumber: phoneNumber || undefined,
        }),
      };

      const response = await submitReviewMutation.mutateAsync(reviewData);
      
      success(
        'Review submitted successfully!',
        response.review.accountCreated 
          ? 'Thank you for your feedback! Your account has been created.'
          : 'Thank you for your feedback!'
      );

      onSuccess?.(response);

    } catch (err: any) {
      error('Failed to submit review', err?.response?.data?.message || 'Please try again later.');
    }
  };

  const renderStars = () => {
    return (
      <div className="flex items-center justify-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="p-1 transition-all duration-200 hover:scale-110"
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
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return 'Select a rating';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        Rate Your Experience
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating */}
        <div>
          <label className="block text-lg font-medium text-gray-900 mb-4 text-center">
            How was your experience?
          </label>
          {renderStars()}
          <p className="text-center mt-2 text-sm text-gray-600">
            {getRatingText()}
          </p>
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Share your experience (optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Tell others about your experience..."
            maxLength={1000}
          />
          <p className="text-xs text-gray-500 mt-1">
            {comment.length}/1000 characters
          </p>
        </div>

        {/* Anonymous option */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">
              Submit review anonymously
            </span>
          </label>
        </div>

        {/* Account Creation Section */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              id="createAccount"
              checked={createAccount}
              onChange={(e) => setCreateAccount(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="createAccount" className="ml-2 text-sm font-medium text-gray-900">
              Create a Lunara account to track your appointments
            </label>
          </div>
          
          {createAccount && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="First Name *"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  icon={<User className="w-4 h-4" />}
                  required
                />
                <Input
                  label="Last Name *"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  icon={<User className="w-4 h-4" />}
                  required
                />
              </div>
              <Input
                label="Password *"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                required
                helperText="Minimum 8 characters"
              />
              <Input
                label="Phone Number (optional)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                icon={<Phone className="w-4 h-4" />}
                placeholder="+1234567890"
              />
              <div className="text-xs text-gray-600">
                <p className="font-medium mb-1">Benefits of creating an account:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>View your appointment history</li>
                  <li>Book future appointments faster</li>
                  <li>Receive personalized recommendations</li>
                  <li>Get exclusive offers and updates</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="px-6 py-2"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={submitReviewMutation.isPending || rating === 0}
            className="px-8 py-2"
          >
            {submitReviewMutation.isPending ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Submitting...
              </>
            ) : (
              'Submit Review'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default GuestReviewForm;
