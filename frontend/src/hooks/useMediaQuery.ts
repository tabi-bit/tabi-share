import { useSyncExternalStore } from 'react';

/**
 * メディアクエリの結果を購読するフック
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 640px)');
 */
export const useMediaQuery = (query: string): boolean => {
  return useSyncExternalStore(
    callback => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    () => window.matchMedia(query).matches,
    () => false // SSR時のフォールバック（このアプリはVite SPAだが安全のため）
  );
};
