import { useCallback } from 'react';
import { useUpload } from './useUpload';
import { useUpdateUser } from '../api/useUserApi';
import { useUserStore } from '../../store/user.store';
import { UserDto } from '../../api/types';

interface UseAvatarUploadOptions {
  onUploadSuccess?: (url: string) => void;
}

interface UseAvatarUploadReturn {
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  uploadAvatar: (file: File) => Promise<string | null>;
  reset: () => void;
}

export function useAvatarUpload(options: UseAvatarUploadOptions = {}): UseAvatarUploadReturn {
  const updateUserMutation = useUpdateUser();
  const setUserInStore = useUserStore((s: { setUser: (u: UserDto | null) => void }) => s.setUser);

  const { isUploading, uploadProgress, error, uploadFile, reset } = useUpload({
    onSuccess: async (url) => {
      // Update user profile with new avatar URL
      try {
        const updatedUser = await updateUserMutation.mutateAsync({ avatar: url });
        if (updatedUser) {
          setUserInStore(updatedUser);
          options.onUploadSuccess?.(url);
        }
      } catch (error) {
        console.error('Failed to update user avatar:', error);
      }
    },
  });

  const uploadAvatar = useCallback(
    async (file: File): Promise<string | null> => {
      return await uploadFile(file);
    },
    [uploadFile],
  );

  return {
    isUploading,
    uploadProgress,
    error,
    uploadAvatar,
    reset,
  };
}
