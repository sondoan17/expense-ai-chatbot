import axios, { isAxiosError } from 'axios';

import { getNativeString, removeNativeItem, setNativeString } from '../storage/nativeStorage';
import { UserSettings } from './types';

const baseURL = import.meta.env.VITE_ZALO_MINIAPP_API_BASE_URL ?? 'http://localhost:4000/api';
const accessTokenKey = 'mimi_zalo_access_token';

let accessToken: string | null = readStoredAccessToken();

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  if (isValidAccessToken(accessToken)) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

export function setAccessToken(token: string): void {
  if (!isValidAccessToken(token)) {
    throw new Error('API không trả về access token hợp lệ');
  }

  accessToken = token;
  setNativeString(accessTokenKey, token);
}

export function clearAccessToken(): void {
  accessToken = null;
  removeNativeItem(accessTokenKey);
}

function readStoredAccessToken(): string | null {
  const storedToken = getNativeString(accessTokenKey);
  return isValidAccessToken(storedToken) ? storedToken : null;
}

function isValidAccessToken(token: string | null | undefined): token is string {
  return typeof token === 'string' && token.trim().length > 0 && token !== 'undefined';
}

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
