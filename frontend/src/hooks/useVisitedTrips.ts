import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/apiClient';
import { AppResponseTripSchema, type Trip } from '@/types/trip';

const VISITED_TRIPS_KEY = 'visitedTripUrlIds';

/**
 * localStorageから訪問済みTripのurlIdリストを取得
 */
const getVisitedTripUrlIds = (): string[] => {
  try {
    const stored = localStorage.getItem(VISITED_TRIPS_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

/**
 * localStorageに訪問済みTripのurlIdリストを保存
 */
const saveVisitedTripUrlIds = (urlIds: string[]) => {
  try {
    localStorage.setItem(VISITED_TRIPS_KEY, JSON.stringify(urlIds));
  } catch {
    // localStorage書き込みエラーは無視
  }
};

/**
 * 訪問済みTripを管理するフック
 */
export const useVisitedTrips = () => {
  const [urlIds, setUrlIds] = useState<string[]>([]);

  // 初回マウント時にlocalStorageから読み込み
  useEffect(() => {
    setUrlIds(getVisitedTripUrlIds());
  }, []);

  // urlIdを訪問済みリストに追加
  const addVisitedTrip = useCallback((urlId: string) => {
    setUrlIds(prev => {
      // 重複チェック
      if (prev.includes(urlId)) return prev;
      const updated = [...prev, urlId];
      saveVisitedTripUrlIds(updated);
      return updated;
    });
  }, []);

  // SWRで各urlIdからTripを取得
  const { data, error, isLoading } = useSWR<Trip[]>(
    urlIds.length > 0 ? ['visitedTrips', ...urlIds] : null,
    async () => {
      // Promise.allで並列取得
      const results = await Promise.all(
        urlIds.map(async urlId => {
          try {
            const res = await fetcher(`/trips/url/${urlId}`);
            return AppResponseTripSchema.parse(res);
          } catch {
            // 取得失敗時はnullを返す
            return null;
          }
        })
      );
      // nullを除外して返す
      return results.filter((trip): trip is Trip => trip !== null);
    }
  );

  return {
    trips: data,
    isLoading,
    error,
    addVisitedTrip,
  };
};
