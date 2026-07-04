import type { Trip } from '@/types/trip';

/**
 * Trip を lastEditedAt 降順（直近編集順）で並び替える。
 *
 * lastEditedAt が同一の場合は id 降順（新しいtripが上）でタイブレークする。
 * マイグレーション直後は既存 trip の lastEditedAt が同時刻でセットされるため、
 * このタイブレーカーで id が新しいものから並ぶ。
 */
export const sortTripsByLastEdited = (trips: Trip[]): Trip[] =>
  [...trips].sort((a, b) => {
    const editedDiff = b.lastEditedAt.getTime() - a.lastEditedAt.getTime();
    if (editedDiff !== 0) return editedDiff;
    return b.id - a.id;
  });
