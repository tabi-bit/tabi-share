import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useRef } from 'react';
import { selectedPageIdAtom, selectedPageIndexAtom, tripModeAtom, tripPagesAtom } from '@/atoms/tripPage';

/**
 * キーボード ←/→ で隣接ページを切り替える TripPage 用のグローバル listener。
 *
 * 無効化条件:
 * - 閲覧モード以外
 * - ページが 1 つ以下
 * - INPUT / TEXTAREA / contentEditable にフォーカス中
 * - Dialog がオープン中（背景の誤操作を防ぐ）
 *
 * 状態は ref 越しに参照して listener は 1 度だけ attach する。
 */
export const useAdjacentPageKeys = (): void => {
  const pages = useAtomValue(tripPagesAtom);
  const mode = useAtomValue(tripModeAtom);
  const activeIndex = useAtomValue(selectedPageIndexAtom);
  const setSelectedPageId = useSetAtom(selectedPageIdAtom);

  const latest = useRef({ pages, mode, activeIndex, setSelectedPageId });
  latest.current = { pages, mode, activeIndex, setSelectedPageId };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;

      // Radix Popover も role="dialog" を持つため data-slot で Dialog / AlertDialog のみを判定
      if (
        document.querySelector(
          '[data-slot="dialog-content"][data-state="open"], [data-slot="alert-dialog-content"][data-state="open"]'
        )
      )
        return;

      const { pages, mode, activeIndex, setSelectedPageId } = latest.current;
      if (mode !== 'view' || pages.length <= 1) return;

      const nextIdx = e.key === 'ArrowLeft' ? activeIndex - 1 : activeIndex + 1;
      if (nextIdx < 0 || nextIdx >= pages.length) return;

      e.preventDefault();
      setSelectedPageId(pages[nextIdx].id);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
};
