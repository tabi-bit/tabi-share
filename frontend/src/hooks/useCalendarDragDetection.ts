import type { RefObject } from 'react';
import { useCallback, useEffect, useRef } from 'react';

interface UseCalendarDragDetectionReturn {
  /** FC eventDragStart / eventResizeStart に渡す */
  handleEventDragStart: () => void;
  /** FC eventDragStop / eventResizeStop に渡す */
  handleEventDragStop: () => void;
  /** FC select ハンドラの前に呼ぶ（タッチ選択のスクロールロック解除） */
  onBeforeSelect: () => void;
}

/**
 * FullCalendarのドラッグ操作を検出し、スクロールロックのstart/stopを適切なタイミングで呼ぶフック。
 *
 * 3つの経路でドラッグを検出する:
 * 1. マウスpointer検出: タイムグリッド上のpointerdown/up/cancelでPC新規選択時のスクロールロック
 * 2. MutationObserver: fc-highlight要素の出現でAndroid新規選択時のスクロールロック
 * 3. FCコールバック: eventDragStart/Stop でイベントドラッグ・リサイズ時のスクロールロック
 *
 * @param calendarContainerRef FullCalendarを包むコンテナ要素のref
 * @param onDragStart ドラッグ開始時に呼ばれるコールバック（isTouch: PCはfalse、Androidはtrue）
 * @param onDragEnd ドラッグ終了時に呼ばれるコールバック
 */
export const useCalendarDragDetection = (
  calendarContainerRef: RefObject<HTMLElement | null>,
  onDragStart?: (isTouch: boolean) => void,
  onDragEnd?: () => void
): UseCalendarDragDetectionReturn => {
  // MutationObserverの選択状態追跡
  // FC再レンダリングによるハイライト入れ替えで誤ってstartDragが呼ばれるのを防ぐ
  const isSelectionHighlightActiveRef = useRef(false);

  // マウス操作検出: タイムグリッド上のpointerdown/up/cancelでスクロールロック
  // タッチはFC内部のeventDragStart/cancelTouchScroll + MutationObserverに委譲
  useEffect(() => {
    const timeGrid = calendarContainerRef.current?.querySelector<HTMLElement>('.fc-timegrid-body');
    if (!timeGrid) return;

    let isDragActive = false;

    const onPointerDown = (e: PointerEvent) => {
      // タッチはMutationObserver + FCコールバックで処理
      if (e.pointerType === 'touch') return;
      isDragActive = true;
      onDragStart?.(false);
    };

    const handleEnd = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      if (isDragActive) {
        isDragActive = false;
        onDragEnd?.();
      }
    };

    timeGrid.addEventListener('pointerdown', onPointerDown);
    timeGrid.addEventListener('pointerup', handleEnd);
    timeGrid.addEventListener('pointercancel', handleEnd);

    return () => {
      timeGrid.removeEventListener('pointerdown', onPointerDown);
      timeGrid.removeEventListener('pointerup', handleEnd);
      timeGrid.removeEventListener('pointercancel', handleEnd);
    };
  }, [calendarContainerRef, onDragStart, onDragEnd]);

  // MutationObserver: fc-highlight要素の出現/消去を検知
  // タッチ長押しでの新規イベント選択時にスクロールロックを開始する
  useEffect(() => {
    const container = calendarContainerRef.current;
    if (!container) return;

    const observer = new MutationObserver(mutations => {
      // バッチ全体を走査して追加・削除のネット効果を判定
      // FCは選択範囲拡張時にハイライトを入れ替える（旧削除→新追加）ため、
      // 個別のmutationではなくバッチ全体で判断する必要がある
      let highlightAdded = false;
      let highlightRemoved = false;

      for (const mutation of mutations) {
        if (mutation.type !== 'childList') continue;
        for (const node of mutation.addedNodes) {
          if (
            node instanceof HTMLElement &&
            (node.classList.contains('fc-highlight') || node.querySelector('.fc-highlight'))
          ) {
            highlightAdded = true;
          }
        }
        for (const node of mutation.removedNodes) {
          if (
            node instanceof HTMLElement &&
            (node.classList.contains('fc-highlight') || node.querySelector('.fc-highlight'))
          ) {
            highlightRemoved = true;
          }
        }
      }

      if (highlightAdded && !isSelectionHighlightActiveRef.current) {
        // 新規選択開始（初回のみ）
        isSelectionHighlightActiveRef.current = true;
        onDragStart?.(true);
      }

      if (highlightRemoved && !highlightAdded) {
        // ハイライト完全消去（unselect()呼び出し時）→ 次の選択で再びstartDrag可能に
        // stopDragは呼ばない（handleSelect内のonBeforeSelectで処理済み）
        isSelectionHighlightActiveRef.current = false;
      }
    });

    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [calendarContainerRef, onDragStart]);

  // FCイベントドラッグ・リサイズ開始（タッチ経由）
  const handleEventDragStart = useCallback(() => {
    onDragStart?.(true);
  }, [onDragStart]);

  // FCイベントドラッグ・リサイズ終了
  const handleEventDragStop = useCallback(() => {
    onDragEnd?.();
  }, [onDragEnd]);

  // FC select発火前に呼ぶ（MutationObserverで開始したスクロールロックを解除）
  const onBeforeSelect = useCallback(() => {
    onDragEnd?.();
  }, [onDragEnd]);

  return { handleEventDragStart, handleEventDragStop, onBeforeSelect };
};
