import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Save } from 'lucide-react';
import { UploadWidget } from '../../components/UploadWidget';
import { useCurrentUser, useUpdateUser } from '../../hooks/api/useUserApi';
import { useToast } from '../../contexts/ToastContext';
import { SecondaryButton, PrimaryButton } from '../../components/ui';

export function ProfilePage() {
  const { data: user } = useCurrentUser();
  const updateUserMutation = useUpdateUser();
  const navigate = useNavigate();
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  // Update form data when user data changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUserMutation.mutateAsync({
        name: formData.name,
      });
      toast.success('Thành công', 'Thông tin cá nhân đã được cập nhật!');
      navigate('/app/dashboard');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Lỗi cập nhật', 'Không thể cập nhật thông tin cá nhân');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpload = (avatarUrl: string) => {
    // Avatar is automatically updated via UploadWidget
    console.log('Avatar updated:', avatarUrl);
    toast.success('Thành công', 'Ảnh đại diện đã được cập nhật!');
  };


  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-slate-100 transition-all duration-200 p-2 rounded-xl hover:bg-gradient-to-r hover:from-slate-700/30 hover:to-slate-800/30 hover:border hover:border-slate-600/50 backdrop-blur-sm"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <User size={24} className="text-sky-400" />
          <h1 className="text-2xl font-bold text-slate-100">Chỉnh sửa thông tin</h1>
        </div>
      </div>

      <div className="max-w-2xl">

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center space-y-4">
          <UploadWidget
            onUploadSuccess={handleAvatarUpload}
            currentAvatar={user?.avatar || undefined}
          />
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-200 mb-2">
              <User size={16} className="inline mr-2" />
              Tên hiển thị
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder="Nhập tên hiển thị"
            />
          </div>

          {/* Email Field (Read-only) */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-200 mb-2">
              <Mail size={16} className="inline mr-2" />
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              disabled
              className="w-full px-4 py-3 bg-slate-800/30 border border-slate-600 rounded-lg text-slate-400 cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 mt-1">Email không thể thay đổi</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-6">
          <SecondaryButton
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1"
          >
            Hủy
          </SecondaryButton>
          <PrimaryButton
            type="submit"
            isLoading={updateUserMutation.isPending}
            className="flex-1"
          >
            <Save size={16} />
            Lưu thay đổi
          </PrimaryButton>
        </div>
      </form>
      </div>
    </div>
  );
}
