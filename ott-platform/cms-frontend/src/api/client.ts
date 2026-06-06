import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth.store';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// ─── Create axios instance ────────────────────────────────────

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor — attach JWT ─────────────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor — refresh on 401 ───────────────────

let isRefreshing    = false;
let pendingQueue:   { resolve: (v: string) => void; reject: (e: any) => void }[] = [];

function processPendingQueue(error: any, token: string | null) {
  pendingQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token!),
  );
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      const { refreshToken, setTokens, logout } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        });
      }

      isRefreshing = true;

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const newAccess  = data.data.accessToken;
        const newRefresh = data.data.refreshToken;

        setTokens(newAccess, newRefresh);
        processPendingQueue(null, newAccess);

        original.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(original);

      } catch (refreshError) {
        processPendingQueue(refreshError, null);
        logout();
        toast.error('Session expired. Please log in again.');
        return Promise.reject(refreshError);

      } finally {
        isRefreshing = false;
      }
    }

    // Global error toasts (skip 401 — handled above)
    if (error.response?.status !== 401) {
      const message = error.response?.data?.message || 'An unexpected error occurred';
      if (error.response?.status >= 500) {
        toast.error(`Server error: ${message}`);
      }
    }

    return Promise.reject(error);
  },
);

// ─── Typed API helper ─────────────────────────────────────────

export async function apiGet<T>(url: string, params?: Record<string, any>): Promise<T> {
  const { data } = await apiClient.get(url, { params });
  if (data && typeof data === 'object' && 'meta' in data) {
    return data;
  }
  return data.data ?? data;
}

export async function apiPost<T>(url: string, body?: any): Promise<T> {
  const { data } = await apiClient.post(url, body);
  return data.data ?? data;
}

export async function apiPut<T>(url: string, body?: any): Promise<T> {
  const { data } = await apiClient.put(url, body);
  return data.data ?? data;
}

export async function apiDelete<T = void>(url: string): Promise<T> {
  const { data } = await apiClient.delete(url);
  return data.data ?? data;
}

export async function apiPatch<T>(url: string, body?: any): Promise<T> {
  const { data } = await apiClient.patch(url, body);
  return data.data ?? data;
}
