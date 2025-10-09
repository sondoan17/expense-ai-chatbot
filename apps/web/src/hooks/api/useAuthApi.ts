import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient, extractErrorMessage } from '../../api/client';
import {
  UserDto,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  MessageResponse,
} from '../../api/types';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterInput extends LoginCredentials {
  name?: string;
}

export function useLogin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const { data } = await apiClient.post<{ user: UserDto }>('/auth/login', credentials);
      return data;
    },
    onSuccess: (data) => {
      // Set user in cache
      queryClient.setQueryData(['user', 'me'], data.user);
      // Navigate to dashboard
      navigate('/app', { replace: true });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error, 'Đăng nhập thất bại'));
    },
  });
}

export function useRegister() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const { data } = await apiClient.post<{ user: UserDto }>('/auth/register', input);
      return data;
    },
    onSuccess: (data) => {
      // Set user in cache
      queryClient.setQueryData(['user', 'me'], data.user);
      // Navigate to dashboard
      navigate('/app', { replace: true });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error, 'Đăng ký thất bại'));
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

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (request: ForgotPasswordRequest) => {
      const { data } = await apiClient.post<MessageResponse>('/auth/forgot-password', request);
      return data;
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error, 'Không thể gửi email đặt lại mật khẩu'));
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (request: ResetPasswordRequest) => {
      const { data } = await apiClient.post<MessageResponse>('/auth/reset-password', request);
      return data;
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error, 'Không thể đặt lại mật khẩu'));
    },
  });
}
