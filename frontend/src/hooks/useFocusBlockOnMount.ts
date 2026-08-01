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

// block ID は BIGSERIAL PRIMARY KEY (正の整数) のみ有効。"0" / 桁溢れ / 非数値は不正値扱いで
// query 掃除だけ行う。useBlock(0) が SWR の falsy key で fetch を止めるため、そのまま 0 を渡すと
// block も error も来ず ref も query も更新されずスタックする。
const parseFocusBlockId = (raw: string | null): number | null => {
  if (raw == null || !/^[1-9]\d*$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : null;
};

export const useFocusBlockOnMount = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawFocusBlock = searchParams.get(FOCUS_BLOCK_PARAM);
  const focusBlockId = parseFocusBlockId(rawFocusBlock);
  const hasInvalidParam = rawFocusBlock != null && focusBlockId == null;

  const setSelectedPageId = useSetAtom(selectedPageIdAtom);
  const { block, error } = useBlock(focusBlockId);
  // 直前の rawFocusBlock を保持し、値が変わるまで再処理をブロックする。ref なので rerender は起こさない。
  // - TripPage は SPA navigate で unmount しないので、連続通知 (42 → 99) の 2 回目を処理する
  // - 消費済み記録は uncancelled 完了後 (async 内) にセット。StrictMode の double-fire で最初の async が
  //   cancelled になっても 2 度目で確実に完走するため
  // - query 掃除後 (rawFocusBlock === null) は ref をリセット。同一 block の再通知にも応答するため
  const consumedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (rawFocusBlock === null) {
      consumedKeyRef.current = null;
      return;
    }
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

    setSelectedPageId(block.pageId);

    let cancelled = false;
    (async () => {
      const el = await waitForBlockElement(focusBlockId, SCROLL_WAIT_MAX_MS, () => cancelled);
      if (cancelled) return;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      clearParam();
      consumedKeyRef.current = rawFocusBlock;
    })();

    return () => {
      cancelled = true;
    };
  }, [rawFocusBlock, focusBlockId, hasInvalidParam, block, error, setSelectedPageId, setSearchParams]);
};
