import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient, extractErrorMessage, resetAccount, ResetAccountRequest, ResetAccountResponse } from '../../api/client';
import { UserDto, MessageResponse } from '../../api/types';

interface UpdateUserInput {
  name?: string;
  avatar?: string;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: async (): Promise<UserDto | null> => {
      try {
        const { data } = await apiClient.get<{ user: UserDto }>('/users/me');
        return data.user;
      } catch (error) {
        // If unauthorized, return null instead of throwing
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { status?: number } };
          if (axiosError.response?.status === 401) {
            return null;
          }
        }
        throw new Error(extractErrorMessage(error, 'Không thể lấy thông tin người dùng'));
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on 401 (unauthorized)
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 401) {
          return false;
        }
      }
      return failureCount < 3;
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateUserInput): Promise<UserDto | null> => {
      const { data } = await apiClient.patch<{ user: UserDto }>('/users/me', input);
      return data.user;
    },
    onSuccess: (updatedUser) => {
      // Update cache with new user data
      queryClient.setQueryData(['user', 'me'], updatedUser);
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error, 'Cập nhật thông tin thất bại'));
    },
  });
}

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<MessageResponse>('/auth/logout');
      return data;
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
      // Navigate to login
      navigate('/login', { replace: true });
    },
    onError: (error) => {
      // Even if logout fails on server, clear local state
      queryClient.clear();
      navigate('/login', { replace: true });
      throw new Error(extractErrorMessage(error, 'Đăng xuất thất bại'));
    },
  });
}

export function useResetAccount() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: ResetAccountRequest): Promise<ResetAccountResponse> => {
      return resetAccount(data);
    },
    onSuccess: () => {
      // Invalidate all related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['chat'] });
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      
      // Navigate to dashboard after successful reset
      navigate('/app/dashboard', { replace: true });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error, 'Xóa dữ liệu tài khoản thất bại'));
    },
  });
}
