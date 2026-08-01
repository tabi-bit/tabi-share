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
// 通知タップ → block 描画までに 2 段の非同期がある:
//   1. useBlock(id) 単発 fetch → block.pageId 判明 → selectedPageId 切替
//   2. useBlocks(pageId) list fetch 完了 → ViewTripLayout の Skeleton が Timeline に差し替わる
// (2) が cold start で遅れると DOM に data-block-id が出るのに数秒かかることがある。
// rAF ポーリングだと 1 フレーム単位で無駄回転するので MutationObserver で DOM 変化を待つ。
const SCROLL_WAIT_MAX_MS = 8000;

// AbortSignal で observer / timer / rAF をまとめて解放できるようにする。cleanup の taskkill 経路が
// unmount / focusBlock 変更 / StrictMode double-fire で確実に停止する。
const waitForBlockElement = (blockId: number, maxMs: number, signal: AbortSignal): Promise<HTMLElement | null> =>
  new Promise(resolve => {
    const selector = `[data-block-id="${blockId}"]`;
    if (signal.aborted) return resolve(null);

    const found = document.querySelector<HTMLElement>(selector);
    if (found) return resolve(found);

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const finish = (el: HTMLElement | null) => {
      observer.disconnect();
      if (timeoutId !== null) clearTimeout(timeoutId);
      signal.removeEventListener('abort', onAbort);
      resolve(el);
    };
    const onAbort = () => finish(null);

    const observer = new MutationObserver(() => {
      const el = document.querySelector<HTMLElement>(selector);
      if (el) finish(el);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    timeoutId = setTimeout(() => finish(null), maxMs);
    signal.addEventListener('abort', onAbort);
  });

// layout flush を 1 フレーム待ってから scroll する。Timeline 差し替え直後は要素の位置計算が
// まだ確定していないことがあり、そのタイミングで scrollIntoView すると外れる。
// rAF は clearParam() 直後の cleanup と間に合わない race を避けるため cancel しない
// (detached element への scrollIntoView は no-op なので害はない)。
const scrollIntoViewOnNextFrame = (el: HTMLElement) => {
  requestAnimationFrame(() => {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
};

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

    const controller = new AbortController();
    (async () => {
      const el = await waitForBlockElement(focusBlockId, SCROLL_WAIT_MAX_MS, controller.signal);
      if (controller.signal.aborted) return;
      if (el) scrollIntoViewOnNextFrame(el);
      clearParam();
      consumedKeyRef.current = rawFocusBlock;
    })();

    return () => {
      controller.abort();
    };
  }, [rawFocusBlock, focusBlockId, hasInvalidParam, block, error, setSelectedPageId, setSearchParams]);
};
