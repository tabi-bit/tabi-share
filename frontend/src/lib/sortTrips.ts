import type { Trip } from '@/types/trip';

/**
 * Trip を updatedAt 降順（新しい順）で並び替える。
 *
 * updatedAt が同一の場合は id 降順（新しいtripが上）でタイブレークする。
 * マイグレーション直後は既存 trip の updatedAt が同時刻でセットされるため、
 * このタイブレーカーで id が新しいものから並ぶ。
 */
export const sortTripsByLatestUpdate = (trips: Trip[]): Trip[] =>
  [...trips].sort((a, b) => {
    const updatedDiff = b.updatedAt.getTime() - a.updatedAt.getTime();
    if (updatedDiff !== 0) return updatedDiff;
    return b.id - a.id;
  });
