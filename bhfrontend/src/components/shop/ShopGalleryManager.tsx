import React, { useState, useRef } from 'react';
import { Upload, X, Star, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Shop } from '../../types';
import { 
  useUploadGalleryImageMutation, 
  useDeleteGalleryImageMutation, 
  useSetShopThumbnailMutation 
} from '../../hooks/queries/useShopQueries';
import { useToast } from '../ui/Toast';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ShopGalleryManagerProps {
  shop: Shop;
}

const ShopGalleryManager: React.FC<ShopGalleryManagerProps> = ({ shop }) => {
  const { success, error } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  
  const uploadMutation = useUploadGalleryImageMutation();
  const deleteMutation = useDeleteGalleryImageMutation();
  const setThumbnailMutation = useSetShopThumbnailMutation();

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Convert FileList to Array for easier processing
    const fileArray = Array.from(files);

    // Check gallery limit
    const currentGalleryCount = shop.gallery?.length || 0;
    const remainingSlots = 10 - currentGalleryCount;

    if (remainingSlots <= 0) {
      error('Gallery full', 'Gallery is full. Delete some images to upload new ones.');
      return;
    }

    // Limit files to remaining slots
    const filesToUpload = fileArray.slice(0, remainingSlots);

    if (fileArray.length > remainingSlots) {
      error('Too many files', `Can only upload ${remainingSlots} more image(s). Gallery limit is 10 images.`);
    }

    // Validate each file
    for (const file of filesToUpload) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        error('Invalid file type', `File "${file.name}" is not an image. Please select only image files.`);
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        error('File too large', `File "${file.name}" is larger than 5MB. Please select smaller images.`);
        return;
      }
    }

    // Upload files sequentially to avoid overwhelming the server
    setUploadingCount(filesToUpload.length);
    uploadFilesSequentially(filesToUpload, 0);
  };

  const uploadFilesSequentially = (files: File[], index: number) => {
    if (index >= files.length) {
      // All files uploaded
      setUploadingCount(0);
      success('Upload complete', `Successfully uploaded ${files.length} image(s) to gallery`);
      return;
    }

    const file = files[index];
    const isLastFile = index === files.length - 1;

    uploadMutation.mutate(
      { shopId: shop.id, file },
      {
        onSuccess: (data) => {
          setUploadingCount(files.length - index - 1); // Update remaining count
          if (files.length === 1) {
            success('Image uploaded', 'Gallery image uploaded successfully');
          } else if (isLastFile) {
            success('Upload complete', `Successfully uploaded ${files.length} images to gallery`);
          }
          // Upload next file
          uploadFilesSequentially(files, index + 1);
        },
        onError: (err: any) => {
          setUploadingCount(0); // Reset count on error
          error('Upload failed', `Failed to upload "${file.name}": ${err.message || 'Unknown error'}`);
          // Stop uploading remaining files on error
        }
      }
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDeleteImage = (imageUrl: string) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;

    deleteMutation.mutate(
      { shopId: shop.id, imageUrl },
      {
        onSuccess: () => {
          success('Image deleted', 'Gallery image deleted successfully');
        },
        onError: (err: any) => {
          error('Delete failed', err.message || 'Failed to delete image');
        }
      }
    );
  };

  const handleSetThumbnail = (imageUrl: string) => {
    setThumbnailMutation.mutate(
      { shopId: shop.id, imageUrl },
      {
        onSuccess: () => {
          success('Thumbnail updated', 'Shop thumbnail updated successfully');
        },
        onError: (err: any) => {
          error('Update failed', err.message || 'Failed to update thumbnail');
        }
      }
    );
  };

  const getImageUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    return `${process.env.REACT_APP_API_URL || 'https://localhost:8443'}${url}`;
  };

  const isLoading = uploadMutation.isPending || deleteMutation.isPending || setThumbnailMutation.isPending || uploadingCount > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Shop Gallery</h3>
        <span className="text-sm text-gray-500">
          {shop.gallery?.length || 0}/10 images
        </span>
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-all duration-300 animate-fade-in ${
          dragOver
            ? 'border-accent-400 bg-accent-50 scale-105'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        } ${shop.gallery && shop.gallery.length >= 10 ? 'opacity-50 pointer-events-none' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={shop.gallery && shop.gallery.length >= 10}
        />

        <div className="text-center">
          <Upload className={`w-8 h-8 mx-auto mb-2 transition-colors ${
            dragOver ? 'text-accent-500' : 'text-gray-400'
          }`} />
          <p className="text-sm text-gray-600 mb-2">
            {shop.gallery && shop.gallery.length >= 10 ? (
              'Gallery is full - delete some images to upload new ones'
            ) : (
              <>
                Drag and drop images here, or{' '}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-accent-600 hover:text-accent-700 font-medium transition-colors"
                  disabled={shop.gallery && shop.gallery.length >= 10}
                >
                  browse
                </button>
              </>
            )}
          </p>
          <p className="text-xs text-gray-500">
            PNG, JPG, GIF up to 5MB each • Select up to {Math.max(0, 10 - (shop.gallery?.length || 0))} more images
          </p>
        </div>

        {isLoading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
            <div className="flex flex-col items-center space-y-2">
              <LoadingSpinner size="sm" />
              {uploadingCount > 0 && (
                <p className="text-sm text-gray-600">
                  Uploading {uploadingCount} image{uploadingCount !== 1 ? 's' : ''}...
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Gallery Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-md font-medium text-gray-900">Current Images</h4>
          {shop.gallery && shop.gallery.length > 0 && (
            <p className="text-sm text-gray-500">
              Click the star to set as thumbnail, trash to delete
            </p>
          )}
        </div>

        {shop.gallery && shop.gallery.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {shop.gallery.map((imageUrl, index) => (
              <div
                key={index}
                className="relative group animate-stagger-in hover-lift"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                  <img
                    src={getImageUrl(imageUrl)}
                    alt={`Gallery ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                </div>

                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-lg flex items-center justify-center space-x-2">
                  <button
                    onClick={() => handleSetThumbnail(imageUrl)}
                    className="p-2 bg-white/90 text-gray-700 rounded-full hover:bg-white hover:scale-110 transition-all duration-200"
                    title="Set as thumbnail"
                    disabled={shop.thumbnail === imageUrl}
                  >
                    <Star
                      className={`w-4 h-4 transition-colors ${
                        shop.thumbnail === imageUrl ? 'fill-yellow-400 text-yellow-400' : 'hover:text-yellow-500'
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => handleDeleteImage(imageUrl)}
                    className="p-2 bg-white/90 text-red-600 rounded-full hover:bg-white hover:scale-110 transition-all duration-200"
                    title="Delete image"
                  >
                    <Trash2 className="w-4 h-4 hover:text-red-700 transition-colors" />
                  </button>
                </div>

                {/* Thumbnail indicator */}
                {shop.thumbnail === imageUrl && (
                  <div className="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-2 py-1 rounded text-xs font-medium shadow-sm animate-pulse-gentle">
                    ⭐ Thumbnail
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border border-gray-200 rounded-lg bg-gray-50 animate-fade-in">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No images yet</h4>
            <p className="text-gray-600">
              Use the upload area above to add your first image
            </p>
          </div>
        )}
      </div>

      {/* Gallery status info */}
      {shop.gallery && shop.gallery.length >= 8 && (
        <div className={`rounded-lg p-4 animate-slide-up ${
          shop.gallery.length >= 10
            ? 'bg-red-50 border border-red-200'
            : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <p className={`text-sm ${
            shop.gallery.length >= 10 ? 'text-red-800' : 'text-yellow-800'
          }`}>
            <strong>
              {shop.gallery.length >= 10 ? 'Gallery full:' : 'Gallery almost full:'}
            </strong>
            {shop.gallery.length >= 10
              ? ' You have reached the maximum of 10 images. Please delete some images to upload new ones.'
              : ` You can upload up to 10 images (${10 - shop.gallery.length} remaining).`
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default ShopGalleryManager;
