import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Share2, ZoomIn, ZoomOut } from 'lucide-react';
import Button from './ui/Button';
import { getImageUrl } from '../lib/utils';

interface ShopGalleryModalProps {
  images: string[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  shopName: string;
}

export const ShopGalleryModal: React.FC<ShopGalleryModalProps> = ({
  images,
  initialIndex,
  isOpen,
  onClose,
  shopName
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Reset state when modal opens and manage body class
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
      setImageLoading(true);
      setImageError(false);

      // Add class to body to hide navbar
      document.body.classList.add('gallery-modal-open');

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Remove class and restore scroll
      document.body.classList.remove('gallery-modal-open');
      document.body.style.overflow = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('gallery-modal-open');
      document.body.style.overflow = '';
    };
  }, [isOpen, initialIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case ' ':
          e.preventDefault();
          toggleZoom();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, currentIndex]);

  const goToPrevious = () => {
    if (images.length === 0) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setImageLoading(true);
    setImageError(false);
    setIsZoomed(false);
  };

  const goToNext = () => {
    if (images.length === 0) return;
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setImageLoading(true);
    setImageError(false);
    setIsZoomed(false);
  };

  const goToImage = (index: number) => {
    if (images.length === 0 || index < 0 || index >= images.length) return;
    setCurrentIndex(index);
    setImageLoading(true);
    setImageError(false);
    setIsZoomed(false);
  };

  const toggleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  const handleDownload = async () => {
    if (images.length === 0 || !images[currentIndex]) return;

    try {
      const imageUrl = getImageUrl(images[currentIndex]);
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${shopName}-image-${currentIndex + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  const handleShare = async () => {
    if (images.length === 0 || !images[currentIndex]) return;

    const imageUrl = getImageUrl(images[currentIndex]);
    const shareData = {
      title: `${shopName} - Gallery`,
      text: `Check out this image from ${shopName}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log('Error sharing:', error);
        fallbackShare(imageUrl);
      }
    } else {
      fallbackShare(imageUrl);
    }
  };

  const fallbackShare = (imageUrl: string) => {
    navigator.clipboard.writeText(imageUrl).then(() => {
      // You could show a toast notification here
      console.log('Image URL copied to clipboard');
    });
  };



  if (!isOpen || images.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center gallery-modal-overlay">
      {/* Background click area */}
      <div
        className="absolute inset-0 z-0"
        onClick={onClose}
      />

      {/* Content container */}
      <div className="relative z-10 w-full h-full flex items-center justify-center"
           onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/50 to-transparent p-4">
        <div className="flex items-center justify-between text-white">
          <div>
            <h2 className="text-lg font-semibold">{shopName}</h2>
            <p className="text-sm text-gray-300">
              {currentIndex + 1} of {images.length}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              className="text-white hover:bg-white/20"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              className="text-white hover:bg-white/20"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleZoom();
              }}
              className="text-white hover:bg-white/20"
            >
              {isZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Image */}
      <div className="relative w-full h-full flex items-center justify-center p-4 pt-20 pb-24">
        {imageLoading && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}

        {imageError ? (
          <div className="flex flex-col items-center justify-center text-white">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
              <X className="w-8 h-8" />
            </div>
            <p className="text-lg font-medium mb-2">Image not available</p>
            <p className="text-sm text-gray-300">This image could not be loaded</p>
          </div>
        ) : (
          <img
            src={getImageUrl(images[currentIndex])}
            alt={`${shopName} - Image ${currentIndex + 1}`}
            className={`max-w-full max-h-full object-contain transition-transform duration-300 ${
              isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            onClick={(e) => {
              e.stopPropagation();
              toggleZoom();
            }}
          />
        )}

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                goToPrevious();
              }}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 p-3 rounded-full transition-all duration-200 z-30"
              type="button"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                goToNext();
              }}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 p-3 rounded-full transition-all duration-200 z-30"
              type="button"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/50 to-transparent p-4">
          <div className="flex justify-center space-x-2 overflow-x-auto max-w-full">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  goToImage(index);
                }}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentIndex
                    ? 'border-white shadow-lg'
                    : 'border-transparent hover:border-gray-300'
                }`}
              >
                <img
                  src={getImageUrl(image)}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.error-placeholder')) {
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'error-placeholder w-full h-full bg-gray-600 flex items-center justify-center';
                      errorDiv.innerHTML = '<span class="text-xs text-gray-300">Error</span>';
                      parent.appendChild(errorDiv);
                    }
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      </div> {/* End content container */}
    </div>
  );
};
