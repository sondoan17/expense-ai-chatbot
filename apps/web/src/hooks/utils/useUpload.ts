import { useState, useCallback } from 'react';
import { apiClient } from '../../api/client';

interface UploadSignatureResponse {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
  folder: string;
  transformation: string;
}

interface UseUploadOptions {
  onSuccess?: (url: string) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: number) => void;
}

interface UseUploadReturn {
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  uploadFile: (file: File) => Promise<string | null>;
  reset: () => void;
}

export function useUpload(options: UseUploadOptions = {}): UseUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setUploadProgress(0);
  }, []);

  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        setIsUploading(true);
        setError(null);
        setUploadProgress(0);

        // Validate file type
        if (!file.type.startsWith('image/')) {
          const errorMsg = 'Vui lòng chọn file ảnh hợp lệ';
          setError(errorMsg);
          options.onError?.(errorMsg);
          return null;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          const errorMsg = 'Kích thước file không được vượt quá 5MB';
          setError(errorMsg);
          options.onError?.(errorMsg);
          return null;
        }

        // Step 1: Get signature from backend
        const { data: signatureData } =
          await apiClient.post<UploadSignatureResponse>('/users/upload-signature');
        const { signature, timestamp, cloudName, apiKey, folder, transformation } = signatureData;

        // Step 2: Upload to Cloudinary
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', apiKey);
        formData.append('timestamp', timestamp.toString());
        formData.append('signature', signature);
        formData.append('folder', folder);
        formData.append('transformation', transformation);

        const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.text();
          console.error('Cloudinary upload error:', errorData);
          throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }

        const uploadResult = await uploadResponse.json();
        setUploadProgress(100);
        options.onProgress?.(100);

        options.onSuccess?.(uploadResult.secure_url);
        return uploadResult.secure_url;
      } catch (error) {
        console.error('Upload error:', error);
        const errorMsg = 'Có lỗi xảy ra khi upload ảnh. Vui lòng thử lại.';
        setError(errorMsg);
        options.onError?.(errorMsg);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [options],
  );

  return {
    isUploading,
    uploadProgress,
    error,
    uploadFile,
    reset,
  };
}
