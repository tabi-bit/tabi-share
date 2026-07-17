/**
 * TripPage 配下専用の atom 群
 *
 * グローバルに定義されているが、TripPage とその子コンポーネント（Header, PageSwipeContainer 等）
 * でのみ使用すること。TripPage のマウント解除時にリセットされる。
 */
import { atom } from 'jotai';
import type { Page } from '@/types';
import type { Trip } from '@/types/trip';

/** 現在表示中の Trip */
export const tripAtom = atom<Trip | null>(null);

/** Page を date 昇順 → id 昇順で並び替える。date が null の Page は末尾。 */
export const sortPages = (pages: Page[]): Page[] =>
  [...pages].sort((a, b) => {
    if (!(a.date || b.date)) return a.id - b.id;
    if (!a.date) return 1;
    if (!b.date) return -1;
    const dateDiff = a.date.getTime() - b.date.getTime();
    return dateDiff !== 0 ? dateDiff : a.id - b.id;
  });

/** Trip に紐づくページ一覧 */
export const tripPagesAtom = atom<Page[]>([]);

/** 選択中のページ ID */
export const selectedPageIdAtom = atom<Page['id'] | undefined>(undefined);

/** 表示モード */
export const tripModeAtom = atom<'view' | 'edit'>('view');

/** 選択中のページ（派生 atom） */
export const selectedPageAtom = atom<Page | null>(get => {
  const pages = get(tripPagesAtom);
  const id = get(selectedPageIdAtom);
  return id != null ? (pages.find(p => p.id === id) ?? null) : (pages[0] ?? null);
});

/** 選択中のページのインデックス（派生 atom）。見つからない場合は 0。 */
export const selectedPageIndexAtom = atom<number>(get => {
  const pages = get(tripPagesAtom);
  const id = get(selectedPageIdAtom);
  const idx = pages.findIndex(p => p.id === id);
  return idx >= 0 ? idx : 0;
});
