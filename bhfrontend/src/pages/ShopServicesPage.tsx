import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Scissors, Clock, DollarSign, Edit, Trash2, Users, X, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  useOwnerShopsQuery,
  useShopQuery,
  useShopServicesQuery,
  useShopEmployeesQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
  useDeactivateServiceMutation,
  useActivateServiceMutation
} from '../hooks/queries';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ServiceFormModal from '../components/modals/ServiceFormModal';
import DeleteConfirmModal from '../components/modals/DeleteConfirmModal';

import { Service, ServiceCreationRequest } from '../types';
import { formatCurrency } from '../lib/utils';

const ShopServicesPage: React.FC = () => {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();

  // State for modals
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [actionType, setActionType] = useState<'delete' | 'deactivate'>('delete');

  // React Query hooks - only fetch if user has OWNER role
  const { data: shops = [], isLoading: isLoadingShops } = useOwnerShopsQuery(user?.role === 'OWNER');
  const { data: currentShop, isLoading: isLoadingShop } = useShopQuery(shopId);
  const { data: services = [], isLoading: isLoadingServices } = useShopServicesQuery(shopId, false); // Use private endpoint for owner dashboard
  const { data: employees = [], isLoading: isLoadingEmployees } = useShopEmployeesQuery(shopId, false); // Use private endpoint for owner dashboard
  const createServiceMutation = useCreateServiceMutation();
  const updateServiceMutation = useUpdateServiceMutation();
  const deleteServiceMutation = useDeleteServiceMutation();
  const deactivateServiceMutation = useDeactivateServiceMutation();
  const activateServiceMutation = useActivateServiceMutation();

  // Check if user has access to this shop
  useEffect(() => {
    if (!shopId || !user?.id) return;

    if (!isLoadingShops && shops.length > 0) {
      const hasAccess = shops.some(shop => shop.id === shopId);
      if (!hasAccess) {
        error('Shop not found or you do not have access to it');
        navigate('/dashboard');
      }
    }
  }, [shopId, user?.id, shops, isLoadingShops, navigate, error]);

  const handleAddService = () => {
    setSelectedService(null);
    setIsServiceModalOpen(true);
  };

  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setIsServiceModalOpen(true);
  };

  const handleDeleteService = (service: Service) => {
    setSelectedService(service);
    setActionType('delete');
    setIsDeleteModalOpen(true);
  };

  const handleDeactivateService = (service: Service) => {
    setSelectedService(service);
    setActionType('deactivate');
    setIsDeactivateModalOpen(true);
  };

  const handleActivateService = async (service: Service) => {
    try {
      await activateServiceMutation.mutateAsync({
        shopId: shopId!,
        serviceId: service.id,
      });
      success('Service activated!', 'Your service is now available for booking.');
    } catch (error: any) {
      error('Failed to activate service', error.response?.data?.message || 'An unexpected error occurred');
    }
  };

  const handleServiceSubmit = async (data: ServiceCreationRequest) => {
    if (selectedService) {
      // Update existing service
      await updateServiceMutation.mutateAsync({
        shopId: shopId!,
        serviceId: selectedService.id,
        serviceData: data,
      });
    } else {
      // Create new service
      await createServiceMutation.mutateAsync({
        shopId: shopId!,
        serviceData: data,
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedService) return;

    await deleteServiceMutation.mutateAsync({
      shopId: shopId!,
      serviceId: selectedService.id,
    });
  };

  const handleConfirmDeactivate = async () => {
    if (!selectedService) return;

    await deactivateServiceMutation.mutateAsync({
      shopId: shopId!,
      serviceId: selectedService.id,
    });
  };

  if (isLoadingShops || isLoadingShop) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (!currentShop) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Scissors className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Shop Not Found</h3>
            <p className="text-gray-600 mb-4">The requested shop could not be found.</p>
            <Button onClick={() => navigate('/owner/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Services</h1>
            <p className="text-gray-600">{currentShop.name}</p>
          </div>

          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleAddService}
          >
            Add Service
          </Button>
        </div>

        {/* Services List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {isLoadingServices ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12">
              <Scissors className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Services Yet</h3>
              <p className="text-gray-600 mb-4">
                Start offering services by adding your first service.
              </p>
              <Button
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleAddService}
              >
                Add First Service
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Available Services ({services.length})
                </h2>
              </div>

              <div className="divide-y divide-gray-200">
                {services.map((service) => (
                  <div key={service.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {service.name}
                          </h3>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            service.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {service.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <p className="text-gray-600 mb-3">{service.description}</p>

                        <div className="flex items-center space-x-6 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-4 h-4" />
                            <span className="font-medium">{formatCurrency(service.price, currentShop?.country)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{service.durationMinutes} minutes</span>
                          </div>
                          {service.employees && service.employees.length > 0 && (
                            <div className="flex items-center space-x-1">
                              <Users className="w-4 h-4" />
                              <span>{service.employees.length} employee{service.employees.length !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>

                        {service.employees && service.employees.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {service.employees.map((employee) => (
                              <span
                                key={employee.id}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {employee.fullName || employee.name || 'Unknown Employee'}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Edit className="w-4 h-4" />}
                          onClick={() => handleEditService(service)}
                        >
                          Edit
                        </Button>
                        {service.active ? (
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<X className="w-4 h-4" />}
                            onClick={() => handleDeactivateService(service)}
                            className="text-orange-600 border-orange-200 hover:bg-orange-50"
                          >
                            Deactivate
                          </Button>
                        ) : service.employees && service.employees.length > 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<CheckCircle className="w-4 h-4" />}
                            onClick={() => handleActivateService(service)}
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            isLoading={activateServiceMutation.isPending}
                          >
                            Activate
                          </Button>
                        ) : null}
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Trash2 className="w-4 h-4" />}
                          onClick={() => handleDeleteService(service)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {services.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Scissors className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Services</p>
                  <p className="text-2xl font-bold text-gray-900">{services.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Scissors className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Services</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {services.filter(s => s.active).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg. Price</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {services.length > 0 ? formatCurrency(
                      services.reduce((sum, s) => sum + s.price, 0) / services.length,
                      currentShop?.country
                    ) : formatCurrency(0, currentShop?.country)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg. Duration</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {services.length > 0 ? Math.round(
                      services.reduce((sum, s) => sum + s.durationMinutes, 0) / services.length
                    ) : 0}m
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Service Form Modal */}
      <ServiceFormModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        onSubmit={handleServiceSubmit}
        service={selectedService}
        employees={employees}
        shopId={shopId!}
        shopCountry={currentShop?.country}
        isLoading={createServiceMutation.isPending || updateServiceMutation.isPending}
      />

      {/* Deactivate Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeactivateModalOpen}
        onClose={() => setIsDeactivateModalOpen(false)}
        onConfirm={handleConfirmDeactivate}
        title="Deactivate Service"
        message="Are you sure you want to deactivate this service? It will no longer be available for booking but can be reactivated later."
        itemName={selectedService?.name || ''}
        itemType="service"
        actionType="deactivate"
        isLoading={deactivateServiceMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Service Permanently"
        message="Are you sure you want to permanently delete this service? This action cannot be undone and will remove all employee assignments."
        itemName={selectedService?.name || ''}
        itemType="service"
        actionType="delete"
        isLoading={deleteServiceMutation.isPending}
      />
    </div>
  );
};

export default ShopServicesPage;
