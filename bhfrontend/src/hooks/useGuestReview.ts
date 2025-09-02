import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';

interface UseGuestReviewProps {
  appointmentId?: string;
  guestEmail?: string;
}

export const useGuestReview = ({ appointmentId, guestEmail }: UseGuestReviewProps = {}) => {
  const navigate = useNavigate();
  const { error } = useToast();
  const [isValidGuestReview, setIsValidGuestReview] = useState(false);

  useEffect(() => {
    if (appointmentId && guestEmail) {
      // Basic validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValidEmail = emailRegex.test(guestEmail);
      const isValidId = appointmentId.length > 0;
      
      setIsValidGuestReview(isValidEmail && isValidId);
      
      if (!isValidEmail || !isValidId) {
        error('Invalid review link', 'This review link appears to be invalid or corrupted.');
      }
    }
  }, [appointmentId, guestEmail, error]);

  const navigateToGuestReview = (appointmentId: string, guestEmail: string) => {
    const encodedEmail = encodeURIComponent(guestEmail);
    navigate(`/guest-review/${appointmentId}?email=${encodedEmail}`);
  };

  const navigateToGuestReviewSuccess = (params?: {
    accountCreated?: boolean;
    rating?: number;
    shopName?: string;
  }) => {
    const searchParams = new URLSearchParams();
    
    if (params?.accountCreated) {
      searchParams.set('accountCreated', 'true');
    }
    if (params?.rating) {
      searchParams.set('rating', params.rating.toString());
    }
    if (params?.shopName) {
      searchParams.set('shopName', params.shopName);
    }

    const queryString = searchParams.toString();
    navigate(`/guest-review-success${queryString ? `?${queryString}` : ''}`);
  };

  const generateGuestReviewUrl = (appointmentId: string, guestEmail: string, baseUrl?: string) => {
    const encodedEmail = encodeURIComponent(guestEmail);
    const base = baseUrl || window.location.origin;
    return `${base}/guest-review/${appointmentId}?email=${encodedEmail}`;
  };

  return {
    isValidGuestReview,
    navigateToGuestReview,
    navigateToGuestReviewSuccess,
    generateGuestReviewUrl,
  };
};

export default useGuestReview;
