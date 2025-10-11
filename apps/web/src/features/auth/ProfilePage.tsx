import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Save } from 'lucide-react';
import { UploadWidget } from '../../components/UploadWidget';
import { useCurrentUser, useUpdateUser } from '../../hooks/api/useUserApi';

export function ProfilePage() {
  const { data: user } = useCurrentUser();
  const updateUserMutation = useUpdateUser();
  const navigate = useNavigate();
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
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpload = (avatarUrl: string) => {
    // Avatar is automatically updated via UploadWidget
    console.log('Avatar updated:', avatarUrl);
  };


  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-slate-700/20 text-slate-400 hover:text-slate-100 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-slate-100">Chỉnh sửa thông tin</h1>
      </div>

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
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 px-4 py-3 bg-slate-700/50 text-slate-200 rounded-lg hover:bg-slate-700 transition"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={updateUserMutation.isPending}
            className="flex-1 px-4 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {updateUserMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save size={16} />
                Lưu thay đổi
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
