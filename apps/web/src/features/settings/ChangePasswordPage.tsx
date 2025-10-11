import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Eye, EyeOff, Save } from 'lucide-react';
import { useChangePassword } from '../../hooks/api/useUserApi';
import { useToast } from '../../contexts/ToastContext';
import { SecondaryButton, PrimaryButton } from '../../components/ui';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const changePasswordMutation = useChangePassword();
  const toast = useToast();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = 'Mật khẩu hiện tại không được để trống';
    }

    if (!formData.newPassword.trim()) {
      newErrors.newPassword = 'Mật khẩu mới không được để trống';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự';
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Xác nhận mật khẩu không được để trống';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      
      toast.success('Thành công', 'Mật khẩu đã được thay đổi thành công!');
      navigate('/app/settings');
    } catch (error) {
      console.error('Change password failed:', error);
      // Error is already handled by the mutation
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
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
          <Lock size={24} className="text-sky-400" />
          <h1 className="text-2xl font-bold text-slate-100">Đổi mật khẩu</h1>
        </div>
      </div>

      <div className="max-w-2xl">

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Current Password */}
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-200 mb-2">
            Mật khẩu hiện tại
          </label>
          <div className="relative">
            <input
              id="currentPassword"
              type={showPasswords.current ? 'text' : 'password'}
              value={formData.currentPassword}
              onChange={(e) => handleInputChange('currentPassword', e.target.value)}
              className={`w-full px-4 py-3 pr-12 bg-slate-800/50 border rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent ${
                errors.currentPassword ? 'border-red-500' : 'border-slate-600'
              }`}
              placeholder="Nhập mật khẩu hiện tại"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('current')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              {showPasswords.current ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="text-red-400 text-sm mt-1">{errors.currentPassword}</p>
          )}
        </div>

        {/* New Password */}
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-slate-200 mb-2">
            Mật khẩu mới
          </label>
          <div className="relative">
            <input
              id="newPassword"
              type={showPasswords.new ? 'text' : 'password'}
              value={formData.newPassword}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              className={`w-full px-4 py-3 pr-12 bg-slate-800/50 border rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent ${
                errors.newPassword ? 'border-red-500' : 'border-slate-600'
              }`}
              placeholder="Nhập mật khẩu mới"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('new')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              {showPasswords.new ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.newPassword && (
            <p className="text-red-400 text-sm mt-1">{errors.newPassword}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-200 mb-2">
            Xác nhận mật khẩu mới
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showPasswords.confirm ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              className={`w-full px-4 py-3 pr-12 bg-slate-800/50 border rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent ${
                errors.confirmPassword ? 'border-red-500' : 'border-slate-600'
              }`}
              placeholder="Nhập lại mật khẩu mới"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('confirm')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              {showPasswords.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>
          )}
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
            isLoading={changePasswordMutation.isPending}
            className="flex-1"
          >
            <Save size={16} />
            Đổi mật khẩu
          </PrimaryButton>
        </div>
      </form>
      </div>
    </div>
  );
}
