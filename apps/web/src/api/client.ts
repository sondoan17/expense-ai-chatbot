import axios, { AxiosError, isAxiosError } from 'axios';
import { UserSettings } from './types';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export function extractErrorMessage(error: unknown, fallback = 'Đã xảy ra lỗi'): string {
  if (isAxiosError(error)) {
    const responseMessage = error.response?.data?.message;
    if (typeof responseMessage === 'string') return responseMessage;
    if (Array.isArray(responseMessage)) return responseMessage.join(', ');
    return error.message ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export function isNetworkError(error: unknown): boolean {
  if (isAxiosError(error)) {
    return !error.response;
  }
  return false;
}

export type ApiError = AxiosError<{ message?: string | string[] }>;

// Change Password API
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export async function changePassword(data: ChangePasswordRequest): Promise<ChangePasswordResponse> {
  const response = await apiClient.post<ChangePasswordResponse>('/users/change-password', data);
  return response.data;
}

// Reset Account API
export interface ResetAccountRequest {
  password: string;
}

export interface ResetAccountResponse {
  message: string;
  deletedCounts: {
    transactions: number;
    chatMessages: number;
    recurringRules: number;
    budgets: number;
    recurringBudgetRules: number;
    passwordResetTokens: number;
  };
}

export async function resetAccount(data: ResetAccountRequest): Promise<ResetAccountResponse> {
  const response = await apiClient.post<ResetAccountResponse>('/users/reset-account', data);
  return response.data;
}

export async function getUserSettings(): Promise<UserSettings> {
  const response = await apiClient.get<UserSettings>('/users/settings');
  return response.data;
}

export async function updatePersonality(personality: string): Promise<UserSettings> {
  const response = await apiClient.patch<UserSettings>('/users/settings/personality', {
    personality,
  });
  return response.data;
}
