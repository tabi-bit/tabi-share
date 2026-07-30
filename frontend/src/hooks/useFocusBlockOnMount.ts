import { useSetAtom } from 'jotai';
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { selectedPageIdAtom } from '@/atoms/tripPage';
import { useBlock } from '@/hooks/useBlocks';

/**
 * `?focusBlock={id}` を消費して該当 block まで scroll する。
 *
 * block が 404 (通知送信 → タップ間で削除) や非数値ゴミの場合は黙って query param 掃除だけ行う。
 * urlId は URL path で保持されているので trip 画面自体は通常表示される。
 */

const FOCUS_BLOCK_PARAM = 'focusBlock';
const SCROLL_WAIT_MAX_MS = 3000;

const waitForBlockElement = (blockId: number, maxMs: number, isCancelled: () => boolean): Promise<HTMLElement | null> =>
  new Promise(resolve => {
    const selector = `[data-block-id="${blockId}"]`;
    const start = performance.now();
    const tick = () => {
      if (isCancelled()) return resolve(null);
      const el = document.querySelector<HTMLElement>(selector);
      if (el) return resolve(el);
      if (performance.now() - start > maxMs) return resolve(null);
      requestAnimationFrame(tick);
    };
    tick();
  });

export const useFocusBlockOnMount = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawFocusBlock = searchParams.get(FOCUS_BLOCK_PARAM);
  const focusBlockId = rawFocusBlock != null && /^\d+$/.test(rawFocusBlock) ? Number(rawFocusBlock) : null;
  const hasInvalidParam = rawFocusBlock != null && focusBlockId == null;

  const setSelectedPageId = useSetAtom(selectedPageIdAtom);
  const { block, error } = useBlock(focusBlockId);
  // TripPage は unmount せず SPA navigate で URL だけ差し替わるため、boolean 一度きりゲートだと
  // 通知連続タップ (42 → 99) の 2 回目が無視される。値ゲートにして rawFocusBlock が変わったら再処理する。
  const consumedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (consumedKeyRef.current === rawFocusBlock) return;

    const clearParam = () =>
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev);
          next.delete(FOCUS_BLOCK_PARAM);
          return next;
        },
        { replace: true }
      );

    if (hasInvalidParam) {
      consumedKeyRef.current = rawFocusBlock;
      clearParam();
      return;
    }
    if (focusBlockId == null) return;
    if (error) {
      consumedKeyRef.current = rawFocusBlock;
      clearParam();
      return;
    }
    if (!block) return;

    consumedKeyRef.current = rawFocusBlock;
    setSelectedPageId(block.pageId);

    let cancelled = false;
    (async () => {
      const el = await waitForBlockElement(focusBlockId, SCROLL_WAIT_MAX_MS, () => cancelled);
      if (cancelled) return;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      clearParam();
    })();

    return () => {
      cancelled = true;
    };
  }, [rawFocusBlock, focusBlockId, hasInvalidParam, block, error, setSelectedPageId, setSearchParams]);
};
