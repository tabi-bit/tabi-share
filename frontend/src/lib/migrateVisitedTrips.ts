import { apiClient } from '@/lib/apiClient';
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';

/**
 * ローカルの訪問済み台帳 (`visitedTripUrlIds`) をサーバーの user_trip_access へ移す
 * 一回限りの処理。ホーム一覧の取得元を `/me/trips` へ一本化したことで台帳は不要になったが、
 * Cookie が切れた状態でアップグレードした端末は移行しないと一覧を失うため、
 * 各 urlId を 1 度取得して現在の session にアクセス権を張り直してから台帳を消す。
 *
 * TODO: 次期リリース以降、このファイルと呼び出し元を削除する
 */

const VISITED_TRIPS_KEY = 'visitedTripUrlIds';

let migration: Promise<void> | null = null;

const readLegacyUrlIds = async (): Promise<string[]> => {
  const fromLocalStorage = (() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(VISITED_TRIPS_KEY) ?? 'null');
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  })();
  const entry = await db.userSettings.get(VISITED_TRIPS_KEY);
  const fromIndexedDb = Array.isArray(entry?.value) ? (entry.value as string[]) : [];
  return [...new Set([...fromIndexedDb, ...fromLocalStorage])];
};

/** 削除済み trip の 404 は移行済みとみなす。通信失敗のみ次回に持ち越す。 */
const grantAccess = async (urlId: string): Promise<boolean> => {
  try {
    await apiClient.get(`/trips/url/${urlId}`);
    return true;
  } catch (err) {
    return err instanceof AppError && err.statusCode === 404;
  }
};

const run = async (): Promise<void> => {
  const urlIds = await readLegacyUrlIds();

  // 逐次実行する。Cookie が切れた端末で並列送信すると、サーバーが各リクエストに
  // 別々の匿名 session を発行し、ブラウザが保持する最後の Set-Cookie 以外の
  // アクセス権が迷子になる。台帳はこの直後に消すため取り返しがつかない
  let granted = true;
  for (const urlId of urlIds) {
    granted = (await grantAccess(urlId)) && granted;
  }
  if (!granted) return;

  await db.userSettings.delete(VISITED_TRIPS_KEY);
  localStorage.removeItem(VISITED_TRIPS_KEY);
};

export const migrateVisitedTripUrlIds = (): Promise<void> => {
  migration ??= run().catch(err => {
    console.warn('[migrateVisitedTrips] migration failed; will retry on next launch', err);
  });
  return migration;
};
