import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Users, Mail, Phone, Calendar, Edit, Trash2, UserPlus, X, Clock, CheckCircle, UserCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  useOwnerShopsQuery,
  useShopQuery,
  useShopEmployeesQuery,
  useDeleteEmployeeMutation,
  useInviteEmployeeMutation,
  useAssignOwnerAsEmployeeMutation
} from '../hooks/queries';
import { apiClient } from '../lib/api';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmployeeInviteModal from '../components/modals/EmployeeInviteModal';
import DeleteConfirmModal from '../components/modals/DeleteConfirmModal';
import OwnerEmployeeAssignModal from '../components/modals/OwnerEmployeeAssignModal';

import { Employee, EmployeeInvitationRequest, EmployeeCreationRequest } from '../types';
import { formatDate } from '../lib/utils';

const ShopEmployeesPage: React.FC = () => {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();

  // State for modals
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isOwnerAssignModalOpen, setIsOwnerAssignModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [cancellingInvitations, setCancellingInvitations] = useState<Set<string>>(new Set());

  // React Query hooks - only fetch if user has OWNER role
  const { data: shops = [], isLoading: isLoadingShops } = useOwnerShopsQuery(user?.role === 'OWNER');
  const { data: currentShop, isLoading: isLoadingShop } = useShopQuery(shopId);
  const { data: employees = [], isLoading: isLoadingEmployees } = useShopEmployeesQuery(shopId, false); // Use private endpoint to include invitations
  const deleteEmployeeMutation = useDeleteEmployeeMutation();
  const inviteEmployeeMutation = useInviteEmployeeMutation();
  const assignOwnerMutation = useAssignOwnerAsEmployeeMutation();

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

  const handleAddEmployee = () => {
    setIsInviteModalOpen(true);
  };

  const handleAssignOwnerAsEmployee = () => {
    setIsOwnerAssignModalOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    // For now, editing is not supported in the new simplified flow
    // This could be implemented later as a separate edit modal
    console.log('Edit employee:', employee);
  };

  const handleDeleteEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDeleteModalOpen(true);
  };



  const handleInviteSubmit = async (data: EmployeeInvitationRequest) => {
    await inviteEmployeeMutation.mutateAsync({
      shopId: shopId!,
      inviteData: data,
    });
  };

  const handleOwnerAssignSubmit = async (data: Omit<EmployeeCreationRequest, 'firstName' | 'lastName' | 'email' | 'password' | 'confirmPassword' | 'phone'>) => {
    await assignOwnerMutation.mutateAsync({
      shopId: shopId!,
      employeeData: data,
    });
  };

  const handleConfirmDelete = async () => {
    if (!selectedEmployee) return;

    await deleteEmployeeMutation.mutateAsync({
      shopId: shopId!,
      employeeId: selectedEmployee.id,
    });
  };

  const handleCancelInvitation = async (employee: Employee) => {
    if (!employee.invitationStatus || employee.invitationStatus === 'ACCEPTED') {
      return;
    }

    if (!employee.invitationId) {
      error('Cannot cancel invitation', 'Invitation ID not found');
      return;
    }

    try {
      const trackingId = employee.invitationId;
      setCancellingInvitations(prev => new Set(prev).add(trackingId));

      await apiClient.cancelInvitation(employee.invitationId);

      success('Invitation cancelled', 'The employee invitation has been cancelled successfully.');

      // Refresh the employee list
      window.location.reload(); // Simple refresh for now
    } catch (err: any) {
      error('Failed to cancel invitation', err.response?.data?.message || 'An unexpected error occurred');
    } finally {
      setCancellingInvitations(prev => {
        const newSet = new Set(prev);
        newSet.delete(employee.invitationId!);
        return newSet;
      });
    }
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
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
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

  // Check if the current user (owner) is already an employee at this shop
  const isOwnerAlreadyEmployee = employees.some(employee =>
    employee.user?.id === user?.id || employee.email === user?.email
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
            <p className="text-gray-600">{currentShop.name}</p>
          </div>

          <div className="flex items-center space-x-3">
            {!isOwnerAlreadyEmployee && (
              <Button
                variant="secondary"
                icon={<UserCheck className="w-4 h-4" />}
                onClick={handleAssignOwnerAsEmployee}
              >
                Become Employee
              </Button>
            )}
            <Button
              variant="primary"
              icon={<UserPlus className="w-4 h-4" />}
              onClick={handleAddEmployee}
            >
              Add Employee
            </Button>
          </div>
        </div>

        {/* Employees List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {isLoadingEmployees ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Employees Yet</h3>
              <p className="text-gray-600 mb-4">
                Start building your team by adding your first employee.
              </p>
              <Button
                variant="primary"
                icon={<UserPlus className="w-4 h-4" />}
                onClick={handleAddEmployee}
              >
                Add First Employee
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Team Members ({employees.length})
                </h2>
              </div>

              <div className="divide-y divide-gray-200">
                {employees.map((employee) => {
                  const isTerminated = employee.active === false;
                  return (
                    <div
                      key={employee.id || employee.invitationId || employee.email}
                      className={`p-6 transition-colors ${
                        isTerminated
                          ? 'bg-gray-50 opacity-75'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            isTerminated
                              ? 'bg-gray-200'
                              : 'bg-accent-100'
                          }`}>
                            <span className={`font-medium text-lg ${
                              isTerminated
                                ? 'text-gray-500'
                                : 'text-accent-600'
                            }`}>
                            {(() => {
                              const name = employee.name || employee.fullName;
                              return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'N/A';
                            })()}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center space-x-3">
                            <h3 className={`text-lg font-medium ${
                              isTerminated ? 'text-gray-500' : 'text-gray-900'
                            }`}>
                              {employee.name || employee.fullName || 'Unknown Employee'}
                            </h3>
                            {/* Invitation Status Badge */}
                            {employee.invitationStatus && employee.invitationStatus !== 'ACCEPTED' && (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                employee.invitationStatus === 'PENDING'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : employee.invitationStatus === 'REJECTED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {employee.invitationStatus === 'PENDING' && <Clock className="w-3 h-3 mr-1" />}
                                {employee.invitationStatus === 'REJECTED' && <X className="w-3 h-3 mr-1" />}
                                {employee.invitationStatus === 'PENDING' ? 'Invitation Pending' :
                                 employee.invitationStatus === 'REJECTED' ? 'Invitation Cancelled' :
                                 employee.invitationStatus}
                              </span>
                            )}
                            {employee.active === false ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <X className="w-3 h-3 mr-1" />
                                Terminated
                              </span>
                            ) : employee.invitationStatus === 'ACCEPTED' && employee.active === true ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active Employee
                              </span>
                            ) : null}
                          </div>
                          <div className={`flex items-center space-x-4 text-sm mt-1 ${
                            isTerminated ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            <div className="flex items-center space-x-1">
                              <Mail className="w-4 h-4" />
                              <span>{employee.email || 'No email'}</span>
                            </div>
                            {employee.hireDate && (
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>Hired {formatDate(employee.hireDate)}</span>
                              </div>
                            )}
                          </div>
                          {employee.specialties && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {(Array.isArray(employee.specialties)
                                ? employee.specialties
                                : employee.specialties.split(',').map(s => s.trim()).filter(s => s)
                              ).map((specialty, index) => (
                                <span
                                  key={index}
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    isTerminated
                                      ? 'bg-gray-100 text-gray-500'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {specialty}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {employee.invitationStatus === 'PENDING' ? (
                          /* Pending Invitation Actions */
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<X className="w-4 h-4" />}
                            onClick={() => handleCancelInvitation(employee)}
                            disabled={cancellingInvitations.has(employee.invitationId || '')}
                            className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                          >
                            {cancellingInvitations.has(employee.invitationId || '') ? 'Cancelling...' : 'Cancel Invitation'}
                          </Button>
                        ) : employee.active === false ? (
                          /* Terminated Employee - No Actions */
                          <span className="text-sm text-gray-400 italic">
                            Employee terminated
                          </span>
                        ) : employee.invitationStatus === 'ACCEPTED' || !employee.invitationStatus ? (
                          /* Active Employee Actions */
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              icon={<Edit className="w-4 h-4" />}
                              onClick={() => handleEditEmployee(employee)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              icon={<Trash2 className="w-4 h-4" />}
                              onClick={() => handleDeleteEmployee(employee)}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              Remove
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {employees.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Employees</p>
                  <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Employees</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {employees.filter(e => e.active).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Specialties</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {new Set(employees.flatMap(e => {
                      if (!e.specialties) return [];
                      return Array.isArray(e.specialties)
                        ? e.specialties
                        : e.specialties.split(',').map(s => s.trim()).filter(s => s);
                    })).size}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Employee Invite Modal */}
      <EmployeeInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSubmit={handleInviteSubmit}
        shopId={shopId!}
        isLoading={inviteEmployeeMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Remove Employee"
        message="Are you sure you want to remove this employee from your team?"
        itemName={selectedEmployee?.fullName || selectedEmployee?.name || ''}
        itemType="employee"
        isLoading={deleteEmployeeMutation.isPending}
      />

      {/* Owner Employee Assignment Modal */}
      <OwnerEmployeeAssignModal
        isOpen={isOwnerAssignModalOpen}
        onClose={() => setIsOwnerAssignModalOpen(false)}
        onSubmit={handleOwnerAssignSubmit}
        shopId={shopId!}
        isLoading={assignOwnerMutation.isPending}
      />
    </div>
  );
};

export default ShopEmployeesPage;
