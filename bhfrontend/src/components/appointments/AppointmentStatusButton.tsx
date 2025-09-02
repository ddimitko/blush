import React, { useState } from 'react';
import { Play, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { AppointmentStatus } from '../../types';
import { useUpdateAppointmentStatusMutation } from '../../hooks/queries';
import { useToast } from '../ui/Toast';
import Button from '../ui/Button';

interface AppointmentStatusButtonProps {
  appointmentId: string;
  currentStatus: AppointmentStatus;
  onStatusChange?: (newStatus: AppointmentStatus) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const AppointmentStatusButton: React.FC<AppointmentStatusButtonProps> = ({
  appointmentId,
  currentStatus,
  onStatusChange,
  className,
  size = 'sm'
}) => {
  const { success, error } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const updateStatusMutation = useUpdateAppointmentStatusMutation();

  const getNextStatus = (status: AppointmentStatus): AppointmentStatus | null => {
    switch (status) {
      case 'CONFIRMED':
        return 'IN_PROGRESS';
      case 'IN_PROGRESS':
        return 'COMPLETED';
      default:
        return null;
    }
  };

  const getButtonConfig = (status: AppointmentStatus) => {
    const nextStatus = getNextStatus(status);

    switch (nextStatus) {
      case 'IN_PROGRESS':
        return {
          label: 'Start',
          icon: Play,
          variant: 'primary' as const,
          color: 'bg-blue-600 hover:bg-blue-700 text-white'
        };
      case 'COMPLETED':
        return {
          label: 'Complete',
          icon: CheckCircle,
          variant: 'accent' as const,
          color: 'bg-green-600 hover:bg-green-700 text-white'
        };
      default:
        return null;
    }
  };

  const handleStatusUpdate = async () => {
    const nextStatus = getNextStatus(currentStatus);
    if (!nextStatus) return;

    setIsUpdating(true);
    try {
      await updateStatusMutation.mutateAsync({
        appointmentId,
        status: nextStatus
      });

      success(
        'Status Updated',
        `Appointment status updated to ${nextStatus.toLowerCase().replace('_', ' ')}.`
      );

      onStatusChange?.(nextStatus);
    } catch (err: any) {
      error(
        'Update Failed',
        err.response?.data?.message || 'Failed to update appointment status.'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const buttonConfig = getButtonConfig(currentStatus);
  
  if (!buttonConfig) {
    return null;
  }

  const { label, icon: Icon, variant } = buttonConfig;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleStatusUpdate}
      disabled={isUpdating}
      className={className}
    >
      <Icon className="w-4 h-4 mr-2" />
      {isUpdating ? 'Updating...' : label}
    </Button>
  );
};

export default AppointmentStatusButton;
