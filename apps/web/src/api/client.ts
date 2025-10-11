import axios, { AxiosError, isAxiosError } from 'axios';

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
