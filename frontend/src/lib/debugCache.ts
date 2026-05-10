/**
 * Gemini など高コスト API の呼び出しをローカル開発時にキャッシュするユーティリティ。
 *
 * - local 環境でのみ動作（detectEnv() で判定）。stg/preview/prod では完全に無効
 * - エントリは IndexedDB（既存 Dexie）に保存し、ブラウザリロードを跨いで保持
 * - 各エントリに 24h TTL。期限切れたら miss 扱いで再フェッチ
 * - URL に `?debug=true` を付けて開くと Jotai atom が立ち、SPA セッション中はキャッシュを無視して fresh fetch する（atom はリロードで揮発）
 */

import { atom, useAtomValue } from 'jotai';
import { type DebugCacheEntry, db } from './db';
import { detectEnv } from './envBranding';
import { appStore } from './store';

const TTL_MS = 24 * 60 * 60 * 1000;

const forceRefreshAtom = atom(false);

export const isDebugCacheEnabled = (): boolean => detectEnv() === 'local';

/** アプリ起動時に 1 回呼ぶ。URL の `?debug` 値で atom を初期化する */
export const initDebugCache = (): void => {
  if (!isDebugCacheEnabled()) return;
  if (typeof window === 'undefined') return;

  const flag = new URLSearchParams(window.location.search).get('debug');
  if (flag === 'true') appStore.set(forceRefreshAtom, true);
  else if (flag === 'false') appStore.set(forceRefreshAtom, false);

  // DevTools Console 用にクリア API を露出
  (window as unknown as { __tabishareDebugCache?: object }).__tabishareDebugCache = {
    clear: clearDebugCache,
  };
};

/** React コンポーネントで強制リフレッシュ状態を購読する用 */
export const useDebugForceRefresh = (): boolean => useAtomValue(forceRefreshAtom);

/** withDebugCache 内から imperative に強制リフレッシュ状態を読む */
const isForceRefreshActive = (): boolean => appStore.get(forceRefreshAtom);

/**
 * 任意の async fetcher を debug キャッシュで包む。
 * 無効環境ではただの passthrough（fetcher を素で呼ぶ）。
 */
export const withDebugCache = async <T>(
  namespace: string,
  keyParts: unknown,
  fetcher: () => Promise<T>
): Promise<T> => {
  if (!isDebugCacheEnabled()) return fetcher();

  const key = `${namespace}:${stableStringify(keyParts)}`;

  if (!isForceRefreshActive()) {
    const entry = await db.debugCache.get(key);
    if (entry && Date.now() - entry.createdAt < TTL_MS) {
      const ageSec = Math.round((Date.now() - entry.createdAt) / 1000);
      const ttlSec = Math.round(TTL_MS / 1000);
      console.warn(`[debugCache] HIT key="${key}" age=${ageSec}s/${ttlSec}s (API call skipped)`);
      return entry.data as T;
    }
  }

  const value = await fetcher();
  const record: DebugCacheEntry = {
    key,
    namespace,
    data: value,
    createdAt: Date.now(),
  };
  await db.debugCache.put(record);
  return value;
};

/** namespace 単位（指定時）または全件のキャッシュをクリア */
export const clearDebugCache = async (namespace?: string): Promise<void> => {
  if (namespace == null) {
    await db.debugCache.clear();
    return;
  }
  await db.debugCache.where('namespace').equals(namespace).delete();
};

/** オブジェクト/配列/プリミティブをキー順を安定化させて文字列化する */
const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
};
