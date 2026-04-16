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
