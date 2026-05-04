import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { isOfflineAtom } from '@/atoms/network';
import { tripAtom } from '@/atoms/tripPage';
import { OfflineError, toAppError } from './errors';
import { appStore } from './store';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---- 認可 Cookie 失効リカバリ用の内部状態とヘルパ ----

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// 並列で 403 が起きても /trips/url/{urlId} は 1 回に集約する。
let refreshPromise: Promise<unknown> | null = null;

const isUrlIdEndpoint = (url: string | undefined): boolean => /^\/trips\/url\/[^/]+$/.test(url ?? '');

const getCurrentUrlId = (): string | null => appStore.get(tripAtom)?.urlId ?? null;

const refreshTripCookie = (urlId: string): Promise<unknown> => {
  if (!refreshPromise) {
    refreshPromise = apiClient.get(`/trips/url/${urlId}`).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

/** オフライン時の非GETリクエストを早期拒否する。 */
const rejectIfOffline = (config: InternalAxiosRequestConfig): void => {
  if (config.method !== 'get' && appStore.get(isOfflineAtom)) {
    throw new OfflineError();
  }
};

/**
 * Cookie refresh 中なら完了まで待機する。
 * /trips/url/{urlId} 自身（refresh 本体）は待機対象外（自己ループ防止）。
 */
const waitForCookieRefresh = async (config: InternalAxiosRequestConfig): Promise<void> => {
  if (!refreshPromise || isUrlIdEndpoint(config.url)) return;
  try {
    await refreshPromise;
  } catch (e) {
    // refresh が失敗してもリクエスト自体は続行する（通常エラーフロー側で処理）
    console.warn('[apiClient] Cookie refresh waiting failed; proceeding with original request', e);
  }
};

/**
 * 403 を Cookie 再発行 + 1 回リトライでリカバリ。
 * リカバリ成功時はレスポンス、不可なら null（呼び出し側で通常エラーフローへ）。
 */
const tryRefreshAndRetry = async (error: AxiosError): Promise<AxiosResponse | null> => {
  if (error.response?.status !== 403) return null;
  const config = error.config as RetryableConfig | undefined;
  if (!config || config._retry || isUrlIdEndpoint(config.url)) return null;
  const urlId = getCurrentUrlId();
  if (!urlId) return null;

  config._retry = true;
  try {
    await refreshTripCookie(urlId);
  } catch (e) {
    // refresh 自体が失敗した場合のみフォールスルー。
    // リトライ本体の失敗は呼び出し元に伝播させ、本当の失敗原因が隠蔽されないようにする。
    console.warn('[apiClient] Cookie refresh failed', e);
    return null;
  }
  return await apiClient.request(config);
};

// ---- インターセプター登録 ----

apiClient.interceptors.request.use(async config => {
  rejectIfOffline(config);
  await waitForCookieRefresh(config);
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  async (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const recovered = await tryRefreshAndRetry(error);
      if (recovered) return recovered;
      return Promise.reject(toAppError(error));
    }
    return Promise.reject(error);
  }
);

export const fetcher = (url: string) => apiClient.get(url).then(res => res.data);
