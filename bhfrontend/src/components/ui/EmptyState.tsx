import React from 'react';
import { cn } from '../../lib/utils';
import {
  Search,
  Calendar,
  MapPin,
  Star,
  Users,
  ShoppingBag,
  Heart,
  AlertCircle,
  Plus
} from 'lucide-react';
import Button from './Button';
import { useTranslation } from '../../hooks/useTranslation';

interface EmptyStateProps {
  variant?: 'search' | 'appointments' | 'shops' | 'favorites' | 'notifications' | 'reviews' | 'employees' | 'services' | 'general';
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'general',
  title,
  description,
  action,
  className
}) => {
  const { tCommon } = useTranslation();

  const getVariantConfig = () => {
    switch (variant) {
      case 'search':
        return {
          icon: Search,
          defaultTitle: String(tCommon('emptyState.search.title') || 'No results found'),
          defaultDescription: String(tCommon('emptyState.search.description') || 'Try adjusting your search criteria.'),
          iconColor: 'text-gray-400',
          bgColor: 'bg-gray-50',
        };
      case 'appointments':
        return {
          icon: Calendar,
          defaultTitle: String(tCommon('emptyState.appointments.title') || 'No appointments yet'),
          defaultDescription: String(tCommon('emptyState.appointments.description') || 'Book your first appointment.'),
          iconColor: 'text-accent-400',
          bgColor: 'bg-accent-50',
        };
      case 'shops':
        return {
          icon: MapPin,
          defaultTitle: String(tCommon('emptyState.shops.title') || 'No salons in this area'),
          defaultDescription: String(tCommon('emptyState.shops.description') || 'Try expanding your search.'),
          iconColor: 'text-blue-400',
          bgColor: 'bg-blue-50',
        };
      case 'favorites':
        return {
          icon: Heart,
          defaultTitle: String(tCommon('emptyState.favorites.title') || 'No favorites saved'),
          defaultDescription: String(tCommon('emptyState.favorites.description') || 'Save your favorite salons.'),
          iconColor: 'text-red-400',
          bgColor: 'bg-red-50',
        };
      case 'notifications':
        return {
          icon: AlertCircle,
          defaultTitle: String(tCommon('emptyState.notifications.title') || 'No notifications'),
          defaultDescription: String(tCommon('emptyState.notifications.description') || 'You\'re all caught up!'),
          iconColor: 'text-green-400',
          bgColor: 'bg-green-50',
        };
      case 'reviews':
        return {
          icon: Star,
          defaultTitle: String(tCommon('emptyState.reviews.title') || 'No reviews yet'),
          defaultDescription: String(tCommon('emptyState.reviews.description') || 'Be the first to review.'),
          iconColor: 'text-yellow-400',
          bgColor: 'bg-yellow-50',
        };
      case 'employees':
        return {
          icon: Users,
          defaultTitle: String(tCommon('emptyState.employees.title') || 'No employees added'),
          defaultDescription: String(tCommon('emptyState.employees.description') || 'Add team members.'),
          iconColor: 'text-purple-400',
          bgColor: 'bg-purple-50',
        };
      case 'services':
        return {
          icon: ShoppingBag,
          defaultTitle: String(tCommon('emptyState.services.title') || 'No services available'),
          defaultDescription: String(tCommon('emptyState.services.description') || 'Add services to offer.'),
          iconColor: 'text-indigo-400',
          bgColor: 'bg-indigo-50',
        };
      default:
        return {
          icon: AlertCircle,
          defaultTitle: String(tCommon('emptyState.general.title') || 'No data available'),
          defaultDescription: String(tCommon('emptyState.general.description') || 'Nothing to show here.'),
          iconColor: 'text-gray-400',
          bgColor: 'bg-gray-50',
        };
    }
  };

  const config = getVariantConfig();
  const Icon = config.icon;

  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className={cn('w-16 h-16 rounded-full flex items-center justify-center mb-4', config.bgColor)}>
        <Icon className={cn('w-8 h-8', config.iconColor)} />
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title || config.defaultTitle}
      </h3>
      
      <p className="text-gray-600 mb-6 max-w-sm leading-relaxed">
        {description || config.defaultDescription}
      </p>
      
      {action && (
        <Button
          variant={action.variant || 'primary'}
          onClick={action.onClick}
          className="inline-flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          {action.label}
        </Button>
      )}
    </div>
  );
};

// Specialized empty state components
export const SearchEmptyState: React.FC<{ onClearFilters?: () => void }> = ({ onClearFilters }) => {
  const { tCommon } = useTranslation();
  return (
    <EmptyState
      variant="search"
      action={onClearFilters ? {
        label: String(tCommon('actions.clearFilters') || 'Clear Filters'),
        onClick: onClearFilters,
        variant: 'outline'
      } : undefined}
    />
  );
};

export const AppointmentsEmptyState: React.FC<{ onBookAppointment?: () => void }> = ({ onBookAppointment }) => {
  const { tCommon } = useTranslation();
  return (
    <EmptyState
      variant="appointments"
      action={onBookAppointment ? {
        label: String(tCommon('actions.bookAppointment') || 'Book Appointment'),
        onClick: onBookAppointment,
        variant: 'primary'
      } : undefined}
    />
  );
};

export const ShopsEmptyState: React.FC<{ onExpandSearch?: () => void }> = ({ onExpandSearch }) => {
  const { tCommon } = useTranslation();
  return (
    <EmptyState
      variant="shops"
      action={onExpandSearch ? {
        label: String(tCommon('actions.expandSearch') || 'Expand Search'),
        onClick: onExpandSearch,
        variant: 'outline'
      } : undefined}
    />
  );
};

export const FavoritesEmptyState: React.FC<{ onBrowseShops?: () => void }> = ({ onBrowseShops }) => {
  const { tCommon } = useTranslation();
  return (
    <EmptyState
      variant="favorites"
      action={onBrowseShops ? {
        label: String(tCommon('actions.browseShops') || 'Browse Salons'),
        onClick: onBrowseShops,
        variant: 'primary'
      } : undefined}
    />
  );
};

export default EmptyState;
