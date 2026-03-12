import axios from 'axios';
import { toAppError } from './errors';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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
