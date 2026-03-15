import type { Cache, State } from 'swr';
import { db } from './db';

/** プリロードする最大エントリ数（直近アクセス順） */
const MAX_HYDRATE_ENTRIES = 150;
/** プリロードのタイムアウト（ms） */
const HYDRATE_TIMEOUT_MS = 200;

/**
 * Write-throughキャッシュプロバイダを生成する。
 * 起動時にIndexedDBから最新N件をプリロードし、
 * get()が常に同期的にキャッシュデータを返せるようにする。
 */
export const createSwrCacheProvider = (): { provider: () => Cache<State>; hydratePromise: Promise<void> } => {
  const map = new Map<string, State>();

  const hydratePromise = Promise.race([
    db.swrCache
      .orderBy('lastAccessed')
      .reverse()
      .limit(MAX_HYDRATE_ENTRIES)
      .toArray()
      .then(entries => {
        for (const entry of entries) {
          map.set(entry.key, { data: entry.data });
        }
      }),
    new Promise<void>(resolve => setTimeout(resolve, HYDRATE_TIMEOUT_MS)),
  ]).catch(() => {
    // IndexedDB hydrationエラーは無視
  });

  return {
    provider: () => ({
      get: (key: string): State | undefined => map.get(key),

      set: (key: string, value: State) => {
        map.set(key, value);

        if (value.data !== undefined) {
          const now = Date.now();
          db.swrCache
            .put({
              key,
              data: value.data,
              timestamp: now,
              lastAccessed: now,
            })
            .catch(() => {
              // IndexedDB書き込みエラーは無視
            });
        }
      },

      delete: (key: string) => {
        map.delete(key);
        db.swrCache.delete(key).catch(() => {
          // fire-and-forget
        });
      },

      keys: () => map.keys(),
    }),
    hydratePromise,
  };
};
