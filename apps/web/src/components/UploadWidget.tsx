import { useRef } from 'react';
import { Camera, X } from 'lucide-react';
import { useAvatarUpload } from '../hooks/utils/useAvatarUpload';

interface UploadWidgetProps {
  onUploadSuccess: (url: string) => void;
  currentAvatar?: string;
}

export function UploadWidget({ onUploadSuccess, currentAvatar }: UploadWidgetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isUploading, uploadProgress, error, uploadAvatar, reset } = useAvatarUpload({
    onUploadSuccess,
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await uploadAvatar(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Avatar Display */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-sky-400/40 to-sky-500/60 flex items-center justify-center text-2xl font-bold text-slate-900 overflow-hidden">
          {currentAvatar ? (
            <img
              src={currentAvatar}
              alt="Avatar"
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span>U</span>
          )}
        </div>

        {/* Upload Button */}
        <button
          type="button"
          onClick={triggerFileInput}
          disabled={isUploading}
          className="absolute -bottom-2 -right-2 p-2 bg-sky-500 rounded-full text-white hover:bg-sky-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Camera size={16} />
          )}
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload Progress */}
      {isUploading && (
        <div className="w-full max-w-xs">
          <div className="flex items-center justify-between text-sm text-slate-400 mb-1">
            <span>Đang upload...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-sky-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">
          <X size={16} />
          <span>{error}</span>
          <button type="button" onClick={reset} className="ml-2 text-red-300 hover:text-red-200">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Instructions */}
      <p className="text-sm text-slate-400 text-center">
        Nhấp vào biểu tượng camera để thay đổi ảnh đại diện
      </p>
    </div>
  );
}
