import type { RefObject } from 'react';
import { useCallback, useRef } from 'react';

const EDGE_ZONE = 80;
const MAX_SCROLL_SPEED = 15;

/**
 * ドラッグ操作中にスクロールコンテナの端付近でポインタを動かすと自動スクロールするフック。
 *
 * - PC（マウス）: `scroll`イベントハンドラで`scrollTop`をロックし、ユーザーの手動スクロールを抑制
 * - Android（タッチ）: `overflow: hidden`でコンポジタースレッドのタッチスクロールを防止
 * - 端からの距離に応じてスクロール速度を比例的に変化させる（{@link EDGE_ZONE}px以内で加速）
 *
 * @param scrollContainerRef - スクロール対象のDOM要素へのRef
 * @returns `startDrag` でドラッグ開始（スクロールロック＋自動スクロール開始）、`stopDrag` で終了・クリーンアップ
 */
export const useDragAutoScroll = (scrollContainerRef: RefObject<HTMLElement | null>) => {
  const isDraggingRef = useRef(false);
  const pointerYRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  // PC: lockedScrollTopRef方式用
  const lockedScrollTopRef = useRef(0);
  const scrollHandlerRef = useRef<(() => void) | null>(null);
  // Android: overflow:hidden方式用
  const savedOverflowRef = useRef<string | null>(null);

  const autoScrollLoop = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!(container && isDraggingRef.current)) return;

    const y = pointerYRef.current;
    const { top, bottom } = container.getBoundingClientRect();

    let scrollAmount = 0;
    if (y < top + EDGE_ZONE) {
      const ratio = 1 - Math.max(0, y - top) / EDGE_ZONE;
      scrollAmount = -MAX_SCROLL_SPEED * ratio;
    } else if (y > bottom - EDGE_ZONE) {
      const ratio = 1 - Math.max(0, bottom - y) / EDGE_ZONE;
      scrollAmount = MAX_SCROLL_SPEED * ratio;
    }

    if (scrollAmount !== 0) {
      // PC方式: lockedScrollTopRefを更新してからscrollBy（scrollハンドラがリセットしないように）
      if (scrollHandlerRef.current) {
        lockedScrollTopRef.current = container.scrollTop + scrollAmount;
      }
      container.scrollBy({ top: scrollAmount });
    }

    rafIdRef.current = requestAnimationFrame(autoScrollLoop);
  }, [scrollContainerRef]);

  const startDrag = useCallback(
    (isTouch: boolean) => {
      if (isDraggingRef.current) return;
      isDraggingRef.current = true;

      const container = scrollContainerRef.current;
      if (container) {
        if (isTouch) {
          // Android: overflow:hidden方式（コンポジタースレッドのタッチスクロールを防止）
          savedOverflowRef.current = container.style.overflow;
          container.style.overflow = 'hidden';
        } else {
          // PC: scrollイベントハンドラでscrollTopをロック
          lockedScrollTopRef.current = container.scrollTop;
          const onScroll = () => {
            if (isDraggingRef.current) {
              container.scrollTop = lockedScrollTopRef.current;
            }
          };
          scrollHandlerRef.current = onScroll;
          container.addEventListener('scroll', onScroll);
        }

        const rect = container.getBoundingClientRect();
        pointerYRef.current = (rect.top + rect.bottom) / 2;
      }

      const handlePointerMove = (e: PointerEvent) => {
        pointerYRef.current = e.clientY;
      };
      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length > 0) {
          pointerYRef.current = e.touches[0].clientY;
        }
      };
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      cleanupRef.current = () => {
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('touchmove', handleTouchMove);
      };

      rafIdRef.current = requestAnimationFrame(autoScrollLoop);
    },
    [scrollContainerRef, autoScrollLoop]
  );

  const stopDrag = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const container = scrollContainerRef.current;
    if (container) {
      // PC方式: scrollハンドラ解除
      if (scrollHandlerRef.current) {
        container.removeEventListener('scroll', scrollHandlerRef.current);
        scrollHandlerRef.current = null;
      }
      // Android方式: overflow復元
      if (savedOverflowRef.current != null) {
        container.style.overflow = savedOverflowRef.current;
        savedOverflowRef.current = null;
      }
    }

    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, [scrollContainerRef]);

  return { isDraggingRef, startDrag, stopDrag };
};
