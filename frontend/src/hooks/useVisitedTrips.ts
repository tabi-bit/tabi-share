import { isAxiosError } from 'axios';
import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/apiClient';
import { db } from '@/lib/db';
import { type Trip, tripFromApi } from '@/types/trip';

const VISITED_TRIPS_KEY = 'visitedTripUrlIds';
// TODO: IndexedDB完全移行後、LEGACY_STORAGE_KEYとmigrateFromLocalStorageを削除する
/** localStorage のキー（マイグレーション用） */
const LEGACY_STORAGE_KEY = 'visitedTripUrlIds';

/** IndexedDBから訪問済みTripのurlIdリストを取得 */
const getUrlIdsFromDB = async (): Promise<string[]> => {
  const entry = await db.userSettings.get(VISITED_TRIPS_KEY);
  return Array.isArray(entry?.value) ? (entry.value as string[]) : [];
};

/** IndexedDBに訪問済みTripのurlIdリストを保存 */
const saveUrlIdsToDB = async (urlIds: string[]): Promise<void> => {
  await db.userSettings.put({ key: VISITED_TRIPS_KEY, value: urlIds });
};

/**
 * localStorage → IndexedDB の一回限りマイグレーション。
 * localStorageにデータがあればIndexedDBに移行し、localStorageから削除する。
 * TODO: IndexedDB完全移行後、この関数とLEGACY_STORAGE_KEYを削除する
 */
const migrateFromLocalStorage = async (): Promise<string[]> => {
  try {
    const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    // IndexedDBに既存データがなければマイグレーション
    const existing = await getUrlIdsFromDB();
    if (existing.length === 0 && parsed.length > 0) {
      await saveUrlIdsToDB(parsed);
    }
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return parsed;
  } catch {
    return [];
  }
};

/**
 * 訪問済みTripを管理するフック
 */
export const useVisitedTrips = () => {
  const [urlIds, setUrlIds] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // 初回マウント時にIndexedDBから読み込み（+ localStorageマイグレーション）
  useEffect(() => {
    const init = async () => {
      await migrateFromLocalStorage();
      const ids = await getUrlIdsFromDB();
      setUrlIds(ids);
      setIsInitialized(true);
    };
    init().catch(() => {
      setIsInitialized(true);
    });
  }, []);

  // urlIds変更時にIndexedDBへ永続化（state updater内の副作用を避ける）
  useEffect(() => {
    if (isInitialized) {
      saveUrlIdsToDB(urlIds).catch(() => {
        // fire-and-forget
      });
    }
  }, [urlIds, isInitialized]);

  // urlIdを訪問済みリストに追加
  const addVisitedTrip = useCallback((urlId: string) => {
    setUrlIds(prev => {
      if (prev.includes(urlId)) return prev;
      return [...prev, urlId];
    });
  }, []);

  // urlIdを訪問済みリストから削除
  const removeVisitedTrip = useCallback((urlId: string) => {
    setUrlIds(prev => {
      const updated = prev.filter(id => id !== urlId);
      if (updated.length === prev.length) return prev;
      return updated;
    });
  }, []);

  // SWRで各urlIdからTripを取得
  const { data, error, isLoading } = useSWR<Trip[]>(
    isInitialized && urlIds.length > 0 ? ['visitedTrips', ...urlIds] : null,
    async () => {
      const results = await Promise.all(
        urlIds.map(async urlId => {
          try {
            const res = await fetcher(`/trips/url/${urlId}`);
            return tripFromApi.parse(res);
          } catch (err) {
            // 404 "Trip not found" の場合は訪問済みリストから除去
            if (isAxiosError(err) && err.response?.status === 404 && err.response.data?.detail === 'Trip not found') {
              const current = await getUrlIdsFromDB();
              await saveUrlIdsToDB(current.filter(id => id !== urlId));
            }
            return null;
          }
        })
      );
      return results.filter((trip): trip is Trip => trip !== null);
    }
  );

  return {
    trips: data,
    isLoading,
    error,
    addVisitedTrip,
    removeVisitedTrip,
  };
};
