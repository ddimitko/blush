import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Star, Home, UserPlus, Mail } from 'lucide-react';
import Button from '../components/ui/Button';

const GuestReviewSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const accountCreated = searchParams.get('accountCreated') === 'true';
  const rating = searchParams.get('rating');
  const shopName = searchParams.get('shopName');

  // Auto-redirect after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/', { replace: true });
    }, 10000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden text-center">
          {/* Success Icon */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-8">
            <CheckCircle className="w-16 h-16 text-white mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">
              Review Submitted Successfully!
            </h1>
            <p className="text-green-100">
              Thank you for sharing your experience
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-8">
            {/* Rating Display */}
            {rating && (
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">Your rating</p>
                <div className="flex justify-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-6 h-6 ${
                        star <= parseInt(rating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Shop Name */}
            {shopName && (
              <p className="text-gray-600 mb-6">
                Your review for <span className="font-semibold">{shopName}</span> has been published
              </p>
            )}

            {/* Account Creation Success */}
            {accountCreated && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center mb-2">
                  <UserPlus className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-900">Account Created!</span>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  Your Lunara account has been successfully created.
                </p>
                <div className="flex items-center justify-center text-sm text-blue-600">
                  <Mail className="w-4 h-4 mr-1" />
                  <span>Check your email to verify your account</span>
                </div>
              </div>
            )}

            {/* Benefits */}
            <div className="text-left mb-6">
              <h3 className="font-medium text-gray-900 mb-3">What happens next?</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Your review is now visible to other customers</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>You're helping others discover great beauty services</span>
                </li>
                {accountCreated && (
                  <>
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>You can now track your appointment history</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Book future appointments faster with your account</span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={() => navigate('/')}
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                Return to Home
              </Button>
              
              <Button
                onClick={() => navigate('/search')}
                variant="outline"
                className="w-full"
              >
                Discover More Shops
              </Button>
            </div>

            {/* Auto-redirect notice */}
            <p className="text-xs text-gray-500 mt-6">
              You will be automatically redirected to the home page in a few seconds
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestReviewSuccessPage;
