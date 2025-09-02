import React, { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
  itemName: string;
  itemType: 'service' | 'employee';
  actionType?: 'delete' | 'deactivate';
  isLoading?: boolean;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  itemType,
  actionType = 'delete',
  isLoading = false,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (isDeleting) return;

    try {
      setIsDeleting(true);
      await onConfirm();
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
    >
      <div className="text-center">
        {/* Warning Icon */}
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {title}
        </h3>

        {/* Message */}
        <p className="text-sm text-gray-500 mb-2">
          {message}
        </p>

        {/* Item Name */}
        <div className="bg-gray-50 rounded-lg p-3 mb-6">
          <p className="text-sm font-medium text-gray-900">
            {itemName}
          </p>
        </div>

        {/* Warning Text */}
        <div className={`border rounded-lg p-3 mb-6 ${
          actionType === 'deactivate'
            ? 'bg-orange-50 border-orange-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <p className={`text-sm ${
            actionType === 'deactivate' ? 'text-orange-700' : 'text-red-700'
          }`}>
            {actionType === 'deactivate'
              ? (itemType === 'service'
                  ? 'This will deactivate the service and it will no longer be available for booking. You can reactivate it later by editing the service.'
                  : 'This will deactivate the employee and they will no longer be able to provide services. You can reactivate them later.'
                )
              : (itemType === 'service'
                  ? 'This will permanently delete the service and remove all employee assignments. This action cannot be undone.'
                  : 'This will permanently remove the employee from your shop. This action cannot be undone.'
                )
            }
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleConfirm}
            isLoading={isDeleting}
            loadingText={actionType === 'deactivate' ? 'Deactivating...' : 'Deleting...'}
            icon={<Trash2 className="w-4 h-4" />}
            className={actionType === 'deactivate'
              ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
              : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
            }
          >
            {actionType === 'deactivate' ? 'Deactivate' : 'Delete'} {itemType === 'service' ? 'Service' : 'Employee'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteConfirmModal;
