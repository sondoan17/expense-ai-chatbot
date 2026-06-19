import axios, { isAxiosError } from 'axios';

import { UserSettings } from './types';

const baseURL = import.meta.env.VITE_ZALO_MINIAPP_API_BASE_URL ?? 'http://localhost:4000/api';

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export function extractErrorMessage(error: unknown, fallback = 'Đã xảy ra lỗi'): string {
  if (isAxiosError(error)) {
    const responseMessage = error.response?.data?.message;
    if (typeof responseMessage === 'string') return responseMessage;
    if (Array.isArray(responseMessage)) return responseMessage.join(', ');
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export function isUnauthorized(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 401;
}

export function isNetworkError(error: unknown): boolean {
  return isAxiosError(error) && !error.response;
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

export async function resetAccount(password: string): Promise<void> {
  await apiClient.post('/users/reset-account', { password });
}
