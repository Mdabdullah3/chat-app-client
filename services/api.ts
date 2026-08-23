import axios, { AxiosError } from 'axios';
import type { ApiError } from '@/types';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://frontend-task-chatapp.onrender.com/api';

export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? 'https://frontend-task-chatapp.onrender.com';

export const TOKEN_KEY = 'chat_token';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Broadcast auth failures so AuthContext can clear the session
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export const getErrorMessage = (error: unknown, fallback = 'Something went wrong'): string => {
  if (axios.isAxiosError<{ error?: ApiError }>(error)) {
    const apiError = error.response?.data?.error;
    if (apiError?.details?.length) {
      return apiError.details[0].message;
    }
    if (apiError?.message) {
      return apiError.message;
    }
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again.';
    }
    if (!error.response) {
      return 'Network error. Check your connection.';
    }
  }
  return fallback;
};

export default api;
