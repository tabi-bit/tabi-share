import { db } from './db';

/** 6ヶ月（ミリ秒） */
const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

/**
 * lastAccessedが6ヶ月以上前のswrCacheエントリを一括削除する。
 * アプリ起動時にfire-and-forgetで実行される。
 */
export const runCacheCleanup = async (): Promise<void> => {
  const threshold = Date.now() - SIX_MONTHS_MS;
  await db.swrCache.where('lastAccessed').below(threshold).delete();
};
