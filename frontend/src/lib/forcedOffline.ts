import type { createStore } from 'jotai';
import { isForcedOfflineAtom } from '@/atoms/network';
import { db } from '@/lib/db';

const DB_KEY = 'forcedOffline';

/** IndexedDBから読み込み、atomを初期化 */
export const loadForcedOffline = async (store: ReturnType<typeof createStore>): Promise<void> => {
  const entry = await db.userSettings.get(DB_KEY);
  if (entry?.value === true) {
    store.set(isForcedOfflineAtom, true);
  }
};

/** atomとIndexedDBの両方を更新 */
export const setForcedOffline = (store: ReturnType<typeof createStore>, value: boolean): void => {
  store.set(isForcedOfflineAtom, value);
  db.userSettings.put({ key: DB_KEY, value });
};
