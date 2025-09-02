import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Mail,
  DollarSign,
  Edit3,
  X,
  CheckCircle,
  AlertCircle,
  Search
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  useUserAppointmentsQuery
} from '../hooks/queries';
import { useToast } from '../components/ui/Toast';
import { Appointment, AppointmentStatus } from '../types';
import { formatCurrency, formatTime, formatDate } from '../lib/utils';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import EnhancedCancelModal from '../components/modals/EnhancedCancelModal';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import { SkeletonCard } from '../components/ui/Skeleton';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// Lazy load the AppointmentEditModal to avoid circular dependency
const AppointmentEditModal = lazy(() => import('../components/modals/AppointmentEditModal'));

const UserAppointmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();

  // React Query hooks
  const {
    data: appointmentsResponse,
    isLoading,
    error: appointmentsError,
    refetch,
  } = useUserAppointmentsQuery();

  const appointments = appointmentsResponse?.content || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Check if appointment can be edited/cancelled (24+ hours before appointment)
  const canModifyAppointment = (appointment: Appointment): boolean => {
    const appointmentTime = new Date(appointment.appointmentDateTime);
    const now = new Date();
    const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    return hoursUntilAppointment >= 24 &&
           ['PENDING', 'CONFIRMED'].includes(appointment.status);
  };

  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(apt =>
        apt.shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.employee.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(apt => {
        const appointmentTime = new Date(apt.appointmentDateTime);

        switch (statusFilter) {
          case 'upcoming':
            return appointmentTime > now && ['PENDING', 'CONFIRMED'].includes(apt.status);
          case 'past':
            return appointmentTime <= now || apt.status === 'COMPLETED';
          case 'cancelled':
            return apt.status === 'CANCELLED';
          default:
            return true;
        }
      });
    }

    // Sort by appointment date (upcoming first, then past)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.appointmentDateTime);
      const dateB = new Date(b.appointmentDateTime);
      const now = new Date();

      // Upcoming appointments first (ascending), then past appointments (descending)
      if (dateA > now && dateB > now) {
        return dateA.getTime() - dateB.getTime();
      } else if (dateA <= now && dateB <= now) {
        return dateB.getTime() - dateA.getTime();
      } else {
        return dateA > now ? -1 : 1;
      }
    });
  }, [appointments, searchTerm, statusFilter]);



  const handleEditAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    refetch(); // Refresh appointments list
    setShowEditModal(false);
    setSelectedAppointment(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please log in</h1>
          <p className="text-gray-600">You need to be logged in to view your appointments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Appointments</h1>
          <p className="text-gray-600">
            View and manage your upcoming and past appointments
          </p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search appointments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="w-4 h-4" />}
                clearable
                onClear={() => setSearchTerm('')}
              />
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              >
                <option value="all">All Appointments</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Appointments List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <SkeletonCard key={i} className="h-48" />
            ))}
          </div>
        ) : appointmentsError ? (
          <ErrorState
            variant="server"
            error={appointmentsError}
            onRetry={refetch}
          />
        ) : filteredAppointments.length === 0 ? (
          <EmptyState
            variant="appointments"
            title={searchTerm || statusFilter !== 'all' ? 'No appointments found' : 'No appointments yet'}
            description={
              searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Book your first appointment to get started.'
            }
            action={
              !searchTerm && statusFilter === 'all' ? {
                label: 'Browse Shops',
                onClick: () => navigate('/search'),
                variant: 'primary' as const
              } : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                canModify={canModifyAppointment(appointment)}
                onEdit={() => handleEditAppointment(appointment)}
                onCancel={() => {
                  setSelectedAppointment(appointment);
                  setShowCancelModal(true);
                }}
              />
            ))}
          </div>
        )}

        {/* Edit Appointment Modal */}
        {selectedAppointment && (
          <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><LoadingSpinner /></div>}>
            <AppointmentEditModal
              isOpen={showEditModal}
              onClose={() => {
                setShowEditModal(false);
                setSelectedAppointment(null);
              }}
              appointment={selectedAppointment}
              onSuccess={handleEditSuccess}
            />
          </Suspense>
        )}

        {/* Enhanced Cancel Appointment Modal */}
        {selectedAppointment && (
          <EnhancedCancelModal
            isOpen={showCancelModal}
            onClose={() => {
              setShowCancelModal(false);
              setSelectedAppointment(null);
            }}
            appointment={selectedAppointment}
            onSuccess={() => {
              setShowCancelModal(false);
              setSelectedAppointment(null);
              refetch(); // Refresh appointments list
            }}
          />
        )}
      </div>
    </div>
  );
};

// Appointment Card Component
interface AppointmentCardProps {
  appointment: Appointment;
  canModify: boolean;
  onEdit: () => void;
  onCancel: () => void;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  canModify,
  onEdit,
  onCancel
}) => {
  const appointmentDate = new Date(appointment.appointmentDateTime);
  const now = new Date();
  const isUpcoming = appointmentDate > now;
  const isPast = appointmentDate <= now;

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'NO_SHOW':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: AppointmentStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return <CheckCircle className="w-4 h-4" />;
      case 'PENDING':
        return <Clock className="w-4 h-4" />;
      case 'CANCELLED':
        return <X className="w-4 h-4" />;
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {appointment.service.name}
            </h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
              {getStatusIcon(appointment.status)}
              <span className="ml-1">{appointment.status}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="space-y-2">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{formatDate(appointment.appointmentDateTime)}</span>
              </div>
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                <span>{formatTime(appointment.appointmentDateTime)} - {formatTime(appointment.endDateTime)}</span>
              </div>
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{appointment.shop.name}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <User className="w-4 h-4 mr-2" />
                <span>{appointment.employee.fullName || appointment.employee.name}</span>
              </div>
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 mr-2" />
                <span>{formatCurrency(appointment.totalAmount, appointment.shop.country)}</span>
              </div>
              {appointment.notes && (
                <div className="flex items-start">
                  <Mail className="w-4 h-4 mr-2 mt-0.5" />
                  <span className="text-xs">{appointment.notes}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {canModify && (
          <div className="flex space-x-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              icon={<Edit3 className="w-4 h-4" />}
            >
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              icon={<X className="w-4 h-4" />}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Additional Info for Past Appointments */}
      {isPast && appointment.status === 'COMPLETED' && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Completed on {formatDate(appointment.appointmentDateTime)}
          </p>
        </div>
      )}
    </div>
  );
};

export default UserAppointmentsPage;
