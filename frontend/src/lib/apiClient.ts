import axios from 'axios';
import { isOfflineAtom } from '@/atoms/network';
import { OfflineError, toAppError } from './errors';
import { appStore } from './store';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// オフライン時の非GETリクエストを早期拒否
apiClient.interceptors.request.use(config => {
  if (config.method !== 'get' && appStore.get(isOfflineAtom)) {
    throw new OfflineError();
  }
  return config;
});

// エラーを AppError に正規化するインターセプター
apiClient.interceptors.response.use(
  response => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      return Promise.reject(toAppError(error));
    }
    return Promise.reject(error);
  }
);

export const fetcher = (url: string) => apiClient.get(url).then(res => res.data);
