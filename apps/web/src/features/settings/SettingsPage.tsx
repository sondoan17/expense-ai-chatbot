import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, AlertTriangle, Trash2, User, Shield, Bell } from 'lucide-react';
import { useResetAccount } from '../../hooks/api/useUserApi';

export function SettingsPage() {
  const navigate = useNavigate();
  const resetAccountMutation = useResetAccount();
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');

  const handleResetAccount = async () => {
    if (!resetPassword.trim()) {
      alert('Vui lòng nhập mật khẩu để xác nhận');
      return;
    }

    try {
      await resetAccountMutation.mutateAsync({ password: resetPassword });
      setShowResetModal(false);
      setResetPassword('');
      alert('Đã xóa toàn bộ dữ liệu tài khoản thành công!');
    } catch (error) {
      console.error('Reset account failed:', error);
      alert(error instanceof Error ? error.message : 'Xóa dữ liệu thất bại');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-slate-700/20 text-slate-400 hover:text-slate-100 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <Settings size={24} className="text-sky-400" />
          <h1 className="text-2xl font-bold text-slate-100">Cài đặt</h1>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-8">
        {/* Account Settings */}
        <div className="bg-slate-800/50 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <User size={20} className="text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-100">Tài khoản</h2>
          </div>
          <p className="text-slate-300 mb-4">
            Quản lý thông tin tài khoản và dữ liệu cá nhân
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/app/profile')}
              className="w-full text-left px-4 py-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-200 transition"
            >
              Chỉnh sửa thông tin cá nhân
            </button>
            <button
              onClick={() => navigate('/app/profile')}
              className="w-full text-left px-4 py-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-200 transition"
            >
              Thay đổi mật khẩu
            </button>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-slate-800/50 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield size={20} className="text-green-400" />
            <h2 className="text-lg font-semibold text-slate-100">Quyền riêng tư</h2>
          </div>
          <p className="text-slate-300 mb-4">
            Quản lý dữ liệu và quyền riêng tư của bạn
          </p>
          <div className="space-y-3">
            <button
              onClick={() => alert('Tính năng đang phát triển')}
              className="w-full text-left px-4 py-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-200 transition"
            >
              Xuất dữ liệu tài khoản
            </button>
            <button
              onClick={() => alert('Tính năng đang phát triển')}
              className="w-full text-left px-4 py-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-200 transition"
            >
              Xóa tài khoản vĩnh viễn
            </button>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-slate-800/50 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell size={20} className="text-yellow-400" />
            <h2 className="text-lg font-semibold text-slate-100">Tùy chọn</h2>
          </div>
          <p className="text-slate-300 mb-4">
            Cài đặt ngôn ngữ, thông báo và giao diện
          </p>
          <div className="space-y-3">
            <button
              onClick={() => alert('Tính năng đang phát triển')}
              className="w-full text-left px-4 py-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-200 transition"
            >
              Ngôn ngữ và khu vực
            </button>
            <button
              onClick={() => alert('Tính năng đang phát triển')}
              className="w-full text-left px-4 py-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-200 transition"
            >
              Thông báo
            </button>
            <button
              onClick={() => alert('Tính năng đang phát triển')}
              className="w-full text-left px-4 py-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-200 transition"
            >
              Giao diện và chủ đề
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="text-red-400" size={20} />
            <h2 className="text-lg font-semibold text-red-400">Vùng nguy hiểm</h2>
          </div>
          <p className="text-slate-300 mb-4">
            Xóa toàn bộ dữ liệu tài khoản bao gồm: giao dịch, tin nhắn chat, ngân sách, 
            quy tắc định kỳ và tất cả dữ liệu khác. Hành động này không thể hoàn tác.
          </p>
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            disabled={resetAccountMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Trash2 size={16} />
            {resetAccountMutation.isPending ? 'Đang xóa...' : 'Xóa toàn bộ dữ liệu'}
          </button>
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
              Hành động này sẽ xóa vĩnh viễn toàn bộ dữ liệu tài khoản của bạn. 
              Vui lòng nhập mật khẩu để xác nhận.
            </p>
            <div className="mb-6">
              <label htmlFor="reset-password" className="block text-sm font-medium text-slate-200 mb-2">
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
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setResetPassword('');
                }}
                className="flex-1 px-4 py-3 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleResetAccount}
                disabled={resetAccountMutation.isPending || !resetPassword.trim()}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {resetAccountMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 size={16} />
                    Xác nhận xóa
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
