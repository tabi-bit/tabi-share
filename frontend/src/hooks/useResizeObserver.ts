import { debounce } from 'lodash-es';
import { useEffect, useRef } from 'react';

/**
 * windowのresizeイベントを100msでデバウンスしてcallbackを実行するカスタムフック
 *
 * @param callback resizeイベント時に実行するコールバック関数
 */
export const useResizeObserver = (callback: (entry: ResizeObserverEntry) => void, debounceMs: number = 100) => {
  const ref = useRef<HTMLDivElement>(null);

  // デバウンスされたコールバック（React Compiler が callback/debounceMs 変化時のみ再生成）
  const debouncedCallback = debounce(callback, debounceMs);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver(entries => {
      debouncedCallback(entries[0]);
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [debouncedCallback]);

  return ref;
};
