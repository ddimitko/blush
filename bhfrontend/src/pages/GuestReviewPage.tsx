import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Star, Calendar, Clock, User, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import { useGuestAppointmentForReviewQuery, useSubmitGuestReviewMutation } from '../hooks/queries/useGuestReviewQueries';
import { useToast } from '../components/ui/Toast';
import { useGuestReview } from '../hooks/useGuestReview';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { formatDate, formatTime } from '../lib/utils';
import { GuestReviewRequest } from '../types';

const GuestReviewPage: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const { navigateToGuestReviewSuccess } = useGuestReview();

  const guestEmail = searchParams.get('email') || '';
  
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries
  const {
    data: appointmentData,
    isLoading,
    error: appointmentError,
  } = useGuestAppointmentForReviewQuery(appointmentId || '', guestEmail);

  const submitReviewMutation = useSubmitGuestReviewMutation();

  // Redirect if no appointment ID or email
  useEffect(() => {
    if (!appointmentId || !guestEmail) {
      navigate('/', { replace: true });
    }
  }, [appointmentId, guestEmail, navigate]);

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

    setIsSubmitting(true);

    try {
      const reviewData: GuestReviewRequest = {
        appointmentId: appointmentId!,
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
          ? 'Thank you for your feedback! Your account has been created. Please check your email to verify your account.'
          : 'Thank you for your feedback!'
      );

      // Navigate to success page with details
      navigateToGuestReviewSuccess({
        accountCreated: response.review.accountCreated,
        rating: response.review.stars,
        shopName: response.review.shopName,
      });

    } catch (err: any) {
      error('Failed to submit review', err?.response?.data?.message || 'Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <div className="flex items-center justify-center space-x-2">
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
              className={`w-10 h-10 ${
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading appointment details...</p>
        </div>
      </div>
    );
  }

  if (appointmentError || !appointmentData?.appointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Unable to Load Appointment
          </h1>
          <p className="text-gray-600 mb-6">
            {(appointmentError as any)?.response?.data?.message ||
             'This appointment could not be found or you may not have permission to review it.'}
          </p>
          <Button onClick={() => navigate('/')}>
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  const appointment = appointmentData.appointment;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8 text-white text-center">
            <h1 className="text-3xl font-bold mb-2">How was your appointment?</h1>
            <p className="text-blue-100">Your feedback helps others discover great services</p>
          </div>

          {/* Appointment Details */}
          <div className="px-6 py-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Appointment Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Shop</p>
                  <p className="font-medium text-gray-900">{appointment.shopName}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Service Provider</p>
                  <p className="font-medium text-gray-900">{appointment.employeeName}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Service</p>
                  <p className="font-medium text-gray-900">{appointment.serviceName}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Date & Time</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(appointment.appointmentDateTime)} at {formatTime(appointment.appointmentDateTime)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Review Form */}
          <form onSubmit={handleSubmit} className="px-6 py-6">
            {/* Rating */}
            <div className="mb-8">
              <label className="block text-lg font-medium text-gray-900 mb-4 text-center">
                Rate your experience
              </label>
              {renderStars()}
              <p className="text-center mt-2 text-sm text-gray-600">
                {getRatingText()}
              </p>
            </div>

            {/* Comment */}
            <div className="mb-6">
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
            <div className="mb-6">
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
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
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
                      required
                    />
                    <Input
                      label="Last Name *"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                  <Input
                    label="Password *"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    helperText="Minimum 8 characters"
                  />
                  <Input
                    label="Phone Number (optional)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
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

            {/* Submit Button */}
            <div className="flex justify-center">
              <Button
                type="submit"
                disabled={isSubmitting || rating === 0}
                className="px-8 py-3 text-lg"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Submitting Review...
                  </>
                ) : (
                  'Submit Review'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GuestReviewPage;
