import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useUpdateProfileMutation, useUploadAvatarMutation } from '../hooks/queries/useAuthQueries';
import { useToast } from '../components/ui/Toast';
import { User, Camera, Mail, Phone, Calendar, MapPin, Settings, Shield, Save } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import PhoneInput from '../components/ui/PhoneInput';
import SocialConnections from '../components/auth/SocialConnections';
import PaymentMethodsSection from '../components/user/PaymentMethodsSection';
import { smoothScrollToTop } from '../lib/smoothNavigation';

const UserProfilePage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { success, error } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
  });

  // React Query mutations
  const updateProfileMutation = useUpdateProfileMutation();
  const uploadAvatarMutation = useUploadAvatarMutation();

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await uploadAvatarMutation.mutateAsync(file);
      success('Avatar Updated', 'Your profile picture has been updated');
    } catch (err) {
      error('Upload Failed', 'Failed to upload your profile picture');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updateProfileMutation.mutateAsync(formData);
      success('Profile Updated', 'Your profile has been updated successfully');
      setIsEditing(false);
    } catch (err) {
      error('Update Failed', 'Failed to update your profile');
    }
  };

  // Smooth scroll to top when component mounts
  useEffect(() => {
    smoothScrollToTop();
  }, []);



  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in</h1>
          <p className="text-gray-600">You need to be signed in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                <Button
                  variant={isEditing ? "primary" : "outline"}
                  size="sm"
                  onClick={isEditing ? handleSave : () => setIsEditing(true)}
                  disabled={isLoading || updateProfileMutation.isPending}
                  isLoading={(isLoading || updateProfileMutation.isPending) && isEditing}
                  icon={isEditing ? <Save className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                >
                  {isEditing ? 'Save Changes' : 'Edit Profile'}
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    disabled={!isEditing}
                    icon={<User className="w-4 h-4" />}
                  />
                  <Input
                    label="Last Name"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    disabled={!isEditing}
                    icon={<User className="w-4 h-4" />}
                  />
                </div>

                <Input
                  label="Email"
                  value={user.email}
                  disabled={true}
                  icon={<Mail className="w-4 h-4" />}
                  helperText="Email cannot be changed"
                />

                <PhoneInput
                  label="Phone (Optional)"
                  value={formData.phone}
                  onChange={(value) => handleInputChange('phone', value)}
                  disabled={!isEditing}
                  placeholder="Enter phone number"
                  defaultCountry="BG"
                />
              </div>
            </div>

            {/* Social Connections Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <SocialConnections />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Picture Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Picture</h3>

              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                    {user?.avatar ? (
                      <img
                        src={user.avatar.startsWith('http') ? user.avatar : `${process.env.REACT_APP_API_URL || 'http://localhost:8080'}${user.avatar}`}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('Avatar failed to load:', user.avatar);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <User className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-white border border-gray-300 rounded-full p-2 cursor-pointer hover:bg-gray-50 transition-colors">
                    <Camera className="w-4 h-4 text-gray-600" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-sm font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Account Info Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Role</span>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {user.role?.toLowerCase()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Email Verified</span>
                  <div className="flex items-center">
                    <Shield className={`w-4 h-4 mr-1 ${user.emailVerified ? 'text-green-500' : 'text-red-500'}`} />
                    <span className={`text-sm font-medium ${user.emailVerified ? 'text-green-600' : 'text-red-600'}`}>
                      {user.emailVerified ? 'Verified' : 'Not Verified'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Member Since</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Methods Section */}
            <PaymentMethodsSection />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
