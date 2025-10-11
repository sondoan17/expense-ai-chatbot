import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Trash2, User, Bot } from 'lucide-react';
import { useResetAccount } from '../../hooks/api/useUserApi';
import { useUserSettings, useUpdatePersonality } from '../../hooks/api/useUserSettings';
import { useToast } from '../../contexts/ToastContext';
import { AiPersonality } from '../../api/types';
import { SecondaryButton, DangerButton } from '../../components/ui';

export function SettingsPage() {
  const navigate = useNavigate();
  const resetAccountMutation = useResetAccount();
  const { data: settings, isLoading } = useUserSettings();
  const updatePersonalityMutation = useUpdatePersonality();
  const toast = useToast();
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');

  const personalityOptions = [
    {
      value: 'FRIENDLY' as AiPersonality,
      label: 'Thân thiện',
      icon: '😊',
      description: 'Ấm áp, kiên nhẫn, hỏi nhiều',
    },
    {
      value: 'PROFESSIONAL' as AiPersonality,
      label: 'Chuyên nghiệp',
      icon: '👔',
      description: 'Lịch sự, ngắn gọn, đi thẳng vào vấn đề',
    },
    {
      value: 'CASUAL' as AiPersonality,
      label: 'Thoải mái',
      icon: '😎',
      description: 'Thân mật, dễ gần, không quá cầu kỳ',
    },
    {
      value: 'HUMOROUS' as AiPersonality,
      label: 'Hài hước',
      icon: '😄',
      description: 'Vui vẻ, hóm hỉnh, tạo không khí nhẹ nhàng',
    },
    {
      value: 'INSULTING' as AiPersonality,
      label: 'Xúc phạm',
      icon: '😤',
      description: 'Mắng mỏ, chế giễu khi bạn chi tiêu',
    },
    {
      value: 'ENTHUSIASTIC' as AiPersonality,
      label: 'Nhiệt tình',
      icon: '🚀',
      description: 'Năng động, khuyến khích, tích cực',
    },
  ];

  const handleResetAccount = async () => {
    if (!resetPassword.trim()) {
      toast.error('Lỗi xác nhận', 'Vui lòng nhập mật khẩu để xác nhận');
      return;
    }

    try {
      await resetAccountMutation.mutateAsync({ password: resetPassword });
      setShowResetModal(false);
      setResetPassword('');
      toast.success('Thành công', 'Đã xóa toàn bộ dữ liệu tài khoản thành công!');
    } catch (error) {
      console.error('Reset account failed:', error);
      toast.error(
        'Lỗi xóa dữ liệu',
        error instanceof Error ? error.message : 'Xóa dữ liệu thất bại',
      );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4"></div>

      {/* Settings Sections */}
      <div className="space-y-8">
        {/* Account & Security Settings */}
        <div className="bg-slate-800/50 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <User size={20} className="text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-100">Tài khoản & Bảo mật</h2>
          </div>
          <p className="text-slate-300 mb-4">Quản lý thông tin tài khoản và cài đặt bảo mật</p>
          <div className="space-y-3">
            <SecondaryButton
              onClick={() => navigate('/app/profile')}
              className="w-full text-left justify-start"
            >
              Chỉnh sửa thông tin cá nhân
            </SecondaryButton>
            <SecondaryButton
              onClick={() => navigate('/app/change-password')}
              className="w-full text-left justify-start"
            >
              Đổi mật khẩu
            </SecondaryButton>
          </div>
        </div>

        {/* AI Personality Settings */}
        <div className="bg-slate-800/50 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bot size={20} className="text-purple-400" />
            <h2 className="text-lg font-semibold text-slate-100">Tính cách AI</h2>
          </div>
          <p className="text-slate-300 mb-4">Chọn phong cách trò chuyện của trợ lý AI</p>

          <div className="space-y-4">
            <div className="relative">
              <label
                htmlFor="ai-personality-select"
                className="block text-sm font-medium text-slate-200 mb-2"
              >
                Tính cách hiện tại
              </label>
              <div className="relative">
                <select
                  id="ai-personality-select"
                  value={settings?.aiPersonality || 'FRIENDLY'}
                  onChange={(e) =>
                    updatePersonalityMutation.mutate(e.target.value as AiPersonality)
                  }
                  disabled={isLoading || updatePersonalityMutation.isPending}
                  className="w-full px-4 py-3 pr-10 bg-gradient-to-r from-slate-700/60 to-slate-800/60 border border-slate-600/50 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:border-slate-500/70 hover:from-slate-700/70 hover:to-slate-800/70 appearance-none cursor-pointer shadow-lg backdrop-blur-sm"
                >
                  {personalityOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      className="bg-slate-800 text-slate-100"
                    >
                      {option.icon} {option.label}
                    </option>
                  ))}
                </select>
                {/* Custom dropdown arrow */}
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg
                    className="w-5 h-5 text-slate-400 transition-transform duration-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Description của tính cách được chọn */}
            <div className="bg-gradient-to-r from-slate-700/40 to-slate-800/40 border border-slate-600/30 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="text-2xl flex-shrink-0">
                  {personalityOptions.find((opt) => opt.value === settings?.aiPersonality)?.icon ||
                    personalityOptions[0].icon}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-100 mb-1">
                    {personalityOptions.find((opt) => opt.value === settings?.aiPersonality)
                      ?.label || personalityOptions[0].label}
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {personalityOptions.find((opt) => opt.value === settings?.aiPersonality)
                      ?.description || personalityOptions[0].description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="text-red-400" size={20} />
            <h2 className="text-lg font-semibold text-red-400">Vùng nguy hiểm</h2>
          </div>
          <p className="text-slate-300 mb-4">
            Xóa toàn bộ dữ liệu tài khoản bao gồm: giao dịch, tin nhắn chat, ngân sách, quy tắc định
            kỳ và tất cả dữ liệu khác. Hành động này không thể hoàn tác.
          </p>
          <DangerButton
            type="button"
            onClick={() => setShowResetModal(true)}
            isLoading={resetAccountMutation.isPending}
          >
            <Trash2 size={16} />
            {resetAccountMutation.isPending ? 'Đang xóa...' : 'Xóa toàn bộ dữ liệu'}
          </DangerButton>
        </div>
      </div>

      {/* Reset Account Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-red-400" size={24} />
              <h3 className="text-xl font-semibold text-red-400">Xác nhận xóa dữ liệu</h3>
            </div>
            <p className="text-slate-300 mb-6">
              Hành động này sẽ xóa vĩnh viễn toàn bộ dữ liệu tài khoản của bạn. Vui lòng nhập mật
              khẩu để xác nhận.
            </p>
            <div className="mb-6">
              <label
                htmlFor="reset-password"
                className="block text-sm font-medium text-slate-200 mb-2"
              >
                Mật khẩu
              </label>
              <input
                id="reset-password"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Nhập mật khẩu để xác nhận"
              />
            </div>
            <div className="flex gap-3">
              <SecondaryButton
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setResetPassword('');
                }}
                className="flex-1"
              >
                Hủy
              </SecondaryButton>
              <DangerButton
                type="button"
                onClick={handleResetAccount}
                disabled={resetAccountMutation.isPending || !resetPassword.trim()}
                isLoading={resetAccountMutation.isPending}
                className="flex-1"
              >
                <Trash2 size={16} />
                Xác nhận xóa
              </DangerButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
