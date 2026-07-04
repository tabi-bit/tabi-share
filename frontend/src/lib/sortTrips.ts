import type { Trip } from '@/types/trip';

/**
 * Trip を lastEditedAt 降順（直近編集順）で並び替える。
 *
 * lastEditedAt が同一の場合は id 降順（新しいtripが上）でタイブレークする。
 * マイグレーション直後は既存 trip の lastEditedAt が同時刻でセットされるため、
 * このタイブレーカーで id が新しいものから並ぶ。
 *
 * 旧スキーマ時代の IndexedDB キャッシュから hydrate された trip は lastEditedAt を
 * 持たない場合があるため、Date でない値は 0 として扱い一番下に並べる。SWR revalidation
 * が走れば正しい値で入れ替わるので一時的な挙動。
 */
export const sortTripsByLastEdited = (trips: Trip[]): Trip[] =>
  [...trips].sort((a, b) => {
    const aTime = a.lastEditedAt instanceof Date ? a.lastEditedAt.getTime() : 0;
    const bTime = b.lastEditedAt instanceof Date ? b.lastEditedAt.getTime() : 0;
    if (aTime !== bTime) return bTime - aTime;
    return b.id - a.id;
  });
