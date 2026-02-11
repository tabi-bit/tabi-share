import type { RefObject } from 'react';
import { useCallback, useEffect, useRef } from 'react';

const EDGE_ZONE = 80;
const MAX_SCROLL_SPEED = 15;

export const useDragAutoScroll = (scrollContainerRef: RefObject<HTMLElement | null>) => {
  const isDraggingRef = useRef(false);
  const pointerYRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const scrollTopRef = useRef(0);
  const lockedScrollTopRef = useRef<number | null>(null);

  // scrollイベントで常にスクロール位置を追跡し、ドラッグ中はロック位置に強制リセット
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (lockedScrollTopRef.current != null) {
        container.scrollTop = lockedScrollTopRef.current;
      } else {
        scrollTopRef.current = container.scrollTop;
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [scrollContainerRef]);

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
      lockedScrollTopRef.current = (lockedScrollTopRef.current ?? 0) + scrollAmount;
      container.scrollBy({ top: scrollAmount });
    }

    rafIdRef.current = requestAnimationFrame(autoScrollLoop);
  }, [scrollContainerRef]);

  const startDrag = useCallback(() => {
    if (isDraggingRef.current) return;
    isDraggingRef.current = true;

    lockedScrollTopRef.current = scrollTopRef.current;

    const container = scrollContainerRef.current;
    if (container) {
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
  }, [scrollContainerRef, autoScrollLoop]);

  const stopDrag = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    lockedScrollTopRef.current = null;

    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  return { isDraggingRef, startDrag, stopDrag };
};
